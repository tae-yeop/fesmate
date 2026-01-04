"use client";

import { useState, useEffect } from "react";
import {
    RefreshCw,
    Clock,
    Calendar,
    Users,
    FileText,
    AlertTriangle,
    CheckCircle2,
    Eye,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getAuditLogs,
    ACTION_TYPE_LABELS,
    type AuditLog,
    type AdminActionType,
} from "@/lib/supabase/queries";

// =============================================
// Types
// =============================================

const ACTION_CATEGORIES: Record<string, AdminActionType[]> = {
    report: ["report_reviewed", "report_status_changed"],
    event: ["event_created", "event_edited", "event_status_changed", "event_deleted"],
    user: ["user_suspended", "user_unsuspended", "user_warned", "user_role_changed"],
    content: ["post_deleted", "post_hidden", "comment_deleted", "comment_hidden"],
    crawl: ["crawl_suggestion_approved", "crawl_suggestion_rejected", "crawl_source_added", "crawl_source_edited"],
};

// =============================================
// Main Component
// =============================================

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const PAGE_SIZE = 20;

    useEffect(() => {
        fetchData();
    }, [currentPage, selectedCategory]);

    async function fetchData() {
        setIsLoading(true);
        try {
            const actionTypes = selectedCategory
                ? ACTION_CATEGORIES[selectedCategory]
                : undefined;

            const { data, count } = await getAuditLogs({
                actionType: actionTypes,
                limit: PAGE_SIZE,
                offset: currentPage * PAGE_SIZE,
            });
            setLogs(data);
            setTotalCount(count);
        } catch (error) {
            console.error("[AuditLogPage] Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (isLoading && logs.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">감사 로그</h1>
                <p className="text-muted-foreground">
                    관리자 활동 기록을 조회합니다.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => {
                        setSelectedCategory(null);
                        setCurrentPage(0);
                    }}
                    className={cn(
                        "px-3 py-1.5 text-sm rounded-full border transition-colors",
                        selectedCategory === null
                            ? "bg-primary text-white border-primary"
                            : "hover:bg-muted"
                    )}
                >
                    전체
                </button>
                {Object.keys(ACTION_CATEGORIES).map((category) => (
                    <button
                        key={category}
                        onClick={() => {
                            setSelectedCategory(category);
                            setCurrentPage(0);
                        }}
                        className={cn(
                            "px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1",
                            selectedCategory === category
                                ? "bg-primary text-white border-primary"
                                : "hover:bg-muted"
                        )}
                    >
                        <CategoryIcon category={category} />
                        {getCategoryLabel(category)}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">시간</th>
                            <th className="text-left p-3 text-sm font-medium">관리자</th>
                            <th className="text-left p-3 text-sm font-medium">작업</th>
                            <th className="text-left p-3 text-sm font-medium">대상</th>
                            <th className="text-left p-3 text-sm font-medium">상세</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    로그가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <>
                                    <tr
                                        key={log.id}
                                        className="border-t hover:bg-muted/30 cursor-pointer"
                                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                    >
                                        <td className="p-3 text-sm text-muted-foreground">
                                            {formatDateTime(log.createdAt)}
                                        </td>
                                        <td className="p-3 text-sm">
                                            {log.adminNickname || log.adminId.slice(0, 8)}
                                        </td>
                                        <td className="p-3">
                                            <ActionBadge actionType={log.actionType} />
                                        </td>
                                        <td className="p-3 text-sm">
                                            {log.targetType && (
                                                <span className="text-muted-foreground">
                                                    {log.targetType}
                                                    {log.targetId && (
                                                        <span className="text-xs ml-1">
                                                            ({log.targetId.slice(0, 8)}...)
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-sm text-primary">
                                            {Object.keys(log.details).length > 0 && "상세 보기"}
                                        </td>
                                    </tr>
                                    {expandedLogId === log.id && Object.keys(log.details).length > 0 && (
                                        <tr className="bg-muted/20">
                                            <td colSpan={5} className="p-4">
                                                <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        총 {totalCount}건 중 {currentPage * PAGE_SIZE + 1}-{Math.min((currentPage + 1) * PAGE_SIZE, totalCount)}건
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================
// Sub Components
// =============================================

function CategoryIcon({ category }: { category: string }) {
    const icons: Record<string, React.ElementType> = {
        report: AlertTriangle,
        event: Calendar,
        user: Users,
        content: FileText,
        crawl: Search,
    };
    const Icon = icons[category] || Clock;
    return <Icon className="h-3.5 w-3.5" />;
}

function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        report: "신고",
        event: "행사",
        user: "사용자",
        content: "콘텐츠",
        crawl: "크롤링",
    };
    return labels[category] || category;
}

function ActionBadge({ actionType }: { actionType: AdminActionType }) {
    const colors: Record<string, string> = {
        // Report
        report_reviewed: "bg-blue-50 text-blue-600",
        report_status_changed: "bg-green-50 text-green-600",
        // Event
        event_created: "bg-green-50 text-green-600",
        event_edited: "bg-blue-50 text-blue-600",
        event_status_changed: "bg-amber-50 text-amber-600",
        event_deleted: "bg-red-50 text-red-600",
        // User
        user_suspended: "bg-red-50 text-red-600",
        user_unsuspended: "bg-green-50 text-green-600",
        user_warned: "bg-amber-50 text-amber-600",
        user_role_changed: "bg-purple-50 text-purple-600",
        // Content
        post_deleted: "bg-red-50 text-red-600",
        post_hidden: "bg-amber-50 text-amber-600",
        comment_deleted: "bg-red-50 text-red-600",
        comment_hidden: "bg-amber-50 text-amber-600",
        // Crawl
        crawl_suggestion_approved: "bg-green-50 text-green-600",
        crawl_suggestion_rejected: "bg-gray-50 text-gray-600",
        crawl_source_added: "bg-blue-50 text-blue-600",
        crawl_source_edited: "bg-blue-50 text-blue-600",
    };

    const color = colors[actionType] || "bg-gray-50 text-gray-600";
    const label = ACTION_TYPE_LABELS[actionType] || actionType;

    return (
        <span className={cn("px-2 py-1 rounded text-xs font-medium", color)}>
            {label}
        </span>
    );
}

function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}
