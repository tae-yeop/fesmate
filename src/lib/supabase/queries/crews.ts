/**
 * Crews Query Functions
 *
 * 크루 관련 Supabase 쿼리
 * - crews: 크루 정보
 * - crew_members: 크루 멤버십
 * - crew_join_requests: 가입 신청
 * - crew_announcements: 크루 공지
 * - crew_events: 크루 관심 행사
 */

import { createClient } from "../client";

// ===== Types =====

export interface Crew {
    id: string;
    name: string;
    description: string | null;
    region: string;
    genre: string;
    isPublic: boolean;
    joinType: "open" | "approval";
    maxMembers: number;
    logoEmoji: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    memberCount: number;
    eventCount: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CrewMember {
    crewId: string;
    userId: string;
    role: "leader" | "member";
    joinedAt: Date;
}

export interface CrewJoinRequest {
    id: string;
    crewId: string;
    userId: string;
    message: string | null;
    status: "pending" | "approved" | "rejected";
    requestedAt: Date;
    processedAt: Date | null;
    processedBy: string | null;
}

export interface CrewAnnouncement {
    id: string;
    crewId: string;
    authorId: string;
    content: string;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CrewEvent {
    crewId: string;
    eventId: string;
    addedBy: string;
    addedAt: Date;
}

export interface CreateCrewInput {
    name: string;
    description?: string;
    region: string;
    genre: string;
    isPublic?: boolean;
    joinType?: "open" | "approval";
    maxMembers?: number;
    logoEmoji?: string;
}

// ===== Helper: Transform DB row to frontend type =====

function transformDbCrew(row: Record<string, unknown>): Crew {
    return {
        id: row.id as string,
        name: row.name as string,
        description: row.description as string | null,
        region: row.region as string,
        genre: row.genre as string,
        isPublic: row.is_public as boolean,
        joinType: row.join_type as "open" | "approval",
        maxMembers: row.max_members as number,
        logoEmoji: row.logo_emoji as string | null,
        logoUrl: row.logo_url as string | null,
        bannerUrl: row.banner_url as string | null,
        memberCount: row.member_count as number,
        eventCount: row.event_count as number,
        createdBy: row.created_by as string,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
    };
}

function transformDbCrewMember(row: Record<string, unknown>): CrewMember {
    return {
        crewId: row.crew_id as string,
        userId: row.user_id as string,
        role: row.role as "leader" | "member",
        joinedAt: new Date(row.joined_at as string),
    };
}

function transformDbJoinRequest(row: Record<string, unknown>): CrewJoinRequest {
    return {
        id: row.id as string,
        crewId: row.crew_id as string,
        userId: row.user_id as string,
        message: row.message as string | null,
        status: row.status as "pending" | "approved" | "rejected",
        requestedAt: new Date(row.requested_at as string),
        processedAt: row.processed_at ? new Date(row.processed_at as string) : null,
        processedBy: row.processed_by as string | null,
    };
}

function transformDbAnnouncement(row: Record<string, unknown>): CrewAnnouncement {
    return {
        id: row.id as string,
        crewId: row.crew_id as string,
        authorId: row.author_id as string,
        content: row.content as string,
        isPinned: row.is_pinned as boolean,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
    };
}

function transformDbCrewEvent(row: Record<string, unknown>): CrewEvent {
    return {
        crewId: row.crew_id as string,
        eventId: row.event_id as string,
        addedBy: row.added_by as string,
        addedAt: new Date(row.added_at as string),
    };
}

// ===== Crew CRUD =====

/**
 * 공개 크루 목록 조회
 */
export async function getPublicCrews(): Promise<Crew[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crews")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getPublicCrews] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbCrew);
}

/**
 * 크루 상세 조회
 */
export async function getCrewById(crewId: string): Promise<Crew | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crews")
        .select("*")
        .eq("id", crewId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null; // no rows
        console.error("[getCrewById] Error:", error);
        throw error;
    }

