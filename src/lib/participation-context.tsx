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
    ParticipationRequest,
    ParticipationStatus,
    CreateParticipationInput,
} from "@/types/participation";
import { useDevContext } from "./dev-context";

// ===== Mock 참여 신청 데이터 =====

export const MOCK_PARTICIPATION_REQUESTS: ParticipationRequest[] = [
    {
        id: "pr1",
        applicantId: "user2",
        postId: "p1", // 동행 글
        postAuthorId: "user1",
        message: "저도 펜타포트 2일차 가요! 같이 가면 좋겠어요",
        status: "pending",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3시간 전
    },
    {
        id: "pr2",
        applicantId: "user3",
        postId: "p1",
        postAuthorId: "user1",
        status: "pending",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5시간 전
    },
    {
        id: "pr3",
        applicantId: "user1",
        postId: "p2", // 택시 글
        postAuthorId: "user4",
        message: "인천역에서 탈게요!",
        status: "accepted",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1일 전
        respondedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
    {
        id: "pr4",
        applicantId: "user1",
        postId: "p5", // 밥 글
        postAuthorId: "user2",
        status: "pending",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
    },
    {
        id: "pr5",
        applicantId: "user5",
        postId: "p3", // 숙소 글 (user1이 작성자)
        postAuthorId: "user1",
        message: "숙소 쉐어 가능할까요? 조용한 편이에요",
        status: "pending",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1시간 전
    },
];

// ===== Context =====

interface ParticipationContextValue {
    /** 현재 사용자 ID */
    currentUserId: string;
    /** 참여 신청 보내기 */
    sendRequest: (input: CreateParticipationInput) => ParticipationRequest;
    /** 참여 신청 수락 */
    acceptRequest: (requestId: string) => void;
    /** 참여 신청 거절 */
    declineRequest: (requestId: string) => void;
    /** 참여 신청 취소 (신청자가) */
    cancelRequest: (requestId: string) => void;
    /** 받은 참여 신청 목록 (내 글에 온 신청) */
    getReceivedRequests: () => ParticipationRequest[];
    /** 보낸 참여 신청 목록 (내가 신청한 것) */
    getSentRequests: () => ParticipationRequest[];
    /** 특정 글에 대한 내 신청 상태 */
    getMyRequestStatus: (postId: string) => ParticipationStatus | null;
    /** 특정 글에 대한 내 신청 */
    getMyRequest: (postId: string) => ParticipationRequest | undefined;
    /** 받은 대기 중인 신청 수 */
    getReceivedPendingCount: () => number;
    /** 보낸 대기 중인 신청 수 */
    getSentPendingCount: () => number;
    /** 특정 글에 온 신청 목록 */
    getRequestsForPost: (postId: string) => ParticipationRequest[];
}

const ParticipationContext = createContext<ParticipationContextValue | null>(null);

const STORAGE_KEY_PARTICIPATION = "fesmate_participation_requests";

export function ParticipationProvider({ children }: { children: ReactNode }) {
    const { mockUserId } = useDevContext();
    const currentUserId = mockUserId || "user1";

    const [requests, setRequests] = useState<ParticipationRequest[]>(MOCK_PARTICIPATION_REQUESTS);
    const [isInitialized, setIsInitialized] = useState(false);

    // localStorage에서 불러오기
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY_PARTICIPATION);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setRequests(
                    parsed.map((r: ParticipationRequest) => ({
                        ...r,
                        createdAt: new Date(r.createdAt),
                        respondedAt: r.respondedAt ? new Date(r.respondedAt) : undefined,
                    }))
                );
            } catch {
                console.error("Failed to parse participation requests from localStorage");
            }
        }
        setIsInitialized(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY_PARTICIPATION, JSON.stringify(requests));
        }
    }, [requests, isInitialized]);

    // 참여 신청 보내기
    const sendRequest = useCallback(
        (input: CreateParticipationInput): ParticipationRequest => {
            const newRequest: ParticipationRequest = {
                id: `pr_${Date.now()}`,
                applicantId: currentUserId,
                postId: input.postId,
                postAuthorId: input.postAuthorId,
                message: input.message,
                status: "pending",
                createdAt: new Date(),
            };
            setRequests((prev) => [...prev, newRequest]);
            return newRequest;
        },
        [currentUserId]
    );

    // 참여 신청 수락
    const acceptRequest = useCallback((requestId: string) => {
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: "accepted" as const, respondedAt: new Date() }
                    : r
            )
        );
    }, []);

    // 참여 신청 거절
    const declineRequest = useCallback((requestId: string) => {
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: "declined" as const, respondedAt: new Date() }
                    : r
            )
        );
    }, []);

    // 참여 신청 취소
    const cancelRequest = useCallback((requestId: string) => {
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId && r.status === "pending"
                    ? { ...r, status: "canceled" as const }
                    : r
            )
        );
    }, []);

    // 받은 참여 신청 목록
    const getReceivedRequests = useCallback(() => {
        return requests
            .filter((r) => r.postAuthorId === currentUserId && r.status !== "canceled")
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, currentUserId]);

    // 보낸 참여 신청 목록
    const getSentRequests = useCallback(() => {
        return requests
            .filter((r) => r.applicantId === currentUserId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, currentUserId]);

    // 특정 글에 대한 내 신청 상태
    const getMyRequestStatus = useCallback(
        (postId: string): ParticipationStatus | null => {
            const request = requests.find(
                (r) => r.applicantId === currentUserId && r.postId === postId
            );
            return request?.status ?? null;
        },
        [requests, currentUserId]
    );

    // 특정 글에 대한 내 신청
    const getMyRequest = useCallback(
        (postId: string): ParticipationRequest | undefined => {
            return requests.find(
                (r) => r.applicantId === currentUserId && r.postId === postId
            );
        },
        [requests, currentUserId]
    );

    // 받은 대기 중인 신청 수
    const getReceivedPendingCount = useCallback(() => {
        return requests.filter(
            (r) => r.postAuthorId === currentUserId && r.status === "pending"
        ).length;
    }, [requests, currentUserId]);

    // 보낸 대기 중인 신청 수
    const getSentPendingCount = useCallback(() => {
        return requests.filter(
            (r) => r.applicantId === currentUserId && r.status === "pending"
        ).length;
    }, [requests, currentUserId]);

    // 특정 글에 온 신청 목록
    const getRequestsForPost = useCallback(
        (postId: string): ParticipationRequest[] => {
            return requests
                .filter((r) => r.postId === postId && r.status !== "canceled")
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        [requests]
    );

    return (
        <ParticipationContext.Provider
            value={{
                currentUserId,
                sendRequest,
                acceptRequest,
                declineRequest,
                cancelRequest,
                getReceivedRequests,
                getSentRequests,
                getMyRequestStatus,
                getMyRequest,
                getReceivedPendingCount,
                getSentPendingCount,
                getRequestsForPost,
            }}
        >
            {children}
        </ParticipationContext.Provider>
    );
}

export function useParticipation() {
    const context = useContext(ParticipationContext);
    if (!context) {
        throw new Error("useParticipation must be used within ParticipationProvider");
    }
    return context;
}
