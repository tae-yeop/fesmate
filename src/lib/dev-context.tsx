"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from "react";
import { getEventByScenario, getPostsByScenario, getSlotsByScenario, SCENARIO_EVENT_IDS } from "@/lib/mock-data";
import type { Event, Slot } from "@/types/event";
import type { Post } from "@/types/post";

/** 시나리오 타입 (PRD 6.12) */
export type ScenarioType = "A" | "B" | "C" | "D" | "E" | "F" | "G";

/** 시나리오 설명 */
export const SCENARIO_INFO: Record<ScenarioType, { label: string; description: string }> = {
    A: { label: "기본", description: "단일일정, 예정" },
    B: { label: "다일 페스티벌", description: "2일 이상, LIVE" },
    C: { label: "종료 시각 누락", description: "end_at 없음" },
    D: { label: "취소", description: "CANCELED 상태" },
    E: { label: "연기", description: "POSTPONED 상태" },
    F: { label: "해외", description: "Asia/Tokyo" },
    G: { label: "펜타포트", description: "3일 3스테이지, 콜가이드 연동" },
};

/** Override 모드 */
export type OverrideMode = "AUTO" | "LIVE" | "RECAP";

/** 데이터 모드 (Mock vs Supabase) */
export type DataMode = "mock" | "supabase";

interface DevContextType {
    // 시간 시뮬레이터
    simulatedTime: Date | null;
    setSimulatedTime: (time: Date | null) => void;
    advanceTime: (hours: number) => void;
    resetTime: () => void;
    getNow: () => Date;

    // 시나리오 선택
    activeScenario: ScenarioType;
    setActiveScenario: (scenario: ScenarioType) => void;

    // 시나리오 데이터 (헬퍼)
    scenarioEvent: Event | undefined;
    scenarioEventId: string;
    scenarioPosts: Post[];
    scenarioSlots: Slot[];

    // Override 모드
    overrideMode: OverrideMode;
    setOverrideMode: (mode: OverrideMode) => void;

    // 세션 시뮬레이터
    mockUserId: string | null;
    setMockUserId: (userId: string | null) => void;
    isLoggedIn: boolean;

    // Dev 모드 활성화
    isDevMode: boolean;
    toggleDevMode: () => void;

    // 데이터 모드 (Mock vs Supabase)
    dataMode: DataMode;
    setDataMode: (mode: DataMode) => void;

    // Hydration 상태 (localStorage 로드 완료 여부)
    isHydrated: boolean;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

// localStorage 키
const DEV_STORAGE_KEY = "fesmate:v1:device:dev-settings";

export function DevProvider({ children }: { children: ReactNode }) {
    const [simulatedTime, setSimulatedTime] = useState<Date | null>(null);
    const [mockUserId, setMockUserId] = useState<string | null>(null);
    const [isDevMode, setIsDevMode] = useState(false);
    const [activeScenario, setActiveScenario] = useState<ScenarioType>("A");
    const [overrideMode, setOverrideMode] = useState<OverrideMode>("AUTO");
    const [dataMode, setDataMode] = useState<DataMode>("mock");
    const [isHydrated, setIsHydrated] = useState(false);

    // 클라이언트에서 localStorage 로드 (hydration 후)
    useEffect(() => {
        console.log("[DevContext] Load useEffect triggered");

        if (typeof window === "undefined") {
            console.log("[DevContext] SSR - skipping localStorage");
            setIsHydrated(true);
            return;
        }

        try {
            const saved = localStorage.getItem(DEV_STORAGE_KEY);
            console.log("[DevContext] localStorage.getItem result:", saved);

            if (saved) {
                const parsed = JSON.parse(saved);
                console.log("[DevContext] Parsed settings:", parsed);
                if (parsed.mockUserId !== undefined) setMockUserId(parsed.mockUserId);
                if (parsed.dataMode) setDataMode(parsed.dataMode);
            } else {
                console.log("[DevContext] No saved settings found");
            }
        } catch (e) {
            console.error("[DevContext] Error loading settings:", e);
        }

        console.log("[DevContext] Setting isHydrated to true");
        setIsHydrated(true);
    }, []);

    // mockUserId, dataMode 변경 시 localStorage에 저장 (hydration 완료 후에만)
    useEffect(() => {
        console.log("[DevContext] Save useEffect triggered, isHydrated:", isHydrated, "mockUserId:", mockUserId, "dataMode:", dataMode);

        if (!isHydrated) {
            console.log("[DevContext] Not hydrated yet, skipping save");
            return;
        }

        if (typeof window === "undefined") {
            console.log("[DevContext] SSR - skipping save");
            return;
        }

        try {
            const settings = { mockUserId, dataMode };
            localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(settings));
            console.log("[DevContext] Saved to localStorage:", settings);
        } catch (e) {
            console.error("[DevContext] Error saving settings:", e);
        }
    }, [mockUserId, dataMode, isHydrated]);

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

    // 시나리오 데이터 (메모이제이션)
    const scenarioEventId = useMemo(() => SCENARIO_EVENT_IDS[activeScenario] || "", [activeScenario]);
    const scenarioEvent = useMemo(() => getEventByScenario(activeScenario), [activeScenario]);
    const scenarioPosts = useMemo(() => getPostsByScenario(activeScenario), [activeScenario]);
    const scenarioSlots = useMemo(() => getSlotsByScenario(activeScenario), [activeScenario]);

    return (
        <DevContext.Provider
            value={{
                simulatedTime,
                setSimulatedTime,
                advanceTime,
                resetTime,
                getNow,
                activeScenario,
                setActiveScenario,
                scenarioEvent,
                scenarioEventId,
                scenarioPosts,
                scenarioSlots,
                overrideMode,
                setOverrideMode,
                mockUserId,
                setMockUserId,
                isLoggedIn: mockUserId !== null,
                isDevMode,
                toggleDevMode,
                dataMode,
                setDataMode,
                isHydrated,
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