    return data ? transformDbCrew(data) : null;
}

/**
 * 사용자가 속한 크루 목록 조회
 */
export async function getUserCrews(userId: string): Promise<Crew[]> {
    const supabase = createClient();

    // crew_members에서 사용자가 속한 크루 ID 조회
    const { data: memberData, error: memberError } = await supabase
        .from("crew_members")
        .select("crew_id")
        .eq("user_id", userId);

    if (memberError) {
        console.error("[getUserCrews] Error:", memberError);
        throw memberError;
    }

    if (!memberData || memberData.length === 0) {
        return [];
    }

    const crewIds = memberData.map((m) => m.crew_id);

    // 크루 정보 조회
    const { data: crewData, error: crewError } = await supabase
        .from("crews")
        .select("*")
        .in("id", crewIds);

    if (crewError) {
        console.error("[getUserCrews] Error:", crewError);
        throw crewError;
    }

    return (crewData ?? []).map(transformDbCrew);
}

/**
 * 크루 생성
 */
export async function createCrew(
    userId: string,
    input: CreateCrewInput
): Promise<Crew> {
    const supabase = createClient();

    // 크루 생성
    const { data: crewData, error: crewError } = await supabase
        .from("crews")
        .insert({
            name: input.name,
            description: input.description || null,
            region: input.region,
            genre: input.genre,
            is_public: input.isPublic ?? true,
            join_type: input.joinType ?? "open",
            max_members: input.maxMembers ?? 50,
            logo_emoji: input.logoEmoji || null,
            created_by: userId,
        })
        .select()
        .single();

    if (crewError) {
        console.error("[createCrew] Error:", crewError);
        throw crewError;
    }

    // 생성자를 리더로 추가
    const { error: memberError } = await supabase.from("crew_members").insert({
        crew_id: crewData.id,
        user_id: userId,
        role: "leader",
    });

    if (memberError) {
        console.error("[createCrew] Member insert error:", memberError);
        // 롤백: 크루 삭제
        await supabase.from("crews").delete().eq("id", crewData.id);
        throw memberError;
    }

    return transformDbCrew(crewData);
}

/**
 * 크루 정보 수정 (리더만)
 */
export async function updateCrew(
    crewId: string,
    updates: Partial<CreateCrewInput>
): Promise<Crew> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.region !== undefined) updateData.region = updates.region;
    if (updates.genre !== undefined) updateData.genre = updates.genre;
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
    if (updates.joinType !== undefined) updateData.join_type = updates.joinType;
    if (updates.maxMembers !== undefined) updateData.max_members = updates.maxMembers;
    if (updates.logoEmoji !== undefined) updateData.logo_emoji = updates.logoEmoji;

    const { data, error } = await supabase
        .from("crews")
        .update(updateData)
        .eq("id", crewId)
        .select()
        .single();

    if (error) {
        console.error("[updateCrew] Error:", error);
        throw error;
    }

    return transformDbCrew(data);
}

/**
 * 크루 삭제 (리더만)
 */
export async function deleteCrew(crewId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from("crews").delete().eq("id", crewId);

    if (error) {
        console.error("[deleteCrew] Error:", error);
        throw error;
    }
}

// ===== Crew Members =====

/**
 * 크루 멤버 목록 조회
 */
export async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_members")
        .select("*")
        .eq("crew_id", crewId)
        .order("joined_at", { ascending: true });

    if (error) {
        console.error("[getCrewMembers] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbCrewMember);
}

/**
 * 멤버 여부 확인
 */
export async function isCrewMember(
    crewId: string,
    userId: string
): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_members")
        .select("user_id")
        .eq("crew_id", crewId)
        .eq("user_id", userId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("[isCrewMember] Error:", error);
        throw error;
    }

    return !!data;
}

/**
 * 리더 여부 확인
 */
export async function isCrewLeader(
    crewId: string,
    userId: string
): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_members")
        .select("role")
        .eq("crew_id", crewId)
        .eq("user_id", userId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("[isCrewLeader] Error:", error);
        throw error;
    }

    return data?.role === "leader";
}

/**
 * 크루 가입 (open 타입)
 */
export async function joinCrew(crewId: string, userId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from("crew_members").insert({
        crew_id: crewId,
        user_id: userId,
        role: "member",
    });

    if (error) {
        if (error.code === "23505") {
            // already member
            return;
        }
        console.error("[joinCrew] Error:", error);
        throw error;
    }
}

/**
 * 크루 탈퇴
 */
export async function leaveCrew(crewId: string, userId: string): Promise<void> {
    const supabase = createClient();

    // 리더는 탈퇴 불가
    const isLeader = await isCrewLeader(crewId, userId);
    if (isLeader) {
        throw new Error("Leader cannot leave the crew");
    }

    const { error } = await supabase
        .from("crew_members")
        .delete()
        .eq("crew_id", crewId)
        .eq("user_id", userId);

    if (error) {
        console.error("[leaveCrew] Error:", error);
        throw error;
    }
}

/**
 * 멤버 강퇴 (리더만)
 */
export async function kickMember(crewId: string, userId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("crew_members")
        .delete()
        .eq("crew_id", crewId)
        .eq("user_id", userId)
        .neq("role", "leader"); // 리더는 강퇴 불가

    if (error) {
        console.error("[kickMember] Error:", error);
        throw error;
    }
}

// ===== Join Requests =====

/**
 * 가입 신청 목록 조회 (크루별)
 */
