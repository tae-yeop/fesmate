"use client";

import { useState, useEffect } from "react";
import {
    RefreshCw,
    AlertTriangle,
    FileText,
    MessageSquare,
    User,
    Clock,
    Check,
    X,
    Eye,
    ChevronRight,
    Filter,
    Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    getReports,
    getReportStats,
    type DbReport,
    type ReportStats,
} from "@/lib/supabase/queries";
import { useTimetableSuggestion } from "@/lib/timetable-suggestion-context";
import { TimetableSuggestion } from "@/types/timetable-suggestion";
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS } from "@/types/report";

type FilterTab = "all" | "reports" | "suggestions" | "content";

interface ModerationItem {
    id: string;
    type: "report" | "suggestion" | "content";
    title: string;
    description: string;
    submittedBy: string;
    submittedAt: Date;
    priority: "low" | "medium" | "high";
    targetId?: string;
    targetType?: string;
}

export default function ModerationPage() {
    const [activeTab, setActiveTab] = useState<FilterTab>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [reportStats, setReportStats] = useState<ReportStats | null>(null);
    const [reports, setReports] = useState<DbReport[]>([]);
    const [items, setItems] = useState<ModerationItem[]>([]);

    const { suggestions } = useTimetableSuggestion();
    const pendingSuggestions = suggestions.filter(s => s.status === "pending");

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        combineItems();
    }, [reports, pendingSuggestions, activeTab]);

    async function fetchData() {
        setIsLoading(true);
        try {
            const [stats, reportsData] = await Promise.all([
                getReportStats(),
                getReports({ status: "received", limit: 50 }),
            ]);
            setReportStats(stats);
            setReports(reportsData.data);
        } catch (error) {
            console.error("[ModerationPage] Error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    function combineItems() {
        const allItems: ModerationItem[] = [];

        if (activeTab === "all" || activeTab === "reports") {
            reports.forEach(report => {
                allItems.push({
                    id: report.id,
                    type: "report",
                    title: `${report.targetType === "post" ? "게시글" : report.targetType === "comment" ? "댓글" : "사용자"} 신고`,
                    description: REPORT_REASON_LABELS[report.reason],
                    submittedBy: "신고자",
                    submittedAt: report.createdAt,
                    priority: "high",
                    targetId: report.targetId,
                    targetType: report.targetType,
                });
            });
        }

        if (activeTab === "all" || activeTab === "suggestions") {
            pendingSuggestions.forEach(sug => {
                allItems.push({
                    id: sug.id,
                    type: "suggestion",
                    title: `타임테이블 ${sug.changeType.includes("add") ? "추가" : sug.changeType.includes("edit") ? "수정" : "삭제"} 제안`,
                    description: sug.reason || "제안 이유 없음",
                    submittedBy: sug.suggesterNickname || "익명",
                    submittedAt: sug.createdAt,
                    priority: "medium",
                    targetId: sug.targetId,
                });
            });
        }

        allItems.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });

        setItems(allItems);
    }

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const diff = Date.now() - d.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return "방금 전";
        if (hours < 24) return `${hours}시간 전`;
        return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const totalPending = reports.length + pendingSuggestions.length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="h-6 w-6 text-primary" />
                    모더레이션 센터
                </h1>
                <p className="text-muted-foreground">
                    대기 중인 항목을 검토하고 처리합니다
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="전체 대기"
                    value={totalPending}
                    icon={Clock}
                    highlight={totalPending > 0}
                />
                <StatCard
                    title="신고"
                    value={reports.length}
                    icon={AlertTriangle}
                    highlight={reports.length > 0}
                />
                <StatCard
                    title="타임테이블 제안"
                    value={pendingSuggestions.length}
                    icon={FileText}
                />
                <StatCard
                    title="이번 주 처리"
                    value={reportStats?.thisWeek || 0}
                    icon={Check}
                />
            </div>

            <div className="flex gap-2 border-b overflow-x-auto">
                {(["all", "reports", "suggestions"] as FilterTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                            activeTab === tab
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab === "all" && "전체"}
                        {tab === "reports" && `신고 (${reports.length})`}
                        {tab === "suggestions" && `제안 (${pendingSuggestions.length})`}
                    </button>
                ))}
            </div>

            <div className="border rounded-lg overflow-hidden">
                {items.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p className="font-medium">모든 항목이 처리되었습니다</p>
                        <p className="text-sm mt-1">대기 중인 항목이 없습니다</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {items.map(item => (
                            <ModerationQueueItem key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

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
                highlight ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-card"
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
            <div className={cn("text-2xl font-bold", highlight && "text-amber-700 dark:text-amber-500")}>
                {value}
            </div>
        </div>
    );
}

function ModerationQueueItem({ item }: { item: ModerationItem }) {
    const getIcon = () => {
        switch (item.type) {
            case "report":
                return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case "suggestion":
                return <FileText className="h-5 w-5 text-blue-500" />;
            default:
                return <MessageSquare className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const getPriorityBadge = () => {
        const config = {
            high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
            medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
            low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
        };

        return (
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", config[item.priority])}>
                {item.priority === "high" ? "긴급" : item.priority === "medium" ? "보통" : "낮음"}
            </span>
        );
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        const diff = Date.now() - d.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return "방금 전";
        if (hours < 24) return `${hours}시간 전`;
        return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    };

    return (
        <div className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer">
            <div className="shrink-0">{getIcon()}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    {getPriorityBadge()}
                </div>
                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{item.submittedBy}</span>
                    <span>·</span>
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(item.submittedAt)}</span>
                </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
    );
}
