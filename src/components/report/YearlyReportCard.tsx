"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { YearlyStats } from "@/lib/hooks/use-yearly-stats";
import { getMonthName } from "@/lib/hooks/use-yearly-stats";

/**
 * 리포트 카드 타입 (슬라이드 종류)
 */
export type ReportCardType =
    | "total" // 총 관람 횟수
    | "genre" // Top 장르
    | "artist" // Top 아티스트
    | "monthly" // 월별 히트맵
    | "companion" // 동행자 통계
    | "venue"; // 공연장 통계

interface YearlyReportCardProps {
    type: ReportCardType;
    stats: YearlyStats;
    className?: string;
}

/**
 * Spotify Wrapped 스타일 연간 리포트 카드
 * - 1080x1080 (1:1 비율)
 * - 각 타입별 다른 디자인
 */
export const YearlyReportCard = forwardRef<HTMLDivElement, YearlyReportCardProps>(
    function YearlyReportCard({ type, stats, className }, ref) {
        // 카드 타입별 배경 그라데이션
        const gradients: Record<ReportCardType, string> = {
            total: "from-purple-600 via-pink-600 to-red-500",
            genre: "from-blue-600 via-cyan-500 to-teal-400",
            artist: "from-orange-500 via-pink-500 to-purple-600",
            monthly: "from-green-500 via-emerald-500 to-teal-500",
            companion: "from-yellow-500 via-orange-500 to-red-500",
            venue: "from-indigo-600 via-purple-600 to-pink-500",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "relative flex flex-col items-center justify-center overflow-hidden",
                    `bg-gradient-to-br ${gradients[type]}`,
                    className
                )}
                style={{
                    width: 1080,
                    height: 1080,
                    fontFamily: "'Noto Sans KR', sans-serif",
                }}
            >
                {/* 배경 장식 */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
                    <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
                </div>

                {/* 콘텐츠 */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-16 text-white">
                    {/* 상단 로고 */}
                    <div className="absolute top-12 left-1/2 -translate-x-1/2">
                        <span className="text-3xl font-bold opacity-80">FesMate</span>
                    </div>

                    {/* 연도 */}
                    <div className="absolute top-24 left-1/2 -translate-x-1/2">
                        <span className="text-xl opacity-60">{stats.year}</span>
                    </div>

                    {/* 타입별 콘텐츠 */}
                    {type === "total" && <TotalCard stats={stats} />}
                    {type === "genre" && <GenreCard stats={stats} />}
                    {type === "artist" && <ArtistCard stats={stats} />}
                    {type === "monthly" && <MonthlyCard stats={stats} />}
                    {type === "companion" && <CompanionCard stats={stats} />}
                    {type === "venue" && <VenueCard stats={stats} />}

                    {/* 하단 워터마크 */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                        <span className="text-lg opacity-50">fesmate.app</span>
                    </div>
                </div>
            </div>
        );
    }
);

/**
 * 총 관람 횟수 카드
 */
function TotalCard({ stats }: { stats: YearlyStats }) {
    return (
        <div className="text-center space-y-8">
            <h2 className="text-4xl font-medium">올해 당신은</h2>
            <div className="space-y-4">
                <span
                    className="block text-[200px] font-black leading-none"
                    style={{ textShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
                >
                    {stats.totalEvents}
                </span>
                <p className="text-4xl font-medium">개의 공연을 다녀왔어요</p>
            </div>
            {stats.percentageChange !== 0 && (
                <p className="text-2xl opacity-70">
                    {stats.isMoreThanLastYear
                        ? `작년보다 ${stats.percentageChange}% 더!`
                        : `작년보다 ${Math.abs(stats.percentageChange)}% 적게`}
                </p>
            )}
        </div>
    );
}

/**
 * Top 장르 카드
 */
function GenreCard({ stats }: { stats: YearlyStats }) {
    const topGenres = stats.genreStats.slice(0, 3);

    return (
        <div className="text-center space-y-12">
            <h2 className="text-4xl font-medium">당신의 최애 장르는</h2>

            {stats.topGenre && (
                <div className="space-y-6">
                    <span
                        className="block text-8xl font-black"
                        style={{ textShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
                    >
                        {stats.topGenre.genre}
                    </span>
                    <p className="text-3xl opacity-70">
                        전체의 {stats.topGenre.percentage}%
                    </p>
                </div>
            )}

            {topGenres.length > 1 && (
                <div className="flex justify-center gap-8 pt-8">
                    {topGenres.slice(1).map((genre, i) => (
                        <div key={genre.genre} className="text-center">
                            <span className="text-2xl opacity-70">#{i + 2}</span>
                            <p className="text-3xl font-bold mt-2">{genre.genre}</p>
                            <p className="text-xl opacity-60">{genre.percentage}%</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Top 아티스트 카드
 */
function ArtistCard({ stats }: { stats: YearlyStats }) {
    const topArtists = stats.artistStats.slice(0, 3);

    return (
        <div className="text-center space-y-12">
            <h2 className="text-4xl font-medium">당신이 가장 많이 본 아티스트</h2>

            {stats.topArtist && (
                <div className="space-y-6">
                    {stats.topArtist.imageUrl && (
                        <div className="mx-auto w-48 h-48 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={stats.topArtist.imageUrl}
                                alt={stats.topArtist.artistName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <span
                        className="block text-6xl font-black"
                        style={{ textShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
                    >
                        {stats.topArtist.artistName}
                    </span>
                    <p className="text-3xl opacity-70">
                        {stats.topArtist.count}회 관람
                    </p>
                </div>
            )}

            {topArtists.length > 1 && (
                <div className="flex justify-center gap-12 pt-8">
                    {topArtists.slice(1).map((artist, i) => (
                        <div key={artist.artistId} className="text-center">
                            <span className="text-2xl opacity-70">#{i + 2}</span>
                            <p className="text-2xl font-bold mt-2">{artist.artistName}</p>
                            <p className="text-xl opacity-60">{artist.count}회</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * 월별 히트맵 카드
 */
function MonthlyCard({ stats }: { stats: YearlyStats }) {
    const maxCount = Math.max(...stats.monthlyStats.map((s) => s.count), 1);

    return (
        <div className="text-center space-y-12">
            <h2 className="text-4xl font-medium">월별 공연 관람</h2>

            {/* 히트맵 */}
            <div className="grid grid-cols-4 gap-4 px-8">
                {stats.monthlyStats.map((stat) => {
                    const opacity = stat.count > 0 ? 0.3 + (stat.count / maxCount) * 0.7 : 0.1;
                    const isTop = stats.topMonth?.month === stat.month;

                    return (
                        <div
                            key={stat.month}
                            className={cn(
                                "relative rounded-2xl p-6 transition-all",
                                isTop ? "ring-4 ring-white/50" : ""
                            )}
                            style={{ backgroundColor: `rgba(255,255,255,${opacity})` }}
                        >
                            <p className="text-xl opacity-70">{getMonthName(stat.month)}</p>
                            <p className="text-4xl font-bold mt-2">{stat.count}</p>
                        </div>
                    );
                })}
            </div>

            {stats.topMonth && (
                <p className="text-3xl">
                    <span className="font-bold">{getMonthName(stats.topMonth.month)}</span>
                    에 가장 활발했어요!
                </p>
            )}
        </div>
    );
}

/**
 * 동행자 통계 카드
 */
function CompanionCard({ stats }: { stats: YearlyStats }) {
    const topCompanions = stats.companionStats.slice(0, 4);

    return (
        <div className="text-center space-y-12">
            <h2 className="text-4xl font-medium">함께한 사람들</h2>

            {stats.mostFrequentCompanion ? (
                <div className="space-y-6">
                    <p className="text-2xl opacity-70">가장 많이 함께한 사람</p>
                    <span
                        className="block text-7xl font-black"
                        style={{ textShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
                    >
                        {stats.mostFrequentCompanion.companion}
                    </span>
                    <p className="text-3xl opacity-70">
                        {stats.mostFrequentCompanion.count}회 함께
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    <span className="text-6xl">🎧</span>
                    <p className="text-4xl font-bold">솔로 관람러</p>
                    <p className="text-2xl opacity-70">나만의 시간을 즐겼어요</p>
                </div>
            )}

            {topCompanions.length > 1 && stats.mostFrequentCompanion && (
                <div className="flex flex-wrap justify-center gap-6 pt-8">
                    {topCompanions
                        .filter((c) => c.companion !== stats.mostFrequentCompanion?.companion)
                        .slice(0, 3)
                        .map((companion) => (
                            <div
                                key={companion.companion}
                                className="bg-white/20 rounded-xl px-6 py-3"
                            >
                                <span className="text-2xl">{companion.companion}</span>
                                <span className="text-xl opacity-70 ml-2">
                                    ({companion.count}회)
                                </span>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}

/**
 * 공연장 통계 카드
 */
function VenueCard({ stats }: { stats: YearlyStats }) {
    const topVenues = stats.venueStats.slice(0, 3);

    return (
        <div className="text-center space-y-12">
            <h2 className="text-4xl font-medium">가장 많이 찾은 공연장</h2>

            {stats.topVenue ? (
                <div className="space-y-6">
                    <span className="text-8xl">🏟️</span>
                    <span
                        className="block text-5xl font-black leading-tight"
                        style={{ textShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
                    >
                        {stats.topVenue.venueName}
                    </span>
                    <p className="text-3xl opacity-70">
                        {stats.topVenue.count}회 방문
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    <span className="text-6xl">🗺️</span>
                    <p className="text-4xl font-bold">다양한 곳에서</p>
                    <p className="text-2xl opacity-70">여러 공연장을 탐험했어요</p>
                </div>
            )}

            {topVenues.length > 1 && (
                <div className="space-y-4 pt-8">
                    {topVenues.slice(1).map((venue, i) => (
                        <div
                            key={venue.venueId}
                            className="bg-white/20 rounded-xl px-8 py-4 inline-block mx-2"
                        >
                            <span className="text-xl opacity-70">#{i + 2}</span>
                            <span className="text-2xl font-bold ml-4">{venue.venueName}</span>
                            <span className="text-xl opacity-60 ml-2">
                                ({venue.count}회)
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
