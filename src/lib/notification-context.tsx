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
import { Notification, NotificationType, isQuietHours, URGENT_NOTIFICATION_TYPES } from "@/types/notification";
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
import { useNotifications as useRealtimeNotifications } from "./supabase/hooks";

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
    /** 슬롯 시작 알림 생성 (10분 전) */
    notifySlotReminder: (params: {
        userId: string;
        eventId: string;
        slotId: string;
        slotTitle: string;
        artistName?: string;
        stageName?: string;
        startAt: Date;
    }) => void;
    /** 슬롯 리마인더 스케줄링 */
    scheduleSlotReminder: (params: {
        userId: string;
        eventId: string;
        slotId: string;
        slotTitle: string;
        artistName?: string;
        stageName?: string;
        startAt: Date;
    }) => () => void; // cleanup function 반환
    /** 스케줄된 슬롯 알림 취소 */
    cancelSlotReminder: (slotId: string) => void;
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

    // 실시간 알림 구독 (로그인 사용자만)
    // Realtime은 Database 테이블 Row 타입을 반환하므로 DbNotification으로 변환 후 사용
    const handleNewNotification = useCallback((dbRow: {
        id: string;
        user_id: string;
        type: string;
        event_id?: string | null;
        post_id?: string | null;
        slot_id?: string | null;
        title: string;
        body: string;
        image_url?: string | null;
        deep_link?: string | null;
        is_read: boolean;
        dedupe_key?: string | null;
        priority?: string | null;
        created_at: string;
    }) => {
        console.log("[NotificationContext] Realtime: New notification received:", dbRow.id);
        // DB Row를 DbNotification 형태로 변환
        const dbNotification: DbNotification = {
            id: dbRow.id,
            userId: dbRow.user_id,
            type: dbRow.type as DbNotification["type"],
            eventId: dbRow.event_id ?? undefined,
            postId: dbRow.post_id ?? undefined,
            slotId: dbRow.slot_id ?? undefined,
            title: dbRow.title,
            body: dbRow.body,
            imageUrl: dbRow.image_url ?? undefined,
            deepLink: dbRow.deep_link ?? undefined,
            isRead: dbRow.is_read,
            priority: (dbRow.priority as "normal" | "high") ?? "normal",
            createdAt: new Date(dbRow.created_at),
        };
        const transformed = transformDbNotification(dbNotification);
        // 중복 체크 후 추가
        setNotifications(prev => {
            if (prev.some(n => n.id === transformed.id)) {
                return prev;
            }
            return [transformed, ...prev];
        });
    }, []);

    useRealtimeNotifications({
        userId: user?.id || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onNewNotification: user ? handleNewNotification as any : undefined,
    });

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

    // 보류된 알림 저장 (Quiet Hours 중)
    const deferredNotificationsRef = useRef<Notification[]>([]);

    // Quiet Hours 종료 시 보류 알림 발송
    useEffect(() => {
        const checkAndReleaseDeferred = () => {
            if (!isQuietHours() && deferredNotificationsRef.current.length > 0) {
                console.log(`[NotificationContext] Releasing ${deferredNotificationsRef.current.length} deferred notifications`);
                const toRelease = [...deferredNotificationsRef.current];
                deferredNotificationsRef.current = [];
                setNotifications(prev => [...toRelease, ...prev]);
            }
        };

        // 매 분마다 확인
        const interval = setInterval(checkAndReleaseDeferred, 60000);
        // 초기 확인
        checkAndReleaseDeferred();

        return () => clearInterval(interval);
    }, []);

    // 알림 추가 (로컬에서만 - Supabase는 서버 트리거로 생성)
    // Quiet Hours 및 dedupe_key 처리 포함
    const addNotification = useCallback(
        (notification: Omit<Notification, "id" | "createdAt" | "isRead">) => {
            const now = new Date();
            const isUrgent = URGENT_NOTIFICATION_TYPES.includes(notification.type);

            // Quiet Hours 체크 (긴급 알림 제외)
            if (isQuietHours(now) && !isUrgent) {
                console.log(`[NotificationContext] Quiet Hours - deferring notification: ${notification.type}`);
                const deferredNotification: Notification = {
                    ...notification,
                    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: now,
                    isRead: false,
                    deferredFromQuietHours: true,
                };
                deferredNotificationsRef.current.push(deferredNotification);
                return;
            }

            // dedupe_key 체크 - 같은 키가 있으면 기존 알림 업데이트
            if (notification.dedupeKey) {
                setNotifications(prev => {
                    const existingIndex = prev.findIndex(
                        n => n.dedupeKey === notification.dedupeKey && n.userId === notification.userId
                    );

                    if (existingIndex !== -1) {
                        // 기존 알림 업데이트 (groupCount 증가)
                        const existing = prev[existingIndex];
                        const updatedNotification: Notification = {
                            ...existing,
                            groupCount: (existing.groupCount || 1) + 1,
                            body: notification.body, // 최신 body로 업데이트
                            createdAt: now, // 시간 갱신
                            isRead: false, // 다시 읽지 않음으로
                        };
                        console.log(`[NotificationContext] Dedupe - updating existing notification, count: ${updatedNotification.groupCount}`);

                        // 기존 위치에서 제거하고 맨 앞에 추가
                        const newList = [...prev];
                        newList.splice(existingIndex, 1);
                        return [updatedNotification, ...newList];
                    }

                    // 새 알림 추가
                    const newNotification: Notification = {
                        ...notification,
                        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        createdAt: now,
                        isRead: false,
                        groupCount: 1,
                    };
                    return [newNotification, ...prev];
                });
                return;
            }

            // 일반 알림 추가
            const newNotification: Notification = {
                ...notification,
                id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: now,
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

    // 슬롯 시작 알림 생성 (10분 전)
    const notifySlotReminder = useCallback(
        (params: {
            userId: string;
            eventId: string;
            slotId: string;
            slotTitle: string;
            artistName?: string;
            stageName?: string;
            startAt: Date;
        }) => {
            const timeStr = new Intl.DateTimeFormat("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(params.startAt));

            const displayTitle = params.artistName || params.slotTitle;
            const stageInfo = params.stageName ? ` @ ${params.stageName}` : "";

            addNotification({
                userId: params.userId,
                type: "slot_start_reminder",
                eventId: params.eventId,
                slotId: params.slotId,
                title: `🎵 10분 후 공연!`,
                body: `${displayTitle}${stageInfo} - ${timeStr} 시작`,
                deepLink: `/event/${params.eventId}?tab=timetable&slot=${params.slotId}`,
            });
        },
        [addNotification]
    );

    // 스케줄된 슬롯 알림 타이머 관리
    const slotReminderTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // 슬롯 리마인더 스케줄링 (10분 전 알림)
    const scheduleSlotReminder = useCallback(
        (params: {
            userId: string;
            eventId: string;
            slotId: string;
            slotTitle: string;
            artistName?: string;
            stageName?: string;
            startAt: Date;
        }) => {
            const now = Date.now();
            const startTime = new Date(params.startAt).getTime();
            const reminderTime = startTime - 10 * 60 * 1000; // 10분 전
            const delay = reminderTime - now;

            // 이미 지났거나 1분 이내면 스케줄 안함
            if (delay < 60 * 1000) {
                console.log(`[NotificationContext] Slot reminder skipped (too late): ${params.slotId}`);
                return () => {};
            }

            // 기존 타이머가 있으면 제거
            const existingTimer = slotReminderTimersRef.current.get(params.slotId);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            console.log(`[NotificationContext] Scheduling slot reminder for ${params.slotId} in ${Math.round(delay / 60000)}min`);

            const timer = setTimeout(() => {
                notifySlotReminder(params);
                slotReminderTimersRef.current.delete(params.slotId);
            }, delay);

            slotReminderTimersRef.current.set(params.slotId, timer);

            // cleanup function 반환
            return () => {
                clearTimeout(timer);
                slotReminderTimersRef.current.delete(params.slotId);
            };
        },
        [notifySlotReminder]
    );

    // 스케줄된 슬롯 알림 취소
    const cancelSlotReminder = useCallback((slotId: string) => {
        const timer = slotReminderTimersRef.current.get(slotId);
        if (timer) {
            clearTimeout(timer);
            slotReminderTimersRef.current.delete(slotId);
            console.log(`[NotificationContext] Slot reminder cancelled: ${slotId}`);
        }
    }, []);

    // 컴포넌트 언마운트 시 모든 타이머 정리
    useEffect(() => {
        return () => {
            slotReminderTimersRef.current.forEach((timer) => {
                clearTimeout(timer);
            });
            slotReminderTimersRef.current.clear();
        };
    }, []);

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
                notifySlotReminder,
                scheduleSlotReminder,
                cancelSlotReminder,
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
