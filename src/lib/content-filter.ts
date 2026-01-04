/**
 * 콘텐츠 필터링 유틸리티
 * 금지어, 링크 검증, 스팸 탐지
 */

import type {
    ContentFilterResult,
    ForbiddenWord,
    LinkValidationResult,
    MatchedPattern,
} from "@/types/content-filter";
import {
    DEFAULT_FORBIDDEN_WORDS,
    WHITELIST_DOMAINS,
    SHORTENED_URL_DOMAINS,
    BLOCKED_DOMAINS,
    CATEGORY_MESSAGES,
    LEVEL_MESSAGES,
} from "@/types/content-filter";

/**
 * 콘텐츠 필터링
 * @param content 검사할 콘텐츠
 * @param customWords 추가 금지어 목록
 * @returns 필터링 결과
 */
export function filterContent(
    content: string,
    customWords: ForbiddenWord[] = []
): ContentFilterResult {
    const allWords = [...DEFAULT_FORBIDDEN_WORDS, ...customWords];
    const matchedPatterns: MatchedPattern[] = [];

    for (const word of allWords) {
        let pattern: RegExp;

        if (word.isRegex) {
            try {
                pattern = new RegExp(word.pattern, "gi");
            } catch {
                // 잘못된 정규식은 스킵
                continue;
            }
        } else {
            // 일반 문자열은 이스케이프 처리
            const escaped = word.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            pattern = new RegExp(escaped, "gi");
        }

        const matches = content.match(pattern);
        if (matches) {
            matchedPatterns.push({
                pattern: word.pattern,
                category: word.category,
                level: word.level,
                matchedText: matches[0],
            });
        }
    }

    if (matchedPatterns.length === 0) {
        return { passed: true, matchedPatterns: [] };
    }

    // 가장 높은 레벨 결정 (block > hide > warn)
    const levelPriority = { block: 3, hide: 2, warn: 1 };
    const highestLevel = matchedPatterns.reduce((highest, current) => {
        return levelPriority[current.level] > levelPriority[highest.level]
            ? current
            : highest;
    }).level;

    // 카테고리별 메시지 생성
    const categories = [...new Set(matchedPatterns.map((p) => p.category))];
    const categoryMessage = categories.map((c) => CATEGORY_MESSAGES[c]).join(", ");

    return {
        passed: false,
        level: highestLevel,
        matchedPatterns,
        message:
            highestLevel === "warn"
                ? `${categoryMessage}. 계속하시겠습니까?`
                : `${categoryMessage}. ${LEVEL_MESSAGES[highestLevel]}`,
    };
}

/**
 * URL 추출
 * @param content 콘텐츠
 * @returns URL 목록
 */
export function extractUrls(content: string): string[] {
    const urlPattern =
        /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;
    return content.match(urlPattern) || [];
}

/**
 * URL에서 도메인 추출
 * @param url URL 문자열
 * @returns 도메인
 */
export function extractDomain(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

/**
 * 단일 링크 검증
 * @param url 검증할 URL
 * @returns 검증 결과
 */
export function validateLink(url: string): LinkValidationResult {
    const domain = extractDomain(url);

    if (!domain) {
        return {
            url,
            allowed: false,
            warning: false,
            reason: "suspicious",
            message: "유효하지 않은 URL입니다",
        };
    }

    // 차단 도메인 체크
    if (BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked))) {
        return {
            url,
            allowed: false,
            warning: false,
            reason: "blocked_domain",
            message: "허용되지 않는 도메인입니다",
        };
    }

    // 단축 URL 체크 (차단)
    if (SHORTENED_URL_DOMAINS.some((shortened) => domain === shortened)) {
        return {
            url,
            allowed: false,
            warning: false,
            reason: "shortened_url",
            message: "단축 URL은 허용되지 않습니다. 원본 URL을 사용해주세요.",
        };
    }

    // 화이트리스트 체크
    const isWhitelisted = WHITELIST_DOMAINS.some(
        (whitelisted) => domain === whitelisted || domain.endsWith(`.${whitelisted}`)
    );

    if (!isWhitelisted) {
        return {
            url,
            allowed: true,
            warning: true,
            reason: "suspicious",
            message: "확인되지 않은 외부 링크입니다. 주의해서 클릭하세요.",
        };
    }

    return {
        url,
        allowed: true,
        warning: false,
    };
}

/**
 * 콘텐츠 내 모든 링크 검증
 * @param content 콘텐츠
 * @returns 링크 검증 결과 목록
 */
export function validateAllLinks(content: string): LinkValidationResult[] {
    const urls = extractUrls(content);
    return urls.map(validateLink);
}

/**
 * 콘텐츠에 차단된 링크가 있는지 확인
 * @param content 콘텐츠
 * @returns 차단 여부와 메시지
 */
export function hasBlockedLinks(content: string): {
    blocked: boolean;
    warnings: string[];
} {
    const results = validateAllLinks(content);
    const blocked = results.filter((r) => !r.allowed);
    const warnings = results.filter((r) => r.allowed && r.warning);

    return {
        blocked: blocked.length > 0,
        warnings: warnings.map((w) => w.message || "주의가 필요한 링크가 있습니다"),
    };
}

/**
 * 스팸 점수 계산
 * 높을수록 스팸 가능성 높음
 * @param content 콘텐츠
 * @returns 0-100 스팸 점수
 */
export function calculateSpamScore(content: string): number {
    let score = 0;

    // 과도한 특수문자
    const specialChars = (content.match(/[!@#$%^&*(){}[\]|\\:";'<>,.?\/~`]/g) || [])
        .length;
    const specialRatio = specialChars / content.length;
    if (specialRatio > 0.2) score += 20;

    // 과도한 이모지
    const emojiCount = (
        content.match(
            /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
        ) || []
    ).length;
    if (emojiCount > 10) score += 15;

    // 반복 문자 (ㅋㅋㅋㅋㅋ, ㅎㅎㅎㅎㅎ 등)
    if (/(.)\1{4,}/g.test(content)) score += 15;

    // 대문자 과다 (영문)
    const upperCase = content.match(/[A-Z]/g)?.length || 0;
    const lowerCase = content.match(/[a-z]/g)?.length || 0;
    if (upperCase > lowerCase && upperCase > 10) score += 10;

    // URL 과다
    const urls = extractUrls(content);
    if (urls.length > 3) score += 20;

    // 너무 짧은 글 (의미 없는 글 가능성)
    if (content.trim().length < 5) score += 10;

    // 연락처 패턴 (전화번호, 카카오톡 ID 등)
    if (/01[0-9]-?\d{4}-?\d{4}/.test(content)) score += 15;
    if (/카톡|카카오|kakao/i.test(content)) score += 10;

    return Math.min(100, score);
}

/**
 * 통합 콘텐츠 검증
 * @param content 콘텐츠
 * @returns 검증 결과
 */
export function validateContent(content: string): {
    filterResult: ContentFilterResult;
    linkResults: LinkValidationResult[];
    spamScore: number;
    isSpam: boolean;
} {
    const filterResult = filterContent(content);
    const linkResults = validateAllLinks(content);
    const spamScore = calculateSpamScore(content);

    return {
        filterResult,
        linkResults,
        spamScore,
        isSpam: spamScore >= 60,
    };
}
