"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
    Calendar,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Star,
    CheckCircle2,
    Play,
    MessageSquare,
    Video,
    MapPin,
    X,
    BarChart3,
    Music,
    MapPinned,
    Users,
    Share2,
    Trophy,
    HelpCircle,
    UsersRound,
    Plus,
} from "lucide-react";
import { MOCK_EVENTS, MOCK_POSTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Event, getHubMode } from "@/types/event";
import { useWishlist } from "@/lib/wishlist-context";
import { useBadge } from "@/lib/badge-context";
import { useCrew } from "@/lib/crew-context";
import { CREW_GENRE_LABELS } from "@/types/crew";
import {
    BADGE_DEFINITIONS,
    BADGE_CATEGORY_LABELS,
    BADGE_RARITY_CONFIG,
    getBadgesByCategory,
    BadgeCategory,
} from "@/types/badge";

type TimelineStatus = "upcoming" | "live" | "past";
type FilterType = "all" | "wishlist" | "attended" | "review_pending";
type SubTab = "schedule" | "crew" | "gonglog";

interface TimelineEvent extends Event {
    isWishlist: boolean;
    isAttended: boolean;
    timelineStatus: TimelineStatus;
    reviewCount: number;
    postCount: number;
}

/**
 * MyFes 페이지 - PRD v0.5 기준
 * - 예정+지난 혼합 타임라인
 * - 기본 진입: 오늘 근처 (오늘 앵커)
 * - 상태 배지: ⭐찜 / ✅다녀옴 / 진행중
 */
