/**
 * 글 작성 제한 (Rate Limit) 타입 정의
 * 스팸 방지를 위한 쿨다운 및 시간당 제한
 */

import type { PostType } from "./post";

/** 글 작성 제한 설정 */
export interface RateLimitConfig {
    /** 같은 타입 글 쿨다운 (ms) */
    sameTypeCooldownMs: number;
    /** 시간당 최대 글 수 */
    hourlyLimit: number;
    /** 시간 윈도우 (ms) */
    windowMs: number;
}

/** 기본 설정값 */
export const RATE_LIMIT_CONFIG: RateLimitConfig = {
    sameTypeCooldownMs: 5 * 60 * 1000, // 5분
    hourlyLimit: 5,
    windowMs: 60 * 60 * 1000, // 1시간
};

/** 글 작성 기록 */
export interface PostRecord {
    postId: string;
    postType: PostType;
    timestamp: Date;
}

/** 사용자별 글 작성 제한 상태 */
export interface UserRateLimit {
    userId: string;
    /** 타입별 마지막 작성 시간 */
    lastPostByType: Partial<Record<PostType, Date>>;
    /** 최근 1시간 내 작성 기록 */
    recentPosts: PostRecord[];
    /** 마지막 업데이트 */
    updatedAt: Date;
}

/** 제한 체크 결과 */
export interface RateLimitCheckResult {
    /** 작성 가능 여부 */
    allowed: boolean;
    /** 제한 사유 */
    reason?: "cooldown" | "hourly_limit";
    /** 대기 시간 (ms) */
    waitTimeMs?: number;
    /** 사용자 메시지 */
    message?: string;
}

/** 쿨다운 상태 */
export interface CooldownStatus {
    /** 쿨다운 중인지 */
    isOnCooldown: boolean;
    /** 남은 시간 (ms) */
    remainingMs: number;
    /** 남은 시간 (포맷팅된 문자열) */
    remainingFormatted: string;
}

/**
 * 남은 시간을 포맷팅
 * @param ms 밀리초
 * @returns "X분 Y초" 형식
 */
export function formatRemainingTime(ms: number): string {
    if (ms <= 0) return "0초";

    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return remainingSeconds > 0
            ? `${minutes}분 ${remainingSeconds}초`
            : `${minutes}분`;
    }
    return `${remainingSeconds}초`;
}
