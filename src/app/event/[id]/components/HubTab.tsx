"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ThumbsUp, Users, MessageSquare, MapPin, ExternalLink, Settings, User, Star, Video, FileText, TrendingUp, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, getHubMode, Slot, HubMode } from "@/types/event";
import { Post, POST_TYPE_LABELS } from "@/types/post";
import { formatTime, getRelativeTime } from "@/lib/utils/date-format";
import { getPostTypeColor, getTrustLevelColor, HUB_MODE_STYLES } from "@/lib/constants/styles";
import { MapActionSheet } from "@/components/maps";
import { getDefaultMapApp, openMap } from "@/lib/utils/map-deeplink";
import { maskContactInfo } from "@/lib/utils/contact-mask";
import { useDevContext } from "@/lib/dev-context";
import { useAuth } from "@/lib/auth-context";
import { useHelpful } from "@/lib/helpful-context";
import { useBlock } from "@/lib/block-context";
import { useComment } from "@/lib/comment-context";
import { MOCK_USERS } from "@/lib/mock-data";
import { PostDetailModal } from "@/components/posts/PostDetailModal";

interface HubTabProps {
    event: Event;
    posts: Post[];
    slots: Slot[];
}

export function HubTab({ event, posts, slots }: HubTabProps) {
    const { user } = useAuth();
    const { getNow, overrideMode, isDevMode, isLoggedIn: isDevLoggedIn } = useDevContext();
    const { toggleHelpful, isHelpful, getHelpfulCount } = useHelpful();
    const { isBlocked } = useBlock();
    const { getCommentCount } = useComment();
    const now = getNow();

    // 실제 로그인 또는 Dev 모드 로그인 상태 확인
    const isLoggedIn = !!user || isDevLoggedIn;

    // 비로그인 시 연락처 마스킹 헬퍼
    const getDisplayContent = (content: string) => isLoggedIn ? content : maskContactInfo(content);

    // 차단된 사용자의 글 필터링
    const visiblePosts = useMemo(() => {
        return posts.filter(p => !isBlocked(p.userId));
    }, [posts, isBlocked]);

    // 작성자 닉네임 가져오기
    const getUserNickname = (userId: string) => {
        const user = MOCK_USERS.find(u => u.id === userId);
        return user?.nickname || "익명";
    };

    // overrideMode가 AUTO가 아니면 강제 적용
    const autoMode = getHubMode(event, now);
    const mode: HubMode = overrideMode === "AUTO" ? autoMode : overrideMode;
    const isOverridden = overrideMode !== "AUTO" && overrideMode !== autoMode;

    const [feedFilter, setFeedFilter] = useState<string>("all");
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    // 지도 액션시트 상태
    const [mapActionSheetOpen, setMapActionSheetOpen] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<{ placeText: string; placeHint?: string } | null>(null);

    // 지도 보기 핸들러
    const handleOpenMap = (placeText: string, placeHint?: string) => {
        const defaultApp = getDefaultMapApp();
        // 기본 지도앱이 설정되어 있으면 바로 열기
        if (defaultApp && localStorage.getItem("fesmate_default_map_app")) {
            openMap(defaultApp, placeText, placeHint);
        } else {
            // 설정 안 되어 있으면 액션시트 표시
            setSelectedPlace({ placeText, placeHint });
            setMapActionSheetOpen(true);
        }
    };

    // 지도 설정 변경 핸들러 (항상 액션시트 열기)
    const handleOpenMapSettings = (placeText: string, placeHint?: string) => {
        setSelectedPlace({ placeText, placeHint });
        setMapActionSheetOpen(true);
    };

    // 포스트 타입별 분류 (메모이제이션) - 차단된 사용자 제외
    const { realTimePosts, communityPosts, reviewPosts } = useMemo(() => ({
        realTimePosts: visiblePosts.filter(p => ["gate", "md", "facility", "safety"].includes(p.type)),
        communityPosts: visiblePosts.filter(p => ["companion", "taxi", "meal", "lodge", "transfer"].includes(p.type)),
        reviewPosts: visiblePosts.filter(p => ["review", "video", "tip"].includes(p.type)),
    }), [visiblePosts]);

    // 필터링된 포스트 (메모이제이션)
    const filteredPosts = useMemo(() => {
        if (feedFilter === "all") return visiblePosts;
        if (feedFilter === "realtime") return realTimePosts;
        if (feedFilter === "community") return communityPosts;
        if (feedFilter === "review") return reviewPosts;
        return visiblePosts.filter(p => p.type === feedFilter);
    }, [visiblePosts, feedFilter, realTimePosts, communityPosts, reviewPosts]);

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

    // RECAP 모드 요약 데이터 (메모이제이션)
    const recapSummary = useMemo(() => {
        if (mode !== "RECAP") return null;

        // 리뷰 평균 평점 계산
        const reviewsWithRating = reviewPosts.filter(p => p.type === "review" && p.rating);
        const avgRating = reviewsWithRating.length > 0
            ? reviewsWithRating.reduce((sum, p) => sum + (p.rating || 0), 0) / reviewsWithRating.length
            : null;

        // 베스트 후기 (도움됨 가장 많은)
        const bestReview = reviewPosts
            .filter(p => p.type === "review")
            .sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0))[0];

        // 베스트 영상
        const bestVideo = reviewPosts
            .filter(p => p.type === "video")
            .sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0))[0];

        // 총 리뷰/영상 수
        const totalReviews = reviewPosts.filter(p => p.type === "review").length;
        const totalVideos = reviewPosts.filter(p => p.type === "video").length;

        return { avgRating, bestReview, bestVideo, totalReviews, totalVideos };
    }, [mode, reviewPosts]);

    return (
        <div className="space-y-6">
            {/* 모드 표시 */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-bold",
                    HUB_MODE_STYLES[mode]
                )}>
                    {mode === "LIVE" ? "🔴 LIVE" : "📼 RECAP"}
                </span>
                {isOverridden && isDevMode && (
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-medium">
                        DEV: {overrideMode} 강제 적용 (원래: {autoMode})
                    </span>
                )}
                <span className="text-xs text-muted-foreground">
                    {mode === "LIVE" ? "실시간 정보가 활성화되어 있습니다" : "지난 행사의 기록을 확인하세요"}
                </span>
            </div>

            {/* RECAP 모드 요약 */}
            {mode === "RECAP" && recapSummary && (
                <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm">행사 요약</h3>
                    </div>

                    {/* 통계 */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-card p-3">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                            </div>
                            <p className="text-lg font-bold">
                                {recapSummary.avgRating ? recapSummary.avgRating.toFixed(1) : "-"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">평균 평점</p>
                        </div>
                        <div className="rounded-lg bg-card p-3">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <FileText className="h-4 w-4 text-blue-500" />
                            </div>
                            <p className="text-lg font-bold">{recapSummary.totalReviews}</p>
                            <p className="text-[10px] text-muted-foreground">후기</p>
                        </div>
                        <div className="rounded-lg bg-card p-3">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Video className="h-4 w-4 text-red-500" />
                            </div>
                            <p className="text-lg font-bold">{recapSummary.totalVideos}</p>
                            <p className="text-[10px] text-muted-foreground">영상</p>
                        </div>
                    </div>

                    {/* 베스트 후기 */}
                    {recapSummary.bestReview && (
                        <div className="rounded-lg bg-card p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">BEST 후기</span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <ThumbsUp className="h-3 w-3" />
                                    {recapSummary.bestReview.helpfulCount} 도움됨
                                </span>
                            </div>
                            <p className="text-sm line-clamp-2">{recapSummary.bestReview.content}</p>
                            <Link
                                href={`/user/${recapSummary.bestReview.userId}`}
                                className="text-xs text-muted-foreground mt-1 hover:text-primary hover:underline inline-block"
                            >
                                - {getUserNickname(recapSummary.bestReview.userId)}
                            </Link>
                        </div>
                    )}

                    {/* 베스트 영상 */}
                    {recapSummary.bestVideo && (
                        <div className="rounded-lg bg-card p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">BEST 영상</span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <ThumbsUp className="h-3 w-3" />
                                    {recapSummary.bestVideo.helpfulCount} 도움됨
                                </span>
                            </div>
                            <p className="text-sm line-clamp-2">{recapSummary.bestVideo.content}</p>
                            <Link
                                href={`/user/${recapSummary.bestVideo.userId}`}
                                className="text-xs text-muted-foreground mt-1 hover:text-primary hover:underline inline-block"
                            >
                                - {getUserNickname(recapSummary.bestVideo.userId)}
                            </Link>
                        </div>
                    )}

                    {/* 데이터 부족 시 CTA */}
                    {!recapSummary.bestReview && !recapSummary.bestVideo && (
                        <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">아직 후기/영상이 없습니다</p>
                            <p className="text-xs mt-1">첫 번째 후기를 남겨보세요!</p>
                        </div>
                    )}
                </div>
            )}

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
                    {visiblePosts.filter(p => p.type === "official").length > 0 ? (
                        <>
                            <p className="text-sm line-clamp-1">{visiblePosts.filter(p => p.type === "official")[0].content}</p>
                            <p className="text-xs text-muted-foreground">{getRelativeTime(visiblePosts.filter(p => p.type === "official")[0].createdAt)}</p>
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
                            <div
                                key={post.id}
                                className="rounded-lg border bg-card p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                                onClick={() => setSelectedPost(post)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded", getPostTypeColor(post.type))}>
                                            {POST_TYPE_LABELS[post.type] || post.type}
                                        </span>
                                        <Link
                                            href={`/user/${post.userId}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                                        >
                                            <User className="h-3 w-3" />
                                            {getUserNickname(post.userId)}
                                        </Link>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{getRelativeTime(post.createdAt)}</span>
                                </div>
                                <p className="text-sm line-clamp-2">{getDisplayContent(post.content)}</p>
                                {post.images && post.images.length > 0 && (
                                    <div className="mt-2 flex gap-2">
                                        {post.images.map((_, i) => (
                                            <div key={i} className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                                                <Camera className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleHelpful(post.id);
                                        }}
                                        className={cn(
                                            "flex items-center gap-1 transition-colors",
                                            isHelpful(post.id)
                                                ? "text-primary font-medium"
                                                : "hover:text-primary"
                                        )}
                                    >
                                        <ThumbsUp className={cn("h-3 w-3", isHelpful(post.id) && "fill-current")} />
                                        {getHelpfulCount(post.id, post.helpfulCount)} 도움됨
                                    </button>
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        {getCommentCount(post.id)}
                                    </span>
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
                                    {post.placeText && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {post.placeText}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenMap(post.placeText!, post.placeHint);
                                                }}
                                                className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                지도
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenMapSettings(post.placeText!, post.placeHint);
                                                }}
                                                className="text-muted-foreground hover:text-primary"
                                                title="지도앱 설정 변경"
                                            >
                                                <Settings className="h-3 w-3" />
                                            </button>
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

            {/* Map Action Sheet */}
            {selectedPlace && (
                <MapActionSheet
                    isOpen={mapActionSheetOpen}
                    onClose={() => {
                        setMapActionSheetOpen(false);
                        setSelectedPlace(null);
                    }}
                    placeText={selectedPlace.placeText}
                    placeHint={selectedPlace.placeHint}
                />
            )}

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    isOpen={!!selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}
        </div>
    );
}
