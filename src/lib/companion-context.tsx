"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import {
    CompanionRequest,
    CompanionRequestStatus,
    CreateCompanionRequestInput,
} from "@/types/companion";
import { useDevContext } from "./dev-context";

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
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

const STORAGE_KEY_COMPANION = "fesmate_companion_requests";

export function CompanionProvider({ children }: { children: ReactNode }) {
    const { mockUserId } = useDevContext();
    const currentUserId = mockUserId || "user1";

    const [requests, setRequests] = useState<CompanionRequest[]>(MOCK_COMPANION_REQUESTS);
    const [isInitialized, setIsInitialized] = useState(false);

    // localStorage에서 불러오기
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY_COMPANION);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setRequests(
                    parsed.map((r: CompanionRequest) => ({
                        ...r,
                        createdAt: new Date(r.createdAt),
                        respondedAt: r.respondedAt ? new Date(r.respondedAt) : undefined,
                    }))
                );
            } catch {
                console.error("Failed to parse companion requests from localStorage");
            }
        }
        setIsInitialized(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY_COMPANION, JSON.stringify(requests));
        }
    }, [requests, isInitialized]);

    // 동행 제안 보내기
    const sendRequest = useCallback(
        (input: CreateCompanionRequestInput): CompanionRequest => {
            const newRequest: CompanionRequest = {
                id: `cr_${Date.now()}`,
                fromUserId: currentUserId,
                toUserId: input.toUserId,
                eventId: input.eventId,
                message: input.message,
                status: "pending",
                createdAt: new Date(),
            };
            setRequests((prev) => [...prev, newRequest]);
            return newRequest;
        },
        [currentUserId]
    );

    // 동행 제안 수락
    const acceptRequest = useCallback((requestId: string) => {
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: "accepted" as const, respondedAt: new Date() }
                    : r
            )
        );
    }, []);

    // 동행 제안 거절
    const declineRequest = useCallback((requestId: string) => {
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: "declined" as const, respondedAt: new Date() }
                    : r
            )
        );
    }, []);

    // 받은 동행 제안 목록
    const getReceivedRequests = useCallback(() => {
        return requests
            .filter((r) => r.toUserId === currentUserId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, currentUserId]);

    // 보낸 동행 제안 목록
    const getSentRequests = useCallback(() => {
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
    const getCompanionsForEvent = useCallback(
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
        setRequests((prev) =>
            prev.filter(
                (r) => !(r.id === requestId && r.status === "pending")
            )
        );
    }, []);

    return (
        <CompanionContext.Provider
            value={{
                currentUserId,
                sendRequest,
                acceptRequest,
                declineRequest,
                getReceivedRequests,
                getSentRequests,
                getRequestStatus,
                getPendingCount,
                getCompanionsForEvent,
                cancelRequest,
            }}
        >
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
