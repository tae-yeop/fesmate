"use client";

import { useState } from "react";
import { AlertTriangle, Flag, RotateCcw, X, ChevronDown, Check } from "lucide-react";
import { CallGuide, CallGuideEntry, CallGuideVersion } from "@/types/call-guide";
import { ReportReason, REPORT_REASON_LABELS, REPORT_REASON_DESCRIPTIONS } from "@/types/report";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils/date-format";
import { MOCK_USER_PROFILES } from "@/lib/mock-user-profiles";

/** 콜가이드 신고 모달 Props */
interface CallGuideReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** 신고 대상 (콜가이드 전체 또는 개별 엔트리) */
    target: {
        type: "call_guide" | "call_guide_entry";
        callGuide: CallGuide;
        entry?: CallGuideEntry;
    };
    /** 신고 제출 핸들러 */
    onSubmit: (reason: ReportReason, detail: string) => void;
}

/**
 * 콜가이드 신고 모달
 */
export function CallGuideReportModal({
    isOpen,
    onClose,
    target,
    onSubmit,
}: CallGuideReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [detail, setDetail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReason) {
            alert("신고 사유를 선택해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(selectedReason, detail.trim());
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const targetLabel = target.type === "call_guide"
        ? "콜가이드 전체"
        : `엔트리: ${target.entry?.text}`;

    // 콜가이드에 적합한 신고 사유만 필터링
    const relevantReasons: ReportReason[] = ["spam", "abuse", "other"];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 오버레이 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Flag className="h-5 w-5 text-red-500" />
                        <h3 className="font-semibold">콜가이드 신고</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* 내용 */}
                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[60vh]">
                    {/* 신고 대상 정보 */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">신고 대상</p>
                        <p className="text-sm font-medium text-gray-700">{targetLabel}</p>
                    </div>

                    {/* 신고 사유 선택 */}
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                            신고 사유 <span className="text-red-500">*</span>
                        </p>
                        <div className="space-y-2">
                            {relevantReasons.map((reason) => (
                                <label
                                    key={reason}
                                    className={cn(
                                        "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                                        selectedReason === reason
                                            ? "border-red-500 bg-red-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={reason}
                                        checked={selectedReason === reason}
                                        onChange={() => setSelectedReason(reason)}
                                        className="mt-0.5 accent-red-500"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            {REPORT_REASON_LABELS[reason]}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {REPORT_REASON_DESCRIPTIONS[reason]}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 상세 설명 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            상세 설명 (선택)
                        </label>
                        <textarea
                            value={detail}
                            onChange={(e) => setDetail(e.target.value)}
                            placeholder="추가로 알려주실 내용이 있다면 작성해주세요"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                            rows={3}
                        />
                    </div>

                    {/* 안내 문구 */}
                    <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                            허위 신고는 제재 대상이 될 수 있습니다.
                            신고 내용은 검토 후 적절한 조치가 취해집니다.
                        </p>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedReason || isSubmitting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "신고 중..." : "신고하기"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/** 롤백 확인 모달 Props */
interface RollbackConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** 롤백할 버전 */
    targetVersion: CallGuideVersion;
    /** 현재 버전 */
    currentVersion: number;
    /** 롤백 핸들러 */
    onConfirm: () => void;
}

/**
 * 롤백 확인 모달
 */
export function RollbackConfirmModal({
    isOpen,
    onClose,
    targetVersion,
    currentVersion,
    onConfirm,
}: RollbackConfirmModalProps) {
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isOpen) return null;

    const editor = MOCK_USER_PROFILES.find((u) => u.id === targetVersion.editedBy);

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await onConfirm();
            onClose();
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 오버레이 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative bg-white rounded-xl max-w-md w-full">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-indigo-500" />
                        <h3 className="font-semibold">버전 롤백</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* 내용 */}
                <div className="p-4">
                    {/* 롤백 정보 */}
                    <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600">현재 버전</span>
                            <span className="font-mono font-medium">v{currentVersion}</span>
                        </div>
                        <div className="flex items-center justify-center my-2">
                            <ChevronDown className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">롤백 대상</span>
                            <span className="font-mono font-medium text-indigo-600">
                                v{targetVersion.version}
                            </span>
                        </div>
                    </div>

                    {/* 버전 정보 */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">롤백할 버전 정보</p>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">편집자</span>
                                <span className="text-gray-700">{editor?.nickname || "알 수 없음"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">편집 시간</span>
                                <span className="text-gray-700">
                                    {getRelativeTime(targetVersion.editedAt)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">엔트리 수</span>
                                <span className="text-gray-700">{targetVersion.entries.length}개</span>
                            </div>
                            {targetVersion.changeDescription && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-gray-500">변경 사유: </span>
                                    <span className="text-gray-700">{targetVersion.changeDescription}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 경고 문구 */}
                    <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                            롤백하면 현재 버전과 이전 수정 사항이 모두 버전 히스토리에 기록됩니다.
                            롤백 후에도 필요시 다시 최신 버전으로 복구할 수 있습니다.
                        </p>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isConfirming ? (
                                "롤백 중..."
                            ) : (
                                <>
                                    <RotateCcw className="h-4 w-4" />
                                    롤백 실행
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** 신고된 콜가이드 배너 Props */
interface ReportedCallGuideBannerProps {
    /** 신고 횟수 */
    reportCount: number;
    /** 신고로 인해 숨겨졌는지 */
    isHidden: boolean;
    /** 신고 사유 목록 */
    reasons: ReportReason[];
    /** 콜가이드 보기 핸들러 (숨겨진 경우) */
    onViewAnyway?: () => void;
}

/**
 * 신고된 콜가이드 알림 배너
 */
export function ReportedCallGuideBanner({
    reportCount,
    isHidden,
    reasons,
    onViewAnyway,
}: ReportedCallGuideBannerProps) {
    if (reportCount === 0) return null;

    const uniqueReasons = [...new Set(reasons)];
    const reasonLabels = uniqueReasons
        .slice(0, 2)
        .map((r) => REPORT_REASON_LABELS[r])
        .join(", ");

    if (isHidden) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium text-red-700">
                            이 콜가이드는 검토 중입니다
                        </p>
                        <p className="text-sm text-red-600 mt-1">
                            {reportCount}건의 신고가 접수되어 검토 중입니다.
                            {uniqueReasons.length > 0 && ` (${reasonLabels})`}
                        </p>
                        {onViewAnyway && (
                            <button
                                onClick={onViewAnyway}
                                className="mt-2 text-sm text-red-600 underline hover:text-red-700"
                            >
                                그래도 보기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-amber-700">
                    이 콜가이드에 {reportCount}건의 신고가 있습니다.
                </p>
            </div>
        </div>
    );
}

/** 롤백 성공 토스트 Props */
interface RollbackSuccessToastProps {
    isVisible: boolean;
    fromVersion: number;
    toVersion: number;
    onClose: () => void;
}

/**
 * 롤백 성공 토스트 알림
 */
export function RollbackSuccessToast({
    isVisible,
    fromVersion,
    toVersion,
    onClose,
}: RollbackSuccessToastProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium">
                    v{fromVersion} → v{toVersion} 롤백 완료
                </span>
                <button
                    onClick={onClose}
                    className="ml-2 p-1 rounded hover:bg-green-500"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
