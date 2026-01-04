"use client";

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from "react";
import type {
    UserTrust,
    TrustGrade,
    TrustScoreChange,
    TrustChangeReason,
} from "@/types/trust";
import {
    TRUST_SCORE_CONFIG,
    calculateGrade,
    getGradeConfig,
    gradeToTrustLevel,
} from "@/types/trust";
import { createUserAdapter, createSharedAdapter, DOMAINS } from "@/lib/storage";

/** Trust Storage Adapter Factory (개인) */
const createUserTrustAdapter = createUserAdapter<UserTrust>({
    domain: DOMAINS.USER_TRUST,
    dateFields: ["updatedAt"],
});

/** Trust History Storage Adapter (공유) */
const trustHistoryAdapter = createSharedAdapter<TrustScoreChange[]>({
    domain: DOMAINS.TRUST_HISTORY,
    dateFields: ["createdAt"],
});

/** Trust Context 상태 */
interface TrustContextState {
    /** 현재 사용자의 신뢰도 */
    userTrust: UserTrust | null;
    /** 로딩 상태 */
    isLoading: boolean;
}

/** Trust Context 액션 */
interface TrustContextActions {
    /** 신뢰도 정보 조회 */
    getTrust: (userId: string) => UserTrust | null;
    /** 등급 조회 */
    getGrade: (userId: string) => TrustGrade;
    /** 도움됨 받음 처리 */
    onHelpfulReceived: (userId: string) => void;
    /** 도움됨 취소 처리 */
    onHelpfulRemoved: (userId: string) => void;
    /** 신고당함 처리 */
    onReportedAgainst: (userId: string) => void;
    /** 경고 받음 처리 */
    onWarningReceived: (userId: string) => void;
    /** 정지 받음 처리 */
    onSuspensionReceived: (userId: string) => void;
    /** 글 작성 시 점수 */
    onPostCreated: (userId: string) => void;
    /** 사용자 등급에 따른 글 trustLevel 반환 */
    getTrustLevelForUser: (userId: string) => number;
    /** 신뢰도 초기화 (개발용) */
    resetTrust: (userId: string) => void;
    /** 전체 사용자 신뢰도 초기화 (개발용) */
    resetAllTrust: () => void;
    /** 단기 대량 활동 감지 - 활동 기록 */
    recordActivity: (userId: string, activityType: ActivityType) => void;
    /** 단기 대량 활동 감지 - 어뷰징 여부 확인 */
    isAbusingActivity: (userId: string, activityType: ActivityType) => boolean;
    /** 단기 대량 활동 감지 - 남은 활동 횟수 */
    getRemainingActions: (userId: string, activityType: ActivityType) => number;
}

/** 활동 유형 (어뷰징 감지용) */
export type ActivityType = "post" | "comment" | "helpful" | "report";

/** 활동 제한 설정 */
export const ACTIVITY_LIMITS: Record<ActivityType, { limit: number; windowMinutes: number }> = {
    post: { limit: 5, windowMinutes: 60 },     // 1시간에 글 5개
    comment: { limit: 20, windowMinutes: 60 }, // 1시간에 댓글 20개
    helpful: { limit: 30, windowMinutes: 60 }, // 1시간에 도움됨 30개
    report: { limit: 10, windowMinutes: 60 },  // 1시간에 신고 10개
};

/** 활동 기록 (타임스탬프 배열) */
interface ActivityRecord {
    [activityType: string]: number[]; // 타임스탬프 배열
}

type TrustContextValue = TrustContextState & TrustContextActions;

const TrustContext = createContext<TrustContextValue | null>(null);

/** 모든 사용자 Trust 저장소 */
const ALL_TRUSTS_KEY = "fesmate:v1:shared:all-user-trusts";

/** Provider Props */
interface TrustProviderProps {
    children: ReactNode;
    userId?: string;
}

/**
 * Trust Context Provider
 * - 사용자 신뢰도 점수 관리
 * - 등급 계산 (A/B/C)
 * - 점수 변동 기록
 */
