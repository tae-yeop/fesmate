"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Bug,
    X,
    User,
    LogIn,
    LogOut,
    Clock,
    RotateCcw,
    Layers,
    Radio,
    ExternalLink,
} from "lucide-react";
import { useDevContext, SCENARIO_INFO, ScenarioType, OverrideMode } from "@/lib/dev-context";
import { cn } from "@/lib/utils";
import { MOCK_USERS } from "@/lib/mock-data";

/**
 * Dev Panel - PRD 6.10 고도화
 * - 시간 시뮬레이터 (Time Travel)
 * - 시나리오 전환 (A~F)
 * - Override 모드 (AUTO/LIVE/RECAP)
 * - 세션 토글 (로그인/로그아웃)
 */
export function DevPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const {
        // 시간
        simulatedTime,
        setSimulatedTime,
        advanceTime,
        resetTime,
        getNow,
        // 시나리오
        activeScenario,
        setActiveScenario,
        scenarioEventId,
        // Override 모드
        overrideMode,
        setOverrideMode,
        // 세션
        mockUserId,
        setMockUserId,
        isLoggedIn,
        // Dev 모드
        isDevMode,
        toggleDevMode,
    } = useDevContext();

    // 시나리오 이벤트 페이지로 이동
    const goToScenarioEvent = () => {
        if (scenarioEventId) {
            router.push(`/event/${scenarioEventId}`);
        }
    };

    const now = getNow();

    // 시간 포맷
    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    // 특정 시간으로 설정
    const setSpecificTime = (hoursOffset: number) => {
        const newTime = new Date();
        newTime.setHours(newTime.getHours() + hoursOffset);
        setSimulatedTime(newTime);
    };

    if (!isDevMode) {
        return (
            <button
                onClick={() => {
                    console.log("Dev mode toggle clicked");
                    toggleDevMode();
                }}
                className="fixed bottom-20 left-4 z-[100] flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors"
                title="Dev Mode 활성화"
            >
                <Bug className="h-6 w-6" />
            </button>
        );
    }

    return (
        <>
            {/* Dev Mode 버튼 */}
            <button
                onClick={() => {
                    console.log("Dev panel toggle clicked, isOpen:", !isOpen);
                    setIsOpen(!isOpen);
                }}
                className={cn(
                    "fixed bottom-20 left-4 z-[100] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
                    isOpen ? "bg-red-500 text-white" : "bg-purple-600 text-white hover:bg-purple-700"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <Bug className="h-6 w-6" />}
            </button>

            {/* Dev Panel */}
            {isOpen && (
                <div className="fixed bottom-36 left-4 z-[100] w-72 rounded-lg border bg-card shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                    {/* 헤더 */}
                    <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between sticky top-0">
                        <span className="font-bold text-sm flex items-center gap-2">
                            <Bug className="h-4 w-4" />
                            Dev Panel
                        </span>
                        <button
                            onClick={toggleDevMode}
                            className="text-xs text-gray-400 hover:text-white"
                        >
                            닫기
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* 시간 시뮬레이터 */}
                        <section>
                            <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                시간 시뮬레이터
                            </h3>
                            <div className="rounded border bg-muted/50 p-2 text-sm mb-2">
                                <p className="font-mono text-center">
                                    {simulatedTime ? (
                                        <span className="text-orange-500">{formatTime(now)}</span>
                                    ) : (
                                        <span className="text-green-500">{formatTime(now)} (실시간)</span>
                                    )}
                                </p>
                            </div>
                            <div className="grid grid-cols-4 gap-1 mb-2">
                                <button
                                    onClick={() => advanceTime(1)}
                                    className="rounded border px-2 py-1.5 text-xs font-medium hover:bg-accent"
                                >
                                    +1h
                                </button>
                                <button
                                    onClick={() => advanceTime(6)}
                                    className="rounded border px-2 py-1.5 text-xs font-medium hover:bg-accent"
                                >
                                    +6h
                                </button>
                                <button
                                    onClick={() => advanceTime(24)}
                                    className="rounded border px-2 py-1.5 text-xs font-medium hover:bg-accent"
                                >
                                    +1d
                                </button>
                                <button
                                    onClick={resetTime}
                                    className="rounded border px-2 py-1.5 text-xs font-medium hover:bg-accent flex items-center justify-center"
                                    title="리셋"
                                >
                                    <RotateCcw className="h-3 w-3" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                <button
                                    onClick={() => setSpecificTime(-24)}
                                    className="rounded border px-2 py-1 text-[10px] hover:bg-accent"
                                >
                                    어제
                                </button>
                                <button
                                    onClick={() => setSpecificTime(24 * 7)}
                                    className="rounded border px-2 py-1 text-[10px] hover:bg-accent"
                                >
                                    +7일
                                </button>
                            </div>
                        </section>

                        {/* 시나리오 선택 */}
                        <section>
                            <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                시나리오
                            </h3>
                            <div className="grid grid-cols-3 gap-1">
                                {(Object.keys(SCENARIO_INFO) as ScenarioType[]).map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => setActiveScenario(key)}
                                        className={cn(
                                            "rounded border px-2 py-1.5 text-xs font-medium",
                                            activeScenario === key
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-accent"
                                        )}
                                        title={SCENARIO_INFO[key].description}
                                    >
                                        {key}: {SCENARIO_INFO[key].label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                현재: {SCENARIO_INFO[activeScenario].description}
                            </p>
                            <button
                                onClick={goToScenarioEvent}
                                className="mt-2 w-full rounded border px-2 py-1.5 text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                이벤트 페이지로 이동
                            </button>
                        </section>

                        {/* Override 모드 */}
                        <section>
                            <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                <Radio className="h-3 w-3" />
                                Hub 모드 Override
                            </h3>
                            <div className="flex gap-1">
                                {(["AUTO", "LIVE", "RECAP"] as OverrideMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setOverrideMode(mode)}
                                        className={cn(
                                            "flex-1 rounded border px-2 py-1.5 text-xs font-medium",
                                            overrideMode === mode
                                                ? mode === "LIVE"
                                                    ? "bg-red-500 text-white"
                                                    : mode === "RECAP"
                                                    ? "bg-gray-600 text-white"
                                                    : "bg-primary text-primary-foreground"
                                                : "hover:bg-accent"
                                        )}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* 세션 토글 */}
                        <section>
                            <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                세션
                            </h3>
                            <div className="rounded border bg-muted/50 p-2 text-sm mb-2">
                                <p className="font-bold flex items-center gap-1 text-xs">
                                    {isLoggedIn ? (
                                        <>
                                            <LogIn className="h-3 w-3 text-green-500" />
                                            {MOCK_USERS.find((u) => u.id === mockUserId)?.nickname}
                                        </>
                                    ) : (
                                        <>
                                            <LogOut className="h-3 w-3 text-gray-500" />
                                            로그아웃
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <button
                                    onClick={() => setMockUserId(null)}
                                    className={cn(
                                        "flex-1 rounded border px-2 py-1.5 text-xs font-medium",
                                        !isLoggedIn ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                                    )}
                                >
                                    로그아웃
                                </button>
                                {MOCK_USERS.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => setMockUserId(user.id)}
                                        className={cn(
                                            "flex-1 rounded border px-2 py-1.5 text-xs font-medium",
                                            mockUserId === user.id
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-accent"
                                        )}
                                    >
                                        {user.nickname}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </>
    );
}
