"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    RefreshCw,
    AlertTriangle,
    Calendar,
    Users,
    FileText,
    TrendingUp,
    Clock,
    Eye,
    CheckCircle2,
    Search,
    ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getAdminDashboardStats,
    getAuditLogs,
    ACTION_TYPE_LABELS,
    type AdminDashboardStats,
    type AuditLog,
} from "@/lib/supabase/queries";

// =============================================
// Main Component
// =============================================

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setIsLoading(true);
        try {
            const [statsData, activityData] = await Promise.all([
                getAdminDashboardStats(),
                getAuditLogs({ limit: 10 }),
            ]);
            setStats(statsData);
            setRecentActivity(activityData.data);
        } catch (error) {
            console.error("[AdminDashboard] Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
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
                <h1 className="text-2xl font-bold">Admin 대시보드</h1>
                <p className="text-muted-foreground">
                    전체 현황 및 빠른 액세스
                </p>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Reports */}
                    <StatCard
                        title="대기 중 신고"
                        value={stats.reports.pending}
                        icon={AlertTriangle}
                        highlight={stats.reports.pending > 0}
                        href="/admin/reports"
                    />
                    {/* Events */}
                    <StatCard
                        title="예정 행사"
                        value={stats.events.upcoming}
                        icon={Calendar}
                        href="/admin/events"
                    />
                    {/* Users */}
                    <StatCard
                        title="이번 주 신규 사용자"
                        value={stats.users.newThisWeek}
                        icon={Users}
                        href="/admin/users"
                    />
                    {/* Crawling */}
                    <StatCard
                        title="크롤링 대기"
                        value={stats.crawling.pendingSuggestions}
                        icon={Search}
                        highlight={stats.crawling.pendingSuggestions > 0}
                        href="/admin/crawl/suggestions"
                    />
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <QuickActionCard
                    title="신고 관리"
                    description="접수된 신고를 검토하고 처리합니다."
                    icon={AlertTriangle}
                    href="/admin/reports"
                    count={stats?.reports.pending}
                />
                <QuickActionCard
                    title="행사 관리"
                    description="행사 정보를 수정하거나 상태를 변경합니다."
                    icon={Calendar}
                    href="/admin/events"
                />
                <QuickActionCard
                    title="사용자 관리"
                    description="사용자 정보 조회 및 정지/해제를 관리합니다."
                    icon={Users}
                    href="/admin/users"
                    badge={stats?.users.suspended ? `${stats.users.suspended} 정지` : undefined}
                />
                <QuickActionCard
                    title="콘텐츠 관리"
                    description="글과 댓글을 관리합니다."
                    icon={FileText}
                    href="/admin/content"
                />
                <QuickActionCard
                    title="감사 로그"
                    description="관리자 활동 기록을 조회합니다."
                    icon={Eye}
                    href="/admin/audit"
                />
                <QuickActionCard
                    title="크롤링 대시보드"
                    description="자동 크롤링 현황을 확인합니다."
                    icon={Search}
                    href="/admin/crawl"
                />
            </div>

            {/* Recent Activity */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">최근 관리자 활동</h2>
                    <Link
                        href="/admin/audit"
                        className="text-sm text-primary hover:underline"
                    >
                        전체 보기
                    </Link>
                </div>

                <div className="border rounded-lg overflow-hidden">
                    {recentActivity.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            아직 활동 기록이 없습니다.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {recentActivity.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-3 flex items-center gap-3 hover:bg-muted/30"
                                >
                                    <ActionIcon actionType={log.actionType} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {log.adminNickname || "관리자"} &middot; {formatRelativeTime(log.createdAt)}
                                        </p>
                                    </div>
                                    {log.targetType && (
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                            {log.targetType}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Summary Stats */}
            {stats && (
                <section>
                    <h2 className="text-lg font-semibold mb-4">전체 통계</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard
                            title="전체 행사"
                            value={stats.events.total}
                            icon={Calendar}
                        />
                        <SummaryCard
                            title="전체 사용자"
                            value={stats.users.total}
                            icon={Users}
                        />
                        <SummaryCard
                            title="전체 글"
                            value={stats.posts.total}
                            icon={FileText}
                        />
                        <SummaryCard
                            title="오늘 글"
                            value={stats.posts.todayCount}
                            icon={TrendingUp}
                        />
                    </div>
                </section>
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
    href,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    highlight?: boolean;
    href?: string;
}) {
    const content = (
        <div
            className={cn(
                "p-4 rounded-lg border transition-colors",
                highlight ? "bg-amber-50 border-amber-200" : "bg-card",
                href && "hover:bg-muted/50 cursor-pointer"
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

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}

function QuickActionCard({
    title,
    description,
    icon: Icon,
    href,
    count,
    badge,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    count?: number;
    badge?: string;
}) {
    return (
        <Link
            href={href}
            className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">{title}</h3>
                </div>
                {count !== undefined && count > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                        {count}
                    </span>
                )}
                {badge && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        {badge}
                    </span>
                )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="flex items-center gap-1 mt-3 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                이동 <ArrowRight className="h-4 w-4" />
            </div>
        </Link>
    );
}

function SummaryCard({
    title,
    value,
    icon: Icon,
}: {
    title: string;
    value: number;
    icon: React.ElementType;
}) {
    return (
        <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{title}</span>
            </div>
            <div className="text-xl font-bold">{value.toLocaleString()}</div>
        </div>
    );
}

function ActionIcon({ actionType }: { actionType: string }) {
    const icons: Record<string, { icon: React.ElementType; color: string }> = {
        report_reviewed: { icon: Eye, color: "text-blue-500" },
        report_status_changed: { icon: CheckCircle2, color: "text-green-500" },
        user_suspended: { icon: AlertTriangle, color: "text-red-500" },
        user_unsuspended: { icon: CheckCircle2, color: "text-green-500" },
        user_warned: { icon: AlertTriangle, color: "text-amber-500" },
        event_edited: { icon: Calendar, color: "text-blue-500" },
        event_status_changed: { icon: Calendar, color: "text-amber-500" },
        post_deleted: { icon: FileText, color: "text-red-500" },
        comment_deleted: { icon: FileText, color: "text-red-500" },
    };

    const { icon: Icon, color } = icons[actionType] || { icon: Clock, color: "text-muted-foreground" };

    return (
        <div className={cn("p-2 rounded-full bg-muted", color)}>
            <Icon className="h-4 w-4" />
        </div>
    );
}

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}일 전`;

    return new Intl.DateTimeFormat("ko-KR", {
        month: "short",
        day: "numeric",
    }).format(date);
}
