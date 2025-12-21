"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Star,
    CheckCircle2,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrew } from "@/lib/crew-context";
import { useWishlist } from "@/lib/wishlist-context";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { Event } from "@/types/event";

interface CrewCalendarProps {
    crewId: string;
}

/** 멤버별 찜/다녀옴 행사 정보 (Mock) */
interface MemberEventInfo {
    memberId: string;
    memberNickname: string;
    memberAvatar?: string;
    isWishlist: boolean;
    isAttended: boolean;
}

/** 크루 통합 행사 */
interface CrewCalendarEvent {
    event: Event;
    members: MemberEventInfo[];
    wishlistCount: number;
    attendedCount: number;
}

// Mock: 멤버별 찜 데이터 (실제로는 서버에서 가져와야 함)
const MOCK_MEMBER_WISHLISTS: Record<string, string[]> = {
    user1: ["55948", "e2", "24016943"],
    user2: ["55948", "e2"],
    user3: ["e2", "pentaport"],
    user4: ["55948", "pentaport", "24016943"],
    user5: ["e2"],
    user6: ["pentaport"],
};

// Mock: 멤버별 다녀옴 데이터
const MOCK_MEMBER_ATTENDED: Record<string, string[]> = {
    user1: ["24016943"],
    user2: [],
    user3: ["24016943"],
    user4: ["24016943"],
    user5: [],
    user6: [],
};

