"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Block } from "@/types/report";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";

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
}

const BlockContext = createContext<BlockContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "fesmate_blocked_users_";

export function BlockProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const { mockUserId, isDevMode } = useDevContext();

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // 현재 사용자 ID 결정:
    // 1. 실제 로그인 사용자 (최우선)
    // 2. Dev 모드의 mockUserId (개발 테스트용)
    // 3. null (로그인 필요)
    const currentUserId = user?.id ?? (isDevMode ? mockUserId : null);

    // 차단 기능 사용 가능 여부
    const canBlock = currentUserId !== null;

    // 사용자별 storage key
    const getStorageKey = useCallback(() => {
        if (!currentUserId) return null;
        return `${STORAGE_KEY_PREFIX}${currentUserId}`;
    }, [currentUserId]);

    // localStorage에서 로드 (사용자 변경 시 재로드)
    useEffect(() => {
        const storageKey = getStorageKey();
        if (!storageKey) {
            // 로그인 안 됨 - 빈 배열
            setBlocks([]);
            setIsLoaded(true);
            return;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                // Date 객체 복원
                const parsed = data.map((b: Block) => ({
                    ...b,
                    createdAt: new Date(b.createdAt),
                }));
                setBlocks(parsed);
            } else {
                setBlocks([]);
            }
        } catch (e) {
            console.error("Failed to load blocked users:", e);
            setBlocks([]);
        }
        setIsLoaded(true);
    }, [getStorageKey]);

    // localStorage에 저장
    useEffect(() => {
        if (!isLoaded) return;
        const storageKey = getStorageKey();
        if (!storageKey) return;

        try {
            localStorage.setItem(storageKey, JSON.stringify(blocks));
        } catch (e) {
            console.error("Failed to save blocked users:", e);
        }
    }, [blocks, isLoaded, getStorageKey]);

    const blockedUsers = blocks.map(b => b.blockedId);

    const isBlocked = useCallback((userId: string) => {
        if (!canBlock) return false; // 로그인 안 됨 - 차단 안 됨
        return blockedUsers.includes(userId);
    }, [blockedUsers, canBlock]);

    const blockUser = useCallback((userId: string) => {
        if (!canBlock || !currentUserId) return;
        // 이미 차단된 경우 무시
        if (blockedUsers.includes(userId)) return;

        const newBlock: Block = {
            id: `block-${Date.now()}`,
            blockerId: currentUserId,
            blockedId: userId,
            createdAt: new Date(),
        };
        setBlocks(prev => [...prev, newBlock]);
    }, [blockedUsers, canBlock, currentUserId]);

    const unblockUser = useCallback((userId: string) => {
        if (!canBlock) return;
        setBlocks(prev => prev.filter(b => b.blockedId !== userId));
    }, [canBlock]);

    const getBlockedList = useCallback(() => {
        return blocks;
    }, [blocks]);

    return (
        <BlockContext.Provider value={{
            blockedUsers,
            isBlocked,
            blockUser,
            unblockUser,
            getBlockedList,
            currentUserId,
            canBlock,
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
