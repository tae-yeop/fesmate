"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from "react";
import type { PostType } from "@/types/post";
import type {
    UserRateLimit,
    PostRecord,
    RateLimitCheckResult,
    CooldownStatus,
} from "@/types/rate-limit";
import { RATE_LIMIT_CONFIG, formatRemainingTime } from "@/types/rate-limit";
import { createUserAdapter, DOMAINS } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";

/** Rate Limit Storage Adapter Factory */
const createRateLimitAdapter = createUserAdapter<UserRateLimit>({
    domain: DOMAINS.RATE_LIMITS,
    dateFields: ["updatedAt"],
    nestedDateFields: ["lastPostByType.*", "recentPosts.timestamp"],
});

/** Rate Limit Context 상태 */
interface RateLimitContextState {
    /** 현재 사용자의 Rate Limit 상태 */
    rateLimit: UserRateLimit | null;
    /** 로딩 상태 */
    isLoading: boolean;
}

/** Rate Limit Context 액션 */
interface RateLimitContextActions {
    /** 글 작성 가능 여부 체크 */
    checkRateLimit: (postType: PostType) => RateLimitCheckResult;
    /** 글 작성 기록 추가 */
    recordPost: (postId: string, postType: PostType) => void;
    /** 특정 타입의 쿨다운 상태 조회 */
    getCooldownStatus: (postType: PostType) => CooldownStatus;
    /** 시간당 남은 글 수 */
    getRemainingHourlyPosts: () => number;
    /** Rate Limit 초기화 (개발용) */
    resetRateLimit: () => void;
}

type RateLimitContextValue = RateLimitContextState & RateLimitContextActions;

const RateLimitContext = createContext<RateLimitContextValue | null>(null);

/** Provider Props */
interface RateLimitProviderProps {
    children: ReactNode;
}

/**
 * Rate Limit Context Provider
 * - 글 작성 쿨다운 관리
 * - 시간당 글 수 제한
 * - localStorage 영속화
 * - 사용자별 분리 저장 (계정 전환 시 독립)
 */
