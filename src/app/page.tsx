"use client";

import Link from "next/link";
import { ChevronRight, Play, Calendar, Users, UserPlus } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { MOCK_EVENTS, MOCK_POSTS } from "@/lib/mock-data";
import { getHubMode } from "@/types/event";
import { FriendActivityFeed } from "@/components/social/FriendActivityFeed";
import { LeaderboardPreview } from "@/components/leaderboard/LeaderboardPreview";

/**
 * 홈페이지 - PRD v0.5 기준
 * - 오늘 근처 요약 (MyFes 기준)
 * - 진행중 행사 → 허브 바로가기
 * - 곧 시작/오늘 일정
 * - 추천 행사
 * - 커뮤니티 하이라이트
 */
export default function Home() {
    const now = new Date();

    // 진행중 행사 (LIVE 모드)
    const liveEvents = MOCK_EVENTS.filter(
        (e) => getHubMode(e, now) === "LIVE" && e.status === "SCHEDULED"
    );

    // 다가오는 행사 (7일 이내)
    const upcomingEvents = MOCK_EVENTS.filter((e) => {
        const daysUntil = Math.ceil(
            (new Date(e.startAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil > 0 && daysUntil <= 7 && e.status === "SCHEDULED";
    }).slice(0, 4);

    // 추천 행사 (임시: 인기순)
    const recommendedEvents = MOCK_EVENTS.filter(
        (e) => e.status === "SCHEDULED" && getHubMode(e, now) !== "LIVE"
    )
        .sort((a, b) => (b.stats?.wishlistCount || 0) - (a.stats?.wishlistCount || 0))
        .slice(0, 4);

    // 커뮤니티 최신 글
    const recentPosts = MOCK_POSTS.filter(
        (p) => ["companion", "taxi", "meal"].includes(p.type) && p.status === "ACTIVE"
    ).slice(0, 3);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 히어로 섹션 */}
            <section className="bg-gradient-to-b from-primary/10 to-background px-4 py-8">
                <h1 className="text-2xl font-bold mb-2">
                    안녕하세요! 👋
                </h1>
                <p className="text-muted-foreground">
                    오늘의 행사 소식을 확인해보세요
                </p>
            </section>

            {/* 진행중 행사 */}
            {liveEvents.length > 0 && (
                <section className="px-4 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            진행중인 행사
                        </h2>
                        <Link
                            href="/explore"
                            className="text-sm text-muted-foreground flex items-center hover:text-primary"
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
                                className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
                            >
                                <div className="h-16 w-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                                    {event.posterUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={event.posterUrl}
                                            alt={event.title}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                                            Poster
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white animate-pulse">
                                            LIVE
                                        </span>
                                    </div>
                                    <h3 className="font-medium text-sm line-clamp-1">
                                        {event.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {event.venue.name}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground">
                                    <Play className="h-4 w-4 fill-current" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* 곧 시작 / 다가오는 행사 */}
            {upcomingEvents.length > 0 && (
                <section className="px-4 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            곧 시작하는 행사
                        </h2>
                        <Link
                            href="/explore"
                            className="text-sm text-muted-foreground flex items-center hover:text-primary"
                        >
                            전체보기
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
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

            {/* 추천 행사 */}
            <section className="px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">추천 행사</h2>
                    <Link
                        href="/explore"
                        className="text-sm text-muted-foreground flex items-center hover:text-primary"
                    >
                        전체보기
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {recommendedEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            </section>

            {/* 커뮤니티 하이라이트 */}
            <section className="px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        커뮤니티
                    </h2>
                    <Link
                        href="/community"
                        className="text-sm text-muted-foreground flex items-center hover:text-primary"
                    >
                        전체보기
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="space-y-3">
                    {recentPosts.map((post) => (
                        <div
                            key={post.id}
                            className="rounded-lg border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted">
                                    {post.type === "companion" && "동행"}
                                    {post.type === "taxi" && "택시팟"}
                                    {post.type === "meal" && "밥"}
                                </span>
                                <span className="text-xs text-green-600 font-medium">
                                    모집중
                                </span>
                            </div>
                            <p className="text-sm line-clamp-1">{post.content}</p>
                            <div className="mt-2 text-xs text-muted-foreground">
                                👥 {post.currentPeople}/{post.maxPeople}명
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 친구 활동 */}
            <section className="px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        친구 활동
                    </h2>
                </div>
                <FriendActivityFeed limit={3} showViewAll={true} />
            </section>

            {/* 리더보드 미리보기 */}
            <section className="px-4 py-6">
                <LeaderboardPreview limit={5} />
            </section>

            {/* 빈 상태 / 로그인 유도 */}
            {liveEvents.length === 0 && upcomingEvents.length === 0 && (
                <section className="px-4 py-12 text-center">
                    <div className="text-4xl mb-4">🎭</div>
                    <h2 className="text-lg font-bold mb-2">
                        관심있는 행사를 찜해보세요
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        찜한 행사의 소식을 한눈에 확인할 수 있어요
                    </p>
                    <Link
                        href="/explore"
                        className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium"
                    >
                        행사 둘러보기
                    </Link>
                </section>
            )}
        </div>
    );
}
