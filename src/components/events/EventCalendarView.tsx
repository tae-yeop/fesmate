"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Event, getHubMode } from "@/types/event";
import { cn } from "@/lib/utils";

interface EventCalendarViewProps {
    events: Event[];
}

/**
 * 캘린더 뷰 컴포넌트
 * - 월 단위 캘린더
 * - 날짜별 행사 표시
 * - 클릭 시 해당 날짜 행사 목록 표시
 */
export function EventCalendarView({ events }: EventCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 달력 데이터 생성
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay(); // 0 = 일요일
        const daysInMonth = lastDay.getDate();

        const days: (Date | null)[] = [];

        // 이전 달 빈 칸
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }

        // 현재 달 날짜
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    }, [year, month]);

    // 날짜별 이벤트 맵
    const eventsByDate = useMemo(() => {
        const map = new Map<string, Event[]>();

        events.forEach((event) => {
            const startDate = new Date(event.startAt);
            const endDate = new Date(event.endAt);

            // 이벤트 기간 동안의 모든 날짜에 추가
            const current = new Date(startDate);
            while (current <= endDate) {
                const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key)!.push(event);
                current.setDate(current.getDate() + 1);
            }
        });

        return map;
    }, [events]);

    // 선택된 날짜의 이벤트
    const selectedEvents = useMemo(() => {
        if (!selectedDate) return [];
        const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
        return eventsByDate.get(key) || [];
    }, [selectedDate, eventsByDate]);

    // 이전/다음 달
    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDate(null);
    };

    // 오늘로 이동
    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
    const today = new Date();
    const now = new Date();

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "long",
        }).format(date);
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    return (
        <div className="space-y-4">
            {/* 캘린더 헤더 */}
            <div className="flex items-center justify-between">
                <button
                    onClick={prevMonth}
                    className="p-2 rounded-full hover:bg-accent"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                        {year}년 {month + 1}월
                    </h2>
                    <button
                        onClick={goToToday}
                        className="text-xs text-primary font-medium px-2 py-1 rounded-full border hover:bg-accent"
                    >
                        오늘
                    </button>
                </div>
                <button
                    onClick={nextMonth}
                    className="p-2 rounded-full hover:bg-accent"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, i) => (
                    <div
                        key={day}
                        className={cn(
                            "text-center text-xs font-medium py-2",
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
                {calendarDays.map((date, index) => {
                    if (!date) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                    const dayEvents = eventsByDate.get(key) || [];
                    const isToday =
                        date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();
                    const isSelected =
                        selectedDate &&
                        date.getDate() === selectedDate.getDate() &&
                        date.getMonth() === selectedDate.getMonth() &&
                        date.getFullYear() === selectedDate.getFullYear();
                    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const dayOfWeek = date.getDay();

                    // LIVE 이벤트가 있는지 확인
                    const hasLiveEvent = dayEvents.some(
                        (e) => getHubMode(e, now) === "LIVE" && e.status === "SCHEDULED"
                    );

                    return (
                        <button
                            key={key}
                            onClick={() => setSelectedDate(date)}
                            className={cn(
                                "aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative",
                                isSelected && "bg-primary text-primary-foreground",
                                !isSelected && isToday && "bg-primary/10 font-bold",
                                !isSelected && !isToday && "hover:bg-accent",
                                isPast && !isSelected && "text-muted-foreground",
                                dayOfWeek === 0 && !isSelected && "text-red-500",
                                dayOfWeek === 6 && !isSelected && "text-blue-500"
                            )}
                        >
                            <span>{date.getDate()}</span>

                            {/* 이벤트 인디케이터 */}
                            {dayEvents.length > 0 && (
                                <div className="flex gap-0.5 mt-0.5">
                                    {hasLiveEvent ? (
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                    ) : dayEvents.length <= 3 ? (
                                        dayEvents.slice(0, 3).map((_, i) => (
                                            <span
                                                key={i}
                                                className={cn(
                                                    "h-1.5 w-1.5 rounded-full",
                                                    isSelected ? "bg-primary-foreground" : "bg-primary"
                                                )}
                                            />
                                        ))
                                    ) : (
                                        <span
                                            className={cn(
                                                "text-[10px] font-bold",
                                                isSelected ? "text-primary-foreground" : "text-primary"
                                            )}
                                        >
                                            {dayEvents.length}
                                        </span>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 선택된 날짜의 이벤트 목록 */}
            {selectedDate && (
                <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold mb-3">{formatDate(selectedDate)}</h3>

                    {selectedEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            이 날짜에 예정된 행사가 없습니다
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {selectedEvents.map((event) => {
                                const hubMode = getHubMode(event, now);

                                return (
                                    <Link
                                        key={event.id}
                                        href={`/event/${event.id}`}
                                        className="flex gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
                                    >
                                        {/* 포스터 */}
                                        <div className="h-16 w-12 flex-shrink-0 rounded bg-muted overflow-hidden">
                                            {event.posterUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={event.posterUrl}
                                                    alt={event.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                                                    Poster
                                                </div>
                                            )}
                                        </div>

                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {hubMode === "LIVE" && event.status === "SCHEDULED" && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white animate-pulse">
                                                        LIVE
                                                    </span>
                                                )}
                                                {event.status === "CANCELED" && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-500 text-white">
                                                        취소됨
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-medium text-sm line-clamp-1">
                                                {event.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <span>{formatTime(event.startAt)}</span>
                                                <span className="flex items-center gap-0.5">
                                                    <MapPin className="h-3 w-3" />
                                                    {event.venue.name}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
