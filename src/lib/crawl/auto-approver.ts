/**
 * 자동 승인 로직
 *
 * 크롤링 결과의 신뢰도를 기반으로 자동 승인 또는 수동 검토 결정
 *
 * @see docs/tech/ingestion_crawling.md
 */

import {
    ChangeSuggestion,
    RawSourceItem,
    ApprovalDecision,
    ExtractConfidence,
    ExtractionMethod,
} from "@/types/crawl";
import { CreateEventInput } from "@/types/event-registration";

// =============================================
// 승인 결정 로직
// =============================================

/**
 * 자동 승인 여부 결정
 *
 * 자동 승인 조건:
 * 1. 신뢰도가 'high'
 * 2. 추출 방법이 'json-ld' (구조화 데이터)
 * 3. 필수 필드가 모두 존재 (title, startAt, venueName)
 *
 * 수동 검토 필요:
 * 1. 신뢰도가 'high'가 아님
 * 2. DOM 파싱으로 추출
 * 3. 필수 필드 누락
 * 4. 중요 필드 변경 (기존 행사 업데이트인 경우)
 */
export function decideApproval(
    suggestion: ChangeSuggestion,
    rawItem?: RawSourceItem
): ApprovalDecision {
    const reasons: string[] = [];

    // 1. 신뢰도 기반 판단
    const confidenceResult = checkConfidence(suggestion.confidence);
    reasons.push(...confidenceResult.reasons);
    if (confidenceResult.requiresReview) {
        return { action: "manual_review", reasons };
    }

    // 2. 추출 방법 기반 판단
    const extractionMethod = suggestion.extractionMethod || rawItem?.extractionMethod;
    const methodResult = checkExtractionMethod(extractionMethod);
    reasons.push(...methodResult.reasons);
    if (methodResult.requiresReview) {
        return { action: "manual_review", reasons };
    }

    // 3. 필수 필드 검증
    const data = suggestion.suggestedData as Partial<CreateEventInput>;
    const fieldResult = checkRequiredFields(data);
    reasons.push(...fieldResult.reasons);
    if (fieldResult.requiresReview) {
        return { action: "manual_review", reasons };
    }

    // 4. 제안 타입별 추가 검증
    if (suggestion.suggestionType === "new_event") {
        const newEventResult = checkNewEvent(suggestion);
        reasons.push(...newEventResult.reasons);
        if (newEventResult.requiresReview) {
            return { action: "manual_review", reasons };
        }
    } else if (suggestion.suggestionType === "update_event") {
        const updateResult = checkEventUpdate(suggestion);
        reasons.push(...updateResult.reasons);
        if (updateResult.requiresReview) {
            return { action: "manual_review", reasons };
        }
    } else if (suggestion.suggestionType === "cancel_event") {
        // 취소는 항상 수동 검토
        reasons.push("행사 취소는 수동 검토 필수");
        return { action: "manual_review", reasons };
    }

    // 모든 조건 통과 - 자동 승인
    reasons.push("자동 승인 조건 충족");
    return { action: "auto_approve", reasons };
}

// =============================================
// 개별 검증 함수
// =============================================

function checkConfidence(confidence: ExtractConfidence): {
    requiresReview: boolean;
    reasons: string[];
} {
    if (confidence === "high") {
        return {
            requiresReview: false,
            reasons: ["신뢰도 HIGH"],
        };
    } else if (confidence === "medium") {
        return {
            requiresReview: true,
            reasons: ["신뢰도 MEDIUM - 수동 검토 권장"],
        };
    } else {
        return {
            requiresReview: true,
            reasons: ["신뢰도 LOW - 수동 검토 필수"],
        };
    }
}

function checkExtractionMethod(method?: ExtractionMethod): {
    requiresReview: boolean;
    reasons: string[];
} {
    if (method === "json-ld") {
        return {
            requiresReview: false,
            reasons: ["JSON-LD 추출 (구조화 데이터)"],
        };
    } else if (method === "embedded-json") {
        return {
            requiresReview: false,
            reasons: ["Embedded JSON 추출 (__NEXT_DATA__ 등)"],
        };
    } else if (method === "dom") {
        return {
            requiresReview: true,
            reasons: ["DOM 파싱 추출 - 수동 검토 권장"],
        };
    } else if (method === "headless") {
        return {
            requiresReview: true,
            reasons: ["Headless 렌더링 추출 - 수동 검토 권장"],
        };
    }
    return {
        requiresReview: true,
        reasons: ["추출 방법 불명 - 수동 검토 필요"],
    };
}

function checkRequiredFields(data: Partial<CreateEventInput>): {
    requiresReview: boolean;
    reasons: string[];
} {
    const missing: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
        missing.push("title");
    }
    if (!data.startAt) {
        missing.push("startAt");
    }
    if (!data.venueName || data.venueName.trim().length === 0) {
        missing.push("venueName");
    }

    if (missing.length > 0) {
        return {
            requiresReview: true,
            reasons: [`필수 필드 누락: ${missing.join(", ")}`],
        };
    }

    return {
        requiresReview: false,
        reasons: ["필수 필드 모두 존재"],
    };
}

