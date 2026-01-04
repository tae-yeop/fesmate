/**
 * My Timetable Query Functions
 *
 * 슬롯 마크 및 커스텀 이벤트 Supabase 쿼리
 */

import { createClient } from "../client";

// =============================================
// Types
// =============================================

export type SlotMarkType = "watch" | "meal" | "rest" | "move" | "skip";

export interface SlotMark {
    userId: string;
    slotId: string;
    markType: SlotMarkType;
    memo?: string;
    createdAt: Date;
}

export type CustomEventType = "meal" | "rest" | "move" | "meet" | "other";

export interface CustomEvent {
    id: string;
    userId: string;
    eventId: string;
    type: CustomEventType;
    title: string;
    startAt: Date;
    endAt: Date;
    memo?: string;
    createdAt: Date;
}

// =============================================
// Slot Marks (슬롯 마크)
// =============================================

/**
 * 사용자의 특정 이벤트에 대한 슬롯 마크 목록 조회
 */
export async function getUserSlotMarks(
    userId: string,
    eventId: string
): Promise<SlotMark[]> {
    const supabase = createClient();

    // slots 테이블과 조인하여 event_id로 필터링
    const { data, error } = await supabase
        .from("user_slot_marks")
        .select(`
            user_id,
            slot_id,
            mark_type,
            memo,
            created_at,
            slots!inner(event_id)
        `)
        .eq("user_id", userId)
        .eq("slots.event_id", eventId);

    if (error) {
        console.error("[getUserSlotMarks] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        userId: row.user_id,
        slotId: row.slot_id,
        markType: row.mark_type as SlotMarkType,
        memo: row.memo ?? undefined,
        createdAt: new Date(row.created_at),
    }));
}

/**
 * 사용자의 모든 슬롯 마크 조회
 */
export async function getAllUserSlotMarks(userId: string): Promise<SlotMark[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_slot_marks")
        .select("*")
        .eq("user_id", userId);

    if (error) {
        console.error("[getAllUserSlotMarks] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        userId: row.user_id,
        slotId: row.slot_id,
        markType: row.mark_type as SlotMarkType,
        memo: row.memo ?? undefined,
        createdAt: new Date(row.created_at),
    }));
}

/**
 * 슬롯 마크 설정 (upsert)
 */
export async function setSlotMark(
    userId: string,
    slotId: string,
    markType: SlotMarkType,
    memo?: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from("user_slot_marks").upsert(
        {
            user_id: userId,
            slot_id: slotId,
            mark_type: markType,
            memo: memo ?? null,
        },
        { onConflict: "user_id,slot_id" }
    );

    if (error) {
        console.error("[setSlotMark] Error:", error);
        throw error;
    }
}

/**
 * 슬롯 마크 삭제
 */
export async function deleteSlotMark(
    userId: string,
    slotId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("user_slot_marks")
        .delete()
        .eq("user_id", userId)
        .eq("slot_id", slotId);

    if (error) {
        console.error("[deleteSlotMark] Error:", error);
        throw error;
    }
}

// =============================================
// Custom Events (커스텀 이벤트)
// =============================================

/**
 * 사용자의 특정 이벤트에 대한 커스텀 이벤트 목록 조회
 */
export async function getCustomEvents(
    userId: string,
    eventId: string
): Promise<CustomEvent[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("custom_events")
        .select("*")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .order("start_at", { ascending: true });

    if (error) {
        console.error("[getCustomEvents] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        type: row.type as CustomEventType,
        title: row.title,
        startAt: new Date(row.start_at),
        endAt: new Date(row.end_at),
        memo: row.memo ?? undefined,
        createdAt: new Date(row.created_at),
    }));
}

/**
 * 사용자의 모든 커스텀 이벤트 조회
 */
export async function getAllCustomEvents(userId: string): Promise<CustomEvent[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("custom_events")
        .select("*")
        .eq("user_id", userId)
        .order("start_at", { ascending: true });

    if (error) {
        console.error("[getAllCustomEvents] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        type: row.type as CustomEventType,
        title: row.title,
        startAt: new Date(row.start_at),
        endAt: new Date(row.end_at),
        memo: row.memo ?? undefined,
        createdAt: new Date(row.created_at),
    }));
}

/**
 * 커스텀 이벤트 생성
 */
export async function createCustomEvent(input: {
    userId: string;
    eventId: string;
    type: CustomEventType;
    title: string;
    startAt: Date;
    endAt: Date;
    memo?: string;
}): Promise<CustomEvent> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("custom_events")
        .insert({
            user_id: input.userId,
            event_id: input.eventId,
            type: input.type,
            title: input.title,
            start_at: input.startAt.toISOString(),
            end_at: input.endAt.toISOString(),
            memo: input.memo ?? null,
        })
        .select()
        .single();

    if (error) {
        console.error("[createCustomEvent] Error:", error);
        throw error;
    }

    return {
        id: data.id,
        userId: data.user_id,
        eventId: data.event_id,
        type: data.type as CustomEventType,
        title: data.title,
        startAt: new Date(data.start_at),
        endAt: new Date(data.end_at),
        memo: data.memo ?? undefined,
        createdAt: new Date(data.created_at),
    };
}

/**
 * 커스텀 이벤트 수정
 */
export async function updateCustomEvent(
    id: string,
    updates: Partial<{
        type: CustomEventType;
        title: string;
        startAt: Date;
        endAt: Date;
        memo: string | null;
    }>
): Promise<void> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.startAt !== undefined) updateData.start_at = updates.startAt.toISOString();
    if (updates.endAt !== undefined) updateData.end_at = updates.endAt.toISOString();
    if (updates.memo !== undefined) updateData.memo = updates.memo;

    const { error } = await supabase
        .from("custom_events")
        .update(updateData)
        .eq("id", id);

    if (error) {
        console.error("[updateCustomEvent] Error:", error);
        throw error;
    }
}

/**
 * 커스텀 이벤트 삭제
 */
export async function deleteCustomEvent(id: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("custom_events")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("[deleteCustomEvent] Error:", error);
        throw error;
    }
}
