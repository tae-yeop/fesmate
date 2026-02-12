"use client";

import { useState } from "react";
import {
    AlertTriangle,
    Ban,
    Clock,
    Trash2,
    EyeOff,
    CheckCircle2,
    MessageSquare,
    XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================
// Types
// =============================================

export type QuickActionType =
    | "warn"
    | "mute"
    | "suspend"
    | "ban"
    | "delete"
    | "hide"
    | "approve"
    | "resolve";

export interface QuickAction {
    type: QuickActionType;
    icon: React.ElementType;
    label: string;
    description: string;
    color: string;
    hoverColor: string;
    isDestructive: boolean;
    requiresReason: boolean;
    requiresDuration?: boolean;
}

export interface QuickActionPanelProps {
    /** Available actions (defaults to all) */
    actions?: QuickActionType[];
    /** Called when an action is confirmed */
    onAction: (action: QuickActionType, reason: string, duration?: number) => void;
    /** Target entity info for display */
    target?: {
        type: string;
        name: string;
    };
    /** Disabled state */
    disabled?: boolean;
}

// =============================================
// Action Definitions
// =============================================

const ACTION_CONFIG: Record<QuickActionType, QuickAction> = {
    warn: {
        type: "warn",
        icon: AlertTriangle,
        label: "경고",
        description: "사용자에게 경고 알림을 보냅니다.",
        color: "text-amber-600",
        hoverColor: "hover:bg-amber-50",
        isDestructive: false,
        requiresReason: true,
    },
    mute: {
        type: "mute",
        icon: MessageSquare,
        label: "뮤트",
        description: "사용자의 글 작성을 일시 제한합니다.",
        color: "text-orange-600",
        hoverColor: "hover:bg-orange-50",
        isDestructive: false,
        requiresReason: true,
        requiresDuration: true,
    },
    suspend: {
        type: "suspend",
        icon: Clock,
        label: "정지",
        description: "사용자의 서비스 이용을 일시 정지합니다.",
        color: "text-red-500",
        hoverColor: "hover:bg-red-50",
        isDestructive: true,
        requiresReason: true,
        requiresDuration: true,
    },
    ban: {
        type: "ban",
        icon: Ban,
        label: "영구 차단",
        description: "사용자를 영구적으로 차단합니다.",
        color: "text-red-700",
        hoverColor: "hover:bg-red-50",
        isDestructive: true,
        requiresReason: true,
    },
    delete: {
        type: "delete",
        icon: Trash2,
        label: "삭제",
        description: "콘텐츠를 영구 삭제합니다.",
        color: "text-red-600",
        hoverColor: "hover:bg-red-50",
        isDestructive: true,
        requiresReason: true,
    },
    hide: {
        type: "hide",
        icon: EyeOff,
        label: "숨김",
        description: "콘텐츠를 숨깁니다 (복구 가능).",
        color: "text-gray-600",
        hoverColor: "hover:bg-gray-50",
        isDestructive: false,
        requiresReason: true,
    },
    approve: {
        type: "approve",
        icon: CheckCircle2,
        label: "승인",
        description: "검토 완료 후 승인합니다.",
        color: "text-green-600",
        hoverColor: "hover:bg-green-50",
        isDestructive: false,
        requiresReason: false,
    },
    resolve: {
        type: "resolve",
        icon: CheckCircle2,
        label: "해결됨",
        description: "신고를 해결됨으로 표시합니다.",
        color: "text-blue-600",
        hoverColor: "hover:bg-blue-50",
        isDestructive: false,
        requiresReason: false,
    },
};

const DEFAULT_ACTIONS: QuickActionType[] = [
    "warn",
    "suspend",
    "ban",
    "delete",
    "hide",
    "approve",
];

const DURATION_OPTIONS = [
    { value: 1, label: "1일" },
    { value: 3, label: "3일" },
    { value: 7, label: "7일" },
    { value: 14, label: "14일" },
    { value: 30, label: "30일" },
];

// =============================================
// Main Component
// =============================================

export function QuickActionPanel({
    actions = DEFAULT_ACTIONS,
    onAction,
    target,
    disabled = false,
}: QuickActionPanelProps) {
    const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
    const [reason, setReason] = useState("");
    const [duration, setDuration] = useState(7);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleSelectAction(actionType: QuickActionType) {
        const action = ACTION_CONFIG[actionType];
        if (!action.requiresReason) {
            // Execute immediately without confirmation
            handleConfirm(action);
        } else {
            setSelectedAction(action);
            setReason("");
            setDuration(7);
        }
    }

    async function handleConfirm(action: QuickAction = selectedAction!) {
        if (!action) return;

        setIsSubmitting(true);
        try {
            await onAction(
                action.type,
                reason,
                action.requiresDuration ? duration : undefined
            );
            setSelectedAction(null);
            setReason("");
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleCancel() {
        setSelectedAction(null);
        setReason("");
    }

    return (
        <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                {actions.map((actionType) => {
                    const action = ACTION_CONFIG[actionType];
                    const Icon = action.icon;

                    return (
                        <button
                            key={actionType}
                            onClick={() => handleSelectAction(actionType)}
                            disabled={disabled || isSubmitting}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                                action.hoverColor,
                                action.color,
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {action.label}
                        </button>
                    );
                })}
            </div>

            {/* Confirmation Dialog */}
            {selectedAction && (
                <div className="border rounded-lg p-4 bg-card space-y-4">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <div
                            className={cn(
                                "p-2 rounded-full",
                                selectedAction.isDestructive ? "bg-red-100" : "bg-amber-100"
                            )}
                        >
                            <selectedAction.icon
                                className={cn(
                                    "h-5 w-5",
                                    selectedAction.isDestructive
                                        ? "text-red-600"
                                        : "text-amber-600"
                                )}
                            />
                        </div>
                        <div>
                            <h4 className="font-semibold">{selectedAction.label}</h4>
                            <p className="text-sm text-muted-foreground">
                                {selectedAction.description}
                            </p>
                        </div>
                    </div>

                    {/* Target Info */}
                    {target && (
                        <div className="text-sm">
                            <span className="text-muted-foreground">대상: </span>
                            <span className="font-medium">
                                {target.type} - {target.name}
                            </span>
                        </div>
                    )}

                    {/* Duration Selector */}
                    {selectedAction.requiresDuration && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">기간</label>
                            <div className="flex flex-wrap gap-2">
                                {DURATION_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setDuration(option.value)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                                            duration === option.value
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reason Input */}
                    {selectedAction.requiresReason && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                사유 <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="조치 사유를 입력하세요... (감사 로그에 기록됩니다)"
                                className="w-full h-24 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    )}

                    {/* Warning for destructive actions */}
                    {selectedAction.isDestructive && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">
                                이 작업은 되돌릴 수 없습니다. 신중하게 결정해 주세요.
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="flex-1 py-2 rounded-lg font-medium border hover:bg-muted transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => handleConfirm()}
                            disabled={
                                isSubmitting ||
                                (selectedAction.requiresReason && !reason.trim())
                            }
                            className={cn(
                                "flex-1 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50",
                                selectedAction.isDestructive
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-primary hover:bg-primary/90"
                            )}
                        >
                            {isSubmitting ? "처리 중..." : "확인"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default QuickActionPanel;
