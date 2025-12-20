"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
    ArrowLeft,
    Users,
    UserPlus,
    UserMinus,
    Calendar,
    Star,
    CheckCircle2,
    MessageSquare,
    Settings,
    Trophy,
    TrendingUp,
    TrendingDown,
    Award,
} from "lucide-react";
import { useFollow } from "@/lib/follow-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useBadge } from "@/lib/badge-context";
import { useLeaderboard } from "@/lib/leaderboard-context";
import { ACTIVITY_TYPE_CONFIG } from "@/types/follow";
import { BADGE_DEFINITIONS } from "@/types/badge";
import { getRankTier, RANK_TIERS } from "@/types/leaderboard";
import { MOCK_EVENTS } from "@/lib/mock-data";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const {
        currentUserId,
        getUserProfile,
        getFollowers,
        getFollowing,
        getFollowStatus,
        follow,
        unfollow,
        getFollowerCount,
        getFollowingCount,
    } = useFollow();
    const { attended } = useWishlist();
    const { getUserRanking } = useLeaderboard();
    const { earnedBadges } = useBadge();

    const [activeTab, setActiveTab] = useState<"activity" | "badges" | "followers" | "following">("activity");

    // 사용자 랭킹 정보
    const userRanking = getUserRanking(userId, "all_time");

    const profile = getUserProfile(userId);
    const isOwnProfile = userId === currentUserId;
    const followStatus = getFollowStatus(userId);

    if (!profile) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <p className="text-muted-foreground">사용자를 찾을 수 없습니다.</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 text-primary hover:underline"
                    >
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const followers = getFollowers(userId);
    const following = getFollowing(userId);

    // 다녀온 행사 목록 (본인인 경우만)
    const attendedEvents = isOwnProfile
        ? Array.from(attended).map(id => MOCK_EVENTS.find(e => e.id === id)).filter(Boolean)
        : [];

    const handleFollowToggle = () => {
        if (followStatus === "following" || followStatus === "mutual") {
            unfollow(userId);
        } else {
            follow(userId);
        }
    };

    const getFollowButtonText = () => {
        switch (followStatus) {
            case "mutual":
                return "친구";
            case "following":
                return "팔로잉";
            case "follower":
                return "맞팔로우";
            default:
                return "팔로우";
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* 헤더 */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
                <div className="container mx-auto px-4 h-14 flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-muted rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-medium">{profile.nickname}</span>
                    {isOwnProfile && (
                        <button className="ml-auto p-2 hover:bg-muted rounded-lg">
                            <Settings className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 프로필 헤더 */}
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-start gap-4">
                    {/* 아바타 */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-4xl shrink-0">
                        {profile.avatar || "👤"}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">{profile.nickname}</h1>
                            {followStatus === "mutual" && (
                                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                    친구
                                </span>
                            )}
                        </div>
                        {profile.bio && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {profile.bio}
                            </p>
                        )}
                        {/* 대표 배지 */}
                        {profile.featuredBadges && profile.featuredBadges.length > 0 && (
                            <div className="flex gap-1 mt-2">
                                {profile.featuredBadges.map(badgeId => {
                                    const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
                                    if (!badge) return null;
                                    return (
                                        <span
                                            key={badgeId}
                                            className="text-lg"
                                            title={badge.name}
                                        >
                                            {badge.icon}
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        {/* 랭킹 표시 */}
                        {userRanking && (
                            <Link
                                href="/leaderboard"
                                className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-full border border-yellow-200 dark:border-yellow-800 hover:shadow-sm transition-shadow"
                            >
                                <Trophy className={cn(
                                    "h-4 w-4",
                                    userRanking.rank <= 3 ? "text-yellow-500" :
                                    userRanking.rank <= 10 ? "text-yellow-600" :
                                    "text-orange-500"
                                )} />
                                <span className="text-sm font-medium">
                                    #{userRanking.rank}위
                                </span>
                                {userRanking.rankChange !== undefined && userRanking.rankChange !== 0 && (
                                    <span className={cn(
                                        "flex items-center text-xs",
                                        userRanking.rankChange > 0 ? "text-green-600" : "text-red-500"
                                    )}>
                                        {userRanking.rankChange > 0 ? (
                                            <TrendingUp className="h-3 w-3" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3" />
                                        )}
                                    </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {userRanking.totalScore.toLocaleString()}점
                                </span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* 통계 */}
                <div className="grid grid-cols-4 gap-2 mt-6 p-4 bg-muted/50 rounded-xl">
                    <button
                        onClick={() => setActiveTab("followers")}
                        className="text-center hover:bg-muted rounded-lg py-2 transition-colors"
                    >
                        <div className="text-xl font-bold">{getFollowerCount(userId)}</div>
                        <div className="text-xs text-muted-foreground">팔로워</div>
                    </button>
                    <button
                        onClick={() => setActiveTab("following")}
                        className="text-center hover:bg-muted rounded-lg py-2 transition-colors"
                    >
                        <div className="text-xl font-bold">{getFollowingCount(userId)}</div>
                        <div className="text-xs text-muted-foreground">팔로잉</div>
                    </button>
                    <div className="text-center py-2">
                        <div className="text-xl font-bold">{profile.attendedCount}</div>
                        <div className="text-xs text-muted-foreground">공연</div>
                    </div>
                    <button
                        onClick={() => setActiveTab("badges")}
                        className="text-center hover:bg-muted rounded-lg py-2 transition-colors"
                    >
                        <div className="text-xl font-bold">{isOwnProfile ? earnedBadges.length : (profile.featuredBadges?.length || 0)}</div>
                        <div className="text-xs text-muted-foreground">배지</div>
                    </button>
                </div>

                {/* 팔로우 버튼 */}
                {!isOwnProfile && (
                    <div className="mt-4">
                        <button
                            onClick={handleFollowToggle}
                            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                followStatus === "following" || followStatus === "mutual"
                                    ? "bg-muted hover:bg-muted/80 text-foreground"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                        >
                            {followStatus === "following" || followStatus === "mutual" ? (
                                <>
                                    <UserMinus className="h-4 w-4" />
                                    {getFollowButtonText()}
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4" />
                                    {getFollowButtonText()}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* 탭 네비게이션 */}
            <div className="border-b sticky top-14 bg-background z-30">
                <div className="container mx-auto px-4">
                    <div className="flex gap-1 overflow-x-auto">
                        {[
                            { key: "activity", label: "활동" },
                            { key: "badges", label: "배지" },
                            { key: "followers", label: `팔로워 ${getFollowerCount(userId)}` },
                            { key: "following", label: `팔로잉 ${getFollowingCount(userId)}` },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="container mx-auto px-4 py-4">
                {/* 활동 탭 */}
                {activeTab === "activity" && (
                    <div className="space-y-4">
                        {isOwnProfile && attendedEvents.length > 0 ? (
                            <>
                                <h3 className="font-medium text-sm text-muted-foreground">다녀온 공연</h3>
                                <div className="space-y-3">
                                    {attendedEvents.slice(0, 5).map(event => event && (
                                        <Link
                                            key={event.id}
                                            href={`/event/${event.id}`}
                                            className="flex items-center gap-3 p-3 bg-card rounded-lg border hover:border-primary/50 transition-colors"
                                        >
                                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(event.startAt).toLocaleDateString("ko-KR")}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>아직 활동 내역이 없습니다.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 배지 탭 */}
                {activeTab === "badges" && (
                    <div className="space-y-4">
                        {isOwnProfile ? (
                            // 본인 프로필: 모든 배지 표시
                            <>
                                <h3 className="font-medium text-sm text-muted-foreground">
                                    획득한 배지 ({earnedBadges.length}개)
                                </h3>
                                {earnedBadges.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-3">
                                        {earnedBadges.map(earned => {
                                            const badge = BADGE_DEFINITIONS.find(b => b.id === earned.badgeId);
                                            if (!badge) return null;
                                            return (
                                                <div
                                                    key={earned.badgeId}
                                                    className="flex flex-col items-center gap-1 p-3 bg-card rounded-lg border"
                                                    title={`${badge.description}\n획득: ${new Date(earned.earnedAt).toLocaleDateString("ko-KR")}`}
                                                >
                                                    <span className="text-3xl">{badge.icon}</span>
                                                    <span className="text-xs font-medium text-center line-clamp-1">
                                                        {badge.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p>아직 획득한 배지가 없습니다.</p>
                                        <p className="text-sm mt-2">공연을 다녀오고 활동하면 배지를 획득할 수 있어요!</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            // 타인 프로필: 대표 배지만 표시
                            <>
                                <h3 className="font-medium text-sm text-muted-foreground">
                                    대표 배지
                                </h3>
                                {profile.featuredBadges && profile.featuredBadges.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-3">
                                        {profile.featuredBadges.map(badgeId => {
                                            const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
                                            if (!badge) return null;
                                            return (
                                                <div
                                                    key={badgeId}
                                                    className="flex flex-col items-center gap-1 p-3 bg-card rounded-lg border"
                                                >
                                                    <span className="text-3xl">{badge.icon}</span>
                                                    <span className="text-xs font-medium text-center line-clamp-1">
                                                        {badge.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p>표시된 배지가 없습니다.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* 팔로워 탭 */}
                {activeTab === "followers" && (
                    <div className="space-y-2">
                        {followers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>아직 팔로워가 없습니다.</p>
                            </div>
                        ) : (
                            followers.map(user => (
                                <UserListItem
                                    key={user.id}
                                    user={user}
                                    currentUserId={currentUserId}
                                    getFollowStatus={getFollowStatus}
                                    follow={follow}
                                    unfollow={unfollow}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* 팔로잉 탭 */}
                {activeTab === "following" && (
                    <div className="space-y-2">
                        {following.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>아직 팔로잉하는 사람이 없습니다.</p>
                            </div>
                        ) : (
                            following.map(user => (
                                <UserListItem
                                    key={user.id}
                                    user={user}
                                    currentUserId={currentUserId}
                                    getFollowStatus={getFollowStatus}
                                    follow={follow}
                                    unfollow={unfollow}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// 사용자 리스트 아이템 컴포넌트
function UserListItem({
    user,
    currentUserId,
    getFollowStatus,
    follow,
    unfollow,
}: {
    user: { id: string; nickname: string; avatar?: string; bio?: string };
    currentUserId: string;
    getFollowStatus: (userId: string) => "none" | "following" | "follower" | "mutual";
    follow: (userId: string) => void;
    unfollow: (userId: string) => void;
}) {
    const isMe = user.id === currentUserId;
    const status = getFollowStatus(user.id);

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (status === "following" || status === "mutual") {
            unfollow(user.id);
        } else {
            follow(user.id);
        }
    };

    return (
        <Link
            href={`/user/${user.id}`}
            className="flex items-center gap-3 p-3 bg-card rounded-lg border hover:border-primary/50 transition-colors"
        >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xl shrink-0">
                {user.avatar || "👤"}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{user.nickname}</span>
                    {status === "mutual" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            친구
                        </span>
                    )}
                </div>
                {user.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{user.bio}</p>
                )}
            </div>
            {!isMe && (
                <button
                    onClick={handleToggle}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        status === "following" || status === "mutual"
                            ? "bg-muted hover:bg-muted/80"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                >
                    {status === "mutual" ? "친구" : status === "following" ? "팔로잉" : status === "follower" ? "맞팔로우" : "팔로우"}
                </button>
            )}
        </Link>
    );
}
