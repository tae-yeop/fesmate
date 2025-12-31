/**
 * Participation Query Functions
 *
 * 커뮤니티 참여 신청 관련 Supabase 쿼리
 * - participation_requests: 동행/택시/밥/숙소 참여 신청
 */

import { createClient } from "../client";

// ===== Types =====

export type ParticipationStatus = "pending" | "accepted" | "declined" | "canceled";

export interface ParticipationRequest {
    id: string;
    applicantId: string;
    postId: string;
    postAuthorId: string;
    message: string | null;
    status: ParticipationStatus;
    scheduledAt: Date | null;
    activityLocation: string | null;
    createdAt: Date;
    respondedAt: Date | null;
}

export interface CreateParticipationInput {
    postId: string;
    postAuthorId: string;
    message?: string;
}

// ===== Helper: Transform DB row to frontend type =====

function transformDbParticipation(row: Record<string, unknown>): ParticipationRequest {
    return {
        id: row.id as string,
        applicantId: row.applicant_id as string,
        postId: row.post_id as string,
        postAuthorId: row.post_author_id as string,
        message: row.message as string | null,
        status: row.status as ParticipationStatus,
        scheduledAt: row.scheduled_at ? new Date(row.scheduled_at as string) : null,
        activityLocation: row.activity_location as string | null,
        createdAt: new Date(row.created_at as string),
        respondedAt: row.responded_at ? new Date(row.responded_at as string) : null,
    };
}

// ===== Query Functions =====

/**
 * 받은 참여 신청 목록 조회 (내 글에 온 신청)
 */
export async function getReceivedRequests(
    userId: string
): Promise<ParticipationRequest[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("participation_requests")
        .select("*")
        .eq("post_author_id", userId)
        .neq("status", "canceled")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getReceivedRequests] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbParticipation);
}

/**
 * 보낸 참여 신청 목록 조회 (내가 신청한 것)
 */
export async function getSentRequests(
    userId: string
): Promise<ParticipationRequest[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("participation_requests")
        .select("*")
        .eq("applicant_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getSentRequests] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbParticipation);
}

/**
 * 특정 글에 대한 참여 신청 목록 조회
 */
export async function getRequestsForPost(
    postId: string
): Promise<ParticipationRequest[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("participation_requests")
        .select("*")
        .eq("post_id", postId)
        .neq("status", "canceled")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getRequestsForPost] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbParticipation);
}

/**
 * 특정 글에 대한 내 신청 조회
 */
export async function getMyRequest(
    postId: string,
    applicantId: string
): Promise<ParticipationRequest | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("participation_requests")
        .select("*")
        .eq("post_id", postId)
        .eq("applicant_id", applicantId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null; // no rows
        console.error("[getMyRequest] Error:", error);
        throw error;
    }

    return data ? transformDbParticipation(data) : null;
}

/**
 * 받은 대기 중인 신청 수
 */
export async function getReceivedPendingCount(userId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
        .from("participation_requests")
        .select("*", { count: "exact", head: true })
        .eq("post_author_id", userId)
        .eq("status", "pending");

    if (error) {
        console.error("[getReceivedPendingCount] Error:", error);
        throw error;
    }

    return count ?? 0;
}

/**
 * 보낸 대기 중인 신청 수
 */
export async function getSentPendingCount(userId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
        .from("participation_requests")
        .select("*", { count: "exact", head: true })
        .eq("applicant_id", userId)
        .eq("status", "pending");

    if (error) {
        console.error("[getSentPendingCount] Error:", error);
        throw error;
    }

    return count ?? 0;
}

/**
 * 수락된 활동 목록 조회
 */
export async function getAcceptedActivities(
    userId: string
): Promise<ParticipationRequest[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("participation_requests")
        .select("*")
        .eq("applicant_id", userId)
        .eq("status", "accepted")
        .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (error) {
        console.error("[getAcceptedActivities] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbParticipation);
}

/**
 * 참여 신청 보내기
 */
export async function sendParticipationRequest(
    applicantId: string,
    input: CreateParticipationInput
): Promise<ParticipationRequest> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("participation_requests")
        .insert({
            applicant_id: applicantId,
            post_id: input.postId,
            post_author_id: input.postAuthorId,
            message: input.message || null,
            status: "pending",
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error("Already requested to participate");
        }
        console.error("[sendParticipationRequest] Error:", error);
        throw error;
    }

    return transformDbParticipation(data);
}

/**
 * 참여 신청 수락
 */
export async function acceptParticipationRequest(
    requestId: string,
    scheduledAt?: Date,
    activityLocation?: string
): Promise<void> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {
        status: "accepted",
        responded_at: new Date().toISOString(),
    };

    if (scheduledAt) {
        updateData.scheduled_at = scheduledAt.toISOString();
    }
    if (activityLocation) {
        updateData.activity_location = activityLocation;
    }

    const { error } = await supabase
        .from("participation_requests")
        .update(updateData)
        .eq("id", requestId);

    if (error) {
        console.error("[acceptParticipationRequest] Error:", error);
        throw error;
    }
}

/**
 * 참여 신청 거절
 */
export async function declineParticipationRequest(requestId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("participation_requests")
        .update({
            status: "declined",
            responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    if (error) {
        console.error("[declineParticipationRequest] Error:", error);
        throw error;
    }
}

/**
 * 참여 신청 취소 (신청자가)
 */
export async function cancelParticipationRequest(requestId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("participation_requests")
        .update({
            status: "canceled",
        })
        .eq("id", requestId)
        .eq("status", "pending"); // 대기 중인 것만 취소 가능

    if (error) {
        console.error("[cancelParticipationRequest] Error:", error);
        throw error;
    }
}

/**
 * 활동 정보 업데이트 (수락 후 일정/장소 변경)
 */
export async function updateActivityInfo(
    requestId: string,
    scheduledAt?: Date,
    activityLocation?: string
): Promise<void> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (scheduledAt !== undefined) {
        updateData.scheduled_at = scheduledAt ? scheduledAt.toISOString() : null;
    }
    if (activityLocation !== undefined) {
        updateData.activity_location = activityLocation || null;
    }

    if (Object.keys(updateData).length === 0) {
        return; // 업데이트할 내용 없음
    }

    const { error } = await supabase
        .from("participation_requests")
        .update(updateData)
        .eq("id", requestId);

    if (error) {
        console.error("[updateActivityInfo] Error:", error);
        throw error;
    }
}
