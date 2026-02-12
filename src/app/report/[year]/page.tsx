"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Share2,
    X,
    Download,
    Music,
    MapPin,
    Calendar,
    Trophy,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
    YearlyReportData,
    ReportSlide,
    getReportSlides,
    generateMockReportData,
} from "@/lib/yearly-report";

interface Props {
    params: Promise<{ year: string }>;
}

export default function YearlyReportPage({ params }: Props) {
    const { year: yearParam } = use(params);
    const year = parseInt(yearParam);
    const router = useRouter();
    const { user } = useAuth();

    const [reportData, setReportData] = useState<YearlyReportData | null>(null);
    const [slides, setSlides] = useState<ReportSlide[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isAutoPlay, setIsAutoPlay] = useState(true);

    useEffect(() => {
        const userId = user?.id || "demo-user";
        const data = generateMockReportData(userId, year);
        setReportData(data);
        setSlides(getReportSlides(data));
    }, [year, user?.id]);

    useEffect(() => {
        if (!isAutoPlay || isPaused || slides.length === 0) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => {
                if (prev >= slides.length - 1) {
                    setIsAutoPlay(false);
                    return prev;
                }
                return prev + 1;
            });
        }, 5000);

        return () => clearInterval(timer);
    }, [isAutoPlay, isPaused, slides.length]);

    const goToNext = useCallback(() => {
        setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1));
    }, [slides.length]);

    const goToPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") goToNext();
            if (e.key === "ArrowLeft") goToPrev();
            if (e.key === "Escape") router.back();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goToNext, goToPrev, router]);

    if (!reportData || slides.length === 0) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="text-white text-center">
                    <Sparkles className="h-12 w-12 mx-auto animate-pulse mb-4" />
                    <p>리포트 생성 중...</p>
                </div>
            </div>
        );
    }

    const currentSlide = slides[currentIndex];

    return (
        <div
            className="fixed inset-0 bg-black overflow-hidden"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex gap-1">
                {slides.map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
                    >
                        <div
                            className={cn(
                                "h-full bg-white transition-all duration-300",
                                i < currentIndex && "w-full",
                                i === currentIndex && "w-0 animate-progress",
                                i > currentIndex && "w-0"
                            )}
                            style={{
                                animationDuration: isAutoPlay && i === currentIndex ? "5s" : "0s",
                                animationPlayState: isPaused ? "paused" : "running",
                            }}
                        />
                    </div>
                ))}
            </div>

            <button
                onClick={() => router.back()}
                className="absolute top-12 right-4 z-20 p-2 text-white/70 hover:text-white"
            >
                <X className="h-6 w-6" />
            </button>

            <div
                className="absolute inset-0 flex items-center justify-center p-8"
                style={{ background: currentSlide.backgroundColor }}
            >
                <SlideContent slide={currentSlide} data={reportData} />
            </div>

            <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={goToPrev} />
            <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={goToNext} />

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-4">
                <button
                    onClick={goToPrev}
                    disabled={currentIndex === 0}
                    className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                    onClick={goToNext}
                    disabled={currentIndex === slides.length - 1}
                    className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            <style jsx global>{`
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                .animate-progress {
                    animation: progress linear forwards;
                }
            `}</style>
        </div>
    );
}

