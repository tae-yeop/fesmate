"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import { Block } from "@/types/report";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";
import { createUserAdapter, DOMAINS } from "./storage";
import {
    getBlockList,
    blockUser as blockUserInDb,
    unblockUser as unblockUserInDb,
} from "./supabase/queries";

interface BlockContextType {
    blockedUsers: string[];
    isBlocked: (userId: string) => boolean;
    blockUser: (userId: string) => void;
    unblockUser: (userId: string) => void;
    getBlockedList: () => Block[];
    /** 현재 사용자 ID (null이면 로그인 필요) */
    currentUserId: string | null;
    /** 차단 기능 사용 가능 여부 */
    canBlock: boolean;
    /** 데이터 소스 표시 */
    isFromSupabase: boolean;
    /** 로딩 상태 */
    isLoading: boolean;
}

const BlockContext = createContext<BlockContextType | undefined>(undefined);

// Storage adapter factory (userId 기반) - Dev 모드용
const createBlockAdapter = createUserAdapter<Block[]>({
    domain: DOMAINS.BLOCKS,
    dateFields: ["createdAt"],
});

export function BlockProvider({ children }: { children: ReactNode }) {
    const { user: authUser } = useAuth();
    const { mockUserId, isDevMode, isLoggedIn: isDevLoggedIn } = useDevContext();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드 또는 비로그인
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId;

    // Dev 모드에서 mockUserId 사용
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > null)
    const currentUserId = realUserId || devUserId;

    // 차단 기능 사용 가능 여부
    const canBlock = currentUserId !== null;

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

    // Storage adapter (Dev 모드용, userId 변경 시 재생성)
    const blockAdapter = useMemo(
        () => (devUserId && !isRealUser) ? createBlockAdapter(devUserId) : null,
        [devUserId, isRealUser]
    );

    // 사용자 변경 또는 초기 로드 시 데이터 로드
    useEffect(() => {
        // 사용자가 변경되었거나 처음 로드하는 경우
        if (loadedUserId !== currentUserId) {
            // 비로그인 시에는 빈 데이터
            if (!currentUserId) {
                setBlocks([]);
                setLoadedUserId(currentUserId);
                setIsFromSupabase(false);
                return;
            }

            // 실제 사용자: Supabase에서 로드
            if (isRealUser && realUserId) {
                setIsLoading(true);
                getBlockList(realUserId)
                    .then((blockData) => {
                        // Block 데이터 변환 (DB Block → Frontend Block with id)
                        const convertedBlocks: Block[] = blockData.map(b => ({
                            id: `block-${b.blockerId}-${b.blockedId}`,
                            blockerId: b.blockerId,
                            blockedId: b.blockedId,
                            createdAt: b.createdAt,
                        }));
                        setBlocks(convertedBlocks);
                        setIsFromSupabase(true);
                    })
                    .catch((error) => {
                        console.error("[BlockContext] Supabase load failed:", error);
                        // Supabase 실패 시 빈 배열로 시작
                        setBlocks([]);
                        setIsFromSupabase(false);
                    })
                    .finally(() => {
                        setIsLoading(false);
                        setLoadedUserId(currentUserId);
                    });
                return;
            }

            // Dev 모드: localStorage에서 로드
            if (blockAdapter) {
                const stored = blockAdapter.get();
                setBlocks(stored || []);
            }

            setLoadedUserId(currentUserId);
            setIsFromSupabase(false);
        }
    }, [currentUserId, loadedUserId, isRealUser, realUserId, blockAdapter]);

    // localStorage에 저장 (Dev 모드만)
    useEffect(() => {
        if (isRealUser || !blockAdapter || loadedUserId !== currentUserId) return;
        blockAdapter.set(blocks);
    }, [blocks, isRealUser, currentUserId, loadedUserId, blockAdapter]);

    const blockedUsers = blocks.map(b => b.blockedId);

    const isBlocked = useCallback((userId: string) => {
        if (!canBlock) return false; // 로그인 안 됨 - 차단 안 됨
        return blockedUsers.includes(userId);
    }, [blockedUsers, canBlock]);

    const blockUserFn = useCallback((userId: string) => {
        if (!canBlock || !currentUserId) return;
        // 이미 차단된 경우 무시
        if (blockedUsers.includes(userId)) return;

        // Optimistic update
        const newBlock: Block = {
            id: `block-${currentUserId}-${userId}`,
            blockerId: currentUserId,
            blockedId: userId,
            createdAt: new Date(),
        };
        setBlocks(prev => [...prev, newBlock]);

        // 실제 사용자: Supabase에 저장
        if (isRealUser && realUserId) {
            blockUserInDb(realUserId, userId).catch((error) => {
                console.error("[BlockContext] blockUser failed:", error);
                // 롤백
                setBlocks(prev => prev.filter(b => b.blockedId !== userId));
            });
        }
        // Dev 모드: localStorage는 useEffect에서 자동 저장
    }, [blockedUsers, canBlock, currentUserId, isRealUser, realUserId]);

    const unblockUserFn = useCallback((userId: string) => {
        if (!canBlock || !currentUserId) return;

        const existingBlock = blocks.find(b => b.blockedId === userId);
        if (!existingBlock) return;

        // Optimistic update
        setBlocks(prev => prev.filter(b => b.blockedId !== userId));

        // 실제 사용자: Supabase에서 삭제
        if (isRealUser && realUserId) {
            unblockUserInDb(realUserId, userId).catch((error) => {
                console.error("[BlockContext] unblockUser failed:", error);
                // 롤백
                setBlocks(prev => [...prev, existingBlock]);
            });
        }
        // Dev 모드: localStorage는 useEffect에서 자동 저장
    }, [blocks, canBlock, currentUserId, isRealUser, realUserId]);

    const getBlockedListFn = useCallback(() => {
        return blocks;
    }, [blocks]);

    return (
        <BlockContext.Provider value={{
            blockedUsers,
            isBlocked,
            blockUser: blockUserFn,
            unblockUser: unblockUserFn,
            getBlockedList: getBlockedListFn,
            currentUserId,
            canBlock,
            isFromSupabase,
            isLoading,
        }}>
            {children}
        </BlockContext.Provider>
    );
}

export function useBlock() {
    const context = useContext(BlockContext);
    if (context === undefined) {
        throw new Error("useBlock must be used within a BlockProvider");
    }
    return context;
}
