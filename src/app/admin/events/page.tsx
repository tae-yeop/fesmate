"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    RefreshCw,
    Search,
    Calendar,
    MapPin,
    Edit2,
    Trash2,
    ChevronLeft,
    ChevronRight,
    X,
    CheckCircle2,
    Clock,
    AlertTriangle,
    XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    updateEventStatus,
    updateEvent,
    deleteEvent,
    logAdminAction,
} from "@/lib/supabase/queries";

// =============================================
// Types
// =============================================

interface EventRow {
    id: string;
    title: string;
    start_at: string;
    end_at: string | null;
    status: string;
    type: string;
    poster_url: string | null;
    venue?: {
        name: string;
    } | null;
}

type EventStatus = "SCHEDULED" | "CHANGED" | "POSTPONED" | "CANCELED";

const STATUS_LABELS: Record<EventStatus, string> = {
    SCHEDULED: "예정",
    CHANGED: "변경",
    POSTPONED: "연기",
    CANCELED: "취소",
};

// =============================================
// Main Component
// =============================================

export default function EventsManagementPage() {
    const [events, setEvents] = useState<EventRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
    const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const PAGE_SIZE = 20;

    useEffect(() => {
        fetchData();
    }, [currentPage, statusFilter]);

    async function fetchData() {
        setIsLoading(true);
        try {
            const supabase = createClient();
            let query = supabase
                .from("events")
                .select(`
                    id, title, start_at, end_at, status, type, poster_url,
                    venues:venue_id (name)
                `, { count: "exact" });

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }

            if (searchQuery) {
                query = query.ilike("title", `%${searchQuery}%`);
            }

            const { data, count, error } = await query
                .order("start_at", { ascending: false })
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

            if (error) throw error;

            setEvents(
                (data || []).map((e) => ({
                    ...e,
                    venue: e.venues as unknown as { name: string } | null,
                }))
            );
            setTotalCount(count || 0);
        } catch (error) {
            console.error("[EventsManagementPage] Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    function handleSearch() {
        setCurrentPage(0);
        fetchData();
    }

    function handleEdit(event: EventRow) {
        setSelectedEvent(event);
        setIsEditOpen(true);
    }

    function handleDelete(event: EventRow) {
        setSelectedEvent(event);
        setIsDeleteOpen(true);
    }

    async function handleStatusChange(eventId: string, newStatus: EventStatus) {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await updateEventStatus(user.id, eventId, newStatus);
            fetchData();
        } catch (error) {
            console.error("[EventsManagementPage] Error updating status:", error);
        }
    }

    async function handleDeleteConfirm(reason: string) {
        if (!selectedEvent) return;

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await deleteEvent(user.id, selectedEvent.id, reason);
            setIsDeleteOpen(false);
            setSelectedEvent(null);
            fetchData();
        } catch (error) {
            console.error("[EventsManagementPage] Error deleting event:", error);
        }
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    if (isLoading && events.length === 0) {
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
                <h1 className="text-2xl font-bold">행사 관리</h1>
                <p className="text-muted-foreground">
                    행사 정보를 수정하거나 상태를 변경합니다.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="행사명으로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                    {(["all", "SCHEDULED", "CHANGED", "POSTPONED", "CANCELED"] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => {
                                setStatusFilter(status);
                                setCurrentPage(0);
                            }}
                            className={cn(
                                "px-3 py-2 text-sm rounded-lg border transition-colors",
                                statusFilter === status
                                    ? "bg-primary text-white border-primary"
                                    : "hover:bg-muted"
                            )}
                        >
                            {status === "all" ? "전체" : STATUS_LABELS[status]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left p-3 text-sm font-medium">행사</th>
                            <th className="text-left p-3 text-sm font-medium">일시</th>
                            <th className="text-left p-3 text-sm font-medium">장소</th>
                            <th className="text-left p-3 text-sm font-medium">상태</th>
                            <th className="text-left p-3 text-sm font-medium">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    행사가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            events.map((event) => (
                                <tr key={event.id} className="border-t hover:bg-muted/30">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {event.poster_url ? (
                                                <img
                                                    src={event.poster_url}
                                                    alt={event.title}
                                                    className="w-10 h-14 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                                                <p className="text-xs text-muted-foreground">{event.type}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                        {formatDate(event.start_at)}
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                        {event.venue?.name || "-"}
                                    </td>
                                    <td className="p-3">
                                        <StatusBadge status={event.status as EventStatus} />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(event)}
                                                className="p-1.5 rounded hover:bg-muted"
                                                title="수정"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(event)}
                                                className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                                title="삭제"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
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

            {/* Edit Modal */}
            {isEditOpen && selectedEvent && (
                <EventEditModal
                    event={selectedEvent}
                    onClose={() => {
                        setIsEditOpen(false);
                        setSelectedEvent(null);
                    }}
                    onSave={() => {
                        setIsEditOpen(false);
                        setSelectedEvent(null);
                        fetchData();
                    }}
                />
            )}

            {/* Delete Confirmation */}
            {isDeleteOpen && selectedEvent && (
                <DeleteConfirmModal
                    eventTitle={selectedEvent.title}
                    onClose={() => {
                        setIsDeleteOpen(false);
                        setSelectedEvent(null);
                    }}
                    onConfirm={handleDeleteConfirm}
                />
            )}
        </div>
    );
}

// =============================================
// Sub Components
// =============================================

function StatusBadge({ status }: { status: EventStatus }) {
    const config: Record<EventStatus, { icon: React.ElementType; color: string }> = {
        SCHEDULED: { icon: Clock, color: "text-blue-600 bg-blue-50" },
        CHANGED: { icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
        POSTPONED: { icon: Calendar, color: "text-orange-600 bg-orange-50" },
        CANCELED: { icon: XCircle, color: "text-red-600 bg-red-50" },
    };

    const { icon: Icon, color } = config[status] || config.SCHEDULED;
    const label = STATUS_LABELS[status] || status;

    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded text-xs", color)}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

// =============================================
// Event Edit Modal
// =============================================

interface EventEditModalProps {
    event: EventRow;
    onClose: () => void;
    onSave: () => void;
}

function EventEditModal({ event, onClose, onSave }: EventEditModalProps) {
    const [title, setTitle] = useState(event.title);
    const [status, setStatus] = useState(event.status as EventStatus);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit() {
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const updates: Record<string, unknown> = {};
            if (title !== event.title) updates.title = title;
            if (status !== event.status) updates.status = status;

            if (Object.keys(updates).length > 0) {
                await updateEvent(user.id, event.id, updates);
            }

            onSave();
        } catch (error) {
            console.error("[EventEditModal] Error:", error);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-md bg-background rounded-lg shadow-lg">
                {/* Header */}
                <div className="border-b px-4 py-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">행사 수정</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">행사명</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">상태</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(["SCHEDULED", "CHANGED", "POSTPONED", "CANCELED"] as EventStatus[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatus(s)}
                                    className={cn(
                                        "px-3 py-2 text-sm rounded-lg border transition-colors",
                                        status === s
                                            ? "bg-primary text-white border-primary"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    {STATUS_LABELS[s]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg font-medium border hover:bg-muted"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isSubmitting ? "저장 중..." : "저장"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================
// Delete Confirm Modal
// =============================================

interface DeleteConfirmModalProps {
    eventTitle: string;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

function DeleteConfirmModal({ eventTitle, onClose, onConfirm }: DeleteConfirmModalProps) {
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleConfirm() {
        if (!reason.trim()) return;
        setIsSubmitting(true);
        await onConfirm(reason);
        setIsSubmitting(false);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-background rounded-lg shadow-lg p-4 space-y-4">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold">행사 삭제</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                        &quot;{eventTitle}&quot;을(를) 삭제하시겠습니까?
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                        이 작업은 되돌릴 수 없습니다.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">삭제 사유</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="삭제 사유를 입력하세요..."
                        className="w-full h-20 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg font-medium border hover:bg-muted"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-1 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                    >
                        {isSubmitting ? "삭제 중..." : "삭제"}
                    </button>
                </div>
            </div>
        </div>
    );
}
