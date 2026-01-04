"use client";

import { useState, useCallback } from "react";
import {
    X,
    Check,
    Link2,
    Loader2,
    Globe,
    Lock,
    Calendar,
    Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types/ticketbook";
import { formatKoreanDate } from "@/lib/utils/date-format";
import { copyToClipboard } from "@/lib/utils/share";
import { createShare, getShareUrl } from "@/lib/supabase/queries/ticket-shares";
import { useAuth } from "@/lib/auth-context";

interface CreateShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    tickets: Ticket[];
    onSuccess?: (shareUrl: string) => void;
}

type Step = "select" | "options" | "complete";
type ExpiryOption = "never" | "7days" | "30days" | "90days";

/**
 * 공유 생성 모달
 * - 티켓 선택 (체크박스)
 * - 제목/설명 입력
 * - 공개 설정
 * - 공유 URL 생성 및 복사
 */
export function CreateShareModal({ isOpen, onClose, tickets, onSuccess }: CreateShareModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<Step>("select");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [expiry, setExpiry] = useState<ExpiryOption>("never");
    const [isLoading, setIsLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // 티켓 선택 토글
    const toggleTicket = useCallback((ticketId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(ticketId)) {
                next.delete(ticketId);
            } else {
                next.add(ticketId);
            }
            return next;
        });
    }, []);

    // 전체 선택/해제
    const toggleAll = useCallback(() => {
        if (selectedIds.size === tickets.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tickets.map((t) => t.id)));
        }
    }, [selectedIds.size, tickets]);

    // 만료일 계산
    const getExpiryDays = (option: ExpiryOption): number | undefined => {
        switch (option) {
            case "7days":
                return 7;
            case "30days":
                return 30;
            case "90days":
                return 90;
            default:
                return undefined;
        }
    };

    // 공유 생성
    const handleCreate = async () => {
        if (!user) return;

        setIsLoading(true);

        try {
            const share = await createShare(
                user.id,
                Array.from(selectedIds),
                {
                    title: title.trim() || undefined,
                    description: description.trim() || undefined,
                    isPublic,
                    expiresInDays: getExpiryDays(expiry),
                }
            );

            if (share) {
                const url = getShareUrl(share.shareId);
                setShareUrl(url);
                setStep("complete");
                onSuccess?.(url);
            }
        } catch (error) {
            console.error("[CreateShareModal] Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // URL 복사
    const handleCopy = async () => {
        if (!shareUrl) return;

        const success = await copyToClipboard(shareUrl);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // 모달 닫기
    const handleClose = () => {
        setStep("select");
        setSelectedIds(new Set());
        setTitle("");
        setDescription("");
        setIsPublic(true);
        setExpiry("never");
        setShareUrl(null);
        setCopied(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg max-h-[80vh] overflow-hidden">
                <div className="bg-card rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                        <h2 className="text-lg font-semibold">
                            {step === "select" && "티켓 선택"}
                            {step === "options" && "공유 설정"}
                            {step === "complete" && "공유 완료!"}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Step 1: 티켓 선택 */}
                        {step === "select" && (
                            <div className="p-4">
                                {/* 전체 선택 */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedIds.size}개 선택됨
                                    </span>
                                    <button
                                        onClick={toggleAll}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        {selectedIds.size === tickets.length ? "전체 해제" : "전체 선택"}
                                    </button>
                                </div>

                                {/* 티켓 목록 */}
                                <div className="space-y-2">
                                    {tickets.map((ticket) => {
                                        const isSelected = selectedIds.has(ticket.id);

                                        return (
                                            <button
                                                key={ticket.id}
                                                onClick={() => toggleTicket(ticket.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                                                    isSelected
                                                        ? "border-primary bg-primary/5"
                                                        : "border-muted hover:border-muted-foreground/30"
                                                )}
                                            >
                                                {/* Checkbox */}
                                                <div
                                                    className={cn(
                                                        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                                                        isSelected
                                                            ? "border-primary bg-primary"
                                                            : "border-muted-foreground/30"
                                                    )}
                                                >
                                                    {isSelected && (
                                                        <Check className="h-3 w-3 text-white" />
                                                    )}
                                                </div>

                                                {/* Thumbnail */}
                                                <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={ticket.frontImage.thumbnailUrl || ticket.frontImage.url}
                                                        alt={ticket.eventTitle}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 text-left min-w-0">
                                                    <p className="font-medium truncate">
                                                        {ticket.eventTitle}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatKoreanDate(ticket.eventDate, "YYYY.MM.DD")}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Step 2: 공유 설정 */}
                        {step === "options" && (
                            <div className="p-4 space-y-6">
                                {/* 제목 */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        제목 (선택)
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="나의 공연 기록"
                                        className="w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                {/* 설명 */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        설명 (선택)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="공연 기록을 공유합니다"
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                {/* 공개 설정 */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        공개 설정
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsPublic(true)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                                isPublic
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "border-muted hover:border-muted-foreground/30"
                                            )}
                                        >
                                            <Globe className="h-4 w-4" />
                                            공개
                                        </button>
                                        <button
                                            onClick={() => setIsPublic(false)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                                !isPublic
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "border-muted hover:border-muted-foreground/30"
                                            )}
                                        >
                                            <Lock className="h-4 w-4" />
                                            비공개
                                        </button>
                                    </div>
                                </div>

                                {/* 만료 설정 */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        <Calendar className="inline h-4 w-4 mr-1" />
                                        만료 기간
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: "never", label: "만료 없음" },
                                            { value: "7days", label: "7일" },
                                            { value: "30days", label: "30일" },
                                            { value: "90days", label: "90일" },
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setExpiry(option.value as ExpiryOption)}
                                                className={cn(
                                                    "p-3 rounded-xl border text-sm transition-all",
                                                    expiry === option.value
                                                        ? "border-primary bg-primary/5 text-primary"
                                                        : "border-muted hover:border-muted-foreground/30"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: 완료 */}
                        {step === "complete" && (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                                    <Check className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">공유가 생성되었습니다!</h3>
                                <p className="text-muted-foreground mb-6">
                                    아래 링크를 복사하여 공유하세요
                                </p>

                                {/* URL 복사 */}
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                                    <Link2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={shareUrl || ""}
                                        readOnly
                                        className="flex-1 bg-transparent text-sm focus:outline-none truncate"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className={cn(
                                            "flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-all flex-shrink-0",
                                            copied
                                                ? "bg-green-500 text-white"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                                        )}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4" />
                                                복사됨
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4" />
                                                복사
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {step !== "complete" && (
                        <div className="p-4 border-t flex gap-2 flex-shrink-0">
                            {step === "options" && (
                                <button
                                    onClick={() => setStep("select")}
                                    className="flex-1 py-3 rounded-xl border font-medium hover:bg-muted transition-colors"
                                >
                                    이전
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (step === "select") {
                                        setStep("options");
                                    } else {
                                        handleCreate();
                                    }
                                }}
                                disabled={step === "select" ? selectedIds.size === 0 : isLoading}
                                className={cn(
                                    "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                    step === "select" && selectedIds.size === 0
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        생성 중...
                                    </>
                                ) : step === "select" ? (
                                    `다음 (${selectedIds.size}개)`
                                ) : (
                                    "공유 생성"
                                )}
                            </button>
                        </div>
                    )}

                    {step === "complete" && (
                        <div className="p-4 border-t flex-shrink-0">
                            <button
                                onClick={handleClose}
                                className="w-full py-3 rounded-xl bg-muted font-medium hover:bg-muted/80 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
