/**
 * Admin Query Functions
 *
 * 관리자 전용 작업 및 감사 로그
 */

import { createClient } from "../client";

// =============================================
// Types
// =============================================

export type AdminActionType =
    // Report actions
    | "report_reviewed"
    | "report_status_changed"
    // Event actions
    | "event_created"
    | "event_edited"
    | "event_status_changed"
    | "event_deleted"
    // User actions
    | "user_suspended"
    | "user_unsuspended"
    | "user_warned"
    | "user_role_changed"
    // Content actions
    | "post_deleted"
    | "post_hidden"
    | "comment_deleted"
    | "comment_hidden"
    // Crawl actions
    | "crawl_suggestion_approved"
    | "crawl_suggestion_rejected"
    | "crawl_source_added"
    | "crawl_source_edited";

export interface AuditLog {
    id: string;
    adminId: string;
    actionType: AdminActionType;
    targetType?: string;
    targetId?: string;
    details: Record<string, unknown>;
    ipAddress?: string;
    createdAt: Date;
    // Joined fields
    adminNickname?: string;
    adminAvatarUrl?: string;
}

export interface AuditLogQueryOptions {
    adminId?: string;
    actionType?: AdminActionType | AdminActionType[];
    targetType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export interface AdminDashboardStats {
    reports: {
        total: number;
        pending: number;
        thisWeek: number;
    };
    events: {
        total: number;
        upcoming: number;
        thisWeek: number;
    };
    users: {
        total: number;
        suspended: number;
        newThisWeek: number;
    };
    posts: {
        total: number;
        todayCount: number;
    };
    crawling: {
        pendingSuggestions: number;
        todayRuns: number;
    };
}

export interface UserWithSuspension {
    id: string;
    nickname: string;
    email?: string;
    avatarUrl?: string;
    role: string;
    suspendedAt?: Date;
    suspendedUntil?: Date;
    suspensionReason?: string;
    warningCount: number;
    createdAt: Date;
}

// =============================================
// Action Type Labels (Korean)
// =============================================

export const ACTION_TYPE_LABELS: Record<AdminActionType, string> = {
    report_reviewed: "신고 검토",
    report_status_changed: "신고 상태 변경",
    event_created: "행사 생성",
    event_edited: "행사 수정",
    event_status_changed: "행사 상태 변경",
    event_deleted: "행사 삭제",
    user_suspended: "사용자 정지",
    user_unsuspended: "정지 해제",
    user_warned: "경고 부여",
    user_role_changed: "권한 변경",
    post_deleted: "글 삭제",
    post_hidden: "글 숨김",
    comment_deleted: "댓글 삭제",
    comment_hidden: "댓글 숨김",
    crawl_suggestion_approved: "크롤링 제안 승인",
    crawl_suggestion_rejected: "크롤링 제안 거절",
    crawl_source_added: "크롤링 소스 추가",
    crawl_source_edited: "크롤링 소스 수정",
};

// =============================================
// Transform Functions
// =============================================

function transformAuditLog(row: Record<string, unknown>): AuditLog {
    const users = row.users as Record<string, unknown> | null;
    return {
        id: row.id as string,
        adminId: row.admin_id as string,
        actionType: row.action_type as AdminActionType,
        targetType: row.target_type as string | undefined,
        targetId: row.target_id as string | undefined,
        details: (row.details as Record<string, unknown>) || {},
        ipAddress: row.ip_address as string | undefined,
        createdAt: new Date(row.created_at as string),
        adminNickname: users?.nickname as string | undefined,
        adminAvatarUrl: users?.profile_image as string | undefined,
    };
}

function transformUserWithSuspension(row: Record<string, unknown>): UserWithSuspension {
    return {
        id: row.id as string,
        nickname: row.nickname as string,
        email: row.email as string | undefined,
        avatarUrl: row.profile_image as string | undefined,
        role: row.role as string,
        suspendedAt: row.suspended_at ? new Date(row.suspended_at as string) : undefined,
        suspendedUntil: row.suspended_until ? new Date(row.suspended_until as string) : undefined,
        suspensionReason: row.suspension_reason as string | undefined,
        warningCount: (row.warning_count as number) || 0,
        createdAt: new Date(row.created_at as string),
    };
}

// =============================================
// Audit Log Functions
// =============================================

/**
 * 감사 로그 기록
 */
export async function logAdminAction(input: {
    adminId: string;
    actionType: AdminActionType;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
}): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from("admin_audit_logs").insert({
        admin_id: input.adminId,
        action_type: input.actionType,
        target_type: input.targetType || null,
        target_id: input.targetId || null,
        details: input.details || {},
        ip_address: input.ipAddress || null,
    });

