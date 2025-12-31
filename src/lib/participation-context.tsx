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
    ActivityStatus,
    getActivityStatus,
} from "@/types/participation";
import { useDevContext } from "./dev-context";
import { useAuth } from "./auth-context";
import { isValidUUID } from "./utils";
import { createSharedAdapter, DOMAINS } from "./storage";
import {
    getReceivedRequests as getReceivedRequestsFromDb,
    getSentRequests as getSentRequestsFromDb,
    sendParticipationRequest as sendParticipationRequestInDb,
    acceptParticipationRequest as acceptParticipationRequestInDb,
    declineParticipationRequest as declineParticipationRequestInDb,
    cancelParticipationRequest as cancelParticipationRequestInDb,
    type ParticipationRequest as DbParticipationRequest,
} from "./supabase/queries";

// ===== Mock 참여 신청 데이터 =====

// 내일 18:00
const tomorrow18 = new Date();
tomorrow18.setDate(tomorrow18.getDate() + 1);
tomorrow18.setHours(18, 0, 0, 0);

// 내일 19:30
const tomorrow1930 = new Date();
tomorrow1930.setDate(tomorrow1930.getDate() + 1);
tomorrow1930.setHours(19, 30, 0, 0);

// 오늘 +3시간
const today3h = new Date(Date.now() + 3 * 60 * 60 * 1000);

// 모레
const dayAfterTomorrow = new Date();
dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
dayAfterTomorrow.setHours(14, 0, 0, 0);

export const MOCK_PARTICIPATION_REQUESTS: ParticipationRequest[] = [
    {
        id: "pr1",
        applicantId: "user2",
        postId: "post3", // 동행 글 (서울재즈페스티벌)
        postAuthorId: "user3",
        postType: "companion",
        message: "저도 재즈페스티벌 가요! 같이 가면 좋겠어요",
        status: "pending",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3시간 전
    },
    {
        id: "pr2",
        applicantId: "user4",
        postId: "post3", // 동행 글
        postAuthorId: "user3",
        postType: "companion",
        status: "pending",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5시간 전
    },
    {
        id: "pr3",
        applicantId: "user1",
        postId: "post4", // 택시 글 (올림픽공원 → 강남역)
        postAuthorId: "user4",
        postType: "taxi",
        message: "저도 강남 방향이에요!",
        status: "accepted",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1일 전
        respondedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
        scheduledAt: tomorrow18,
        activityLocation: "올림픽공원 평화의 광장",
    },
    {
        id: "pr4",
        applicantId: "user1",
        postId: "post5", // 밥 글 (공연 전 저녁)
        postAuthorId: "user5",
        postType: "meal",
        status: "accepted",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
        respondedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        scheduledAt: tomorrow1930,
        activityLocation: "올림픽공원역 9번 출구",
    },
    {
        id: "pr5",
        applicantId: "user5",
        postId: "post6", // 숙소 글 (잠실역 근처)
        postAuthorId: "user6",
        postType: "lodge",
        message: "숙소 쉐어 가능할까요? 조용한 편이에요",
        status: "pending",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1시간 전
    },
    {
        id: "pr6",
        applicantId: "user1",
        postId: "post6", // 숙소 글 (잠실역 근처) - user6이 작성
        postAuthorId: "user6",
        postType: "lodge",
        message: "숙소 쉐어 가능할까요?",
        status: "accepted",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        respondedAt: new Date(Date.now() - 46 * 60 * 60 * 1000),
        scheduledAt: dayAfterTomorrow,
        activityLocation: "잠실역 4번 출구",
    },
    {
        id: "pr7",
        applicantId: "user1",
        postId: "post3", // 동행 글 (서울재즈페스티벌)
        postAuthorId: "user3",
        postType: "companion",
        status: "accepted",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        respondedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        scheduledAt: today3h,
        activityLocation: "올림픽공원 정문",
    },
];

// ===== Context =====

