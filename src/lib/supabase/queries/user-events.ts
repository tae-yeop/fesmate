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
 * UPSERT 대신 조건부 INSERT/UPDATE 사용 (RLS 정책 호환성)
 */
export async function toggleUserWishlist(
    userId: string,
    eventId: string
): Promise<boolean> {
    const supabase = createClient();

    // 현재 상태 조회
    const { data: existing, error: selectError } = await supabase
        .from("user_events")
        .select("is_wishlist, is_attended")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (selectError) {
        console.error("[toggleUserWishlist] Select error:", selectError.message, "code:", selectError.code, "details:", selectError.details);
        throw selectError;
    }

    const newWishlistState = !(existing?.is_wishlist ?? false);

    if (existing) {
        // 기존 레코드가 있으면 UPDATE
        const { error } = await supabase
            .from("user_events")
            .update({
                is_wishlist: newWishlistState,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("event_id", eventId);

        if (error) {
            console.error("[toggleUserWishlist] Update error:", error);
            throw error;
        }
    } else {
        // 새 레코드면 INSERT
        const { error } = await supabase.from("user_events").insert({
            user_id: userId,
            event_id: eventId,
            is_wishlist: newWishlistState,
            is_attended: false,
        });

        if (error) {
            console.error("[toggleUserWishlist] Insert error:", error);
            throw error;
        }
    }

    return newWishlistState;
}

/**
 * 다녀옴 토글
 * UPSERT 대신 조건부 INSERT/UPDATE 사용 (RLS 정책 호환성)
 */
export async function toggleUserAttended(
    userId: string,
    eventId: string
): Promise<boolean> {
    const supabase = createClient();

    // 현재 상태 조회
    const { data: existing, error: selectError } = await supabase
        .from("user_events")
        .select("is_wishlist, is_attended")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (selectError) {
        console.error("[toggleUserAttended] Select error:", selectError);
        throw selectError;
    }

    const newAttendedState = !(existing?.is_attended ?? false);

    if (existing) {
        // 기존 레코드가 있으면 UPDATE
        const { error } = await supabase
            .from("user_events")
            .update({
                is_attended: newAttendedState,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("event_id", eventId);

        if (error) {
            console.error("[toggleUserAttended] Update error:", error);
            throw error;
        }
    } else {
        // 새 레코드면 INSERT
        const { error } = await supabase.from("user_events").insert({
            user_id: userId,
            event_id: eventId,
            is_wishlist: false,
            is_attended: newAttendedState,
        });

        if (error) {
            console.error("[toggleUserAttended] Insert error:", error);
            throw error;
        }
    }

    return newAttendedState;
}

/**
 * 찜 상태 설정 (토글이 아닌 명시적 설정)
 * UPSERT 대신 조건부 INSERT/UPDATE 사용 (RLS 정책 호환성)
 */
export async function setWishlist(
    userId: string,
    eventId: string,
    isWishlist: boolean
): Promise<void> {
    const supabase = createClient();

    // 먼저 존재 여부 확인
    const { data: existing, error: selectError } = await supabase
        .from("user_events")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (selectError) {
        console.error("[setWishlist] Select error:", selectError);
        throw selectError;
    }

    if (existing) {
        const { error } = await supabase
            .from("user_events")
            .update({
                is_wishlist: isWishlist,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("event_id", eventId);

        if (error) {
            console.error("[setWishlist] Update error:", error);
            throw error;
        }
    } else {
        const { error } = await supabase.from("user_events").insert({
            user_id: userId,
            event_id: eventId,
            is_wishlist: isWishlist,
            is_attended: false,
        });

        if (error) {
            console.error("[setWishlist] Insert error:", error);
            throw error;
        }
    }
}

/**
 * 다녀옴 상태 설정 (토글이 아닌 명시적 설정)
 * UPSERT 대신 조건부 INSERT/UPDATE 사용 (RLS 정책 호환성)
 */
export async function setAttended(
    userId: string,
    eventId: string,
    isAttended: boolean
): Promise<void> {
    const supabase = createClient();

    // 먼저 존재 여부 확인
    const { data: existing, error: selectError } = await supabase
        .from("user_events")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (selectError) {
        console.error("[setAttended] Select error:", selectError);
        throw selectError;
    }

    if (existing) {
        const { error } = await supabase
            .from("user_events")
            .update({
                is_attended: isAttended,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .eq("event_id", eventId);

        if (error) {
            console.error("[setAttended] Update error:", error);
            throw error;
        }
    } else {
        const { error } = await supabase.from("user_events").insert({
            user_id: userId,
            event_id: eventId,
            is_wishlist: false,
            is_attended: isAttended,
        });

        if (error) {
            console.error("[setAttended] Insert error:", error);
            throw error;
        }
    }
}
