"use client";

import { notFound, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { use, useState, useMemo, useCallback, useEffect } from "react";
import {
    Calendar,
    MapPin,
    Star,
    CheckCircle2,
    Share2,
    ChevronLeft,
    Plus,
    Check,
    Loader2,
} from "lucide-react";
import { getPostsByEventId, getSlotsByEventId } from "@/lib/mock-data";
import { useEvent } from "@/lib/supabase/hooks";
import { cn } from "@/lib/utils";
import { getHubMode, HubMode } from "@/types/event";
import { PostComposer } from "@/components/posts/PostComposer";
import { formatDateTime } from "@/lib/utils/date-format";
import { OverviewTab, HubTab, TimetableTab, ArtistsTab } from "./components";
import { useWishlist } from "@/lib/wishlist-context";
import { useDevContext } from "@/lib/dev-context";
import { useAuth } from "@/lib/auth-context";
import { LoginPromptModal } from "@/components/auth";

interface PageProps {
    params: Promise<{ id: string }>;
}

type TabType = "overview" | "hub" | "timetable" | "artists";

/**
 * 행사 상세 페이지 - PRD v0.5 기준
 * - 상단 헤더: ⭐찜 / ✅다녀옴
 * - 탭 구조: 개요 | 허브 | 타임테이블 | 아티스트
 */
export default function EventDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const router = useRouter();

    // Supabase에서 이벤트 데이터 가져오기 (오류 시 Mock 폴백)
    const { event, isLoading, isFromSupabase } = useEvent(id);

    // URL의 tab 쿼리 파라미터로 초기 탭 결정
    const initialTab = (searchParams.get("tab") as TabType) || "overview";
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // 탭 변경 시 URL도 업데이트
    const handleTabChange = useCallback((tab: TabType) => {
        setActiveTab(tab);
        // URL 업데이트 (새로고침 시 탭 유지)
        const url = new URL(window.location.href);
        if (tab === "overview") {
            url.searchParams.delete("tab");
        } else {
            url.searchParams.set("tab", tab);
        }
        router.replace(url.pathname + url.search, { scroll: false });
    }, [router]);
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState<string>("");

    // 인증 상태
    const { user } = useAuth();

    // URL 변경 시 탭 업데이트 (알림 딥링크 등에서 접근 시)
    useEffect(() => {
        const tabParam = searchParams.get("tab") as TabType;
        if (tabParam && ["overview", "hub", "timetable", "artists"].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // 찜/다녀옴 상태 (Context)
    const { isWishlist, isAttended, toggleWishlist, toggleAttended } = useWishlist();

    // Dev Context - 시간 시뮬레이션, 시나리오 데이터, override 모드
    const {
        getNow,
        overrideMode,
        isDevMode,
        isLoggedIn: isDevLoggedIn,
        scenarioEventId,
        scenarioPosts,
        scenarioSlots,
    } = useDevContext();

    // 이 행사의 포스트와 슬롯 (Dev 모드에서 시나리오 데이터 사용)
    const posts = useMemo(() => {
        // Dev 모드이고 현재 이벤트가 시나리오 이벤트와 같으면 시나리오 데이터 사용
        if (isDevMode && id === scenarioEventId && scenarioPosts.length > 0) {
            return scenarioPosts;
        }
        return getPostsByEventId(id);
    }, [id, isDevMode, scenarioEventId, scenarioPosts]);

    const slots = useMemo(() => {
        if (isDevMode && id === scenarioEventId && scenarioSlots.length > 0) {
            return scenarioSlots;
        }
        return getSlotsByEventId(id);
    }, [id, isDevMode, scenarioEventId, scenarioSlots]);

    // 실제 로그인 또는 Dev 모드 로그인 상태 확인
    const isLoggedIn = !!user || isDevLoggedIn;

    // 로그인 필요한 액션 처리
    const requireAuth = useCallback((action: string, callback: () => void) => {
        if (isLoggedIn) {
            callback();
        } else {
            setPendingAction(action);
            setShowLoginPrompt(true);
        }
    }, [isLoggedIn]);

    // 공유 기능
    const handleShare = useCallback(async () => {
        const shareData = {
            title: event?.title || "FesMate",
            text: `${event?.title} - ${event?.venue?.name}`,
            url: window.location.href,
        };

        try {
            // Web Share API 지원 확인
            if (navigator.share && navigator.canShare?.(shareData)) {
                await navigator.share(shareData);
            } else {
                // Fallback: URL 복사
                await navigator.clipboard.writeText(window.location.href);
                setShareStatus("copied");
                setTimeout(() => setShareStatus("idle"), 2000);
            }
        } catch (error) {
            // 사용자가 공유 취소한 경우 무시
            if ((error as Error).name !== "AbortError") {
                // Fallback: URL 복사
                await navigator.clipboard.writeText(window.location.href);
                setShareStatus("copied");
                setTimeout(() => setShareStatus("idle"), 2000);
            }
        }
    }, [event]);

    // 로딩 중 표시
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">행사 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        notFound();
    }

    // 현재 시간 기준 자동 계산 (Dev 모드에서는 시뮬레이션 시간 사용)
    const now = getNow();
    const autoHubMode = getHubMode(event, now);
    // Override 모드 적용 (AUTO가 아니면 강제 적용)
    const hubMode: HubMode = overrideMode === "AUTO" ? autoHubMode : overrideMode;
    const isOverridden = overrideMode !== "AUTO" && overrideMode !== autoHubMode;

    const tabs: { key: TabType; label: string; badge?: string }[] = [
        { key: "overview", label: "개요" },
        { key: "hub", label: "허브", badge: hubMode === "LIVE" ? "LIVE" : undefined },
        { key: "timetable", label: "타임테이블" },
        { key: "artists", label: "아티스트" },
    ];

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <Link
                    href="/explore"
                    className="flex items-center text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Link>
                <h1 className="flex-1 truncate px-4 text-center text-sm font-bold">
                    {event.title}
                </h1>
                <button
                    onClick={handleShare}
                    className="text-muted-foreground hover:text-foreground relative"
                    title="공유하기"
                >
                    {shareStatus === "copied" ? (
                        <Check className="h-5 w-5 text-green-500" />
                    ) : (
                        <Share2 className="h-5 w-5" />
                    )}
                </button>
            </header>

            {/* Hero Section */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background z-0" />
                <div className="relative z-10 p-6 flex flex-col items-center gap-6">
                    {/* Poster */}
                    <div className="relative aspect-[3/4] w-48 overflow-hidden rounded-lg shadow-xl">
                        {event.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={event.posterUrl}
                                alt={event.title}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
                                Poster
                            </div>
                        )}
                        {/* LIVE/RECAP 배지 */}
                        {hubMode === "LIVE" && event.status === "SCHEDULED" && (
                            <div className="absolute top-2 left-2">
                                <span className={cn(
                                    "px-2 py-1 text-xs font-bold rounded-full bg-red-500 text-white",
                                    !isOverridden && "animate-pulse"
                                )}>
                                    LIVE {isOverridden && isDevMode && "(DEV)"}
                                </span>
                            </div>
                        )}
                        {hubMode === "RECAP" && isOverridden && isDevMode && (
                            <div className="absolute top-2 left-2">
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-600 text-white">
                                    RECAP (DEV)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Key Info */}
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold leading-tight">{event.title}</h2>
                        <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDateTime(event.startAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{event.venue?.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons - ⭐찜 / ✅다녀옴 */}
                    <div className="flex w-full gap-3">
                        <button
                            onClick={() => requireAuth("찜하기", () => toggleWishlist(id))}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-medium transition-colors",
                                isWishlist(id)
                                    ? "bg-yellow-50 border-yellow-400 text-yellow-700"
                                    : "bg-background hover:bg-accent"
                            )}
                        >
                            <Star className={cn("h-4 w-4", isWishlist(id) && "fill-yellow-400")} />
                            <span>찜 {event.stats?.wishlistCount?.toLocaleString()}</span>
                        </button>
                        <button
                            onClick={() => requireAuth("다녀옴 기록", () => toggleAttended(id))}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-medium transition-colors",
                                isAttended(id)
                                    ? "bg-green-50 border-green-400 text-green-700"
                                    : "bg-background hover:bg-accent"
                            )}
                        >
                            <CheckCircle2 className={cn("h-4 w-4", isAttended(id) && "fill-green-400")} />
                            <span>다녀옴 {event.stats?.attendedCount?.toLocaleString()}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="sticky top-14 z-40 bg-background border-b">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={cn(
                                "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1",
                                activeTab === tab.key
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab.label}
                            {tab.badge && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white animate-pulse">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="px-4 py-6">
                {activeTab === "overview" && (
                    <OverviewTab event={event} />
                )}
                {activeTab === "hub" && (
                    <HubTab event={event} posts={posts} slots={slots} />
                )}
                {activeTab === "timetable" && (
                    <TimetableTab event={event} slots={slots} />
                )}
                {activeTab === "artists" && (
                    <ArtistsTab event={event} />
                )}
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-20 right-4 z-40">
                <button
                    onClick={() => setIsComposerOpen(true)}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus className="h-6 w-6" />
                </button>
            </div>

            {/* Post Composer Modal */}
            <PostComposer
                isOpen={isComposerOpen}
                onClose={() => setIsComposerOpen(false)}
                eventId={event.id}
                eventTitle={event.title}
            />

            {/* Login Prompt Modal */}
            <LoginPromptModal
                isOpen={showLoginPrompt}
                onClose={() => setShowLoginPrompt(false)}
                action={pendingAction}
            />
        </div>
    );
}