    if (error) {
        console.error("[logAdminAction] Error:", error);
        // Don't throw - audit log failure shouldn't block the main action
    }
}

/**
 * 감사 로그 조회
 */
export async function getAuditLogs(
    options: AuditLogQueryOptions = {}
): Promise<{ data: AuditLog[]; count: number }> {
    const supabase = createClient();
    const {
        adminId,
        actionType,
        targetType,
        startDate,
        endDate,
        limit = 20,
        offset = 0,
    } = options;

    let query = supabase
        .from("admin_audit_logs")
        .select(`
            *,
            users:admin_id (nickname, profile_image)
        `, { count: "exact" });

    // Filters
    if (adminId) {
        query = query.eq("admin_id", adminId);
    }
    if (actionType) {
        if (Array.isArray(actionType)) {
            query = query.in("action_type", actionType);
        } else {
            query = query.eq("action_type", actionType);
        }
    }
    if (targetType) {
        query = query.eq("target_type", targetType);
    }
    if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
        query = query.lte("created_at", endDate.toISOString());
    }

    // Ordering & Pagination
    query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        // RLS나 권한 관련 에러는 빈 결과로 처리
        if (error.code === "PGRST116" || !error.message) {
            console.warn("[getAuditLogs] Permission or empty result, returning empty array");
            return { data: [], count: 0 };
        }
        console.error("[getAuditLogs] Error:", JSON.stringify(error, null, 2));
        throw error;
    }

    return {
        data: (data || []).map(transformAuditLog),
        count: count || 0,
    };
}

// =============================================
// User Suspension Functions
// =============================================

/**
 * 사용자 정지
 */
export async function suspendUser(
    adminId: string,
    userId: string,
    until: Date | null,
    reason: string
): Promise<void> {
    const supabase = createClient();

    // Update user
    const { error: updateError } = await supabase
        .from("users")
        .update({
            suspended_at: new Date().toISOString(),
            suspended_until: until?.toISOString() || null,
            suspension_reason: reason,
        })
        .eq("id", userId);

    if (updateError) {
        console.error("[suspendUser] Error:", updateError);
        throw updateError;
    }

    // Log action
    await logAdminAction({
        adminId,
        actionType: "user_suspended",
        targetType: "user",
        targetId: userId,
        details: {
            until: until?.toISOString() || "permanent",
            reason,
        },
    });
}

/**
 * 사용자 정지 해제
 */
export async function unsuspendUser(
    adminId: string,
    userId: string
): Promise<void> {
    const supabase = createClient();

    // Get current suspension info for logging
    const { data: userData } = await supabase
        .from("users")
        .select("suspended_at, suspended_until, suspension_reason")
        .eq("id", userId)
        .single();

    // Update user
    const { error: updateError } = await supabase
        .from("users")
        .update({
            suspended_at: null,
            suspended_until: null,
            suspension_reason: null,
        })
        .eq("id", userId);

    if (updateError) {
        console.error("[unsuspendUser] Error:", updateError);
        throw updateError;
    }

    // Log action
    await logAdminAction({
        adminId,
        actionType: "user_unsuspended",
        targetType: "user",
        targetId: userId,
        details: {
            previousSuspension: userData || {},
        },
    });
}

/**
 * 사용자 경고
 */
export async function warnUser(
    adminId: string,
    userId: string,
    reason: string
): Promise<number> {
    const supabase = createClient();

    // Increment warning count
    const { data, error } = await supabase
        .rpc("increment_warning_count", { user_id: userId });

    // Fallback if RPC doesn't exist
    if (error) {
        // Manual increment
        const { data: userData } = await supabase
            .from("users")
            .select("warning_count")
            .eq("id", userId)
            .single();

        const newCount = ((userData?.warning_count as number) || 0) + 1;

        const { error: updateError } = await supabase
            .from("users")
            .update({ warning_count: newCount })
            .eq("id", userId);

        if (updateError) {
            console.error("[warnUser] Error:", updateError);
            throw updateError;
        }

        // Log action
        await logAdminAction({
            adminId,
            actionType: "user_warned",
            targetType: "user",
            targetId: userId,
            details: {
                reason,
                warningCount: newCount,
            },
        });

        return newCount;
    }

    const newCount = (data as number) || 1;

    // Log action
    await logAdminAction({
        adminId,
        actionType: "user_warned",
        targetType: "user",
        targetId: userId,
        details: {
            reason,
            warningCount: newCount,
        },
    });

    return newCount;
}

