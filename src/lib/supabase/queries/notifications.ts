/**
 * Notifications Query Functions
 *
 * 알림 Supabase 쿼리
 */

import { createClient } from "../client";
import type { NotificationType } from "@/types/notification";

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    eventId?: string;
    postId?: string;
    slotId?: string;
    title: string;
    body: string;
    imageUrl?: string;
    deepLink?: string;
    isRead: boolean;
    dedupeKey?: string;
    priority: "normal" | "high";
    createdAt: Date;
}

/**
 * DB 레코드를 Notification으로 변환
 */
function transformDbNotification(
    dbNotification: Record<string, unknown>
): Notification {
    return {
        id: dbNotification.id as string,
        userId: dbNotification.user_id as string,
        type: dbNotification.type as NotificationType,
        eventId: dbNotification.event_id as string | undefined,
        postId: dbNotification.post_id as string | undefined,
        slotId: dbNotification.slot_id as string | undefined,
        title: dbNotification.title as string,
        body: dbNotification.body as string,
        imageUrl: dbNotification.image_url as string | undefined,
        deepLink: dbNotification.deep_link as string | undefined,
        isRead: (dbNotification.is_read as boolean) ?? false,
        dedupeKey: dbNotification.dedupe_key as string | undefined,
        priority: (dbNotification.priority as "normal" | "high") ?? "normal",
        createdAt: new Date(dbNotification.created_at as string),
    };
}

/**
 * 사용자의 모든 알림 조회
 */
export async function getUserNotifications(
    userId: string,
    options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }
): Promise<Notification[]> {
    const supabase = createClient();

    let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (options?.unreadOnly) {
        query = query.eq("is_read", false);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(
            options.offset,
            options.offset + (options.limit || 20) - 1
        );
    }

    const { data, error } = await query;

    if (error) {
        console.error("[getUserNotifications] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbNotification);
}

/**
 * 안읽은 알림 개수 조회
 */
export async function getUnreadNotificationCount(
    userId: string
): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) {
        console.error("[getUnreadNotificationCount] Error:", error);
        throw error;
    }

    return count ?? 0;
}

/**
 * 알림 읽음 처리
 */
export async function markNotificationAsRead(
    notificationId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

    if (error) {
        console.error("[markNotificationAsRead] Error:", error);
        throw error;
    }
}

/**
 * 사용자의 모든 알림 읽음 처리
 */
export async function markAllNotificationsAsRead(
    userId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) {
        console.error("[markAllNotificationsAsRead] Error:", error);
        throw error;
    }
}

/**
 * 알림 삭제
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

    if (error) {
        console.error("[deleteNotification] Error:", error);
        throw error;
    }
}

/**
 * 모든 알림 삭제 (사용자별)
 */
export async function deleteAllNotifications(userId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId);

    if (error) {
        console.error("[deleteAllNotifications] Error:", error);
        throw error;
    }
}

/**
 * 알림 생성 (보통 서버 트리거에서 처리하지만, 클라이언트 테스트용)
 * 주의: RLS 정책에 따라 service_role에서만 가능할 수 있음
 */
export async function createNotification(notification: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    eventId?: string;
    postId?: string;
    slotId?: string;
    imageUrl?: string;
    deepLink?: string;
    priority?: "normal" | "high";
    dedupeKey?: string;
}): Promise<Notification> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("notifications")
        .insert({
            user_id: notification.userId,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            event_id: notification.eventId,
            post_id: notification.postId,
            slot_id: notification.slotId,
            image_url: notification.imageUrl,
            deep_link: notification.deepLink,
            priority: notification.priority ?? "normal",
            dedupe_key: notification.dedupeKey,
        })
        .select()
        .single();

    if (error) {
        console.error("[createNotification] Error:", error);
        throw error;
    }

    return transformDbNotification(data);
}
