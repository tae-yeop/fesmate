"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from "react";
import { Notification, NotificationType } from "@/types/notification";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import { useDevContext } from "./dev-context";
import { PARTICIPATION_LABELS } from "@/types/participation";

// ===== Context =====

interface NotificationContextValue {
    /** 현재 사용자의 알림 목록 */
    notifications: Notification[];
    /** 읽지 않은 알림 수 */
    unreadCount: number;
    /** 알림 읽음 처리 */
    markAsRead: (id: string) => void;
    /** 모든 알림 읽음 처리 */
    markAllAsRead: () => void;
    /** 알림 삭제 */
    deleteNotification: (id: string) => void;
    /** 알림 추가 (내부 사용) */
    addNotification: (notification: Omit<Notification, "id" | "createdAt" | "isRead">) => void;
    /** 참여 수락 알림 생성 */
    notifyParticipationAccepted: (params: {
        applicantId: string;
        authorNickname: string;
        postType: string;
        postId: string;
    }) => void;
    /** 참여 거절 알림 생성 */
    notifyParticipationDeclined: (params: {
        applicantId: string;
        postType: string;
        postId: string;
    }) => void;
    /** 활동 리마인더 알림 생성 (24시간/1시간 전) */
    notifyParticipationReminder: (params: {
        userId: string;
        postType: string;
        postId: string;
        scheduledAt: Date;
        location?: string;
        reminderType: "1d" | "1h";
    }) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY_NOTIFICATIONS = "fesmate_notifications";

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { mockUserId } = useDevContext();
    const currentUserId = mockUserId || "user1";

    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [isInitialized, setIsInitialized] = useState(false);

    // localStorage에서 불러오기
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(
                    parsed.map((n: Notification) => ({
                        ...n,
                        createdAt: new Date(n.createdAt),
                    }))
                );
            } catch {
                console.error("Failed to parse notifications from localStorage");
            }
        }
        setIsInitialized(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
        }
    }, [notifications, isInitialized]);

    // 현재 사용자의 알림만 필터링
    const userNotifications = notifications.filter(n => n.userId === currentUserId);
    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    // 알림 읽음 처리
    const markAsRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
    }, []);

    // 모든 알림 읽음 처리
    const markAllAsRead = useCallback(() => {
        setNotifications(prev =>
            prev.map(n => n.userId === currentUserId ? { ...n, isRead: true } : n)
        );
    }, [currentUserId]);

    // 알림 삭제
    const deleteNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // 알림 추가
    const addNotification = useCallback(
        (notification: Omit<Notification, "id" | "createdAt" | "isRead">) => {
            const newNotification: Notification = {
                ...notification,
                id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date(),
                isRead: false,
            };
            setNotifications(prev => [newNotification, ...prev]);
        },
        []
    );

    // 참여 수락 알림 생성
    const notifyParticipationAccepted = useCallback(
        (params: {
            applicantId: string;
            authorNickname: string;
            postType: string;
            postId: string;
        }) => {
            const label = PARTICIPATION_LABELS[params.postType] || { noun: "참여", icon: "📋" };
            addNotification({
                userId: params.applicantId,
                type: "participation_accepted",
                postId: params.postId,
                title: `${label.icon} ${label.noun} 신청이 수락되었어요!`,
                body: `${params.authorNickname}님이 신청을 수락했어요. 일정을 확인하세요.`,
                deepLink: `/community?participation=true&postId=${params.postId}`,
            });
        },
        [addNotification]
    );

    // 참여 거절 알림 생성
    const notifyParticipationDeclined = useCallback(
        (params: {
            applicantId: string;
            postType: string;
            postId: string;
        }) => {
            const label = PARTICIPATION_LABELS[params.postType] || { noun: "참여", icon: "📋" };
            addNotification({
                userId: params.applicantId,
                type: "participation_declined",
                postId: params.postId,
                title: `${label.noun} 신청 결과`,
                body: "아쉽게도 이번 신청이 거절되었어요. 다른 모집글을 찾아보세요!",
                deepLink: `/community`,
            });
        },
        [addNotification]
    );

    // 활동 리마인더 알림 생성
    const notifyParticipationReminder = useCallback(
        (params: {
            userId: string;
            postType: string;
            postId: string;
            scheduledAt: Date;
            location?: string;
            reminderType: "1d" | "1h";
        }) => {
            const label = PARTICIPATION_LABELS[params.postType] || { noun: "활동", icon: "📋" };
            const timeStr = new Intl.DateTimeFormat("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(params.scheduledAt));

            const isOneHour = params.reminderType === "1h";
            const title = isOneHour
                ? `⏰ 1시간 후 ${label.noun}!`
                : `📅 내일 ${timeStr} ${label.noun}이 있어요!`;

            let body = isOneHour
                ? `${timeStr}에 ${label.noun}이 시작돼요!`
                : `${label.icon} ${label.noun} 일정을 확인하세요.`;

            if (params.location) {
                body += ` 장소: ${params.location}`;
            }

            addNotification({
                userId: params.userId,
                type: isOneHour ? "participation_reminder_1h" : "participation_reminder_1d",
                postId: params.postId,
                title,
                body,
                deepLink: `/community?participation=true&postId=${params.postId}`,
            });
        },
        [addNotification]
    );

    return (
        <NotificationContext.Provider
            value={{
                notifications: userNotifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                addNotification,
                notifyParticipationAccepted,
                notifyParticipationDeclined,
                notifyParticipationReminder,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotification must be used within NotificationProvider");
    }
    return context;
}
