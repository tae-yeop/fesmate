/**
 * Tickets Query Functions
 *
 * 티켓북(소장 티켓) 관련 쿼리
 */

import { createClient } from "../client";

// ===== Types =====

export interface TicketImage {
    id: string;
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
}

export interface Ticket {
    id: string;
    userId: string;
    eventId?: string;
    eventTitle: string;
    eventDate: Date;
    frontImage: TicketImage;
    backImage?: TicketImage;
    memo?: string;
    seat?: string;
    companion?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTicketInput {
    eventId?: string;
    eventTitle: string;
    eventDate: Date;
    frontImageUrl: string;
    frontThumbnailUrl?: string;
    frontWidth?: number;
    frontHeight?: number;
    backImageUrl?: string;
    backThumbnailUrl?: string;
    backWidth?: number;
    backHeight?: number;
    memo?: string;
    seat?: string;
    companion?: string;
}

export interface UpdateTicketInput {
    eventTitle?: string;
    eventDate?: Date;
    frontImageUrl?: string;
    frontThumbnailUrl?: string;
    frontWidth?: number;
    frontHeight?: number;
    backImageUrl?: string | null;
    backThumbnailUrl?: string | null;
    backWidth?: number | null;
    backHeight?: number | null;
    memo?: string;
    seat?: string;
    companion?: string;
}

// ===== Transform Functions =====

interface DbTicket {
    id: string;
    user_id: string;
    event_id: string | null;
    event_title: string;
    event_date: string;
    front_image_url: string;
    front_thumbnail_url: string | null;
    front_width: number | null;
    front_height: number | null;
    back_image_url: string | null;
    back_thumbnail_url: string | null;
    back_width: number | null;
    back_height: number | null;
    memo: string | null;
    seat: string | null;
    companion: string | null;
    created_at: string;
    updated_at: string;
}

function transformDbToTicket(db: DbTicket): Ticket {
    return {
        id: db.id,
        userId: db.user_id,
        eventId: db.event_id || undefined,
        eventTitle: db.event_title,
        eventDate: new Date(db.event_date),
        frontImage: {
            id: `front_${db.id}`,
            url: db.front_image_url,
            thumbnailUrl: db.front_thumbnail_url || undefined,
            width: db.front_width || undefined,
            height: db.front_height || undefined,
        },
        backImage: db.back_image_url
            ? {
                id: `back_${db.id}`,
                url: db.back_image_url,
                thumbnailUrl: db.back_thumbnail_url || undefined,
                width: db.back_width || undefined,
                height: db.back_height || undefined,
            }
            : undefined,
        memo: db.memo || undefined,
        seat: db.seat || undefined,
        companion: db.companion || undefined,
        createdAt: new Date(db.created_at),
        updatedAt: new Date(db.updated_at),
    };
}

// ===== Query Functions =====

/**
 * 사용자의 모든 티켓 조회
 */
export async function getUserTickets(userId: string): Promise<Ticket[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", userId)
        .order("event_date", { ascending: false });

    if (error) {
        console.error("[tickets] getUserTickets error:", error);
        throw error;
    }

    return (data || []).map(transformDbToTicket);
}

/**
 * 특정 티켓 조회
 */
export async function getTicket(ticketId: string): Promise<Ticket | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();

    if (error) {
        console.error("[tickets] getTicket error:", error);
        throw error;
    }

    return data ? transformDbToTicket(data) : null;
}

/**
 * 행사별 티켓 조회
 */
export async function getTicketsByEvent(
    userId: string,
    eventId: string
): Promise<Ticket[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[tickets] getTicketsByEvent error:", error);
        throw error;
    }

    return (data || []).map(transformDbToTicket);
}

// ===== Mutation Functions =====

/**
 * 티켓 생성
 */
export async function createTicket(
    userId: string,
    input: CreateTicketInput
): Promise<Ticket> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("tickets")
        .insert({
            user_id: userId,
            event_id: input.eventId || null,
            event_title: input.eventTitle,
            event_date: input.eventDate.toISOString(),
            front_image_url: input.frontImageUrl,
            front_thumbnail_url: input.frontThumbnailUrl || null,
            front_width: input.frontWidth || null,
            front_height: input.frontHeight || null,
            back_image_url: input.backImageUrl || null,
            back_thumbnail_url: input.backThumbnailUrl || null,
            back_width: input.backWidth || null,
            back_height: input.backHeight || null,
            memo: input.memo || null,
            seat: input.seat || null,
            companion: input.companion || null,
        })
        .select()
        .single();

    if (error) {
        console.error("[tickets] createTicket error:", error);
        throw error;
    }

    return transformDbToTicket(data);
}

/**
 * 티켓 수정
 */
export async function updateTicket(
    ticketId: string,
    input: UpdateTicketInput
): Promise<Ticket> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};

    if (input.eventTitle !== undefined) updateData.event_title = input.eventTitle;
    if (input.eventDate !== undefined) updateData.event_date = input.eventDate.toISOString();
    if (input.frontImageUrl !== undefined) updateData.front_image_url = input.frontImageUrl;
    if (input.frontThumbnailUrl !== undefined) updateData.front_thumbnail_url = input.frontThumbnailUrl;
    if (input.frontWidth !== undefined) updateData.front_width = input.frontWidth;
    if (input.frontHeight !== undefined) updateData.front_height = input.frontHeight;
    if (input.backImageUrl !== undefined) updateData.back_image_url = input.backImageUrl;
    if (input.backThumbnailUrl !== undefined) updateData.back_thumbnail_url = input.backThumbnailUrl;
    if (input.backWidth !== undefined) updateData.back_width = input.backWidth;
    if (input.backHeight !== undefined) updateData.back_height = input.backHeight;
    if (input.memo !== undefined) updateData.memo = input.memo;
    if (input.seat !== undefined) updateData.seat = input.seat;
    if (input.companion !== undefined) updateData.companion = input.companion;

    const { data, error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select()
        .single();

    if (error) {
        console.error("[tickets] updateTicket error:", error);
        throw error;
    }

    return transformDbToTicket(data);
}

/**
 * 티켓 삭제
 */
export async function deleteTicket(ticketId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticketId);

    if (error) {
        console.error("[tickets] deleteTicket error:", error);
        throw error;
    }
}
