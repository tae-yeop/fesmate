/**
 * 크롤링 스케줄러
 *
 * 주기적 크롤링 실행 및 결과 처리
 *
 * @see docs/tech/ingestion_crawling.md
 */

import { createClient } from "@/lib/supabase/server";
import {
    CrawlSource,
    CrawlRun,
    RawSourceItem,
    ChangeSuggestion,
    CrawlBatchResult,
    SourceSite,
} from "@/types/crawl";
import { CreateEventInput } from "@/types/event-registration";
import { importUrl } from "./index";
import { crawlListSource } from "./list-crawler";
import { decideApproval, calculateConfidence, calculateDiff } from "./auto-approver";

// =============================================
// 스케줄된 크롤링 처리
// =============================================

/**
 * 스케줄된 크롤링 실행
 * Vercel Cron에서 호출
 */
export async function processScheduledCrawls(): Promise<{
    processed: number;
    newEvents: number;
    errors: number;
    runIds: string[];
}> {
    const supabase = await createClient();
    const now = new Date();

    // 1. 처리할 소스 조회 (next_crawl_at이 현재 시간 이전인 것)
    const { data: sources, error: sourcesError } = await supabase
        .from("crawl_sources")
        .select("*")
        .eq("is_active", true)
        .lte("next_crawl_at", now.toISOString())
        .order("priority", { ascending: false })
        .limit(10); // 한 번에 10개씩 처리

    if (sourcesError) {
        console.error("[scheduler] Failed to fetch sources:", sourcesError);
        throw new Error(`Failed to fetch crawl sources: ${sourcesError.message}`);
    }

    if (!sources || sources.length === 0) {
        return { processed: 0, newEvents: 0, errors: 0, runIds: [] };
    }

    let processed = 0;
    let totalNewEvents = 0;
    let errors = 0;
    const runIds: string[] = [];

    for (const source of sources) {
        try {
            // 2. 크롤 실행 기록 생성
            const { data: run, error: runError } = await supabase
                .from("crawl_runs")
                .insert({
                    source_id: source.id,
                    run_type: "scheduled",
                    status: "running",
                })
                .select()
                .single();

            if (runError) {
                console.error("[scheduler] Failed to create run:", runError);
                errors++;
                continue;
            }

            runIds.push(run.id);

            // 3. 소스 타입에 따라 크롤링 실행
            const startTime = Date.now();
            let result: CrawlBatchResult;

            if (source.source_type === "list") {
                result = await processListSource(transformDbSource(source));
            } else {
                result = await processDetailSource(transformDbSource(source));
            }

            const duration = Date.now() - startTime;

            // 4. 실행 기록 업데이트
            await supabase
                .from("crawl_runs")
                .update({
                    status: result.success ? "completed" : "failed",
                    completed_at: new Date().toISOString(),
                    duration_ms: duration,
                    urls_discovered: result.totalUrls,
                    urls_processed: result.processed,
                    new_events: result.newEvents,
                    auto_approved: result.autoApproved,
                    pending_review: result.pendingReview,
                    errors: result.failed,
                    error_message: result.errors.length > 0 ? result.errors[0].error : null,
                })
                .eq("id", run.id);

            // 5. 소스 업데이트
            await supabase
                .from("crawl_sources")
                .update({
                    last_crawled_at: new Date().toISOString(),
                    next_crawl_at: calculateNextCrawlTime(source.crawl_interval_hours).toISOString(),
                    success_count: source.success_count + 1,
                    consecutive_failures: 0,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", source.id);

            processed++;
            totalNewEvents += result.newEvents;
        } catch (error) {
            errors++;
            console.error(`[scheduler] Error processing source ${source.id}:`, error);

            // 에러 기록
            const consecutiveFailures = (source.consecutive_failures || 0) + 1;
            await supabase
                .from("crawl_sources")
                .update({
                    failure_count: source.failure_count + 1,
                    consecutive_failures: consecutiveFailures,
                    last_error: error instanceof Error ? error.message : "Unknown error",
                    last_error_at: new Date().toISOString(),
                    // 연속 3회 실패 시 비활성화
                    is_active: consecutiveFailures < 3,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", source.id);
        }
    }

    return { processed, newEvents: totalNewEvents, errors, runIds };
}

// =============================================
// 소스 타입별 처리
// =============================================

/**
 * 목록 소스 처리 (URL 발견 → 상세 크롤링)
 */
async function processListSource(source: CrawlSource): Promise<CrawlBatchResult> {
    // 1. 목록 페이지에서 URL 발견
    const listResult = await crawlListSource(source);

    if (!listResult.success || listResult.discoveredUrls.length === 0) {
        return {
            success: false,
            totalUrls: 0,
            processed: 0,
            newEvents: 0,
            updatedEvents: 0,
            autoApproved: 0,
            pendingReview: 0,
            failed: 0,
            skipped: 0,
            errors: listResult.errors.map((e) => ({ url: source.url, error: e })),
        };
    }

    // 2. 발견된 URL들을 상세 크롤링
    const urls = listResult.newUrls;
    return await crawlBatch(urls, source.id);
}

/**
 * 상세 소스 처리 (단일 URL 크롤링)
 */
async function processDetailSource(source: CrawlSource): Promise<CrawlBatchResult> {
    return await crawlBatch([source.url], source.id);
}

// =============================================
// 배치 크롤링
// =============================================

/**
 * 여러 URL을 배치로 크롤링
 */
export async function crawlBatch(
    urls: string[],
    sourceId?: string
): Promise<CrawlBatchResult> {
    const supabase = await createClient();
    const result: CrawlBatchResult = {
        success: true,
        totalUrls: urls.length,
        processed: 0,
        newEvents: 0,
        updatedEvents: 0,
        autoApproved: 0,
        pendingReview: 0,
        failed: 0,
        skipped: 0,
        errors: [],
    };

    for (const url of urls) {
        try {
            // 1. 이미 처리된 URL인지 확인 (중복 방지)
            const { data: existing } = await supabase
                .from("raw_source_items")
                .select("id")
                .eq("source_url", url)
                .limit(1);

            if (existing && existing.length > 0) {
                result.skipped++;
                continue;
            }

            // 2. URL Import 실행
            const importResult = await importUrl(url);

            // 3. Raw Source Item 저장
            const rawItem: Partial<RawSourceItem> = {
                sourceId,
                sourceSite: importResult.data?.sourceSite || "unknown",
                sourceUrl: url,
                fetchedAt: new Date(),
                status: importResult.success ? "processed" : "failed",
                confidence: importResult.data?.confidence,
                normalizedData: importResult.data?.prefillData,
                warnings: importResult.data?.warnings,
                errorMessage: importResult.error?.message,
            };

            const { data: savedRawItem, error: rawItemError } = await supabase
                .from("raw_source_items")
                .insert(transformToDbRawItem(rawItem))
                .select()
                .single();

            if (rawItemError) {
                console.error("[crawlBatch] Failed to save raw item:", rawItemError);
                result.failed++;
                result.errors.push({ url, error: rawItemError.message });
                continue;
            }

            if (!importResult.success || !importResult.data) {
                result.failed++;
                result.errors.push({
                    url,
                    error: importResult.error?.message || "Import failed",
                });
                continue;
            }

            // 4. Change Suggestion 생성
            const prefillData = importResult.data.prefillData;
            const { confidence, reasons } = calculateConfidence(
                prefillData,
                undefined,
                importResult.data.warnings
            );

            const suggestion: Partial<ChangeSuggestion> = {
                rawItemId: savedRawItem.id,
                sourceUrl: url,
                sourceSite: importResult.data.sourceSite,
                suggestionType: "new_event",
                suggestedData: prefillData,
                confidence,
                confidenceReasons: reasons,
                status: "pending",
                requiresReview: true,
            };

            // 5. 자동 승인 결정
            const decision = decideApproval(suggestion as ChangeSuggestion);
            suggestion.requiresReview = decision.action === "manual_review";
            suggestion.confidenceReasons = decision.reasons;

            if (decision.action === "auto_approve") {
                suggestion.status = "auto_approved";
            }

            const { error: suggestionError } = await supabase
                .from("change_suggestions")
                .insert(transformToDbSuggestion(suggestion));

            if (suggestionError) {
                console.error("[crawlBatch] Failed to save suggestion:", suggestionError);
            }

            result.processed++;
            result.newEvents++;

            if (decision.action === "auto_approve") {
                result.autoApproved++;
                // TODO: 실제 events 테이블에 반영
            } else {
                result.pendingReview++;
            }
        } catch (error) {
            result.failed++;
            result.errors.push({
                url,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    return result;
}

// =============================================
// 대기 중인 제안 처리
// =============================================

/**
 * 대기 중인 자동 승인 제안 처리
 */
export async function processPendingApprovals(): Promise<{
    processed: number;
    approved: number;
    errors: number;
}> {
    const supabase = await createClient();

    // auto_approved 상태이지만 아직 적용되지 않은 제안 조회
    const { data: suggestions, error } = await supabase
        .from("change_suggestions")
        .select("*")
        .eq("status", "auto_approved")
        .is("applied_at", null)
        .limit(50);

    if (error) {
        console.error("[processPendingApprovals] Failed to fetch suggestions:", error);
        throw error;
    }

    if (!suggestions || suggestions.length === 0) {
        return { processed: 0, approved: 0, errors: 0 };
    }

    let processed = 0;
    let approved = 0;
    let errors = 0;

    for (const suggestion of suggestions) {
        try {
            // events 테이블에 삽입
            const eventData = transformSuggestionToEvent(suggestion.suggested_data);

            const { data: newEvent, error: insertError } = await supabase
                .from("events")
                .insert(eventData)
                .select()
                .single();

            if (insertError) {
                console.error("[processPendingApprovals] Failed to insert event:", insertError);
                errors++;
                continue;
            }

            // suggestion 상태 업데이트
            await supabase
                .from("change_suggestions")
                .update({
                    status: "applied",
                    applied_at: new Date().toISOString(),
                    applied_event_id: newEvent.id,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", suggestion.id);

            processed++;
            approved++;
        } catch (error) {
            console.error(`[processPendingApprovals] Error processing suggestion ${suggestion.id}:`, error);
            errors++;
        }
    }

    return { processed, approved, errors };
}

// =============================================
// 헬퍼 함수
// =============================================

/**
 * 다음 크롤 시간 계산
 */
function calculateNextCrawlTime(intervalHours: number): Date {
    const now = new Date();
    return new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
}

/**
 * DB 소스를 앱 타입으로 변환
 */
function transformDbSource(dbSource: Record<string, unknown>): CrawlSource {
    return {
        id: dbSource.id as string,
        sourceSite: dbSource.source_site as SourceSite,
        sourceType: dbSource.source_type as "list" | "detail",
        url: dbSource.url as string,
        listConfig: dbSource.list_config as CrawlSource["listConfig"],
        isActive: dbSource.is_active as boolean,
        priority: dbSource.priority as number,
        crawlIntervalHours: dbSource.crawl_interval_hours as number,
        lastCrawledAt: dbSource.last_crawled_at ? new Date(dbSource.last_crawled_at as string) : undefined,
        nextCrawlAt: dbSource.next_crawl_at ? new Date(dbSource.next_crawl_at as string) : undefined,
        name: dbSource.name as string | undefined,
        notes: dbSource.notes as string | undefined,
        successCount: dbSource.success_count as number,
        failureCount: dbSource.failure_count as number,
        consecutiveFailures: dbSource.consecutive_failures as number,
        lastError: dbSource.last_error as string | undefined,
        lastErrorAt: dbSource.last_error_at ? new Date(dbSource.last_error_at as string) : undefined,
        createdAt: new Date(dbSource.created_at as string),
        updatedAt: new Date(dbSource.updated_at as string),
    };
}

/**
 * Raw Item을 DB 형식으로 변환
 */
function transformToDbRawItem(item: Partial<RawSourceItem>): Record<string, unknown> {
    return {
        source_id: item.sourceId,
        source_site: item.sourceSite,
        source_url: item.sourceUrl,
        fetched_at: item.fetchedAt?.toISOString(),
        http_status: item.httpStatus,
        content_type: item.contentType,
        content_hash: item.contentHash,
        extraction_method: item.extractionMethod,
        raw_event: item.rawEvent,
        normalized_data: item.normalizedData,
        confidence: item.confidence,
        warnings: item.warnings,
        status: item.status,
        matched_event_id: item.matchedEventId,
        similarity_score: item.similarityScore,
        error_code: item.errorCode,
        error_message: item.errorMessage,
    };
}

/**
 * Suggestion을 DB 형식으로 변환
 */
function transformToDbSuggestion(suggestion: Partial<ChangeSuggestion>): Record<string, unknown> {
    return {
        raw_item_id: suggestion.rawItemId,
        source_url: suggestion.sourceUrl,
        source_site: suggestion.sourceSite,
        suggestion_type: suggestion.suggestionType,
        target_event_id: suggestion.targetEventId,
        suggested_data: suggestion.suggestedData,
        diff_fields: suggestion.diffFields,
        diff_detail: suggestion.diffDetail,
        confidence: suggestion.confidence,
        confidence_reasons: suggestion.confidenceReasons,
        extraction_method: suggestion.extractionMethod,
        status: suggestion.status,
        requires_review: suggestion.requiresReview,
    };
}

/**
 * Suggestion 데이터를 Event 삽입 형식으로 변환
 */
function transformSuggestionToEvent(suggestedData: Record<string, unknown>): Record<string, unknown> {
    const data = suggestedData as Partial<CreateEventInput>;
    return {
        title: data.title,
        start_at: data.startAt instanceof Date ? data.startAt.toISOString() : data.startAt,
        end_at: data.endAt instanceof Date ? data.endAt.toISOString() : data.endAt,
        timezone: data.timezone || "Asia/Seoul",
        event_type: data.eventType || "concert",
        venue_name: data.venueName,
        venue_address: data.venueAddress,
        poster_url: data.posterUrl,
        price: data.price,
        description: data.description,
        official_url: data.officialUrl,
        status: "scheduled",
    };
}

// =============================================
// Export
// =============================================

export { calculateNextCrawlTime, transformDbSource };
