/**
 * 크롤링 파이프라인 타입 정의
 * @see docs/tech/ingestion_crawling.md
 */

import { EventType, TicketLink } from "./event";
import { CreateEventInput } from "./event-registration";

// =============================================
// Source Site Definitions
// =============================================

/** 지원 소스 사이트 */
export type SourceSite =
    | "yes24"
    | "interpark"
    | "melon"
    | "ticketlink"
    | "official"
    | "unknown";

/** 사이트 감지 패턴 */
export const SITE_PATTERNS: Record<SourceSite, RegExp> = {
    yes24: /ticket\.yes24\.com/i,
    interpark: /tickets\.interpark\.com|ticketinter\.com/i,
    melon: /ticket\.melon\.com/i,
    ticketlink: /ticketlink\.co\.kr/i,
    official: /\.(com|co\.kr|net|org)$/i,
    unknown: /.*/,
};

/** 사이트 라벨 */
export const SITE_LABELS: Record<SourceSite, string> = {
    yes24: "YES24",
    interpark: "인터파크",
    melon: "멜론티켓",
    ticketlink: "티켓링크",
    official: "공식 사이트",
    unknown: "기타",
};

// =============================================
// Fetcher Types
// =============================================

/** Fetch 결과 */
export interface FetchResult {
    success: boolean;
    html?: string;
    url: string; // 최종 URL (리다이렉트 후)
    statusCode?: number;
    contentType?: string;
    error?: string;
}

/** Fetch 옵션 */
export interface FetchOptions {
    timeout?: number; // 기본: 10000ms
    userAgent?: string;
    followRedirects?: boolean;
}

// =============================================
// Extractor Types
// =============================================

/** 추출된 원시 행사 데이터 (정규화 전) */
export interface RawEvent {
    // 소스 메타데이터
    sourceSite: SourceSite;
    sourceUrl: string;
    fetchedAt: Date;

    // 추출된 필드 (모두 optional - best effort)
    title?: string;
    startAtRaw?: string; // 원시 날짜 문자열
    endAtRaw?: string; // 원시 날짜 문자열
    venueText?: string; // "올림픽공원 88잔디마당"
    venueAddressText?: string; // 주소가 별도로 있는 경우

    posterUrls?: string[];
    ticketingUrls?: string[]; // 추가 예매 URL
    priceText?: string; // "VIP 160,000원 / R 130,000원"
    ageRestriction?: string;

    // 일정/출연진
    scheduleText?: string; // 원시 일정 텍스트
    artistNames?: string[]; // 추출된 아티스트 이름

    // 행사 유형 힌트
    eventTypeHint?: EventType;

    // 추가 메타데이터
    description?: string;
    metadata?: Record<string, unknown>;
}

/** 추출 신뢰도 */
export type ExtractConfidence = "high" | "medium" | "low";

/** 추출 방법 */
export type ExtractionMethod = "json-ld" | "embedded-json" | "dom" | "headless";

/** Extractor 결과 */
export interface ExtractorResult {
    success: boolean;
    rawEvent?: RawEvent;
    confidence: ExtractConfidence;
    warnings?: string[];
    error?: string;
    extractionMethod?: ExtractionMethod;
}

// =============================================
// Normalizer Types
// =============================================

/** 정규화 결과 */
export interface NormalizerResult {
    success: boolean;
    prefillData?: Partial<CreateEventInput>;
    originalUrl: string;
    sourceSite: SourceSite;
    confidence: ExtractConfidence;
    warnings?: string[];
    error?: string;
}

// =============================================
// API Types
// =============================================

/** URL Import 요청 */
export interface ImportUrlRequest {
    url: string;
}

/** URL Import 응답 */
export interface ImportUrlResponse {
    success: boolean;
    data?: {
        prefillData: Partial<CreateEventInput>;
        sourceSite: SourceSite;
        sourceUrl: string;
        confidence: ExtractConfidence;
        warnings?: string[];
    };
    error?: {
        code: ImportUrlErrorCode;
        message: string;
    };
}

/** URL Import 에러 코드 */
export type ImportUrlErrorCode =
    | "INVALID_URL"
    | "FETCH_FAILED"
    | "PARSE_FAILED"
    | "UNSUPPORTED_SITE"
    | "TIMEOUT"
    | "UNKNOWN_ERROR";

// =============================================
// Auto Crawl Types (자동 크롤링)
// =============================================

/** 크롤 소스 타입 */
export type CrawlSourceType = "list" | "detail";