/**
 * 사용자 목록 조회 (Admin)
 */
export async function getUsers(options: {
    search?: string;
    role?: string;
    suspendedOnly?: boolean;
    limit?: number;
    offset?: number;
} = {}): Promise<{ data: UserWithSuspension[]; count: number }> {
    const supabase = createClient();
    const { search, role, suspendedOnly, limit = 20, offset = 0 } = options;

    let query = supabase
        .from("users")
        .select("*", { count: "exact" });

    if (search) {
        query = query.or(`nickname.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (role) {
        query = query.eq("role", role);
    }
    if (suspendedOnly) {
        query = query.not("suspended_at", "is", null);
    }

    query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error("[getUsers] Error:", error);
        throw error;
    }

    return {
        data: (data || []).map(transformUserWithSuspension),
        count: count || 0,
    };
}

/**
 * 단일 사용자 조회
 */
export async function getUserById(userId: string): Promise<UserWithSuspension | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null;
        console.error("[getUserById] Error:", error);
        throw error;
    }

    return transformUserWithSuspension(data);
}

// =============================================
// Content Management Functions
// =============================================

/**
 * 글 삭제 (Admin)
 */
export async function adminDeletePost(
    adminId: string,
    postId: string,
    reason: string
): Promise<void> {
    const supabase = createClient();

    // Get post info for logging
    const { data: postData } = await supabase
        .from("posts")
        .select("user_id, content, type")
        .eq("id", postId)
        .single();

    // Delete post
    const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

    if (error) {
        console.error("[adminDeletePost] Error:", error);
        throw error;
    }

    // Log action
    await logAdminAction({
        adminId,
        actionType: "post_deleted",
        targetType: "post",
        targetId: postId,
        details: {
            reason,
            authorId: postData?.user_id,
            contentPreview: (postData?.content as string)?.slice(0, 100),
            postType: postData?.type,
        },
    });
}

/**
 * 댓글 삭제 (Admin)
 */
export async function adminDeleteComment(
    adminId: string,
    commentId: string,
    reason: string
): Promise<void> {
    const supabase = createClient();

    // Get comment info for logging
    const { data: commentData } = await supabase
        .from("comments")
        .select("user_id, content, post_id")
        .eq("id", commentId)
        .single();

    // Delete comment
    const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

    if (error) {
        console.error("[adminDeleteComment] Error:", error);
        throw error;
    }

    // Log action
    await logAdminAction({
        adminId,
        actionType: "comment_deleted",
        targetType: "comment",
        targetId: commentId,
        details: {
            reason,
            authorId: commentData?.user_id,
            postId: commentData?.post_id,
            contentPreview: (commentData?.content as string)?.slice(0, 100),
        },
    });
}

/**
 * 글 목록 조회 (Admin)
 */
export async function getPosts(options: {
    search?: string;
    type?: string;
    userId?: string;
    limit?: number;
    offset?: number;
} = {}): Promise<{ data: Record<string, unknown>[]; count: number }> {
    const supabase = createClient();
    const { search, type, userId, limit = 20, offset = 0 } = options;

    let query = supabase
        .from("posts")
        .select(`
            *,
            users:user_id (nickname, profile_image)
        `, { count: "exact" });

    if (search) {
        query = query.ilike("content", `%${search}%`);
    }
    if (type) {
        query = query.eq("type", type);
    }
    if (userId) {
        query = query.eq("user_id", userId);
    }

    query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error("[getPosts] Error:", error);
        throw error;
    }

    return {
        data: data || [],
        count: count || 0,
    };
}

/**
 * 댓글 목록 조회 (Admin)
 */
export async function getComments(options: {
    search?: string;
    postId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
} = {}): Promise<{ data: Record<string, unknown>[]; count: number }> {
    const supabase = createClient();
    const { search, postId, userId, limit = 20, offset = 0 } = options;

    let query = supabase
        .from("comments")
        .select(`
            *,
            users:user_id (nickname, profile_image)
        `, { count: "exact" });

    if (search) {
        query = query.ilike("content", `%${search}%`);
    }
    if (postId) {
        query = query.eq("post_id", postId);
    }
    if (userId) {
        query = query.eq("user_id", userId);
    }

    query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error("[getComments] Error:", error);
        throw error;
    }

    return {
        data: data || [],
        count: count || 0,
    };
}

// =============================================
// Dashboard Statistics
// =============================================

/**
 * Admin 대시보드 통계
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const supabase = createClient();
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const todayStart = new Date(now.toISOString().split("T")[0]);

    try {
    const [
        // Reports
        reportsTotal,
        reportsPending,
        reportsThisWeek,
        // Events
        eventsTotal,
        eventsUpcoming,
        eventsThisWeek,
        // Users
        usersTotal,
        usersSuspended,
        usersNewThisWeek,
        // Posts
        postsTotal,
        postsToday,
        // Crawling
        crawlPendingSuggestions,
        crawlTodayRuns,
    ] = await Promise.all([
        // Reports
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).in("status", ["received", "in_review"]),
        supabase.from("reports").select("*", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()),
        // Events
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }).gte("start_at", now.toISOString()),
        supabase.from("events").select("*", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()),
        // Users
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).not("suspended_at", "is", null),
        supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()),
        // Posts
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        // Crawling
        supabase.from("change_suggestions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("crawl_runs").select("*", { count: "exact", head: true }).gte("started_at", todayStart.toISOString()),
    ]);

    return {
        reports: {
            total: reportsTotal.count || 0,
            pending: reportsPending.count || 0,
            thisWeek: reportsThisWeek.count || 0,
        },
        events: {
            total: eventsTotal.count || 0,
            upcoming: eventsUpcoming.count || 0,
            thisWeek: eventsThisWeek.count || 0,
        },
        users: {
            total: usersTotal.count || 0,
            suspended: usersSuspended.count || 0,
            newThisWeek: usersNewThisWeek.count || 0,
        },
        posts: {
            total: postsTotal.count || 0,
            todayCount: postsToday.count || 0,
        },
        crawling: {
            pendingSuggestions: crawlPendingSuggestions.count || 0,
            todayRuns: crawlTodayRuns.count || 0,
        },
    };
    } catch (error) {
        console.warn("[getAdminDashboardStats] Error, returning defaults:", error);
        return {
            reports: { total: 0, pending: 0, thisWeek: 0 },
            events: { total: 0, upcoming: 0, thisWeek: 0 },
            users: { total: 0, suspended: 0, newThisWeek: 0 },
            posts: { total: 0, todayCount: 0 },
            crawling: { pendingSuggestions: 0, todayRuns: 0 },
        };
    }
}

// =============================================
// Event Management Functions
// =============================================

/**
 * 행사 상태 변경 (Admin)
 */
export async function updateEventStatus(
    adminId: string,
    eventId: string,
    status: string,
    reason?: string
): Promise<void> {
    const supabase = createClient();

    // Get current status for logging
    const { data: eventData } = await supabase
        .from("events")
        .select("status, title")
        .eq("id", eventId)
        .single();

    // Update event
    const { error } = await supabase
        .from("events")
        .update({ status })
        .eq("id", eventId);

    if (error) {
        console.error("[updateEventStatus] Error:", error);
        throw error;
    }

    // Log action
    await logAdminAction({
        adminId,
        actionType: "event_status_changed",
        targetType: "event",
        targetId: eventId,
        details: {
            previousStatus: eventData?.status,
            newStatus: status,
            eventTitle: eventData?.title,
            reason,
        },
    });
}

/**
 * 행사 수정 (Admin)
 */
export async function updateEvent(
    adminId: string,
    eventId: string,
    updates: Record<string, unknown>
): Promise<void> {
    const supabase = createClient();

    // Get current data for logging
    const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

    // Update event
    const { error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", eventId);

    if (error) {
        console.error("[updateEvent] Error:", error);
        throw error;
    }

    // Log action
    await logAdminAction({
        adminId,
        actionType: "event_edited",
        targetType: "event",
        targetId: eventId,
        details: {
            previous: eventData,
            changes: updates,
        },
    });
}

/**
 * 행사 삭제 (Admin)
 */
export async function deleteEvent(
    adminId: string,
    eventId: string,
    reason: string
): Promise<void> {
    const supabase = createClient();

    // Get event info for logging
    const { data: eventData } = await supabase
        .from("events")
        .select("title, start_at")
        .eq("id", eventId)
        .single();

    // Delete event
    const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

    if (error) {
        console.error("[deleteEvent] Error:", error);
        throw error;
    }

    // Log action
    await logAdminAction({
        adminId,
        actionType: "event_deleted",
        targetType: "event",
        targetId: eventId,
        details: {
            reason,
            eventTitle: eventData?.title,
            eventDate: eventData?.start_at,
        },
    });
}
