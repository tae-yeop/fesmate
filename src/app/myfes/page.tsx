"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
    Calendar,
    ChevronUp,
    Star,
    CheckCircle2,
    Play,
    MessageSquare,
    Video,
    Filter,
    MapPin,
} from "lucide-react";
import { MOCK_EVENTS, MOCK_POSTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Event, getHubMode } from "@/types/event";

type TimelineStatus = "upcoming" | "live" | "past";
type FilterType = "all" | "wishlist" | "attended" | "review_pending";

interface UserEvent {
    eventId: string;
    isWishlist: boolean;
    isAttended: boolean;
}

interface TimelineEvent extends Event {
    isWishlist: boolean;
    isAttended: boolean;
    timelineStatus: TimelineStatus;
    reviewCount: number;
    postCount: number;
}

/**
 * MyFes 페이지 - PRD v0.5 기준
 * - 예정+지난 혼합 타임라인
 * - 기본 진입: 오늘 근처 (오늘 앵커)
 * - 상태 배지: ⭐찜 / ✅다녀옴 / 진행중
 */
export default function MyFesPage() {
    const todayRef = useRef<HTMLDivElement>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");
    const [showMiniCalendar, setShowMiniCalendar] = useState(false);

    // Mock: 사용자의 찜/다녀옴 데이터 (더 많은 행사 포함)
    const [userEvents] = useState<UserEvent[]>([
        { eventId: "55948", isWishlist: true, isAttended: false },
        { eventId: "e2", isWishlist: true, isAttended: false },        // Seoul Jazz (LIVE)
        { eventId: "24016943", isWishlist: true, isAttended: true },  // 시카고 (RECAP)
        { eventId: "e5", isWishlist: true, isAttended: false },       // 연기된 공연
        { eventId: "e6", isWishlist: true, isAttended: false },       // 다가오는 인디 공연
    ]);

    const now = new Date();

    // 타임라인 데이터 생성
    const timelineEvents = useMemo(() => {
        return userEvents.map(ue => {
            const event = MOCK_EVENTS.find(e => e.id === ue.eventId);
            if (!event) return null;

            const hubMode = getHubMode(event, now);
            const isEnded = new Date(event.endAt).getTime() < now.getTime();

            // 사용자가 작성한 글 수 계산
            const userPosts = MOCK_POSTS.filter(p => p.eventId === event.id);
            const reviewCount = userPosts.filter(p => p.type === "review" || p.type === "video").length;
            const postCount = userPosts.length;

            return {
                ...event,
                isWishlist: ue.isWishlist,
                isAttended: ue.isAttended,
                timelineStatus: hubMode === "LIVE"
                    ? "live" as TimelineStatus
                    : isEnded || ue.isAttended
                        ? "past" as TimelineStatus
                        : "upcoming" as TimelineStatus,
                reviewCount,
                postCount,
            };
        }).filter((e): e is TimelineEvent => e !== null);
    }, [userEvents, now]);

    // 필터 적용
    const filteredEvents = useMemo(() => {
        switch (activeFilter) {
            case "wishlist":
                return timelineEvents.filter(e => e.isWishlist && !e.isAttended);
            case "attended":
                return timelineEvents.filter(e => e.isAttended);
            case "review_pending":
                return timelineEvents.filter(e => e.isAttended && e.reviewCount === 0);
            default:
                return timelineEvents;
        }
    }, [timelineEvents, activeFilter]);

    // 상태별 그룹화
    const liveEvents = filteredEvents.filter(e => e.timelineStatus === "live");
    const upcomingEvents = filteredEvents.filter(e => e.timelineStatus === "upcoming")
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const pastEvents = filteredEvents.filter(e => e.timelineStatus === "past")
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    // 오늘로 스크롤
    const scrollToToday = () => {
        todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // 초기 로드시 오늘로 스크롤
    useEffect(() => {
        setTimeout(scrollToToday, 100);
    }, []);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 헤더 */}
            <div className="sticky top-14 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-lg font-bold">MyFes</h1>
                        <button
                            onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                            className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent flex items-center gap-1"
                        >
                            <Calendar className="h-3 w-3" />
                            캘린더
                        </button>
                    </div>

                    {/* 필터 칩 */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {[
                            { key: "all" as FilterType, label: "전체", count: timelineEvents.length },
                            { key: "wishlist" as FilterType, label: "찜", count: timelineEvents.filter(e => e.isWishlist && !e.isAttended).length },
                            { key: "attended" as FilterType, label: "다녀옴", count: timelineEvents.filter(e => e.isAttended).length },
                            { key: "review_pending" as FilterType, label: "리뷰 미작성", count: timelineEvents.filter(e => e.isAttended && e.reviewCount === 0).length },
                        ].map(filter => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={cn(
                                    "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                                    activeFilter === filter.key
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-accent"
                                )}
                            >
                                {filter.label}
                                {filter.count > 0 && (
                                    <span className={cn(
                                        "ml-1 px-1.5 rounded-full text-[10px]",
                                        activeFilter === filter.key ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                                    )}>
                                        {filter.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 오늘로 이동 버튼 */}
            <button
                onClick={scrollToToday}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
            >
                <ChevronUp className="h-4 w-4" />
                오늘로 이동
            </button>

            {/* 타임라인 */}
            <div className="px-4 py-6 space-y-8">
                {/* 진행중 */}
                {liveEvents.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            진행중
                        </h2>
                        <div className="space-y-3">
                            {liveEvents.map((event) => (
                                <TimelineCard
                                    key={event.id}
                                    event={event}
                                    status="live"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 오늘 마커 */}
                <div ref={todayRef} className="flex items-center gap-2 py-2" id="today">
                    <div className="h-px flex-1 bg-primary" />
                    <span className="text-xs font-bold text-primary px-2 bg-primary/10 rounded-full py-1">
                        오늘 ({new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(now)})
                    </span>
                    <div className="h-px flex-1 bg-primary" />
                </div>

                {/* 예정 */}
                {upcomingEvents.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-muted-foreground mb-3">
                            다가오는 행사 ({upcomingEvents.length})
                        </h2>
                        <div className="space-y-3">
                            {upcomingEvents.map((event) => (
                                <TimelineCard
                                    key={event.id}
                                    event={event}
                                    status="upcoming"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 지난 행사 */}
                {pastEvents.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-muted-foreground mb-3">
                            지난 행사 ({pastEvents.length})
                        </h2>
                        <div className="space-y-3">
                            {pastEvents.map((event) => (
                                <TimelineCard
                                    key={event.id}
                                    event={event}
                                    status="past"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 빈 상태 */}
                {filteredEvents.length === 0 && (
                    <div className="text-center py-12">
                        <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-muted-foreground mb-4">
                            {activeFilter === "all" ? "아직 찜한 행사가 없어요" : "해당하는 행사가 없어요"}
                        </p>
                        <Link
                            href="/explore"
                            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
                        >
                            행사 둘러보기
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

// 날짜 포맷 헬퍼
function formatDate(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
    }).format(new Date(date));
}

// D-Day 계산
function getDday(date: Date) {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "D-Day";
    if (days > 0) return `D-${days}`;
    return `D+${Math.abs(days)}`;
}

// 타임라인 카드 컴포넌트
function TimelineCard({
    event,
    status,
}: {
    event: TimelineEvent;
    status: TimelineStatus;
}) {
    const isPastOrLive = status === "past" || status === "live";

    return (
        <Link
            href={`/event/${event.id}`}
            className="block rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
        >
            <div className="flex gap-4">
                {/* 포스터 */}
                <div className="relative h-24 w-18 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
                    {event.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={event.posterUrl}
                            alt={event.title}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                            Poster
                        </div>
                    )}
                    {status === "live" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                    )}
                    {status === "upcoming" && (
                        <div className="absolute top-1 right-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {getDday(event.startAt)}
                        </div>
                    )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                    {/* 배지 */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {event.isWishlist && !event.isAttended && (
                            <span className="flex items-center gap-0.5 text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                                <Star className="h-3 w-3 fill-yellow-400" />
                                찜
                            </span>
                        )}
                        {event.isAttended && (
                            <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                <CheckCircle2 className="h-3 w-3 fill-green-400" />
                                다녀옴
                            </span>
                        )}
                        {status === "live" && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium animate-pulse">
                                LIVE
                            </span>
                        )}
                        {event.status === "POSTPONED" && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                일정 변경
                            </span>
                        )}
                    </div>

                    {/* 제목 */}
                    <h3 className="font-medium text-sm line-clamp-1 mb-1">
                        {event.title}
                    </h3>

                    {/* 일시/장소 */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.startAt)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.venue.name}
                    </p>

                    {/* 내가 남긴 것 */}
                    {event.postCount > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                                <MessageSquare className="h-3 w-3" />
                                {event.postCount}
                            </span>
                            {event.reviewCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                    <Video className="h-3 w-3" />
                                    {event.reviewCount}
                                </span>
                            )}
                        </div>
                    )}

                    {/* 퀵 액션 */}
                    <div className="mt-2 flex gap-2 flex-wrap">
                        {status === "live" && (
                            <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                                허브 보기
                            </span>
                        )}
                        {status === "upcoming" && (
                            <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                                타임테이블
                            </span>
                        )}
                        {status === "past" && (
                            <>
                                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                                    RECAP
                                </span>
                                {event.reviewCount === 0 && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        리뷰 쓰기
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
