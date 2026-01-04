/**
 * Reports Query Functions
 *
 * 신고 관리 Supabase 쿼리
 */

import { createClient } from "../client";
import type { ReportReason, ReportTargetType, ReportStatus } from "@/types/report";

// =============================================
// Types
// =============================================

export interface DbReport {
    id: string;
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    targetUserId: string;
    reason: ReportReason;
    detail?: string;
    status: ReportStatus;
    reviewedAt?: Date;
    reviewedBy?: string;
    reviewNote?: string;
    createdAt: Date;
}

export interface ReportWithDetails extends DbReport {
    reporter?: {
        id: string;
        nickname: string;
        avatarUrl?: string;
    };
    targetUser?: {
        id: string;
        nickname: string;
        avatarUrl?: string;
    };
    targetContent?: {
        type: "post" | "comment";
        content: string;
        createdAt: Date;
    };
}

export interface ReportQueryOptions {
    status?: ReportStatus | ReportStatus[];
    targetType?: ReportTargetType;
    reason?: ReportReason;
    reporterId?: string;
    targetUserId?: string;
    limit?: number;
    offset?: number;
    orderBy?: "created_at" | "reviewed_at";
    orderDirection?: "asc" | "desc";
}

export interface ReportStats {
    total: number;
    pending: number;
    inReview: number;
    actionTaken: number;
    noAction: number;
    thisWeek: number;
    byReason: Record<ReportReason, number>;
}

// =============================================
// Transform Functions
// =============================================

function transformDbRowToReport(row: Record<string, unknown>): DbReport {
    return {
        id: row.id as string,
        reporterId: row.reporter_id as string,
        targetType: row.target_type as ReportTargetType,
        targetId: row.target_id as string,
        targetUserId: row.target_user_id as string,
        reason: row.reason as ReportReason,
        detail: row.detail as string | undefined,
        status: row.status as ReportStatus,
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string) : undefined,
        reviewedBy: row.reviewed_by as string | undefined,
        reviewNote: row.review_note as string | undefined,
        createdAt: new Date(row.created_at as string),
    };
}

// =============================================
// Query Functions
// =============================================

/**
 * 신고 제출 (ReportModal에서 호출)
 */
export async function submitReport(input: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    targetUserId: string;
    reason: ReportReason;
    detail?: string;
}): Promise<DbReport> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("reports")
        .insert({
            reporter_id: input.reporterId,
            target_type: input.targetType,
            target_id: input.targetId,
            target_user_id: input.targetUserId,
            reason: input.reason,
            detail: input.detail || null,
            status: "received",
        })
        .select()
        .single();

    if (error) {
        console.error("[submitReport] Error:", error);
        throw error;
    }

    return transformDbRowToReport(data);
}

/**
 * 신고 목록 조회 (Admin)
 */
export async function getReports(
    options: ReportQueryOptions = {}
): Promise<{ data: DbReport[]; count: number }> {
    const supabase = createClient();
    const {
        status,
        targetType,
        reason,
        reporterId,
        targetUserId,
        limit = 20,
        offset = 0,
        orderBy = "created_at",
        orderDirection = "desc",
    } = options;

    let query = supabase
        .from("reports")
        .select("*", { count: "exact" });

    // Filters
    if (status) {
        if (Array.isArray(status)) {
            query = query.in("status", status);
        } else {
            query = query.eq("status", status);
        }
    }
    if (targetType) {
        query = query.eq("target_type", targetType);
    }
    if (reason) {
        query = query.eq("reason", reason);
    }
    if (reporterId) {
        query = query.eq("reporter_id", reporterId);
    }
    if (targetUserId) {
        query = query.eq("target_user_id", targetUserId);
    }

    // Ordering & Pagination
    query = query
        .order(orderBy, { ascending: orderDirection === "asc" })
        .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error("[getReports] Error:", error);
        throw error;
    }

    return {
        data: (data || []).map(transformDbRowToReport),
        count: count || 0,
    };
}

/**
 * 단일 신고 조회 (상세 정보 포함)
 */
