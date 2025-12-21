"use client";

import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useBadge } from "@/lib/badge-context";
import { BADGE_RARITY_CONFIG, BadgeDefinition } from "@/types/badge";
import { cn } from "@/lib/utils";

interface ToastItem {
    id: string;
    badge: BadgeDefinition;
    visible: boolean;
}

export function BadgeToast() {
    const { newBadges, clearNewBadges } = useBadge();
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    // 새 배지가 추가되면 토스트 큐에 추가
    useEffect(() => {
        if (newBadges.length > 0) {
            const newToasts: ToastItem[] = newBadges.map((badge, index) => ({
                id: `${badge.id}-${Date.now()}-${index}`,
                badge,
                visible: true,
            }));
            setToasts(prev => [...prev, ...newToasts]);
            clearNewBadges();
        }
    }, [newBadges, clearNewBadges]);

    // 토스트 자동 닫기 (5초 후)
    useEffect(() => {
        if (toasts.length === 0) return;

        const timer = setTimeout(() => {
            setToasts(prev => {
                if (prev.length === 0) return prev;
                // 가장 오래된 토스트부터 페이드 아웃
                const [first, ...rest] = prev;
                if (first) {
                    // 먼저 visible을 false로 설정
                    return [{ ...first, visible: false }, ...rest];
                }
                return rest;
            });
        }, 4000);

        return () => clearTimeout(timer);
    }, [toasts]);

    // visible이 false인 토스트 제거 (애니메이션 후)
    useEffect(() => {
        const invisibleToast = toasts.find(t => !t.visible);
        if (invisibleToast) {
            const timer = setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== invisibleToast.id));
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [toasts]);

    const handleClose = (id: string) => {
        setToasts(prev =>
            prev.map(t => (t.id === id ? { ...t, visible: false } : t))
        );
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm">
            {toasts.map((toast) => {
                const rarityConfig = BADGE_RARITY_CONFIG[toast.badge.rarity];

                return (
                    <div
                        key={toast.id}
                        className={cn(
                            "relative overflow-hidden rounded-xl shadow-xl",
                            "transform transition-all duration-300 ease-out",
                            toast.visible
                                ? "translate-x-0 opacity-100"
                                : "translate-x-full opacity-0",
                            "bg-gradient-to-r",
                            toast.badge.rarity === "legendary" && "from-yellow-50 via-amber-50 to-yellow-100 border-2 border-yellow-300",
                            toast.badge.rarity === "epic" && "from-purple-50 via-violet-50 to-purple-100 border-2 border-purple-300",
                            toast.badge.rarity === "rare" && "from-blue-50 via-sky-50 to-blue-100 border-2 border-blue-300",
                            toast.badge.rarity === "common" && "from-gray-50 via-slate-50 to-gray-100 border border-gray-200"
                        )}
                    >
                        {/* 반짝이 효과 (epic 이상) */}
                        {(toast.badge.rarity === "legendary" || toast.badge.rarity === "epic") && (
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute -top-2 -left-2 animate-pulse">
                                    <Sparkles className="h-4 w-4 text-yellow-400 opacity-60" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 animate-pulse delay-300">
                                    <Sparkles className="h-3 w-3 text-yellow-400 opacity-40" />
                                </div>
                            </div>
                        )}

                        <div className="p-4 flex items-start gap-3">
                            {/* 배지 아이콘 */}
                            <div className={cn(
                                "flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-3xl",
                                "shadow-inner",
                                rarityConfig.bgColor
                            )}>
                                {toast.badge.icon}
                            </div>

                            {/* 내용 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                                        rarityConfig.bgColor,
                                        rarityConfig.color
                                    )}>
                                        {rarityConfig.label}
                                    </span>
                                    <span className="text-xs text-gray-500">배지 획득!</span>
                                </div>
                                <h4 className={cn(
                                    "font-bold text-base leading-tight",
                                    toast.badge.rarity === "legendary" && "text-yellow-700",
                                    toast.badge.rarity === "epic" && "text-purple-700",
                                    toast.badge.rarity === "rare" && "text-blue-700",
                                    toast.badge.rarity === "common" && "text-gray-700"
                                )}>
                                    {toast.badge.name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                    {toast.badge.description}
                                </p>
                            </div>

                            {/* 닫기 버튼 */}
                            <button
                                onClick={() => handleClose(toast.id)}
                                className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>

                        {/* 하단 프로그레스 바 (자동 닫힘 표시) */}
                        <div className="h-1 bg-black/5">
                            <div
                                className={cn(
                                    "h-full transition-all duration-[4000ms] ease-linear",
                                    toast.badge.rarity === "legendary" && "bg-yellow-400",
                                    toast.badge.rarity === "epic" && "bg-purple-400",
                                    toast.badge.rarity === "rare" && "bg-blue-400",
                                    toast.badge.rarity === "common" && "bg-gray-400"
                                )}
                                style={{
                                    width: toast.visible ? "0%" : "100%",
                                    transition: toast.visible ? "width 4s linear" : "none",
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
