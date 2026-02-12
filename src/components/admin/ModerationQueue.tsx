"use client";

import { useState } from "react";
import {
    AlertTriangle,
    FileText,
    MessageSquare,
    User,
    Lightbulb,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    ChevronDown,
    ChevronUp,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================
// Types
// =============================================

export interface ModerationItem {
    id: string;
    type: "report" | "suggestion" | "content" | "user";
    title: string;
    description: string;
    submittedBy: string;
    submittedAt: Date;
    priority: "low" | "medium" | "high";
    targetId?: string;
    targetType?: string;
    /** Additional metadata */
    metadata?: {
        reportCount?: number;
        reason?: string;
        status?: string;
    };
}

export interface ModerationQueueProps {
    items: ModerationItem[];
    onAction: (itemId: string, action: "approve" | "reject" | "view") => void;
    isLoading?: boolean;
    /** Optional title for the queue */
    title?: string;
    /** Show expanded details by default */
    expandedByDefault?: boolean;
}

// =============================================
// Main Component
// =============================================

export function ModerationQueue({
    items,
    onAction,
    isLoading = false,
    title = "검토 대기",
    expandedByDefault = false,
}: ModerationQueueProps) {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(
        expandedByDefault ? new Set(items.map((i) => i.id)) : new Set()
    );

    function toggleExpanded(itemId: string) {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    }

    if (isLoading) {
        return (
            <div className="border rounded-lg p-8 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="border rounded-lg p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">검토 대기 중인 항목이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {title && (
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{title}</h3>
                    <span className="text-sm text-muted-foreground">
                        {items.length}건
                    </span>
                </div>
            )}

            <div className="border rounded-lg divide-y overflow-hidden">
                {items.map((item) => (
                    <ModerationQueueItem
                        key={item.id}
                        item={item}
                        isExpanded={expandedItems.has(item.id)}
                        onToggleExpand={() => toggleExpanded(item.id)}
                        onAction={onAction}
                    />
                ))}
            </div>
        </div>
    );
}

// =============================================
// Queue Item Component
// =============================================

interface ModerationQueueItemProps {
    item: ModerationItem;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onAction: (itemId: string, action: "approve" | "reject" | "view") => void;
}

function ModerationQueueItem({
    item,
    isExpanded,
    onToggleExpand,
    onAction,
}: ModerationQueueItemProps) {
    return (
        <div
            className={cn(
                "bg-card transition-colors",
                item.priority === "high" && "bg-red-50/50"
            )}
        >
            {/* Main Row */}
            <div className="p-3 flex items-center gap-3">
                {/* Type Icon */}
                <div
                    className={cn(
                        "p-2 rounded-full shrink-0",
                        item.priority === "high"
                            ? "bg-red-100 text-red-600"
                            : item.priority === "medium"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-muted text-muted-foreground"
                    )}
                >
                    <ItemTypeIcon type={item.type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{item.title}</h4>
                        <PriorityBadge priority={item.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{item.submittedBy}</span>
                        <span>&middot;</span>
                        <span>{formatRelativeTime(item.submittedAt)}</span>
                        {item.metadata?.reportCount && item.metadata.reportCount > 1 && (
                            <>
                                <span>&middot;</span>
                                <span className="text-red-600 font-medium">
                                    {item.metadata.reportCount}건 신고
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onAction(item.id, "approve")}
                        className="p-1.5 rounded-lg hover:bg-green-100 text-green-600"
                        title="승인"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onAction(item.id, "reject")}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-600"
                        title="거절"
                    >
                        <XCircle className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onAction(item.id, "view")}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                        title="상세보기"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground ml-1"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                    <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-muted-foreground">유형: </span>
                                <span className="font-medium">{getItemTypeLabel(item.type)}</span>
                            </div>
                            {item.targetType && (
                                <div>
                                    <span className="text-muted-foreground">대상: </span>
                                    <span className="font-medium">{item.targetType}</span>
                                </div>
                            )}
                            {item.metadata?.reason && (
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">사유: </span>
                                    <span className="font-medium">{item.metadata.reason}</span>
                                </div>
                            )}
                            {item.metadata?.status && (
                                <div>
                                    <span className="text-muted-foreground">상태: </span>
                                    <span className="font-medium">{item.metadata.status}</span>
                                </div>
                            )}
                        </div>
                        <p className="text-muted-foreground">{item.description}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================
// Helper Components
// =============================================

function ItemTypeIcon({ type }: { type: ModerationItem["type"] }) {
    const icons: Record<ModerationItem["type"], React.ElementType> = {
        report: AlertTriangle,
        suggestion: Lightbulb,
        content: FileText,
        user: User,
    };
    const Icon = icons[type];
    return <Icon className="h-4 w-4" />;
}

function PriorityBadge({ priority }: { priority: ModerationItem["priority"] }) {
    const config: Record<
        ModerationItem["priority"],
        { label: string; className: string }
    > = {
        high: { label: "긴급", className: "bg-red-100 text-red-700" },
        medium: { label: "보통", className: "bg-amber-100 text-amber-700" },
        low: { label: "낮음", className: "bg-gray-100 text-gray-600" },
    };

    const { label, className } = config[priority];

    return (
        <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", className)}>
            {label}
        </span>
    );
}

function getItemTypeLabel(type: ModerationItem["type"]): string {
    const labels: Record<ModerationItem["type"], string> = {
        report: "신고",
        suggestion: "제안",
        content: "콘텐츠",
        user: "사용자",
    };
    return labels[type];
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

export default ModerationQueue;
