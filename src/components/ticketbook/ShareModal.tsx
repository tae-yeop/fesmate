"use client";

import { useState, useCallback, useEffect } from "react";
import {
    X,
    Download,
    Share2,
    Check,
    Instagram,
    Link2,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types/ticketbook";
import { shareContent, shareImage, copyToClipboard, downloadImage } from "@/lib/utils/share";
import { formatKoreanDate } from "@/lib/utils/date-format";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Ticket | null;
    ticketImageDataUrl?: string; // 캡처된 이미지 (있으면 사용)
}

type ShareStatus = "idle" | "loading" | "success" | "error";
type ShareTarget = "download" | "copy" | "share" | "instagram";

/**
 * 티켓 공유 모달
 * - 이미지 저장
 * - URL 복사
 * - 웹 공유 (Web Share API)
 * - SNS 공유 (카카오톡, 인스타그램)
 */
export function ShareModal({ isOpen, onClose, ticket, ticketImageDataUrl }: ShareModalProps) {
    const [status, setStatus] = useState<ShareStatus>("idle");
    const [activeTarget, setActiveTarget] = useState<ShareTarget | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // 모바일 환경 감지
    useEffect(() => {
        setIsMobile(/Android|iPhone|iPad/i.test(navigator.userAgent));
    }, []);

    const resetStatus = useCallback(() => {
        setTimeout(() => {
            setStatus("idle");
            setActiveTarget(null);
        }, 2000);
    }, []);

    // 이미지 다운로드
    const handleDownload = useCallback(async () => {
        if (!ticket) return;
        setActiveTarget("download");
        setStatus("loading");

        try {
            const imageUrl = ticketImageDataUrl || ticket.frontImage.url;
            const filename = `fesmate_ticket_${ticket.eventTitle.replace(/\s+/g, "_")}_${formatKoreanDate(ticket.eventDate, "YYYY-MM-DD")}.png`;

            if (imageUrl.startsWith("data:")) {
                downloadImage(imageUrl, filename);
            } else {
                // 외부 URL인 경우 fetch 후 다운로드
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const dataUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = filename;
                link.click();
                URL.revokeObjectURL(dataUrl);
            }

            setStatus("success");
            resetStatus();
        } catch (error) {
            console.error("[ShareModal] Download error:", error);
            setStatus("error");
            resetStatus();
        }
    }, [ticket, ticketImageDataUrl, resetStatus]);

    // 공유 URL 생성 (eventId가 없으면 행사 탐색 페이지로)
    const getShareUrl = useCallback(() => {
        if (!ticket) return `${window.location.origin}/explore`;
        if (ticket.eventId) {
            return `${window.location.origin}/event/${ticket.eventId}`;
        }
        // eventId가 없으면 행사명으로 검색 링크 제공
        return `${window.location.origin}/explore?q=${encodeURIComponent(ticket.eventTitle)}`;
    }, [ticket]);

    // URL 복사
    const handleCopyUrl = useCallback(async () => {
        if (!ticket) return;
        setActiveTarget("copy");
        setStatus("loading");

        try {
            const shareUrl = getShareUrl();
            const shareText = `[FesMate] ${ticket.eventTitle} - ${formatKoreanDate(ticket.eventDate, "YYYY년 M월 D일")}`;
            const success = await copyToClipboard(`${shareText}\n${shareUrl}`);

            setStatus(success ? "success" : "error");
            resetStatus();
        } catch {
            setStatus("error");
            resetStatus();
        }
    }, [ticket, getShareUrl, resetStatus]);

    // 웹 공유
    const handleWebShare = useCallback(async () => {
        if (!ticket) return;
        setActiveTarget("share");
        setStatus("loading");

        try {
            const shareUrl = getShareUrl();
            const imageUrl = ticketImageDataUrl || ticket.frontImage.url;

            // 이미지가 있으면 이미지 포함 공유 시도
            if (imageUrl.startsWith("data:")) {
                const result = await shareImage(imageUrl, ticket.eventTitle, {
                    text: `${ticket.eventTitle} - ${formatKoreanDate(ticket.eventDate, "YYYY년 M월 D일")}`,
                    url: shareUrl,
                });
                setStatus(result !== "error" ? "success" : "error");
            } else {
                // URL만 공유
                const result = await shareContent({
                    title: ticket.eventTitle,
                    text: `${ticket.eventTitle} - ${formatKoreanDate(ticket.eventDate, "YYYY년 M월 D일")}`,
                    url: shareUrl,
                });
                setStatus(result !== "error" ? "success" : "error");
            }
            resetStatus();
        } catch {
            setStatus("error");
            resetStatus();
        }
    }, [ticket, ticketImageDataUrl, getShareUrl, resetStatus]);

    // 인스타그램 스토리 (이미지 다운로드 후 안내)
    const handleInstagramShare = useCallback(async () => {
        if (!ticket) return;
        setActiveTarget("instagram");
        setStatus("loading");

        try {
            // 먼저 이미지 다운로드
            const imageUrl = ticketImageDataUrl || ticket.frontImage.url;
            const filename = `fesmate_story_${ticket.eventTitle.replace(/\s+/g, "_")}.png`;

            if (imageUrl.startsWith("data:")) {
                downloadImage(imageUrl, filename);
            } else {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const dataUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = filename;
                link.click();
                URL.revokeObjectURL(dataUrl);
            }

            // 모바일에서 인스타그램 앱 열기 시도
            if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
                setTimeout(() => {
                    window.location.href = "instagram://story-camera";
                }, 500);
            }

            setStatus("success");
            resetStatus();
        } catch {
            setStatus("error");
            resetStatus();
        }
    }, [ticket, ticketImageDataUrl, resetStatus]);

    if (!isOpen || !ticket) return null;

    const shareOptions = [
        {
            id: "share" as ShareTarget,
            icon: Share2,
            label: "공유하기",
            description: "카카오톡, 메시지 등으로 공유합니다",
            onClick: handleWebShare,
            className: "text-white",
            bgClassName: "bg-primary hover:bg-primary/90",
        },
        {
            id: "download" as ShareTarget,
            icon: Download,
            label: "이미지 저장",
            description: "티켓 이미지를 저장합니다",
            onClick: handleDownload,
        },
        {
            id: "copy" as ShareTarget,
            icon: Link2,
            label: "링크 복사",
            description: "행사 링크를 클립보드에 복사합니다",
            onClick: handleCopyUrl,
        },
        {
            id: "instagram" as ShareTarget,
            icon: Instagram,
            label: "인스타 스토리",
            description: isMobile
                ? "이미지 저장 후 인스타그램을 엽니다"
                : "이미지 저장 후 모바일에서 업로드해주세요",
            onClick: handleInstagramShare,
            className: "text-white",
            bgClassName: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] hover:opacity-90",
        },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-4 bottom-4 z-50 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md">
                <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-lg font-semibold">티켓 공유</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Ticket Preview */}
                    <div className="p-4 bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={ticket.frontImage.thumbnailUrl || ticket.frontImage.url}
                                    alt={ticket.eventTitle}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{ticket.eventTitle}</p>
                                <p className="text-sm text-muted-foreground">
                                    {formatKoreanDate(ticket.eventDate, "YYYY년 M월 D일")}
                                </p>
                                {ticket.seat && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {ticket.seat}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Share Options */}
                    <div className="p-4 space-y-2">
                        {shareOptions.map((option) => {
                            const isActive = activeTarget === option.id;
                            const isSuccess = isActive && status === "success";
                            const isLoading = isActive && status === "loading";
                            const Icon = isSuccess ? Check : option.icon;

                            return (
                                <button
                                    key={option.id}
                                    onClick={option.onClick}
                                    disabled={status === "loading"}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all",
                                        option.bgClassName || "bg-muted/50 hover:bg-muted",
                                        status === "loading" && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center",
                                            option.bgClassName
                                                ? ""
                                                : "bg-primary/10 text-primary",
                                            option.className
                                        )}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Icon className={cn("h-5 w-5", isSuccess && "text-green-600")} />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className={cn(
                                            "font-medium",
                                            option.className,
                                            isSuccess && "text-green-600"
                                        )}>
                                            {isSuccess ? "완료!" : option.label}
                                        </p>
                                        <p className={cn(
                                            "text-xs",
                                            option.className ? "opacity-70" : "text-muted-foreground"
                                        )}>
                                            {option.description}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Note */}
                    <div className="px-4 pb-4 space-y-1">
                        <p className="text-xs text-center text-muted-foreground">
                            인스타 스토리는 이미지 저장 후 앱에서 직접 업로드해주세요
                        </p>
                        {!isMobile && (
                            <p className="text-xs text-center text-muted-foreground">
                                📱 모바일에서 카카오톡, 인스타그램으로 바로 공유할 수 있어요
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
