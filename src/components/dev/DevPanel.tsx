"use client";

import { useState } from "react";
import { Bug, X, User, LogIn, LogOut } from "lucide-react";
import { useDevContext } from "@/lib/dev-context";
import { cn } from "@/lib/utils";
import { MOCK_USERS } from "@/lib/mock-data";

/**
 * Dev Panel - 간소화된 디버그 도구
 * - 세션 토글 (로그인/로그아웃)
 *
 * 참고: LIVE/RECAP은 자동 계산됨
 * - LIVE: now >= (startAt - 24h) AND now < (endAt + 6h)
 * - RECAP: now >= (endAt + 6h)
 */
export function DevPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const {
        mockUserId,
        setMockUserId,
        isLoggedIn,
        isDevMode,
        toggleDevMode,
    } = useDevContext();

    if (!isDevMode) {
        return (
            <button
                onClick={toggleDevMode}
                className="fixed bottom-24 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg opacity-30 hover:opacity-100 transition-opacity"
                title="Dev Mode 활성화"
            >
                <Bug className="h-5 w-5" />
            </button>
        );
    }

    return (
        <>
            {/* Dev Mode 버튼 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-24 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
                    isOpen ? "bg-red-500 text-white" : "bg-gray-800 text-white"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <Bug className="h-6 w-6" />}
            </button>

            {/* Dev Panel */}
            {isOpen && (
                <div className="fixed bottom-40 left-4 z-50 w-64 rounded-lg border bg-card shadow-xl overflow-hidden">
                    {/* 헤더 */}
                    <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
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
                        {/* 세션 토글 */}
                        <section>
                            <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                로그인 상태
                            </h3>
                            <div className="rounded border bg-muted/50 p-2 text-sm mb-2">
                                <p className="font-bold flex items-center gap-1">
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

                        {/* 안내 */}
                        <div className="text-xs text-muted-foreground border-t pt-3">
                            <p className="font-medium mb-1">LIVE/RECAP 자동 계산:</p>
                            <p>• <strong>LIVE</strong>: 시작 24시간 전 ~ 종료 6시간 후</p>
                            <p>• <strong>RECAP</strong>: 종료 6시간 이후</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
