"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Play, Calendar, Users, Sparkles, TrendingUp } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { MOCK_EVENTS, MOCK_POSTS } from "@/lib/mock-data";
import { getHubMode } from "@/types/event";
import { FriendActivityFeed } from "@/components/social/FriendActivityFeed";
import { LeaderboardPreview } from "@/components/leaderboard/LeaderboardPreview";
import { LiveBadge, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function Home() {
    const now = new Date();

    const liveEvents = MOCK_EVENTS.filter(
        (e) => getHubMode(e, now) === "LIVE" && e.status === "SCHEDULED"
    );

    const upcomingEvents = MOCK_EVENTS.filter((e) => {
        const daysUntil = Math.ceil(
            (new Date(e.startAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil > 0 && daysUntil <= 7 && e.status === "SCHEDULED";
    }).slice(0, 4);

    const recommendedEvents = MOCK_EVENTS.filter(
        (e) => e.status === "SCHEDULED" && getHubMode(e, now) !== "LIVE"
    )
        .sort((a, b) => (b.stats?.wishlistCount || 0) - (a.stats?.wishlistCount || 0))
        .slice(0, 4);

    const recentPosts = MOCK_POSTS.filter(
        (p) => ["companion", "taxi", "meal"].includes(p.type) && p.status === "ACTIVE"
    ).slice(0, 3);

    const totalLiveCount = liveEvents.length;
    const totalUpcomingCount = upcomingEvents.length;
    const totalRecruitingCount = recentPosts.length;

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            <section className="px-4 pt-6 pb-2">
                <h1 className="text-2xl font-bold text-stone-900 mb-1">
                    오늘의 행사
                </h1>
                <p className="text-sm text-stone-500">
                    지금 진행 중이거나 곧 시작하는 행사를 확인하세요
                </p>

                <div className="grid grid-cols-3 gap-3 mt-5">
                    <Link
                        href="/explore?filter=live"
                        className={cn(
                            "flex flex-col items-center justify-center py-5 px-3",
                            "rounded-2xl bg-white shadow-md",
                            "transition-all duration-200",
                            "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold text-red-500">LIVE</span>
                        </div>
                        <span className="text-3xl font-bold text-stone-900">
                            {totalLiveCount}
                        </span>
                        <span className="text-xs text-stone-400 mt-0.5">진행중</span>
                    </Link>

                    <Link
                        href="/explore?filter=upcoming"
                        className={cn(
                            "flex flex-col items-center justify-center py-5 px-3",
                            "rounded-2xl bg-white shadow-md",
                            "transition-all duration-200",
                            "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <Calendar className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-amber-500">SOON</span>
                        </div>
                        <span className="text-3xl font-bold text-stone-900">
                            {totalUpcomingCount}
                        </span>
                        <span className="text-xs text-stone-400 mt-0.5">7일 이내</span>
                    </Link>

                    <Link
                        href="/community?filter=recruiting"
                        className={cn(
                            "flex flex-col items-center justify-center py-5 px-3",
                            "rounded-2xl bg-white shadow-md",
                            "transition-all duration-200",
                            "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-500">모집</span>
                        </div>
                        <span className="text-3xl font-bold text-stone-900">
                            {totalRecruitingCount}
                        </span>
                        <span className="text-xs text-stone-400 mt-0.5">동행/택시팟</span>
                    </Link>
                </div>
            </section>

            {liveEvents.length > 0 && (
                <section className="px-4 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                            <LiveBadge />
                            지금 진행중
                        </h2>
                        <Link
                            href="/explore?filter=live"
                            className="text-sm text-stone-400 flex items-center hover:text-violet-600 transition-colors"
                        >
                            전체보기
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {liveEvents.map((event) => (
                            <Link
                                key={event.id}
                                href={`/event/${event.id}`}
                                className={cn(
                                    "flex items-center gap-4 p-4",
                                    "rounded-2xl bg-white shadow-md",
                                    "transition-all duration-200",
                                    "hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                                )}
                            >
                                <div className="h-16 w-12 rounded-xl bg-stone-100 flex-shrink-0 overflow-hidden relative">
                                    {event.posterUrl ? (
                                        <Image
                                            src={event.posterUrl}
                                            alt={event.title}
                                            fill
                                            sizes="48px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-xs text-stone-300">
                                            No Image
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-stone-900 line-clamp-1 mb-0.5">
                                        {event.title}
                                    </h3>
                                    <p className="text-xs text-stone-500 line-clamp-1">
                                        {event.venue?.name}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center h-11 w-11 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-200">
                                    <Play className="h-5 w-5 fill-current ml-0.5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {upcomingEvents.length > 0 && (
                <section className="py-6">
                    <div className="flex items-center justify-between mb-4 px-4">
                        <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-amber-500" />
                            곧 시작
                        </h2>
                        <Link
                            href="/explore?filter=upcoming"
                            className="text-sm text-stone-400 flex items-center hover:text-violet-600 transition-colors"
                        >
                            전체보기
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-4">
                        {upcomingEvents.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                className="min-w-[160px] w-[160px] flex-shrink-0"
                            />
                        ))}
                    </div>
                </section>
            )}

            <section className="py-6">
                <div className="flex items-center justify-between mb-4 px-4">
                    <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-violet-600" />
                        인기 행사
                    </h2>
                    <Link
                        href="/explore"
                        className="text-sm text-stone-400 flex items-center hover:text-violet-600 transition-colors"
                    >
                        전체보기
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 gap-4 px-4">
                    {recommendedEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            </section>

            <section className="py-6">
                <div className="flex items-center justify-between mb-4 px-4">
                    <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-500" />
                        동행 모집
                    </h2>
                    <Link
                        href="/community"
                        className="text-sm text-stone-400 flex items-center hover:text-violet-600 transition-colors"
                    >
                        전체보기
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="space-y-3 px-4">
                    {recentPosts.map((post) => (
                        <Link
                            key={post.id}
                            href={`/community/${post.id}`}
                            className={cn(
                                "block p-4",
                                "rounded-2xl bg-white shadow-md",
                                "transition-all duration-200",
                                "hover:shadow-lg"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 text-stone-600">
                                    {post.type === "companion" && "동행"}
                                    {post.type === "taxi" && "택시팟"}
                                    {post.type === "meal" && "밥"}
                                </span>
                                <StatusBadge variant="recruiting">모집중</StatusBadge>
                            </div>
                            <p className="text-sm text-stone-800 line-clamp-1">{post.content}</p>
                            <div className="mt-2 text-xs text-stone-400">
                                <Users className="inline h-3.5 w-3.5 mr-1" />
                                {post.currentPeople}/{post.maxPeople}명
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="py-6 px-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-violet-600" />
                        친구 활동
                    </h2>
                </div>
                <div className="bg-white rounded-2xl shadow-md p-4">
                    <FriendActivityFeed limit={3} showViewAll={true} />
                </div>
            </section>

            <section className="py-6 px-4">
                <div className="bg-white rounded-2xl shadow-md p-4">
                    <LeaderboardPreview limit={5} />
                </div>
            </section>

            {liveEvents.length === 0 && upcomingEvents.length === 0 && (
                <section className="px-4 py-12 text-center">
                    <div className="text-5xl mb-4">🎭</div>
                    <h2 className="text-lg font-bold text-stone-900 mb-2">
                        관심있는 행사를 찜해보세요
                    </h2>
                    <p className="text-sm text-stone-500 mb-6">
                        찜한 행사의 소식을 한눈에 확인할 수 있어요
                    </p>
                    <Link
                        href="/explore"
                        className={cn(
                            "inline-flex items-center gap-2 px-6 py-3",
                            "rounded-full bg-violet-600 text-white",
                            "text-sm font-semibold shadow-lg shadow-violet-200",
                            "transition-all duration-200",
                            "hover:bg-violet-700 hover:shadow-xl active:scale-[0.98]"
                        )}
                    >
                        행사 둘러보기
                    </Link>
                </section>
            )}
        </div>
    );
}
