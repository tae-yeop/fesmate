/**
 * 크롤링 파이프라인 메인 모듈
 *
 * URL에서 행사 정보를 추출하여 프리필 데이터로 변환
 *
 * @see docs/tech/ingestion_crawling.md
 */

import {
    ImportUrlResponse,
    NormalizerResult,
    ExtractorResult,
    FetchResult,
} from "@/types/crawl";
import { fetchUrl, isValidUrl } from "./fetcher";
import { detectSite, isValidTicketPage } from "./detector";
import { getExtractor } from "./extractors";
import { normalizeRawEvent } from "./normalizer";

/**
 * URL에서 행사 정보를 추출하여 프리필 데이터로 반환
 *
 * @param url 예매처 또는 공식 페이지 URL
 * @returns ImportUrlResponse
 */
export async function importUrl(url: string): Promise<ImportUrlResponse> {
    // 1. URL 검증
    if (!url || !isValidUrl(url)) {
        return {
            success: false,
            error: {
                code: "INVALID_URL",
                message: "유효한 URL을 입력해주세요.",
            },
        };
    }

    // 2. 티켓 페이지 유효성 검사
    const validation = isValidTicketPage(url);
    if (!validation.valid) {
        return {
            success: false,
            error: {
                code: "INVALID_URL",
                message: validation.reason || "유효한 티켓 페이지 URL이 아닙니다.",
            },
        };
    }

    // 3. HTML 가져오기
    let fetchResult: FetchResult;
    try {
        fetchResult = await fetchUrl(url);
    } catch (error) {
        return {
            success: false,
            error: {
                code: "FETCH_FAILED",
                message: error instanceof Error ? error.message : "페이지를 가져오는 중 오류가 발생했습니다.",
            },
        };
    }

    if (!fetchResult.success || !fetchResult.html) {
        return {
            success: false,
            error: {
                code: "FETCH_FAILED",
                message: fetchResult.error || "페이지를 가져올 수 없습니다.",
            },
        };
    }

    // 4. 소스 사이트 감지 및 Extractor 선택
    const site = detectSite(fetchResult.url);
    const extractor = getExtractor(fetchResult.url);

    // 5. HTML에서 정보 추출
    let extractResult: ExtractorResult;
    try {
        extractResult = await extractor.extract(fetchResult.html, fetchResult.url);
    } catch (error) {
        return {
            success: false,
            error: {
                code: "PARSE_FAILED",
                message: error instanceof Error ? error.message : "페이지 파싱 중 오류가 발생했습니다.",
            },
        };
    }

    if (!extractResult.success || !extractResult.rawEvent) {
        return {
            success: false,
            error: {
                code: "PARSE_FAILED",
                message: extractResult.error || "페이지에서 행사 정보를 찾을 수 없습니다.",
            },
        };
    }

    // 6. 정규화
    let normalizeResult: NormalizerResult;
    try {
        normalizeResult = normalizeRawEvent(extractResult.rawEvent);
    } catch (error) {
        return {
            success: false,
            error: {
                code: "PARSE_FAILED",
                message: error instanceof Error ? error.message : "데이터 정규화 중 오류가 발생했습니다.",
            },
        };
    }

    if (!normalizeResult.success || !normalizeResult.prefillData) {
        return {
            success: false,
            error: {
                code: "PARSE_FAILED",
                message: normalizeResult.error || "데이터를 정규화할 수 없습니다.",
            },
        };
    }

    // 7. 경고 메시지 통합
    const warnings = [
        ...(extractResult.warnings || []),
        ...(normalizeResult.warnings || []),
    ];

    // 8. 성공 응답
    return {
        success: true,
        data: {
            prefillData: normalizeResult.prefillData,
            sourceSite: site,
            sourceUrl: fetchResult.url,
            confidence: normalizeResult.confidence,
            warnings: warnings.length > 0 ? warnings : undefined,
        },
    };
}

// Re-exports
export { fetchUrl, isValidUrl } from "./fetcher";
export { detectSite, isSupportedTicketSite, isValidTicketPage } from "./detector";
export { getExtractor, getExtractorBySite, getSupportedSites } from "./extractors";
export { normalizeRawEvent, parseDate, parseVenue } from "./normalizer";

// Auto Crawl Re-exports
export { crawlListSource, discoverAllEvents, SITE_LIST_CONFIGS } from "./list-crawler";
export { decideApproval, calculateConfidence, calculateDiff } from "./auto-approver";
export {
    processScheduledCrawls,
    processPendingApprovals,
    crawlBatch,
} from "./scheduler";
