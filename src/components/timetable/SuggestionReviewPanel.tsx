"use client";

import { useState } from "react";
import {
    X,
    Check,
    XCircle,
    Clock,
    User,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    MessageCircle,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/date-format";
import {
    TimetableSuggestion,
    CHANGE_TYPE_LABELS,
    SUGGESTION_STATUS_LABELS,
    getSuggestionSummary,
} from "@/types/timetable-suggestion";
import { Slot, OperationalSlot, OPERATIONAL_SLOT_LABELS, OperationalSlotType } from "@/types/event";

interface SuggestionReviewPanelProps {
    isOpen: boolean;
    onClose: () => void;
    suggestions: TimetableSuggestion[];
    onApprove: (suggestionId: string) => Promise<boolean>;
    onReject: (suggestionId: string, reason?: string) => Promise<boolean>;
    isLoading?: boolean;
}

export function SuggestionReviewPanel({
    isOpen,
    onClose,
    suggestions,
    onApprove,
    onReject,
    isLoading = false,
}: SuggestionReviewPanelProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const pendingSuggestions = suggestions.filter((s) => s.status === "pending");
    const processedSuggestions = suggestions.filter((s) => s.status !== "pending");

    // 승인 핸들러
    const handleApprove = async (suggestionId: string) => {
        setProcessingId(suggestionId);
        await onApprove(suggestionId);
        setProcessingId(null);
    };

    // 반려 핸들러
    const handleReject = async (suggestionId: string) => {
        setProcessingId(suggestionId);
        await onReject(suggestionId, rejectReason.trim() || undefined);
        setProcessingId(null);
        setRejectingId(null);
        setRejectReason("");
    };

    // 시간 포맷
    const formatDate = (date: Date) => {
        const d = new Date(date);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${month}/${day} ${hours}:${minutes}`;
    };

    // 변경 내용 요약
    const getChangeDescription = (suggestion: TimetableSuggestion) => {
        const afterData = suggestion.afterData as Partial<Slot | OperationalSlot>;

        if (suggestion.changeType.includes("delete")) {
            return "삭제 요청";
        }

        const parts: string[] = [];

        // 시간 정보
        if (afterData.startAt) {
            const startTime = formatTime(afterData.startAt);
            const endTime = afterData.endAt ? formatTime(afterData.endAt) : "";
            parts.push(`${startTime}${endTime ? ` ~ ${endTime}` : ""}`);
        }

        // 아티스트 슬롯
        const slotData = afterData as Partial<Slot>;
        if (slotData.stage) {
            parts.push(slotData.stage);
        }

        // 운영 슬롯
        const opData = afterData as Partial<OperationalSlot>;
        if (opData.type) {
            const typeLabel = OPERATIONAL_SLOT_LABELS[opData.type as OperationalSlotType];
            parts.push(typeLabel?.label || opData.type);
        }
        if (opData.location) {
            parts.push(opData.location);
        }

        return parts.join(" · ") || "변경 내용";
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="font-bold text-lg">수정 제안 검토</h2>
                        <p className="text-xs text-muted-foreground">
                            {pendingSuggestions.length}개의 대기 중인 제안
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 제안 목록 */}
                <div className="flex-1 overflow-y-auto">
                    {/* 대기 중인 제안 */}
                    {pendingSuggestions.length > 0 ? (
                        <div className="p-4 space-y-3">
                            {pendingSuggestions.map((suggestion) => {
                                const isExpanded = expandedId === suggestion.id;
                                const isRejecting = rejectingId === suggestion.id;
                                const isProcessing = processingId === suggestion.id;
                                const typeLabel = CHANGE_TYPE_LABELS[suggestion.changeType];

                                return (
                                    <div
                                        key={suggestion.id}
                                        className={cn(
                                            "border rounded-xl overflow-hidden transition-all",
                                            isExpanded && "ring-2 ring-primary/20"
                                        )}
                                    >
                                        {/* 제안 헤더 */}
                                        <button
                                            onClick={() =>
                                                setExpandedId(isExpanded ? null : suggestion.id)
                                            }
                                            className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                                        >
                                            {/* 유형 아이콘 */}
                                            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                                                <span className="text-lg">{typeLabel.icon}</span>
                                            </div>

                                            {/* 내용 */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {getSuggestionSummary(suggestion)}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <User className="h-3 w-3" />
                                                    <span>
                                                        {suggestion.suggesterNickname || "익명"}
                                                    </span>
                                                    <span>·</span>
                                                    <span>{formatDate(suggestion.createdAt)}</span>
                                                </div>
                                            </div>

                                            {/* 확장 아이콘 */}
                                            {isExpanded ? (
                                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </button>

                                        {/* 상세 내용 */}
                                        {isExpanded && (
                                            <div className="px-3 pb-3 space-y-3">
                                                {/* 변경 내용 */}
                                                <div className="p-3 bg-muted/30 rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                        변경 내용
                                                    </p>
                                                    <p className="text-sm font-medium">
                                                        {getChangeDescription(suggestion)}
                                                    </p>
                                                </div>

                                                {/* 변경 이유 */}
                                                {suggestion.reason && (
                                                    <div className="p-3 bg-blue-50 rounded-lg">
                                                        <div className="flex items-center gap-1.5 text-xs text-blue-700 mb-1">
                                                            <MessageCircle className="h-3 w-3" />
                                                            <span>제안 이유</span>
                                                        </div>
                                                        <p className="text-sm text-blue-900">
                                                            {suggestion.reason}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* 반려 이유 입력 */}
                                                {isRejecting && (
                                                    <div className="p-3 bg-red-50 rounded-lg">
                                                        <label className="text-xs text-red-700 mb-1 block">
                                                            반려 사유 (선택)
                                                        </label>
                                                        <textarea
                                                            value={rejectReason}
                                                            onChange={(e) =>
                                                                setRejectReason(e.target.value)
                                                            }
                                                            placeholder="반려 사유를 입력하세요"
                                                            rows={2}
                                                            className="w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-sm resize-none"
                                                        />
                                                    </div>
                                                )}

                                                {/* 액션 버튼 */}
                                                <div className="flex gap-2">
                                                    {isRejecting ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setRejectingId(null);
                                                                    setRejectReason("");
                                                                }}
                                                                disabled={isProcessing}
                                                                className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                                                            >
                                                                취소
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleReject(suggestion.id)
                                                                }
                                                                disabled={isProcessing}
                                                                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                {isProcessing ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <XCircle className="h-4 w-4" />
                                                                )}
                                                                반려하기
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() =>
                                                                    setRejectingId(suggestion.id)
                                                                }
                                                                disabled={isProcessing}
                                                                className="flex-1 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                                반려
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleApprove(suggestion.id)
                                                                }
                                                                disabled={isProcessing}
                                                                className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
                                                            >
                                                                {isProcessing ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="h-4 w-4" />
                                                                )}
                                                                승인
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium mb-1">대기 중인 제안이 없습니다</p>
                            <p className="text-xs">
                                다른 사용자가 수정을 제안하면 여기에 표시됩니다
                            </p>
                        </div>
                    )}

                    {/* 처리된 제안 */}
                    {processedSuggestions.length > 0 && (
                        <div className="border-t">
                            <div className="p-4 pb-2">
                                <h3 className="text-xs font-medium text-muted-foreground">
                                    처리된 제안 ({processedSuggestions.length})
                                </h3>
                            </div>
                            <div className="px-4 pb-4 space-y-2">
                                {processedSuggestions.slice(0, 5).map((suggestion) => {
                                    const statusLabel =
                                        SUGGESTION_STATUS_LABELS[suggestion.status];
                                    const typeLabel = CHANGE_TYPE_LABELS[suggestion.changeType];

                                    return (
                                        <div
                                            key={suggestion.id}
                                            className="p-3 border rounded-lg opacity-60"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{typeLabel.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm truncate">
                                                        {getSuggestionSummary(suggestion)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {suggestion.suggesterNickname} ·{" "}
                                                        {formatDate(suggestion.createdAt)}
                                                    </p>
                                                </div>
                                                <span
                                                    className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-medium",
                                                        suggestion.status === "approved" &&
                                                            "bg-green-100 text-green-700",
                                                        suggestion.status === "rejected" &&
                                                            "bg-red-100 text-red-700"
                                                    )}
                                                >
                                                    {statusLabel.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
