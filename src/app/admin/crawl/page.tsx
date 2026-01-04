"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    RefreshCw,
    Play,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    Database,
    Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CrawlStats {
    activeSources: number;
    pendingSuggestions: number;
    todayRuns: number;
    todayDiscovered: number;
    autoApproved: number;
    manualPending: number;
}

interface RecentRun {
    id: string;
    source_id: string;
    run_type: string;
    started_at: string;
    completed_at: string | null;
    status: string;
    urls_discovered: number;
    new_events: number;
    auto_approved: number;
    errors: number;
    source_name?: string;
}

/**
 * 크롤링 대시보드
 */
export default function CrawlDashboardPage() {
    const [stats, setStats] = useState<CrawlStats>({
        activeSources: 0,
        pendingSuggestions: 0,
        todayRuns: 0,
        todayDiscovered: 0,
        autoApproved: 0,
        manualPending: 0,
    });
    const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const today = new Date().toISOString().split("T")[0];

            // 병렬로 데이터 조회
            const [
                sourcesResult,
                suggestionsResult,
                runsResult,
                approvedResult,
            ] = await Promise.all([
                supabase
                    .from("crawl_sources")
                    .select("*", { count: "exact" })
                    .eq("is_active", true),
                supabase
                    .from("change_suggestions")
                    .select("*", { count: "exact" })
                    .eq("status", "pending"),
                supabase
                    .from("crawl_runs")
                    .select("*")
                    .gte("started_at", today)
                    .order("started_at", { ascending: false }),
                supabase
                    .from("change_suggestions")
                    .select("*", { count: "exact" })
                    .eq("status", "auto_approved"),
            ]);

            setStats({
                activeSources: sourcesResult.count || 0,
                pendingSuggestions: suggestionsResult.count || 0,
                todayRuns: runsResult.data?.length || 0,
                todayDiscovered: runsResult.data?.reduce(
                    (sum, r) => sum + (r.urls_discovered || 0),
                    0
                ) || 0,
                autoApproved: approvedResult.count || 0,
                manualPending: suggestionsResult.count || 0,
            });

            // 최근 실행 목록
            const { data: runs } = await supabase
                .from("crawl_runs")
                .select(`
                    *,
                    crawl_sources (name)
                `)
                .order("started_at", { ascending: false })
                .limit(10);

            setRecentRuns(
                runs?.map((r) => ({
                    ...r,
                    source_name: (r.crawl_sources as { name?: string })?.name,
                })) || []
            );
        } catch (error) {
            console.error("[CrawlDashboard] Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function triggerCrawl() {
        setIsTriggering(true);
        try {
            const response = await fetch("/api/cron/crawl-discovery", {
                method: "GET",
            });
            const result = await response.json();

            if (result.success) {
                alert(`크롤링 완료: ${result.data.newEvents}개 새 행사 발견`);
                fetchDashboardData();
            } else {
                alert(`크롤링 실패: ${result.error}`);
            }
        } catch (error) {
            alert("크롤링 트리거 실패");
        } finally {
            setIsTriggering(false);
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
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">크롤링 대시보드</h1>
                    <p className="text-muted-foreground">
                        자동 크롤링 현황 및 제안 관리
                    </p>
                </div>
                <button
                    onClick={triggerCrawl}
                    disabled={isTriggering}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg",
                        "bg-primary text-white font-medium",
                        "hover:bg-primary/90 disabled:opacity-50"
                    )}
                >
                    {isTriggering ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <Play className="h-4 w-4" />
                    )}
                    수동 크롤링 실행
                </button>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="활성 소스"
                    value={stats.activeSources}
                    icon={Database}
                />
                <StatCard
                    title="검토 대기"
                    value={stats.pendingSuggestions}
                    icon={Eye}
                    highlight={stats.pendingSuggestions > 0}
                />
                <StatCard
                    title="오늘 실행"
                    value={stats.todayRuns}
                    icon={RefreshCw}
                />
                <StatCard
                    title="오늘 발견"
                    value={stats.todayDiscovered}
                    icon={TrendingUp}
                />
            </div>

            {/* 검토 대기 알림 */}
            {stats.pendingSuggestions > 0 && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                        <span className="font-medium text-amber-800">
                            {stats.pendingSuggestions}개의 제안이 검토를 기다리고 있습니다.
                        </span>
                    </div>
                    <Link
                        href="/admin/crawl/suggestions"
                        className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                    >
                        검토하기 →
                    </Link>
                </div>
            )}

            {/* 최근 실행 */}
            <section>
                <h2 className="text-lg font-semibold mb-4">최근 크롤 실행</h2>
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-3 text-sm font-medium">소스</th>
                                <th className="text-left p-3 text-sm font-medium">상태</th>
                                <th className="text-left p-3 text-sm font-medium">발견</th>
                                <th className="text-left p-3 text-sm font-medium">자동승인</th>
                                <th className="text-left p-3 text-sm font-medium">에러</th>
                                <th className="text-left p-3 text-sm font-medium">시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentRuns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        아직 실행 기록이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                recentRuns.map((run) => (
                                    <tr key={run.id} className="border-t">
                                        <td className="p-3 text-sm">
                                            {run.source_name || run.source_id?.slice(0, 8) || "-"}
                                        </td>
                                        <td className="p-3">
                                            <StatusBadge status={run.status} />
                                        </td>
                                        <td className="p-3 text-sm">{run.urls_discovered}</td>
                                        <td className="p-3 text-sm text-green-600">
                                            {run.auto_approved}
                                        </td>
                                        <td className="p-3 text-sm text-red-600">{run.errors}</td>
                                        <td className="p-3 text-sm text-muted-foreground">
                                            {formatRelativeTime(run.started_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

// =============================================
// 하위 컴포넌트
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

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { icon: React.ElementType; color: string; label: string }> = {
        running: { icon: RefreshCw, color: "text-blue-600 bg-blue-50", label: "실행 중" },
        completed: { icon: CheckCircle2, color: "text-green-600 bg-green-50", label: "완료" },
        failed: { icon: XCircle, color: "text-red-600 bg-red-50", label: "실패" },
        partial: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50", label: "일부 성공" },
    };

    const { icon: Icon, color, label } = config[status] || config.failed;

    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs", color)}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}일 전`;
}
