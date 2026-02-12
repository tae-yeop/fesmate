"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Star, CheckCircle2, Users } from "lucide-react";
import { Event, getHubMode, getDDayBadge } from "@/types/event";
import { cn } from "@/lib/utils";

interface EventListItemProps {
    event: Event;
    isWishlist?: boolean;
    isAttended?: boolean;
    onWishlistToggle?: () => void;
    /** 지난 행사 필터에서 사용 - true일 경우 RECAP 탭으로 기본 진입 */
    isPastEvent?: boolean;
}

/**
 * 이벤트 리스트 아이템 - 정보 밀도 높은 뷰
 */
export function EventListItem({
    event,
    isWishlist = false,
    isAttended = false,
    onWishlistToggle,
    isPastEvent = false,
}: EventListItemProps) {
    const now = new Date();
    const hubMode = getHubMode(event, now);
    const dDayBadge = getDDayBadge(event.startAt, now);

    // 지난 행사일 경우 허브(RECAP) 탭으로 기본 진입
    const eventLink = isPastEvent
        ? `/event/${event.id}?tab=hub`
        : `/event/${event.id}`;

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            month: "short",
            day: "numeric",
            weekday: "short",
        }).format(new Date(date));
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    return (
        <div className="group relative">
            <Link
                href={eventLink}
                className="flex gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-md"
            >
                <div className="relative h-24 w-18 flex-shrink-0 overflow-hidden rounded bg-muted">
                    {event.posterUrl ? (
                        <Image
                            src={event.posterUrl}
                            alt={event.title}
                            fill
                            sizes="72px"
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            Poster
                        </div>
                    )}

                    {/* LIVE 배지 */}
                    {hubMode === "LIVE" && event.status === "SCHEDULED" && (
                        <div className="absolute top-1 left-1">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white animate-pulse">
                                LIVE
                            </span>
                        </div>
                    )}
                </div>

                {/* 정보 */}
                <div className="flex flex-1 flex-col min-w-0">
                    {/* 배지 행 */}
                    <div className="flex items-center gap-1.5 mb-1">
                        {/* 상태 배지 */}
                        {event.status === "CANCELED" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-500 text-white">
                                취소됨
                            </span>
                        )}
                        {event.status === "POSTPONED" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-500 text-white">
                                일정 변경
                            </span>
                        )}

                        {/* D-Day 배지 */}
                        {dDayBadge && event.status === "SCHEDULED" && hubMode !== "LIVE" && hubMode !== "RECAP" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary text-primary-foreground">
                                {dDayBadge}
                            </span>
                        )}

                        {/* RECAP 배지 (지난 행사) */}
                        {hubMode === "RECAP" && event.status === "SCHEDULED" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-600 text-white">
                                RECAP
                            </span>
                        )}

                        {/* 다녀옴 */}
                        {isAttended && (
                            <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                다녀옴
                            </span>
                        )}
                    </div>

                    {/* 제목 */}
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary mb-1">
                        {event.title}
                    </h3>

                    {/* 일시 */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(event.startAt)}</span>
                        <span className="text-muted-foreground/50">|</span>
                        <span>{formatTime(event.startAt)}</span>
                    </div>

                    {/* 장소 */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{event.venue?.name}</span>
                    </div>

                    {/* 통계 + 아티스트/타입 */}
                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {event.stats && event.stats.wishlistCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                    <Star className="h-3 w-3" />
                                    {event.stats.wishlistCount.toLocaleString()}
                                </span>
                            )}
                            {event.stats && event.stats.companionCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                    <Users className="h-3 w-3" />
                                    {event.stats.companionCount}
                                </span>
                            )}
                        </div>
                        {/* 아티스트 또는 타입 표시 */}
                        {event.artists && event.artists.length > 0 ? (
                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[120px]">
                                {event.artists.slice(0, 2).map(a => a.name).join(", ")}
                                {event.artists.length > 2 && ` +${event.artists.length - 2}`}
                            </span>
                        ) : event.type && (
                            <span className="text-xs text-muted-foreground">
                                {event.type === "concert" && "콘서트"}
                                {event.type === "festival" && "페스티벌"}
                                {event.type === "musical" && "뮤지컬"}
                                {event.type === "exhibition" && "전시"}
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            {/* 찜 버튼 */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onWishlistToggle?.();
                }}
                className={cn(
                    "absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm transition-colors",
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