function SlideContent({ slide, data }: { slide: ReportSlide; data: YearlyReportData }) {
    switch (slide.type) {
        case "intro":
            return (
                <div className="text-center text-white">
                    <Sparkles className="h-16 w-16 mx-auto mb-6 animate-pulse" />
                    <h1 className="text-5xl font-bold mb-4">{slide.title}</h1>
                    <p className="text-xl opacity-80">{slide.subtitle}</p>
                </div>
            );

        case "stat":
            const stats = slide.data.stats as Array<{ label: string; value: number; unit: string }>;
            const facts = slide.data.facts as Array<{ icon: string; text: string }>;

            if (stats) {
                return (
                    <div className="text-center text-white">
                        <h2 className="text-3xl font-bold mb-8">{slide.title}</h2>
                        <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                            {stats.map((stat, i) => (
                                <div key={i} className="bg-white/10 rounded-2xl p-6">
                                    <div className="text-4xl font-bold">{stat.value}</div>
                                    <div className="text-sm opacity-70">
                                        {stat.label} {stat.unit}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            if (facts) {
                return (
                    <div className="text-center text-white">
                        <h2 className="text-3xl font-bold mb-4">{slide.title}</h2>
                        {slide.subtitle && (
                            <p className="text-lg opacity-70 mb-8">{slide.subtitle}</p>
                        )}
                        <div className="space-y-4 max-w-md mx-auto">
                            {facts.map((fact, i) => (
                                <div
                                    key={i}
                                    className="bg-white/10 rounded-xl p-4 flex items-center gap-4"
                                >
                                    <span className="text-3xl">{fact.icon}</span>
                                    <span className="text-lg">{fact.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            return null;

        case "top-list":
            const items = slide.data.items as Array<{ name: string; count: number }>;
            const listType = slide.data.type as string;

            return (
                <div className="text-center text-white">
                    <h2 className="text-3xl font-bold mb-8">{slide.title}</h2>
                    <div className="space-y-3 max-w-md mx-auto">
                        {items.map((item, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl",
                                    i === 0 ? "bg-yellow-500/30" : "bg-white/10"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                                        i === 0
                                            ? "bg-yellow-500 text-black"
                                            : "bg-white/20"
                                    )}
                                >
                                    {i + 1}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm opacity-70">
                                        {item.count}
                                        {listType === "artist" ? "회 관람" : "회 방문"}
                                    </div>
                                </div>
                                {listType === "artist" ? (
                                    <Music className="h-5 w-5 opacity-50" />
                                ) : (
                                    <MapPin className="h-5 w-5 opacity-50" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );

        case "timeline":
            const first = slide.data.first as { name: string; date: Date; venue: string };
            const last = slide.data.last as { name: string; date: Date; venue: string };

            const formatDate = (date: Date) => {
                const d = new Date(date);
                return d.toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                });
            };

            return (
                <div className="text-center text-white">
                    <h2 className="text-3xl font-bold mb-8">{slide.title}</h2>
                    <div className="space-y-6 max-w-md mx-auto">
                        <div className="bg-white/10 rounded-xl p-6 text-left">
                            <div className="text-sm opacity-70 mb-2">첫 번째 공연</div>
                            <div className="text-xl font-bold mb-1">{first.name}</div>
                            <div className="flex items-center gap-2 text-sm opacity-70">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(first.date)}</span>
                                <span>·</span>
                                <MapPin className="h-4 w-4" />
                                <span>{first.venue}</span>
                            </div>
                        </div>
                        <div className="text-2xl">↓</div>
                        <div className="bg-white/10 rounded-xl p-6 text-left">
                            <div className="text-sm opacity-70 mb-2">마지막 공연</div>
                            <div className="text-xl font-bold mb-1">{last.name}</div>
                            <div className="flex items-center gap-2 text-sm opacity-70">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(last.date)}</span>
                                <span>·</span>
                                <MapPin className="h-4 w-4" />
                                <span>{last.venue}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );

        case "achievement":
            const badges = slide.data.badges as string[];
            const badgeCount = slide.data.count as number;

            return (
                <div className="text-center text-white">
                    <Trophy className="h-16 w-16 mx-auto mb-6 text-yellow-400" />
                    <h2 className="text-3xl font-bold mb-4">{slide.title}</h2>
                    <p className="text-xl opacity-70 mb-8">
                        총 {badgeCount}개의 배지를 획득했어요!
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        {badges.map((badge, i) => (
                            <div
                                key={i}
                                className="bg-white/10 rounded-full px-6 py-3 text-lg"
                            >
                                {badge === "early-bird" && "🌅 얼리버드"}
                                {badge === "festival-goer" && "🎪 페스티벌러"}
                                {badge === "night-owl" && "🦉 올빼미"}
                                {!["early-bird", "festival-goer", "night-owl"].includes(badge) && badge}
                            </div>
                        ))}
                    </div>
                </div>
            );

        case "outro":
            const message = slide.data.message as string;
            const totalEvents = slide.data.totalEvents as number;

            return (
                <div className="text-center text-white">
                    <div className="text-6xl mb-6">🎉</div>
                    <h2 className="text-4xl font-bold mb-4">{slide.title}</h2>
                    <p className="text-xl opacity-80 mb-4">{slide.subtitle}</p>
                    <p className="text-lg opacity-60">{message}</p>
                    <div className="mt-8 text-sm opacity-50">
                        FesMate와 함께한 {totalEvents}번의 공연
                    </div>
                </div>
            );

        default:
            return null;
    }
}