function checkNewEvent(suggestion: ChangeSuggestion): {
    requiresReview: boolean;
    reasons: string[];
} {
    // 새 행사는 신뢰도가 high가 아니면 수동 검토
    if (suggestion.confidence !== "high") {
        return {
            requiresReview: true,
            reasons: ["새 행사 등록 (신뢰도 high 아님) - 수동 검토 필요"],
        };
    }

    return {
        requiresReview: false,
        reasons: ["새 행사 등록 (신뢰도 high)"],
    };
}

function checkEventUpdate(suggestion: ChangeSuggestion): {
    requiresReview: boolean;
    reasons: string[];
} {
    // 중요 필드 변경은 수동 검토
    const criticalFields = ["title", "startAt", "endAt", "venueName", "venueAddress"];
    const changedCritical = suggestion.diffFields?.filter((f) =>
        criticalFields.includes(f)
    );

    if (changedCritical && changedCritical.length > 0) {
        return {
            requiresReview: true,
            reasons: [`중요 필드 변경: ${changedCritical.join(", ")} - 수동 검토 필요`],
        };
    }

    // 비중요 필드만 변경 (posterUrl, price 등)은 자동 승인 가능
    const nonCriticalFields = ["posterUrl", "price", "description", "officialUrl"];
    const changedNonCritical = suggestion.diffFields?.filter((f) =>
        nonCriticalFields.includes(f)
    );

    if (changedNonCritical && changedNonCritical.length > 0) {
        return {
            requiresReview: false,
            reasons: [`비중요 필드 업데이트: ${changedNonCritical.join(", ")}`],
        };
    }

    return {
        requiresReview: false,
        reasons: ["기존 행사 업데이트"],
    };
}

// =============================================
// 신뢰도 계산
// =============================================

/**
 * 추출 결과에서 신뢰도 계산
 */
export function calculateConfidence(
    data: Partial<CreateEventInput>,
    extractionMethod?: ExtractionMethod,
    warnings?: string[]
): { confidence: ExtractConfidence; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // 필드별 점수
    if (data.title && data.title.length >= 2) {
        score += 2;
        reasons.push("제목 있음 (+2)");
    }
    if (data.startAt) {
        score += 2;
        reasons.push("시작일 있음 (+2)");
    }
    if (data.venueName) {
        score += 1;
        reasons.push("장소명 있음 (+1)");
    }
    if (data.posterUrl) {
        score += 1;
        reasons.push("포스터 있음 (+1)");
    }
    if (data.price) {
        score += 0.5;
        reasons.push("가격 있음 (+0.5)");
    }
    if (data.artists && data.artists.length > 0) {
        score += 0.5;
        reasons.push("아티스트 있음 (+0.5)");
    }

    // 추출 방법 보너스
    if (extractionMethod === "json-ld") {
        score += 1;
        reasons.push("JSON-LD 추출 (+1)");
    } else if (extractionMethod === "embedded-json") {
        score += 0.5;
        reasons.push("Embedded JSON 추출 (+0.5)");
    }

    // 경고 페널티
    if (warnings && warnings.length > 0) {
        score -= 0.5 * warnings.length;
        reasons.push(`경고 ${warnings.length}개 (-${0.5 * warnings.length})`);
    }

    // 최종 신뢰도
    let confidence: ExtractConfidence;
    if (score >= 5) {
        confidence = "high";
    } else if (score >= 3) {
        confidence = "medium";
    } else {
        confidence = "low";
    }

    reasons.push(`총점: ${score} → ${confidence.toUpperCase()}`);

    return { confidence, reasons };
}

// =============================================
// Diff 계산
// =============================================

/**
 * 두 데이터 간의 변경사항 계산
 */
export function calculateDiff(
    before: Partial<CreateEventInput>,
    after: Partial<CreateEventInput>
): {
    diffFields: string[];
    diffDetail: Record<string, { before: unknown; after: unknown }>;
} {
    const fields: Array<keyof CreateEventInput> = [
        "title",
        "startAt",
        "endAt",
        "venueName",
        "venueAddress",
        "eventType",
        "posterUrl",
        "price",
        "description",
        "officialUrl",
    ];

    const diffFields: string[] = [];
    const diffDetail: Record<string, { before: unknown; after: unknown }> = {};

    for (const field of fields) {
        const beforeVal = before[field];
        const afterVal = after[field];

        // 값이 다른지 비교
        if (!isEqual(beforeVal, afterVal)) {
            diffFields.push(field);
            diffDetail[field] = {
                before: beforeVal,
                after: afterVal,
            };
        }
    }

    // artists 배열 비교
    if (!arraysEqual(before.artists, after.artists)) {
        diffFields.push("artists");
        diffDetail.artists = {
            before: before.artists,
            after: after.artists,
        };
    }

    // ticketLinks 배열 비교
    if (!arraysEqual(before.ticketLinks, after.ticketLinks)) {
        diffFields.push("ticketLinks");
        diffDetail.ticketLinks = {
            before: before.ticketLinks,
            after: after.ticketLinks,
        };
    }

    return { diffFields, diffDetail };
}

/**
 * 값 비교 (Date 처리 포함)
 */
function isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Date 비교
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }

    // 문자열 비교 (trim)
    if (typeof a === "string" && typeof b === "string") {
        return a.trim() === b.trim();
    }

    return false;
}

/**
 * 배열 비교
 */
function arraysEqual(a?: unknown[], b?: unknown[]): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return JSON.stringify(a) === JSON.stringify(b);
}

// =============================================
// Export
// =============================================

export type { ApprovalDecision };
