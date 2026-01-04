/**
 * 콜가이드 푸시 알림 유틸리티
 * - 공연 시작 전 알림 스케줄링
 * - 다음 콜 알림
 */

import { showLocalNotification } from "./service-worker";

// 스케줄된 알림 관리 (메모리에 저장)
const scheduledNotifications = new Map<string, ReturnType<typeof setTimeout>>();

export interface CallGuideNotificationParams {
    /** 슬롯 ID (알림 식별용) */
    slotId: string;
    /** 아티스트 이름 */
    artistName: string;
    /** 곡 제목 */
    songTitle: string;
    /** 공연 시작 시간 */
    startAt: Date;
    /** 딥링크 URL */
    deepLink?: string;
}

/**
 * 공연 시작 전 알림 스케줄링
 * - 10분 전, 5분 전 알림
 */
export function scheduleCallGuideReminders(params: CallGuideNotificationParams): () => void {
    const { slotId, artistName, songTitle, startAt, deepLink } = params;
    const now = Date.now();
    const startTime = startAt.getTime();

    const cleanups: (() => void)[] = [];

    // 10분 전 알림
    const tenMinBefore = startTime - 10 * 60 * 1000;
    if (tenMinBefore > now) {
        const key10 = `callguide-10min-${slotId}`;
        const timeout10 = setTimeout(() => {
            showLocalNotification(`${artistName} 공연 10분 전!`, {
                body: `🎤 ${songTitle} 콜가이드를 확인하세요`,
                icon: "/icons/icon-192x192.png",
                tag: key10,
                data: {
                    deepLink: deepLink || `/call-guide`,
                    type: "call_guide_reminder",
                },
            });
            scheduledNotifications.delete(key10);
        }, tenMinBefore - now);

        scheduledNotifications.set(key10, timeout10);
        cleanups.push(() => {
            clearTimeout(timeout10);
            scheduledNotifications.delete(key10);
        });
    }

    // 5분 전 알림
    const fiveMinBefore = startTime - 5 * 60 * 1000;
    if (fiveMinBefore > now) {
        const key5 = `callguide-5min-${slotId}`;
        const timeout5 = setTimeout(() => {
            showLocalNotification(`${artistName} 곧 시작!`, {
                body: `⏰ 5분 후 공연 시작 - 콜가이드 준비하세요`,
                icon: "/icons/icon-192x192.png",
                tag: key5,
                requireInteraction: true,
                data: {
                    deepLink: deepLink || `/call-guide`,
                    type: "call_guide_reminder",
                },
            });
            scheduledNotifications.delete(key5);
        }, fiveMinBefore - now);

        scheduledNotifications.set(key5, timeout5);
        cleanups.push(() => {
            clearTimeout(timeout5);
            scheduledNotifications.delete(key5);
        });
    }

    // 공연 시작 알림
    if (startTime > now) {
        const keyStart = `callguide-start-${slotId}`;
        const timeoutStart = setTimeout(() => {
            showLocalNotification(`${artistName} 시작!`, {
                body: `🎵 지금 콜 시작!`,
                icon: "/icons/icon-192x192.png",
                tag: keyStart,
                requireInteraction: true,
                data: {
                    deepLink: deepLink || `/call-guide`,
                    type: "call_guide_start",
                },
            });
            scheduledNotifications.delete(keyStart);
        }, startTime - now);

        scheduledNotifications.set(keyStart, timeoutStart);
        cleanups.push(() => {
            clearTimeout(timeoutStart);
            scheduledNotifications.delete(keyStart);
        });
    }

    // 정리 함수 반환
    return () => {
        cleanups.forEach((cleanup) => cleanup());
    };
}

/**
 * 특정 슬롯의 모든 예약된 알림 취소
 */
export function cancelCallGuideReminders(slotId: string): void {
    const keys = [
        `callguide-10min-${slotId}`,
        `callguide-5min-${slotId}`,
        `callguide-start-${slotId}`,
    ];

    keys.forEach((key) => {
        const timeout = scheduledNotifications.get(key);
        if (timeout) {
            clearTimeout(timeout);
            scheduledNotifications.delete(key);
        }
    });
}

/**
 * 모든 예약된 콜가이드 알림 취소
 */
export function cancelAllCallGuideReminders(): void {
    scheduledNotifications.forEach((timeout, key) => {
        if (key.startsWith("callguide-")) {
            clearTimeout(timeout);
            scheduledNotifications.delete(key);
        }
    });
}

/**
 * 다음 콜 타이밍 알림 (재생 중일 때)
 */
export function notifyUpcomingCall(
    callText: string,
    timeUntilCall: number, // 밀리초
    options?: {
        instruction?: string;
        intensity?: "low" | "medium" | "high";
    }
): () => void {
    // 5초 전에 알림
    const notifyBefore = 5000;
    const delay = Math.max(0, timeUntilCall - notifyBefore);

    if (delay <= 0) return () => {};

    const key = `call-${Date.now()}`;
    const timeout = setTimeout(() => {
        const intensityEmoji = {
            low: "🙌",
            medium: "🔥",
            high: "💥",
        };

        const emoji = options?.intensity ? intensityEmoji[options.intensity] : "📢";
        const title = `${emoji} 다음 콜!`;

        showLocalNotification(title, {
            body: callText,
            icon: "/icons/icon-192x192.png",
            tag: "upcoming-call",
            silent: false,
        });

        scheduledNotifications.delete(key);
    }, delay);

    scheduledNotifications.set(key, timeout);

    return () => {
        clearTimeout(timeout);
        scheduledNotifications.delete(key);
    };
}

/**
 * 콜가이드 학습 모드 완료 알림
 */
export function notifyPracticeComplete(
    artistName: string,
    songTitle: string,
    accuracy?: number
): void {
    const message = accuracy
        ? `${songTitle} 연습 완료! 정확도 ${accuracy}%`
        : `${songTitle} 연습이 완료되었습니다`;

    showLocalNotification(`${artistName} 콜가이드 연습 완료`, {
        body: message,
        icon: "/icons/icon-192x192.png",
        tag: "practice-complete",
    });
}