export function CrewCalendar({ crewId }: CrewCalendarProps) {
    const { getCrewMembers, getCrew } = useCrew();
    const { isWishlist, isAttended } = useWishlist();

    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const crew = getCrew(crewId);
    const members = getCrewMembers(crewId);

    // 멤버별 찜/다녀옴 행사 통합
    const crewEvents = useMemo(() => {
        const eventMap = new Map<string, CrewCalendarEvent>();

        members.forEach((member) => {
            // Mock 데이터 사용
            const memberWishlists = MOCK_MEMBER_WISHLISTS[member.userId] || [];
            const memberAttended = MOCK_MEMBER_ATTENDED[member.userId] || [];

            // 찜 행사 추가
            memberWishlists.forEach((eventId) => {
                const event = MOCK_EVENTS.find((e) => e.id === eventId);
                if (!event) return;

                if (!eventMap.has(eventId)) {
                    eventMap.set(eventId, {
                        event,
                        members: [],
                        wishlistCount: 0,
                        attendedCount: 0,
                    });
                }

                const crewEvent = eventMap.get(eventId)!;
                const existingMember = crewEvent.members.find(
                    (m) => m.memberId === member.userId
                );

                if (existingMember) {
                    existingMember.isWishlist = true;
                } else {
                    crewEvent.members.push({
                        memberId: member.userId,
                        memberNickname: member.userNickname,
                        memberAvatar: member.userAvatar,
                        isWishlist: true,
                        isAttended: false,
                    });
                }
                crewEvent.wishlistCount++;
            });

            // 다녀옴 행사 추가
            memberAttended.forEach((eventId) => {
                const event = MOCK_EVENTS.find((e) => e.id === eventId);
                if (!event) return;

                if (!eventMap.has(eventId)) {
                    eventMap.set(eventId, {
                        event,
                        members: [],
                        wishlistCount: 0,
                        attendedCount: 0,
                    });
                }

                const crewEvent = eventMap.get(eventId)!;
                const existingMember = crewEvent.members.find(
                    (m) => m.memberId === member.userId
                );

                if (existingMember) {
                    existingMember.isAttended = true;
                } else {
                    crewEvent.members.push({
                        memberId: member.userId,
                        memberNickname: member.userNickname,
                        memberAvatar: member.userAvatar,
                        isWishlist: false,
                        isAttended: true,
                    });
                }
                crewEvent.attendedCount++;
            });
        });

        return Array.from(eventMap.values()).sort((a, b) => {
            const aDate = new Date(a.event.startAt);
            const bDate = new Date(b.event.startAt);
            return aDate.getTime() - bDate.getTime();
        });
    }, [members]);

    // 현재 월의 날짜들
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days: (Date | null)[] = [];

        // 이전 달 빈칸
        const startDayOfWeek = firstDay.getDay();
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // 현재 달 날짜
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }

        return days;
    }, [currentMonth]);

    // 날짜별 행사 매핑
    const eventsByDate = useMemo(() => {
        const map = new Map<string, CrewCalendarEvent[]>();

        crewEvents.forEach((ce) => {
            const startDate = new Date(ce.event.startAt);
            const endDate = ce.event.endAt
                ? new Date(ce.event.endAt)
                : startDate;

            // 시작일부터 종료일까지 모든 날짜에 추가
            const current = new Date(startDate);
            while (current <= endDate) {
                const dateKey = current.toISOString().split("T")[0];
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(ce);
                current.setDate(current.getDate() + 1);
            }
        });

        return map;
    }, [crewEvents]);

    // 월 이동
    const prevMonth = () => {
        setCurrentMonth(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
        );
    };

    const nextMonth = () => {
        setCurrentMonth(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
        );
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="space-y-4">
            {/* 캘린더 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-muted rounded-lg"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-lg font-semibold min-w-[120px] text-center">
                        {currentMonth.getFullYear()}년{" "}
                        {currentMonth.getMonth() + 1}월
                    </h3>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-muted rounded-lg"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
                <button
                    onClick={goToToday}
                    className="text-sm text-primary hover:underline"
                >
                    오늘
                </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                    <div
                        key={day}
                        className={cn(
                            "text-xs font-medium py-2",
                            i === 0 && "text-red-500",
                            i === 6 && "text-blue-500"
                        )}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* 캘린더 그리드 */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, i) => {
                    if (!date) {
                        return <div key={`empty-${i}`} className="h-24" />;
                    }

                    const dateKey = date.toISOString().split("T")[0];
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const isToday = date.getTime() === today.getTime();
                    const isPast = date < today;
                    const dayOfWeek = date.getDay();

                    return (
                        <div
                            key={dateKey}
                            className={cn(
                                "h-24 border rounded-lg p-1 transition-colors",
                                isToday && "border-primary bg-primary/5",
                                isPast && "opacity-60",
                                !isToday && "hover:bg-muted/50"
                            )}
                        >
                            <div
                                className={cn(
                                    "text-xs font-medium mb-1",
                                    dayOfWeek === 0 && "text-red-500",
                                    dayOfWeek === 6 && "text-blue-500",
                                    isToday && "text-primary"
                                )}
                            >
                                {date.getDate()}
                            </div>
                            <div className="space-y-0.5 overflow-hidden">
                                {dayEvents.slice(0, 2).map((ce) => (
                                    <Link
                                        key={ce.event.id}
                                        href={`/event/${ce.event.id}`}
                                        className={cn(
                                            "block text-[10px] px-1 py-0.5 rounded truncate",
                                            ce.attendedCount > 0
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        )}
                                    >
                                        {ce.event.title}
                                    </Link>
                                ))}
                                {dayEvents.length > 2 && (
                                    <div className="text-[10px] text-muted-foreground px-1">
                                        +{dayEvents.length - 2}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 행사 목록 */}
            <div className="mt-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    크루 행사 ({crewEvents.length})
                </h4>

                {crewEvents.length > 0 ? (
                    <div className="space-y-3">
                        {crewEvents.map((ce) => (
                            <Link
                                key={ce.event.id}
                                href={`/event/${ce.event.id}`}
                                className="block rounded-lg border p-3 hover:border-primary/50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    {/* 포스터 */}
                                    <div className="w-16 h-20 rounded bg-muted flex items-center justify-center text-2xl shrink-0">
                                        {ce.event.posterUrl ? (
                                            <img
                                                src={ce.event.posterUrl}
                                                alt={ce.event.title}
                                                className="w-full h-full object-cover rounded"
                                            />
                                        ) : (
                                            "🎵"
                                        )}
                                    </div>

                                    {/* 정보 */}
                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-medium text-sm truncate">
                                            {ce.event.title}
                                        </h5>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {new Intl.DateTimeFormat("ko-KR", {
                                                month: "short",
                                                day: "numeric",
                                                weekday: "short",
                                            }).format(new Date(ce.event.startAt))}
                                        </p>

                                        {/* 멤버 표시 */}
                                        <div className="flex items-center gap-2 mt-2">
                                            {ce.wishlistCount > 0 && (
                                                <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                                                    <Star className="h-3 w-3" />
                                                    {ce.wishlistCount}명 찜
                                                </span>
                                            )}
                                            {ce.attendedCount > 0 && (
                                                <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    {ce.attendedCount}명 다녀옴
                                                </span>
                                            )}
                                        </div>

                                        {/* 멤버 아바타 */}
                                        <div className="flex items-center gap-1 mt-2">
                                            {ce.members.slice(0, 5).map((m) => (
                                                <div
                                                    key={m.memberId}
                                                    className={cn(
                                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                                                        m.isAttended
                                                            ? "bg-green-100 dark:bg-green-900/30"
                                                            : "bg-yellow-100 dark:bg-yellow-900/30"
                                                    )}
                                                    title={m.memberNickname}
                                                >
                                                    {m.memberAvatar || "👤"}
                                                </div>
                                            ))}
                                            {ce.members.length > 5 && (
                                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                                    +{ce.members.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>아직 크루원들이 찜한 행사가 없어요</p>
                        <p className="text-sm mt-1">
                            행사를 찜하면 여기에 표시됩니다
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
