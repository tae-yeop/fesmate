"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    Activity,
    PenSquare,
    Users,
    ThumbsUp,
    BarChart3,
    LogIn,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/lib/user-profile-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useHelpful } from "@/lib/helpful-context";
import { useComment } from "@/lib/comment-context";
import { useParticipation } from "@/lib/participation-context";
import { useBadge } from "@/lib/badge-context";
import { useLeaderboard } from "@/lib/leaderboard-context";
import { MOCK_POSTS } from "@/lib/mock-data";
import { POST_TYPE_LABELS } from "@/types/post";
import { BADGE_DEFINITIONS } from "@/types/badge";
import {
    ActivityTimeline,
    ActivityStats,
    ActivityItem,
    createWishlistActivity,
    createAttendedActivity,
    createPostActivity,
    createCommentActivity,
    createHelpfulActivity,
    createParticipationActivity,
    createBadgeActivity,
} from "@/components/activity";

type ActivityTab = "all" | "posts" | "participation" | "helpful" | "stats";

const TABS: { id: ActivityTab; label: string; icon: typeof Activity }[] = [
    { id: "all", label: "전체", icon: Activity },
    { id: "posts", label: "글/댓글", icon: PenSquare },
    { id: "participation", label: "참여", icon: Users },
    { id: "helpful", label: "도움됨", icon: ThumbsUp },
    { id: "stats", label: "통계", icon: BarChart3 },
];

