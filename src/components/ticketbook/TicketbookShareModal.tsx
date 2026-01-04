"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Link2,
    Edit3,
    Share2,
    Check,
    Loader2,
    Globe,
    Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGallery } from "@/lib/gallery-context";
import { formatKoreanDate } from "@/lib/utils/date-format";
import type { Ticket } from "@/types/ticketbook";

interface TicketbookShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    tickets: Ticket[];
}

type ShareStep = "preview" | "settings";
type ShareStatus = "idle" | "loading" | "success" | "error";

/**
 * 티켓북 전체 공유 모달
 * - 티켓 캐러셀 미리보기 (자동 애니메이션)
 * - 제목/설명 입력
 * - 공개/비공개 설정
 * - 갤러리 생성 및 공유 URL 복사
 */
export function TicketbookShareModal({
    isOpen,
    onClose,
    tickets,
}: TicketbookShareModalProps) {
    const router = useRouter();
    const {
        createFromTickets,
        updateGallery,
    } = useGallery();

    const [step, setStep] = useState<ShareStep>("preview");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const [status, setStatus] = useState<ShareStatus>("idle");

    // 갤러리 설정
    const [title, setTitle] = useState("내 티켓 컬렉션");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [createdGalleryId, setCreatedGalleryId] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

    // 모달 열릴 때 초기화
    useEffect(() => {
        if (isOpen) {
            setStep("preview");
            setCurrentIndex(0);
            setIsAutoPlay(true);
            setStatus("idle");
            setTitle("내 티켓 컬렉션");
            setDescription("");
            setIsPublic(true);
            setCreatedGalleryId(null);
            setShareUrl(null);
        }
    }, [isOpen]);

    // 자동 재생
    useEffect(() => {
        if (!isOpen || !isAutoPlay || tickets.length <= 1) return;

        autoPlayRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % tickets.length);
        }, 2000);

        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, [isOpen, isAutoPlay, tickets.length]);

    // 이전/다음 티켓
    const goToPrev = useCallback(() => {
        setIsAutoPlay(false);
        setCurrentIndex((prev) => (prev - 1 + tickets.length) % tickets.length);
    }, [tickets.length]);

    const goToNext = useCallback(() => {
        setIsAutoPlay(false);
        setCurrentIndex((prev) => (prev + 1) % tickets.length);
    }, [tickets.length]);

    // 갤러리 생성 및 공유 URL 생성
    const handleCreateGallery = useCallback(async () => {
        if (tickets.length === 0) return;

        setStatus("loading");

        try {
            // 갤러리 생성 (티켓 스냅샷 포함, isPublic이면 shareId도 함께 생성됨)
            const gallery = createFromTickets(tickets, title, isPublic);

            // 설명 업데이트
            if (description) {
                updateGallery(gallery.id, { description });
            }

            // 공유 URL 생성 (gallery에서 shareId 사용)
            const url = gallery.shareId ? `/share/gallery/${gallery.shareId}` : null;

            setCreatedGalleryId(gallery.id);
            setShareUrl(url);
            setStatus("success");

            console.log("[TicketbookShareModal] Gallery created:", gallery.id, "shareId:", gallery.shareId);
        } catch (error) {
            console.error("[TicketbookShareModal] Create gallery error:", error);
            setStatus("error");
        }
    }, [tickets, title, description, isPublic, createFromTickets, updateGallery]);

    // URL 복사
    const handleCopyUrl = useCallback(async () => {
        if (!shareUrl) return;

        try {
            const fullUrl = `${window.location.origin}${shareUrl}`;
            await navigator.clipboard.writeText(fullUrl);
            setStatus("success");
        } catch (error) {
            console.error("[TicketbookShareModal] Copy error:", error);
        }
    }, [shareUrl]);

    // 갤러리 편집 페이지로 이동
    const handleEditGallery = useCallback(() => {
        if (createdGalleryId) {
            router.push(`/myfes/gallery?id=${createdGalleryId}`);
            onClose();
        }
    }, [createdGalleryId, router, onClose]);

    if (!isOpen || tickets.length === 0) return null;

    const currentTicket = tickets[currentIndex];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div
                    className="relative w-full max-w-lg max-h-[90vh] bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-lg font-semibold">
                            {step === "preview" ? "티켓북 공유" : "공유 설정"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {step === "preview" && (
                        <div className="flex-1 overflow-y-auto">
                            {/* Carousel */}
                            <div className="relative bg-black h-[40vh] sm:h-[50vh] overflow-hidden">
                                {/* 티켓 이미지 */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div
                                        className="relative w-full h-full flex transition-transform duration-500 ease-out"
                                        style={{
                                            transform: `translateX(-${currentIndex * 100}%)`,
                                        }}
                                    >
                                        {tickets.map((ticket, index) => (
                                            <div
                                                key={ticket.id}
                                                className="flex-shrink-0 w-full h-full flex items-center justify-center p-4 sm:p-6"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={ticket.frontImage.thumbnailUrl || ticket.frontImage.url}
                                                    alt={ticket.eventTitle}
                                                    className={cn(
                                                        "max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-500",
                                                        index === currentIndex
                                                            ? "scale-100 opacity-100"
                                                            : "scale-90 opacity-50"
                                                    )}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 이전/다음 버튼 */}
                                {tickets.length > 1 && (
                                    <>
                                        <button
                                            onClick={goToPrev}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </button>
                                        <button
                                            onClick={goToNext}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                        >
                                            <ChevronRight className="h-6 w-6" />
                                        </button>
                                    </>
                                )}

                                {/* 인디케이터 */}
                                {tickets.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {tickets.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setIsAutoPlay(false);
                                                    setCurrentIndex(index);
                                                }}
                                                className={cn(
                                                    "w-2 h-2 rounded-full transition-all",
                                                    index === currentIndex
                                                        ? "bg-white w-6"
                                                        : "bg-white/50 hover:bg-white/70"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* 티켓 정보 오버레이 */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                                    <p className="font-medium truncate">
                                        {currentTicket.eventTitle}
                                    </p>
                                    <p className="text-sm opacity-80">
                                        {formatKoreanDate(currentTicket.eventDate, "YYYY년 M월 D일")}
                                    </p>
                                </div>
                            </div>

                            {/* 티켓 수 표시 */}
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                총 {tickets.length}장의 티켓
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t space-y-2">
                                <button
                                    onClick={() => setStep("settings")}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Share2 className="h-5 w-5" />
                                    공유 갤러리 만들기
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "settings" && (
                        <div className="flex-1 overflow-y-auto">
                            {/* Settings Form */}
                            <div className="p-4 space-y-4">
                                {/* 제목 */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        갤러리 제목
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="예: 2024년 공연 기록"
                                        className="w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        maxLength={50}
                                    />
                                </div>

                                {/* 설명 */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        설명 (선택)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="갤러리에 대한 간단한 설명..."
                                        className="w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                        rows={2}
                                        maxLength={200}
                                    />
                                </div>

                                {/* 공개 설정 */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        {isPublic ? (
                                            <Globe className="h-5 w-5 text-primary" />
                                        ) : (
                                            <Lock className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <div>
                                            <p className="font-medium text-sm">
                                                {isPublic ? "공개" : "비공개"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {isPublic
                                                    ? "링크가 있는 누구나 볼 수 있어요"
                                                    : "나만 볼 수 있어요"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsPublic(!isPublic)}
                                        className={cn(
                                            "relative w-12 h-6 rounded-full transition-colors",
                                            isPublic ? "bg-primary" : "bg-muted"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                                                isPublic ? "translate-x-7" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* 포함된 티켓 */}
                                <div>
                                    <p className="text-sm font-medium mb-2">
                                        포함된 티켓 ({tickets.length}장)
                                    </p>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {tickets.slice(0, 5).map((ticket) => (
                                            <div
                                                key={ticket.id}
                                                className="flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-muted"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={ticket.frontImage.thumbnailUrl || ticket.frontImage.url}
                                                    alt={ticket.eventTitle}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                        {tickets.length > 5 && (
                                            <div className="flex-shrink-0 w-12 h-16 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                                                +{tickets.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 공유 URL 결과 */}
                            {shareUrl && status === "success" && (
                                <div className="mx-4 mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-center gap-2 text-green-600 mb-2">
                                        <Check className="h-5 w-5" />
                                        <span className="font-medium">갤러리가 생성되었습니다!</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={`${typeof window !== "undefined" ? window.location.origin : ""}${shareUrl}`}
                                            readOnly
                                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-background border"
                                        />
                                        <button
                                            onClick={handleCopyUrl}
                                            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            <Link2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="p-4 border-t space-y-2">
                                {!shareUrl ? (
                                    <>
                                        <button
                                            onClick={handleCreateGallery}
                                            disabled={status === "loading" || !title.trim()}
                                            className={cn(
                                                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors",
                                                status === "loading" || !title.trim()
                                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                            )}
                                        >
                                            {status === "loading" ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    생성 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Share2 className="h-5 w-5" />
                                                    갤러리 생성
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setStep("preview")}
                                            className="w-full py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                                        >
                                            뒤로
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleEditGallery}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                                        >
                                            <Edit3 className="h-5 w-5" />
                                            사진/SNS 추가하기
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                                        >
                                            닫기
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
