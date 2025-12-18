"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Block } from "@/types/report";

interface BlockContextType {
    blockedUsers: string[];
    isBlocked: (userId: string) => boolean;
    blockUser: (userId: string) => void;
    unblockUser: (userId: string) => void;
    getBlockedList: () => Block[];
}

const BlockContext = createContext<BlockContextType | undefined>(undefined);

// 초기 Mock 데이터 (개발용)
const INITIAL_BLOCKED: Block[] = [];

export function BlockProvider({ children }: { children: ReactNode }) {
    const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKED);

    const blockedUsers = blocks.map(b => b.blockedId);

    const isBlocked = useCallback((userId: string) => {
        return blockedUsers.includes(userId);
    }, [blockedUsers]);

    const blockUser = useCallback((userId: string) => {
        // 실제로는 API 호출
        const newBlock: Block = {
            id: `block-${Date.now()}`,
            blockerId: "current-user", // 실제로는 현재 로그인 유저 ID
            blockedId: userId,
            createdAt: new Date(),
        };
        setBlocks(prev => [...prev, newBlock]);
    }, []);

    const unblockUser = useCallback((userId: string) => {
        // 실제로는 API 호출
        setBlocks(prev => prev.filter(b => b.blockedId !== userId));
    }, []);

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
