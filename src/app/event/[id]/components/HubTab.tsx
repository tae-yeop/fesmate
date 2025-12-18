"use client";

import { useState, useMemo } from "react";
import { ThumbsUp, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, getHubMode, Slot } from "@/types/event";
import { Post, POST_TYPE_LABELS } from "@/types/post";
import { formatTime, getRelativeTime } from "@/lib/utils/date-format";
import { getPostTypeColor, getTrustLevelColor, HUB_MODE_STYLES } from "@/lib/constants/styles";

interface HubTabProps {
    event: Event;
    posts: Post[];
    slots: Slot[];
}

export function HubTab({ event, posts, slots }: HubTabProps) {
    const now = new Date();
    const mode = getHubMode(event, now);
    const [feedFilter, setFeedFilter] = useState<string>("all");

    // 포스트 타입별 분류 (메모이제이션)
    const { realTimePosts, communityPosts, reviewPosts } = useMemo(() => ({
        realTimePosts: posts.filter(p => ["gate", "md", "facility", "safety"].includes(p.type)),
        communityPosts: posts.filter(p => ["companion", "taxi", "meal", "lodge", "transfer"].includes(p.type)),
        reviewPosts: posts.filter(p => ["review", "video", "tip"].includes(p.type)),
    }), [posts]);

    // 필터링된 포스트 (메모이제이션)
    const filteredPosts = useMemo(() => {
        if (feedFilter === "all") return posts;
        if (feedFilter === "realtime") return realTimePosts;
        if (feedFilter === "community") return communityPosts;
        if (feedFilter === "review") return reviewPosts;
        return posts.filter(p => p.type === feedFilter);
    }, [posts, feedFilter, realTimePosts, communityPosts, reviewPosts]);

    // Now/Next 슬롯 계산 (메모이제이션)
    const { currentSlot, nextSlot } = useMemo(() => {
        const current = slots.find(s => {
            const start = new Date(s.startAt).getTime();
            const end = new Date(s.endAt).getTime();
            return now.getTime() >= start && now.getTime() < end;
        });
        const next = slots.find(s => new Date(s.startAt).getTime() > now.getTime());
        return { currentSlot: current, nextSlot: next };
    }, [slots, now]);

    return (
        <div className="space-y-6">
            {/* 모드 표시 */}
            <div className="flex items-center gap-2">
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-bold",
                    HUB_MODE_STYLES[mode]
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
                                            getTrustLevelColor(post.trustLevel)
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
