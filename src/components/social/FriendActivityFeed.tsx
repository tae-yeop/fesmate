"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Star, CheckCircle2, MessageSquare, Users, UserPlus } from "lucide-react";
import { useFollow, MOCK_USER_PROFILES } from "@/lib/follow-context";
import { useCompanion } from "@/lib/companion-context";
import { ACTIVITY_TYPE_CONFIG, type FriendActivityType, UserProfile } from "@/types/follow";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { Event } from "@/types/event";
import CompanionRequestModal from "./CompanionRequestModal";

/** 활동 타입별 아이콘 */
const ACTIVITY_ICONS: Record<FriendActivityType, typeof Star> = {
    wishlist: Star,
    attended: CheckCircle2,
    review: MessageSquare,
    post: MessageSquare,
    joined_crew: Users,
};

/** 활동 타입별 색상 */
const ACTIVITY_COLORS: Record<FriendActivityType, string> = {
    wishlist: "text-yellow-500",
    attended: "text-green-500",
    review: "text-blue-500",
    post: "text-purple-500",
    joined_crew: "text-primary",
};

interface FriendActivityFeedProps {
    /** 최대 표시 개수 */
    limit?: number;
    /** 전체보기 링크 표시 여부 */
    showViewAll?: boolean;
}

export function FriendActivityFeed({ limit = 5, showViewAll = true }: FriendActivityFeedProps) {
    const { getFriendActivities, getSuggestedUsers, follow, getFollowStatus, currentUserId } = useFollow();
    const { getRequestStatus } = useCompanion();

    const activities = getFriendActivities().slice(0, limit);
    const suggestedUsers = getSuggestedUsers().slice(0, 3);

    // Hydration 에러 방지: 클라이언트에서만 시간 표시
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // 동행 제안 모달 상태
    const [companionModal, setCompanionModal] = useState<{
        isOpen: boolean;
        user: UserProfile | null;
        event: Event | null;
    }>({ isOpen: false, user: null, event: null });

    // "같이 갈래요?" 클릭 핸들러
    const handleCompanionClick = (userId: string, eventId: string) => {
        const user = MOCK_USER_PROFILES.find(u => u.id === userId);
        const event = MOCK_EVENTS.find(e => e.id === eventId);
        if (user && event) {
            setCompanionModal({ isOpen: true, user, event });
        }
    };

    // 친구가 없거나 활동이 없으면 추천 사용자 표시
    if (activities.length === 0) {
        return (
            <div className="space-y-4">
                <div className="text-center py-6">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground mb-1">
                        아직 팔로우한 친구가 없어요
                    </p>
                    <p className="text-xs text-muted-foreground">
                        친구를 팔로우하고 활동을 확인해보세요
                    </p>
                </div>

                {/* 추천 사용자 */}
                {suggestedUsers.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">추천 사용자</h4>
                        {suggestedUsers.map(user => {
                            const status = getFollowStatus(user.id);
                            return (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-3 bg-card rounded-lg border"
                                >
                                    <Link
                                        href={`/user/${user.id}`}
                                        className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg shrink-0"
                                    >
                                        {user.avatar || "👤"}
                                    </Link>
                                    <Link href={`/user/${user.id}`} className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{user.nickname}</p>
                                        {user.bio && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {user.bio}
                                            </p>
                                        )}
                                    </Link>
                                    <button
                                        onClick={() => follow(user.id)}
                                        disabled={status !== "none"}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                            status !== "none"
                                                ? "bg-muted text-muted-foreground"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                                        }`}
                                    >
                                        {status === "following" || status === "mutual" ? "팔로잉" : "팔로우"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // 상대 시간 표시
    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return "방금 전";
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return new Date(date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    };

    return (
        <div className="space-y-3">
            {activities.map(activity => {
                const Icon = ACTIVITY_ICONS[activity.type];
                const colorClass = ACTIVITY_COLORS[activity.type];
                const config = ACTIVITY_TYPE_CONFIG[activity.type];

                return (
                    <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 bg-card rounded-lg border"
                    >
                        {/* 사용자 아바타 */}
                        <Link
                            href={`/user/${activity.userId}`}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-lg shrink-0"
                        >
                            {activity.userAvatar || "👤"}
                        </Link>

                        {/* 활동 내용 */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                    href={`/user/${activity.userId}`}
                                    className="font-medium text-sm hover:underline"
                                >
                                    {activity.userNickname}
                                </Link>
                                <span className="text-sm text-muted-foreground">
                                    {config.emoji} {config.label}
                                </span>
                            </div>

                            {/* 관련 행사/크루 */}
                            {activity.eventId && activity.eventTitle && (
                                <div className="mt-1 flex items-center gap-2">
                                    <Link
                                        href={`/event/${activity.eventId}`}
                                        className="text-sm text-primary hover:underline line-clamp-1 flex-1"
                                    >
                                        {activity.eventTitle}
                                    </Link>
                                    {/* 같이 갈래요? CTA - wishlist 활동에만 표시 */}
                                    {activity.type === "wishlist" && activity.eventId && activity.userId !== currentUserId && (() => {
                                        const eventId = activity.eventId;
                                        const requestStatus = getRequestStatus(activity.userId, eventId);
                                        return (
                                            <button
                                                onClick={() => handleCompanionClick(activity.userId, eventId)}
                                                className={`px-2 py-1 text-xs font-medium rounded-lg flex items-center gap-1 shrink-0 transition-colors ${
                                                    requestStatus === "accepted"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : requestStatus === "pending"
                                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                        : requestStatus === "declined"
                                                        ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                                        : "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
                                                }`}
                                            >
                                                <Users className="w-3 h-3" />
                                                {requestStatus === "accepted" && "동행 확정"}
                                                {requestStatus === "pending" && "응답 대기중"}
                                                {requestStatus === "declined" && "거절됨"}
                                                {!requestStatus && "같이 갈래요?"}
                                            </button>
                                        );
                                    })()}
                                </div>
                            )}
                            {activity.crewId && activity.crewName && (
                                <Link
                                    href={`/crew/${activity.crewId}`}
                                    className="block mt-1 text-sm text-primary hover:underline"
                                >
                                    {activity.crewName}
                                </Link>
                            )}

                            {/* 후기 미리보기 */}
                            {activity.content && (
                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                    &ldquo;{activity.content}&rdquo;
                                </p>
                            )}

                            {/* 시간 - 클라이언트에서만 렌더링하여 hydration 에러 방지 */}
                            <p className="mt-1 text-xs text-muted-foreground">
                                {isClient ? getRelativeTime(activity.createdAt) : ""}
                            </p>
                        </div>

                        {/* 액션 아이콘 */}
                        <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                    </div>
                );
            })}

            {/* 전체보기 링크 */}
            {showViewAll && activities.length > 0 && (
                <Link
                    href="/explore" // TODO: 친구 활동 전체 페이지
                    className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary py-2"
                >
                    더 많은 활동 보기
                    <ChevronRight className="h-4 w-4" />
                </Link>
            )}

            {/* 동행 제안 모달 */}
            {companionModal.user && companionModal.event && (
                <CompanionRequestModal
                    isOpen={companionModal.isOpen}
                    onClose={() => setCompanionModal({ isOpen: false, user: null, event: null })}
                    targetUser={companionModal.user}
                    event={companionModal.event}
                />
            )}
        </div>
    );
}
