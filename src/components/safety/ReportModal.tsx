"use client";

import { useState } from "react";
import { X, AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ReportReason,
    ReportTargetType,
    REPORT_REASON_LABELS,
    REPORT_REASON_DESCRIPTIONS,
} from "@/types/report";
import { submitReport } from "@/lib/supabase/queries";
import { useLeaderboard } from "@/lib/leaderboard-context";
import { usePost } from "@/lib/post-context";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: ReportTargetType;
    targetId: string;
    targetUserId: string;
    reporterId?: string; // 현재 로그인한 사용자 ID
    onSubmit?: (reason: ReportReason, detail?: string) => void;
}

const REPORT_REASONS: ReportReason[] = [
    "spam",
    "scam",
    "abuse",
    "hate",
    "harassment",
    "privacy",
    "illegal",
    "other",
];

/**
 * 신고 모달 컴포넌트
 * - 신고 사유 선택
 * - 상세 설명 입력 (선택)
 * - 제출 확인
 */
export function ReportModal({
    isOpen,
    onClose,
    targetType,
    targetId,
    targetUserId,
    reporterId,
    onSubmit,
}: ReportModalProps) {
    const { deductScoreForReport } = useLeaderboard();
    const { reportPost } = usePost();
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [detail, setDetail] = useState("");
    const [step, setStep] = useState<"select" | "confirm" | "done">("select");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const targetTypeLabel = {
        post: "게시글",
        comment: "댓글",
        user: "사용자",
        call_guide: "콜가이드",
        call_guide_entry: "콜가이드 항목",
    }[targetType];

    const handleSubmit = async () => {
        if (!selectedReason) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // Supabase에 신고 저장 (reporterId가 있는 경우에만)
            if (reporterId) {
                await submitReport({
                    reporterId,
                    targetType,
                    targetId,
                    targetUserId,
                    reason: selectedReason,
                    detail: detail || undefined,
                });
            }

            // 신고 대상 사용자 점수 차감
            deductScoreForReport(targetUserId, targetType);

            // 글 신고인 경우 신고 카운트 증가 (3회 이상 시 자동 숨김)
            if (targetType === "post") {
                reportPost(targetId);
            }

            // 콜백 호출
            if (onSubmit) {
                onSubmit(selectedReason, detail || undefined);
            }

            setStep("done");
        } catch (err) {
            console.error("[ReportModal] Submit error:", err);
            setError("신고 접수 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedReason(null);
        setDetail("");
        setStep("select");
        setError(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* 모달 */}
            <div className="relative w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden">
                {/* 헤더 */}
                <div className="sticky top-0 flex items-center justify-between border-b bg-background px-4 py-3">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        {targetTypeLabel} 신고
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-full hover:bg-muted"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
                    {step === "select" && (
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                신고 사유를 선택해주세요. 허위 신고는 제재 대상이 될 수 있습니다.
                            </p>

                            {/* 사유 선택 */}
                            <div className="space-y-2">
                                {REPORT_REASONS.map((reason) => (
                                    <button
                                        key={reason}
                                        onClick={() => setSelectedReason(reason)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg border transition-colors",
                                            selectedReason === reason
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">
                                                {REPORT_REASON_LABELS[reason]}
                                            </span>
                                            {selectedReason === reason && (
                                                <Check className="h-4 w-4 text-primary" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {REPORT_REASON_DESCRIPTIONS[reason]}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            {/* 상세 설명 */}
                            {selectedReason && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        상세 설명 (선택)
                                    </label>
                                    <textarea
                                        value={detail}
                                        onChange={(e) => setDetail(e.target.value)}
                                        placeholder="추가로 알려주실 내용이 있다면 작성해주세요."
                                        className="w-full h-24 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-muted-foreground text-right">
                                        {detail.length}/500
                                    </p>
                                </div>
                            )}

                            {/* 버튼 */}
                            <button
                                onClick={() => setStep("confirm")}
                                disabled={!selectedReason}
                                className={cn(
                                    "w-full py-3 rounded-lg font-medium transition-colors",
                                    selectedReason
                                        ? "bg-red-500 text-white hover:bg-red-600"
                                        : "bg-muted text-muted-foreground cursor-not-allowed"
                                )}
                            >
                                신고하기
                            </button>
                        </div>
                    )}

                    {step === "confirm" && (
                        <div className="p-4 space-y-4">
                            <div className="text-center py-4">
                                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                                <h3 className="text-lg font-bold mb-2">
                                    신고를 접수하시겠습니까?
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    신고된 내용은 검토 후 정책에 따라 처리됩니다.
                                    <br />
                                    허위 신고는 제재 대상이 될 수 있습니다.
                                </p>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                <p className="font-medium mb-1">선택한 사유</p>
                                <p className="text-muted-foreground">
                                    {selectedReason && REPORT_REASON_LABELS[selectedReason]}
                                </p>
                                {detail && (
                                    <>
                                        <p className="font-medium mt-2 mb-1">상세 설명</p>
                                        <p className="text-muted-foreground">{detail}</p>
                                    </>
                                )}
                            </div>

                            {/* 에러 메시지 */}
                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep("select")}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-lg font-medium border hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                    뒤로
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            처리 중...
                                        </>
                                    ) : (
                                        "신고 접수"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "done" && (
                        <div className="p-4 space-y-4">
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">
                                    신고가 접수되었습니다
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    검토 후 처리 결과를 알림으로 안내드립니다.
                                    <br />
                                    소중한 제보에 감사드립니다.
                                </p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-3 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