export function TrustProvider({
    children,
    userId = "guest",
}: TrustProviderProps) {
    const [userTrust, setUserTrust] = useState<UserTrust | null>(null);
    const [allTrusts, setAllTrusts] = useState<Record<string, UserTrust>>({});
    const [isLoading, setIsLoading] = useState(true);

    // 단기 대량 활동 감지용 상태 (메모리에만 저장, 새로고침 시 초기화)
    const [activityRecords, setActivityRecords] = useState<Record<string, ActivityRecord>>({});

    // localStorage에서 로드
    useEffect(() => {
        // 현재 사용자 신뢰도
        const adapter = createUserTrustAdapter(userId);
        const stored = adapter.get();
        if (stored) {
            setUserTrust(stored);
        } else {
            const newTrust = createDefaultTrust(userId);
            setUserTrust(newTrust);
        }

        // 전체 사용자 신뢰도 로드
        try {
            const allStored = localStorage.getItem(ALL_TRUSTS_KEY);
            if (allStored) {
                setAllTrusts(JSON.parse(allStored));
            }
        } catch {
            // 무시
        }

        setIsLoading(false);
    }, [userId]);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoading && userTrust) {
            const adapter = createUserTrustAdapter(userId);
            adapter.set(userTrust);

            // 전체 목록에도 저장
            setAllTrusts((prev) => {
                const updated = { ...prev, [userId]: userTrust };
                localStorage.setItem(ALL_TRUSTS_KEY, JSON.stringify(updated));
                return updated;
            });
        }
    }, [userTrust, isLoading, userId]);

    /**
     * 기본 Trust 생성
     */
    function createDefaultTrust(uid: string): UserTrust {
        return {
            userId: uid,
            score: TRUST_SCORE_CONFIG.baseScore,
            grade: calculateGrade(TRUST_SCORE_CONFIG.baseScore),
            helpfulReceived: 0,
            reportsAgainst: 0,
            warningsReceived: 0,
            updatedAt: new Date(),
        };
    }

    /**
     * 점수 업데이트 헬퍼
     */
    const updateScore = useCallback(
        (
            targetUserId: string,
            delta: number,
            reason: TrustChangeReason,
            relatedId?: string
        ) => {
            const updateTrust = (trust: UserTrust): UserTrust => {
                const newScore = Math.max(
                    TRUST_SCORE_CONFIG.minScore,
                    Math.min(TRUST_SCORE_CONFIG.maxScore, trust.score + delta)
                );

                const updated: UserTrust = {
                    ...trust,
                    score: newScore,
                    grade: calculateGrade(newScore),
                    updatedAt: new Date(),
                };

                // 특정 카운터 업데이트
                switch (reason) {
                    case "helpful_received":
                        updated.helpfulReceived = (trust.helpfulReceived || 0) + 1;
                        break;
                    case "helpful_removed":
                        updated.helpfulReceived = Math.max(
                            0,
                            (trust.helpfulReceived || 0) - 1
                        );
                        break;
                    case "reported_against":
                        updated.reportsAgainst = (trust.reportsAgainst || 0) + 1;
                        break;
                    case "warning_received":
                        updated.warningsReceived = (trust.warningsReceived || 0) + 1;
                        break;
                }

                return updated;
            };

            if (targetUserId === userId) {
                setUserTrust((prev) => (prev ? updateTrust(prev) : prev));
            } else {
                // 다른 사용자의 신뢰도 업데이트
                setAllTrusts((prev) => {
                    const existing = prev[targetUserId] || createDefaultTrust(targetUserId);
                    const updated = updateTrust(existing);
                    const newAll = { ...prev, [targetUserId]: updated };
                    localStorage.setItem(ALL_TRUSTS_KEY, JSON.stringify(newAll));
                    return newAll;
                });
            }

            // 변동 기록 저장 (선택적)
            const history = trustHistoryAdapter.get() || [];
            history.push({
                id: `change_${Date.now()}`,
                userId: targetUserId,
                previousScore: 0, // 실제로는 이전 값
                newScore: 0, // 실제로는 새 값
                delta,
                reason,
                relatedId,
                createdAt: new Date(),
            });
            trustHistoryAdapter.set(history.slice(-100)); // 최근 100개만 유지
        },
        [userId]
    );

    /**
     * 신뢰도 정보 조회
     */
    const getTrust = useCallback(
        (targetUserId: string): UserTrust | null => {
            if (targetUserId === userId) {
                return userTrust;
            }
            return allTrusts[targetUserId] || null;
        },
        [userId, userTrust, allTrusts]
    );

    /**
     * 등급 조회
     */
    const getGrade = useCallback(
        (targetUserId: string): TrustGrade => {
            const trust = getTrust(targetUserId);
            return trust?.grade || "B";
        },
        [getTrust]
    );

    /**
     * 도움됨 받음
     */
    const onHelpfulReceived = useCallback(
        (targetUserId: string) => {
            updateScore(
                targetUserId,
                TRUST_SCORE_CONFIG.helpfulReceived,
                "helpful_received"
            );
        },
        [updateScore]
    );

    /**
     * 도움됨 취소
     */
    const onHelpfulRemoved = useCallback(
        (targetUserId: string) => {
            updateScore(
                targetUserId,
                -TRUST_SCORE_CONFIG.helpfulReceived,
                "helpful_removed"
            );
        },
        [updateScore]
    );

    /**
     * 신고당함
     */
    const onReportedAgainst = useCallback(
        (targetUserId: string) => {
            updateScore(
                targetUserId,
                TRUST_SCORE_CONFIG.reportedAgainst,
                "reported_against"
            );
        },
        [updateScore]
    );

    /**
     * 경고 받음
     */
    const onWarningReceived = useCallback(
        (targetUserId: string) => {
            updateScore(
                targetUserId,
                TRUST_SCORE_CONFIG.warningReceived,
                "warning_received"
            );
        },
        [updateScore]
    );

    /**
     * 정지 받음
     */
    const onSuspensionReceived = useCallback(
        (targetUserId: string) => {
            updateScore(
                targetUserId,
                TRUST_SCORE_CONFIG.suspensionReceived,
                "suspension_received"
            );
        },
        [updateScore]
    );

    /**
     * 글 작성
     */
    const onPostCreated = useCallback(
        (targetUserId: string) => {
            // 일일 한도 체크 필요 (간략화)
            updateScore(
                targetUserId,
                TRUST_SCORE_CONFIG.postCreated,
                "post_created"
            );
        },
        [updateScore]
    );

    /**
     * 사용자 등급에 따른 글 trustLevel 반환
     */
    const getTrustLevelForUser = useCallback(
        (targetUserId: string): number => {
            const grade = getGrade(targetUserId);
            return gradeToTrustLevel(grade);
        },
        [getGrade]
    );

    /**
     * 신뢰도 초기화
     */
    const resetTrust = useCallback(
        (targetUserId: string) => {
            const defaultTrust = createDefaultTrust(targetUserId);
            if (targetUserId === userId) {
                setUserTrust(defaultTrust);
            } else {
                setAllTrusts((prev) => {
                    const updated = { ...prev, [targetUserId]: defaultTrust };
                    localStorage.setItem(ALL_TRUSTS_KEY, JSON.stringify(updated));
                    return updated;
                });
            }
        },
        [userId]
    );

    /**
     * 전체 초기화
     */
    const resetAllTrust = useCallback(() => {
        setUserTrust(createDefaultTrust(userId));
        setAllTrusts({});
        localStorage.removeItem(ALL_TRUSTS_KEY);
    }, [userId]);

    /**
     * 활동 기록 (어뷰징 감지용)
     * - 타임스탬프를 기록하고, 윈도우 밖의 오래된 기록은 정리
     */
    const recordActivity = useCallback(
        (targetUserId: string, activityType: ActivityType) => {
            const now = Date.now();
            const config = ACTIVITY_LIMITS[activityType];
            const windowMs = config.windowMinutes * 60 * 1000;

            setActivityRecords((prev) => {
                const userRecord = prev[targetUserId] || {};
                const timestamps = userRecord[activityType] || [];

                // 윈도우 내의 타임스탬프만 유지 + 새 타임스탬프 추가
                const validTimestamps = timestamps.filter(
                    (ts) => now - ts < windowMs
                );
                validTimestamps.push(now);

                return {
                    ...prev,
                    [targetUserId]: {
                        ...userRecord,
                        [activityType]: validTimestamps,
                    },
                };
            });
        },
        []
    );

    /**
     * 어뷰징 여부 확인
     * - 윈도우 내 활동 수가 제한을 초과하면 true
     */
    const isAbusingActivity = useCallback(
        (targetUserId: string, activityType: ActivityType): boolean => {
            const now = Date.now();
            const config = ACTIVITY_LIMITS[activityType];
            const windowMs = config.windowMinutes * 60 * 1000;

            const userRecord = activityRecords[targetUserId];
            if (!userRecord) return false;

            const timestamps = userRecord[activityType] || [];
            const validCount = timestamps.filter(
                (ts) => now - ts < windowMs
            ).length;

            return validCount >= config.limit;
        },
        [activityRecords]
    );

    /**
     * 남은 활동 횟수 반환
     * - 0이면 제한에 도달
     */
    const getRemainingActions = useCallback(
        (targetUserId: string, activityType: ActivityType): number => {
            const now = Date.now();
            const config = ACTIVITY_LIMITS[activityType];
            const windowMs = config.windowMinutes * 60 * 1000;

            const userRecord = activityRecords[targetUserId];
            if (!userRecord) return config.limit;

            const timestamps = userRecord[activityType] || [];
            const validCount = timestamps.filter(
                (ts) => now - ts < windowMs
            ).length;

            return Math.max(0, config.limit - validCount);
        },
        [activityRecords]
    );

    const value: TrustContextValue = {
        userTrust,
        isLoading,
        getTrust,
        getGrade,
        onHelpfulReceived,
        onHelpfulRemoved,
        onReportedAgainst,
        onWarningReceived,
        onSuspensionReceived,
        onPostCreated,
        getTrustLevelForUser,
        resetTrust,
        resetAllTrust,
        // 어뷰징 감지
        recordActivity,
        isAbusingActivity,
        getRemainingActions,
    };

    return (
        <TrustContext.Provider value={value}>{children}</TrustContext.Provider>
    );
}

/**
 * Trust Context Hook
 */
export function useTrust(): TrustContextValue {
    const context = useContext(TrustContext);
    if (!context) {
        throw new Error("useTrust must be used within a TrustProvider");
    }
    return context;
}

/**
 * 등급 설정 가져오기 (편의 함수)
 */
export { getGradeConfig };
