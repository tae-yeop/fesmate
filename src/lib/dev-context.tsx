"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DevContextType {
    // 시간 시뮬레이터
    simulatedTime: Date | null;
    setSimulatedTime: (time: Date | null) => void;
    advanceTime: (hours: number) => void;
    resetTime: () => void;
    getNow: () => Date;

    // 세션 시뮬레이터
    mockUserId: string | null;
    setMockUserId: (userId: string | null) => void;
    isLoggedIn: boolean;

    // Dev 모드 활성화
    isDevMode: boolean;
    toggleDevMode: () => void;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

export function DevProvider({ children }: { children: ReactNode }) {
    const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
    const [mockUserId, setMockUserId] = useState<string | null>(null);
    const [isDevMode, setIsDevMode] = useState(false);

    // 현재 시간 가져오기 (시뮬레이션 또는 실제)
    const getNow = useCallback(() => {
        return simulatedTime || new Date();
    }, [simulatedTime]);

    // 시간 전진
    const advanceTime = useCallback((hours: number) => {
        setSimulatedTime((prev) => {
            const base = prev || new Date();
            return new Date(base.getTime() + hours * 60 * 60 * 1000);
        });
    }, []);

    // 시간 리셋
    const resetTime = useCallback(() => {
        setSimulatedTime(null);
    }, []);

    // Dev 모드 토글
    const toggleDevMode = useCallback(() => {
        setIsDevMode((prev) => !prev);
    }, []);

    return (
        <DevContext.Provider
            value={{
                simulatedTime,
                setSimulatedTime,
                advanceTime,
                resetTime,
                getNow,
                mockUserId,
                setMockUserId,
                isLoggedIn: mockUserId !== null,
                isDevMode,
                toggleDevMode,
            }}
        >
            {children}
        </DevContext.Provider>
    );
}

export function useDevContext() {
    const context = useContext(DevContext);
    if (context === undefined) {
        throw new Error("useDevContext must be used within a DevProvider");
    }
    return context;
}

// 편의를 위한 훅
export function useSimulatedTime() {
    const { getNow } = useDevContext();
    return getNow();
}
