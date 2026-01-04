/**
 * Supabase Realtime Subscription Hooks
 *
 * 데이터베이스 변경사항을 실시간으로 구독하는 React hooks
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "../client";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Database } from "@/types/database";

// Database 테이블 타입
type TableName = keyof Database["public"]["Tables"];
type TableRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];

// Realtime 이벤트 타입
type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions<T extends TableName> {
    /** 구독할 테이블 이름 */
    table: T;
    /** 구독할 이벤트 타입 (기본: "*" - 모든 이벤트) */
    event?: RealtimeEvent;
    /** 필터 조건 (예: "user_id=eq.xxx") */
    filter?: string;
    /** 초기 구독 건너뛰기 */
    skip?: boolean;
    /** INSERT 이벤트 콜백 */
    onInsert?: (payload: TableRow<T>) => void;
    /** UPDATE 이벤트 콜백 */
    onUpdate?: (payload: { old: Partial<TableRow<T>>; new: TableRow<T> }) => void;
    /** DELETE 이벤트 콜백 */
    onDelete?: (payload: Partial<TableRow<T>>) => void;
    /** 모든 변경 이벤트 콜백 */
    onChange?: (payload: RealtimePostgresChangesPayload<TableRow<T>>) => void;
}

interface UseRealtimeResult {
    /** 구독 상태 */
    status: "SUBSCRIBED" | "CONNECTING" | "CLOSED" | "ERROR";
    /** 에러 정보 */
    error: Error | null;
    /** 수동으로 채널 해제 */
    unsubscribe: () => void;
}

/**
 * 테이블 변경사항 실시간 구독 훅
 *
 * @example
 * ```tsx
 * // 모든 이벤트 구독
 * const { status } = useRealtime({
 *   table: "events",
 *   onChange: (payload) => console.log("Change:", payload)
 * });
 *
 * // 특정 사용자의 알림만 구독
 * const { status } = useRealtime({
 *   table: "notifications",
 *   filter: `user_id=eq.${userId}`,
 *   onInsert: (notification) => showToast(notification.message)
 * });
 * ```
 */
export function useRealtime<T extends TableName>(
    options: UseRealtimeOptions<T>
): UseRealtimeResult {
    const { table, event = "*", filter, skip = false, onInsert, onUpdate, onDelete, onChange } =
        options;

    const [status, setStatus] = useState<UseRealtimeResult["status"]>("CONNECTING");
    const [error, setError] = useState<Error | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const unsubscribe = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
            setStatus("CLOSED");
        }
    }, []);

    useEffect(() => {
        if (skip) {
            setStatus("CLOSED");
            return;
        }

        const supabase = createClient();
        const channelName = `realtime:${table}:${filter || "all"}`;

        // 기존 채널 정리
        if (channelRef.current) {
            channelRef.current.unsubscribe();
        }

        // Supabase Realtime 연결 확인용 로그
        console.log(`[Realtime] Subscribing to ${table}${filter ? ` with filter: ${filter}` : ""}`);

        // 채널 생성 및 구독 설정
        // Supabase v2 Realtime API 사용
        const baseChannel = supabase.channel(channelName);

        // postgres_changes 이벤트 핸들러
        const handlePayload = (payload: unknown) => {
            const typedPayload = payload as RealtimePostgresChangesPayload<TableRow<T>>;
            console.log(`[Realtime] ${table} ${typedPayload.eventType}:`, typedPayload);

            // 통합 핸들러
            onChange?.(typedPayload);

            // 개별 이벤트 핸들러
            switch (typedPayload.eventType) {
                case "INSERT":
                    onInsert?.(typedPayload.new as TableRow<T>);
                    break;
                case "UPDATE":
                    onUpdate?.({
                        old: typedPayload.old as Partial<TableRow<T>>,
                        new: typedPayload.new as TableRow<T>,
                    });
                    break;
                case "DELETE":
                    onDelete?.(typedPayload.old as Partial<TableRow<T>>);
                    break;
            }
        };

        // 타입 캐스팅으로 postgres_changes 구독 설정
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const channel = (baseChannel as any).on(
            "postgres_changes",
            {
                event,
                schema: "public",
                table: table as string,
                filter,
            },
            handlePayload
        ).subscribe((status: string, err?: Error) => {
            console.log(`[Realtime] Channel ${channelName} status:`, status);

            if (status === "SUBSCRIBED") {
                setStatus("SUBSCRIBED");
                setError(null);
            } else if (status === "CLOSED") {
                setStatus("CLOSED");
            } else if (status === "CHANNEL_ERROR") {
                setStatus("ERROR");
                setError(err instanceof Error ? err : new Error(String(err)));
            }
        });

        channelRef.current = channel;

        // Cleanup
        return () => {
            console.log(`[Realtime] Unsubscribing from ${channelName}`);
            channel.unsubscribe();
        };
    }, [table, event, filter, skip, onInsert, onUpdate, onDelete, onChange]);

    return {
        status,
        error,
        unsubscribe,
    };
}

