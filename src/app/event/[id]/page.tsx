"use client";

import { notFound, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
    Clock,
    Ticket,
    Users,
} from "lucide-react";
import { getSlotsByEventId } from "@/lib/mock-data";
import { useEvent, useEventCounts } from "@/lib/supabase/hooks";
import { usePost } from "@/lib/post-context";
import { cn, isValidUUID } from "@/lib/utils";
import { getHubMode, HubMode, getDDayBadge } from "@/types/event";
import { PostComposer } from "@/components/posts/PostComposer";
import { formatDateTime } from "@/lib/utils/date-format";
import { OverviewTab, HubTab, TimetableTab, ArtistsTab } from "./components";
import { useWishlist } from "@/lib/wishlist-context";
import { useDevContext } from "@/lib/dev-context";
import { useAuth } from "@/lib/auth-context";
import { useEventRegistration } from "@/lib/event-registration-context";
import { LoginPromptModal } from "@/components/auth";
import { LiveBadge, StatusBadge, TabSlider, type TabItem } from "@/components/ui";

interface PageProps {
    params: Promise<{ id: string }>;
}

type TabType = "overview" | "hub" | "timetable" | "artists";

export default function EventDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const router = useRouter();

    const { getEvent: getUserEvent } = useEventRegistration();

    const isUserEvent = id.startsWith("user-event-");

    const { event: supabaseEvent, isLoading: isSupabaseLoading } = useEvent(isUserEvent ? null : id);

    const userRegisteredEvent = isUserEvent ? getUserEvent(id) : undefined;
    const event = userRegisteredEvent || supabaseEvent;
    const isLoading = isUserEvent ? false : isSupabaseLoading;

    const { wishlistCount: realtimeWishlistCount, attendedCount: realtimeAttendedCount } = useEventCounts({
        eventId: id,
    });

    const initialTab = (searchParams.get("tab") as TabType) || "overview";
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab as TabType);
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

    const { user } = useAuth();

    useEffect(() => {
        const tabParam = searchParams.get("tab") as TabType;
        if (tabParam && ["overview", "hub", "timetable", "artists"].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    const { isWishlist, isAttended, toggleWishlist, toggleAttended } = useWishlist();

    const isMockEvent = !isValidUUID(id) || isUserEvent;
    const [localWishlistDelta, setLocalWishlistDelta] = useState(0);
    const [localAttendedDelta, setLocalAttendedDelta] = useState(0);

    const handleToggleWishlist = useCallback(() => {
        const wasWishlisted = isWishlist(id);
        toggleWishlist(id);
        if (isMockEvent) {
            setLocalWishlistDelta(prev => prev + (wasWishlisted ? -1 : 1));
        }
    }, [id, isWishlist, toggleWishlist, isMockEvent]);

    const handleToggleAttended = useCallback(() => {
        const wasAttended = isAttended(id);
        toggleAttended(id);
        if (isMockEvent) {
            setLocalAttendedDelta(prev => prev + (wasAttended ? -1 : 1));
        }
    }, [id, isAttended, toggleAttended, isMockEvent]);

    const displayWishlistCount = isMockEvent
        ? (event?.stats?.wishlistCount || 0) + localWishlistDelta
        : (realtimeWishlistCount || event?.stats?.wishlistCount || 0);
    const displayAttendedCount = isMockEvent
        ? (event?.stats?.attendedCount || 0) + localAttendedDelta
        : (realtimeAttendedCount || event?.stats?.attendedCount || 0);

    const {
        getNow,
        overrideMode,
        isDevMode,
        isLoggedIn: isDevLoggedIn,
        scenarioEventId,
        scenarioPosts,
        scenarioSlots,
    } = useDevContext();

    const { getPostsByEvent } = usePost();

    const posts = useMemo(() => {
        if (isDevMode && id === scenarioEventId && scenarioPosts.length > 0) {
            return scenarioPosts;
        }
        return getPostsByEvent(id);
    }, [id, isDevMode, scenarioEventId, scenarioPosts, getPostsByEvent]);

    const slots = useMemo(() => {
        if (isDevMode && id === scenarioEventId && scenarioSlots.length > 0) {
            return scenarioSlots;
        }
        return getSlotsByEventId(id);
    }, [id, isDevMode, scenarioEventId, scenarioSlots]);

    const isLoggedIn = !!user || isDevLoggedIn;

    const requireAuth = useCallback((action: string, callback: () => void) => {
        if (isLoggedIn) {
            callback();
        } else {
            setPendingAction(action);
            setShowLoginPrompt(true);
        }
    }, [isLoggedIn]);

    const handleShare = useCallback(async () => {
        const shareData = {
            title: event?.title || "FesMate",
            text: `${event?.title} - ${event?.venue?.name}`,
            url: window.location.href,
        };

        try {
            if (navigator.share && navigator.canShare?.(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setShareStatus("copied");
                setTimeout(() => setShareStatus("idle"), 2000);
            }
        } catch (error) {
            if ((error as Error).name !== "AbortError") {
                await navigator.clipboard.writeText(window.location.href);
                setShareStatus("copied");
                setTimeout(() => setShareStatus("idle"), 2000);
            }
        }
    }, [event]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-text-secondary">행사 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        notFound();
    }

    const now = getNow();
    const autoHubMode = getHubMode(event, now);
    const hubMode: HubMode = overrideMode === "AUTO" ? autoHubMode : overrideMode;
    const isOverridden = overrideMode !== "AUTO" && overrideMode !== autoHubMode;
    const dDayBadge = getDDayBadge(event.startAt, now);

    const tabs: TabItem[] = [
        { id: "overview", label: "개요" },
        { id: "hub", label: "허브", isLive: hubMode === "LIVE" },
        { id: "timetable", label: "타임테이블" },
        { id: "artists", label: "아티스트" },
    ];

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    return (
        <div className="min-h-screen bg-background pb-24">
            <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <Link
                    href="/explore"
                    className="flex items-center text-text-muted hover:text-text-primary transition-colors"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Link>
                <h1 className="flex-1 truncate px-4 text-center text-sm font-bold text-text-primary">
                    {event.title}
                </h1>
                <button
                    onClick={handleShare}
                    className="text-text-muted hover:text-text-primary transition-colors relative"
                    title="공유하기"
                >
                    {shareStatus === "copied" ? (
                        <Check className="h-5 w-5 text-status-recruiting" />
                    ) : (
                        <Share2 className="h-5 w-5" />
                    )}
                </button>
            </header>

            <div className="relative">
                <div className="absolute inset-0 h-64 bg-gradient-to-b from-primary/5 to-background z-0" />
                <div className="relative z-10 p-6 flex flex-col items-center gap-5">
                    <div className="relative aspect-[3/4] w-44 overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]">
                        {event.posterUrl ? (
                            <Image
                                src={event.posterUrl}
                                alt={event.title}
                                fill
                                sizes="176px"
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="absolute inset-0 bg-background-secondary flex items-center justify-center text-text-muted">
                                Poster
                            </div>
                        )}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {hubMode === "LIVE" && event.status === "SCHEDULED" && (
                                <LiveBadge />
                            )}
                            {hubMode === "RECAP" && event.status === "SCHEDULED" && (
                                <StatusBadge variant="ended">RECAP</StatusBadge>
                            )}
                            {hubMode !== "LIVE" && hubMode !== "RECAP" && dDayBadge && event.status === "SCHEDULED" && (
                                <StatusBadge variant="soon">{dDayBadge}</StatusBadge>
                            )}
                            {event.status === "CANCELED" && (
                                <StatusBadge variant="canceled">취소됨</StatusBadge>
                            )}
                            {event.status === "POSTPONED" && (
                                <StatusBadge variant="postponed">일정 변경</StatusBadge>
                            )}
                            {isOverridden && isDevMode && (
                                <StatusBadge variant="dday">DEV</StatusBadge>
                            )}
                        </div>
                    </div>

                    <div className="text-center space-y-2 max-w-xs">
                        <h2 className="text-xl font-bold leading-tight text-text-primary">{event.title}</h2>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5",
                            "rounded-full bg-card shadow-[var(--shadow-sm)]",
                            "text-xs text-text-secondary"
                        )}>
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span>{formatDateTime(event.startAt)}</span>
                        </div>
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5",
                            "rounded-full bg-card shadow-[var(--shadow-sm)]",
                            "text-xs text-text-secondary"
                        )}>
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span>{formatTime(event.startAt)}</span>
                        </div>
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5",
                            "rounded-full bg-card shadow-[var(--shadow-sm)]",
                            "text-xs text-text-secondary"
                        )}>
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span className="max-w-[120px] truncate">{event.venue?.name}</span>
                        </div>
                        {event.ticketLinks && event.ticketLinks.length > 0 && (
                            <a
                                href={event.ticketLinks[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5",
                                    "rounded-full bg-primary/10 shadow-[var(--shadow-sm)]",
                                    "text-xs text-primary font-medium",
                                    "hover:bg-primary/20 transition-colors"
                                )}
                            >
                                <Ticket className="h-3.5 w-3.5" />
                                <span>예매</span>
                            </a>
                        )}
                    </div>

                    <div className="flex w-full gap-3 max-w-sm">
                        <button
                            onClick={() => requireAuth("찜하기", handleToggleWishlist)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5",
                                "rounded-full text-sm font-medium",
                                "transition-all duration-[var(--transition-normal)]",
                                isWishlist(id)
                                    ? "bg-warning/10 text-warning border border-warning"
                                    : "bg-card border border-border hover:border-warning hover:text-warning shadow-[var(--shadow-sm)]"
                            )}
                        >
                            <Star className={cn("h-4 w-4", isWishlist(id) && "fill-warning")} />
                            <span>찜 {displayWishlistCount.toLocaleString()}</span>
                        </button>
                        <button
                            onClick={() => requireAuth("다녀옴 기록", handleToggleAttended)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5",
                                "rounded-full text-sm font-medium",
                                "transition-all duration-[var(--transition-normal)]",
                                isAttended(id)
                                    ? "bg-status-recruiting/10 text-status-recruiting border border-status-recruiting"
                                    : "bg-card border border-border hover:border-status-recruiting hover:text-status-recruiting shadow-[var(--shadow-sm)]"
                            )}
                        >
                            <CheckCircle2 className={cn("h-4 w-4", isAttended(id) && "fill-status-recruiting")} />
                            <span>다녀옴 {displayAttendedCount.toLocaleString()}</span>
                        </button>
                    </div>

                    {(displayWishlistCount > 0 || displayAttendedCount > 0 || (event.stats?.companionCount ?? 0) > 0) && (
                        <div className="flex items-center gap-4 text-xs text-text-muted">
                            {displayWishlistCount > 0 && (
                                <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    {displayWishlistCount.toLocaleString()}명 찜
                                </span>
                            )}
                            {displayAttendedCount > 0 && (
                                <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {displayAttendedCount.toLocaleString()}명 다녀옴
                                </span>
                            )}
                            {(event.stats?.companionCount ?? 0) > 0 && (
                                <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {event.stats?.companionCount}개 동행글
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="sticky top-14 z-40 bg-background">
                <TabSlider
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    fullWidth
                />
            </div>

            <div className="px-4 py-6" id={`tabpanel-${activeTab}`} role="tabpanel">
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

            <div className="fixed bottom-20 right-4 z-40">
                <button
                    onClick={() => setIsComposerOpen(true)}
                    className={cn(
                        "flex h-14 w-14 items-center justify-center",
                        "rounded-full bg-primary text-primary-foreground",
                        "shadow-[var(--shadow-lg)]",
                        "transition-transform duration-[var(--transition-normal)]",
                        "hover:scale-105 active:scale-95"
                    )}
                >
                    <Plus className="h-6 w-6" />
                </button>
            </div>

            <PostComposer
                isOpen={isComposerOpen}
                onClose={() => setIsComposerOpen(false)}
                eventId={event.id}
                eventTitle={event.title}
            />

            <LoginPromptModal
                isOpen={showLoginPrompt}
                onClose={() => setShowLoginPrompt(false)}
                action={pendingAction}
            />
        </div>
    );
}