export default function MyFesPage() {
    const todayRef = useRef<HTMLDivElement>(null);
    const [activeSubTab, setActiveSubTab] = useState<SubTab>("schedule");
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");
    const [showMiniCalendar, setShowMiniCalendar] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
    const [showBadgeInfo, setShowBadgeInfo] = useState(false);
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // WishlistContext에서 찜/다녀옴 상태 가져오기
    const { wishlist, attended, isWishlist, isAttended } = useWishlist();

    // BadgeContext에서 배지 정보 가져오기
    const { earnedBadges, hasBadge, getBadgeProgress, newBadges, clearNewBadges } = useBadge();

    // CrewContext에서 크루 정보 가져오기
    const { myCrews, getCrewStats, getCrewActivities } = useCrew();

    const now = new Date();

    // 타임라인 데이터 생성 - 찜 또는 다녀옴한 행사만 표시
    const timelineEvents = useMemo(() => {
        // 찜 또는 다녀옴한 이벤트 ID 목록
        const userEventIds = new Set([...wishlist, ...attended]);

        return Array.from(userEventIds).map(eventId => {
            const event = MOCK_EVENTS.find(e => e.id === eventId);
            if (!event) return null;

            const eventIsWishlist = isWishlist(eventId);
            const eventIsAttended = isAttended(eventId);

            const hubMode = getHubMode(event, now);
            // endAt이 없는 경우: startAt + 24시간을 기본 종료 시간으로 사용
            const effectiveEndAt = event.endAt
                ? new Date(event.endAt)
                : new Date(new Date(event.startAt).getTime() + 24 * 60 * 60 * 1000);
            const isEnded = effectiveEndAt.getTime() < now.getTime();

            // 사용자가 작성한 글 수 계산
            const userPosts = MOCK_POSTS.filter(p => p.eventId === event.id);
            const reviewCount = userPosts.filter(p => p.type === "review" || p.type === "video").length;
            const postCount = userPosts.length;

            return {
                ...event,
                isWishlist: eventIsWishlist,
                isAttended: eventIsAttended,
                timelineStatus: hubMode === "LIVE"
                    ? "live" as TimelineStatus
                    : isEnded || eventIsAttended
                        ? "past" as TimelineStatus
                        : "upcoming" as TimelineStatus,
                reviewCount,
                postCount,
            };
        }).filter((e): e is TimelineEvent => e !== null);
    }, [wishlist, attended, isWishlist, isAttended, now]);

    // 월별 이벤트 카운트 (미니 캘린더용)
    const eventsByMonth = useMemo(() => {
        const map = new Map<string, number>();
        timelineEvents.forEach(event => {
            const date = new Date(event.startAt);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            map.set(key, (map.get(key) || 0) + 1);
        });
        return map;
    }, [timelineEvents]);

    // 필터 적용 (타입 필터 + 월 필터)
    const filteredEvents = useMemo(() => {
        let events = timelineEvents;

        // 타입 필터
        switch (activeFilter) {
            case "wishlist":
                events = events.filter(e => e.isWishlist && !e.isAttended);
                break;
            case "attended":
                events = events.filter(e => e.isAttended);
                break;
            case "review_pending":
                events = events.filter(e => e.isAttended && e.reviewCount === 0);
                break;
        }

        // 월 필터
        if (selectedMonth) {
            events = events.filter(e => {
                const date = new Date(e.startAt);
                return date.getFullYear() === selectedMonth.year && date.getMonth() === selectedMonth.month;
            });
        }

        return events;
    }, [timelineEvents, activeFilter, selectedMonth]);

    // 상태별 그룹화
    const liveEvents = filteredEvents.filter(e => e.timelineStatus === "live");
    const upcomingEvents = filteredEvents.filter(e => e.timelineStatus === "upcoming")
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const pastEvents = filteredEvents.filter(e => e.timelineStatus === "past")
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    // 오늘로 스크롤
    const scrollToToday = () => {
        todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // 초기 로드시 오늘로 스크롤
    useEffect(() => {
        setTimeout(scrollToToday, 100);
    }, []);

    // 월 선택 핸들러
    const handleMonthSelect = (year: number, month: number) => {
        setSelectedMonth({ year, month });
        setShowMiniCalendar(false);
    };

    // 월 필터 초기화
    const clearMonthFilter = () => {
        setSelectedMonth(null);
    };

    // 선택된 월 텍스트
    const selectedMonthText = selectedMonth
        ? `${selectedMonth.year}년 ${selectedMonth.month + 1}월`
        : null;

    // ===== 공연로그 통계 계산 =====
    const attendedEvents = useMemo(() => {
        return timelineEvents.filter(e => e.isAttended);
    }, [timelineEvents]);

    // 연도별 다녀온 행사
    const attendedByYear = useMemo(() => {
        const map = new Map<number, TimelineEvent[]>();
        attendedEvents.forEach(event => {
            const year = new Date(event.startAt).getFullYear();
            if (!map.has(year)) map.set(year, []);
            map.get(year)!.push(event);
        });
        return map;
    }, [attendedEvents]);

    // 선택된 연도의 행사
    const selectedYearEvents = attendedByYear.get(selectedYear) || [];

    // 장르별 통계 (이벤트 타입 기반)
    const genreStats = useMemo(() => {
        const map = new Map<string, number>();
        selectedYearEvents.forEach(event => {
            const type = event.type || "기타";
            map.set(type, (map.get(type) || 0) + 1);
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => ({
                type,
                count,
                label: {
                    concert: "콘서트",
                    festival: "페스티벌",
                    musical: "뮤지컬",
                    exhibition: "전시",
                }[type] || type,
                percentage: Math.round((count / selectedYearEvents.length) * 100),
            }));
    }, [selectedYearEvents]);

    // 지역별 통계 (venue.address에서 추출)
    const regionStats = useMemo(() => {
        const map = new Map<string, number>();
        selectedYearEvents.forEach(event => {
            // 주소에서 시/도 추출 (예: "서울특별시 강남구..." → "서울")
            const address = event.venue.address;
            let region = "기타";
            if (address.includes("서울")) region = "서울";
            else if (address.includes("부산")) region = "부산";
            else if (address.includes("인천")) region = "인천";
            else if (address.includes("대구")) region = "대구";
            else if (address.includes("대전")) region = "대전";
            else if (address.includes("광주")) region = "광주";
            else if (address.includes("울산")) region = "울산";
            else if (address.includes("경기")) region = "경기";
            else if (address.includes("강원")) region = "강원";
            else if (address.includes("충북") || address.includes("충청북도")) region = "충북";
            else if (address.includes("충남") || address.includes("충청남도")) region = "충남";
            else if (address.includes("전북") || address.includes("전라북도")) region = "전북";
            else if (address.includes("전남") || address.includes("전라남도")) region = "전남";
            else if (address.includes("경북") || address.includes("경상북도")) region = "경북";
            else if (address.includes("경남") || address.includes("경상남도")) region = "경남";
            else if (address.includes("제주")) region = "제주";
            else if (address.includes("세종")) region = "세종";

            map.set(region, (map.get(region) || 0) + 1);
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([region, count]) => ({
                region,
                count,
                percentage: Math.round((count / selectedYearEvents.length) * 100),
            }));
    }, [selectedYearEvents]);

    // 아티스트별 통계
    const artistStats = useMemo(() => {
        const map = new Map<string, { name: string; count: number; image?: string }>();
        selectedYearEvents.forEach(event => {
            event.artists?.forEach(artist => {
                if (!map.has(artist.id)) {
                    map.set(artist.id, { name: artist.name, count: 0, image: artist.image });
                }
                map.get(artist.id)!.count++;
            });
        });
        return Array.from(map.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
    }, [selectedYearEvents]);

    // 월별 관람 통계
    const monthlyStats = useMemo(() => {
        const months = Array(12).fill(0);
        selectedYearEvents.forEach(event => {
            const month = new Date(event.startAt).getMonth();
            months[month]++;
        });
        return months;
    }, [selectedYearEvents]);

    // 총 관람 횟수
    const totalAttendedCount = attendedEvents.length;
    const yearAttendedCount = selectedYearEvents.length;

    // 사용 가능한 연도 목록
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        attendedEvents.forEach(event => {
            years.add(new Date(event.startAt).getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [attendedEvents]);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 헤더 */}
            <div className="sticky top-14 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="px-4 py-3">
                    {/* 타이틀 + 서브탭 */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                            <h1 className="text-lg font-bold">MyFes</h1>
                            {/* 서브탭 */}
                            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                                <button
                                    onClick={() => setActiveSubTab("schedule")}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                        activeSubTab === "schedule"
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    내 일정
                                </button>
                                <button
                                    onClick={() => setActiveSubTab("crew")}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                                        activeSubTab === "crew"
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <UsersRound className="h-3 w-3" />
                                    내 크루
                                    {myCrews.length > 0 && (
                                        <span className={cn(
                                            "px-1.5 rounded-full text-[10px]",
                                            activeSubTab === "crew"
                                                ? "bg-primary/20 text-primary"
                                                : "bg-primary/10 text-primary"
                                        )}>
                                            {myCrews.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveSubTab("gonglog")}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1",
                                        activeSubTab === "gonglog"
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <BarChart3 className="h-3 w-3" />
                                    공연로그
                                </button>
                            </div>
                        </div>
                        {/* 내 일정 탭: 월 이동 버튼 */}
                        {activeSubTab === "schedule" && (
                            <div className="flex items-center gap-2">
                                {/* 선택된 월 표시 */}
                                {selectedMonthText && (
                                    <button
                                        onClick={clearMonthFilter}
                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
                                    >
                                        {selectedMonthText}
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                                    className={cn(
                                        "rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent flex items-center gap-1",
                                        showMiniCalendar && "bg-primary text-primary-foreground border-primary"
                                    )}
                                >
                                    <Calendar className="h-3 w-3" />
                                    {selectedMonth ? "변경" : "월 이동"}
                                </button>
                            </div>
                        )}

                        {/* 공연로그 탭: 공유 버튼 */}
                        {activeSubTab === "gonglog" && totalAttendedCount > 0 && (
                            <button
                                className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent flex items-center gap-1"
                                onClick={() => {
                                    // TODO: 공유 기능
                                    alert("공유 기능은 준비 중입니다!");
                                }}
                            >
                                <Share2 className="h-3 w-3" />
                                공유
                            </button>
                        )}
                    </div>

                    {/* 내 일정 탭: 필터 칩 */}
                    {activeSubTab === "schedule" && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {[
                            { key: "all" as FilterType, label: "전체", count: timelineEvents.length },
                            { key: "wishlist" as FilterType, label: "찜", count: timelineEvents.filter(e => e.isWishlist && !e.isAttended).length },
                            { key: "attended" as FilterType, label: "다녀옴", count: timelineEvents.filter(e => e.isAttended).length },
                            { key: "review_pending" as FilterType, label: "리뷰 미작성", count: timelineEvents.filter(e => e.isAttended && e.reviewCount === 0).length },
                        ].map(filter => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={cn(
                                    "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                                    activeFilter === filter.key
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-accent"
                                )}
                            >
                                {filter.label}
                                {filter.count > 0 && (
                                    <span className={cn(
                                        "ml-1 px-1.5 rounded-full text-[10px]",
                                        activeFilter === filter.key ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                                    )}>
                                        {filter.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    )}
                </div>

                {/* 미니 캘린더 모달 (내 일정 탭에서만) */}
                {activeSubTab === "schedule" && showMiniCalendar && (
                    <div className="border-t bg-card p-4">
                        {/* 연도 네비게이션 */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setCalendarYear(y => y - 1)}
                                className="p-1 rounded hover:bg-accent"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-sm font-bold">{calendarYear}년</span>
                            <button
                                onClick={() => setCalendarYear(y => y + 1)}
                                className="p-1 rounded hover:bg-accent"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 월 그리드 */}
                        <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: 12 }, (_, i) => {
                                const monthKey = `${calendarYear}-${i}`;
                                const eventCount = eventsByMonth.get(monthKey) || 0;
                                const isSelected = selectedMonth?.year === calendarYear && selectedMonth?.month === i;
                                const isCurrentMonth = new Date().getFullYear() === calendarYear && new Date().getMonth() === i;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleMonthSelect(calendarYear, i)}
                                        className={cn(
                                            "relative py-3 rounded-lg text-sm font-medium transition-colors",
                                            isSelected
                                                ? "bg-primary text-primary-foreground"
                                                : eventCount > 0
                                                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                                                    : "bg-muted text-muted-foreground hover:bg-accent",
                                            isCurrentMonth && !isSelected && "ring-1 ring-primary"
                                        )}
                                    >
                                        {i + 1}월
                                        {eventCount > 0 && (
                                            <span className={cn(
                                                "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full",
                                                isSelected
                                                    ? "bg-primary-foreground text-primary"
                                                    : "bg-primary text-primary-foreground"
                                            )}>
                                                {eventCount}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* 전체 보기 버튼 */}
                        {selectedMonth && (
                            <button
                                onClick={() => {
                                    clearMonthFilter();
                                    setShowMiniCalendar(false);
                                }}
                                className="w-full mt-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                            >
                                전체 보기
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ===== 내 일정 탭 ===== */}
            {activeSubTab === "schedule" && (
            <>
            {/* 오늘로 이동 버튼 */}
            <button
                onClick={scrollToToday}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
            >
                <ChevronUp className="h-4 w-4" />
                오늘로 이동
            </button>

            {/* 타임라인 */}
            <div className="px-4 py-6 space-y-8">
                {/* 진행중 */}
                {liveEvents.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            진행중
                        </h2>
                        <div className="space-y-3">
                            {liveEvents.map((event) => (
                                <TimelineCard
                                    key={event.id}
                                    event={event}
                                    status="live"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 오늘 마커 */}
                <div ref={todayRef} className="flex items-center gap-2 py-2" id="today">
                    <div className="h-px flex-1 bg-primary" />
                    <span className="text-xs font-bold text-primary px-2 bg-primary/10 rounded-full py-1">
                        오늘 ({new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(now)})
                    </span>
                    <div className="h-px flex-1 bg-primary" />
                </div>

                {/* 예정 */}
                {upcomingEvents.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-muted-foreground mb-3">
                            다가오는 행사 ({upcomingEvents.length})
                        </h2>
                        <div className="space-y-3">
                            {upcomingEvents.map((event) => (
                                <TimelineCard
                                    key={event.id}
                                    event={event}
                                    status="upcoming"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 지난 행사 */}
                {pastEvents.length > 0 && (
                    <section>
                        <h2 className="text-sm font-bold text-muted-foreground mb-3">
                            지난 행사 ({pastEvents.length})
                        </h2>
                        <div className="space-y-3">
                            {pastEvents.map((event) => (
                                <TimelineCard
                                    key={event.id}
                                    event={event}
                                    status="past"
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 빈 상태 */}
                {filteredEvents.length === 0 && (
                    <div className="text-center py-12">
                        <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-muted-foreground mb-4">
                            {activeFilter === "all" ? "아직 찜한 행사가 없어요" : "해당하는 행사가 없어요"}
                        </p>
                        <Link
                            href="/explore"
                            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
                        >
                            행사 둘러보기
                        </Link>
                    </div>
                )}
            </div>
            </>
            )}

            {/* ===== 내 크루 탭 ===== */}
            {activeSubTab === "crew" && (
            <div className="px-4 py-6 space-y-4">
                {myCrews.length > 0 ? (
                    <>
                        {/* 크루 목록 */}
                        {myCrews.map((crew) => {
                            const stats = getCrewStats(crew.id);
                            const activities = getCrewActivities(crew.id).slice(0, 3);

                            return (
                                <Link
                                    key={crew.id}
                                    href={`/crew/${crew.id}`}
                                    className="block rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    {/* 크루 헤더 */}
                                    <div className="p-4 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-3xl flex-shrink-0">
                                                {crew.logoEmoji || "👥"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold">{crew.name}</h3>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    <span>{crew.region}</span>
                                                    <span>·</span>
                                                    <span>{CREW_GENRE_LABELS[crew.genre]}</span>
                                                    <span>·</span>
                                                    <span>{stats.memberCount}명</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 최근 활동 */}
                                    {activities.length > 0 && (
                                        <div className="px-4 pb-4">
                                            <p className="text-xs text-muted-foreground mb-2">최근 활동</p>
                                            <div className="space-y-1.5">
                                                {activities.map((activity) => (
                                                    <div key={activity.id} className="flex items-center gap-2 text-xs">
                                                        <span className="text-muted-foreground">
                                                            {activity.type === "wishlist" && "⭐"}
                                                            {activity.type === "attended" && "✅"}
                                                            {activity.type === "review" && "✍️"}
                                                            {activity.type === "join" && "👋"}
                                                            {activity.type === "leave" && "👋"}
                                                        </span>
                                                        <span className="font-medium">{activity.userNickname}</span>
                                                        <span className="text-muted-foreground">
                                                            {activity.type === "wishlist" && "님이 찜"}
                                                            {activity.type === "attended" && "님이 다녀옴"}
                                                            {activity.type === "review" && "님이 후기 작성"}
                                                            {activity.type === "join" && "님이 가입"}
                                                            {activity.type === "leave" && "님이 탈퇴"}
                                                        </span>
                                                        {activity.eventTitle && (
                                                            <span className="text-primary truncate">
                                                                {activity.eventTitle}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 통계 */}
                                    <div className="flex border-t divide-x">
                                        <div className="flex-1 py-2.5 text-center">
                                            <p className="text-lg font-bold text-primary">{stats.memberCount}</p>
                                            <p className="text-[10px] text-muted-foreground">멤버</p>
                                        </div>
                                        <div className="flex-1 py-2.5 text-center">
                                            <p className="text-lg font-bold text-primary">{stats.eventCount}</p>
                                            <p className="text-[10px] text-muted-foreground">행사</p>
                                        </div>
                                        <div className="flex-1 py-2.5 text-center">
                                            <p className="text-lg font-bold text-primary">{stats.totalAttendance}</p>
                                            <p className="text-[10px] text-muted-foreground">관람</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </>
                ) : (
                    <div className="text-center py-12">
                        <UsersRound className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-muted-foreground mb-2">
                            아직 가입한 크루가 없어요
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                            함께 공연 다닐 크루를 찾아보세요!
                        </p>
                    </div>
                )}

                {/* 크루 찾기/만들기 CTA */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                    <Link
                        href="/community?category=crew"
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
                    >
                        <UsersRound className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">크루 찾기</span>
                    </Link>
                    <Link
                        href="/crew/new"
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                        <Plus className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium text-primary">크루 만들기</span>
                    </Link>
                </div>
            </div>
            )}

            {/* ===== 공연로그 탭 ===== */}
            {activeSubTab === "gonglog" && (
            <div className="px-4 py-6 space-y-6">
                {/* 연도 선택 */}
                {availableYears.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedYear(y => Math.max(y - 1, Math.min(...availableYears)))}
                            disabled={selectedYear <= Math.min(...availableYears)}
                            className="p-1 rounded hover:bg-accent disabled:opacity-30"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-lg font-bold min-w-[80px] text-center">{selectedYear}년</span>
                        <button
                            onClick={() => setSelectedYear(y => Math.min(y + 1, Math.max(...availableYears)))}
                            disabled={selectedYear >= Math.max(...availableYears)}
                            className="p-1 rounded hover:bg-accent disabled:opacity-30"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* 통계 요약 카드 */}
                <div className="grid grid-cols-2 gap-3">
                    {/* 총 관람 횟수 */}
                    <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy className="h-5 w-5 text-primary" />
                            <span className="text-sm text-muted-foreground">올해 관람</span>
                        </div>
                        <p className="text-3xl font-bold text-primary">{yearAttendedCount}회</p>
                        <p className="text-xs text-muted-foreground mt-1">총 {totalAttendedCount}회</p>
                    </div>

                    {/* 최다 장르 */}
                    <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Music className="h-5 w-5 text-purple-500" />
                            <span className="text-sm text-muted-foreground">최다 장르</span>
                        </div>
                        <p className="text-xl font-bold text-purple-600">
                            {genreStats[0]?.label || "-"}
                        </p>
                        {genreStats[0] && (
                            <p className="text-xs text-muted-foreground mt-1">{genreStats[0].count}회 ({genreStats[0].percentage}%)</p>
                        )}
                    </div>

                    {/* 지역 */}
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPinned className="h-5 w-5 text-emerald-500" />
                            <span className="text-sm text-muted-foreground">방문 지역</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-600">
                            {regionStats.length}곳
                        </p>
                        {regionStats[0] && (
                            <p className="text-xs text-muted-foreground mt-1">최다: {regionStats[0].region} ({regionStats[0].count}회)</p>
                        )}
                    </div>

                    {/* 아티스트 */}
                    <div className="rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-orange-500" />
                            <span className="text-sm text-muted-foreground">만난 아티스트</span>
                        </div>
                        <p className="text-xl font-bold text-orange-600">
                            {artistStats.length}팀
                        </p>
                        {artistStats[0] && (
                            <p className="text-xs text-muted-foreground mt-1">최다: {artistStats[0].name} ({artistStats[0].count}회)</p>
                        )}
                    </div>
                </div>

                {/* 획득한 배지 */}
                <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            획득한 배지
                            <span className="text-xs font-normal text-muted-foreground">
                                ({earnedBadges.length}/{BADGE_DEFINITIONS.length})
                            </span>
                        </h3>
                        <button
                            onClick={() => setShowBadgeInfo(true)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <HelpCircle className="h-3.5 w-3.5" />
                            배지란?
                        </button>
                    </div>
                    {earnedBadges.length > 0 ? (
                        <div className="space-y-2">
                            {earnedBadges.map(earned => {
                                const badge = BADGE_DEFINITIONS.find(b => b.id === earned.badgeId);
                                if (!badge) return null;
                                const rarityConfig = BADGE_RARITY_CONFIG[badge.rarity];
                                const earnedDate = new Intl.DateTimeFormat("ko-KR", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                }).format(new Date(earned.earnedAt));
                                return (
                                    <div
                                        key={badge.id}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg",
                                            rarityConfig.bgColor
                                        )}
                                    >
                                        <span className="text-3xl">{badge.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn("font-bold text-sm", rarityConfig.color)}>
                                                    {badge.name}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded",
                                                    rarityConfig.color,
                                                    "bg-white/50"
                                                )}>
                                                    {BADGE_RARITY_CONFIG[badge.rarity].label}
                                                </span>
                                            </div>
                                            {/* 배지 조건 설명 */}
                                            <p className="text-xs text-foreground/70 mt-1">
                                                {badge.description}
                                            </p>
                                            {/* 획득 정보 */}
                                            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1 flex-wrap">
                                                <span>{earnedDate} 획득</span>
                                                {earned.triggerEventTitle && (
                                                    <>
                                                        <span className="text-muted-foreground/50">·</span>
                                                        <span className="font-medium text-foreground/60">{earned.triggerEventTitle}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            아직 획득한 배지가 없어요. 공연에 다녀오면 배지를 획득할 수 있어요!
                        </p>
                    )}

                    {/* 다음 배지 미리보기 */}
                    {earnedBadges.length < BADGE_DEFINITIONS.length && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-muted-foreground mb-2">다음 배지까지</p>
                            <div className="space-y-2">
                                {BADGE_DEFINITIONS
                                    .filter(b => !hasBadge(b.id))
                                    .slice(0, 3)
                                    .map(badge => {
                                        const progress = getBadgeProgress(badge.id);
                                        if (!progress) return null;
                                        const progressPercent = (progress.current / progress.max) * 100;
                                        return (
                                            <div key={badge.id} className="flex items-center gap-2">
                                                <span className="text-lg">{badge.icon}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium">{badge.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {progress.current}/{progress.max}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all"
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 월별 통계 차트 */}
                <div className="rounded-xl border bg-card p-4">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        월별 관람 현황
                    </h3>
                    <div className="flex items-end justify-between h-24 gap-1">
                        {monthlyStats.map((count, i) => {
                            const maxCount = Math.max(...monthlyStats, 1);
                            const height = (count / maxCount) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                        className={cn(
                                            "w-full rounded-t transition-all",
                                            count > 0 ? "bg-primary" : "bg-muted"
                                        )}
                                        style={{ height: `${Math.max(height, 4)}%` }}
                                    />
                                    <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 장르별 분포 */}
                {genreStats.length > 0 && (
                    <div className="rounded-xl border bg-card p-4">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            장르별 분포
                        </h3>
                        <div className="space-y-2">
                            {genreStats.map((stat, i) => (
                                <div key={stat.type} className="flex items-center gap-2">
                                    <span className="text-sm w-16">{stat.label}</span>
                                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                i === 0 ? "bg-purple-500" : "bg-purple-300"
                                            )}
                                            style={{ width: `${stat.percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-12 text-right">{stat.count}회</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 지역별 분포 */}
                {regionStats.length > 0 && (
                    <div className="rounded-xl border bg-card p-4">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <MapPinned className="h-4 w-4" />
                            지역별 분포
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {regionStats.map((stat, i) => (
                                <span
                                    key={stat.region}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-sm",
                                        i === 0
                                            ? "bg-emerald-100 text-emerald-700 font-medium"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {stat.region} ({stat.count})
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top 아티스트 */}
                {artistStats.length > 0 && (
                    <div className="rounded-xl border bg-card p-4">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            자주 만난 아티스트 Top {Math.min(artistStats.length, 5)}
                        </h3>
                        <div className="space-y-2">
                            {artistStats.slice(0, 5).map((artist, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                        i === 0 ? "bg-yellow-100 text-yellow-700" :
                                        i === 1 ? "bg-gray-100 text-gray-600" :
                                        i === 2 ? "bg-orange-100 text-orange-700" :
                                        "bg-muted text-muted-foreground"
                                    )}>
                                        {i + 1}
                                    </span>
                                    <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                                        {artist.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={artist.image} alt={artist.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                                                {artist.name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <span className="flex-1 text-sm">{artist.name}</span>
                                    <span className="text-xs text-muted-foreground">{artist.count}회</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 다녀온 행사 타임라인 */}
                <div className="pt-4 border-t">
                    <h3 className="text-sm font-bold mb-4">{selectedYear}년 다녀온 행사</h3>
                    {selectedYearEvents.length > 0 ? (
                        <div className="space-y-3">
                            {selectedYearEvents
                                .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
                                .map((event) => (
                                    <GonglogCard key={event.id} event={event} />
                                ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">
                                {selectedYear}년에 다녀온 행사가 없어요
                            </p>
                        </div>
                    )}
                </div>

                {/* 빈 상태 (전체 데이터 없음) */}
                {totalAttendedCount === 0 && (
                    <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                        <p className="text-muted-foreground mb-4">
                            아직 다녀온 행사가 없어요
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                            행사에 다녀온 후 &quot;다녀옴&quot;을 체크하면<br />
                            나만의 공연로그가 만들어져요!
                        </p>
                        <Link
                            href="/explore"
                            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
                        >
                            행사 둘러보기
                        </Link>
                    </div>
                )}
            </div>
            )}

            {/* 배지란? 모달 */}
            {showBadgeInfo && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    {/* 배경 오버레이 */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowBadgeInfo(false)}
                    />
                    {/* 모달 컨텐츠 */}
                    <div className="relative w-full max-w-lg max-h-[85vh] bg-background rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95">
                        {/* 헤더 */}
                        <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                배지란?
                            </h2>
                            <button
                                onClick={() => setShowBadgeInfo(false)}
                                className="p-1 rounded-full hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* 컨텐츠 */}
                        <div className="overflow-y-auto max-h-[calc(85vh-56px)] p-4 space-y-6">
                            {/* 설명 */}
                            <div className="bg-primary/5 rounded-lg p-4">
                                <p className="text-sm text-foreground/80">
                                    배지는 공연 관람 활동을 통해 획득할 수 있는 특별한 보상이에요.
                                    다양한 공연에 다녀오고, 글을 작성하면 배지를 모을 수 있어요!
                                </p>
                            </div>

                            {/* 희귀도 설명 */}
                            <div>
                                <h3 className="text-sm font-bold mb-2">희귀도</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(["common", "rare", "epic", "legendary"] as const).map(rarity => {
                                        const config = BADGE_RARITY_CONFIG[rarity];
                                        return (
                                            <span
                                                key={rarity}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                                    config.bgColor,
                                                    config.color
                                                )}
                                            >
                                                {config.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 카테고리별 배지 목록 */}
                            {(Object.entries(getBadgesByCategory()) as [BadgeCategory, typeof BADGE_DEFINITIONS][]).map(([category, badges]) => (
                                <div key={category}>
                                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                        {category === "attendance" && "🎫"}
                                        {category === "genre" && "🎵"}
                                        {category === "region" && "🗺️"}
                                        {category === "season" && "📅"}
                                        {category === "contribution" && "✨"}
                                        {BADGE_CATEGORY_LABELS[category]} 배지
                                        <span className="text-xs font-normal text-muted-foreground">
                                            ({badges.length}개)
                                        </span>
                                    </h3>
                                    <div className="space-y-2">
                                        {badges.map(badge => {
                                            const isEarned = hasBadge(badge.id);
                                            const rarityConfig = BADGE_RARITY_CONFIG[badge.rarity];
                                            return (
                                                <div
                                                    key={badge.id}
                                                    className={cn(
                                                        "flex items-center gap-3 p-2.5 rounded-lg border",
                                                        isEarned ? rarityConfig.bgColor : "bg-muted/30 opacity-60"
                                                    )}
                                                >
                                                    <span className={cn("text-2xl", !isEarned && "grayscale")}>
                                                        {badge.icon}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "font-medium text-sm",
                                                                isEarned ? rarityConfig.color : "text-muted-foreground"
                                                            )}>
                                                                {badge.name}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded",
                                                                isEarned ? rarityConfig.color : "text-muted-foreground",
                                                                isEarned ? "bg-white/50" : "bg-muted"
                                                            )}>
                                                                {rarityConfig.label}
                                                            </span>
                                                            {isEarned && (
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 fill-green-100" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {badge.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// 공연로그 카드 컴포넌트
function GonglogCard({ event }: { event: TimelineEvent }) {
    return (
        <Link
            href={`/event/${event.id}`}
            className="flex gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
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
                    <div className="h-full w-full flex items-center justify-center text-[8px] text-muted-foreground">
                        Poster
                    </div>
                )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }).format(new Date(event.startAt))}
                </p>
                <h4 className="font-medium text-sm line-clamp-1">{event.title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.venue.name}
                </p>
            </div>

            {/* 배지 */}
            <div className="flex flex-col items-end gap-1">
                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">
                    {
                        event.type === "concert" ? "콘서트" :
                        event.type === "festival" ? "페스티벌" :
                        event.type === "musical" ? "뮤지컬" :
                        event.type === "exhibition" ? "전시" : event.type
                    }
                </span>
                {event.reviewCount > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Video className="h-3 w-3" />
                        {event.reviewCount}
                    </span>
                )}
            </div>
        </Link>
    );
}

// 날짜 포맷 헬퍼
function formatDate(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
    }).format(new Date(date));
}

// D-Day 계산
function getDday(date: Date) {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "D-Day";
    if (days > 0) return `D-${days}`;
    return `D+${Math.abs(days)}`;
}

// 타임라인 카드 컴포넌트
function TimelineCard({
    event,
    status,
}: {
    event: TimelineEvent;
    status: TimelineStatus;
}) {
    const isPastOrLive = status === "past" || status === "live";

    return (
        <Link
            href={`/event/${event.id}`}
            className="block rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
        >
            <div className="flex gap-4">
                {/* 포스터 */}
                <div className="relative h-24 w-18 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
                    {event.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={event.posterUrl}
                            alt={event.title}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                            Poster
                        </div>
                    )}
                    {status === "live" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                    )}
                    {status === "upcoming" && (
                        <div className="absolute top-1 right-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {getDday(event.startAt)}
                        </div>
                    )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                    {/* 배지 */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {event.isWishlist && !event.isAttended && (
                            <span className="flex items-center gap-0.5 text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                                <Star className="h-3 w-3 fill-yellow-400" />
                                찜
                            </span>
                        )}
                        {event.isAttended && (
                            <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                <CheckCircle2 className="h-3 w-3 fill-green-400" />
                                다녀옴
                            </span>
                        )}
                        {status === "live" && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium animate-pulse">
                                LIVE
                            </span>
                        )}
                        {event.status === "POSTPONED" && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                일정 변경
                            </span>
                        )}
                    </div>

                    {/* 제목 */}
                    <h3 className="font-medium text-sm line-clamp-1 mb-1">
                        {event.title}
                    </h3>

                    {/* 일시/장소 */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.startAt)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.venue.name}
                    </p>

                    {/* 내가 남긴 것 */}
                    {event.postCount > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                                <MessageSquare className="h-3 w-3" />
                                {event.postCount}
                            </span>
                            {event.reviewCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                    <Video className="h-3 w-3" />
                                    {event.reviewCount}
                                </span>
                            )}
                        </div>
                    )}

                    {/* 퀵 액션 */}
                    <div className="mt-2 flex gap-2 flex-wrap">
                        {status === "live" && (
                            <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                                허브 보기
                            </span>
                        )}
                        {status === "upcoming" && (
                            <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                                타임테이블
                            </span>
                        )}
                        {status === "past" && (
                            <>
                                <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                                    RECAP
                                </span>
                                {event.reviewCount === 0 && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        리뷰 쓰기
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