/** 참여 중인 활동 (날짜별 그룹) */
export interface ActiveActivity extends ParticipationRequest {
    activityStatus: ActivityStatus;
}

interface ParticipationContextValue {
    /** 현재 사용자 ID */
    currentUserId: string | null;
    /** 참여 신청 보내기 */
    sendRequest: (input: CreateParticipationInput) => ParticipationRequest | null;
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
    /** 참여 중인 활동 목록 (수락된 것만, 날짜순) */
    getActiveActivities: () => ActiveActivity[];
    /** 참여 중인 활동 수 */
    getActiveCount: () => number;
    /** 데이터 소스 표시 */
    isFromSupabase: boolean;
    /** 로딩 상태 */
    isLoading: boolean;
}

const ParticipationContext = createContext<ParticipationContextValue | null>(null);

// Storage adapter (전역 공유 데이터) - Dev 모드용
const participationAdapter = createSharedAdapter<ParticipationRequest[]>({
    domain: DOMAINS.PARTICIPATION_REQUESTS,
    dateFields: ["createdAt", "respondedAt", "scheduledAt"],
});

// DB 타입을 Frontend 타입으로 변환하는 헬퍼
function transformDbToFrontend(dbReq: DbParticipationRequest): ParticipationRequest {
    return {
        id: dbReq.id,
        applicantId: dbReq.applicantId,
        postId: dbReq.postId,
        postAuthorId: dbReq.postAuthorId,
        message: dbReq.message || undefined,
        status: dbReq.status,
        scheduledAt: dbReq.scheduledAt || undefined,
        activityLocation: dbReq.activityLocation || undefined,
        createdAt: dbReq.createdAt,
        respondedAt: dbReq.respondedAt || undefined,
        // postType은 DB에 없으므로 undefined
    };
}