export function RateLimitProvider({
    children,
}: RateLimitProviderProps) {
    const { user } = useAuth();
    const { mockUserId } = useDevContext();

    // 현재 사용자 ID (실제 인증 또는 Dev 모드)
    const userId = user?.id || mockUserId || "guest";

    const [rateLimit, setRateLimit] = useState<UserRateLimit | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // localStorage에서 로드
    useEffect(() => {
        const adapter = createRateLimitAdapter(userId);
        const stored = adapter.get();
        if (stored) {
            // 오래된 기록 정리
            const cleanedRateLimit = cleanOldRecords(stored);
            setRateLimit(cleanedRateLimit);
        } else {
            setRateLimit({
                userId,
                lastPostByType: {},
                recentPosts: [],
                updatedAt: new Date(),
            });
        }
        setIsLoading(false);
    }, [userId]);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoading && rateLimit) {
            const adapter = createRateLimitAdapter(userId);
            adapter.set(rateLimit);
        }
    }, [rateLimit, isLoading, userId]);

    /**
     * 오래된 기록 정리 (1시간 초과)
     */
    function cleanOldRecords(limit: UserRateLimit): UserRateLimit {
        const now = Date.now();
        const windowMs = RATE_LIMIT_CONFIG.windowMs;

        return {
            ...limit,
            recentPosts: limit.recentPosts.filter(
                (record) => now - new Date(record.timestamp).getTime() < windowMs
            ),
        };
    }

    /**
     * 글 작성 가능 여부 체크
     */
    const checkRateLimit = useCallback(
        (postType: PostType): RateLimitCheckResult => {
            if (!rateLimit) {
                return { allowed: true };
            }

            const now = Date.now();
            const { sameTypeCooldownMs, hourlyLimit, windowMs } = RATE_LIMIT_CONFIG;

            // 1. 같은 타입 쿨다운 체크
            const lastPostTime = rateLimit.lastPostByType[postType];
            if (lastPostTime) {
                const elapsed = now - new Date(lastPostTime).getTime();
                if (elapsed < sameTypeCooldownMs) {
                    const waitTimeMs = sameTypeCooldownMs - elapsed;
                    return {
                        allowed: false,
                        reason: "cooldown",
                        waitTimeMs,
                        message: `같은 유형의 글은 ${formatRemainingTime(waitTimeMs)} 후에 작성할 수 있습니다`,
                    };
                }
            }

            // 2. 시간당 글 수 체크
            const recentPosts = rateLimit.recentPosts.filter(
                (record) => now - new Date(record.timestamp).getTime() < windowMs
            );

            if (recentPosts.length >= hourlyLimit) {
                // 가장 오래된 글이 만료되는 시간 계산
                const oldestPost = recentPosts.reduce((oldest, current) =>
                    new Date(current.timestamp) < new Date(oldest.timestamp)
                        ? current
                        : oldest
                );
                const waitTimeMs =
                    windowMs - (now - new Date(oldestPost.timestamp).getTime());

                return {
                    allowed: false,
                    reason: "hourly_limit",
                    waitTimeMs,
                    message: `시간당 ${hourlyLimit}개까지만 작성할 수 있습니다. ${formatRemainingTime(waitTimeMs)} 후에 다시 시도해주세요`,
                };
            }

            return { allowed: true };
        },
        [rateLimit]
    );

    /**
     * 글 작성 기록 추가
     */
    const recordPost = useCallback((postId: string, postType: PostType) => {
        const now = new Date();

        setRateLimit((prev) => {
            if (!prev) return prev;

            const newRecord: PostRecord = {
                postId,
                postType,
                timestamp: now,
            };

            return {
                ...prev,
                lastPostByType: {
                    ...prev.lastPostByType,
                    [postType]: now,
                },
                recentPosts: [...prev.recentPosts, newRecord],
                updatedAt: now,
            };
        });
    }, []);

    /**
     * 특정 타입의 쿨다운 상태 조회
     */
    const getCooldownStatus = useCallback(
        (postType: PostType): CooldownStatus => {
            if (!rateLimit) {
                return {
                    isOnCooldown: false,
                    remainingMs: 0,
                    remainingFormatted: "",
                };
            }

            const lastPostTime = rateLimit.lastPostByType[postType];
            if (!lastPostTime) {
                return {
                    isOnCooldown: false,
                    remainingMs: 0,
                    remainingFormatted: "",
                };
            }

            const now = Date.now();
            const elapsed = now - new Date(lastPostTime).getTime();
            const remainingMs = RATE_LIMIT_CONFIG.sameTypeCooldownMs - elapsed;

            if (remainingMs <= 0) {
                return {
                    isOnCooldown: false,
                    remainingMs: 0,
                    remainingFormatted: "",
                };
            }

            return {
                isOnCooldown: true,
                remainingMs,
                remainingFormatted: formatRemainingTime(remainingMs),
            };
        },
        [rateLimit]
    );

    /**
     * 시간당 남은 글 수
     */
    const getRemainingHourlyPosts = useCallback((): number => {
        if (!rateLimit) return RATE_LIMIT_CONFIG.hourlyLimit;

        const now = Date.now();
        const recentCount = rateLimit.recentPosts.filter(
            (record) =>
                now - new Date(record.timestamp).getTime() < RATE_LIMIT_CONFIG.windowMs
        ).length;

        return Math.max(0, RATE_LIMIT_CONFIG.hourlyLimit - recentCount);
    }, [rateLimit]);

    /**
     * Rate Limit 초기화 (개발용)
     */
    const resetRateLimit = useCallback(() => {
        setRateLimit({
            userId,
            lastPostByType: {},
            recentPosts: [],
            updatedAt: new Date(),
        });
    }, [userId]);

    const value: RateLimitContextValue = {
        rateLimit,
        isLoading,
        checkRateLimit,
        recordPost,
        getCooldownStatus,
        getRemainingHourlyPosts,
        resetRateLimit,
    };

    return (
        <RateLimitContext.Provider value={value}>
            {children}
        </RateLimitContext.Provider>
    );
}

/**
 * Rate Limit Context Hook
 */
export function useRateLimit(): RateLimitContextValue {
    const context = useContext(RateLimitContext);
    if (!context) {
        throw new Error("useRateLimit must be used within a RateLimitProvider");
    }
    return context;
}
