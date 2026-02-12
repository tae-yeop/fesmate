"use client";

import { useState, useEffect } from "react";
import {
    XCircle,
    User,
    AlertTriangle,
    Clock,
    Ban,
    MessageSquare,
    Shield,
    TrendingDown,
    Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
    SanctionType,
    SanctionReason,
    UserSanction,
} from "@/types/sanction";
import {
    SANCTION_TYPE_INFO,
    SANCTION_REASON_INFO,
} from "@/types/sanction";

// =============================================
// Types
// =============================================

export interface UserForSanction {
    id: string;
    nickname: string;
    avatarUrl?: string;
    trustScore?: number;
    warningCount?: number;
    suspensionCount?: number;
    isBanned?: boolean;
}

export interface SanctionHistoryItem {
    id: string;
    type: SanctionType;
    reason: SanctionReason;
    description?: string;
    createdAt: Date;
    isActive: boolean;
    expiresAt?: Date;
}

export interface UserSanctionModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserForSanction;
    sanctionHistory?: SanctionHistoryItem[];
    onSanction: (
        type: SanctionType,
        reason: SanctionReason,
        description: string,
        duration?: number
    ) => Promise<void>;
}

// =============================================
// Constants
// =============================================

const SANCTION_TYPES: {
    type: SanctionType;
    icon: React.ElementType;
    colorClass: string;
}[] = [
    { type: "warning", icon: AlertTriangle, colorClass: "text-amber-600" },
    { type: "suspension", icon: Clock, colorClass: "text-orange-600" },
    { type: "ban", icon: Ban, colorClass: "text-red-600" },
];

const SANCTION_REASONS: SanctionReason[] = [
    "multiple_reports",
    "spam",
    "harassment",
    "inappropriate_content",
    "scam",
    "impersonation",
    "other",
];

const DURATION_OPTIONS = [
    { value: 1, label: "1일" },
    { value: 3, label: "3일" },
    { value: 7, label: "7일" },
    { value: 14, label: "14일" },
    { value: 30, label: "30일" },
    { value: 90, label: "90일" },
];

// =============================================
// Main Component
// =============================================

