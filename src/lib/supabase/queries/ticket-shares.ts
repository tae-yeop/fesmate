/**
 * Ticket Shares 쿼리
 * - 공유 생성/조회/삭제
 * - 조회수 증가
 */

import { createClient } from "@/lib/supabase/client";
import { generateShareId } from "@/lib/utils/share";

/**
 * 티켓 공유 정보
 */
export interface TicketShare {
    id: string;
    shareId: string;
    userId: string;
    title: string | null;
    description: string | null;
    isPublic: boolean;
    expiresAt: Date | null;
    ticketIds: string[];
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * 공유 생성 옵션
 */
export interface CreateShareOptions {
    title?: string;
    description?: string;
    isPublic?: boolean;
    expiresInDays?: number; // null이면 만료 없음
}

/**
 * DB 응답을 TicketShare로 변환
 */
function mapToTicketShare(row: Record<string, unknown>): TicketShare {
    return {
        id: row.id as string,
        shareId: row.share_id as string,
        userId: row.user_id as string,
        title: row.title as string | null,
        description: row.description as string | null,
        isPublic: row.is_public as boolean,
        expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
        ticketIds: row.ticket_ids as string[],
        viewCount: row.view_count as number,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
    };
}

/**
 * 공유 생성
 */
export async function createShare(
    userId: string,
    ticketIds: string[],
    options: CreateShareOptions = {}
): Promise<TicketShare | null> {
    const supabase = createClient();

    // 짧은 공유 ID 생성 (충돌 시 재시도)
    let shareId = generateShareId(8);
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        const { data: existing } = await supabase
            .from("ticket_shares")
            .select("id")
            .eq("share_id", shareId)
            .single();

        if (!existing) break;

        shareId = generateShareId(8);
        attempts++;
    }

    if (attempts >= maxAttempts) {
        console.error("[createShare] Failed to generate unique share ID");
        return null;
    }

    // 만료 시간 계산
    const expiresAt = options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { data, error } = await supabase
        .from("ticket_shares")
        .insert({
            share_id: shareId,
            user_id: userId,
            title: options.title || null,
            description: options.description || null,
            is_public: options.isPublic !== false,
            expires_at: expiresAt,
            ticket_ids: ticketIds,
        })
        .select()
        .single();

    if (error) {
        console.error("[createShare] Error:", error);
        return null;
    }

    return mapToTicketShare(data);
}

/**
 * 공유 ID로 조회 (공개 공유용)
 */
export async function getShareByShareId(shareId: string): Promise<TicketShare | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("ticket_shares")
        .select("*")
        .eq("share_id", shareId)
        .single();

    if (error) {
        if (error.code !== "PGRST116") {
            console.error("[getShareByShareId] Error:", error);
        }
        return null;
    }

    return mapToTicketShare(data);
}

/**
 * 사용자의 공유 목록 조회
 */
export async function getUserShares(userId: string): Promise<TicketShare[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("ticket_shares")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getUserShares] Error:", error);
        return [];
    }

    return data.map(mapToTicketShare);
}

/**
 * 공유 수정
 */
export async function updateShare(
    shareId: string,
    userId: string,
    updates: {
        title?: string;
        description?: string;
        isPublic?: boolean;
        ticketIds?: string[];
    }
): Promise<TicketShare | null> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
    if (updates.ticketIds !== undefined) updateData.ticket_ids = updates.ticketIds;

    const { data, error } = await supabase
        .from("ticket_shares")
        .update(updateData)
        .eq("share_id", shareId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) {
        console.error("[updateShare] Error:", error);
        return null;
    }

    return mapToTicketShare(data);
}

/**
 * 공유 삭제
 */
export async function deleteShare(shareId: string, userId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from("ticket_shares")
        .delete()
        .eq("share_id", shareId)
        .eq("user_id", userId);

    if (error) {
        console.error("[deleteShare] Error:", error);
        return false;
    }

    return true;
}

/**
 * 조회수 증가
 */
export async function incrementViewCount(shareId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase.rpc("increment_share_view_count", {
        p_share_id: shareId,
    });

    if (error) {
        console.error("[incrementViewCount] Error:", error);
        return false;
    }

    return true;
}

/**
 * 공유 URL 생성
 */
export function getShareUrl(shareId: string): string {
    const baseUrl = typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://fesmate.app";
    return `${baseUrl}/share/tickets/${shareId}`;
}
