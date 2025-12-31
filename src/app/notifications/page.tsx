"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
    Bell,
    Calendar,
    Clock,
    MessageCircle,
    Megaphone,
    Users,
    AlertCircle,
    XCircle,
    Ticket,
    ChevronLeft,
    Check,
    Trash2,
    CheckCircle,
    Ban,
    RefreshCw,
    AlarmClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotification } from "@/lib/notification-context";
import { Notification, NotificationType, NOTIFICATION_CONFIG } from "@/types/notification";

type FilterType = "all" | "unread";

// 아이콘 매핑
const ICON_MAP: Record<string, React.ElementType> = {
    Ticket,
    Calendar,
    Clock,
    Megaphone,
    MessageCircle,
    Users,
    AlertCircle,
    XCircle,
    TrendingUp: AlertCircle, // fallback
    Shield: AlertCircle,     // fallback
    CalendarClock: Calendar, // fallback
    // 참여 관련 아이콘
    CheckCircle,
    Ban,
    RefreshCw,
    AlarmClock,
};

/**
 * 알림 페이지 - PRD v0.5 기준
 * - 인앱 알림함
 * - 읽음/안읽음 상태
 * - 딥링크 라우팅
 */
export default function NotificationsPage() {
    const [filter, setFilter] = useState<FilterType>("all");
    const [isClient, setIsClient] = useState(false);

    // NotificationContext에서 상태와 함수 가져오기
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotification();

    // Hydration 에러 방지: 클라이언트에서만 시간 계산
    useEffect(() => {
        setIsClient(true);
    }, []);

    // 필터링
    const filteredNotifications = useMemo(() => {
        if (filter === "unread") {
            return notifications.filter(n => !n.isRead);
        }
        return notifications;
    }, [notifications, filter]);

    // 상대 시간 (클라이언트에서만 계산)
    const getRelativeTime = (date: Date) => {
        if (!isClient) return ""; // 서버 렌더링 시 빈 문자열

        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return "방금 전";
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(date));
    };

    // 날짜별 그룹화
    const groupedNotifications = useMemo(() => {
        const groups: { label: string; items: Notification[] }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayItems: Notification[] = [];
        const yesterdayItems: Notification[] = [];
        const olderItems: Notification[] = [];

        filteredNotifications.forEach(n => {
            const nDate = new Date(n.createdAt);
            nDate.setHours(0, 0, 0, 0);

            if (nDate.getTime() === today.getTime()) {
                todayItems.push(n);
            } else if (nDate.getTime() === yesterday.getTime()) {
                yesterdayItems.push(n);
            } else {
                olderItems.push(n);
            }
        });

        if (todayItems.length > 0) groups.push({ label: "오늘", items: todayItems });
        if (yesterdayItems.length > 0) groups.push({ label: "어제", items: yesterdayItems });
        if (olderItems.length > 0) groups.push({ label: "이전", items: olderItems });

        return groups;
    }, [filteredNotifications]);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 헤더 */}
            <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-3">
                    <Link href="/" className="text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-lg font-bold">알림</h1>
                    {unreadCount > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-sm text-primary hover:underline"
                    >
                        모두 읽음
                    </button>
                )}
            </header>

            {/* 필터 */}
            <div className="flex gap-2 px-4 py-3 border-b">
                {[
                    { key: "all" as FilterType, label: "전체" },
                    { key: "unread" as FilterType, label: `안읽음 (${unreadCount})` },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            filter === f.key
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* 알림 목록 */}
            <div className="divide-y">
                {groupedNotifications.length > 0 ? (
                    groupedNotifications.map(group => (
                        <div key={group.label}>
                            <div className="px-4 py-2 bg-muted/50">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {group.label}
                                </span>
                            </div>
                            {group.items.map(notification => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onRead={markAsRead}
                                    onDelete={deleteNotification}
                                    getRelativeTime={getRelativeTime}
                                />
                            ))}
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Bell className="h-12 w-12 mb-3 opacity-30" />
                        <p className="font-medium">알림이 없습니다</p>
                        <p className="text-sm mt-1">새로운 소식이 오면 알려드릴게요</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// 알림 아이템 컴포넌트
function NotificationItem({
    notification,
    onRead,
    onDelete,
    getRelativeTime,
}: {
    notification: Notification;
    onRead: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    getRelativeTime: (date: Date) => string;
}) {
    const config = NOTIFICATION_CONFIG[notification.type];
    const IconComponent = ICON_MAP[config.icon] || Bell;

    const handleClick = () => {
        if (!notification.isRead) {
            void onRead(notification.id);
        }
    };

    return (
        <div
            className={cn(
                "relative flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors",
                !notification.isRead && "bg-primary/5"
            )}
        >
            {/* 읽지 않음 표시 */}
            {!notification.isRead && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
            )}

            {/* 아이콘 */}
            <div className={cn("flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center", config.color)}>
                <IconComponent className="h-5 w-5" />
            </div>

            {/* 내용 */}
            <Link
                href={notification.deepLink || "#"}
                onClick={handleClick}
                className="flex-1 min-w-0"
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "text-sm line-clamp-1",
                            !notification.isRead && "font-medium"
                        )}>
                            {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {getRelativeTime(notification.createdAt)}
                        </p>
                    </div>
                </div>
            </Link>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-1">
                {!notification.isRead && (
                    <button
                        onClick={() => void onRead(notification.id)}
                        className="p-1 text-muted-foreground hover:text-primary rounded"
                        title="읽음으로 표시"
                    >
                        <Check className="h-4 w-4" />
                    </button>
                )}
                <button
                    onClick={() => void onDelete(notification.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 rounded"
                    title="삭제"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
