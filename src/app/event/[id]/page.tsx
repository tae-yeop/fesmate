"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { use, useState, useMemo } from "react";
import {
    Calendar,
    MapPin,
    Star,
    CheckCircle2,
    Share2,
    ChevronLeft,
    Plus,
} from "lucide-react";
import { MOCK_EVENTS, getPostsByEventId, getSlotsByEventId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { getHubMode } from "@/types/event";
import { PostComposer } from "@/components/posts/PostComposer";
import { formatDateTime } from "@/lib/utils/date-format";
import { OverviewTab, HubTab, TimetableTab, ArtistsTab } from "./components";

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
    const event = MOCK_EVENTS.find((e) => e.id === id);
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [isWishlist, setIsWishlist] = useState(false);
    const [isAttended, setIsAttended] = useState(false);
    const [isComposerOpen, setIsComposerOpen] = useState(false);

    // 이 행사의 포스트와 슬롯
    const posts = useMemo(() => getPostsByEventId(id), [id]);
    const slots = useMemo(() => getSlotsByEventId(id), [id]);

    if (!event) {
        notFound();
    }

    // 현재 시간 기준 자동 계산
    const now = new Date();
    const hubMode = getHubMode(event, now);

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
                <button className="text-muted-foreground hover:text-foreground">
                    <Share2 className="h-5 w-5" />
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
                        {/* LIVE 배지 */}
                        {hubMode === "LIVE" && event.status === "SCHEDULED" && (
                            <div className="absolute top-2 left-2">
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-500 text-white animate-pulse">
                                    LIVE
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
                                <span>{event.venue.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons - ⭐찜 / ✅다녀옴 */}
                    <div className="flex w-full gap-3">
                        <button
                            onClick={() => setIsWishlist(!isWishlist)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-medium transition-colors",
                                isWishlist
                                    ? "bg-yellow-50 border-yellow-400 text-yellow-700"
                                    : "bg-background hover:bg-accent"
                            )}
                        >
                            <Star className={cn("h-4 w-4", isWishlist && "fill-yellow-400")} />
                            <span>찜 {event.stats?.wishlistCount?.toLocaleString()}</span>
                        </button>
                        <button
                            onClick={() => setIsAttended(!isAttended)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-medium transition-colors",
                                isAttended
                                    ? "bg-green-50 border-green-400 text-green-700"
                                    : "bg-background hover:bg-accent"
                            )}
                        >
                            <CheckCircle2 className={cn("h-4 w-4", isAttended && "fill-green-400")} />
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
                            onClick={() => setActiveTab(tab.key)}
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
        </div>
    );
}
