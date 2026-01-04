"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Star, Check, ExternalLink, User } from "lucide-react";
import { useFollow } from "@/lib/follow-context";
import { useWishlist } from "@/lib/wishlist-context";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils/date-format";
import Link from "next/link";

interface FriendEventHighlight {
    id: string;
    eventId: string;
    eventTitle: string;
    eventPosterUrl?: string;
    eventDate: Date;
    userId: string;
    userNickname: string;
    userAvatar: string;
    type: "attended" | "review";
    content?: string;
    createdAt: Date;
}

interface FriendsHighlightCarouselProps {
    /** 현재 사용자 ID */
    currentUserId?: string;
    /** 표시할 최대 항목 수 */
    maxItems?: number;
    className?: string;
}

/**
 * FOMO 루프 - 친구가 다녀온 행사 하이라이트 캐러셀
 *
 * "친구들이 다녀온 행사를 놓치셨나요?" 섹션
 * - 친구(팔로잉)가 다녀왔거나 리뷰를 남긴 행사 표시
 * - 스와이프 가능한 캐러셀 형태
 * - 찜하기/상세보기 CTA
 */
export function FriendsHighlightCarousel({
    currentUserId,
    maxItems = 10,
    className,
}: FriendsHighlightCarouselProps) {
    const { getFollowing, getFriendActivities } = useFollow();
    const { isWishlist, isAttended, toggleWishlist, toggleAttended } = useWishlist();

    // 친구 활동 조회
    const friendActivities = getFriendActivities();
    const [currentIndex, setCurrentIndex] = useState(0);

    // 팔로잉 목록
    const following = useMemo(() => {
        if (!currentUserId) return [];
        return getFollowing(currentUserId);
    }, [currentUserId, getFollowing]);

    // 팔로잉 중인 사람들의 "다녀옴" 또는 "리뷰" 활동만 필터링
    const highlights = useMemo<FriendEventHighlight[]>(() => {
        const followingIds = new Set(following.map((f) => f.id));

        // 친구 활동에서 attended/review만 필터 (eventId가 있는 것만)
        const relevantActivities = friendActivities
            .filter((a) => followingIds.has(a.userId))
            .filter((a) => (a.type === "attended" || a.type === "review") && a.eventId && a.eventTitle)
            .slice(0, maxItems);

        return relevantActivities.map((activity) => {
            const event = MOCK_EVENTS.find((e) => e.id === activity.eventId);
            return {
                id: activity.id,
                eventId: activity.eventId!, // eventId 필터링으로 보장됨
                eventTitle: activity.eventTitle!, // eventTitle 필터링으로 보장됨
                eventPosterUrl: event?.posterUrl,
                eventDate: event?.startAt || new Date(),
                userId: activity.userId,
                userNickname: activity.userNickname,
                userAvatar: activity.userAvatar || "👤",
                type: activity.type as "attended" | "review",
                content: activity.content,
                createdAt: activity.createdAt,
            };
        });
    }, [friendActivities, following, maxItems]);

    // 이미 본 행사 제외 (찜하거나 다녀온 행사)
    const newHighlights = useMemo(() => {
        return highlights.filter(
            (h) => !isWishlist(h.eventId) && !isAttended(h.eventId)
        );
    }, [highlights, isWishlist, isAttended]);

    // 표시할 항목이 없으면 렌더링하지 않음
    if (newHighlights.length === 0) {
        return null;
    }

    const currentHighlight = newHighlights[currentIndex];

    const goToPrev = () => {
        setCurrentIndex((prev) =>
            prev === 0 ? newHighlights.length - 1 : prev - 1
        );
    };

    const goToNext = () => {
        setCurrentIndex((prev) =>
            prev === newHighlights.length - 1 ? 0 : prev + 1
        );
    };

    const handleWishlist = () => {
        toggleWishlist(currentHighlight.eventId);
    };

    const handleAttended = () => {
        toggleAttended(currentHighlight.eventId);
    };

    return (
        <div className={cn("bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4", className)}>
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">친구들이 다녀온 행사</h3>
                    <p className="text-xs text-gray-500">놓치신 건 아니죠?</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>{currentIndex + 1}</span>
                    <span>/</span>
                    <span>{newHighlights.length}</span>
                </div>
            </div>

            {/* 캐러셀 */}
            <div className="relative">
                {/* 메인 카드 */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* 포스터 영역 */}
                    <div className="relative h-40 bg-gray-200">
                        {currentHighlight.eventPosterUrl ? (
                            <img
                                src={currentHighlight.eventPosterUrl}
                                alt={currentHighlight.eventTitle}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                                🎵
                            </div>
                        )}

                        {/* 친구 정보 오버레이 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
                                    {currentHighlight.userAvatar}
                                </div>
                                <div className="text-white">
                                    <p className="text-sm font-medium">{currentHighlight.userNickname}</p>
                                    <p className="text-xs opacity-80">
                                        {currentHighlight.type === "attended" ? "다녀왔어요" : "리뷰를 남겼어요"}
                                        {" · "}
                                        {getRelativeTime(currentHighlight.createdAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 행사 정보 */}
                    <div className="p-3">
                        <h4 className="font-medium text-gray-900 line-clamp-1">
                            {currentHighlight.eventTitle}
                        </h4>

                        {/* 리뷰 내용 (있는 경우) */}
                        {currentHighlight.content && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded">
                                "{currentHighlight.content}"
                            </p>
                        )}

                        {/* CTA 버튼 */}
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={handleWishlist}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                                <Star className="h-4 w-4" />
                                찜하기
                            </button>
                            <button
                                onClick={handleAttended}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                            >
                                <Check className="h-4 w-4" />
                                다녀옴
                            </button>
                            <Link
                                href={`/event/${currentHighlight.eventId}`}
                                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 네비게이션 버튼 */}
                {newHighlights.length > 1 && (
                    <>
                        <button
                            onClick={goToPrev}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50"
                        >
                            <ChevronLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <button
                            onClick={goToNext}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50"
                        >
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                        </button>
                    </>
                )}
            </div>

            {/* 도트 인디케이터 */}
            {newHighlights.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                    {newHighlights.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={cn(
                                "w-2 h-2 rounded-full transition-colors",
                                idx === currentIndex
                                    ? "bg-amber-500"
                                    : "bg-gray-300 hover:bg-gray-400"
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * 친구 활동 미니 프리뷰 (홈 위젯용)
 */
interface FriendActivityMiniProps {
    className?: string;
}

export function FriendActivityMini({ className }: FriendActivityMiniProps) {
    const { getFriendActivities } = useFollow();

    // 최근 3개 활동
    const recentActivities = getFriendActivities().slice(0, 3);

    if (recentActivities.length === 0) {
        return null;
    }

    return (
        <div className={cn("bg-white rounded-lg border border-gray-200 p-3", className)}>
            <h4 className="text-sm font-medium text-gray-900 mb-2">친구 활동</h4>
            <div className="space-y-2">
                {recentActivities.map((activity) => (
                    <Link
                        key={activity.id}
                        href={`/event/${activity.eventId}`}
                        className="flex items-center gap-2 group"
                    >
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                            {activity.userAvatar || "👤"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 truncate">
                                <span className="font-medium">{activity.userNickname}</span>
                                {activity.type === "wishlist" && "님이 찜했어요"}
                                {activity.type === "attended" && "님이 다녀왔어요"}
                                {activity.type === "review" && "님이 리뷰 남겼어요"}
                            </p>
                            <p className="text-xs text-gray-500 truncate group-hover:text-indigo-600">
                                {activity.eventTitle}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
            <Link
                href="/profile/activity"
                className="block mt-2 text-xs text-center text-indigo-600 hover:underline"
            >
                모두 보기
            </Link>
        </div>
    );
}
