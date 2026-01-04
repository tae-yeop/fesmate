"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { usePush } from "@/lib/push-context";
import { cn } from "@/lib/utils";

/**
 * 알림 권한 요청 배너
 * - 최초 방문 시 또는 권한 미허용 상태에서 표시
 * - 닫으면 24시간 후 다시 표시
 */
export function NotificationPermissionBanner() {
    const {
        isPushSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
    } = usePush();
    const [isVisible, setIsVisible] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        if (isLoading) return;

        // 푸시 미지원 또는 이미 허용됨
        if (!isPushSupported || permission === "granted") {
            setIsVisible(false);
            return;
        }

        // 거부됨 - 표시 안함
        if (permission === "denied") {
            setIsVisible(false);
            return;
        }

        // 닫은 기록 확인
        const dismissedAt = localStorage.getItem("fesmate:notification-banner-dismissed");
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            const hoursSince = (Date.now() - dismissedTime) / (1000 * 60 * 60);
            if (hoursSince < 24) {
                setIsVisible(false);
                return;
            }
        }

        // 표시
        setIsVisible(true);
    }, [isPushSupported, permission, isLoading]);

    const handleEnable = async () => {
        setIsRequesting(true);
        try {
            const success = await subscribe();
            if (success) {
                setIsVisible(false);
            }
        } finally {
            setIsRequesting(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem("fesmate:notification-banner-dismissed", Date.now().toString());
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:bottom-4 md:w-96">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-full">
                        <Bell className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm">
                            알림을 켜시겠어요?
                        </h3>
                        <p className="mt-1 text-xs text-gray-600">
                            공연 시작 전, 예매 오픈 알림을 받아보세요
                        </p>
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={handleEnable}
                                disabled={isRequesting}
                                className={cn(
                                    "flex-1 px-3 py-2 text-sm font-medium rounded-lg",
                                    "bg-indigo-600 text-white hover:bg-indigo-700",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {isRequesting ? "요청 중..." : "알림 켜기"}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                나중에
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * 알림 권한 상태 표시 컴포넌트 (설정 페이지용)
 */
export function NotificationPermissionStatus() {
    const {
        isPushSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    } = usePush();
    const [isProcessing, setIsProcessing] = useState(false);

    if (isLoading) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="h-5 w-32 bg-gray-200 rounded" />
            </div>
        );
    }

    if (!isPushSupported) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                    <BellOff className="h-5 w-5 text-gray-400" />
                    <div>
                        <p className="font-medium text-gray-700">알림 미지원</p>
                        <p className="text-sm text-gray-500">
                            이 브라우저에서는 푸시 알림을 지원하지 않습니다
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const handleToggle = async () => {
        setIsProcessing(true);
        try {
            if (isSubscribed) {
                await unsubscribe();
            } else {
                await subscribe();
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusText = () => {
        if (permission === "denied") {
            return { title: "알림 차단됨", desc: "브라우저 설정에서 알림을 허용해주세요" };
        }
        if (isSubscribed) {
            return { title: "알림 켜짐", desc: "공연/행사 알림을 받고 있습니다" };
        }
        return { title: "알림 꺼짐", desc: "알림을 켜면 중요한 소식을 받을 수 있습니다" };
    };

    const status = getStatusText();

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isSubscribed ? (
                        <Bell className="h-5 w-5 text-indigo-600" />
                    ) : (
                        <BellOff className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                        <p className="font-medium text-gray-900">{status.title}</p>
                        <p className="text-sm text-gray-500">{status.desc}</p>
                    </div>
                </div>
                {permission !== "denied" && (
                    <button
                        onClick={handleToggle}
                        disabled={isProcessing}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                            isSubscribed
                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                : "bg-indigo-600 text-white hover:bg-indigo-700",
                            isProcessing && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isProcessing
                            ? "처리 중..."
                            : isSubscribed
                            ? "끄기"
                            : "켜기"}
                    </button>
                )}
            </div>
        </div>
    );
}
