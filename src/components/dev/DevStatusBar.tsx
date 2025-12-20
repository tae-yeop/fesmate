"use client";

import { Clock, Layers, User, Radio } from "lucide-react";
import { useDevContext, SCENARIO_INFO } from "@/lib/dev-context";
import { cn } from "@/lib/utils";
import { MOCK_USERS } from "@/lib/mock-data";

/**
 * Dev Status Bar - 상단 고정 상태바
 * Dev 모드 활성화 시 현재 시나리오/가상 시간/세션 표시
 */
export function DevStatusBar() {
    const {
        simulatedTime,
        getNow,
        activeScenario,
        overrideMode,
        mockUserId,
        isLoggedIn,
        isDevMode,
    } = useDevContext();

    // Dev 모드가 아니면 표시 안 함
    if (!isDevMode) return null;

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

    const currentUser = MOCK_USERS.find((u) => u.id === mockUserId);

    return (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gray-900 text-white text-[10px] px-3 py-1">
            <div className="flex items-center justify-between max-w-screen-lg mx-auto">
                {/* 시나리오 */}
                <div className="flex items-center gap-1">
                    <Layers className="h-3 w-3 text-blue-400" />
                    <span className="text-gray-400">시나리오:</span>
                    <span className="font-bold text-blue-400">
                        {activeScenario} - {SCENARIO_INFO[activeScenario].label}
                    </span>
                </div>

                {/* 시간 */}
                <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-orange-400" />
                    <span className={cn(
                        "font-mono",
                        simulatedTime ? "text-orange-400" : "text-green-400"
                    )}>
                        {formatTime(now)}
                        {simulatedTime && " (가상)"}
                    </span>
                </div>

                {/* Override 모드 */}
                <div className="flex items-center gap-1">
                    <Radio className="h-3 w-3 text-purple-400" />
                    <span className={cn(
                        "font-bold",
                        overrideMode === "LIVE" ? "text-red-400" :
                        overrideMode === "RECAP" ? "text-gray-400" :
                        "text-purple-400"
                    )}>
                        {overrideMode}
                    </span>
                </div>

                {/* 세션 */}
                <div className="flex items-center gap-1">
                    <User className="h-3 w-3 text-green-400" />
                    <span className={cn(
                        "font-medium",
                        isLoggedIn ? "text-green-400" : "text-gray-500"
                    )}>
                        {isLoggedIn ? currentUser?.nickname : "로그아웃"}
                    </span>
                </div>
            </div>
        </div>
    );
}
