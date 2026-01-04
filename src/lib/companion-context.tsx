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
import {
    CompanionRequest,
    CompanionRequestStatus,
    CreateCompanionRequestInput,
} from "@/types/companion";
import { useDevContext } from "./dev-context";
import { useAuth } from "./auth-context";
import { createSharedAdapter, DOMAINS } from "./storage";
import { isValidUUID } from "./utils";
import {
    getAllCompanionRequests,
    sendCompanionRequest as sendCompanionRequestDb,
    acceptCompanionRequest as acceptCompanionRequestDb,
    declineCompanionRequest as declineCompanionRequestDb,
    cancelCompanionRequest as cancelCompanionRequestDb,
    DbCompanionRequest,
} from "./supabase/queries";

// ===== Mock 동행 제안 데이터 =====

export const MOCK_COMPANION_REQUESTS: CompanionRequest[] = [
    {
        id: "cr1",
        fromUserId: "user2",
        toUserId: "user1",
        eventId: "e2",
        message: "펜타포트 같이 가요! 저도 2일차 가려고 해요 ㅎㅎ",
        status: "pending",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
    },
    {
        id: "cr2",
        fromUserId: "user1",
        toUserId: "user3",
        eventId: "55948",
        message: "기생충 콘서트 같이 봐요!",
        status: "accepted",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1일 전
        respondedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
    {
        id: "cr3",
        fromUserId: "user4",
        toUserId: "user1",
        eventId: "24016943",
        status: "declined",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2일 전
        respondedAt: new Date(Date.now() - 46 * 60 * 60 * 1000),
    },
];

/**
 * DB 데이터를 Context 타입으로 변환
 */
function transformDbToCompanionRequest(db: DbCompanionRequest): CompanionRequest {
    return {
        id: db.id,
        fromUserId: db.fromUserId,
        toUserId: db.toUserId,
        eventId: db.eventId,
        slotIds: db.slotIds,
        message: db.message,
        status: db.status,
        createdAt: db.createdAt,
        respondedAt: db.respondedAt,
    };
}

// ===== Context =====

interface CompanionContextValue {
    /** 현재 사용자 ID */
    currentUserId: string;
    /** 동행 제안 보내기 */
    sendRequest: (input: CreateCompanionRequestInput) => CompanionRequest;
    /** 동행 제안 수락 */
    acceptRequest: (requestId: string) => void;
    /** 동행 제안 거절 */
    declineRequest: (requestId: string) => void;
    /** 받은 동행 제안 목록 */
    getReceivedRequests: () => CompanionRequest[];
    /** 보낸 동행 제안 목록 */
    getSentRequests: () => CompanionRequest[];
    /** 특정 행사에 대한 동행 제안 상태 확인 (특정 사용자에게) */
    getRequestStatus: (toUserId: string, eventId: string) => CompanionRequestStatus | null;
    /** 받은 대기 중인 제안 수 */
    getPendingCount: () => number;
    /** 특정 행사의 동행 확정된 사용자 ID 목록 */
    getCompanionsForEvent: (eventId: string) => string[];
    /** 동행 제안 취소 (보낸 제안 중 pending 상태만) */
    cancelRequest: (requestId: string) => void;
    /** 로딩 상태 */
    isLoading: boolean;
    /** Supabase 연동 여부 */
    isFromSupabase: boolean;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

// Storage adapter (전역 공유 데이터) - Dev 모드용
const companionAdapter = createSharedAdapter<CompanionRequest[]>({
    domain: DOMAINS.COMPANION_REQUESTS,
    dateFields: ["createdAt", "respondedAt"],
});

export function CompanionProvider({ children }: { children: ReactNode }) {
    const { user: authUser } = useAuth();
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드 또는 비로그인
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId;

    // Dev 모드에서 mockUserId 사용
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > null)
    const currentUserId = realUserId || devUserId || "user1";

    const [requests, setRequests] = useState<CompanionRequest[]>(MOCK_COMPANION_REQUESTS);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

    // 데이터 로드
    useEffect(() => {
        if (loadedUserId !== currentUserId) {
            // 실제 사용자: Supabase에서 로드
            if (isRealUser && realUserId) {
                setIsLoading(true);
                getAllCompanionRequests(realUserId)
                    .then((dbRequests) => {
                        setRequests(dbRequests.map(transformDbToCompanionRequest));
                        setIsFromSupabase(true);
                    })
                    .catch((error) => {
                        console.error("[CompanionContext] Supabase load failed:", error);
                        setRequests([]);
                        setIsFromSupabase(false);
                    })
                    .finally(() => {
                        setIsLoading(false);
                        setLoadedUserId(currentUserId);
                    });
                return;
            }

            // Dev 모드: localStorage에서 로드
            const stored = companionAdapter.get();
            if (stored) {
                setRequests(stored);
            } else {
                setRequests(MOCK_COMPANION_REQUESTS);
            }
            setLoadedUserId(currentUserId);
            setIsFromSupabase(false);
        }
    }, [currentUserId, isRealUser, realUserId, loadedUserId]);

    // Storage에 저장 (Dev 모드에서만)
    const saveToStorage = useCallback((updatedRequests: CompanionRequest[]) => {
        if (!isRealUser) {
            companionAdapter.set(updatedRequests);
        }
    }, [isRealUser]);

    // 동행 제안 보내기
    const sendRequest = useCallback(
        (input: CreateCompanionRequestInput): CompanionRequest => {
            const tempId = `cr_${Date.now()}`;
            const newRequest: CompanionRequest = {
                id: tempId,
                fromUserId: currentUserId,
                toUserId: input.toUserId,
                eventId: input.eventId,
                slotIds: input.slotIds,
                message: input.message,
                status: "pending",
                createdAt: new Date(),
            };

            // Optimistic update
            setRequests((prev) => [...prev, newRequest]);

            // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
            if (isRealUser && realUserId && isValidUUID(input.eventId) && isValidUUID(input.toUserId)) {
                sendCompanionRequestDb(realUserId, {
                    toUserId: input.toUserId,
                    eventId: input.eventId,
                    slotIds: input.slotIds,
                    message: input.message,
                })
                    .then((dbRequest) => {
                        // DB에서 반환된 실제 ID로 교체
                        setRequests((prev) =>
                            prev.map((r) =>
                                r.id === tempId
                                    ? transformDbToCompanionRequest(dbRequest)
                                    : r
                            )
                        );
                    })
                    .catch((error) => {
                        console.error("[CompanionContext] sendRequest failed:", error);
                        // 롤백
                        setRequests((prev) => prev.filter((r) => r.id !== tempId));
                    });
            } else {
                // Dev 모드: localStorage에 저장
                saveToStorage([...requests, newRequest]);
            }

            return newRequest;
        },
        [currentUserId, isRealUser, realUserId, requests, saveToStorage]
    );

    // 동행 제안 수락
    const acceptRequest = useCallback((requestId: string) => {
        const request = requests.find((r) => r.id === requestId);
        if (!request) return;

        // Optimistic update
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: "accepted" as const, respondedAt: new Date() }
                    : r
            )
        );

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(requestId)) {
            acceptCompanionRequestDb(requestId).catch((error) => {
                console.error("[CompanionContext] acceptRequest failed:", error);
                // 롤백
                setRequests((prev) =>
                    prev.map((r) =>
                        r.id === requestId ? request : r
                    )
                );
            });
        } else {
            // Dev 모드: localStorage에 저장
            const updated = requests.map((r) =>
                r.id === requestId
                    ? { ...r, status: "accepted" as const, respondedAt: new Date() }
                    : r
            );
            saveToStorage(updated);
        }
    }, [requests, isRealUser, realUserId, saveToStorage]);

    // 동행 제안 거절
    const declineRequest = useCallback((requestId: string) => {
        const request = requests.find((r) => r.id === requestId);
        if (!request) return;

        // Optimistic update
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: "declined" as const, respondedAt: new Date() }
                    : r
            )
        );

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(requestId)) {
            declineCompanionRequestDb(requestId).catch((error) => {
                console.error("[CompanionContext] declineRequest failed:", error);
                // 롤백
                setRequests((prev) =>
                    prev.map((r) =>
                        r.id === requestId ? request : r
                    )
                );
            });
        } else {
            // Dev 모드: localStorage에 저장
            const updated = requests.map((r) =>
                r.id === requestId
                    ? { ...r, status: "declined" as const, respondedAt: new Date() }
                    : r
            );
            saveToStorage(updated);
        }
    }, [requests, isRealUser, realUserId, saveToStorage]);

    // 받은 동행 제안 목록
    const getReceivedRequests = useCallback(() => {
        return requests
            .filter((r) => r.toUserId === currentUserId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, currentUserId]);

    // 보낸 동행 제안 목록
    const getSentRequestsFn = useCallback(() => {
        return requests
            .filter((r) => r.fromUserId === currentUserId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, currentUserId]);

    // 특정 행사에 대한 동행 제안 상태
    const getRequestStatus = useCallback(
        (toUserId: string, eventId: string): CompanionRequestStatus | null => {
            const request = requests.find(
                (r) =>
                    r.fromUserId === currentUserId &&
                    r.toUserId === toUserId &&
                    r.eventId === eventId
            );
            return request?.status ?? null;
        },
        [requests, currentUserId]
    );

    // 받은 대기 중인 제안 수
    const getPendingCount = useCallback(() => {
        return requests.filter(
            (r) => r.toUserId === currentUserId && r.status === "pending"
        ).length;
    }, [requests, currentUserId]);

    // 특정 행사의 동행 확정된 사용자 ID 목록
    const getCompanionsForEventFn = useCallback(
        (eventId: string): string[] => {
            const companions: string[] = [];
            requests
                .filter((r) => r.eventId === eventId && r.status === "accepted")
                .forEach((r) => {
                    if (r.fromUserId === currentUserId) {
                        companions.push(r.toUserId);
                    } else if (r.toUserId === currentUserId) {
                        companions.push(r.fromUserId);
                    }
                });
            return [...new Set(companions)];
        },
        [requests, currentUserId]
    );

    // 동행 제안 취소
    const cancelRequest = useCallback((requestId: string) => {
        const request = requests.find(
            (r) => r.id === requestId && r.status === "pending"
        );
        if (!request) return;

        // Optimistic update
        setRequests((prev) =>
            prev.filter((r) => !(r.id === requestId && r.status === "pending"))
        );

        // 로그인 + 유효한 UUID인 경우에만 Supabase에서 삭제
        if (isRealUser && realUserId && isValidUUID(requestId)) {
            cancelCompanionRequestDb(requestId).catch((error) => {
                console.error("[CompanionContext] cancelRequest failed:", error);
                // 롤백
                setRequests((prev) => [...prev, request]);
            });
        } else {
            // Dev 모드: localStorage에 저장
            const updated = requests.filter(
                (r) => !(r.id === requestId && r.status === "pending")
            );
            saveToStorage(updated);
        }
    }, [requests, isRealUser, realUserId, saveToStorage]);

    const value = useMemo(() => ({
        currentUserId,
        sendRequest,
        acceptRequest,
        declineRequest,
        getReceivedRequests,
        getSentRequests: getSentRequestsFn,
        getRequestStatus,
        getPendingCount,
        getCompanionsForEvent: getCompanionsForEventFn,
        cancelRequest,
        isLoading,
        isFromSupabase,
    }), [
        currentUserId,
        sendRequest,
        acceptRequest,
        declineRequest,
        getReceivedRequests,
        getSentRequestsFn,
        getRequestStatus,
        getPendingCount,
        getCompanionsForEventFn,
        cancelRequest,
        isLoading,
        isFromSupabase,
    ]);

    return (
        <CompanionContext.Provider value={value}>
            {children}
        </CompanionContext.Provider>
    );
}

export function useCompanion() {
    const context = useContext(CompanionContext);
    if (!context) {
        throw new Error("useCompanion must be used within CompanionProvider");
    }
    return context;
}