export function UserSanctionModal({
    isOpen,
    onClose,
    user,
    sanctionHistory = [],
    onSanction,
}: UserSanctionModalProps) {
    const [step, setStep] = useState<"select" | "confirm">("select");
    const [selectedType, setSelectedType] = useState<SanctionType>("warning");
    const [selectedReason, setSelectedReason] = useState<SanctionReason>("other");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState(7);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep("select");
            setSelectedType("warning");
            setSelectedReason("other");
            setDescription("");
            setDuration(7);
        }
    }, [isOpen]);

    async function handleSubmit() {
        if (!description.trim()) return;

        setIsSubmitting(true);
        try {
            await onSanction(
                selectedType,
                selectedReason,
                description,
                selectedType === "suspension" ? duration : undefined
            );
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    }

    function getNotificationPreview(): string {
        const typeInfo = SANCTION_TYPE_INFO[selectedType];
        const reasonInfo = SANCTION_REASON_INFO[selectedReason];

        if (selectedType === "warning") {
            return `[경고] ${reasonInfo} 사유로 경고를 받았습니다. 지속적인 위반 시 이용이 제한될 수 있습니다.`;
        } else if (selectedType === "suspension") {
            return `[정지] ${reasonInfo} 사유로 ${duration}일간 서비스 이용이 정지되었습니다. 정지 기간 동안 글 작성 및 댓글이 제한됩니다.`;
        } else {
            return `[영구 차단] ${reasonInfo} 사유로 계정이 영구 차단되었습니다. 더 이상 서비스를 이용할 수 없습니다.`;
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-background rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">사용자 제재</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted">
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">
                    {/* User Info */}
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.nickname}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-6 w-6 text-muted-foreground" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="font-semibold">{user.nickname}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                {user.trustScore !== undefined && (
                                    <div className="flex items-center gap-1">
                                        <Shield className="h-3.5 w-3.5" />
                                        <span>신뢰도 {Math.round(user.trustScore * 100)}점</span>
                                    </div>
                                )}
                                {user.warningCount !== undefined && user.warningCount > 0 && (
                                    <div className="flex items-center gap-1 text-amber-600">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span>경고 {user.warningCount}회</span>
                                    </div>
                                )}
                                {user.isBanned && (
                                    <span className="text-red-600 font-medium">차단됨</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {step === "select" ? (
                        <>
                            {/* Sanction Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">제재 유형</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SANCTION_TYPES.map(({ type, icon: Icon, colorClass }) => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedType(type)}
                                            className={cn(
                                                "p-3 rounded-lg border text-center transition-colors",
                                                selectedType === type
                                                    ? "border-primary bg-primary/5"
                                                    : "hover:bg-muted"
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    "h-5 w-5 mx-auto mb-1",
                                                    colorClass
                                                )}
                                            />
                                            <span className="text-sm font-medium">
                                                {SANCTION_TYPE_INFO[type].name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {SANCTION_TYPE_INFO[selectedType].description}
                                </p>
                            </div>

                            {/* Duration (for suspension) */}
                            {selectedType === "suspension" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">정지 기간</label>
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

                            {/* Reason */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">제재 사유</label>
                                <select
                                    value={selectedReason}
                                    onChange={(e) =>
                                        setSelectedReason(e.target.value as SanctionReason)
                                    }
                                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    {SANCTION_REASONS.map((reason) => (
                                        <option key={reason} value={reason}>
                                            {SANCTION_REASON_INFO[reason]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    상세 설명 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="제재 사유를 상세히 기록하세요..."
                                    className="w-full h-24 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>

                            {/* Continue Button */}
                            <button
                                onClick={() => setStep("confirm")}
                                disabled={!description.trim()}
                                className="w-full py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                다음
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Confirmation Step */}
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className="p-4 border rounded-lg space-y-3">
                                    <h4 className="font-semibold">제재 내용 확인</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">유형: </span>
                                            <span
                                                className={cn(
                                                    "font-medium",
                                                    selectedType === "ban" && "text-red-600"
                                                )}
                                            >
                                                {SANCTION_TYPE_INFO[selectedType].name}
                                            </span>
                                        </div>
                                        {selectedType === "suspension" && (
                                            <div>
                                                <span className="text-muted-foreground">기간: </span>
                                                <span className="font-medium">{duration}일</span>
                                            </div>
                                        )}
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">사유: </span>
                                            <span className="font-medium">
                                                {SANCTION_REASON_INFO[selectedReason]}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{description}</p>
                                </div>

                                {/* Notification Preview */}
                                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                    <h4 className="text-sm font-medium flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        사용자에게 전송될 알림
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {getNotificationPreview()}
                                    </p>
                                </div>

                                {/* Warning for ban */}
                                {selectedType === "ban" && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-700">
                                            영구 차단은 되돌릴 수 없습니다. 신중하게 결정해 주세요.
                                        </p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStep("select")}
                                        disabled={isSubmitting}
                                        className="flex-1 py-2 rounded-lg font-medium border hover:bg-muted transition-colors"
                                    >
                                        이전
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50",
                                            selectedType === "ban"
                                                ? "bg-red-500 hover:bg-red-600"
                                                : "bg-primary hover:bg-primary/90"
                                        )}
                                    >
                                        {isSubmitting ? "처리 중..." : "제재 적용"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Sanction History */}
                    {sanctionHistory.length > 0 && (
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                제재 이력
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {sanctionHistory.map((item) => (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "p-2 rounded-lg text-sm",
                                            item.isActive ? "bg-amber-50" : "bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={cn(
                                                    "font-medium",
                                                    item.type === "ban" && "text-red-600"
                                                )}
                                            >
                                                {SANCTION_TYPE_INFO[item.type].name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(item.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {SANCTION_REASON_INFO[item.reason]}
                                        </p>
                                        {item.isActive && (
                                            <span className="text-xs text-amber-600">활성</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

export default UserSanctionModal;
