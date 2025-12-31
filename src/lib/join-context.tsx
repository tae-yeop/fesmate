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

// 참여 신청 정보
interface JoinRequest {
    postId: string;
    userId: string;
    message: string;
    createdAt: Date;
    status: "pending" | "approved" | "rejected";
}

interface JoinContextValue {
    /** 참여 신청 */
    requestJoin: (postId: string, message: string) => void;
    /** 참여 신청 취소 */
    cancelJoin: (postId: string) => void;
    /** 해당 포스트에 참여 신청했는지 확인 */
    hasRequested: (postId: string) => boolean;
    /** 해당 포스트의 참여 신청 정보 가져오기 */
    getJoinRequest: (postId: string) => JoinRequest | null;
    /** 내 참여 신청 목록 */
    myJoinRequests: JoinRequest[];
}

const JoinContext = createContext<JoinContextValue | null>(null);

// Storage adapter factory (userId 기반)
const createJoinAdapter = createUserAdapter<JoinRequest[]>({
    domain: DOMAINS.JOIN_REQUESTS,
    dateFields: ["createdAt"],
});

export function JoinProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { mockUserId } = useDevContext();

    const currentUserId = user?.id || mockUserId;

    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

    // Storage adapter (userId 변경 시 재생성)
    const joinAdapter = useMemo(
        () => createJoinAdapter(currentUserId),
        [currentUserId]
    );

    // Storage에서 불러오기
    useEffect(() => {
        if (!currentUserId) {
            setJoinRequests([]);
            return;
        }

        // Date 복원은 adapter에서 처리됨
        const stored = joinAdapter.get();
        setJoinRequests(stored || []);
    }, [currentUserId, joinAdapter]);

    // Storage에 저장
    const saveToStorage = useCallback((requests: JoinRequest[]) => {
        if (!currentUserId) return;
        joinAdapter.set(requests);
    }, [currentUserId, joinAdapter]);

    // 참여 신청
    const requestJoin = useCallback((postId: string, message: string) => {
        if (!currentUserId) return;

        setJoinRequests(prev => {
            // 이미 신청했으면 무시
            if (prev.some(req => req.postId === postId)) {
                return prev;
            }

            const newRequest: JoinRequest = {
                postId,
                userId: currentUserId,
                message,
                createdAt: new Date(),
                status: "pending",
            };

            const updated = [...prev, newRequest];
            saveToStorage(updated);
            return updated;
        });
    }, [currentUserId, saveToStorage]);

    // 참여 취소
    const cancelJoin = useCallback((postId: string) => {
        setJoinRequests(prev => {
            const updated = prev.filter(req => req.postId !== postId);
            saveToStorage(updated);
            return updated;
        });
    }, [saveToStorage]);

    // 참여 신청 여부 확인
    const hasRequested = useCallback((postId: string) => {
        return joinRequests.some(req => req.postId === postId);
    }, [joinRequests]);

    // 참여 신청 정보 가져오기
    const getJoinRequest = useCallback((postId: string) => {
        return joinRequests.find(req => req.postId === postId) || null;
    }, [joinRequests]);

    return (
        <JoinContext.Provider
            value={{
                requestJoin,
                cancelJoin,
                hasRequested,
                getJoinRequest,
                myJoinRequests: joinRequests,
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