// ============================================================
// 도메인별 특화 훅
// ============================================================

interface UseEventCountsOptions {
    eventId: string;
    onUpdate?: (counts: { wishlistCount: number; attendedCount: number }) => void;
}

/**
 * 행사 찜/다녀옴 카운트 실시간 구독
 *
 * @example
 * ```tsx
 * const { wishlistCount, attendedCount } = useEventCounts({
 *   eventId: "e2",
 *   onUpdate: (counts) => console.log("Updated:", counts)
 * });
 * ```
 */
export function useEventCounts(options: UseEventCountsOptions) {
    const { eventId, onUpdate } = options;
    const [wishlistCount, setWishlistCount] = useState<number>(0);
    const [attendedCount, setAttendedCount] = useState<number>(0);

    const handleUpdate = useCallback(
        (payload: { new: { wishlist_count?: number; attended_count?: number } }) => {
            const newWishlist = payload.new.wishlist_count ?? wishlistCount;
            const newAttended = payload.new.attended_count ?? attendedCount;

            setWishlistCount(newWishlist);
            setAttendedCount(newAttended);
            onUpdate?.({ wishlistCount: newWishlist, attendedCount: newAttended });
        },
        [wishlistCount, attendedCount, onUpdate]
    );

    const { status, error } = useRealtime({
        table: "events",
        event: "UPDATE",
        filter: `id=eq.${eventId}`,
        onUpdate: handleUpdate,
    });

    return {
        wishlistCount,
        attendedCount,
        status,
        error,
    };
}

interface UsePostCountsOptions {
    postId: string;
    onUpdate?: (counts: { helpfulCount: number; commentCount: number }) => void;
}

/**
 * 게시글 도움됨/댓글 카운트 실시간 구독
 */
export function usePostCounts(options: UsePostCountsOptions) {
    const { postId, onUpdate } = options;
    const [helpfulCount, setHelpfulCount] = useState<number>(0);
    const [commentCount, setCommentCount] = useState<number>(0);

    const handleUpdate = useCallback(
        (payload: { new: { helpful_count?: number; comment_count?: number } }) => {
            const newHelpful = payload.new.helpful_count ?? helpfulCount;
            const newComment = payload.new.comment_count ?? commentCount;

            setHelpfulCount(newHelpful);
            setCommentCount(newComment);
            onUpdate?.({ helpfulCount: newHelpful, commentCount: newComment });
        },
        [helpfulCount, commentCount, onUpdate]
    );

    const { status, error } = useRealtime({
        table: "posts",
        event: "UPDATE",
        filter: `id=eq.${postId}`,
        onUpdate: handleUpdate,
    });

    return {
        helpfulCount,
        commentCount,
        status,
        error,
    };
}

interface UseNotificationsOptions {
    userId: string;
    onNewNotification?: (notification: TableRow<"notifications">) => void;
}

/**
 * 사용자 알림 실시간 구독
 *
 * @example
 * ```tsx
 * useNotifications({
 *   userId: "user-123",
 *   onNewNotification: (notification) => {
 *     toast(notification.message);
 *   }
 * });
 * ```
 */
export function useNotifications(options: UseNotificationsOptions) {
    const { userId, onNewNotification } = options;

    const { status, error } = useRealtime({
        table: "notifications",
        event: "INSERT",
        filter: `user_id=eq.${userId}`,
        onInsert: onNewNotification,
    });

    return { status, error };
}

interface UseUserEventsOptions {
    eventId: string;
    onUpdate?: (data: {
        eventType: "INSERT" | "UPDATE" | "DELETE";
        userId: string;
        wishlisted?: boolean;
        attended?: boolean;
    }) => void;
}

/**
 * 행사의 찜/다녀옴 변경 실시간 구독
 *
 * 행사 페이지에서 다른 사용자들의 찜/다녀옴 상태 변경을 실시간으로 반영
 */
export function useUserEventsRealtime(options: UseUserEventsOptions) {
    const { eventId, onUpdate } = options;

    const handleChange = useCallback(
        (payload: RealtimePostgresChangesPayload<TableRow<"user_events">>) => {
            // 타입 안전하게 추출
            const newData = payload.new as TableRow<"user_events"> | undefined;
            const oldData = payload.old as Partial<TableRow<"user_events">> | undefined;
            const userId = newData?.user_id || oldData?.user_id || "";

            onUpdate?.({
                eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
                userId,
                wishlisted: newData?.is_wishlist,
                attended: newData?.is_attended,
            });
        },
        [onUpdate]
    );

    const { status, error } = useRealtime({
        table: "user_events",
        filter: `event_id=eq.${eventId}`,
        onChange: handleChange,
    });

    return { status, error };
}
