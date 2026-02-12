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
    Settings,
    ChevronRight,
    X,
    Globe,
    Power,
    PowerOff,
    FileText,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CrawlStats {
    activeSources: number;
    totalSources: number;
    pendingSuggestions: number;
    todayRuns: number;
    todayDiscovered: number;
    autoApproved: number;
    manualPending: number;
    errorCount: number;
}

interface CrawlSource {
    id: string;
    name: string;
    source_type: string;
    base_url: string;
    is_active: boolean;
    schedule_cron: string | null;
    last_run_at: string | null;
    created_at: string;
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
    error_log: string | null;
    source_name?: string;
}

type TabType = "overview" | "sources" | "errors";

export default function CrawlDashboardPage() {
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [stats, setStats] = useState<CrawlStats>({
        activeSources: 0,
        totalSources: 0,
        pendingSuggestions: 0,
        todayRuns: 0,
        todayDiscovered: 0,
        autoApproved: 0,
        manualPending: 0,
        errorCount: 0,
    });
    const [sources, setSources] = useState<CrawlSource[]>([]);
    const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
    const [errorRuns, setErrorRuns] = useState<RecentRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTriggering, setIsTriggering] = useState(false);
    const [selectedRun, setSelectedRun] = useState<RecentRun | null>(null);
    const [togglingSourceId, setTogglingSourceId] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    async function fetchDashboardData() {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const today = new Date().toISOString().split("T")[0];

            const [
                sourcesResult,
                activeSourcesResult,
                suggestionsResult,
                runsResult,
                approvedResult,
                errorRunsResult,
            ] = await Promise.all([
                supabase.from("crawl_sources").select("*").order("name"),
                supabase.from("crawl_sources").select("*", { count: "exact" }).eq("is_active", true),
                supabase.from("change_suggestions").select("*", { count: "exact" }).eq("status", "pending"),
                supabase.from("crawl_runs").select("*").gte("started_at", today).order("started_at", { ascending: false }),
                supabase.from("change_suggestions").select("*", { count: "exact" }).eq("status", "auto_approved"),
                supabase.from("crawl_runs").select("*").eq("status", "failed").order("started_at", { ascending: false }).limit(20),
            ]);

            setSources(sourcesResult.data || []);

            const todayErrors = runsResult.data?.filter(r => r.errors > 0).length || 0;

            setStats({
                activeSources: activeSourcesResult.count || 0,
                totalSources: sourcesResult.data?.length || 0,
                pendingSuggestions: suggestionsResult.count || 0,
                todayRuns: runsResult.data?.length || 0,
                todayDiscovered: runsResult.data?.reduce((sum, r) => sum + (r.urls_discovered || 0), 0) || 0,
                autoApproved: approvedResult.count || 0,
                manualPending: suggestionsResult.count || 0,
                errorCount: todayErrors,
            });

            setErrorRuns(errorRunsResult.data || []);

            const { data: runs } = await supabase
                .from("crawl_runs")
                .select(`*, crawl_sources (name)`)
                .order("started_at", { ascending: false })
                .limit(20);

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

    async function triggerCrawl(sourceId?: string) {
        setIsTriggering(true);
        try {
            const url = sourceId
                ? `/api/cron/crawl-discovery?source=${sourceId}`
                : "/api/cron/crawl-discovery";

            const response = await fetch(url, { method: "GET" });
            const result = await response.json();

            if (result.success) {
                alert(`크롤링 완료: ${result.data?.newEvents || 0}개 새 행사 발견`);
                fetchDashboardData();
            } else {
                alert(`크롤링 실패: ${result.error || "알 수 없는 오류"}`);
            }
        } catch (error) {
            alert("크롤링 트리거 실패");
        } finally {
            setIsTriggering(false);
        }
    }

    async function toggleSource(sourceId: string, isActive: boolean) {
        setTogglingSourceId(sourceId);
        try {
            const supabase = createClient();
            await supabase
                .from("crawl_sources")
                .update({ is_active: !isActive })
                .eq("id", sourceId);

            setSources(prev =>
                prev.map(s => s.id === sourceId ? { ...s, is_active: !isActive } : s)
            );

            setStats(prev => ({
                ...prev,
                activeSources: prev.activeSources + (isActive ? -1 : 1),
            }));
        } catch (error) {
            console.error("[CrawlDashboard] Toggle error:", error);
            alert("소스 상태 변경 실패");
        } finally {
            setTogglingSourceId(null);
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">크롤링 대시보드</h1>
                    <p className="text-muted-foreground">
                        자동 크롤링 현황 및 소스 관리
                    </p>
                </div>
                <button
                    onClick={() => triggerCrawl()}
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
                    전체 크롤링 실행
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="활성 소스" value={`${stats.activeSources}/${stats.totalSources}`} icon={Database} />
                <StatCard title="검토 대기" value={stats.pendingSuggestions} icon={Eye} highlight={stats.pendingSuggestions > 0} />
                <StatCard title="오늘 실행" value={stats.todayRuns} icon={RefreshCw} />
                <StatCard title="오늘 에러" value={stats.errorCount} icon={AlertTriangle} highlight={stats.errorCount > 0} highlightColor="red" />
            </div>

            {stats.pendingSuggestions > 0 && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                        <span className="font-medium text-amber-800">
                            {stats.pendingSuggestions}개의 제안이 검토를 기다리고 있습니다.
                        </span>
                    </div>
                    <Link href="/admin/crawl/suggestions" className="text-amber-700 hover:text-amber-900 font-medium text-sm">
                        검토하기 →
                    </Link>
                </div>
            )}

            <div className="flex gap-2 border-b">
                {([
                    { key: "overview", label: "실행 기록", icon: Clock },
                    { key: "sources", label: "크롤 소스", icon: Database },
                    { key: "errors", label: "에러 로그", icon: AlertTriangle },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                            activeTab === tab.key
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        {tab.key === "errors" && stats.errorCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {stats.errorCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && (
                <RunsTable runs={recentRuns} onViewDetail={setSelectedRun} onTrigger={triggerCrawl} isTriggering={isTriggering} />
            )}

            {activeTab === "sources" && (
                <SourcesTable
                    sources={sources}
                    onToggle={toggleSource}
                    onTrigger={triggerCrawl}
                    togglingId={togglingSourceId}
                    isTriggering={isTriggering}
                />
            )}

            {activeTab === "errors" && (
                <ErrorsTable runs={errorRuns} onViewDetail={setSelectedRun} />
            )}

            {selectedRun && (
                <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />
            )}
        </div>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    highlight = false,
    highlightColor = "amber",
}: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    highlight?: boolean;
    highlightColor?: "amber" | "red";
}) {
    const colors = {
        amber: { bg: "bg-amber-50 border-amber-200", icon: "text-amber-600", text: "text-amber-700" },
        red: { bg: "bg-red-50 border-red-200", icon: "text-red-600", text: "text-red-700" },
    };
    const c = highlight ? colors[highlightColor] : { bg: "bg-card", icon: "text-muted-foreground", text: "" };

    return (
        <div className={cn("p-4 rounded-lg border", c.bg)}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-4 w-4", c.icon)} />
                <span className="text-sm text-muted-foreground">{title}</span>
            </div>
            <div className={cn("text-2xl font-bold", c.text)}>{value}</div>
        </div>
    );
}

function RunsTable({
    runs,
    onViewDetail,
    onTrigger,
    isTriggering,
}: {
    runs: RecentRun[];
    onViewDetail: (run: RecentRun) => void;
    onTrigger: (sourceId?: string) => void;
    isTriggering: boolean;
}) {
    if (runs.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
                아직 실행 기록이 없습니다.
            </div>
        );
    }

    return (
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
                        <th className="text-left p-3 text-sm font-medium">작업</th>
                    </tr>
                </thead>
                <tbody>
                    {runs.map((run) => (
                        <tr key={run.id} className="border-t hover:bg-muted/30">
                            <td className="p-3 text-sm">{run.source_name || run.source_id?.slice(0, 8) || "-"}</td>
                            <td className="p-3"><StatusBadge status={run.status} /></td>
                            <td className="p-3 text-sm">{run.urls_discovered}</td>
                            <td className="p-3 text-sm text-green-600">{run.auto_approved}</td>
                            <td className="p-3 text-sm text-red-600">{run.errors}</td>
                            <td className="p-3 text-sm text-muted-foreground">{formatRelativeTime(run.started_at)}</td>
                            <td className="p-3">
                                <button onClick={() => onViewDetail(run)} className="text-sm text-primary hover:underline">
                                    상세
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SourcesTable({
    sources,
    onToggle,
    onTrigger,
    togglingId,
    isTriggering,
}: {
    sources: CrawlSource[];
    onToggle: (id: string, isActive: boolean) => void;
    onTrigger: (sourceId: string) => void;
    togglingId: string | null;
    isTriggering: boolean;
}) {
    if (sources.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
                등록된 크롤 소스가 없습니다.
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="text-left p-3 text-sm font-medium">소스명</th>
                        <th className="text-left p-3 text-sm font-medium">타입</th>
                        <th className="text-left p-3 text-sm font-medium">URL</th>
                        <th className="text-left p-3 text-sm font-medium">스케줄</th>
                        <th className="text-left p-3 text-sm font-medium">마지막 실행</th>
                        <th className="text-left p-3 text-sm font-medium">상태</th>
                        <th className="text-left p-3 text-sm font-medium">작업</th>
                    </tr>
                </thead>
                <tbody>
                    {sources.map((source) => (
                        <tr key={source.id} className="border-t hover:bg-muted/30">
                            <td className="p-3">
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">{source.name}</span>
                                </div>
                            </td>
                            <td className="p-3 text-sm">{source.source_type}</td>
                            <td className="p-3 text-sm">
                                <a
                                    href={source.base_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    {new URL(source.base_url).hostname}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                                {source.schedule_cron || "수동"}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                                {source.last_run_at ? formatRelativeTime(source.last_run_at) : "-"}
                            </td>
                            <td className="p-3">
                                <button
                                    onClick={() => onToggle(source.id, source.is_active)}
                                    disabled={togglingId === source.id}
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                                        source.is_active
                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    {togglingId === source.id ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : source.is_active ? (
                                        <Power className="h-3 w-3" />
                                    ) : (
                                        <PowerOff className="h-3 w-3" />
                                    )}
                                    {source.is_active ? "활성" : "비활성"}
                                </button>
                            </td>
                            <td className="p-3">
                                <button
                                    onClick={() => onTrigger(source.id)}
                                    disabled={isTriggering || !source.is_active}
                                    className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    실행
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ErrorsTable({
    runs,
    onViewDetail,
}: {
    runs: RecentRun[];
    onViewDetail: (run: RecentRun) => void;
}) {
    if (runs.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground border rounded-lg">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                에러가 없습니다
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {runs.map((run) => (
                <div
                    key={run.id}
                    className="p-4 border border-red-200 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => onViewDetail(run)}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <span className="font-medium text-red-800">
                                    {run.source_name || "Unknown Source"}
                                </span>
                            </div>
                            <p className="text-sm text-red-600 mt-1">
                                {run.errors}개 에러 발생
                            </p>
                            {run.error_log && (
                                <p className="text-xs text-red-500 mt-2 line-clamp-2 font-mono">
                                    {run.error_log}
                                </p>
                            )}
                        </div>
                        <div className="text-xs text-red-500">
                            {formatRelativeTime(run.started_at)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function RunDetailModal({
    run,
    onClose,
}: {
    run: RecentRun;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-background rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">크롤 실행 상세</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">상태</span>
                        <StatusBadge status={run.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <div className="text-2xl font-bold">{run.urls_discovered}</div>
                            <div className="text-xs text-muted-foreground">발견</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">{run.auto_approved}</div>
                            <div className="text-xs text-muted-foreground">자동 승인</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <div className="text-2xl font-bold">{run.new_events}</div>
                            <div className="text-xs text-muted-foreground">새 행사</div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <div className="text-2xl font-bold text-red-600">{run.errors}</div>
                            <div className="text-xs text-muted-foreground">에러</div>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">소스</span>
                            <span>{run.source_name || run.source_id?.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">실행 타입</span>
                            <span>{run.run_type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">시작 시간</span>
                            <span>{new Date(run.started_at).toLocaleString("ko-KR")}</span>
                        </div>
                        {run.completed_at && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">완료 시간</span>
                                <span>{new Date(run.completed_at).toLocaleString("ko-KR")}</span>
                            </div>
                        )}
                    </div>

                    {run.error_log && (
                        <div className="space-y-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                에러 로그
                            </span>
                            <pre className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 overflow-x-auto whitespace-pre-wrap font-mono">
                                {run.error_log}
                            </pre>
                        </div>
                    )}
                </div>
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
