"use client";

import Link from "next/link";
import { Calendar, MapPin, Star, CheckCircle2, Users } from "lucide-react";
import { Event, getHubMode, getDDayBadge } from "@/types/event";
import { cn } from "@/lib/utils";

interface EventCardProps {
    event: Event;
    className?: string;
    isWishlist?: boolean;
    isAttended?: boolean;
    onWishlistToggle?: () => void;
    /** 지난 행사 필터에서 사용 - true일 경우 RECAP 탭으로 기본 진입 */
    isPastEvent?: boolean;
}

/**
 * 이벤트 카드 컴포넌트 - PRD v0.5 기준
 * - ⭐찜 빠른 토글
 * - ✅다녀옴 배지
 * - LIVE/진행중 배지
 * - D-Day 배지
 */
export function EventCard({
    event,
    className,
    isWishlist = false,
    isAttended = false,
    onWishlistToggle,
    isPastEvent = false,
}: EventCardProps) {
    const now = new Date();
    const hubMode = getHubMode(event, now);
    const dDayBadge = getDDayBadge(event.startAt, now);

    // 지난 행사일 경우 허브(RECAP) 탭으로 기본 진입
    const eventLink = isPastEvent
        ? `/event/${event.id}?tab=hub`
        : `/event/${event.id}`;

    // 날짜 포맷
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "short",
        }).format(new Date(date));
    };

    return (
        <div className={cn("group relative", className)}>
            <Link
                href={eventLink}
                className="flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:shadow-md"
            >
                {/* 포스터 */}
                <div className="aspect-[3/4] w-full bg-muted relative overflow-hidden">
                    {event.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={event.posterUrl}
                            alt={event.title}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-gray-100">
                            Poster
                        </div>
                    )}

                    {/* 배지 */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {/* LIVE 배지 */}
                        {hubMode === "LIVE" && event.status === "SCHEDULED" && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white animate-pulse">
                                🔴 LIVE
                            </span>
                        )}

                        {/* 상태 배지 */}
                        {event.status === "CANCELED" && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-500 text-white">
                                취소됨
                            </span>
                        )}
                        {event.status === "POSTPONED" && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-500 text-white">
                                일정 변경
                            </span>
                        )}

                        {/* D-Day 배지 */}
                        {dDayBadge && event.status === "SCHEDULED" && hubMode !== "LIVE" && hubMode !== "RECAP" && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground">
                                {dDayBadge}
                            </span>
                        )}

                        {/* RECAP 배지 (지난 행사) */}
                        {hubMode === "RECAP" && event.status === "SCHEDULED" && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-600 text-white">
                                RECAP
                            </span>
                        )}

                        {/* 기타 배지 */}
                        {event.badges?.filter(b => !["LIVE", "취소됨", "일정 변경"].includes(b)).map((badge) => (
                            <span
                                key={badge}
                                className="px-2 py-0.5 text-xs font-bold rounded-full bg-primary text-primary-foreground"
                            >
                                {badge}
                            </span>
                        ))}
                    </div>

                    {/* 다녀옴 배지 */}
                    {isAttended && (
                        <div className="absolute top-2 right-2">
                            <span className="flex items-center gap-0.5 bg-green-500 text-white px-1.5 py-0.5 rounded-full text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                            </span>
                        </div>
                    )}
                </div>

                {/* 콘텐츠 */}
                <div className="flex flex-1 flex-col p-3">
                    <h3 className="line-clamp-2 text-sm font-bold leading-tight group-hover:text-primary mb-2">
                        {event.title}
                    </h3>

                    <div className="mt-auto space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            <span>{formatDate(event.startAt)}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3" />
                            <span className="line-clamp-1">{event.venue.name}</span>
                        </div>
                    </div>

                    {/* 통계 */}
                    {event.stats && (
                        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-muted-foreground border-t pt-2">
                            {event.stats.wishlistCount > 0 && (
                                <div className="flex items-center">
                                    <Star className="mr-1 h-3 w-3" />
                                    {event.stats.wishlistCount.toLocaleString()}
                                </div>
                            )}
                            {event.stats.companionCount > 0 && (
                                <div className="flex items-center">
                                    <Users className="mr-1 h-3 w-3" />
                                    {event.stats.companionCount}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Link>

            {/* 찜 토글 버튼 (카드 외부) */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onWishlistToggle?.();
                }}
                className={cn(
                    "absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm transition-colors",
                    isWishlist
                        ? "border-yellow-400 text-yellow-500"
                        : "border-gray-200 text-gray-400 hover:text-yellow-500"
                )}
                aria-label={isWishlist ? "찜 해제" : "찜하기"}
            >
                <Star className={cn("h-4 w-4", isWishlist && "fill-yellow-400")} />
            </button>
        </div>
    );
}
