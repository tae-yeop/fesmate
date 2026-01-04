"use client";

import { useMemo } from "react";
import { useWishlist } from "@/lib/wishlist-context";
import { useTicketBook } from "@/lib/ticketbook-context";
import type { Event } from "@/types/event";

/**
 * 장르별 통계
 */
export interface GenreStat {
    genre: string;
    count: number;
    percentage: number;
}

/**
 * 지역별 통계
 */
export interface RegionStat {
    region: string;
    count: number;
    percentage: number;
}

/**
 * 아티스트별 통계
 */
export interface ArtistStat {
    artistId: string;
    artistName: string;
    count: number;
    imageUrl?: string;
}

/**
 * 동행자별 통계
 */
export interface CompanionStat {
    companion: string;
    count: number;
    percentage: number;
}

/**
 * 월별 통계
 */
export interface MonthlyStat {
    month: number; // 1-12
    count: number;
}

/**
 * 공연장별 통계
 */
export interface VenueStat {
    venueId: string;
    venueName: string;
    count: number;
}

/**
 * 연간 통계 전체
 */
export interface YearlyStats {
    year: number;
    totalEvents: number;
    totalArtists: number;

    // 장르 통계
    genreStats: GenreStat[];
    topGenre: GenreStat | null;

    // 지역 통계
    regionStats: RegionStat[];
    topRegion: RegionStat | null;

    // 아티스트 통계
    artistStats: ArtistStat[];
    topArtist: ArtistStat | null;

    // 동행자 통계
    companionStats: CompanionStat[];
    topCompanion: CompanionStat | null;
    mostFrequentCompanion: CompanionStat | null;

    // 월별 통계
    monthlyStats: MonthlyStat[];
    topMonth: MonthlyStat | null;

    // 공연장 통계
    venueStats: VenueStat[];
    topVenue: VenueStat | null;

    // 트렌드
    isMoreThanLastYear: boolean;
    percentageChange: number; // 전년 대비 변화율
}

/**
 * 연도별 다녀온 행사 필터링
 */
function filterEventsByYear(
    events: Event[],
    attendedIds: string[],
    year: number
): Event[] {
    return events.filter((event) => {
        if (!attendedIds.includes(event.id)) return false;
        const eventYear = new Date(event.startAt).getFullYear();
        return eventYear === year;
    });
}

/**
 * 장르 통계 계산 (Event type을 장르로 사용)
 */
