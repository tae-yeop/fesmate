"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import { useDevContext } from "@/lib/dev-context";
import { useAuth } from "@/lib/auth-context";
import { MOCK_USERS } from "@/lib/mock-data";
import { isValidUUID } from "@/lib/utils";
import { createSharedAdapter, DOMAINS } from "./storage";
import { Slot, Stage, OperationalSlot } from "@/types/event";
import {
    TimetableSuggestion,
    CreateSuggestionInput,
    SuggestionStatus,
    getEditPermission,
    EditPermission,
    SuggestionData,
} from "@/types/timetable-suggestion";

// ===== Mock 데이터 =====

/** 타임테이블 제안 Mock 데이터 */
export const MOCK_SUGGESTIONS: TimetableSuggestion[] = [
    {
        id: "sug-1",
        eventId: "user-event-1",
        suggesterId: "user2",
        suggesterNickname: "뮤직러버",
        changeType: "add_slot",
        afterData: {
            id: "slot-new-1",
            eventId: "user-event-1",
            title: "잔나비 - 주황색 꿈",
            startAt: new Date("2025-12-28T19:30:00"),
            endAt: new Date("2025-12-28T20:00:00"),
        } as Partial<Slot>,
        reason: "공연 오프닝곡 추가",
        status: "pending",
        createdAt: new Date("2025-01-02T10:00:00"),
    },
    {
        id: "sug-2",
        eventId: "user-event-1",
        suggesterId: "user3",
        suggesterNickname: "인디키드",
        changeType: "edit_slot",
        targetId: "slot-user-1",
        beforeData: {
            startAt: new Date("2025-12-28T19:00:00"),
        } as Partial<Slot>,
        afterData: {
            startAt: new Date("2025-12-28T19:15:00"),
        } as Partial<Slot>,
        reason: "실제 공연 시작 시간 정정",
        status: "pending",
        createdAt: new Date("2025-01-02T11:00:00"),
    },
];

// ===== Context 타입 =====

interface TimetableSuggestionContextValue {
    /** 모든 제안 목록 */
    suggestions: TimetableSuggestion[];
    /** 제안 생성 */
    createSuggestion: (input: CreateSuggestionInput) => Promise<TimetableSuggestion | null>;
    /** 내 제안 목록 */
    getMySuggestions: (eventId?: string) => TimetableSuggestion[];
    /** 특정 행사의 대기 중 제안 목록 */
    getPendingSuggestions: (eventId: string) => TimetableSuggestion[];
    /** 제안 승인 */
    approveSuggestion: (suggestionId: string) => Promise<boolean>;
    /** 제안 반려 */
    rejectSuggestion: (suggestionId: string, reason?: string) => Promise<boolean>;
    /** 즉시 수정 (등록자용) */
    applyImmediateEdit: (eventId: string, input: CreateSuggestionInput) => Promise<boolean>;
    /** 편집 권한 확인 */
    getEditPermissionForEvent: (registeredBy: string | undefined) => EditPermission;
    /** 현재 사용자 ID */
    currentUserId: string;
    /** 로딩 상태 */
    isLoading: boolean;
    /** Supabase 데이터 여부 */
    isFromSupabase: boolean;
}

const TimetableSuggestionContext = createContext<TimetableSuggestionContextValue | null>(null);

// Storage adapter (Dev 모드용)
const suggestionsAdapter = createSharedAdapter<TimetableSuggestion[]>({
    domain: DOMAINS.TIMETABLE_SUGGESTIONS,
    dateFields: ["startAt", "endAt", "createdAt", "reviewedAt"],
});

// 사용자 닉네임 조회 헬퍼
const getUserNickname = (userId: string): string => {
    const user = MOCK_USERS.find(u => u.id === userId);
    return user?.nickname || "익명";
};

