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
    Clock,
    ExternalLink,
    ThumbsUp,
    Users,
    MessageSquare,
    Plus,
} from "lucide-react";
import { MOCK_EVENTS, MOCK_POSTS, MOCK_SLOTS, getPostsByEventId, getSlotsByEventId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Event, getHubMode, Slot } from "@/types/event";
import { Post, POST_TYPE_LABELS } from "@/types/post";
import { PostComposer } from "@/components/posts/PostComposer";

// 날짜 포맷 헬퍼
function formatDateTime(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(date));
}

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    }).format(new Date(date));
}

function formatTime(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(date));
}

function getRelativeTime(date: Date) {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
}

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

// 개요 탭
function OverviewTab({ event }: { event: Event }) {
    return (
        <div className="space-y-6">
            {/* 기본 정보 */}
            <section>
                <h3 className="text-lg font-bold mb-3">행사 정보</h3>
                <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium">일시</p>
                            <p className="text-muted-foreground">{formatDateTime(event.startAt)}</p>
                            {event.startAt.getTime() !== event.endAt.getTime() && (
                                <p className="text-muted-foreground">~ {formatDateTime(event.endAt)}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium">장소</p>
                            <p className="text-muted-foreground">{event.venue.name}</p>
                            <p className="text-xs text-muted-foreground">{event.venue.address}</p>
                        </div>
                    </div>
                    {event.price && (
                        <div className="flex items-start gap-3">
                            <span className="h-5 w-5 text-muted-foreground mt-0.5 text-center">₩</span>
                            <div>
                                <p className="font-medium">가격</p>
                                <p className="text-muted-foreground">{event.price}</p>
                            </div>
                        </div>
                    )}
                    {event.ageRestriction && (
                        <div className="flex items-start gap-3">
                            <span className="h-5 w-5 text-muted-foreground mt-0.5 text-center">🔞</span>
                            <div>
                                <p className="font-medium">관람 연령</p>
                                <p className="text-muted-foreground">{event.ageRestriction}</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 설명 */}
            {event.description && (
                <section>
                    <h3 className="text-lg font-bold mb-3">소개</h3>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                </section>
            )}

            {/* 예매 링크 */}
            <section>
                <h3 className="text-lg font-bold mb-3">예매</h3>
                <div className="space-y-2">
                    <button className="w-full flex items-center justify-between rounded-lg border bg-card p-4 text-sm hover:bg-accent transition-colors">
                        <span>인터파크 티켓</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="w-full flex items-center justify-between rounded-lg border bg-card p-4 text-sm hover:bg-accent transition-colors">
                        <span>YES24 티켓</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>
            </section>

            {/* 통계 */}
            {event.stats && (
                <section>
                    <h3 className="text-lg font-bold mb-3">통계</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-2xl font-bold text-primary">{event.stats.wishlistCount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">찜</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{event.stats.attendedCount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">다녀옴</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-2xl font-bold">{event.stats.companionCount}</p>
                            <p className="text-xs text-muted-foreground">동행 모집</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-2xl font-bold">{event.stats.reviewCount}</p>
                            <p className="text-xs text-muted-foreground">후기</p>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

// 허브 탭 (LIVE/RECAP)
function HubTab({ event, posts, slots }: { event: Event; posts: Post[]; slots: Slot[] }) {
    const now = new Date();
    const mode = getHubMode(event, now);
    const [feedFilter, setFeedFilter] = useState<string>("all");

    // 포스트 타입별 분류
    const realTimePosts = posts.filter(p => ["gate", "md", "facility", "safety"].includes(p.type));
    const communityPosts = posts.filter(p => ["companion", "taxi", "meal", "lodge", "transfer"].includes(p.type));
    const reviewPosts = posts.filter(p => ["review", "video", "tip"].includes(p.type));

    // 필터링된 포스트
    const filteredPosts = feedFilter === "all"
        ? posts
        : feedFilter === "realtime"
            ? realTimePosts
            : feedFilter === "community"
                ? communityPosts
                : feedFilter === "review"
                    ? reviewPosts
                    : posts.filter(p => p.type === feedFilter);

    // Now/Next 슬롯 계산
    const currentSlot = slots.find(s => {
        const start = new Date(s.startAt).getTime();
        const end = new Date(s.endAt).getTime();
        return now.getTime() >= start && now.getTime() < end;
    });
    const nextSlot = slots.find(s => new Date(s.startAt).getTime() > now.getTime());

    // 포스트 타입별 색상
    const getPostTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            gate: "bg-blue-100 text-blue-700",
            md: "bg-purple-100 text-purple-700",
            facility: "bg-green-100 text-green-700",
            safety: "bg-red-100 text-red-700",
            official: "bg-yellow-100 text-yellow-700",
            companion: "bg-pink-100 text-pink-700",
            taxi: "bg-orange-100 text-orange-700",
            meal: "bg-amber-100 text-amber-700",
            review: "bg-indigo-100 text-indigo-700",
            video: "bg-cyan-100 text-cyan-700",
        };
        return colors[type] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="space-y-6">
            {/* 모드 표시 */}
            <div className="flex items-center gap-2">
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-bold",
                    mode === "LIVE"
                        ? "bg-red-100 text-red-700 animate-pulse"
                        : "bg-gray-100 text-gray-700"
                )}>
                    {mode === "LIVE" ? "🔴 LIVE" : "📼 RECAP"}
                </span>
                <span className="text-xs text-muted-foreground">
                    {mode === "LIVE" ? "실시간 정보가 활성화되어 있습니다" : "지난 행사의 기록을 확인하세요"}
                </span>
            </div>

            {/* 4박스 요약 */}
            <div className="grid grid-cols-2 gap-3">
                {/* 실시간 */}
                <div className="rounded-lg border bg-card p-3">
                    <h4 className="text-xs font-bold text-muted-foreground mb-2">실시간</h4>
                    {realTimePosts.length > 0 ? (
                        <>
                            <p className="text-sm line-clamp-1">{realTimePosts[0].content}</p>
                            <p className="text-xs text-muted-foreground">{getRelativeTime(realTimePosts[0].createdAt)}</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">아직 제보가 없습니다</p>
                    )}
                </div>

                {/* 타임테이블 */}
                <div className="rounded-lg border bg-card p-3">
                    <h4 className="text-xs font-bold text-muted-foreground mb-2">Now/Next</h4>
                    {currentSlot ? (
                        <>
                            <p className="text-sm font-medium line-clamp-1">{currentSlot.title || currentSlot.artist?.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatTime(currentSlot.startAt)} - {formatTime(currentSlot.endAt)}
                            </p>
                        </>
                    ) : nextSlot ? (
                        <>
                            <p className="text-sm font-medium line-clamp-1">다음: {nextSlot.title || nextSlot.artist?.name}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(nextSlot.startAt)}</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">타임테이블 없음</p>
                    )}
                </div>

                {/* 공식 안내 */}
                <div className="rounded-lg border bg-card p-3">
                    <h4 className="text-xs font-bold text-muted-foreground mb-2">공식 안내</h4>
                    {posts.filter(p => p.type === "official").length > 0 ? (
                        <>
                            <p className="text-sm line-clamp-1">{posts.filter(p => p.type === "official")[0].content}</p>
                            <p className="text-xs text-muted-foreground">{getRelativeTime(posts.filter(p => p.type === "official")[0].createdAt)}</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">공식 안내 없음</p>
                    )}
                </div>

                {/* 커뮤니티 */}
                <div className="rounded-lg border bg-card p-3">
                    <h4 className="text-xs font-bold text-muted-foreground mb-2">커뮤니티</h4>
                    <p className="text-sm">
                        동행 {communityPosts.filter(p => p.type === "companion").length} /
                        양도 {communityPosts.filter(p => p.type === "transfer").length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {communityPosts.length > 0 ? `최근 ${getRelativeTime(communityPosts[0].createdAt)}` : "최근 글 없음"}
                    </p>
                </div>
            </div>

            {/* 허브 피드 */}
            <section>
                <h3 className="text-lg font-bold mb-3">피드</h3>
                {/* 필터 칩 */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
                    {[
                        { key: "all", label: "전체" },
                        { key: "realtime", label: "실시간" },
                        { key: "community", label: "동행" },
                        { key: "review", label: "후기" },
                    ].map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setFeedFilter(filter.key)}
                            className={cn(
                                "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                feedFilter === filter.key
                                    ? "bg-primary text-primary-foreground"
                                    : "border hover:bg-accent"
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* 피드 아이템 */}
                <div className="space-y-3">
                    {filteredPosts.length > 0 ? (
                        filteredPosts.map(post => (
                            <div key={post.id} className="rounded-lg border bg-card p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded", getPostTypeColor(post.type))}>
                                        {POST_TYPE_LABELS[post.type] || post.type}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{getRelativeTime(post.createdAt)}</span>
                                </div>
                                <p className="text-sm">{post.content}</p>
                                {post.images && post.images.length > 0 && (
                                    <div className="mt-2 flex gap-2">
                                        {post.images.map((img, i) => (
                                            <div key={i} className="h-16 w-16 rounded bg-muted" />
                                        ))}
                                    </div>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                    <button className="flex items-center gap-1 hover:text-primary">
                                        <ThumbsUp className="h-3 w-3" />
                                        {post.helpfulCount} 도움됨
                                    </button>
                                    {post.trustLevel && (
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                            post.trustLevel === "A" && "bg-green-100 text-green-700",
                                            post.trustLevel === "B" && "bg-yellow-100 text-yellow-700",
                                            post.trustLevel === "C" && "bg-red-100 text-red-700"
                                        )}>
                                            신뢰도 {post.trustLevel}
                                        </span>
                                    )}
                                    {post.maxPeople && (
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {post.currentPeople}/{post.maxPeople}명
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">아직 글이 없습니다</p>
                            <p className="text-xs">첫 번째 글을 작성해보세요!</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

// 타임테이블 탭
function TimetableTab({ event, slots }: { event: Event; slots: Slot[] }) {
    const now = new Date();
    const [checkedSlots, setCheckedSlots] = useState<Set<string>>(new Set());

    // Now/Next 계산
    const currentSlot = slots.find(s => {
        const start = new Date(s.startAt).getTime();
        const end = new Date(s.endAt).getTime();
        return now.getTime() >= start && now.getTime() < end;
    });

    const toggleSlot = (slotId: string) => {
        setCheckedSlots(prev => {
            const next = new Set(prev);
            if (next.has(slotId)) {
                next.delete(slotId);
            } else {
                next.add(slotId);
            }
            return next;
        });
    };

    // 슬롯을 날짜별로 그룹화
    const slotsByDay = slots.reduce((acc, slot) => {
        const day = slot.day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(slot);
        return acc;
    }, {} as Record<number, Slot[]>);

    return (
        <div className="space-y-6">
            {/* Now/Next */}
            {currentSlot && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-primary">Now Playing</span>
                    </div>
                    <p className="font-medium">{currentSlot.title || currentSlot.artist?.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {formatTime(currentSlot.startAt)} - {formatTime(currentSlot.endAt)} | {currentSlot.stage}
                    </p>
                </div>
            )}

            {/* 타임테이블 */}
            {slots.length > 0 ? (
                Object.entries(slotsByDay).map(([day, daySlots]) => (
                    <div key={day}>
                        {Object.keys(slotsByDay).length > 1 && (
                            <h3 className="font-bold mb-3">Day {day}</h3>
                        )}
                        <div className="space-y-3">
                            {daySlots.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).map(slot => {
                                const isCurrent = currentSlot?.id === slot.id;
                                const isPast = new Date(slot.endAt).getTime() < now.getTime();
                                const isChecked = checkedSlots.has(slot.id);

                                return (
                                    <div
                                        key={slot.id}
                                        className={cn(
                                            "flex items-center gap-3 text-sm p-3 rounded-lg border",
                                            isCurrent && "bg-primary/5 border-primary/20",
                                            isPast && !isCurrent && "opacity-50"
                                        )}
                                    >
                                        <div className="w-14 font-bold text-primary">
                                            {formatTime(slot.startAt)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{slot.title || slot.artist?.name}</p>
                                            <p className="text-xs text-muted-foreground">{slot.stage}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleSlot(slot.id)}
                                            className={cn(
                                                "transition-colors",
                                                isChecked ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                                            )}
                                        >
                                            <Star className={cn("h-5 w-5", isChecked && "fill-yellow-400")} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">타임테이블이 없습니다</p>
                </div>
            )}

            {/* 보고 싶은 슬롯 요약 */}
            {checkedSlots.size > 0 && (
                <div className="rounded-lg border bg-yellow-50 p-4">
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                        내가 보고 싶은 슬롯 ({checkedSlots.size}개)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {slots.filter(s => checkedSlots.has(s.id)).map(slot => (
                            <span key={slot.id} className="text-xs bg-white px-2 py-1 rounded">
                                {formatTime(slot.startAt)} {slot.title || slot.artist?.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// 아티스트 탭
function ArtistsTab({ event }: { event: Event }) {
    return (
        <div className="space-y-4">
            {event.artists && event.artists.length > 0 ? (
                event.artists.map((artist) => (
                    <div
                        key={artist.id}
                        className="flex items-center gap-4 rounded-lg border bg-card p-4"
                    >
                        <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
                            {artist.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={artist.image}
                                    alt={artist.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-2xl">
                                    🎤
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold">{artist.name}</p>
                            <p className="text-sm text-muted-foreground">{artist.genre}</p>
                        </div>
                        <button className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent">
                            팔로우
                        </button>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">아티스트 정보가 없습니다</p>
                </div>
            )}
        </div>
    );
}
