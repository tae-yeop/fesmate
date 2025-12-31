"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Grid3X3, List, Calendar, X, ChevronDown, Loader2, Database, HardDrive } from "lucide-react";
import { EventCard } from "@/components/events/EventCard";
import { EventListItem } from "@/components/events/EventListItem";
import { EventCalendarView } from "@/components/events/EventCalendarView";
import { useEvents } from "@/lib/supabase/hooks";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/lib/wishlist-context";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";
import { LoginPromptModal } from "@/components/auth";

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
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    // Supabase에서 이벤트 데이터 가져오기 (오류 시 Mock 폴백)
    const { events: allEvents, isLoading, isFromSupabase } = useEvents();

    // 찜/다녀옴 상태
    const { isWishlist, isAttended, toggleWishlist } = useWishlist();

    // 인증 상태
    const { user } = useAuth();
    const { isLoggedIn: isDevLoggedIn } = useDevContext();
    const isLoggedIn = !!user || isDevLoggedIn;

    // 로그인 필요한 액션 처리
    const handleWishlistToggle = useCallback((eventId: string) => {
        if (isLoggedIn) {
            toggleWishlist(eventId);
        } else {
            setShowLoginPrompt(true);
        }
    }, [isLoggedIn, toggleWishlist]);

    // 필터 옵션
    const filterOptions = {
        region: ["서울", "경기", "인천", "부산", "대구", "광주", "대전"],
        period: ["이번 주", "이번 달", "3개월 내", "지난 3개월", "지난 12개월", "지난 24개월"],
        genre: ["콘서트", "페스티벌", "뮤지컬", "전시"],
    };

    // 지난 행사 필터인지 확인 (RECAP 모드 링크용)
    const isPastEventFilter = filters.period?.includes("지난");

    // 필터링 및 정렬된 이벤트
    const filteredEvents = useMemo(() => {
        let events = [...allEvents];

        // 검색
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            events = events.filter(
                (e) =>
                    e.title.toLowerCase().includes(query) ||
                    e.venue?.name?.toLowerCase().includes(query) ||
                    e.artists?.some((a) => a.name.toLowerCase().includes(query))
            );
        }

        // 지역 필터
        if (filters.region) {
            events = events.filter((e) => {
                const address = e.venue?.address || "";
                const name = e.venue?.name || "";
                return address.includes(filters.region!) || name.includes(filters.region!);
            });
        }

        // 장르 필터
        if (filters.genre) {
            const genreMap: Record<string, string> = {
                "콘서트": "concert",
                "페스티벌": "festival",
                "뮤지컬": "musical",
                "전시": "exhibition",
            };
            events = events.filter((e) => e.type === genreMap[filters.genre!]);
        }

        // 무료 필터
        if (filters.freeOnly) {
            events = events.filter((e) => {
                if (!e.price) return false;
                const price = e.price.toLowerCase();
                return price === "무료" || price === "free" || price.includes("무료");
            });
        }

        // 기간 필터
        if (filters.period) {
            const now = new Date();
            events = events.filter((e) => {
                const endAt = e.endAt ? new Date(e.endAt) : new Date(e.startAt);
                const startAt = new Date(e.startAt);
                const futureDiffDays = Math.ceil((startAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const pastDiffDays = Math.ceil((now.getTime() - endAt.getTime()) / (1000 * 60 * 60 * 24));

                switch (filters.period) {
                    case "이번 주":
                        return futureDiffDays >= 0 && futureDiffDays <= 7;
                    case "이번 달":
                        return futureDiffDays >= 0 && futureDiffDays <= 30;
                    case "3개월 내":
                        return futureDiffDays >= 0 && futureDiffDays <= 90;
                    case "지난 3개월":
                        return pastDiffDays > 0 && pastDiffDays <= 90;
                    case "지난 12개월":
                        return pastDiffDays > 0 && pastDiffDays <= 365;
                    case "지난 24개월":
                        return pastDiffDays > 0 && pastDiffDays <= 730;
                    default:
                        return true;
                }
            });
        }

        // 정렬
        const isPastFilter = filters.period?.includes("지난");
        if (sort === "date") {
            if (isPastFilter) {
                // 지난 행사: 최근 종료된 순서 (내림차순)
                events.sort((a, b) => {
                    const endAtA = a.endAt ? new Date(a.endAt) : new Date(a.startAt);
                    const endAtB = b.endAt ? new Date(b.endAt) : new Date(b.startAt);
                    return endAtB.getTime() - endAtA.getTime();
                });
            } else {
                // 예정 행사: 가까운 날짜순 (오름차순)
                events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
            }
        } else {
            // 최신 등록순 - createdAt이 없으면 startAt 사용
            events.sort((a, b) => {
                const dateA = new Date(a.startAt).getTime();
                const dateB = new Date(b.startAt).getTime();
                return dateB - dateA;
            });
        }

        return events;
    }, [searchQuery, filters, sort, allEvents]);

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
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {isLoading ? "로딩 중..." : `${filteredEvents.length}개의 행사`}
                            </span>
                            {/* 데이터 소스 표시 (Dev 확인용) */}
                            {!isLoading && (
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded",
                                        isFromSupabase
                                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                    )}
                                    title={isFromSupabase ? "Supabase에서 로드됨" : "Mock 데이터 사용 중"}
                                >
                                    {isFromSupabase ? (
                                        <><Database className="h-3 w-3" /> DB</>
                                    ) : (
                                        <><HardDrive className="h-3 w-3" /> Mock</>
                                    )}
                                </span>
                            )}
                        </div>
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

                {/* 로딩 상태 */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">행사 목록을 불러오는 중...</span>
                    </div>
                )}

                {/* 뷰 렌더링 */}
                {!isLoading && view === "card" && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {filteredEvents.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                isWishlist={isWishlist(event.id)}
                                isAttended={isAttended(event.id)}
                                onWishlistToggle={() => handleWishlistToggle(event.id)}
                                isPastEvent={isPastEventFilter}
                            />
                        ))}
                    </div>
                )}

                {!isLoading && view === "list" && (
                    <div className="space-y-3">
                        {filteredEvents.map((event) => (
                            <EventListItem
                                key={event.id}
                                event={event}
                                isWishlist={isWishlist(event.id)}
                                isAttended={isAttended(event.id)}
                                onWishlistToggle={() => handleWishlistToggle(event.id)}
                                isPastEvent={isPastEventFilter}
                            />
                        ))}
                    </div>
                )}

                {!isLoading && view === "calendar" && (
                    <EventCalendarView events={filteredEvents} />
                )}

                {/* 빈 상태 */}
                {!isLoading && filteredEvents.length === 0 && (
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

            {/* Login Prompt Modal */}
            <LoginPromptModal
                isOpen={showLoginPrompt}
                onClose={() => setShowLoginPrompt(false)}
                action="찜하기"
            />
        </div>
    );
}
