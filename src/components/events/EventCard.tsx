"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Star, CheckCircle2, Users } from "lucide-react";
import { Event, getHubMode, getDDayBadge } from "@/types/event";
import { cn } from "@/lib/utils";
import { StatusBadge, LiveBadge } from "@/components/ui";

interface EventCardProps {
    event: Event;
    className?: string;
    isWishlist?: boolean;
    isAttended?: boolean;
    onWishlistToggle?: () => void;
    isPastEvent?: boolean;
}

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

    const eventLink = isPastEvent
        ? `/event/${event.id}?tab=hub`
        : `/event/${event.id}`;

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
                className={cn(
                    "flex flex-col overflow-hidden bg-white",
                    "rounded-2xl shadow-md",
                    "transition-all duration-200 ease-out",
                    "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
                    "active:scale-[0.98]"
                )}
            >
                <div className="aspect-[3/4] w-full bg-stone-100 relative overflow-hidden">
                    {event.posterUrl ? (
                        <Image
                            src={event.posterUrl}
                            alt={event.title}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-stone-400 bg-stone-50">
                            <span className="text-xs">No Image</span>
                        </div>
                    )}

                    <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                        {hubMode === "LIVE" && event.status === "SCHEDULED" && (
                            <LiveBadge />
                        )}

                        {event.status === "CANCELED" && (
                            <StatusBadge variant="canceled">취소됨</StatusBadge>
                        )}
                        {event.status === "POSTPONED" && (
                            <StatusBadge variant="postponed">일정 변경</StatusBadge>
                        )}

                        {dDayBadge && event.status === "SCHEDULED" && hubMode !== "LIVE" && hubMode !== "RECAP" && (
                            <StatusBadge variant="soon">{dDayBadge}</StatusBadge>
                        )}

                        {hubMode === "RECAP" && event.status === "SCHEDULED" && (
                            <StatusBadge variant="ended">RECAP</StatusBadge>
                        )}

                        {event.badges?.filter(b => !["LIVE", "취소됨", "일정 변경"].includes(b)).map((badge) => (
                            <StatusBadge key={badge} variant="dday">{badge}</StatusBadge>
                        ))}
                    </div>

                    {isAttended && (
                        <div className="absolute top-2 right-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-emerald-500 text-white rounded-full shadow-sm">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-1 flex-col p-3.5 bg-white">
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 group-hover:text-violet-600 transition-colors mb-2">
                        {event.title}
                    </h3>

                    <div className="mt-auto space-y-1.5 text-xs text-stone-500">
                        <div className="flex items-center">
                            <Calendar className="mr-1.5 h-3.5 w-3.5 text-violet-500" />
                            <span>{formatDate(event.startAt)}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPin className="mr-1.5 h-3.5 w-3.5 text-violet-500" />
                            <span className="line-clamp-1">{event.venue?.name}</span>
                        </div>
                    </div>

                    {event.stats && (event.stats.wishlistCount > 0 || event.stats.companionCount > 0) && (
                        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-stone-400 border-t border-stone-100 pt-2.5">
                            {event.stats.wishlistCount > 0 && (
                                <div className="flex items-center">
                                    <Star className="mr-1 h-3 w-3 text-amber-400" />
                                    {event.stats.wishlistCount.toLocaleString()}
                                </div>
                            )}
                            {event.stats.companionCount > 0 && (
                                <div className="flex items-center">
                                    <Users className="mr-1 h-3 w-3 text-emerald-500" />
                                    {event.stats.companionCount}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Link>

            <button
                onClick={(e) => {
                    e.preventDefault();
                    onWishlistToggle?.();
                }}
                className={cn(
                    "absolute bottom-3.5 right-3.5 z-10 flex h-9 w-9 items-center justify-center",
                    "rounded-full bg-white shadow-lg",
                    "transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    isWishlist
                        ? "text-amber-500"
                        : "text-stone-300 hover:text-amber-400"
                )}
                aria-label={isWishlist ? "찜 해제" : "찜하기"}
            >
                <Star className={cn("h-5 w-5", isWishlist && "fill-amber-400")} />
            </button>
        </div>
    );
}