export async function getReportById(reportId: string): Promise<ReportWithDetails | null> {
    const supabase = createClient();

    const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

    if (reportError) {
        if (reportError.code === "PGRST116") return null; // Not found
        console.error("[getReportById] Error:", reportError);
        throw reportError;
    }

    const report = transformDbRowToReport(reportData);

    // Fetch reporter info
    const { data: reporterData } = await supabase
        .from("users")
        .select("id, nickname, avatar_url")
        .eq("id", report.reporterId)
        .single();

    // Fetch target user info
    const { data: targetUserData } = await supabase
        .from("users")
        .select("id, nickname, avatar_url")
        .eq("id", report.targetUserId)
        .single();

    // Fetch target content if post or comment
    let targetContent: ReportWithDetails["targetContent"];
    if (report.targetType === "post") {
        const { data: postData } = await supabase
            .from("posts")
            .select("content, created_at")
            .eq("id", report.targetId)
            .single();
        if (postData) {
            targetContent = {
                type: "post",
                content: postData.content as string,
                createdAt: new Date(postData.created_at as string),
            };
        }
    } else if (report.targetType === "comment") {
        const { data: commentData } = await supabase
            .from("comments")
            .select("content, created_at")
            .eq("id", report.targetId)
            .single();
        if (commentData) {
            targetContent = {
                type: "comment",
                content: commentData.content as string,
                createdAt: new Date(commentData.created_at as string),
            };
        }
    }

    return {
        ...report,
        reporter: reporterData ? {
            id: reporterData.id,
            nickname: reporterData.nickname,
            avatarUrl: reporterData.avatar_url,
        } : undefined,
        targetUser: targetUserData ? {
            id: targetUserData.id,
            nickname: targetUserData.nickname,
            avatarUrl: targetUserData.avatar_url,
        } : undefined,
        targetContent,
    };
}

/**
 * 신고 상태 변경 (Admin)
 */
export async function updateReportStatus(
    reportId: string,
    adminId: string,
    status: ReportStatus,
    reviewNote?: string
): Promise<DbReport> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("reports")
        .update({
            status,
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminId,
            review_note: reviewNote || null,
        })
        .eq("id", reportId)
        .select()
        .single();

    if (error) {
        console.error("[updateReportStatus] Error:", error);
        throw error;
    }

    return transformDbRowToReport(data);
}

/**
 * 신고 통계 조회 (Dashboard)
 */
export async function getReportStats(): Promise<ReportStats> {
    const supabase = createClient();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 병렬로 통계 조회
    const [
        totalResult,
        pendingResult,
        inReviewResult,
        actionTakenResult,
        noActionResult,
        thisWeekResult,
        byReasonResult,
    ] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "received"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "in_review"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "action_taken"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "no_action"),
        supabase.from("reports").select("*", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()),
        supabase.from("reports").select("reason"),
    ]);

    // Count by reason
    const byReason: Record<ReportReason, number> = {
        spam: 0,
        scam: 0,
        abuse: 0,
        hate: 0,
        harassment: 0,
        privacy: 0,
        illegal: 0,
        other: 0,
    };

    if (byReasonResult.data) {
        for (const row of byReasonResult.data) {
            const reason = row.reason as ReportReason;
            if (reason in byReason) {
                byReason[reason]++;
            }
        }
    }

    return {
        total: totalResult.count || 0,
        pending: pendingResult.count || 0,
        inReview: inReviewResult.count || 0,
        actionTaken: actionTakenResult.count || 0,
        noAction: noActionResult.count || 0,
        thisWeek: thisWeekResult.count || 0,
        byReason,
    };
}

/**
 * 특정 사용자의 신고 이력 조회 (받은 신고)
 */
export async function getReportsAgainstUser(
    userId: string,
    limit = 10
): Promise<DbReport[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("target_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("[getReportsAgainstUser] Error:", error);
        throw error;
    }

    return (data || []).map(transformDbRowToReport);
}

/**
 * 특정 사용자가 제출한 신고 이력 조회
 */
export async function getReportsByUser(
    userId: string,
    limit = 10
): Promise<DbReport[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("reporter_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("[getReportsByUser] Error:", error);
        throw error;
    }

    return (data || []).map(transformDbRowToReport);
}

/**
 * 대기 중인 신고 수 조회 (배지용)
 */
export async function getPendingReportCount(): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("status", ["received", "in_review"]);

    if (error) {
        console.error("[getPendingReportCount] Error:", error);
        return 0;
    }

    return count || 0;
}