export async function getJoinRequests(crewId: string): Promise<CrewJoinRequest[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_join_requests")
        .select("*")
        .eq("crew_id", crewId)
        .order("requested_at", { ascending: false });

    if (error) {
        console.error("[getJoinRequests] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbJoinRequest);
}

/**
 * 대기 중인 가입 신청 수
 */
export async function getPendingRequestCount(crewId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
        .from("crew_join_requests")
        .select("*", { count: "exact", head: true })
        .eq("crew_id", crewId)
        .eq("status", "pending");

    if (error) {
        console.error("[getPendingRequestCount] Error:", error);
        throw error;
    }

    return count ?? 0;
}

/**
 * 가입 신청 여부 확인
 */
export async function hasJoinRequest(
    crewId: string,
    userId: string
): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_join_requests")
        .select("id")
        .eq("crew_id", crewId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("[hasJoinRequest] Error:", error);
        throw error;
    }

    return !!data;
}

/**
 * 가입 신청
 */
export async function requestJoinCrew(
    crewId: string,
    userId: string,
    message?: string
): Promise<CrewJoinRequest> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_join_requests")
        .insert({
            crew_id: crewId,
            user_id: userId,
            message: message || null,
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error("Already requested to join");
        }
        console.error("[requestJoinCrew] Error:", error);
        throw error;
    }

    return transformDbJoinRequest(data);
}

/**
 * 가입 신청 승인
 */
export async function approveJoinRequest(
    requestId: string,
    processedBy: string
): Promise<void> {
    const supabase = createClient();

    // 신청 정보 조회
    const { data: request, error: fetchError } = await supabase
        .from("crew_join_requests")
        .select("*")
        .eq("id", requestId)
        .single();

    if (fetchError) {
        console.error("[approveJoinRequest] Fetch error:", fetchError);
        throw fetchError;
    }

    // 신청 상태 업데이트
    const { error: updateError } = await supabase
        .from("crew_join_requests")
        .update({
            status: "approved",
            processed_at: new Date().toISOString(),
            processed_by: processedBy,
        })
        .eq("id", requestId);

    if (updateError) {
        console.error("[approveJoinRequest] Update error:", updateError);
        throw updateError;
    }

    // 멤버로 추가
    const { error: memberError } = await supabase.from("crew_members").insert({
        crew_id: request.crew_id,
        user_id: request.user_id,
        role: "member",
    });

    if (memberError && memberError.code !== "23505") {
        console.error("[approveJoinRequest] Member insert error:", memberError);
        throw memberError;
    }
}

/**
 * 가입 신청 거절
 */
export async function rejectJoinRequest(
    requestId: string,
    processedBy: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("crew_join_requests")
        .update({
            status: "rejected",
            processed_at: new Date().toISOString(),
            processed_by: processedBy,
        })
        .eq("id", requestId);

    if (error) {
        console.error("[rejectJoinRequest] Error:", error);
        throw error;
    }
}

// ===== Announcements =====

/**
 * 크루 공지 목록 조회
 */
export async function getCrewAnnouncements(
    crewId: string
): Promise<CrewAnnouncement[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_announcements")
        .select("*")
        .eq("crew_id", crewId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getCrewAnnouncements] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbAnnouncement);
}

/**
 * 공지 작성
 */
export async function createAnnouncement(
    crewId: string,
    authorId: string,
    content: string,
    isPinned: boolean = false
): Promise<CrewAnnouncement> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_announcements")
        .insert({
            crew_id: crewId,
            author_id: authorId,
            content,
            is_pinned: isPinned,
        })
        .select()
        .single();

    if (error) {
        console.error("[createAnnouncement] Error:", error);
        throw error;
    }

    return transformDbAnnouncement(data);
}

/**
 * 공지 삭제
 */
export async function deleteAnnouncement(announcementId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("crew_announcements")
        .delete()
        .eq("id", announcementId);

    if (error) {
        console.error("[deleteAnnouncement] Error:", error);
        throw error;
    }
}

/**
 * 공지 고정/해제 토글
 */
export async function toggleAnnouncementPin(
    announcementId: string,
    isPinned: boolean
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("crew_announcements")
        .update({ is_pinned: isPinned })
        .eq("id", announcementId);

    if (error) {
        console.error("[toggleAnnouncementPin] Error:", error);
        throw error;
    }
}

// ===== Crew Events =====

/**
 * 크루 관심 행사 목록 조회
 */
export async function getCrewEvents(crewId: string): Promise<CrewEvent[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("crew_events")
        .select("*")
        .eq("crew_id", crewId)
        .order("added_at", { ascending: false });

    if (error) {
        console.error("[getCrewEvents] Error:", error);
        throw error;
    }

    return (data ?? []).map(transformDbCrewEvent);
}

/**
 * 크루 행사 추가
 */
export async function addCrewEvent(
    crewId: string,
    eventId: string,
    addedBy: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from("crew_events").insert({
        crew_id: crewId,
        event_id: eventId,
        added_by: addedBy,
    });

    if (error) {
        if (error.code === "23505") {
            // already added
            return;
        }
        console.error("[addCrewEvent] Error:", error);
        throw error;
    }
}

/**
 * 크루 행사 제거
 */
export async function removeCrewEvent(
    crewId: string,
    eventId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("crew_events")
        .delete()
        .eq("crew_id", crewId)
        .eq("event_id", eventId);

    if (error) {
        console.error("[removeCrewEvent] Error:", error);
        throw error;
    }
}
