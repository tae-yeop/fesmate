"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, UserPlus, UserMinus, Users, UserCheck, LogIn, Search, Send, Inbox, Check, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/lib/user-profile-context";
import { useFollow, MOCK_USER_PROFILES } from "@/lib/follow-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useCompanion } from "@/lib/companion-context";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { FollowStatus, UserProfile } from "@/types/follow";
import { MOCK_EVENTS } from "@/lib/mock-data";
import Link from "next/link";

type ProfileTab = "friends" | "followers" | "following" | "find" | "companion";

const TABS: { id: ProfileTab; label: string; icon?: typeof Users }[] = [
    { id: "friends", label: "친구" },
    { id: "followers", label: "팔로워" },
    { id: "following", label: "팔로잉" },
    { id: "find", label: "친구 찾기" },
    { id: "companion", label: "동행", icon: Users },
];

export default function ProfilePage() {
    const router = useRouter();
    const { myProfile, isLoggedIn, isInitialized, currentUserId } = useUserProfile();
    const {
        getFollowers,
        getFollowing,
        getFriends,
        getSuggestedUsers,
        getFollowStatus,
        follow,
        unfollow,
        getFollowerCount,
        getFollowingCount,
    } = useFollow();
    const { attended } = useWishlist();
    const {
        getReceivedRequests,
        getSentRequests,
        acceptRequest,
        declineRequest,
        cancelRequest,
        getPendingCount,
    } = useCompanion();

    const [activeTab, setActiveTab] = useState<ProfileTab>("friends");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // 팔로우 확인 모달 상태
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        user: UserProfile | null;
        action: "follow" | "unfollow";
    }>({ isOpen: false, user: null, action: "follow" });

    // 내 팔로워/팔로잉/친구 목록
    const followers = useMemo(() => currentUserId ? getFollowers(currentUserId) : [], [getFollowers, currentUserId]);
    const following = useMemo(() => currentUserId ? getFollowing(currentUserId) : [], [getFollowing, currentUserId]);
    const friends = useMemo(() => getFriends(), [getFriends]);
    const suggested = useMemo(() => getSuggestedUsers(), [getSuggestedUsers]);

    // 동행 제안
    const receivedRequests = useMemo(() => getReceivedRequests(), [getReceivedRequests]);
    const sentRequests = useMemo(() => getSentRequests(), [getSentRequests]);
    const pendingCount = getPendingCount();

    // 동행 탭 서브탭
    const [companionSubTab, setCompanionSubTab] = useState<"received" | "sent">("received");

    // 검색 결과
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return [];
        }
        const query = searchQuery.toLowerCase();
        return MOCK_USER_PROFILES.filter(
            (user) =>
                user.id !== currentUserId &&
                (user.nickname.toLowerCase().includes(query) ||
                    user.bio?.toLowerCase().includes(query))
        );
    }, [searchQuery, currentUserId]);

    // 통계
    const followerCount = currentUserId ? getFollowerCount(currentUserId) : 0;
    const followingCount = currentUserId ? getFollowingCount(currentUserId) : 0;
    const attendedCount = attended.size;

    // 탭별 사용자 목록
    const displayedUsers = useMemo(() => {
        switch (activeTab) {
            case "friends":
                return friends;
            case "followers":
                return followers;
            case "following":
                return following;
            case "find":
                // 검색어가 있으면 검색 결과, 없으면 추천 목록
                return searchQuery.trim() ? searchResults : suggested;
            default:
                return [];
        }
    }, [activeTab, friends, followers, following, suggested, searchQuery, searchResults]);

    // 팔로우 버튼 클릭 - 확인 모달 열기
    const handleFollowClick = (user: UserProfile, status: FollowStatus) => {
        if (status === "following" || status === "mutual") {
            setConfirmModal({ isOpen: true, user, action: "unfollow" });
        } else {
            setConfirmModal({ isOpen: true, user, action: "follow" });
        }
    };

    // 확인 후 실행
    const handleConfirmAction = () => {
        if (!confirmModal.user) return;

        if (confirmModal.action === "follow") {
            follow(confirmModal.user.id);
        } else {
            unfollow(confirmModal.user.id);
        }
        setConfirmModal({ isOpen: false, user: null, action: "follow" });
    };

    // 팔로우 상태에 따른 버튼 스타일
    const getFollowButtonStyle = (status: FollowStatus) => {
        switch (status) {
            case "mutual":
                return {
                    className: "bg-green-100 text-green-700 border-green-200",
                    icon: UserCheck,
                    text: "친구",
                };
            case "following":
                return {
                    className: "bg-muted text-muted-foreground border-muted",
                    icon: UserMinus,
                    text: "팔로잉",
                };
            case "follower":
                return {
                    className: "bg-primary text-primary-foreground border-primary",
                    icon: UserPlus,
                    text: "맞팔로우",
                };
            default:
                return {
                    className: "bg-primary text-primary-foreground border-primary",
                    icon: UserPlus,
                    text: "팔로우",
                };
        }
    };

    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    // 로그인하지 않은 경우
    if (!isLoggedIn || !myProfile) {
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
                        <h1 className="text-lg font-semibold">프로필</h1>
                    </div>
                </div>

                {/* 로그인 안내 */}
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Users className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">로그인이 필요해요</h2>
                    <p className="text-muted-foreground mb-6 max-w-xs">
                        프로필을 확인하고 친구를 팔로우하려면 먼저 로그인해주세요.
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
                    <h1 className="text-lg font-semibold">내 프로필</h1>
                </div>
            </div>

            {/* 프로필 헤더 */}
            <div className="bg-gradient-to-b from-primary/5 to-transparent pt-6 pb-4 px-4">
                <div className="container max-w-2xl mx-auto">
                    <div className="flex items-start gap-4">
                        {/* 아바타 */}
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center text-4xl border-2 border-primary/30 shadow-lg">
                            {myProfile.avatar}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold truncate">
                                    {myProfile.nickname}
                                </h2>
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                                    aria-label="프로필 편집"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {myProfile.bio || "한줄소개를 작성해보세요"}
                            </p>

                            {/* 통계 */}
                            <div className="flex items-center gap-4 mt-3 text-sm">
                                <button
                                    onClick={() => setActiveTab("followers")}
                                    className="hover:text-primary transition-colors"
                                >
                                    <span className="font-semibold">{followerCount}</span>
                                    <span className="text-muted-foreground ml-1">팔로워</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab("following")}
                                    className="hover:text-primary transition-colors"
                                >
                                    <span className="font-semibold">{followingCount}</span>
                                    <span className="text-muted-foreground ml-1">팔로잉</span>
                                </button>
                                <div>
                                    <span className="font-semibold">{attendedCount}</span>
                                    <span className="text-muted-foreground ml-1">공연</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="sticky top-14 z-30 bg-background border-b">
                <div className="container max-w-2xl mx-auto">
                    <div className="flex">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    if (tab.id !== "find") {
                                        setSearchQuery("");
                                    }
                                }}
                                className={cn(
                                    "flex-1 py-3 text-sm font-medium transition-colors relative",
                                    activeTab === tab.id
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                {tab.id === "friends" && friends.length > 0 && (
                                    <span className="ml-1 text-xs">({friends.length})</span>
                                )}
                                {tab.id === "companion" && pendingCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                        {pendingCount}
                                    </span>
                                )}
                                {activeTab === tab.id && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 사용자 목록 */}
            <div className="container max-w-2xl mx-auto p-4">
                {/* 동행 탭일 때 */}
                {activeTab === "companion" && (
                    <div className="space-y-4">
                        {/* 서브탭 */}
                        <div className="flex gap-2 p-1 bg-muted rounded-lg">
                            <button
                                onClick={() => setCompanionSubTab("received")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                                    companionSubTab === "received"
                                        ? "bg-background shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Inbox className="h-4 w-4" />
                                받은 제안
                                {receivedRequests.filter(r => r.status === "pending").length > 0 && (
                                    <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                        {receivedRequests.filter(r => r.status === "pending").length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setCompanionSubTab("sent")}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                                    companionSubTab === "sent"
                                        ? "bg-background shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Send className="h-4 w-4" />
                                보낸 제안
                            </button>
                        </div>

                        {/* 받은 제안 */}
                        {companionSubTab === "received" && (
                            <div className="space-y-3">
                                {receivedRequests.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">받은 동행 제안이 없어요</p>
                                    </div>
                                ) : (
                                    receivedRequests.map((request) => {
                                        const fromUser = MOCK_USER_PROFILES.find(u => u.id === request.fromUserId);
                                        const event = MOCK_EVENTS.find(e => e.id === request.eventId);
                                        if (!fromUser || !event) return null;

                                        return (
                                            <div
                                                key={request.id}
                                                className={cn(
                                                    "p-4 rounded-xl border bg-card",
                                                    request.status === "pending" && "ring-2 ring-purple-200 dark:ring-purple-800"
                                                )}
                                            >
                                                {/* 사용자 정보 */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <Link
                                                        href={`/user/${fromUser.id}`}
                                                        className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center text-lg flex-shrink-0"
                                                    >
                                                        {fromUser.avatar || "👤"}
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <Link href={`/user/${fromUser.id}`} className="font-medium hover:underline">
                                                            {fromUser.nickname}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(request.createdAt).toLocaleDateString("ko-KR", {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>
                                                    </div>
                                                    {/* 상태 배지 */}
                                                    <span className={cn(
                                                        "px-2 py-1 text-xs font-medium rounded-full",
                                                        request.status === "pending" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                                        request.status === "accepted" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                        request.status === "declined" && "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                                    )}>
                                                        {request.status === "pending" && "대기중"}
                                                        {request.status === "accepted" && "수락됨"}
                                                        {request.status === "declined" && "거절됨"}
                                                    </span>
                                                </div>

                                                {/* 행사 정보 */}
                                                <Link
                                                    href={`/event/${event.id}`}
                                                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mb-3 hover:bg-muted transition-colors"
                                                >
                                                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{event.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(event.startAt).toLocaleDateString("ko-KR", {
                                                                month: "long",
                                                                day: "numeric",
                                                            })}
                                                        </p>
                                                    </div>
                                                </Link>

                                                {/* 메시지 */}
                                                {request.message && (
                                                    <p className="text-sm text-muted-foreground mb-3 p-2 bg-muted/30 rounded-lg italic">
                                                        &ldquo;{request.message}&rdquo;
                                                    </p>
                                                )}

                                                {/* 버튼 - pending일 때만 */}
                                                {request.status === "pending" && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => declineRequest(request.id)}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                                                        >
                                                            <X className="h-4 w-4" />
                                                            거절
                                                        </button>
                                                        <button
                                                            onClick={() => acceptRequest(request.id)}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            수락
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* 보낸 제안 */}
                        {companionSubTab === "sent" && (
                            <div className="space-y-3">
                                {sentRequests.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Send className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">보낸 동행 제안이 없어요</p>
                                        <p className="text-xs mt-1">친구 활동에서 &ldquo;같이 갈래요?&rdquo; 버튼을 눌러보세요</p>
                                    </div>
                                ) : (
                                    sentRequests.map((request) => {
                                        const toUser = MOCK_USER_PROFILES.find(u => u.id === request.toUserId);
                                        const event = MOCK_EVENTS.find(e => e.id === request.eventId);
                                        if (!toUser || !event) return null;

                                        return (
                                            <div
                                                key={request.id}
                                                className="p-4 rounded-xl border bg-card"
                                            >
                                                {/* 사용자 정보 */}
                                                <div className="flex items-start gap-3 mb-3">
                                                    <Link
                                                        href={`/user/${toUser.id}`}
                                                        className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center text-lg flex-shrink-0"
                                                    >
                                                        {toUser.avatar || "👤"}
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <Link href={`/user/${toUser.id}`} className="font-medium hover:underline">
                                                            {toUser.nickname}
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(request.createdAt).toLocaleDateString("ko-KR", {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </p>
                                                    </div>
                                                    {/* 상태 배지 */}
                                                    <span className={cn(
                                                        "px-2 py-1 text-xs font-medium rounded-full",
                                                        request.status === "pending" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                                        request.status === "accepted" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                                        request.status === "declined" && "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                                    )}>
                                                        {request.status === "pending" && "응답 대기중"}
                                                        {request.status === "accepted" && "수락됨"}
                                                        {request.status === "declined" && "거절됨"}
                                                    </span>
                                                </div>

                                                {/* 행사 정보 */}
                                                <Link
                                                    href={`/event/${event.id}`}
                                                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mb-3 hover:bg-muted transition-colors"
                                                >
                                                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{event.title}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(event.startAt).toLocaleDateString("ko-KR", {
                                                                month: "long",
                                                                day: "numeric",
                                                            })}
                                                        </p>
                                                    </div>
                                                </Link>

                                                {/* 메시지 */}
                                                {request.message && (
                                                    <p className="text-sm text-muted-foreground mb-3 p-2 bg-muted/30 rounded-lg italic">
                                                        &ldquo;{request.message}&rdquo;
                                                    </p>
                                                )}

                                                {/* 취소 버튼 - pending일 때만 */}
                                                {request.status === "pending" && (
                                                    <button
                                                        onClick={() => cancelRequest(request.id)}
                                                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-red-100 hover:text-red-600 transition-colors"
                                                    >
                                                        <X className="h-4 w-4" />
                                                        제안 취소
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 친구 찾기 탭일 때 검색창 표시 */}
                {activeTab === "find" && (
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="닉네임으로 검색"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        {!searchQuery.trim() && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                검색어를 입력하거나, 아래 추천 목록에서 친구를 찾아보세요
                            </p>
                        )}
                    </div>
                )}

                {activeTab !== "companion" && displayedUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">
                            {activeTab === "friends" && "아직 친구가 없어요. 관심있는 사람을 팔로우해보세요!"}
                            {activeTab === "followers" && "아직 팔로워가 없어요."}
                            {activeTab === "following" && "아직 팔로우하는 사람이 없어요."}
                            {activeTab === "find" && searchQuery.trim() && `"${searchQuery}" 검색 결과가 없어요`}
                            {activeTab === "find" && !searchQuery.trim() && "추천할 친구가 없어요."}
                        </p>
                    </div>
                ) : activeTab !== "companion" ? (
                    <div className="space-y-2">
                        {displayedUsers.map((user) => {
                            const status = getFollowStatus(user.id);
                            const buttonStyle = getFollowButtonStyle(status);
                            const Icon = buttonStyle.icon;

                            return (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:bg-muted/50 transition-colors"
                                >
                                    {/* 아바타 (클릭 시 프로필 이동) */}
                                    <Link
                                        href={`/user/${user.id}`}
                                        className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-pink-500/10 flex items-center justify-center text-2xl flex-shrink-0 hover:ring-2 hover:ring-primary/20 transition-all"
                                    >
                                        {user.avatar || "👤"}
                                    </Link>

                                    {/* 정보 (클릭 시 프로필 이동) */}
                                    <Link href={`/user/${user.id}`} className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">
                                                {user.nickname}
                                            </span>
                                            {status === "mutual" && (
                                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                    친구
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {user.bio || "소개가 없어요"}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span>팔로워 {user.followerCount}</span>
                                            <span>공연 {user.attendedCount}</span>
                                        </div>
                                    </Link>

                                    {/* 팔로우 버튼 */}
                                    <button
                                        onClick={() => handleFollowClick(user, status)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:opacity-80",
                                            buttonStyle.className
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {buttonStyle.text}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            {/* 프로필 편집 모달 */}
            <ProfileEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
            />

            {/* 팔로우/언팔로우 확인 모달 */}
            {confirmModal.isOpen && confirmModal.user && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background rounded-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                        {/* 사용자 정보 */}
                        <div className="flex flex-col items-center text-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center text-3xl mb-3">
                                {confirmModal.user.avatar || "👤"}
                            </div>
                            <h3 className="text-lg font-bold">{confirmModal.user.nickname}</h3>
                            {confirmModal.user.bio && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {confirmModal.user.bio}
                                </p>
                            )}
                        </div>

                        {/* 확인 메시지 */}
                        <p className="text-sm text-center mb-6">
                            {confirmModal.action === "follow" ? (
                                <>
                                    <span className="font-medium">{confirmModal.user.nickname}</span>
                                    님을 팔로우하시겠습니까?
                                </>
                            ) : (
                                <>
                                    <span className="font-medium">{confirmModal.user.nickname}</span>
                                    님을 언팔로우하시겠습니까?
                                </>
                            )}
                        </p>

                        {/* 버튼 */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmModal({ isOpen: false, user: null, action: "follow" })}
                                className="flex-1 py-2.5 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                className={cn(
                                    "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                                    confirmModal.action === "follow"
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "bg-muted text-foreground hover:bg-muted/80"
                                )}
                            >
                                {confirmModal.action === "follow" ? (
                                    <>
                                        <UserPlus className="h-4 w-4" />
                                        팔로우
                                    </>
                                ) : (
                                    <>
                                        <UserMinus className="h-4 w-4" />
                                        언팔로우
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
