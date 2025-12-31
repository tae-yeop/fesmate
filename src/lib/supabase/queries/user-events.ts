/**
 * User Events Query Functions
 *
 * 찜/다녀옴 데이터 Supabase 쿼리
 */

import { createClient } from "../client";

export interface UserEvent {
    userId: string;
    eventId: string;
    isWishlist: boolean;
    isAttended: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * 사용자의 모든 찜/다녀옴 목록 조회
 */
export async function getUserEvents(userId: string): Promise<UserEvent[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_events")
        .select("*")
        .eq("user_id", userId);

    if (error) {
        console.error("[getUserEvents] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        userId: row.user_id,
        eventId: row.event_id,
        isWishlist: row.is_wishlist ?? false,
        isAttended: row.is_attended ?? false,
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    }));
}

/**
 * 사용자의 찜 목록만 조회
 */
export async function getWishlistEventIds(userId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_events")
        .select("event_id")
        .eq("user_id", userId)
        .eq("is_wishlist", true);

    if (error) {
        console.error("[getWishlistEventIds] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.event_id);
}

/**
 * 사용자의 다녀옴 목록만 조회
 */
export async function getAttendedEventIds(userId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_events")
        .select("event_id")
        .eq("user_id", userId)
        .eq("is_attended", true);

    if (error) {
        console.error("[getAttendedEventIds] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.event_id);
}

/**
 * 찜 토글
 */
export async function toggleUserWishlist(
    userId: string,
    eventId: string
): Promise<boolean> {
    const supabase = createClient();

    // 현재 상태 조회
    const { data: existing } = await supabase
        .from("user_events")
        .select("is_wishlist")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .single();

    const newWishlistState = !(existing?.is_wishlist ?? false);

    // upsert로 업데이트/생성
    const { error } = await supabase.from("user_events").upsert(
        {
            user_id: userId,
            event_id: eventId,
            is_wishlist: newWishlistState,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_id" }
    );

    if (error) {
        console.error("[toggleUserWishlist] Error:", error);
        throw error;
    }

    return newWishlistState;
}

/**
 * 다녀옴 토글
 */
export async function toggleUserAttended(
    userId: string,
    eventId: string
): Promise<boolean> {
    const supabase = createClient();

    // 현재 상태 조회
    const { data: existing } = await supabase
        .from("user_events")
        .select("is_attended")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .single();

    const newAttendedState = !(existing?.is_attended ?? false);

    // upsert로 업데이트/생성
    const { error } = await supabase.from("user_events").upsert(
        {
            user_id: userId,
            event_id: eventId,
            is_attended: newAttendedState,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_id" }
    );

    if (error) {
        console.error("[toggleUserAttended] Error:", error);
        throw error;
    }

    return newAttendedState;
}

/**
 * 찜 상태 설정 (토글이 아닌 명시적 설정)
 */
export async function setWishlist(
    userId: string,
    eventId: string,
    isWishlist: boolean
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from("user_events").upsert(
        {
            user_id: userId,
            event_id: eventId,
            is_wishlist: isWishlist,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_id" }
    );

    if (error) {
        console.error("[setWishlist] Error:", error);
        throw error;
    }
}

/**
 * 다녀옴 상태 설정 (토글이 아닌 명시적 설정)
 */
export async function setAttended(
    userId: string,
    eventId: string,
    isAttended: boolean
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from("user_events").upsert(
        {
            user_id: userId,
            event_id: eventId,
            is_attended: isAttended,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_id" }
    );

    if (error) {
        console.error("[setAttended] Error:", error);
        throw error;
    }
}