function calculateGenreStats(events: Event[]): GenreStat[] {
    const genreCount: Record<string, number> = {};

    events.forEach((event) => {
        // Event type을 장르로 사용 (concert, festival, exhibition, etc.)
        const genre = event.type || "기타";
        genreCount[genre] = (genreCount[genre] || 0) + 1;
    });

    const total = events.length || 1;
    return Object.entries(genreCount)
        .map(([genre, count]) => ({
            genre: formatGenreLabel(genre),
            count,
            percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * 장르 라벨 변환
 */
function formatGenreLabel(type: string): string {
    const labels: Record<string, string> = {
        "concert": "콘서트",
        "festival": "페스티벌",
        "exhibition": "전시",
        "musical": "뮤지컬",
        "theater": "연극",
        "sports": "스포츠",
        "etc": "기타",
    };
    return labels[type] || type;
}

/**
 * 지역 통계 계산 (venue 이름 사용)
 */
function calculateRegionStats(events: Event[]): RegionStat[] {
    const regionCount: Record<string, number> = {};

    events.forEach((event) => {
        // venue 이름을 지역으로 사용
        const region = event.venue?.name || "미정";
        regionCount[region] = (regionCount[region] || 0) + 1;
    });

    const total = events.length || 1;
    return Object.entries(regionCount)
        .map(([region, count]) => ({
            region,
            count,
            percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * 아티스트 통계 계산
 */
function calculateArtistStats(events: Event[]): ArtistStat[] {
    const artistCount: Record<string, { name: string; count: number; imageUrl?: string }> = {};

    events.forEach((event) => {
        if (event.artists) {
            event.artists.forEach((artist) => {
                if (!artistCount[artist.id]) {
                    artistCount[artist.id] = {
                        name: artist.name,
                        count: 0,
                        imageUrl: artist.image,
                    };
                }
                artistCount[artist.id].count += 1;
            });
        }
    });

    return Object.entries(artistCount)
        .map(([artistId, data]) => ({
            artistId,
            artistName: data.name,
            count: data.count,
            imageUrl: data.imageUrl,
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * 동행자 통계 계산 (티켓북 기반)
 */
function calculateCompanionStats(
    events: Event[],
    ticketCompanions: Map<string, string>
): CompanionStat[] {
    const companionCount: Record<string, number> = {};

    events.forEach((event) => {
        const companion = ticketCompanions.get(event.id) || "혼자";
        companionCount[companion] = (companionCount[companion] || 0) + 1;
    });

    const total = events.length || 1;
    return Object.entries(companionCount)
        .map(([companion, count]) => ({
            companion,
            count,
            percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * 월별 통계 계산
 */
function calculateMonthlyStats(events: Event[]): MonthlyStat[] {
    const monthlyCount: number[] = Array(12).fill(0);

    events.forEach((event) => {
        const month = new Date(event.startAt).getMonth(); // 0-11
        monthlyCount[month] += 1;
    });

    return monthlyCount.map((count, index) => ({
        month: index + 1, // 1-12
        count,
    }));
}

/**
 * 공연장 통계 계산
 */
function calculateVenueStats(events: Event[]): VenueStat[] {
    const venueCount: Record<string, { name: string; count: number }> = {};

    events.forEach((event) => {
        if (event.venue) {
            const venueId = event.venue.id;
            if (!venueCount[venueId]) {
                venueCount[venueId] = {
                    name: event.venue.name,
                    count: 0,
                };
            }
            venueCount[venueId].count += 1;
        }
    });

    return Object.entries(venueCount)
        .map(([venueId, data]) => ({
            venueId,
            venueName: data.name,
            count: data.count,
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * 연간 통계 계산 훅
 * @param events - 이벤트 배열 (순환 참조 방지를 위해 외부에서 주입)
 * @param year - 통계 연도 (기본값: 현재 연도)
 */
export function useYearlyStats(events: Event[], year: number = new Date().getFullYear()): YearlyStats {
    const { attended } = useWishlist();
    const { sortedTickets } = useTicketBook();

    return useMemo(() => {
        // Set을 배열로 변환
        const attendedArray = Array.from(attended);

        // 해당 연도의 다녀온 행사 필터링
        const yearEvents = filterEventsByYear(events, attendedArray, year);
        const lastYearEvents = filterEventsByYear(events, attendedArray, year - 1);

        // 티켓북에서 동행자 정보 추출
        const ticketCompanions = new Map<string, string>();
        sortedTickets.forEach((ticket) => {
            if (ticket.companion) {
                ticketCompanions.set(ticket.eventId, ticket.companion);
            }
        });

        // 각종 통계 계산
        const genreStats = calculateGenreStats(yearEvents);
        const regionStats = calculateRegionStats(yearEvents);
        const artistStats = calculateArtistStats(yearEvents);
        const companionStats = calculateCompanionStats(yearEvents, ticketCompanions);
        const monthlyStats = calculateMonthlyStats(yearEvents);
        const venueStats = calculateVenueStats(yearEvents);

        // 전년 대비 변화
        const thisYearCount = yearEvents.length;
        const lastYearCount = lastYearEvents.length;
        const percentageChange = lastYearCount > 0
            ? Math.round(((thisYearCount - lastYearCount) / lastYearCount) * 100)
            : thisYearCount > 0 ? 100 : 0;

        // 유니크 아티스트 수
        const uniqueArtistIds = new Set<string>();
        yearEvents.forEach((event) => {
            event.artists?.forEach((artist) => {
                uniqueArtistIds.add(artist.id);
            });
        });

        // Top 월 찾기
        const topMonthData = monthlyStats.reduce(
            (max, stat) => (stat.count > max.count ? stat : max),
            { month: 0, count: 0 }
        );

        return {
            year,
            totalEvents: thisYearCount,
            totalArtists: uniqueArtistIds.size,

            genreStats,
            topGenre: genreStats[0] || null,

            regionStats,
            topRegion: regionStats[0] || null,

            artistStats,
            topArtist: artistStats[0] || null,

            companionStats,
            topCompanion: companionStats[0] || null,
            mostFrequentCompanion: companionStats.find((c) => c.companion !== "혼자") || null,

            monthlyStats,
            topMonth: topMonthData.count > 0 ? topMonthData : null,

            venueStats,
            topVenue: venueStats[0] || null,

            isMoreThanLastYear: thisYearCount > lastYearCount,
            percentageChange,
        };
    }, [attended, sortedTickets, events, year]);
}

/**
 * 여러 연도의 통계 조회
 * @param events - 이벤트 배열 (순환 참조 방지를 위해 외부에서 주입)
 * @param years - 통계 연도 배열
 */
export function useMultiYearStats(events: Event[], years: number[]): YearlyStats[] {
    const { attended } = useWishlist();
    const { sortedTickets } = useTicketBook();

    return useMemo(() => {
        // Set을 배열로 변환
        const attendedArray = Array.from(attended);

        return years.map((year) => {
            const yearEvents = filterEventsByYear(events, attendedArray, year);
            const lastYearEvents = filterEventsByYear(events, attendedArray, year - 1);

            const ticketCompanions = new Map<string, string>();
            sortedTickets.forEach((ticket) => {
                if (ticket.companion) {
                    ticketCompanions.set(ticket.eventId, ticket.companion);
                }
            });

            const genreStats = calculateGenreStats(yearEvents);
            const regionStats = calculateRegionStats(yearEvents);
            const artistStats = calculateArtistStats(yearEvents);
            const companionStats = calculateCompanionStats(yearEvents, ticketCompanions);
            const monthlyStats = calculateMonthlyStats(yearEvents);
            const venueStats = calculateVenueStats(yearEvents);

            const thisYearCount = yearEvents.length;
            const lastYearCount = lastYearEvents.length;
            const percentageChange = lastYearCount > 0
                ? Math.round(((thisYearCount - lastYearCount) / lastYearCount) * 100)
                : thisYearCount > 0 ? 100 : 0;

            const uniqueArtistIds = new Set<string>();
            yearEvents.forEach((event) => {
                event.artists?.forEach((artist) => {
                    uniqueArtistIds.add(artist.id);
                });
            });

            const topMonthData = monthlyStats.reduce(
                (max, stat) => (stat.count > max.count ? stat : max),
                { month: 0, count: 0 }
            );

            return {
                year,
                totalEvents: thisYearCount,
                totalArtists: uniqueArtistIds.size,
                genreStats,
                topGenre: genreStats[0] || null,
                regionStats,
                topRegion: regionStats[0] || null,
                artistStats,
                topArtist: artistStats[0] || null,
                companionStats,
                topCompanion: companionStats[0] || null,
                mostFrequentCompanion: companionStats.find((c) => c.companion !== "혼자") || null,
                monthlyStats,
                topMonth: topMonthData.count > 0 ? topMonthData : null,
                venueStats,
                topVenue: venueStats[0] || null,
                isMoreThanLastYear: thisYearCount > lastYearCount,
                percentageChange,
            };
        });
    }, [attended, sortedTickets, events, years]);
}

/**
 * 월 이름 반환
 */
export function getMonthName(month: number): string {
    const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
    return monthNames[month - 1] || "";
}
