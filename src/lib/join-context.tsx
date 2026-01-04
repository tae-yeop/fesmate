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
import { useDevContext } from "./dev-context";
import { useAuth } from "./auth-context";
import { createUserAdapter, DOMAINS } from "./storage";
import { isValidUUID } from "./utils";
import {
    getSentRequests,
    getMyRequest,
    sendParticipationRequest,
    cancelParticipationRequest,
    ParticipationRequest,
} from "./supabase/queries";

// 참여 신청 정보
interface JoinRequest {
    id?: string; // Supabase에서는 UUID
    postId: string;
    postAuthorId?: string; // Supabase에서 필요
    userId: string;
    message: string;
    createdAt: Date;
    status: "pending" | "approved" | "rejected";
}

/**
 * ParticipationRequest를 JoinRequest로 변환
 */
function transformToJoinRequest(pr: ParticipationRequest): JoinRequest {
    return {
        id: pr.id,
        postId: pr.postId,
        postAuthorId: pr.postAuthorId,
        userId: pr.applicantId,
        message: pr.message || "",
        createdAt: pr.createdAt,
        status: pr.status === "accepted" ? "approved"
            : pr.status === "declined" ? "rejected"
                : "pending",
    };
}

interface JoinContextValue {
    /** 참여 신청 */
    requestJoin: (postId: string, message: string, postAuthorId?: string) => void;
    /** 참여 신청 취소 */
    cancelJoin: (postId: string) => void;
    /** 해당 포스트에 참여 신청했는지 확인 */
    hasRequested: (postId: string) => boolean;
    /** 해당 포스트의 참여 신청 정보 가져오기 */
    getJoinRequest: (postId: string) => JoinRequest | null;
    /** 내 참여 신청 목록 */
    myJoinRequests: JoinRequest[];
    /** 로딩 상태 */
    isLoading: boolean;
    /** Supabase 연동 여부 */
    isFromSupabase: boolean;
}

const JoinContext = createContext<JoinContextValue | null>(null);

// Storage adapter factory (userId 기반) - Dev 모드용
const createJoinAdapter = createUserAdapter<JoinRequest[]>({
    domain: DOMAINS.JOIN_REQUESTS,
    dateFields: ["createdAt"],
});

export function JoinProvider({ children }: { children: ReactNode }) {
    const { user: authUser } = useAuth();
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드 또는 비로그인
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId;

    // Dev 모드에서 mockUserId 사용
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > null)
    const currentUserId = realUserId || devUserId;

    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

    // Storage adapter (userId 변경 시 재생성) - Dev 모드용
    const joinAdapter = useMemo(
        () => (currentUserId && !isRealUser) ? createJoinAdapter(currentUserId) : null,
        [currentUserId, isRealUser]
    );

    // 데이터 로드
    useEffect(() => {
        if (loadedUserId !== currentUserId) {
            if (!currentUserId) {
                setJoinRequests([]);
                setLoadedUserId(null);
                setIsFromSupabase(false);
                return;
            }

            // 실제 사용자: Supabase에서 로드
            if (isRealUser && realUserId) {
                setIsLoading(true);
                getSentRequests(realUserId)
                    .then((requests) => {
                        setJoinRequests(requests.map(transformToJoinRequest));
                        setIsFromSupabase(true);
                    })
                    .catch((error) => {
                        console.error("[JoinContext] Supabase load failed:", error);
                        setJoinRequests([]);
                        setIsFromSupabase(false);
                    })
                    .finally(() => {
                        setIsLoading(false);
                        setLoadedUserId(currentUserId);
                    });
                return;
            }

            // Dev 모드: localStorage에서 로드
            if (joinAdapter) {
                const stored = joinAdapter.get();
                setJoinRequests(stored || []);
            }

            setLoadedUserId(currentUserId);
            setIsFromSupabase(false);
        }
    }, [currentUserId, isRealUser, realUserId, loadedUserId, joinAdapter]);

    // Storage에 저장 (Dev 모드에서만)
    const saveToStorage = useCallback((requests: JoinRequest[]) => {
        if (!currentUserId || isRealUser || !joinAdapter) return;
        joinAdapter.set(requests);
    }, [currentUserId, isRealUser, joinAdapter]);

    // 참여 신청
    const requestJoin = useCallback((postId: string, message: string, postAuthorId?: string) => {
        if (!currentUserId) return;

        // 이미 신청했으면 무시
        if (joinRequests.some(req => req.postId === postId)) {
            return;
        }

        const tempId = `join-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newRequest: JoinRequest = {
            id: tempId,
            postId,
            postAuthorId,
            userId: currentUserId,
            message,
            createdAt: new Date(),
            status: "pending",
        };

        // Optimistic update
        setJoinRequests(prev => [...prev, newRequest]);

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(postId) && postAuthorId) {
            sendParticipationRequest(realUserId, {
                postId,
                postAuthorId,
                message,
            })
                .then((pr) => {
                    // DB에서 반환된 실제 ID로 교체
                    setJoinRequests(prev =>
                        prev.map(req =>
                            req.id === tempId ? { ...req, id: pr.id } : req
                        )
                    );
                })
                .catch((error) => {
                    console.error("[JoinContext] requestJoin failed:", error);
                    // 롤백
                    setJoinRequests(prev => prev.filter(req => req.id !== tempId));
                });
        } else {
            // Dev 모드: localStorage에 저장
            saveToStorage([...joinRequests, newRequest]);
        }
    }, [currentUserId, joinRequests, isRealUser, realUserId, saveToStorage]);

    // 참여 취소
    const cancelJoin = useCallback((postId: string) => {
        const request = joinRequests.find(req => req.postId === postId);
        if (!request) return;

        // Optimistic update
        setJoinRequests(prev => prev.filter(req => req.postId !== postId));

        // 로그인 + 유효한 UUID인 경우에만 Supabase에서 취소
        if (isRealUser && realUserId && request.id && isValidUUID(request.id)) {
            cancelParticipationRequest(request.id).catch((error) => {
                console.error("[JoinContext] cancelJoin failed:", error);
                // 롤백
                setJoinRequests(prev => [...prev, request]);
            });
        } else {
            // Dev 모드: localStorage에 저장
            saveToStorage(joinRequests.filter(req => req.postId !== postId));
        }
    }, [joinRequests, isRealUser, realUserId, saveToStorage]);

    // 참여 신청 여부 확인
    const hasRequested = useCallback((postId: string) => {
        return joinRequests.some(req => req.postId === postId && req.status !== "rejected");
    }, [joinRequests]);

    // 참여 신청 정보 가져오기
    const getJoinRequestFn = useCallback((postId: string) => {
        return joinRequests.find(req => req.postId === postId) || null;
    }, [joinRequests]);

    return (
        <JoinContext.Provider
            value={{
                requestJoin,
                cancelJoin,
                hasRequested,
                getJoinRequest: getJoinRequestFn,
                myJoinRequests: joinRequests,
                isLoading,
                isFromSupabase,
            }}
        >
            {children}
        </JoinContext.Provider>
    );
}

export function useJoin() {
    const context = useContext(JoinContext);
    if (!context) {
        throw new Error("useJoin must be used within JoinProvider");
    }
    return context;
}
