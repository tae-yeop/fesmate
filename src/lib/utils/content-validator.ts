/**
 * 콘텐츠 유효성 검증 유틸리티
 * 연속 동일 내용 방지, 유사도 검사
 */

import type { SimilarityCheckResult } from "@/types/content-filter";

/** 유사도 검사 설정 */
export interface SimilarityConfig {
    /** 최근 N개 글과 비교 */
    recentPostCount: number;
    /** 유사도 임계값 (0-1) */
    threshold: number;
    /** 최소 글자 수 (이하는 검사 스킵) */
    minLength: number;
}

/** 기본 설정 */
export const SIMILARITY_CONFIG: SimilarityConfig = {
    recentPostCount: 3,
    threshold: 0.8,
    minLength: 10,
};

/**
 * 두 문자열의 유사도 계산 (Jaccard similarity)
 * @param str1 첫 번째 문자열
 * @param str2 두 번째 문자열
 * @returns 0-1 사이의 유사도
 */
export function calculateSimilarity(str1: string, str2: string): number {
    // 정규화: 공백, 특수문자 제거, 소문자 변환
    const normalize = (s: string) =>
        s
            .toLowerCase()
            .replace(/[\s\n\r\t]+/g, " ")
            .replace(/[^\w가-힣\s]/g, "")
            .trim();

    const normalized1 = normalize(str1);
    const normalized2 = normalize(str2);

    if (!normalized1 || !normalized2) return 0;
    if (normalized1 === normalized2) return 1;

    // N-gram 생성 (3글자씩)
    const createNgrams = (s: string, n: number = 3): Set<string> => {
        const ngrams = new Set<string>();
        for (let i = 0; i <= s.length - n; i++) {
            ngrams.add(s.substring(i, i + n));
        }
        return ngrams;
    };

    const ngrams1 = createNgrams(normalized1);
    const ngrams2 = createNgrams(normalized2);

    if (ngrams1.size === 0 || ngrams2.size === 0) {
        // 짧은 문자열은 단순 비교
        return normalized1 === normalized2 ? 1 : 0;
    }

    // Jaccard similarity: |A ∩ B| / |A ∪ B|
    let intersection = 0;
    ngrams1.forEach((ngram) => {
        if (ngrams2.has(ngram)) intersection++;
    });

    const union = ngrams1.size + ngrams2.size - intersection;
    return union > 0 ? intersection / union : 0;
}

/**
 * 최근 글들과 유사도 검사
 * @param content 새 글 내용
 * @param recentPosts 최근 글 목록 [{id, content}]
 * @param config 설정
 * @returns 검사 결과
 */
export function checkContentSimilarity(
    content: string,
    recentPosts: Array<{ id: string; content: string }>,
    config: SimilarityConfig = SIMILARITY_CONFIG
): SimilarityCheckResult {
    // 짧은 글은 검사 스킵
    if (content.length < config.minLength) {
        return { passed: true };
    }

    // 최근 N개만 검사
    const postsToCheck = recentPosts.slice(0, config.recentPostCount);

    let maxSimilarity = 0;
    let mostSimilarPostId: string | undefined;

    for (const post of postsToCheck) {
        const similarity = calculateSimilarity(content, post.content);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            mostSimilarPostId = post.id;
        }
    }

    const passed = maxSimilarity < config.threshold;

    return {
        passed,
        similarPostId: passed ? undefined : mostSimilarPostId,
        similarity: maxSimilarity,
        message: passed
            ? undefined
            : `최근 작성한 글과 ${Math.round(maxSimilarity * 100)}% 유사합니다. 다른 내용으로 작성해주세요.`,
    };
}

/**
 * 콘텐츠 해시 생성 (중복 검사용)
 * @param content 콘텐츠
 * @returns 해시 문자열
 */
export function generateContentHash(content: string): string {
    const normalized = content
        .toLowerCase()
        .replace(/[\s\n\r\t]+/g, "")
        .replace(/[^\w가-힣]/g, "");

    // 간단한 해시 함수
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 32bit integer로 변환
    }
    return Math.abs(hash).toString(36);
}

/**
 * 콘텐츠 정규화 (비교용)
 * @param content 원본 콘텐츠
 * @returns 정규화된 콘텐츠
 */
export function normalizeContent(content: string): string {
    return content
        .toLowerCase()
        .replace(/[\s\n\r\t]+/g, " ")
        .replace(/[^\w가-힣\s]/g, "")
        .trim();
}

/**
 * 이모지/특수문자만 있는지 체크
 */
export function isEmptyContent(content: string): boolean {
    const stripped = content.replace(/[\s\n\r\t\u200B-\u200D\uFEFF]/g, "");
    // 이모지만 있는 경우도 체크
    const withoutEmoji = stripped.replace(
        /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        ""
    );
    return withoutEmoji.length === 0;
}