export function TimetableSuggestionProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();
    const { user: authUser } = useAuth();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId && isValidUUID(realUserId);

    // Dev 모드에서 mockUserId 사용 (Dev 모드 로그인 상태일 때만)
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (로그아웃 상태에서는 null)
    const currentUserId = realUserId || devUserId || "";

    const [suggestions, setSuggestions] = useState<TimetableSuggestion[]>(MOCK_SUGGESTIONS);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // 초기 데이터 로드
    useEffect(() => {
        if (isLoaded) return;

        // 실제 사용자: Supabase에서 로드 (TODO: 구현)
        if (isRealUser) {
            setIsFromSupabase(false);
            setIsLoaded(true);
            return;
        }

        // Dev 모드: localStorage에서 로드
        try {
            const stored = suggestionsAdapter.get();
            if (stored && stored.length > 0) {
                setSuggestions(stored);
            }
        } catch (error) {
            console.error("[TimetableSuggestionContext] Failed to load from localStorage:", error);
        }

        setIsLoaded(true);
    }, [isRealUser, isLoaded]);

    // localStorage에 저장 (Dev 모드)
    useEffect(() => {
        if (!isLoaded || isFromSupabase) return;

        try {
            suggestionsAdapter.set(suggestions);
        } catch (error) {
            console.error("[TimetableSuggestionContext] Failed to save to localStorage:", error);
        }
    }, [suggestions, isLoaded, isFromSupabase]);

    // 내 제안 목록
    const getMySuggestions = useCallback((eventId?: string): TimetableSuggestion[] => {
        let filtered = suggestions.filter(s => s.suggesterId === currentUserId);
        if (eventId) {
            filtered = filtered.filter(s => s.eventId === eventId);
        }
        return filtered.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [suggestions, currentUserId]);

    // 특정 행사의 대기 중 제안
    const getPendingSuggestions = useCallback((eventId: string): TimetableSuggestion[] => {
        return suggestions
            .filter(s => s.eventId === eventId && s.status === "pending")
            .sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
    }, [suggestions]);

    // 제안 생성
    const createSuggestion = useCallback(async (input: CreateSuggestionInput): Promise<TimetableSuggestion | null> => {
        setIsLoading(true);

        try {
            const newSuggestion: TimetableSuggestion = {
                id: `sug-${Date.now()}`,
                eventId: input.eventId,
                suggesterId: currentUserId,
                suggesterNickname: getUserNickname(currentUserId),
                changeType: input.changeType,
                targetId: input.targetId,
                beforeData: input.beforeData,
                afterData: input.afterData,
                reason: input.reason,
                status: "pending",
                createdAt: new Date(),
            };

            // TODO: Supabase에 저장
            if (isFromSupabase) {
                // await createSuggestionInDb(newSuggestion);
            }

            setSuggestions(prev => [...prev, newSuggestion]);

            return newSuggestion;
        } catch (error) {
            console.error("[TimetableSuggestionContext] Failed to create suggestion:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId, isFromSupabase]);

    // 제안 승인
    const approveSuggestion = useCallback(async (suggestionId: string): Promise<boolean> => {
        setIsLoading(true);

        try {
            const suggestionIndex = suggestions.findIndex(s => s.id === suggestionId);
            if (suggestionIndex === -1) return false;

            const suggestion = suggestions[suggestionIndex];
            if (suggestion.status !== "pending") return false;

            const updatedSuggestion: TimetableSuggestion = {
                ...suggestion,
                status: "approved",
                reviewedBy: currentUserId,
                reviewerNickname: getUserNickname(currentUserId),
                reviewedAt: new Date(),
            };

            // TODO: Supabase 업데이트 + 실제 타임테이블에 반영
            if (isFromSupabase) {
                // await approveSuggestionInDb(suggestionId);
            }

            setSuggestions(prev => {
                const next = [...prev];
                next[suggestionIndex] = updatedSuggestion;
                return next;
            });

            return true;
        } catch (error) {
            console.error("[TimetableSuggestionContext] Failed to approve suggestion:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [suggestions, currentUserId, isFromSupabase]);

    // 제안 반려
    const rejectSuggestion = useCallback(async (suggestionId: string, reason?: string): Promise<boolean> => {
        setIsLoading(true);

        try {
            const suggestionIndex = suggestions.findIndex(s => s.id === suggestionId);
            if (suggestionIndex === -1) return false;

            const suggestion = suggestions[suggestionIndex];
            if (suggestion.status !== "pending") return false;

            const updatedSuggestion: TimetableSuggestion = {
                ...suggestion,
                status: "rejected",
                reviewedBy: currentUserId,
                reviewerNickname: getUserNickname(currentUserId),
                reviewedAt: new Date(),
                rejectReason: reason,
            };

            // TODO: Supabase 업데이트
            if (isFromSupabase) {
                // await rejectSuggestionInDb(suggestionId, reason);
            }

            setSuggestions(prev => {
                const next = [...prev];
                next[suggestionIndex] = updatedSuggestion;
                return next;
            });

            return true;
        } catch (error) {
            console.error("[TimetableSuggestionContext] Failed to reject suggestion:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [suggestions, currentUserId, isFromSupabase]);

    // 즉시 수정 (등록자용)
    const applyImmediateEdit = useCallback(async (eventId: string, input: CreateSuggestionInput): Promise<boolean> => {
        setIsLoading(true);

        try {
            // TODO: 실제 타임테이블 데이터에 변경 적용
            // Supabase에서는 직접 업데이트

            console.log("[TimetableSuggestionContext] Immediate edit applied:", {
                eventId,
                changeType: input.changeType,
                afterData: input.afterData,
            });

            return true;
        } catch (error) {
            console.error("[TimetableSuggestionContext] Failed to apply immediate edit:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 편집 권한 확인
    const getEditPermissionForEvent = useCallback((registeredBy: string | undefined): EditPermission => {
        return getEditPermission(currentUserId, registeredBy);
    }, [currentUserId]);

    const value: TimetableSuggestionContextValue = {
        suggestions,
        createSuggestion,
        getMySuggestions,
        getPendingSuggestions,
        approveSuggestion,
        rejectSuggestion,
        applyImmediateEdit,
        getEditPermissionForEvent,
        currentUserId,
        isLoading,
        isFromSupabase,
    };

    return (
        <TimetableSuggestionContext.Provider value={value}>
            {children}
        </TimetableSuggestionContext.Provider>
    );
}

export function useTimetableSuggestion() {
    const context = useContext(TimetableSuggestionContext);
    if (!context) {
        throw new Error("useTimetableSuggestion must be used within TimetableSuggestionProvider");
    }
    return context;
}