export function ParticipationProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();
    const { user: authUser } = useAuth();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId && isValidUUID(realUserId);

    // Dev 모드에서 mockUserId 사용
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > null)
    const currentUserId = realUserId || devUserId;

    const [requests, setRequests] = useState<ParticipationRequest[]>(MOCK_PARTICIPATION_REQUESTS);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

    // 사용자 변경 또는 초기 로드 시 데이터 로드
    useEffect(() => {
        // 사용자가 변경되었거나 처음 로드하는 경우
        if (loadedUserId !== currentUserId) {
            // 비로그인 시에는 Mock 데이터
            if (!currentUserId) {
                setRequests(MOCK_PARTICIPATION_REQUESTS);
                setLoadedUserId(currentUserId);
                setIsFromSupabase(false);
                return;
            }

            // 실제 사용자: Supabase에서 로드
            if (isRealUser && realUserId) {
                setIsLoading(true);
                Promise.all([
                    getReceivedRequestsFromDb(realUserId),
                    getSentRequestsFromDb(realUserId),
                ])
                    .then(([received, sent]) => {
                        // 중복 제거하여 병합
                        const allRequestsMap = new Map<string, ParticipationRequest>();
                        [...received, ...sent].forEach(r => {
                            allRequestsMap.set(r.id, transformDbToFrontend(r));
                        });
                        setRequests(Array.from(allRequestsMap.values()));
                        setIsFromSupabase(true);
                    })
                    .catch((error) => {
                        console.error("[ParticipationContext] Supabase load failed:", error);
                        // Supabase 실패 시 localStorage에서 로드
                        const stored = participationAdapter.get();
                        if (stored) setRequests(stored);
                        setIsFromSupabase(false);
                    })
                    .finally(() => {
                        setIsLoading(false);
                        setLoadedUserId(currentUserId);
                    });
                return;
            }

            // Dev 모드: localStorage에서 로드
            const stored = participationAdapter.get();
            if (stored) {
                setRequests(stored);
            }
            setLoadedUserId(currentUserId);
            setIsFromSupabase(false);
        }
    }, [currentUserId, loadedUserId, isRealUser, realUserId]);

    // localStorage에 저장 (Dev 모드만)
    useEffect(() => {
        if (isRealUser || loadedUserId !== currentUserId) return;
        if (currentUserId) {
            participationAdapter.set(requests);
        }
    }, [requests, isRealUser, currentUserId, loadedUserId]);

    // 참여 신청 보내기
    const sendRequest = useCallback(
        (input: CreateParticipationInput): ParticipationRequest | null => {
            if (!currentUserId) return null;

            const newRequest: ParticipationRequest = {
                id: `pr_${Date.now()}`,
                applicantId: currentUserId,
                postId: input.postId,
                postAuthorId: input.postAuthorId,
                postType: input.postType,
                message: input.message,
                status: "pending",
                createdAt: new Date(),
            };

            // Optimistic update
            setRequests((prev) => [...prev, newRequest]);

            // 실제 사용자: Supabase에 저장
            if (isRealUser && realUserId && isValidUUID(input.postId) && isValidUUID(input.postAuthorId)) {
                sendParticipationRequestInDb(realUserId, {
                    postId: input.postId,
                    postAuthorId: input.postAuthorId,
                    message: input.message,
                })
                    .then((dbReq) => {
                        // 실제 ID로 교체
                        setRequests((prev) =>
                            prev.map((r) =>
                                r.id === newRequest.id
                                    ? { ...transformDbToFrontend(dbReq), postType: input.postType }
                                    : r
                            )
                        );
                    })
                    .catch((error) => {
                        console.error("[ParticipationContext] sendRequest failed:", error);
                        // 롤백
                        setRequests((prev) => prev.filter((r) => r.id !== newRequest.id));
                    });
            }

            return newRequest;
        },
        [currentUserId, isRealUser, realUserId]
    );

    // 참여 신청 수락
    const acceptRequest = useCallback((requestId: string) => {
        const existingRequest = requests.find((r) => r.id === requestId);
        if (!existingRequest) return;

        // Optimistic update
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: "accepted" as const, respondedAt: new Date() }
                    : r
            )
        );

        // 실제 사용자: Supabase에 저장
        if (isRealUser && isValidUUID(requestId)) {
            acceptParticipationRequestInDb(requestId).catch((error) => {
                console.error("[ParticipationContext] acceptRequest failed:", error);
                // 롤백
                setRequests((prev) =>
                    prev.map((r) =>
                        r.id === requestId ? existingRequest : r
                    )
                );
            });
        }
    }, [requests, isRealUser]);

    // 참여 신청 거절
    const declineRequest = useCallback((requestId: string) => {
        const existingRequest = requests.find((r) => r.id === requestId);
        if (!existingRequest) return;

        // Optimistic update
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId
                    ? { ...r, status: "declined" as const, respondedAt: new Date() }
                    : r
            )
        );

        // 실제 사용자: Supabase에 저장
        if (isRealUser && isValidUUID(requestId)) {
            declineParticipationRequestInDb(requestId).catch((error) => {
                console.error("[ParticipationContext] declineRequest failed:", error);
                // 롤백
                setRequests((prev) =>
                    prev.map((r) =>
                        r.id === requestId ? existingRequest : r
                    )
                );
            });
        }
    }, [requests, isRealUser]);

    // 참여 신청 취소
    const cancelRequest = useCallback((requestId: string) => {
        const existingRequest = requests.find((r) => r.id === requestId && r.status === "pending");
        if (!existingRequest) return;

        // Optimistic update
        setRequests((prev) =>
            prev.map((r) =>
                r.id === requestId && r.status === "pending"
                    ? { ...r, status: "canceled" as const }
                    : r
            )
        );

        // 실제 사용자: Supabase에 저장
        if (isRealUser && isValidUUID(requestId)) {
            cancelParticipationRequestInDb(requestId).catch((error) => {
                console.error("[ParticipationContext] cancelRequest failed:", error);
                // 롤백
                setRequests((prev) =>
                    prev.map((r) =>
                        r.id === requestId ? existingRequest : r
                    )
                );
            });
        }
    }, [requests, isRealUser]);

    // 받은 참여 신청 목록
    const getReceivedRequestsFn = useCallback(() => {
        if (!currentUserId) return [];
        return requests
            .filter((r) => r.postAuthorId === currentUserId && r.status !== "canceled")
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, currentUserId]);

    // 보낸 참여 신청 목록
    const getSentRequestsFn = useCallback(() => {
        if (!currentUserId) return [];
        return requests
            .filter((r) => r.applicantId === currentUserId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests, currentUserId]);

    // 특정 글에 대한 내 신청 상태
    const getMyRequestStatus = useCallback(
        (postId: string): ParticipationStatus | null => {
            if (!currentUserId) return null;
            const request = requests.find(
                (r) => r.applicantId === currentUserId && r.postId === postId
            );
            return request?.status ?? null;
        },
        [requests, currentUserId]
    );

    // 특정 글에 대한 내 신청
    const getMyRequestFn = useCallback(
        (postId: string): ParticipationRequest | undefined => {
            if (!currentUserId) return undefined;
            return requests.find(
                (r) => r.applicantId === currentUserId && r.postId === postId
            );
        },
        [requests, currentUserId]
    );

    // 받은 대기 중인 신청 수
    const getReceivedPendingCountFn = useCallback(() => {
        if (!currentUserId) return 0;
        return requests.filter(
            (r) => r.postAuthorId === currentUserId && r.status === "pending"
        ).length;
    }, [requests, currentUserId]);

    // 보낸 대기 중인 신청 수
    const getSentPendingCountFn = useCallback(() => {
        if (!currentUserId) return 0;
        return requests.filter(
            (r) => r.applicantId === currentUserId && r.status === "pending"
        ).length;
    }, [requests, currentUserId]);

    // 특정 글에 온 신청 목록
    const getRequestsForPostFn = useCallback(
        (postId: string): ParticipationRequest[] => {
            return requests
                .filter((r) => r.postId === postId && r.status !== "canceled")
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        [requests]
    );

    // 참여 중인 활동 목록 (수락된 것만, 예정 시간순)
    const getActiveActivities = useCallback((): ActiveActivity[] => {
        if (!currentUserId) return [];
        const now = new Date();
        return requests
            .filter(
                (r) =>
                    r.applicantId === currentUserId &&
                    r.status === "accepted"
            )
            .map((r) => ({
                ...r,
                activityStatus: getActivityStatus(r.scheduledAt, now),
            }))
            .sort((a, b) => {
                // 진행중 > 예정 > 완료 순서
                const statusOrder = { ongoing: 0, upcoming: 1, completed: 2 };
                const orderDiff = statusOrder[a.activityStatus] - statusOrder[b.activityStatus];
                if (orderDiff !== 0) return orderDiff;
                // 같은 상태면 시간순
                const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
                const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
                return aTime - bTime;
            });
    }, [requests, currentUserId]);

    // 참여 중인 활동 수 (완료되지 않은 것만)
    const getActiveCount = useCallback((): number => {
        if (!currentUserId) return 0;
        const now = new Date();
        return requests.filter((r) => {
            if (r.applicantId !== currentUserId || r.status !== "accepted") return false;
            const status = getActivityStatus(r.scheduledAt, now);
            return status !== "completed";
        }).length;
    }, [requests, currentUserId]);

    return (
        <ParticipationContext.Provider
            value={{
                currentUserId,
                sendRequest,
                acceptRequest,
                declineRequest,
                cancelRequest,
                getReceivedRequests: getReceivedRequestsFn,
                getSentRequests: getSentRequestsFn,
                getMyRequestStatus,
                getMyRequest: getMyRequestFn,
                getReceivedPendingCount: getReceivedPendingCountFn,
                getSentPendingCount: getSentPendingCountFn,
                getRequestsForPost: getRequestsForPostFn,
                getActiveActivities,
                getActiveCount,
                isFromSupabase,
                isLoading,
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
