/**
 * 콘텐츠 필터 타입 정의
 * 금지어, 스팸, 외부 링크 검증
 */

/** 필터 레벨 */
export type FilterLevel = "warn" | "block" | "hide";

/** 금지어 카테고리 */
export type ForbiddenCategory = "profanity" | "spam" | "hate" | "scam" | "adult";

/** 금지어 항목 */
export interface ForbiddenWord {
    /** 패턴 (문자열 또는 정규식) */
    pattern: string;
    /** 정규식 여부 */
    isRegex?: boolean;
    /** 필터 레벨 */
    level: FilterLevel;
    /** 카테고리 */
    category: ForbiddenCategory;
    /** 설명 (관리용) */
    description?: string;
}

/** 콘텐츠 검증 결과 */
export interface ContentFilterResult {
    /** 통과 여부 */
    passed: boolean;
    /** 필터 레벨 (실패 시) */
    level?: FilterLevel;
    /** 매칭된 패턴들 */
    matchedPatterns: MatchedPattern[];
    /** 사용자 메시지 */
    message?: string;
}

/** 매칭된 패턴 정보 */
export interface MatchedPattern {
    pattern: string;
    category: ForbiddenCategory;
    level: FilterLevel;
    /** 매칭된 텍스트 */
    matchedText?: string;
}

/** 링크 검증 결과 */
export interface LinkValidationResult {
    /** URL */
    url: string;
    /** 허용 여부 */
    allowed: boolean;
    /** 경고 여부 */
    warning: boolean;
    /** 사유 */
    reason?: "blocked_domain" | "shortened_url" | "suspicious";
    /** 메시지 */
    message?: string;
}

/** 콘텐츠 유사도 검사 결과 */
export interface SimilarityCheckResult {
    /** 통과 여부 */
    passed: boolean;
    /** 가장 유사한 콘텐츠 ID */
    similarPostId?: string;
    /** 유사도 (0-1) */
    similarity?: number;
    /** 메시지 */
    message?: string;
}

/** 화이트리스트 도메인 */
export const WHITELIST_DOMAINS = [
    // 예매처
    "interpark.com",
    "ticket.interpark.com",
    "ticket.melon.com",
    "tickets.yes24.com",
    "ticketlink.co.kr",
    // SNS
    "instagram.com",
    "twitter.com",
    "x.com",
    "youtube.com",
    "youtu.be",
    // 지도
    "map.kakao.com",
    "map.naver.com",
    "maps.google.com",
    // 기타 신뢰 도메인
    "naver.com",
    "daum.net",
    "kakao.com",
] as const;

/** 단축 URL 도메인 (경고 대상) */
export const SHORTENED_URL_DOMAINS = [
    "bit.ly",
    "tinyurl.com",
    "goo.gl",
    "t.co",
    "ow.ly",
    "is.gd",
    "buff.ly",
    "me2.do",
    "vo.la",
] as const;

/** 차단 도메인 */
export const BLOCKED_DOMAINS = [
    // 악성 사이트, 피싱 등 추가
] as const;

// 구분자 우회 패턴: ., ·, -, _, 공백 등
const SEP = "[.·\\-_\\s]*";

/** 기본 금지어 목록 */
export const DEFAULT_FORBIDDEN_WORDS: ForbiddenWord[] = [
    // 욕설 (block) - 구분자 우회 대응
    { pattern: `시${SEP}발`, level: "block", category: "profanity", isRegex: true },
    { pattern: `씨${SEP}발`, level: "block", category: "profanity", isRegex: true },
    { pattern: `병${SEP}신`, level: "block", category: "profanity", isRegex: true },
    { pattern: `지${SEP}랄`, level: "block", category: "profanity", isRegex: true },
    { pattern: `개${SEP}새${SEP}끼`, level: "block", category: "profanity", isRegex: true },
    { pattern: "좆", level: "block", category: "profanity" },
    { pattern: `f${SEP}u${SEP}c${SEP}k`, level: "block", category: "profanity", isRegex: true },

    // 혐오 표현 (block) - 구분자 우회 대응
    { pattern: `한${SEP}남`, level: "block", category: "hate", isRegex: true },
    { pattern: `한${SEP}녀`, level: "block", category: "hate", isRegex: true },
    { pattern: `틀${SEP}딱`, level: "block", category: "hate", isRegex: true },
    { pattern: `급${SEP}식${SEP}충`, level: "block", category: "hate", isRegex: true },

    // 스팸/광고 (warn)
    { pattern: "카톡.*문의", level: "warn", category: "spam", isRegex: true },
    { pattern: "텔레.*그램", level: "warn", category: "spam", isRegex: true },
    { pattern: "무료\\s*나눔", level: "warn", category: "spam", isRegex: true },
    { pattern: "선착순.*한정", level: "warn", category: "spam", isRegex: true },

    // 사기 의심 (warn - 경고 후 게시 가능)
    // 구분자(., ·, -, _, 공백 등) 우회 패턴 대응
    { pattern: "선[.·\\-_\\s]*입[.·\\-_\\s]*금", level: "warn", category: "scam", isRegex: true },
    { pattern: "계[.·\\-_\\s]*좌[.·\\-_\\s]*.*이[.·\\-_\\s]*체", level: "warn", category: "scam", isRegex: true },
    { pattern: "입[.·\\-_\\s]*금[.·\\-_\\s]*.*확[.·\\-_\\s]*인", level: "warn", category: "scam", isRegex: true },
    { pattern: "안[.·\\-_\\s]*전[.·\\-_\\s]*결[.·\\-_\\s]*제", level: "warn", category: "scam", isRegex: true },
    { pattern: "먼[.·\\-_\\s]*저.*보[.·\\-_\\s]*내", level: "warn", category: "scam", isRegex: true },
    { pattern: "송[.·\\-_\\s]*금[.·\\-_\\s]*.*먼[.·\\-_\\s]*저", level: "warn", category: "scam", isRegex: true },

    // 성인 콘텐츠 (block) - 구분자 우회 대응
    { pattern: `섹${SEP}스`, level: "block", category: "adult", isRegex: true },
    { pattern: `야${SEP}동`, level: "block", category: "adult", isRegex: true },
    { pattern: `포${SEP}르${SEP}노`, level: "block", category: "adult", isRegex: true },
];

/** 카테고리별 메시지 */
export const CATEGORY_MESSAGES: Record<ForbiddenCategory, string> = {
    profanity: "욕설이 포함되어 있습니다",
    spam: "스팸성 내용이 감지되었습니다",
    hate: "혐오 표현이 포함되어 있습니다",
    scam: "사기 의심 내용이 감지되었습니다",
    adult: "성인 콘텐츠가 포함되어 있습니다",
};

/** 필터 레벨별 메시지 */
export const LEVEL_MESSAGES: Record<FilterLevel, string> = {
    warn: "부적절한 내용이 포함되어 있을 수 있습니다. 계속하시겠습니까?",
    block: "부적절한 내용으로 인해 작성할 수 없습니다",
    hide: "이 콘텐츠는 검토 중입니다",
};
