"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    ReactNode,
} from "react";
import { Notification, NotificationType } from "@/types/notification";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import { useDevContext } from "./dev-context";
import { useAuth } from "./auth-context";
import { PARTICIPATION_LABELS } from "@/types/participation";
import { createSharedAdapter, DOMAINS } from "./storage";
import { isValidUUID } from "./utils";
import {
    getUserNotifications as getNotificationsFromDB,
    markNotificationAsRead as markAsReadInDB,
    markAllNotificationsAsRead as markAllAsReadInDB,
    deleteNotification as deleteNotificationInDB,
    getUnreadNotificationCount,
    Notification as DbNotification,
} from "./supabase/queries/notifications";

// ===== Context =====

interface NotificationContextValue {
    /** 현재 사용자의 알림 목록 */
    notifications: Notification[];
    /** 읽지 않은 알림 수 */
    unreadCount: number;
    /** 알림 읽음 처리 */
    markAsRead: (id: string) => Promise<void>;
    /** 모든 알림 읽음 처리 */
    markAllAsRead: () => Promise<void>;
    /** 알림 삭제 */
    deleteNotification: (id: string) => Promise<void>;
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
    /** 로딩 상태 */
    loading: boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Storage adapter (전역 공유 데이터 - 비로그인 시 사용)
const notificationsAdapter = createSharedAdapter<Notification[]>({
    domain: DOMAINS.NOTIFICATIONS,
    dateFields: ["createdAt"],
});

/**
 * DB Notification을 Context Notification 타입으로 변환
 */
function transformDbNotification(dbNotification: DbNotification): Notification {
    return {
        id: dbNotification.id,
        userId: dbNotification.userId,
        type: dbNotification.type,
        eventId: dbNotification.eventId,
        postId: dbNotification.postId,
        slotId: dbNotification.slotId,
        title: dbNotification.title,
        body: dbNotification.body,
        imageUrl: dbNotification.imageUrl,
        deepLink: dbNotification.deepLink,
        isRead: dbNotification.isRead,
        createdAt: dbNotification.createdAt,
    };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { mockUserId } = useDevContext();
    const currentUserId = user?.id || mockUserId || "user1";

    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(false);

    // 첫 로드 여부 추적 (user 변경 시 localStorage 재로드 방지)
    const hasLoadedFromStorageRef = useRef(false);
    // 이전 user ID 추적 (실제 로그인/로그아웃 감지)
    const prevUserIdRef = useRef<string | null>(null);

    // 데이터 로드 (localStorage 기본 + 로그인 시 Supabase 병합)
    useEffect(() => {
        const loadNotifications = async () => {
            const currentUserId = user?.id ?? null;
            const isUserChange = prevUserIdRef.current !== currentUserId;
            prevUserIdRef.current = currentUserId;

            // 이미 localStorage에서 로드했고, 같은 사용자라면 스킵
            // (user가 undefined → 객체로 변경되는 초기 로드 시 재실행 방지)
            if (hasLoadedFromStorageRef.current && !isUserChange) {
                console.log("[NotificationContext] Skipping reload - already loaded");
                return;
            }

            setLoading(true);
            try {
                let localNotifications: Notification[];

                // localStorage에서 처음 로드하거나, 사용자가 변경된 경우
                if (!hasLoadedFromStorageRef.current) {
                    const stored = notificationsAdapter.get();
                    console.log("[NotificationContext] First load from storage:", stored?.length ?? 0, "items");
                    localNotifications = stored || MOCK_NOTIFICATIONS;
                    hasLoadedFromStorageRef.current = true;
                } else {
                    // 사용자 변경 시에는 현재 상태를 기반으로 (localStorage 데이터 유지)
                    console.log("[NotificationContext] User changed, keeping current notifications");
                    localNotifications = notifications;
                }

                if (user) {
                    // 로그인 시 Supabase에서도 로드하여 병합
                    try {
                        const dbNotifications = await getNotificationsFromDB(user.id, { limit: 100 });
                        const dbMapped = dbNotifications.map(transformDbNotification);
                        // DB 데이터가 있으면 병합, 없으면 로컬만 사용
                        if (dbMapped.length > 0) {
                            // DB 알림과 로컬 알림 병합 (ID 기준 중복 제거)
                            const dbIds = new Set(dbMapped.map(n => n.id));
                            const uniqueLocal = localNotifications.filter(n => !dbIds.has(n.id));
                            localNotifications = [...dbMapped, ...uniqueLocal];
                        }
                    } catch (dbError) {
                        console.warn("[NotificationContext] Supabase load failed, using local only:", dbError);
                    }
                }

                setNotifications(localNotifications);
            } catch (error) {
                console.error("[NotificationContext] Load failed:", error);
            } finally {
                setIsInitialized(true);
                setLoading(false);
            }
        };

        loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Storage에 항상 저장 (Mock 데이터 유지용)
    useEffect(() => {
        if (isInitialized) {
            console.log("[NotificationContext] Saving to storage:", notifications.length, "items, unread:", notifications.filter(n => !n.isRead).length);
            notificationsAdapter.set(notifications);
        }
    }, [notifications, isInitialized]);

    // 현재 사용자의 알림만 필터링
    // 로그아웃 상태 (user도 없고 mockUserId도 없으면)에서는 빈 배열 반환
    const isLoggedOut = !user && !mockUserId;
    const userNotifications = isLoggedOut
        ? []
        : notifications.filter(n => n.userId === currentUserId);
    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    // 알림 읽음 처리
    const markAsRead = useCallback(async (id: string) => {
        // Optimistic update
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (user && isValidUUID(id)) {
            try {
                await markAsReadInDB(id);
            } catch (error) {
                console.error("[NotificationContext] Mark as read failed:", error);
                // 롤백
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: false } : n)
                );
            }
        }
    }, [user]);

    // 모든 알림 읽음 처리
    const markAllAsRead = useCallback(async () => {
        const targetIds = notifications
            .filter(n => n.userId === currentUserId && !n.isRead)
            .map(n => n.id);

        // Optimistic update
        setNotifications(prev =>
            prev.map(n => n.userId === currentUserId ? { ...n, isRead: true } : n)
        );

        if (user) {
            try {
                await markAllAsReadInDB(user.id);
            } catch (error) {
                console.error("[NotificationContext] Mark all as read failed:", error);
                // 롤백
                setNotifications(prev =>
                    prev.map(n =>
                        targetIds.includes(n.id) ? { ...n, isRead: false } : n
                    )
                );
            }
        }
    }, [currentUserId, notifications, user]);

    // 알림 삭제
    const deleteNotification = useCallback(async (id: string) => {
        const deletedNotification = notifications.find(n => n.id === id);

        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (user && isValidUUID(id)) {
            try {
                await deleteNotificationInDB(id);
            } catch (error) {
                console.error("[NotificationContext] Delete failed:", error);
                // 롤백
                if (deletedNotification) {
                    setNotifications(prev => [...prev, deletedNotification]);
                }
            }
        }
    }, [notifications, user]);

    // 알림 추가 (로컬에서만 - Supabase는 서버 트리거로 생성)
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
                loading,
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
