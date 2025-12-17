"use client";

import { useState, useMemo } from "react";
import { Search, Grid3X3, List, Calendar, X, ChevronDown } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EventListItem } from "@/components/events/EventListItem";
import { EventCalendarView } from "@/components/events/EventCalendarView";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Event } from "@/types/event";

type ViewType = "card" | "list" | "calendar";
type SortType = "date" | "recent";

interface Filters {
    region: string | null;
    period: string | null;
    genre: string | null;
    freeOnly: boolean;
}

/**
 * 탐색(행사) 페이지 - PRD v0.5 기준
 * - 3뷰 토글: 카드뷰 | 리스트뷰 | 캘린더뷰
 * - 필터: 지역, 기간, 장르, 유/무료
 * - 정렬: 가까운 날짜(기본) / 최신 등록
 */
export default function ExplorePage() {
    const [view, setView] = useState<ViewType>("card");
    const [sort, setSort] = useState<SortType>("date");
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState<Filters>({
        region: null,
        period: null,
        genre: null,
        freeOnly: false,
    });
    const [activeFilter, setActiveFilter] = useState<keyof Filters | null>(null);

    // 필터 옵션
    const filterOptions = {
        region: ["서울", "경기", "인천", "부산", "대구", "광주", "대전"],
        period: ["이번 주", "이번 달", "3개월 내", "지난 행사"],
        genre: ["콘서트", "페스티벌", "뮤지컬", "전시", "스포츠", "기타"],
    };

    // 필터링 및 정렬된 이벤트
    const filteredEvents = useMemo(() => {
        let events = [...MOCK_EVENTS];

        // 검색
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            events = events.filter(
                (e) =>
                    e.title.toLowerCase().includes(query) ||
                    e.venue.name.toLowerCase().includes(query) ||
                    e.artists?.some((a) => a.name.toLowerCase().includes(query))
            );
        }

        // 장르 필터
        if (filters.genre) {
            const genreMap: Record<string, string> = {
                "콘서트": "concert",
                "페스티벌": "festival",
                "뮤지컬": "musical",
                "전시": "exhibition",
                "스포츠": "sports",
            };
            events = events.filter((e) => e.type === genreMap[filters.genre!]);
        }

        // 기간 필터
        if (filters.period) {
            const now = new Date();
            events = events.filter((e) => {
                const startAt = new Date(e.startAt);
                const diffDays = Math.ceil((startAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                switch (filters.period) {
                    case "이번 주":
                        return diffDays >= 0 && diffDays <= 7;
                    case "이번 달":
                        return diffDays >= 0 && diffDays <= 30;
                    case "3개월 내":
                        return diffDays >= 0 && diffDays <= 90;
                    case "지난 행사":
                        return diffDays < 0;
                    default:
                        return true;
                }
            });
        }

        // 정렬
        if (sort === "date") {
            events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        } else {
            events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return events;
    }, [searchQuery, filters, sort]);

    // 활성 필터 개수
    const activeFilterCount = Object.values(filters).filter((v) => v !== null && v !== false).length;

    // 필터 초기화
    const clearFilters = () => {
        setFilters({ region: null, period: null, genre: null, freeOnly: false });
        setActiveFilter(null);
    };

    // 필터 선택
    const selectFilter = (key: keyof Filters, value: string | boolean) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setActiveFilter(null);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 검색 + 필터 헤더 */}
            <div className="sticky top-14 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                {/* 검색바 */}
                <div className="px-4 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="행사명, 아티스트, 장소 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-full border bg-muted pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 필터 + 뷰 토글 */}
                <div className="flex items-center justify-between px-4 pb-3">
                    {/* 필터 칩 */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {/* 지역 */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === "region" ? null : "region")}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                filters.region
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "hover:bg-accent"
                            )}
                        >
                            {filters.region || "지역"}
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {/* 기간 */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === "period" ? null : "period")}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                filters.period
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "hover:bg-accent"
                            )}
                        >
                            {filters.period || "기간"}
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {/* 장르 */}
                        <button
                            onClick={() => setActiveFilter(activeFilter === "genre" ? null : "genre")}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                filters.genre
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "hover:bg-accent"
                            )}
                        >
                            {filters.genre || "장르"}
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {/* 무료만 */}
                        <button
                            onClick={() => selectFilter("freeOnly", !filters.freeOnly)}
                            className={cn(
                                "flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                filters.freeOnly
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "hover:bg-accent"
                            )}
                        >
                            무료만
                        </button>

                        {/* 필터 초기화 */}
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="flex-shrink-0 flex items-center gap-1 rounded-full border border-destructive text-destructive px-3 py-1 text-xs font-medium hover:bg-destructive/10"
                            >
                                <X className="h-3 w-3" />
                                초기화
                            </button>
                        )}
                    </div>

                    {/* 뷰 토글 */}
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            onClick={() => setView("card")}
                            className={cn(
                                "rounded p-1.5 transition-colors",
                                view === "card"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent"
                            )}
                            title="카드뷰"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setView("list")}
                            className={cn(
                                "rounded p-1.5 transition-colors",
                                view === "list"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent"
                            )}
                            title="리스트뷰"
                        >
                            <List className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setView("calendar")}
                            className={cn(
                                "rounded p-1.5 transition-colors",
                                view === "calendar"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent"
                            )}
                            title="캘린더뷰"
                        >
                            <Calendar className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* 필터 드롭다운 */}
                {activeFilter && activeFilter !== "freeOnly" && (
                    <div className="px-4 pb-3">
                        <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-card">
                            {filterOptions[activeFilter as keyof typeof filterOptions]?.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => selectFilter(activeFilter, option)}
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                                        filters[activeFilter] === option
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted hover:bg-accent"
                                    )}
                                >
                                    {option}
                                </button>
                            ))}
                            {filters[activeFilter] && (
                                <button
                                    onClick={() => selectFilter(activeFilter, null as unknown as string)}
                                    className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                                >
                                    선택 해제
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 행사 목록 */}
            <div className="px-4 py-4">
                {/* 정렬 (캘린더뷰가 아닐 때만) */}
                {view !== "calendar" && (
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-muted-foreground">
                            {filteredEvents.length}개의 행사
                        </span>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortType)}
                            className="text-sm border rounded px-2 py-1 bg-background"
                        >
                            <option value="date">가까운 날짜순</option>
                            <option value="recent">최신 등록순</option>
                        </select>
                    </div>
                )}

                {/* 뷰 렌더링 */}
                {view === "card" && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {filteredEvents.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                )}

                {view === "list" && (
                    <div className="space-y-3">
                        {filteredEvents.map((event) => (
                            <EventListItem key={event.id} event={event} />
                        ))}
                    </div>
                )}

                {view === "calendar" && (
                    <EventCalendarView events={filteredEvents} />
                )}

                {/* 빈 상태 */}
                {filteredEvents.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground mb-4">
                            검색 결과가 없습니다
                        </p>
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                clearFilters();
                            }}
                            className="text-sm text-primary font-medium"
                        >
                            필터 초기화
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