/** 크롤 소스 (DB: crawl_sources) */
export interface CrawlSource {
    id: string;
    sourceSite: SourceSite;
    sourceType: CrawlSourceType;
    url: string;
    listConfig?: ListCrawlerConfig;
    isActive: boolean;
    priority: number;
    crawlIntervalHours: number;
    lastCrawledAt?: Date;
    nextCrawlAt?: Date;
    name?: string;
    notes?: string;
    successCount: number;
    failureCount: number;
    consecutiveFailures: number;
    lastError?: string;
    lastErrorAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

/** 목록 크롤러 설정 */
export interface ListCrawlerConfig {
    category?: string;
    linkPattern?: string; // 정규식 패턴 문자열
    maxPages?: number;
    pagination?: {
        type: "page" | "scroll" | "loadmore";
        paramName?: string;
    };
}

/** Raw Source Item 상태 */
export type RawSourceItemStatus =
    | "pending"
    | "processing"
    | "processed"
    | "matched"
    | "new"
    | "failed"
    | "skipped";

/** 크롤링 원본 아이템 (DB: raw_source_items) */
export interface RawSourceItem {
    id: string;
    sourceId?: string;
    sourceSite: SourceSite;
    sourceUrl: string;
    fetchedAt: Date;
    httpStatus?: number;
    contentType?: string;
    contentHash?: string;
    extractionMethod?: ExtractionMethod;
    rawEvent?: RawEvent;
    normalizedData?: Partial<CreateEventInput>;
    confidence?: ExtractConfidence;
    warnings?: string[];
    status: RawSourceItemStatus;
    matchedEventId?: string;
    similarityScore?: number;
    errorCode?: string;
    errorMessage?: string;
    createdAt: Date;
}

/** 변경 제안 타입 */
export type SuggestionType = "new_event" | "update_event" | "cancel_event";

/** 변경 제안 상태 */
export type SuggestionStatus =
    | "pending"
    | "auto_approved"
    | "approved"
    | "rejected"
    | "applied";

/** 변경 제안 (DB: change_suggestions) */
export interface ChangeSuggestion {
    id: string;
    rawItemId?: string;
    sourceUrl: string;
    sourceSite: SourceSite;
    suggestionType: SuggestionType;
    targetEventId?: string;
    suggestedData: Partial<CreateEventInput>;
    diffFields?: string[];
    diffDetail?: Record<string, { before: unknown; after: unknown }>;
    confidence: ExtractConfidence;
    confidenceReasons?: string[];
    extractionMethod?: ExtractionMethod;
    status: SuggestionStatus;
    requiresReview: boolean;
    reviewedBy?: string;
    reviewedAt?: Date;
    reviewNotes?: string;
    appliedAt?: Date;
    appliedEventId?: string;
    createdAt: Date;
    updatedAt: Date;
}

/** 크롤 실행 타입 */
export type CrawlRunType = "scheduled" | "manual" | "retry";

/** 크롤 실행 상태 */
export type CrawlRunStatus = "running" | "completed" | "failed" | "partial";

/** 크롤 실행 기록 (DB: crawl_runs) */
export interface CrawlRun {
    id: string;
    sourceId?: string;
    runType: CrawlRunType;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    status: CrawlRunStatus;
    urlsDiscovered: number;
    urlsProcessed: number;
    newEvents: number;
    updatedEvents: number;
    autoApproved: number;
    pendingReview: number;
    skipped: number;
    errors: number;
    errorMessage?: string;
    errorDetails?: Record<string, unknown>;
    createdAt: Date;
}

/** 자동 승인 결정 */
export interface ApprovalDecision {
    action: "auto_approve" | "manual_review";
    reasons: string[];
}

/** 배치 크롤 결과 */
export interface CrawlBatchResult {
    success: boolean;
    totalUrls: number;
    processed: number;
    newEvents: number;
    updatedEvents: number;
    autoApproved: number;
    pendingReview: number;
    failed: number;
    skipped: number;
    errors: Array<{ url: string; error: string }>;
}

/** 발견된 URL */
export interface DiscoveredUrl {
    url: string;
    sourceSite: SourceSite;
    category?: string;
    discoveredAt: Date;
}

/** 목록 크롤 결과 */
export interface ListCrawlResult {
    success: boolean;
    source: CrawlSource;
    discoveredUrls: DiscoveredUrl[];
    newUrls: string[]; // DB에 없던 새 URL
    existingUrls: string[]; // 이미 존재하는 URL
    errors: string[];
}
