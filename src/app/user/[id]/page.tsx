"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
    ArrowLeft,
    Users,
    UserPlus,
    UserMinus,
    Star,
    CheckCircle2,
    Settings,
    Trophy,
    TrendingUp,
    TrendingDown,
    Award,
    Lock,
    BarChart3,
} from "lucide-react";
import { useFollow } from "@/lib/follow-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useBadge } from "@/lib/badge-context";
import { useLeaderboard } from "@/lib/leaderboard-context";
import { useCrew } from "@/lib/crew-context";
import { PrivacySettings, PRIVACY_LEVEL_LABELS } from "@/lib/user-profile-context";
import { BADGE_DEFINITIONS } from "@/types/badge";
import { MOCK_EVENTS } from "@/lib/mock-data";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ProfileTab = "wishlist" | "attended" | "gonglog" | "badges" | "followers" | "following";

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
        isMutualFollow,
    } = useFollow();
    const { getUserWishlist, getUserAttended } = useWishlist();
    const { getUserRanking } = useLeaderboard();
    const { earnedBadges, getUserBadges } = useBadge();
    const { getCrewMembers, allCrews } = useCrew();

    const [activeTab, setActiveTab] = useState<ProfileTab>("attended");

    // 프로필 대상 사용자의 프라이버시 설정 (Mock - 실제로는 서버에서 가져와야 함)
    // 여기서는 기본값 사용
    const targetUserPrivacy: PrivacySettings = {
        wishlistVisibility: "friends",
        attendedVisibility: "public",
        gonglogVisibility: "public",
        badgeVisibility: "public",
        crewActivityVisibility: "crew",
        friendsListVisibility: "friends",
    };

    // 프라이버시 체크: 현재 사용자가 대상의 특정 정보를 볼 수 있는지
    const canView = useMemo(() => {
        const isOwn = userId === currentUserId;
        if (isOwn) {
            // 본인은 모든 것을 볼 수 있음
            return {
                wishlist: true,
                attended: true,
                gonglog: true,
                badges: true,
                friends: true,
            };
        }

        const isFriend = currentUserId ? isMutualFollow(userId) : false;

        // 같은 크루인지 확인 (모든 크루 순회하여 둘 다 멤버인 크루가 있는지 확인)
        const isCrewMate = allCrews.some(crew => {
            const members = getCrewMembers(crew.id);
            const currentUserIsMember = members.some(m => m.userId === currentUserId);
            const targetUserIsMember = members.some(m => m.userId === userId);
            return currentUserIsMember && targetUserIsMember;
        });

        const checkPrivacy = (level: string): boolean => {
            switch (level) {
                case "public":
                    return true;
                case "friends":
                    return isFriend;
                case "crew":
                    return isCrewMate || isFriend;
                case "private":
                    return false;
                default:
                    return false;
            }
        };

        return {
            wishlist: checkPrivacy(targetUserPrivacy.wishlistVisibility),
            attended: checkPrivacy(targetUserPrivacy.attendedVisibility),
            gonglog: checkPrivacy(targetUserPrivacy.gonglogVisibility),
            badges: checkPrivacy(targetUserPrivacy.badgeVisibility),
            friends: checkPrivacy(targetUserPrivacy.friendsListVisibility),
        };
    }, [userId, currentUserId, isMutualFollow, allCrews, getCrewMembers, targetUserPrivacy]);

    // 사용자 랭킹 정보
    const userRanking = getUserRanking(userId, "all_time");

    const profile = getUserProfile(userId);
    const isOwnProfile = userId === currentUserId;
    const followStatus = getFollowStatus(userId);

    // 사용자의 찜/다녀온 행사 목록
    const userEvents = useMemo(() => {
        const userWishlist = getUserWishlist(userId);
        const userAttended = getUserAttended(userId);

        return {
            wishlistEvents: Array.from(userWishlist)
                .map(id => MOCK_EVENTS.find(e => e.id === id))
                .filter(Boolean),
            attendedEvents: Array.from(userAttended)
                .map(id => MOCK_EVENTS.find(e => e.id === id))
                .filter(Boolean),
        };
    }, [userId, getUserWishlist, getUserAttended]);

    // 공연로그 통계 (Mock)
    const gonglogStats = useMemo(() => {
        const events = userEvents.attendedEvents;
        const genreCount: Record<string, number> = {};
        const regionCount: Record<string, number> = {};

        events.forEach(event => {
            if (event) {
                // 장르 카운트
                const genre = event.type || "기타";
                genreCount[genre] = (genreCount[genre] || 0) + 1;

                // 지역 카운트 (venue.address에서 추출)
                const address = event.venue?.address || "";
                const region = address.includes("서울") ? "서울" :
                    address.includes("부산") ? "부산" :
                    address.includes("인천") ? "인천" :
                    address.includes("대전") ? "대전" :
                    address.includes("광주") ? "광주" : "기타";
                regionCount[region] = (regionCount[region] || 0) + 1;
            }
        });

        return {
            totalCount: events.length,
            genreCount,
            regionCount,
            thisYear: events.filter(e => e && new Date(e.startAt).getFullYear() === new Date().getFullYear()).length,
        };
    }, [userEvents.attendedEvents]);

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
                        <Link href="/profile/edit" className="ml-auto p-2 hover:bg-muted rounded-lg">
                            <Settings className="h-5 w-5" />
                        </Link>
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
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {[
                            { key: "attended", label: "다녀온 행사", icon: CheckCircle2, count: userEvents.attendedEvents.length, privacyKey: "attended" as const },
                            { key: "wishlist", label: "찜", icon: Star, count: userEvents.wishlistEvents.length, privacyKey: "wishlist" as const },
                            { key: "gonglog", label: "공연로그", icon: BarChart3, privacyKey: "gonglog" as const },
                            { key: "badges", label: "배지", icon: Award, count: isOwnProfile ? earnedBadges.length : (profile.featuredBadges?.length || 0), privacyKey: "badges" as const },
                            { key: "followers", label: "팔로워", count: getFollowerCount(userId), privacyKey: "friends" as const },
                            { key: "following", label: "팔로잉", count: getFollowingCount(userId), privacyKey: "friends" as const },
                        ].map(tab => {
                            const isLocked = !canView[tab.privacyKey];
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as ProfileTab)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                        activeTab === tab.key
                                            ? "border-primary text-primary"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {isLocked && <Lock className="h-3 w-3" />}
                                    {tab.label}
                                    {tab.count !== undefined && !isLocked && (
                                        <span className="text-xs opacity-60">{tab.count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 탭 컨텐츠 */}
            <div className="container mx-auto px-4 py-4">
                {/* 다녀온 행사 탭 */}
                {activeTab === "attended" && (
                    canView.attended ? (
                        <div className="space-y-4">
                            <h3 className="font-medium text-sm text-muted-foreground">
                                다녀온 공연 ({userEvents.attendedEvents.length}개)
                            </h3>
                            {userEvents.attendedEvents.length > 0 ? (
                                <div className="space-y-3">
                                    {userEvents.attendedEvents.map(event => event && (
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
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>아직 다녀온 공연이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <PrivacyLockedContent
                            icon={CheckCircle2}
                            title="다녀온 행사"
                            level={targetUserPrivacy.attendedVisibility}
                        />
                    )
                )}

                {/* 찜 목록 탭 */}
                {activeTab === "wishlist" && (
                    canView.wishlist ? (
                        <div className="space-y-4">
                            <h3 className="font-medium text-sm text-muted-foreground">
                                찜한 공연 ({userEvents.wishlistEvents.length}개)
                            </h3>
                            {userEvents.wishlistEvents.length > 0 ? (
                                <div className="space-y-3">
                                    {userEvents.wishlistEvents.map(event => event && (
                                        <Link
                                            key={event.id}
                                            href={`/event/${event.id}`}
                                            className="flex items-center gap-3 p-3 bg-card rounded-lg border hover:border-primary/50 transition-colors"
                                        >
                                            <Star className="h-5 w-5 text-yellow-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm line-clamp-1">{event.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(event.startAt).toLocaleDateString("ko-KR")}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>아직 찜한 공연이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <PrivacyLockedContent
                            icon={Star}
                            title="찜 목록"
                            level={targetUserPrivacy.wishlistVisibility}
                        />
                    )
                )}

                {/* 공연로그 탭 */}
                {activeTab === "gonglog" && (
                    canView.gonglog ? (
                        <div className="space-y-6">
                            {/* 통계 요약 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-card rounded-xl border text-center">
                                    <div className="text-3xl font-bold text-primary">{gonglogStats.totalCount}</div>
                                    <div className="text-sm text-muted-foreground">총 관람</div>
                                </div>
                                <div className="p-4 bg-card rounded-xl border text-center">
                                    <div className="text-3xl font-bold text-primary">{gonglogStats.thisYear}</div>
                                    <div className="text-sm text-muted-foreground">{new Date().getFullYear()}년</div>
                                </div>
                            </div>

                            {/* 장르별 분포 */}
                            {Object.keys(gonglogStats.genreCount).length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm text-muted-foreground">장르별 분포</h4>
                                    <div className="space-y-2">
                                        {Object.entries(gonglogStats.genreCount)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([genre, count]) => (
                                                <div key={genre} className="flex items-center gap-3">
                                                    <span className="text-sm w-20 shrink-0">{genre}</span>
                                                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all"
                                                            style={{ width: `${(count / gonglogStats.totalCount) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* 지역별 분포 */}
                            {Object.keys(gonglogStats.regionCount).length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm text-muted-foreground">지역별 분포</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(gonglogStats.regionCount)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([region, count]) => (
                                                <span
                                                    key={region}
                                                    className="px-3 py-1.5 bg-muted rounded-full text-sm"
                                                >
                                                    {region} <span className="font-medium">{count}</span>
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {gonglogStats.totalCount === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>아직 공연 기록이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <PrivacyLockedContent
                            icon={BarChart3}
                            title="공연로그"
                            level={targetUserPrivacy.gonglogVisibility}
                        />
                    )
                )}

                {/* 배지 탭 */}
                {activeTab === "badges" && (
                    canView.badges ? (
                        (() => {
                            const userBadges = getUserBadges(userId);
                            return (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-sm text-muted-foreground">
                                        획득한 배지 ({userBadges.length}개)
                                    </h3>
                                    {userBadges.length > 0 ? (
                                        <div className="grid grid-cols-4 gap-3">
                                            {userBadges.map(earned => {
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
                                            {isOwnProfile && (
                                                <p className="text-sm mt-2">공연을 다녀오고 활동하면 배지를 획득할 수 있어요!</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <PrivacyLockedContent
                            icon={Award}
                            title="배지"
                            level={targetUserPrivacy.badgeVisibility}
                        />
                    )
                )}

                {/* 팔로워 탭 */}
                {activeTab === "followers" && (
                    canView.friends ? (
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
                    ) : (
                        <PrivacyLockedContent
                            icon={Users}
                            title="팔로워 목록"
                            level={targetUserPrivacy.friendsListVisibility}
                        />
                    )
                )}

                {/* 팔로잉 탭 */}
                {activeTab === "following" && (
                    canView.friends ? (
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
                    ) : (
                        <PrivacyLockedContent
                            icon={Users}
                            title="팔로잉 목록"
                            level={targetUserPrivacy.friendsListVisibility}
                        />
                    )
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
    currentUserId: string | null;
    getFollowStatus: (userId: string) => "none" | "following" | "follower" | "mutual";
    follow: (userId: string) => void;
    unfollow: (userId: string) => void;
}) {
    const isMe = currentUserId ? user.id === currentUserId : false;
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

// 프라이버시 잠금 컨텐츠 컴포넌트
function PrivacyLockedContent({
    icon: Icon,
    title,
    level,
}: {
    icon: React.ElementType;
    title: string;
    level: string;
}) {
    const levelLabel = PRIVACY_LEVEL_LABELS[level as keyof typeof PRIVACY_LEVEL_LABELS];

    return (
        <div className="text-center py-16 text-muted-foreground">
            <div className="relative inline-block">
                <Icon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <Lock className="h-6 w-6 absolute bottom-3 right-0 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">{title} 비공개</p>
            <p className="text-sm mt-2">
                이 정보는 <span className="font-medium">{levelLabel?.label || level}</span>에게만 공개됩니다.
            </p>
            {level === "friends" && (
                <p className="text-xs mt-3 text-muted-foreground">
                    맞팔로우하면 볼 수 있어요
                </p>
            )}
            {level === "crew" && (
                <p className="text-xs mt-3 text-muted-foreground">
                    같은 크루에 가입하면 볼 수 있어요
                </p>
            )}
        </div>
    );
}
