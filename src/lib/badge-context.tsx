"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { EarnedBadge, BADGE_DEFINITIONS, BadgeDefinition } from "@/types/badge";
import { useWishlist } from "./wishlist-context";
import { useDevContext } from "./dev-context";
import { useAuth } from "./auth-context";
import { MOCK_EVENTS, MOCK_POSTS } from "./mock-data";
import { Event } from "@/types/event";
import { createUserAdapter, DOMAINS } from "./storage";
import {
    getUserBadgesDb,
    awardBadges as awardBadgesDb,
    DbUserBadge,
    getPostCountByUser,
    type PostCountStats,
} from "./supabase/queries";

interface BadgeStats {
    attendanceCount: number;
    genreCount: Record<string, number>;
    regionCount: Record<string, number>;
    regionVariety: number;
    yearAttendance: Set<number>;
    summerFestival: number;
    postCount: number;
    helpfulReceived: number;
    reportPostCount: number;
}

interface BadgeContextValue {
    /** 획득한 배지 목록 (현재 사용자) */
    earnedBadges: EarnedBadge[];
    /** 특정 배지 획득 여부 */
    hasBadge: (badgeId: string) => boolean;
    /** 배지 진행도 가져오기 */
    getBadgeProgress: (badgeId: string) => { current: number; max: number } | null;
    /** 새로 획득한 배지 (토스트 표시용) */
    newBadges: BadgeDefinition[];
    /** 새 배지 알림 닫기 */
    clearNewBadges: () => void;
    /** 통계 */
    stats: BadgeStats;
    /** 특정 사용자의 배지 목록 조회 */
    getUserBadges: (userId: string) => EarnedBadge[];
    /** 로딩 상태 */
    isLoading: boolean;
    /** Supabase 연동 여부 */
    isFromSupabase: boolean;
}

/**
 * DB 데이터를 Context 타입으로 변환
 */
function transformDbToEarnedBadge(db: DbUserBadge): EarnedBadge {
    return {
        badgeId: db.badgeId,
        earnedAt: db.earnedAt,
        triggerEventId: db.triggerEventId,
        triggerEventTitle: db.triggerEventTitle,
    };
}

const BadgeContext = createContext<BadgeContextValue | null>(null);

// Storage adapter factory (userId 기반)
const createBadgeAdapter = createUserAdapter<EarnedBadge[]>({
    domain: DOMAINS.BADGES,
    dateFields: ["earnedAt"],
});

// Mock: 다른 사용자들의 배지 데이터 (실제로는 서버에서 가져와야 함)
const MOCK_USER_BADGES: Record<string, EarnedBadge[]> = {
    user2: [
        { badgeId: "concert_fan", earnedAt: new Date("2024-06-15"), triggerEventTitle: "인천 펜타포트 락 페스티벌 2024" },
        { badgeId: "festival_lover", earnedAt: new Date("2024-07-20"), triggerEventTitle: "지산 밸리 록 페스티벌" },
        { badgeId: "nationwide_tourer", earnedAt: new Date("2024-09-10"), triggerEventTitle: "부산 원아시아 페스티벌" },
    ],
    user3: [
        { badgeId: "concert_fan", earnedAt: new Date("2024-05-01"), triggerEventTitle: "홍대 인디 페스티벌" },
        { badgeId: "seoul_conqueror", earnedAt: new Date("2024-08-15"), triggerEventTitle: "서울 재즈 페스티벌" },
    ],
    user4: [
        { badgeId: "concert_fan", earnedAt: new Date("2024-03-10"), triggerEventTitle: "콘서트 투어 2024" },
        { badgeId: "performance_god", earnedAt: new Date("2024-11-01"), triggerEventTitle: "K-POP 월드 투어" },
        { badgeId: "nationwide_tourer", earnedAt: new Date("2024-10-20"), triggerEventTitle: "전국 투어 콘서트" },
        { badgeId: "festival_lover", earnedAt: new Date("2024-08-05"), triggerEventTitle: "여름 페스티벌" },
    ],
    user5: [
        { badgeId: "concert_fan", earnedAt: new Date("2024-09-01"), triggerEventTitle: "재즈 클럽 투어" },
    ],
    user6: [
        { badgeId: "concert_fan", earnedAt: new Date("2024-04-15"), triggerEventTitle: "울트라 코리아" },
        { badgeId: "festival_lover", earnedAt: new Date("2024-07-10"), triggerEventTitle: "월드 DJ 페스티벌" },
        { badgeId: "summer_survivor", earnedAt: new Date("2024-08-20"), triggerEventTitle: "EDM 써머 파티" },
    ],
};

