/**
 * Companion Requests Query Functions
 *
 * 사용자 간 1:1 동행 제안 관련 쿼리
 */

import { createClient } from "../client";

// ===== Types =====

export type CompanionRequestStatus = "pending" | "accepted" | "declined" | "canceled";

export interface CompanionRequest {
    id: string;
    fromUserId: string;
    toUserId: string;
    eventId: string;
    slotIds?: string[];
    message?: string;
    status: CompanionRequestStatus;
    createdAt: Date;
    respondedAt?: Date;
}

export interface CreateCompanionRequestInput {
    toUserId: string;
    eventId: string;
    slotIds?: string[];
    message?: string;
}

// ===== Transform Functions =====

interface DbCompanionRequest {
    id: string;
    from_user_id: string;
    to_user_id: string;
    event_id: string;
    slot_ids: string[] | null;
    message: string | null;
    status: string;
    created_at: string;
    responded_at: string | null;
}

function transformDbToCompanionRequest(db: DbCompanionRequest): CompanionRequest {
    return {
        id: db.id,
        fromUserId: db.from_user_id,
        toUserId: db.to_user_id,
        eventId: db.event_id,
        slotIds: db.slot_ids || undefined,
        message: db.message || undefined,
        status: db.status as CompanionRequestStatus,
        createdAt: new Date(db.created_at),
        respondedAt: db.responded_at ? new Date(db.responded_at) : undefined,
    };
}

// ===== Query Functions =====

/**
 * 받은 동행 제안 목록 조회
 */
export async function getReceivedCompanionRequests(
    userId: string
): Promise<CompanionRequest[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("companion_requests")
        .select("*")
        .eq("to_user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[companions] getReceivedCompanionRequests error:", error);
        throw error;
    }

    return (data || []).map(transformDbToCompanionRequest);
}

/**
 * 보낸 동행 제안 목록 조회
 */
export async function getSentCompanionRequests(
    userId: string
): Promise<CompanionRequest[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("companion_requests")
        .select("*")
        .eq("from_user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[companions] getSentCompanionRequests error:", error);
        throw error;
    }

    return (data || []).map(transformDbToCompanionRequest);
}

/**
 * 모든 동행 제안 조회 (보낸 것 + 받은 것)
 */
export async function getAllCompanionRequests(
    userId: string
): Promise<CompanionRequest[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("companion_requests")
        .select("*")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[companions] getAllCompanionRequests error:", error);
        throw error;
    }

    return (data || []).map(transformDbToCompanionRequest);
}

/**
 * 특정 사용자에게 특정 행사에 대한 동행 제안 상태 조회
 */
export async function getCompanionRequestStatus(
    fromUserId: string,
    toUserId: string,
    eventId: string
): Promise<CompanionRequestStatus | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("companion_requests")
        .select("status")
        .eq("from_user_id", fromUserId)
        .eq("to_user_id", toUserId)
        .eq("event_id", eventId)
        .maybeSingle();

    if (error) {
        console.error("[companions] getCompanionRequestStatus error:", error);
        throw error;
    }

    return data?.status as CompanionRequestStatus | null;
}

/**
 * 받은 대기 중인 동행 제안 수
 */
export async function getReceivedPendingCompanionCount(
    userId: string
): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
        .from("companion_requests")
        .select("*", { count: "exact", head: true })
        .eq("to_user_id", userId)
        .eq("status", "pending");

    if (error) {
        console.error("[companions] getReceivedPendingCompanionCount error:", error);
        throw error;
    }

    return count || 0;
}

/**
 * 특정 행사의 동행 확정된 사용자 ID 목록
 */
export async function getCompanionsForEvent(
    userId: string,
    eventId: string
): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("companion_requests")
        .select("from_user_id, to_user_id")
        .eq("event_id", eventId)
        .eq("status", "accepted")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (error) {
        console.error("[companions] getCompanionsForEvent error:", error);
        throw error;
    }

    const companions: string[] = [];
    (data || []).forEach((r) => {
        if (r.from_user_id === userId) {
            companions.push(r.to_user_id);
        } else if (r.to_user_id === userId) {
            companions.push(r.from_user_id);
        }
    });

    return [...new Set(companions)];
}

// ===== Mutation Functions =====

/**
 * 동행 제안 보내기
 */
export async function sendCompanionRequest(
    fromUserId: string,
    input: CreateCompanionRequestInput
): Promise<CompanionRequest> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("companion_requests")
        .insert({
            from_user_id: fromUserId,
            to_user_id: input.toUserId,
            event_id: input.eventId,
            slot_ids: input.slotIds || [],
            message: input.message || null,
            status: "pending",
        })
        .select()
        .single();

    if (error) {
        console.error("[companions] sendCompanionRequest error:", error);
        throw error;
    }

    return transformDbToCompanionRequest(data);
}

/**
 * 동행 제안 수락
 */
export async function acceptCompanionRequest(
    requestId: string
): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from("companion_requests")
        .update({
            status: "accepted",
            responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (error) {
        console.error("[companions] acceptCompanionRequest error:", error);
        throw error;
    }
}

/**
 * 동행 제안 거절
 */
export async function declineCompanionRequest(
    requestId: string
): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from("companion_requests")
        .update({
            status: "declined",
            responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (error) {
        console.error("[companions] declineCompanionRequest error:", error);
        throw error;
    }
}

/**
 * 동행 제안 취소 (보낸 제안 중 pending 상태만)
 */
export async function cancelCompanionRequest(
    requestId: string
): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from("companion_requests")
        .delete()
        .eq("id", requestId)
        .eq("status", "pending");

    if (error) {
        console.error("[companions] cancelCompanionRequest error:", error);
        throw error;
    }
}
