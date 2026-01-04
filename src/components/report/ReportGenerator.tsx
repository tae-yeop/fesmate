"use client";

import { useState, useRef, useCallback } from "react";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Download,
    Share2,
    Loader2,
    Check,
    Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { YearlyReportCard, ReportCardType } from "./YearlyReportCard";
import { useYearlyStats } from "@/lib/hooks/use-yearly-stats";
import { captureElementAsDataUrl } from "@/lib/utils/image-generator";
import { shareImage, downloadImage } from "@/lib/utils/share";

interface ReportGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    year?: number;
}

type Status = "idle" | "loading" | "success" | "error";

const CARD_TYPES: { type: ReportCardType; title: string }[] = [
    { type: "total", title: "총 관람" },
    { type: "genre", title: "장르" },
    { type: "artist", title: "아티스트" },
    { type: "monthly", title: "월별" },
    { type: "companion", title: "동행자" },
    { type: "venue", title: "공연장" },
];

/**
 * 연간 리포트 생성기
 * - 슬라이드 미리보기 캐러셀
 * - 이미지 다운로드 (전체/개별)
 * - 공유 버튼
 */
export function ReportGenerator({ isOpen, onClose, year = new Date().getFullYear() }: ReportGeneratorProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [status, setStatus] = useState<Status>("idle");
    const [isGenerating, setIsGenerating] = useState(false);
    const cardRefs = useRef<Map<ReportCardType, HTMLDivElement>>(new Map());

    const stats = useYearlyStats(MOCK_EVENTS, year);

    const setCardRef = useCallback((type: ReportCardType) => (el: HTMLDivElement | null) => {
        if (el) {
            cardRefs.current.set(type, el);
        }
    }, []);

    // 이전 슬라이드
    const goToPrev = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : CARD_TYPES.length - 1));
    };

    // 다음 슬라이드
    const goToNext = () => {
        setCurrentIndex((prev) => (prev < CARD_TYPES.length - 1 ? prev + 1 : 0));
    };

    // 현재 카드 다운로드
    const handleDownloadCurrent = async () => {
        const currentType = CARD_TYPES[currentIndex].type;
        const element = cardRefs.current.get(currentType);

        if (!element) return;

        setStatus("loading");

        try {
            const dataUrl = await captureElementAsDataUrl(element);
            const filename = `fesmate_${year}_${currentType}.png`;
            downloadImage(dataUrl, filename);
            setStatus("success");
            setTimeout(() => setStatus("idle"), 2000);
        } catch (error) {
            console.error("[ReportGenerator] Download error:", error);
            setStatus("error");
            setTimeout(() => setStatus("idle"), 2000);
        }
    };

    // 모든 카드 다운로드
    const handleDownloadAll = async () => {
        setIsGenerating(true);

        try {
            for (const { type } of CARD_TYPES) {
                const element = cardRefs.current.get(type);
                if (!element) continue;

                const dataUrl = await captureElementAsDataUrl(element);
                const filename = `fesmate_${year}_${type}.png`;
                downloadImage(dataUrl, filename);

                // 다운로드 간격
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error("[ReportGenerator] Download all error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    // 공유
    const handleShare = async () => {
        const currentType = CARD_TYPES[currentIndex].type;
        const element = cardRefs.current.get(currentType);

        if (!element) return;

        setStatus("loading");

        try {
            const dataUrl = await captureElementAsDataUrl(element);
            const title = `FesMate ${year}년 리포트 - ${CARD_TYPES[currentIndex].title}`;
            await shareImage(dataUrl, title, {
                text: `나의 ${year}년 공연 기록을 확인해보세요!`,
                url: `${window.location.origin}/myfes?tab=gonglog&year=${year}`,
            });
            setStatus("success");
            setTimeout(() => setStatus("idle"), 2000);
        } catch {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 2000);
        }
    };

    if (!isOpen) return null;

    // 데이터가 없는 경우
    if (stats.totalEvents === 0) {
        return (
            <>
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl p-8 text-center max-w-sm">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-bold mb-2">리포트를 생성할 수 없어요</h3>
                        <p className="text-muted-foreground mb-6">
                            {year}년에 다녀온 공연 기록이 없습니다.
                            <br />
                            공연을 다녀온 후 다시 시도해주세요!
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium"
                        >
                            확인
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/90"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 text-white">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <h2 className="text-lg font-semibold">{year}년 리포트</h2>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* Carousel */}
                <div className="flex-1 flex items-center justify-center relative px-4">
                    {/* 이전 버튼 */}
                    <button
                        onClick={goToPrev}
                        className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>

                    {/* 카드 미리보기 */}
                    <div className="relative w-full max-w-[400px] aspect-square">
                        {CARD_TYPES.map(({ type }, index) => (
                            <div
                                key={type}
                                className={cn(
                                    "absolute inset-0 transition-all duration-300",
                                    index === currentIndex
                                        ? "opacity-100 scale-100"
                                        : "opacity-0 scale-95 pointer-events-none"
                                )}
                            >
                                <div
                                    className="overflow-hidden rounded-2xl shadow-2xl"
                                    style={{ width: 400, height: 400 }}
                                >
                                    <div style={{ transform: "scale(0.37)", transformOrigin: "top left" }}>
                                        <YearlyReportCard
                                            ref={setCardRef(type)}
                                            type={type}
                                            stats={stats}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 다음 버튼 */}
                    <button
                        onClick={goToNext}
                        className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </div>

                {/* Dots Indicator */}
                <div className="flex justify-center gap-2 py-4">
                    {CARD_TYPES.map(({ type, title }, index) => (
                        <button
                            key={type}
                            onClick={() => setCurrentIndex(index)}
                            className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all",
                                index === currentIndex
                                    ? "bg-white text-black"
                                    : "bg-white/20 text-white/70 hover:bg-white/30"
                            )}
                        >
                            {title}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="p-4 flex justify-center gap-3">
                    {/* 현재 카드 다운로드 */}
                    <button
                        onClick={handleDownloadCurrent}
                        disabled={status === "loading"}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all",
                            status === "success"
                                ? "bg-green-500 text-white"
                                : "bg-white text-black hover:bg-white/90"
                        )}
                    >
                        {status === "loading" ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : status === "success" ? (
                            <Check className="h-5 w-5" />
                        ) : (
                            <Download className="h-5 w-5" />
                        )}
                        {status === "success" ? "저장됨!" : "저장"}
                    </button>

                    {/* 전체 다운로드 */}
                    <button
                        onClick={handleDownloadAll}
                        disabled={isGenerating}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all",
                            "bg-white/20 text-white hover:bg-white/30"
                        )}
                    >
                        {isGenerating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <ImageIcon className="h-5 w-5" />
                        )}
                        {isGenerating ? "생성 중..." : "전체 저장"}
                    </button>

                    {/* 공유 */}
                    <button
                        onClick={handleShare}
                        disabled={status === "loading"}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all",
                            "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                    >
                        <Share2 className="h-5 w-5" />
                        공유
                    </button>
                </div>
            </div>
        </>
    );
}