/** 주소에서 지역 추출 */
function extractRegion(address: string): string {
    if (address.includes("서울")) return "서울";
    if (address.includes("부산")) return "부산";
    if (address.includes("인천")) return "인천";
    if (address.includes("대구")) return "대구";
    if (address.includes("대전")) return "대전";
    if (address.includes("광주")) return "광주";
    if (address.includes("울산")) return "울산";
    if (address.includes("경기")) return "경기";
    if (address.includes("강원")) return "강원";
    if (address.includes("충북") || address.includes("충청북도")) return "충북";
    if (address.includes("충남") || address.includes("충청남도")) return "충남";
    if (address.includes("전북") || address.includes("전라북도")) return "전북";
    if (address.includes("전남") || address.includes("전라남도")) return "전남";
    if (address.includes("경북") || address.includes("경상북도")) return "경북";
    if (address.includes("경남") || address.includes("경상남도")) return "경남";
    if (address.includes("제주")) return "제주";
    if (address.includes("세종")) return "세종";
    return "기타";
}

export function BadgeProvider({ children }: { children: ReactNode }) {
    const { attended } = useWishlist();
    const { user: authUser } = useAuth();
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드 또는 비로그인
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId;

    // Dev 모드에서 mockUserId 사용
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > "user1")
    const currentUserId = realUserId || devUserId || "user1";

    const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
    const [newBadges, setNewBadges] = useState<BadgeDefinition[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);

    // Supabase 사용자의 글 통계 (배지 조건 계산용)
    const [postStats, setPostStats] = useState<PostCountStats>({ totalCount: 0, reportCount: 0 });

    // Storage adapter (userId 변경 시 재생성)
    const badgeAdapter = useMemo(
        () => createBadgeAdapter(currentUserId),
        [currentUserId]
    );

    // 사용자 변경 또는 초기 로드 시 데이터 불러오기
    useEffect(() => {
        if (loadedUserId !== currentUserId) {
            // 실제 사용자: Supabase에서 로드
            if (isRealUser && realUserId) {
                setIsLoading(true);
                // 배지와 글 통계를 병렬로 로드
                Promise.all([
                    getUserBadgesDb(realUserId),
                    getPostCountByUser(realUserId),
                ])
                    .then(([dbBadges, dbPostStats]) => {
                        setEarnedBadges(dbBadges.map(transformDbToEarnedBadge));
                        setPostStats(dbPostStats);
                        setIsFromSupabase(true);
                    })
                    .catch((error) => {
                        console.error("[BadgeContext] Supabase load failed:", error);
                        setEarnedBadges([]);
                        setPostStats({ totalCount: 0, reportCount: 0 });
                        setIsFromSupabase(false);
                    })
                    .finally(() => {
                        setIsLoading(false);
                        setLoadedUserId(currentUserId);
                        setIsInitialized(true);
                    });
                return;
            }

            // Dev 모드: localStorage에서 로드
            const stored = badgeAdapter.get();
            if (stored) {
                // 기존 배지 중 triggerEventTitle이 없는 것이 있으면 초기화
                const hasMissingTrigger = stored.some((b: EarnedBadge) => !b.triggerEventTitle);
                if (hasMissingTrigger) {
                    // 배지 데이터 초기화하여 새로 획득하도록 함
                    badgeAdapter.remove();
                    // Mock 데이터로 초기화
                    const mockBadges = MOCK_USER_BADGES[currentUserId] || [];
                    setEarnedBadges(mockBadges);
                } else {
                    // Date 복원은 adapter에서 처리됨
                    setEarnedBadges(stored);
                }
            } else {
                // storage에 없으면 Mock 데이터로 초기화
                const mockBadges = MOCK_USER_BADGES[currentUserId] || [];
                setEarnedBadges(mockBadges);
            }
            // Dev 모드: 로컬 postStats 계산은 stats useMemo에서 처리
            setLoadedUserId(currentUserId);
            setIsInitialized(true);
            setIsFromSupabase(false);
        }
    }, [currentUserId, loadedUserId, badgeAdapter, isRealUser, realUserId]);

    // Storage에 저장 (Dev 모드에서만)
    useEffect(() => {
        if (isInitialized && loadedUserId === currentUserId && !isRealUser) {
            badgeAdapter.set(earnedBadges);
        }
    }, [earnedBadges, isInitialized, currentUserId, loadedUserId, badgeAdapter, isRealUser]);

    // 다녀온 행사 목록
    const attendedEvents = useMemo(() => {
        return Array.from(attended)
            .map(id => MOCK_EVENTS.find(e => e.id === id))
            .filter((e): e is Event => e !== null);
    }, [attended]);

    // 통계 계산
    const stats = useMemo<BadgeStats>(() => {
        const genreCount: Record<string, number> = {};
        const regionCount: Record<string, number> = {};
        const yearAttendance = new Set<number>();
        let summerFestival = 0;

        attendedEvents.forEach(event => {
            // 장르 (이벤트 타입)
            const type = event.type || "기타";
            genreCount[type] = (genreCount[type] || 0) + 1;

            // 지역
            const region = extractRegion(event.venue?.address || "");
            regionCount[region] = (regionCount[region] || 0) + 1;

            // 연도
            const year = new Date(event.startAt).getFullYear();
            yearAttendance.add(year);

            // 여름 페스티벌 (6-8월 페스티벌)
            const month = new Date(event.startAt).getMonth();
            if (event.type === "festival" && month >= 5 && month <= 7) {
                summerFestival++;
            }
        });

        // 작성한 글 수
        // - Supabase 사용자: postStats에서 로드된 값 사용
        // - Dev/Mock 사용자: Mock 데이터에서 currentUserId 기준으로 계산
        const postCount = isRealUser
            ? postStats.totalCount
            : MOCK_POSTS.filter(p => p.userId === currentUserId).length;

        // 실시간 제보 수 (gate, md, facility, safety)
        const reportPostCount = isRealUser
            ? postStats.reportCount
            : MOCK_POSTS.filter(
                p => p.userId === currentUserId && ["gate", "md", "facility", "safety"].includes(p.type)
            ).length;

        // 도움됨 받은 수 (Mock - 임시로 0)
        const helpfulReceived = 0;

        return {
            attendanceCount: attendedEvents.length,
            genreCount,
            regionCount,
            regionVariety: Object.keys(regionCount).filter(r => r !== "기타").length,
            yearAttendance,
            summerFestival,
            postCount,
            helpfulReceived,
            reportPostCount,
        };
    }, [attendedEvents, isRealUser, postStats, currentUserId]);

    // 배지 조건 체크
    const checkBadgeCondition = useCallback((badge: BadgeDefinition): boolean => {
        const { conditionKey, conditionValue } = badge;
        if (conditionValue === undefined) return false;

        switch (conditionKey) {
            case "attendanceCount":
                return stats.attendanceCount >= conditionValue;

            case "genreCount_concert":
                return (stats.genreCount["concert"] || 0) >= conditionValue;
            case "genreCount_festival":
                return (stats.genreCount["festival"] || 0) >= conditionValue;
            case "genreCount_musical":
                return (stats.genreCount["musical"] || 0) >= conditionValue;
            case "genreCount_exhibition":
                return (stats.genreCount["exhibition"] || 0) >= conditionValue;

            case "regionCount_서울":
                return (stats.regionCount["서울"] || 0) >= conditionValue;
            case "regionCount_부산":
                return (stats.regionCount["부산"] || 0) >= conditionValue;
            case "regionCount_인천":
                return (stats.regionCount["인천"] || 0) >= conditionValue;

            case "regionVariety":
                return stats.regionVariety >= conditionValue;

            case "yearAttendance":
                return stats.yearAttendance.has(conditionValue);

            case "summerFestival":
                return stats.summerFestival >= conditionValue;

            case "postCount":
                return stats.postCount >= conditionValue;

            case "helpfulReceived":
                return stats.helpfulReceived >= conditionValue;

            case "reportPostCount":
                return stats.reportPostCount >= conditionValue;

            default:
                return false;
        }
    }, [stats]);

    // 배지 진행도 계산
    const getBadgeProgress = useCallback((badgeId: string): { current: number; max: number } | null => {
        const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
        if (!badge || badge.conditionValue === undefined) return null;

        const { conditionKey, conditionValue } = badge;
        let current = 0;

        switch (conditionKey) {
            case "attendanceCount":
                current = stats.attendanceCount;
                break;
            case "genreCount_concert":
                current = stats.genreCount["concert"] || 0;
                break;
            case "genreCount_festival":
                current = stats.genreCount["festival"] || 0;
                break;
            case "genreCount_musical":
                current = stats.genreCount["musical"] || 0;
                break;
            case "genreCount_exhibition":
                current = stats.genreCount["exhibition"] || 0;
                break;
            case "regionCount_서울":
                current = stats.regionCount["서울"] || 0;
                break;
            case "regionCount_부산":
                current = stats.regionCount["부산"] || 0;
                break;
            case "regionCount_인천":
                current = stats.regionCount["인천"] || 0;
                break;
            case "regionVariety":
                current = stats.regionVariety;
                break;
            case "postCount":
                current = stats.postCount;
                break;
            case "helpfulReceived":
                current = stats.helpfulReceived;
                break;
            case "reportPostCount":
                current = stats.reportPostCount;
                break;
            default:
                return null;
        }

        return { current: Math.min(current, conditionValue), max: conditionValue };
    }, [stats]);

    // 로그인 상태 확인 (실제 사용자 또는 Dev 모드)
    const isLoggedIn = isRealUser || isDevLoggedIn;

    // 배지 획득 체크 및 업데이트 (로그인 상태에서만)
    useEffect(() => {
        if (!isInitialized || !isLoggedIn) return;

        const currentBadgeIds = new Set(earnedBadges.map(b => b.badgeId));
        const newlyEarned: BadgeDefinition[] = [];

        BADGE_DEFINITIONS.forEach(badge => {
            if (!currentBadgeIds.has(badge.id) && checkBadgeCondition(badge)) {
                newlyEarned.push(badge);
            }
        });

        if (newlyEarned.length > 0) {
            // 가장 최근에 다녀온 행사 (배지 획득 계기)
            const latestEvent = attendedEvents.length > 0
                ? attendedEvents.sort((a, b) =>
                    new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
                  )[0]
                : null;

            const newEarnedBadges: EarnedBadge[] = newlyEarned.map(badge => ({
                badgeId: badge.id,
                earnedAt: new Date(),
                triggerEventId: latestEvent?.id,
                triggerEventTitle: latestEvent?.title,
            }));

            // Optimistic update
            setEarnedBadges(prev => [...prev, ...newEarnedBadges]);
            setNewBadges(newlyEarned);

            // 로그인 상태 + 실제 사용자: Supabase에 저장
            if (isRealUser && realUserId) {
                awardBadgesDb(
                    realUserId,
                    newEarnedBadges.map((b) => ({
                        badgeId: b.badgeId,
                        triggerEventId: b.triggerEventId,
                        triggerEventTitle: b.triggerEventTitle,
                    }))
                ).catch((error) => {
                    console.error("[BadgeContext] awardBadges failed:", error);
                    // 롤백 (실패 시 추가한 배지 제거)
                    const newBadgeIds = new Set(newEarnedBadges.map((b) => b.badgeId));
                    setEarnedBadges((prev) =>
                        prev.filter((b) => !newBadgeIds.has(b.badgeId))
                    );
                });
            }
        }
    }, [stats, isInitialized, isLoggedIn, earnedBadges, checkBadgeCondition, attendedEvents, isRealUser, realUserId]);

    const hasBadge = useCallback((badgeId: string): boolean => {
        return earnedBadges.some(b => b.badgeId === badgeId);
    }, [earnedBadges]);

    const clearNewBadges = useCallback(() => {
        setNewBadges([]);
    }, []);

    // 특정 사용자의 배지 목록 조회
    const getUserBadges = useCallback((userId: string): EarnedBadge[] => {
        // 현재 사용자는 earnedBadges 반환
        if (userId === currentUserId) {
            return earnedBadges;
        }
        // 다른 사용자: storage 또는 Mock 데이터
        const adapter = createBadgeAdapter(userId);
        const stored = adapter.get();
        if (stored) {
            return stored;
        }
        // storage에 없으면 Mock 데이터 반환
        return MOCK_USER_BADGES[userId] || [];
    }, [earnedBadges, currentUserId]);

    return (
        <BadgeContext.Provider
            value={{
                earnedBadges,
                hasBadge,
                getBadgeProgress,
                newBadges,
                clearNewBadges,
                stats,
                getUserBadges,
                isLoading,
                isFromSupabase,
            }}
        >
            {children}
        </BadgeContext.Provider>
    );
}

export function useBadge() {
    const context = useContext(BadgeContext);
    if (!context) {
        throw new Error("useBadge must be used within BadgeProvider");
    }
    return context;
}
