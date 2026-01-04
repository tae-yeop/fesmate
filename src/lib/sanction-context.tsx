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
    UserSanction,
    UserSanctionStatus,
    SanctionType,
    SanctionReason,
} from "@/types/sanction";
import {
    SANCTION_CONFIG,
    isSuspensionExpired,
    getSanctionMessage,
} from "@/types/sanction";
import { createSharedAdapter, DOMAINS } from "@/lib/storage";

/** Sanction Storage Adapter */
const sanctionsAdapter = createSharedAdapter<UserSanction[]>({
    domain: DOMAINS.USER_SANCTIONS,
    dateFields: ["createdAt", "expiresAt", "resolvedAt"],
});

/** Sanction Context 상태 */
interface SanctionContextState {
    /** 모든 제재 기록 */
    sanctions: UserSanction[];
    /** 로딩 상태 */
    isLoading: boolean;
}

/** Sanction Context 액션 */
interface SanctionContextActions {
    /** 사용자 제재 상태 조회 */
    getSanctionStatus: (userId: string) => UserSanctionStatus;
    /** 글 작성 가능 여부 */
    canUserPost: (userId: string) => boolean;
    /** 댓글 작성 가능 여부 */
    canUserComment: (userId: string) => boolean;
    /** 제재 메시지 */
    getRestrictionMessage: (userId: string) => string | null;
    /** 경고 추가 */
    addWarning: (
        userId: string,
        reason: SanctionReason,
        description?: string,
        reportIds?: string[]
    ) => void;
    /** 정지 추가 */
    addSuspension: (
        userId: string,
        reason: SanctionReason,
        days: number,
        description?: string
    ) => void;
    /** 영구 차단 */
    addBan: (userId: string, reason: SanctionReason, description?: string) => void;
    /** 제재 해제 */
    resolveSanction: (sanctionId: string, resolvedBy: string) => void;
    /** 신고 횟수 기반 자동 경고 체크 */
    checkAutoWarning: (userId: string, reportCount: number) => boolean;
    /** 경고 횟수 기반 자동 정지 체크 */
    checkAutoSuspension: (userId: string) => boolean;
    /** 사용자 제재 기록 조회 */
    getUserSanctions: (userId: string) => UserSanction[];
    /** 전체 초기화 (개발용) */
    resetAllSanctions: () => void;
}

type SanctionContextValue = SanctionContextState & SanctionContextActions;

const SanctionContext = createContext<SanctionContextValue | null>(null);

/** Provider Props */
interface SanctionProviderProps {
    children: ReactNode;
}

/**
 * Sanction Context Provider
 * - 경고/정지/차단 관리
 * - 자동 제재 체크
 * - 활동 제한 상태 확인
 */
