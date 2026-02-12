"use client";

import { useMemo } from "react";
import { useCrew } from "@/lib/crew-context";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    TrendingUp,
    Calendar,
    Music,
    MapPin,
    Users,
    Clock,
    Star,
} from "lucide-react";

interface CrewStatsProps {
    crewId: string;
}

interface GenreCount {
    genre: string;
    count: number;
    percentage: number;
}

interface VenueCount {
    venue: string;
    count: number;
}

interface MonthlyCount {
    month: string;
    count: number;
}

export function CrewStats({ crewId }: CrewStatsProps) {
    const { getCrewEvents, getCrewMembers, getCrewStats } = useCrew();

    const crewEvents = getCrewEvents(crewId);
    const members = getCrewMembers(crewId);
    const basicStats = getCrewStats(crewId);

    const stats = useMemo(() => {
        const genreCounts: Record<string, number> = {};
        const venueCounts: Record<string, number> = {};
        const monthlyCounts: Record<string, number> = {};
        const memberActivityCounts: Record<string, number> = {};
        let totalAttendance = 0;

        crewEvents.forEach((ce) => {
            const event = MOCK_EVENTS.find((e) => e.id === ce.eventId);
            if (!event) return;

            const eventType = event.type || "concert";
            const typeLabels: Record<string, string> = {
                concert: "콘서트",
                festival: "페스티벌",
                musical: "뮤지컬",
                exhibition: "전시",
            };
            const genre = typeLabels[eventType] || "기타";
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;

            const venue = event.venue?.name || "미정";
            venueCounts[venue] = (venueCounts[venue] || 0) + 1;

            const month = new Date(event.startAt).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "short",
            });
            monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;

            memberActivityCounts[ce.userId] = (memberActivityCounts[ce.userId] || 0) + 1;

            if (ce.source === "attended") {
                totalAttendance++;
            }
        });

        const totalEvents = crewEvents.length;

        const genreStats: GenreCount[] = Object.entries(genreCounts)
            .map(([genre, count]) => ({
                genre,
                count,
                percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const venueStats: VenueCount[] = Object.entries(venueCounts)
            .map(([venue, count]) => ({ venue, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const monthlyStats: MonthlyCount[] = Object.entries(monthlyCounts)
            .map(([month, count]) => ({ month, count }))
            .slice(-6);

        const avgEventsPerMember = members.length > 0
            ? Math.round((totalEvents / members.length) * 10) / 10
            : 0;

        const mostActiveMembers = Object.entries(memberActivityCounts)
            .map(([userId, count]) => {
                const member = members.find((m) => m.userId === userId);
                return {
                    userId,
                    nickname: member?.userNickname || "Unknown",
                    count,
                };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        return {
            genreStats,
            venueStats,
            monthlyStats,
            avgEventsPerMember,
            mostActiveMembers,
            totalAttendance,
        };
    }, [crewEvents, members]);

    const maxMonthlyCount = Math.max(...stats.monthlyStats.map((m) => m.count), 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <h3 className="font-bold text-lg">크루 통계</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                    icon={Users}
                    label="멤버"
                    value={basicStats.memberCount}
                    unit="명"
                />
                <StatCard
                    icon={Calendar}
                    label="총 행사"
                    value={basicStats.eventCount}
                    unit="개"
                />
                <StatCard
                    icon={Star}
                    label="총 관람"
                    value={basicStats.totalAttendance}
                    unit="회"
                />
                <StatCard
                    icon={TrendingUp}
                    label="멤버당 평균"
                    value={stats.avgEventsPerMember}
                    unit="개"
                />
            </div>

            {stats.monthlyStats.length > 0 && (
                <div className="p-4 bg-card rounded-xl border">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        월별 활동
                    </h4>
                    <div className="flex items-end gap-2 h-32">
                        {stats.monthlyStats.map((m) => (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full bg-primary/20 rounded-t transition-all relative group"
                                    style={{
                                        height: `${(m.count / maxMonthlyCount) * 100}%`,
                                        minHeight: m.count > 0 ? "8px" : "0",
                                    }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap">
                                        {m.count}개
                                    </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {m.month.replace(/\d{4}년\s?/, "")}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stats.genreStats.length > 0 && (
                <div className="p-4 bg-card rounded-xl border">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        장르 분포
                    </h4>
                    <div className="space-y-2">
                        {stats.genreStats.map((g) => (
                            <div key={g.genre} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span>{g.genre}</span>
                                    <span className="text-muted-foreground">
                                        {g.count}개 ({g.percentage}%)
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{ width: `${g.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stats.venueStats.length > 0 && (
                <div className="p-4 bg-card rounded-xl border">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        자주 가는 공연장 TOP 5
                    </h4>
                    <div className="space-y-2">
                        {stats.venueStats.map((v, i) => (
                            <div
                                key={v.venue}
                                className="flex items-center gap-3 text-sm"
                            >
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                                        i === 1 ? "bg-gray-100 text-gray-600" :
                                            i === 2 ? "bg-orange-100 text-orange-700" :
                                                "bg-muted text-muted-foreground"
                                )}>
                                    {i + 1}
                                </span>
                                <span className="flex-1 truncate">{v.venue}</span>
                                <span className="text-muted-foreground">{v.count}회</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stats.mostActiveMembers.length > 0 && (
                <div className="p-4 bg-card rounded-xl border">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        가장 활발한 멤버
                    </h4>
                    <div className="space-y-2">
                        {stats.mostActiveMembers.map((m, i) => (
                            <div
                                key={m.userId}
                                className="flex items-center gap-3 text-sm"
                            >
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                                        i === 1 ? "bg-gray-100 text-gray-600" :
                                            "bg-orange-100 text-orange-700"
                                )}>
                                    {i + 1}
                                </span>
                                <span className="flex-1">{m.nickname}</span>
                                <span className="text-muted-foreground">{m.count}개</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    unit,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    unit: string;
}) {
    return (
        <div className="p-3 bg-card rounded-xl border text-center">
            <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-xl font-bold">
                {value}
                <span className="text-sm font-normal text-muted-foreground ml-0.5">
                    {unit}
                </span>
            </div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    );
}
