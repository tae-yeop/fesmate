"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    RefreshCw,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Calendar,
    MapPin,
    Users,
    AlertTriangle,
    Check,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChangeSuggestion, ExtractConfidence } from "@/types/crawl";

interface SuggestionWithData extends ChangeSuggestion {
    suggested_data: {
        title?: string;
        startAt?: string;
        endAt?: string;
        venueName?: string;
        venueAddress?: string;
        posterUrl?: string;
        price?: string;
        artists?: string[];
        description?: string;
    };
}

/**
 * 변경 제안 검토 페이지
 */
export default function SuggestionsPage() {
    const [suggestions, setSuggestions] = useState<SuggestionWithData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"pending" | "all">("pending");
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchSuggestions();
    }, [filter]);

    async function fetchSuggestions() {
        setIsLoading(true);
        try {
            const supabase = createClient();
            let query = supabase
                .from("change_suggestions")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(50);

            if (filter === "pending") {
                query = query.eq("status", "pending").eq("requires_review", true);
            }

            const { data, error } = await query;

            if (error) {
                console.error("[SuggestionsPage] Error:", error);
                return;
            }

            setSuggestions((data || []) as SuggestionWithData[]);
        } catch (error) {
            console.error("[SuggestionsPage] Error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleApprove(id: string) {
        setProcessingId(id);
        try {
            const supabase = createClient();

            // 1. 제안 조회
            const { data: suggestion } = await supabase
                .from("change_suggestions")
                .select("*")
                .eq("id", id)
                .single();

            if (!suggestion) {
                alert("제안을 찾을 수 없습니다.");
                return;
            }

            // 2. events 테이블에 삽입
            const eventData = transformToEvent(suggestion.suggested_data);
            const { data: newEvent, error: insertError } = await supabase
                .from("events")
                .insert(eventData)
                .select()
                .single();

            if (insertError) {
                console.error("[handleApprove] Insert error:", insertError);
                alert(`행사 등록 실패: ${insertError.message}`);
                return;
            }

            // 3. 제안 상태 업데이트
            await supabase
                .from("change_suggestions")
                .update({
                    status: "approved",
                    reviewed_at: new Date().toISOString(),
                    applied_at: new Date().toISOString(),
                    applied_event_id: newEvent.id,
                })
                .eq("id", id);

            alert("승인 완료!");
            fetchSuggestions();
        } catch (error) {
            console.error("[handleApprove] Error:", error);
            alert("승인 처리 중 오류가 발생했습니다.");
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(id: string) {
        const reason = prompt("거절 사유를 입력하세요:");
        if (!reason) return;

        setProcessingId(id);
        try {
            const supabase = createClient();
            await supabase
                .from("change_suggestions")
                .update({
                    status: "rejected",
                    reviewed_at: new Date().toISOString(),
                    review_notes: reason,
                })
                .eq("id", id);

            fetchSuggestions();
        } catch (error) {
            console.error("[handleReject] Error:", error);
            alert("거절 처리 중 오류가 발생했습니다.");
        } finally {
            setProcessingId(null);
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
                    <h1 className="text-2xl font-bold">변경 제안 검토</h1>
                    <p className="text-muted-foreground">
                        크롤링으로 발견된 행사를 검토하고 승인합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilter("pending")}
                        className={cn(
                            "px-3 py-1.5 rounded text-sm",
                            filter === "pending"
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        대기 중
                    </button>
                    <button
                        onClick={() => setFilter("all")}
                        className={cn(
                            "px-3 py-1.5 rounded text-sm",
                            filter === "all"
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        전체
                    </button>
                </div>
            </div>

            {/* 제안 목록 */}
            {suggestions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg">
                    {filter === "pending"
                        ? "검토 대기 중인 제안이 없습니다."
                        : "제안이 없습니다."}
                </div>
            ) : (
                <div className="space-y-4">
                    {suggestions.map((suggestion) => (
                        <SuggestionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            isProcessing={processingId === suggestion.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================
// 하위 컴포넌트
// =============================================

function SuggestionCard({
    suggestion,
    onApprove,
    onReject,
    isProcessing,
}: {
    suggestion: SuggestionWithData;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    isProcessing: boolean;
}) {
    const data = suggestion.suggested_data;

    return (
        <div className="border rounded-lg p-4 bg-card">
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ConfidenceBadge confidence={suggestion.confidence} />
                    <TypeBadge type={suggestion.suggestionType} />
                    <StatusBadge status={suggestion.status} />
                </div>
                <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(suggestion.createdAt.toString())}
                </span>
            </div>

            {/* 행사 정보 */}
            <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2">
                    {data.title || "제목 없음"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {data.startAt && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {formatDate(data.startAt)}
                                {data.endAt && ` ~ ${formatDate(data.endAt)}`}
                            </span>
                        </div>
                    )}
                    {data.venueName && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{data.venueName}</span>
                        </div>
                    )}
                    {data.artists && data.artists.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{data.artists.join(", ")}</span>
                        </div>
                    )}
                </div>

                {/* 포스터 이미지 */}
                {data.posterUrl && (
                    <div className="mt-3">
                        <img
                            src={data.posterUrl}
                            alt={data.title}
                            className="h-32 w-auto rounded border object-cover"
                        />
                    </div>
                )}
            </div>

            {/* 원본 링크 */}
            <div className="mb-4">
                <a
                    href={suggestion.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                    원본 페이지 보기
                    <ExternalLink className="h-3 w-3" />
                </a>
            </div>

            {/* 신뢰도 근거 */}
            {suggestion.confidenceReasons && suggestion.confidenceReasons.length > 0 && (
                <div className="p-3 rounded bg-muted/50 text-sm mb-4">
                    <div className="font-medium mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        판단 근거
                    </div>
                    <ul className="list-disc list-inside text-muted-foreground">
                        {suggestion.confidenceReasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 액션 버튼 */}
            {suggestion.status === "pending" && (
                <div className="flex gap-2">
                    <button
                        onClick={() => onApprove(suggestion.id)}
                        disabled={isProcessing}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded",
                            "bg-green-600 text-white hover:bg-green-700",
                            "disabled:opacity-50"
                        )}
                    >
                        {isProcessing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        승인
                    </button>
                    <button
                        onClick={() => onReject(suggestion.id)}
                        disabled={isProcessing}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 rounded",
                            "border text-muted-foreground hover:bg-muted",
                            "disabled:opacity-50"
                        )}
                    >
                        <X className="h-4 w-4" />
                        거절
                    </button>
                </div>
            )}
        </div>
    );
}

function ConfidenceBadge({ confidence }: { confidence: ExtractConfidence }) {
    const config: Record<ExtractConfidence, { color: string; label: string }> = {
        high: { color: "bg-green-100 text-green-700", label: "HIGH" },
        medium: { color: "bg-amber-100 text-amber-700", label: "MEDIUM" },
        low: { color: "bg-red-100 text-red-700", label: "LOW" },
    };

    const { color, label } = config[confidence];

    return (
        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", color)}>
            {label}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const labels: Record<string, string> = {
        new_event: "새 행사",
        update_event: "업데이트",
        cancel_event: "취소",
    };

    return (
        <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
            {labels[type] || type}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { icon: React.ElementType; color: string; label: string }> = {
        pending: { icon: RefreshCw, color: "text-amber-600 bg-amber-50", label: "대기" },
        auto_approved: { icon: CheckCircle2, color: "text-green-600 bg-green-50", label: "자동승인" },
        approved: { icon: CheckCircle2, color: "text-green-600 bg-green-50", label: "승인" },
        rejected: { icon: XCircle, color: "text-red-600 bg-red-50", label: "거절" },
        applied: { icon: CheckCircle2, color: "text-blue-600 bg-blue-50", label: "적용완료" },
    };

    const { icon: Icon, color, label } = config[status] || config.pending;

    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs", color)}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

// =============================================
// 헬퍼 함수
// =============================================

function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
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

function transformToEvent(suggestedData: Record<string, unknown>): Record<string, unknown> {
    return {
        title: suggestedData.title,
        start_at: suggestedData.startAt,
        end_at: suggestedData.endAt,
        timezone: "Asia/Seoul",
        event_type: suggestedData.eventType || "concert",
        venue_name: suggestedData.venueName,
        venue_address: suggestedData.venueAddress,
        poster_url: suggestedData.posterUrl,
        price: suggestedData.price,
        description: suggestedData.description,
        official_url: suggestedData.officialUrl,
        status: "scheduled",
    };
}
