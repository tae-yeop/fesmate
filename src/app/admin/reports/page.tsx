"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    RefreshCw,
    Search,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    Eye,
    User,
    FileText,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getReports,
    getReportStats,
    updateReportStatus,
    logAdminAction,
    type DbReport,
    type ReportStats,
} from "@/lib/supabase/queries";
import {
    ReportStatus,
    ReportReason,
    REPORT_STATUS_LABELS,
    REPORT_REASON_LABELS,
} from "@/types/report";

// =============================================
// Types
// =============================================

type TabStatus = "all" | ReportStatus;

// =============================================
// Main Component
// =============================================

export default function ReportsPage() {
    const [reports, setReports] = useState<DbReport[]>([]);
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabStatus>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedReport, setSelectedReport] = useState<DbReport | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const PAGE_SIZE = 20;

    useEffect(() => {
        fetchData();
    }, [activeTab, currentPage]);

    async function fetchData() {
        setIsLoading(true);
        try {
            // Fetch stats
            const statsData = await getReportStats();
            setStats(statsData);

            // Fetch reports with filter
            const statusFilter = activeTab === "all" ? undefined : activeTab;
            const { data, count } = await getReports({
                status: statusFilter,
                limit: PAGE_SIZE,
                offset: currentPage * PAGE_SIZE,
            });
            setReports(data);
            setTotalCount(count);
        } catch (error) {
            console.error("[ReportsPage] Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleViewDetail(report: DbReport) {
        setSelectedReport(report);
        setIsDetailOpen(true);
    }

    async function handleStatusChange(reportId: string, newStatus: ReportStatus, note?: string) {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await updateReportStatus(reportId, user.id, newStatus, note);

            // Log action
            await logAdminAction({
                adminId: user.id,
                actionType: "report_status_changed",
                targetType: "report",
                targetId: reportId,
                details: { newStatus, note },
            });

            // Refresh data
            fetchData();
            setIsDetailOpen(false);
        } catch (error) {
            console.error("[ReportsPage] Error updating status:", error);
        }
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (isLoading && reports.length === 0) {
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
                <h1 className="text-2xl font-bold">신고 관리</h1>
                <p className="text-muted-foreground">
                    접수된 신고를 검토하고 처리합니다.
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard
                        title="전체"
                        value={stats.total}
                        icon={FileText}
                    />
                    <StatCard
                        title="접수됨"
                        value={stats.pending}
                        icon={Clock}
                        highlight={stats.pending > 0}
                    />
                    <StatCard
                        title="검토 중"
                        value={stats.inReview}
                        icon={Eye}
                    />
                    <StatCard
                        title="조치 완료"
                        value={stats.actionTaken}
                        icon={CheckCircle2}
                    />
                    <StatCard
                        title="이번 주"
                        value={stats.thisWeek}
                        icon={AlertTriangle}
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                {(["all", "received", "in_review", "action_taken", "no_action"] as TabStatus[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => {
                            setActiveTab(tab);
                            setCurrentPage(0);
                        }}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                            activeTab === tab
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab === "all" ? "전체" : REPORT_STATUS_LABELS[tab]}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="신고자 또는 대상 사용자로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">대상</th>
                            <th className="text-left p-3 text-sm font-medium">사유</th>
                            <th className="text-left p-3 text-sm font-medium">상태</th>
                            <th className="text-left p-3 text-sm font-medium">신고일</th>
                            <th className="text-left p-3 text-sm font-medium">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    신고가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            reports.map((report) => (
                                <tr key={report.id} className="border-t hover:bg-muted/30">
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <TargetTypeIcon type={report.targetType} />
                                            <span className="text-sm">
                                                {report.targetType === "post" && "게시글"}
                                                {report.targetType === "comment" && "댓글"}
                                                {report.targetType === "user" && "사용자"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span className="text-sm">
                                            {REPORT_REASON_LABELS[report.reason]}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <StatusBadge status={report.status} />
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                        {formatDate(report.createdAt)}
                                    </td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => handleViewDetail(report)}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            상세보기
                                        </button>
                                    </td>
                                </tr>
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

            {/* Detail Modal */}
            {isDetailOpen && selectedReport && (
                <ReportDetailModal
                    report={selectedReport}
                    onClose={() => setIsDetailOpen(false)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}

// =============================================
// Sub Components
// =============================================

function StatCard({
    title,
    value,
    icon: Icon,
    highlight = false,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    highlight?: boolean;
}) {
    return (
        <div
            className={cn(
                "p-4 rounded-lg border",
                highlight ? "bg-amber-50 border-amber-200" : "bg-card"
            )}
        >
            <div className="flex items-center gap-2 mb-2">
                <Icon
                    className={cn(
                        "h-4 w-4",
                        highlight ? "text-amber-600" : "text-muted-foreground"
                    )}
                />
                <span className="text-sm text-muted-foreground">{title}</span>
            </div>
            <div
                className={cn(
                    "text-2xl font-bold",
                    highlight ? "text-amber-700" : ""
                )}
            >
                {value}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: ReportStatus }) {
    const config: Record<ReportStatus, { icon: React.ElementType; color: string }> = {
        received: { icon: Clock, color: "text-blue-600 bg-blue-50" },
        in_review: { icon: Eye, color: "text-amber-600 bg-amber-50" },
        action_taken: { icon: CheckCircle2, color: "text-green-600 bg-green-50" },
        no_action: { icon: XCircle, color: "text-gray-600 bg-gray-50" },
    };

    const { icon: Icon, color } = config[status];
    const label = REPORT_STATUS_LABELS[status];

    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs", color)}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

function TargetTypeIcon({ type }: { type: string }) {
    const icons: Record<string, React.ElementType> = {
        post: FileText,
        comment: MessageSquare,
        user: User,
    };
    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

// =============================================
// Report Detail Modal
// =============================================

interface ReportDetailModalProps {
    report: DbReport;
    onClose: () => void;
    onStatusChange: (reportId: string, status: ReportStatus, note?: string) => void;
}

function ReportDetailModal({ report, onClose, onStatusChange }: ReportDetailModalProps) {
    const [reviewNote, setReviewNote] = useState(report.reviewNote || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleAction(newStatus: ReportStatus) {
        setIsSubmitting(true);
        await onStatusChange(report.id, newStatus, reviewNote);
        setIsSubmitting(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-background rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">신고 상세</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted">
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">현재 상태</span>
                        <StatusBadge status={report.status} />
                    </div>

                    {/* Target Type */}
                    <div className="space-y-1">
                        <span className="text-sm font-medium">신고 대상</span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TargetTypeIcon type={report.targetType} />
                            {report.targetType === "post" && "게시글"}
                            {report.targetType === "comment" && "댓글"}
                            {report.targetType === "user" && "사용자"}
                            <span className="text-xs">({report.targetId.slice(0, 8)}...)</span>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1">
                        <span className="text-sm font-medium">신고 사유</span>
                        <p className="text-sm text-muted-foreground">
                            {REPORT_REASON_LABELS[report.reason]}
                        </p>
                    </div>

                    {/* Detail */}
                    {report.detail && (
                        <div className="space-y-1">
                            <span className="text-sm font-medium">상세 설명</span>
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                                {report.detail}
                            </p>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium">신고일</span>
                            <p className="text-muted-foreground">{formatDate(report.createdAt)}</p>
                        </div>
                        {report.reviewedAt && (
                            <div>
                                <span className="font-medium">검토일</span>
                                <p className="text-muted-foreground">{formatDate(report.reviewedAt)}</p>
                            </div>
                        )}
                    </div>

                    {/* Review Note */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">관리자 메모</label>
                        <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="처리 내용을 기록하세요..."
                            className="w-full h-24 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Actions */}
                    {(report.status === "received" || report.status === "in_review") && (
                        <div className="flex gap-2">
                            {report.status === "received" && (
                                <button
                                    onClick={() => handleAction("in_review")}
                                    disabled={isSubmitting}
                                    className="flex-1 py-2 rounded-lg font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                                >
                                    검토 시작
                                </button>
                            )}
                            <button
                                onClick={() => handleAction("action_taken")}
                                disabled={isSubmitting}
                                className="flex-1 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                            >
                                조치 완료
                            </button>
                            <button
                                onClick={() => handleAction("no_action")}
                                disabled={isSubmitting}
                                className="flex-1 py-2 rounded-lg font-medium bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50"
                            >
                                조치 없음
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