export default function ActivityPage() {
    const router = useRouter();
    const { isLoggedIn, isInitialized, currentUserId } = useUserProfile();
    const { wishlist, attended } = useWishlist();
    const { helpfulPosts } = useHelpful();
    const { getCommentsByUserId } = useComment();
    const { getSentRequests, getReceivedRequests } = useParticipation();
    const { earnedBadges } = useBadge();
    const { getUserRanking } = useLeaderboard();

    const [activeTab, setActiveTab] = useState<ActivityTab>("all");

    // 내 댓글
    const myComments = useMemo(() => {
        if (!currentUserId) return [];
        return getCommentsByUserId(currentUserId);
    }, [currentUserId, getCommentsByUserId]);

    // 내 글 (Mock 데이터에서 필터링)
    const myPosts = useMemo(() => {
        if (!currentUserId) return [];
        return MOCK_POSTS.filter((p) => p.userId === currentUserId).sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [currentUserId]);

    // 참여 신청
    const sentRequests = useMemo(() => getSentRequests(), [getSentRequests]);
    const receivedRequests = useMemo(
        () => getReceivedRequests(),
        [getReceivedRequests]
    );

    // 통계 데이터
    const stats = useMemo(() => {
        const userId = currentUserId || "";
        const ranking = getUserRanking(userId, "all_time");
        return {
            wishlistCount: wishlist.size,
            attendedCount: attended.size,
            postCount: myPosts.length,
            commentCount: myComments.length,
            helpfulCount: helpfulPosts.size,
            participationCount: sentRequests.length,
            badgeCount: earnedBadges.length,
            totalBadges: BADGE_DEFINITIONS.length,
            leaderboardRank: ranking?.rank ?? 0,
            leaderboardScore: ranking?.totalScore ?? 0,
        };
    }, [
        currentUserId,
        wishlist.size,
        attended.size,
        myPosts.length,
        myComments.length,
        helpfulPosts.size,
        sentRequests.length,
        earnedBadges.length,
        getUserRanking,
    ]);

    // 전체 활동 타임라인 생성
    const allActivities = useMemo((): ActivityItem[] => {
        const activities: ActivityItem[] = [];

        // 찜한 행사 (시간 정보가 없으므로 현재 시간 사용)
        wishlist.forEach((eventId) => {
            const activity = createWishlistActivity(eventId, new Date());
            if (activity) activities.push(activity);
        });

        // 다녀온 행사
        attended.forEach((eventId) => {
            const activity = createAttendedActivity(eventId, new Date());
            if (activity) activities.push(activity);
        });

        // 내 글
        myPosts.forEach((post) => {
            activities.push(
                createPostActivity(
                    post.id,
                    post.content.slice(0, 30) + "...",
                    post.eventId,
                    new Date(post.createdAt)
                )
            );
        });

        // 내 댓글
        myComments.forEach((comment) => {
            activities.push(
                createCommentActivity(
                    comment.id,
                    comment.postId,
                    comment.content,
                    new Date(comment.createdAt)
                )
            );
        });

        // 도움됨 표시 (시간 정보가 없으므로 현재 시간 사용)
        helpfulPosts.forEach((postId) => {
            activities.push(createHelpfulActivity(postId, new Date()));
        });

        // 참여 신청 (보낸 것)
        sentRequests.forEach((request) => {
            activities.push(
                createParticipationActivity(
                    request.id,
                    request.status === "accepted" ? "accepted" : "sent",
                    request.postType,
                    new Date(request.createdAt)
                )
            );
        });

        // 배지 획득 (시간 정보가 없으므로 현재 시간 사용)
        earnedBadges.forEach((badge) => {
            const badgeDef = BADGE_DEFINITIONS.find((b) => b.id === badge.badgeId);
            if (badgeDef) {
                activities.push(
                    createBadgeActivity(
                        badge.badgeId,
                        badgeDef.name,
                        badge.earnedAt ? new Date(badge.earnedAt) : new Date()
                    )
                );
            }
        });

        // 시간순 정렬 (최신순)
        return activities.sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
    }, [
        wishlist,
        attended,
        myPosts,
        myComments,
        helpfulPosts,
        sentRequests,
        earnedBadges,
    ]);

    // 탭별 필터링된 활동
    const filteredActivities = useMemo(() => {
        switch (activeTab) {
            case "posts":
                return allActivities.filter(
                    (a) => a.type === "post" || a.type === "comment"
                );
            case "participation":
                return allActivities.filter(
                    (a) =>
                        a.type === "participation_sent" ||
                        a.type === "participation_received" ||
                        a.type === "participation_accepted"
                );
            case "helpful":
                return allActivities.filter((a) => a.type === "helpful");
            default:
                return allActivities;
        }
    }, [activeTab, allActivities]);

    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    // 로그인하지 않은 경우
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-background pb-20 md:pb-6">
                {/* 헤더 */}
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
                    <div className="container flex items-center gap-3 h-14 px-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                            aria-label="뒤로가기"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-lg font-semibold">내 활동</h1>
                    </div>
                </div>

                {/* 로그인 안내 */}
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Activity className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">로그인이 필요해요</h2>
                    <p className="text-muted-foreground mb-6 max-w-xs">
                        내 활동을 확인하려면 먼저 로그인해주세요.
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                        Dev 메뉴에서 사용자를 선택하면 테스트할 수 있어요.
                    </p>
                    <Link
                        href="/login"
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        <LogIn className="h-5 w-5" />
                        로그인하기
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-6">
            {/* 헤더 */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
                <div className="container flex items-center gap-3 h-14 px-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                        aria-label="뒤로가기"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-lg font-semibold">내 활동</h1>
                </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="sticky top-14 z-30 bg-background border-b">
                <div className="container max-w-2xl mx-auto px-4">
                    <div className="flex gap-1 py-2">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
                                        activeTab === tab.id
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="container max-w-2xl mx-auto">
                {activeTab === "stats" ? (
                    <div className="p-4">
                        <ActivityStats {...stats} />
                    </div>
                ) : (
                    <ActivityTimeline
                        activities={filteredActivities}
                        emptyMessage={
                            activeTab === "all"
                                ? "아직 활동이 없어요. 행사를 찜하고 글을 작성해보세요!"
                                : activeTab === "posts"
                                  ? "작성한 글이나 댓글이 없어요"
                                  : activeTab === "participation"
                                    ? "참여 신청 내역이 없어요"
                                    : "도움됨 표시한 글이 없어요"
                        }
                    />
                )}
            </div>
        </div>
    );
}