export function SanctionProvider({ children }: SanctionProviderProps) {
    const [sanctions, setSanctions] = useState<UserSanction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // localStorage에서 로드
    useEffect(() => {
        const stored = sanctionsAdapter.get();
        if (stored) {
            // 만료된 정지 자동 해제
            const updated = stored.map((s) => {
                if (
                    s.type === "suspension" &&
                    s.isActive &&
                    isSuspensionExpired(s)
                ) {
                    return {
                        ...s,
                        isActive: false,
                        resolvedAt: new Date(),
                        resolvedBy: "SYSTEM",
                    };
                }
                return s;
            });
            setSanctions(updated);
        }
        setIsLoading(false);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoading) {
            sanctionsAdapter.set(sanctions);
        }
    }, [sanctions, isLoading]);

    /**
     * 고유 ID 생성
     */
    function generateId(): string {
        return `sanction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * 사용자 제재 상태 조회
     */
    const getSanctionStatus = useCallback(
        (userId: string): UserSanctionStatus => {
            const userSanctions = sanctions.filter((s) => s.userId === userId);

            // 활성 경고 수
            const activeWarnings = userSanctions.filter(
                (s) => s.type === "warning" && s.isActive
            ).length;

            // 총 경고 수
            const totalWarnings = userSanctions.filter(
                (s) => s.type === "warning"
            ).length;

            // 활성 정지
            const activeSuspension = userSanctions.find(
                (s) => s.type === "suspension" && s.isActive && !isSuspensionExpired(s)
            );

            // 총 정지 수
            const totalSuspensions = userSanctions.filter(
                (s) => s.type === "suspension"
            ).length;

            // 영구 차단 여부
            const isBanned = userSanctions.some(
                (s) => s.type === "ban" && s.isActive
            );

            // 활동 가능 여부
            const canPost = !isBanned && !activeSuspension;
            const canComment = !isBanned && !activeSuspension;

            const status: UserSanctionStatus = {
                userId,
                activeWarnings,
                totalWarnings,
                activeSuspension,
                totalSuspensions,
                isBanned,
                canPost,
                canComment,
            };

            status.restrictionMessage = getSanctionMessage(status) || undefined;

            return status;
        },
        [sanctions]
    );

    /**
     * 글 작성 가능 여부
     */
    const canUserPost = useCallback(
        (userId: string): boolean => {
            return getSanctionStatus(userId).canPost;
        },
        [getSanctionStatus]
    );

    /**
     * 댓글 작성 가능 여부
     */
    const canUserComment = useCallback(
        (userId: string): boolean => {
            return getSanctionStatus(userId).canComment;
        },
        [getSanctionStatus]
    );

    /**
     * 제재 메시지
     */
    const getRestrictionMessage = useCallback(
        (userId: string): string | null => {
            return getSanctionStatus(userId).restrictionMessage || null;
        },
        [getSanctionStatus]
    );

    /**
     * 경고 추가
     */
    const addWarning = useCallback(
        (
            userId: string,
            reason: SanctionReason,
            description?: string,
            reportIds?: string[]
        ) => {
            const newWarning: UserSanction = {
                id: generateId(),
                userId,
                type: "warning",
                reason,
                description,
                relatedReportIds: reportIds,
                createdBy: "SYSTEM",
                createdAt: new Date(),
                isActive: true,
            };

            setSanctions((prev) => [...prev, newWarning]);
        },
        []
    );

    /**
     * 정지 추가
     */
    const addSuspension = useCallback(
        (
            userId: string,
            reason: SanctionReason,
            days: number,
            description?: string
        ) => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);

            const newSuspension: UserSanction = {
                id: generateId(),
                userId,
                type: "suspension",
                reason,
                description,
                expiresAt,
                createdBy: "SYSTEM",
                createdAt: new Date(),
                isActive: true,
            };

            // 기존 활성 경고들 비활성화
            setSanctions((prev) => {
                const updated = prev.map((s) =>
                    s.userId === userId && s.type === "warning" && s.isActive
                        ? {
                              ...s,
                              isActive: false,
                              resolvedAt: new Date(),
                              resolvedBy: "SYSTEM",
                          }
                        : s
                );
                return [...updated, newSuspension];
            });
        },
        []
    );

    /**
     * 영구 차단
     */
    const addBan = useCallback(
        (userId: string, reason: SanctionReason, description?: string) => {
            const newBan: UserSanction = {
                id: generateId(),
                userId,
                type: "ban",
                reason,
                description,
                createdBy: "SYSTEM",
                createdAt: new Date(),
                isActive: true,
            };

            // 기존 모든 제재 비활성화
            setSanctions((prev) => {
                const updated = prev.map((s) =>
                    s.userId === userId && s.isActive
                        ? {
                              ...s,
                              isActive: false,
                              resolvedAt: new Date(),
                              resolvedBy: "SYSTEM",
                          }
                        : s
                );
                return [...updated, newBan];
            });
        },
        []
    );

    /**
     * 제재 해제
     */
    const resolveSanction = useCallback(
        (sanctionId: string, resolvedBy: string) => {
            setSanctions((prev) =>
                prev.map((s) =>
                    s.id === sanctionId
                        ? {
                              ...s,
                              isActive: false,
                              resolvedAt: new Date(),
                              resolvedBy,
                          }
                        : s
                )
            );
        },
        []
    );

    /**
     * 신고 횟수 기반 자동 경고 체크
     */
    const checkAutoWarning = useCallback(
        (userId: string, reportCount: number): boolean => {
            if (reportCount >= SANCTION_CONFIG.reportsForWarning) {
                const status = getSanctionStatus(userId);

                // 이미 영구 차단인 경우 스킵
                if (status.isBanned) return false;

                // 경고 추가
                addWarning(userId, "multiple_reports", `신고 ${reportCount}회 누적`);

                // 자동 정지 체크
                if (
                    status.activeWarnings + 1 >=
                    SANCTION_CONFIG.warningsForSuspension
                ) {
                    addSuspension(
                        userId,
                        "multiple_reports",
                        SANCTION_CONFIG.suspensionDays,
                        `경고 ${status.activeWarnings + 1}회 누적으로 자동 정지`
                    );
                }

                return true;
            }
            return false;
        },
        [getSanctionStatus, addWarning, addSuspension]
    );

    /**
     * 경고 횟수 기반 자동 정지 체크
     */
    const checkAutoSuspension = useCallback(
        (userId: string): boolean => {
            const status = getSanctionStatus(userId);

            if (status.activeWarnings >= SANCTION_CONFIG.warningsForSuspension) {
                // 정지 추가
                addSuspension(
                    userId,
                    "multiple_reports",
                    SANCTION_CONFIG.suspensionDays,
                    `경고 ${status.activeWarnings}회 누적으로 자동 정지`
                );

                // 정지 횟수 체크 -> 영구 차단
                if (
                    status.totalSuspensions + 1 >=
                    SANCTION_CONFIG.suspensionsForBan
                ) {
                    addBan(
                        userId,
                        "multiple_reports",
                        `정지 ${status.totalSuspensions + 1}회 누적으로 영구 차단`
                    );
                }

                return true;
            }
            return false;
        },
        [getSanctionStatus, addSuspension, addBan]
    );

    /**
     * 사용자 제재 기록 조회
     */
    const getUserSanctions = useCallback(
        (userId: string): UserSanction[] => {
            return sanctions.filter((s) => s.userId === userId);
        },
        [sanctions]
    );

    /**
     * 전체 초기화
     */
    const resetAllSanctions = useCallback(() => {
        setSanctions([]);
    }, []);

    const value: SanctionContextValue = {
        sanctions,
        isLoading,
        getSanctionStatus,
        canUserPost,
        canUserComment,
        getRestrictionMessage,
        addWarning,
        addSuspension,
        addBan,
        resolveSanction,
        checkAutoWarning,
        checkAutoSuspension,
        getUserSanctions,
        resetAllSanctions,
    };

    return (
        <SanctionContext.Provider value={value}>
            {children}
        </SanctionContext.Provider>
    );
}

/**
 * Sanction Context Hook
 */
export function useSanction(): SanctionContextValue {
    const context = useContext(SanctionContext);
    if (!context) {
        throw new Error("useSanction must be used within a SanctionProvider");
    }
    return context;
}
