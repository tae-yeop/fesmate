"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Calendar, CalendarDays } from "lucide-react";
import { Event, getHubMode } from "@/types/event";
import { cn } from "@/lib/utils";

interface EventCalendarViewProps {
    events: Event[];
}

type ViewMode = "month" | "week";

/**
 * 캘린더 뷰 컴포넌트
 * - 월/주 단위 캘린더 토글
 * - 날짜별 행사 표시
 * - 클릭 시 해당 날짜 행사 목록 표시
 */
export function EventCalendarView({ events }: EventCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("month");

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 주간 뷰용: 현재 주의 시작일 (일요일 기준)
    const weekStart = useMemo(() => {
        const date = new Date(currentDate);
        const day = date.getDay();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);
        return date;
    }, [currentDate]);

    // 주간 뷰용: 현재 주의 날짜들
    const weekDays = useMemo(() => {
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push(date);
        }
        return days;
    }, [weekStart]);

    // 주간 뷰 헤더 텍스트
    const weekRangeText = useMemo(() => {
        const start = weekDays[0];
        const end = weekDays[6];

        if (start.getMonth() === end.getMonth()) {
            return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getDate()}일`;
        } else if (start.getFullYear() === end.getFullYear()) {
            return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
        } else {
            return `${start.getFullYear()}.${start.getMonth() + 1}.${start.getDate()} - ${end.getFullYear()}.${end.getMonth() + 1}.${end.getDate()}`;
        }
    }, [weekDays]);

    // 달력 데이터 생성 (월간)
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
            // endAt이 없는 경우: startAt과 같은 날로 처리 (1일 이벤트)
            const endDate = event.endAt
                ? new Date(event.endAt)
                : new Date(startDate);

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

    // 이전/다음 주
    const prevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
        setSelectedDate(null);
    };

    const nextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
        setSelectedDate(null);
    };

    // 이전/다음 (뷰 모드에 따라)
    const goPrev = () => {
        if (viewMode === "month") {
            prevMonth();
        } else {
            prevWeek();
        }
    };

    const goNext = () => {
        if (viewMode === "month") {
            nextMonth();
        } else {
            nextWeek();
        }
    };

    // 오늘로 이동
    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
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
                    onClick={goPrev}
                    className="p-2 rounded-full hover:bg-accent"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">
                        {viewMode === "month"
                            ? `${year}년 ${month + 1}월`
                            : weekRangeText
                        }
                    </h2>
                    <button
                        onClick={goToToday}
                        className="text-xs text-primary font-medium px-2 py-1 rounded-full border hover:bg-accent"
                    >
                        오늘
                    </button>
                </div>
                <button
                    onClick={goNext}
                    className="p-2 rounded-full hover:bg-accent"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* 뷰 모드 토글 */}
            <div className="flex items-center justify-center gap-1 border rounded-lg p-0.5 w-fit mx-auto">
                <button
                    onClick={() => setViewMode("month")}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        viewMode === "month"
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent text-muted-foreground"
                    )}
                >
                    <Calendar className="h-4 w-4" />
                    월
                </button>
                <button
                    onClick={() => setViewMode("week")}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        viewMode === "week"
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent text-muted-foreground"
                    )}
                >
                    <CalendarDays className="h-4 w-4" />
                    주
                </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1">
                {dayNames.map((day, i) => (
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

            {/* 월간 캘린더 그리드 */}
            {viewMode === "month" && (
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
            )}

            {/* 주간 캘린더 그리드 */}
            {viewMode === "week" && (
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((date) => {
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
                                "flex flex-col items-center justify-center rounded-lg text-sm transition-colors relative py-4",
                                isSelected && "bg-primary text-primary-foreground",
                                !isSelected && isToday && "bg-primary/10 font-bold",
                                !isSelected && !isToday && "hover:bg-accent",
                                isPast && !isSelected && "text-muted-foreground",
                                dayOfWeek === 0 && !isSelected && "text-red-500",
                                dayOfWeek === 6 && !isSelected && "text-blue-500"
                            )}
                        >
                            {/* 날짜 (일) */}
                            <span className="text-lg font-bold">{date.getDate()}</span>
                            {/* 월 표시 (1일이거나 주의 시작이면) */}
                            {(date.getDate() === 1 || date === weekDays[0]) && (
                                <span className={cn(
                                    "text-[10px]",
                                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                )}>
                                    {date.getMonth() + 1}월
                                </span>
                            )}

                            {/* 이벤트 인디케이터 */}
                            {dayEvents.length > 0 && (
                                <div className="flex gap-0.5 mt-1">
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
            )}

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
