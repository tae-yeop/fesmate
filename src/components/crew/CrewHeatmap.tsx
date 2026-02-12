"use client";

import { useMemo, useState } from "react";
import { useCrew } from "@/lib/crew-context";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Calendar, Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface CrewHeatmapProps {
    crewId: string;
}

interface HeatmapCell {
    date: string;
    stageId?: string;
    stageName?: string;
    count: number;
    memberNames: string[];
    eventTitle?: string;
}

/**
 * 크루 히트맵 뷰
 * - 일별/스테이지별 참여 인원 시각화
 * - 셀 클릭 시 상세 모달
 */
export function CrewHeatmap({ crewId }: CrewHeatmapProps) {
    const { getCrewEvents, getCrewMembers } = useCrew();
    const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
    const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
    const [currentDate, setCurrentDate] = useState(new Date());

    const crewEvents = getCrewEvents(crewId);
    const members = getCrewMembers(crewId);

    // 히트맵 데이터 계산
    const heatmapData = useMemo(() => {
        const data: Map<string, HeatmapCell> = new Map();

        crewEvents.forEach((ce) => {
            const event = MOCK_EVENTS.find((e) => e.id === ce.eventId);
            if (!event) return;

            const dateStr = new Date(event.startAt).toISOString().split("T")[0];
            const key = `${dateStr}`;

            const member = members.find((m) => m.userId === ce.userId);
            const memberName = member?.userNickname || "Unknown";

            if (data.has(key)) {
                const existing = data.get(key)!;
                existing.count++;
                if (!existing.memberNames.includes(memberName)) {
                    existing.memberNames.push(memberName);
                }
            } else {
                data.set(key, {
                    date: dateStr,
                    count: 1,
                    memberNames: [memberName],
                    eventTitle: event.title,
                });
            }
        });

        return data;
    }, [crewEvents, members]);

    // 주간/월간 날짜 범위 계산
    const dateRange = useMemo(() => {
        const dates: string[] = [];
        const start = new Date(currentDate);

        if (viewMode === "weekly") {
            // 현재 주의 일요일부터 시작
            start.setDate(start.getDate() - start.getDay());
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                dates.push(d.toISOString().split("T")[0]);
            }
        } else {
            // 현재 월의 1일부터
            start.setDate(1);
            const month = start.getMonth();
            while (start.getMonth() === month) {
                dates.push(start.toISOString().split("T")[0]);
                start.setDate(start.getDate() + 1);
            }
        }

        return dates;
    }, [currentDate, viewMode]);

    // 이전/다음 기간
    const navigate = (direction: "prev" | "next") => {
        const newDate = new Date(currentDate);
        if (viewMode === "weekly") {
            newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
        } else {
            newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    // 색상 강도 계산
    const getIntensityClass = (count: number): string => {
        if (count === 0) return "bg-muted";
        if (count === 1) return "bg-green-100 dark:bg-green-900/30";
        if (count <= 3) return "bg-green-300 dark:bg-green-700/50";
        if (count <= 5) return "bg-green-500 dark:bg-green-600/70";
        return "bg-green-700 dark:bg-green-500";
    };

    const formatDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    };

    const formatPeriodLabel = () => {
        if (viewMode === "weekly") {
            const start = new Date(dateRange[0]);
            const end = new Date(dateRange[6]);
            return `${start.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`;
        }
        return currentDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
    };

    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    return (
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    참여 히트맵
                </h3>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border overflow-hidden">
                        <button
                            onClick={() => setViewMode("weekly")}
                            className={cn(
                                "px-3 py-1.5 text-sm",
                                viewMode === "weekly" ? "bg-primary text-white" : "hover:bg-muted"
                            )}
                        >
                            주간
                        </button>
                        <button
                            onClick={() => setViewMode("monthly")}
                            className={cn(
                                "px-3 py-1.5 text-sm",
                                viewMode === "monthly" ? "bg-primary text-white" : "hover:bg-muted"
                            )}
                        >
                            월간
                        </button>
                    </div>
                </div>
            </div>

            {/* 기간 네비게이션 */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate("prev")}
                    className="p-2 rounded-lg hover:bg-muted"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-medium">{formatPeriodLabel()}</span>
                <button
                    onClick={() => navigate("next")}
                    className="p-2 rounded-lg hover:bg-muted"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* 히트맵 그리드 */}
            <div className="space-y-1">
                {/* 요일 헤더 (주간 뷰만) */}
                {viewMode === "weekly" && (
                    <div className="grid grid-cols-7 gap-1">
                        {dayNames.map((day) => (
                            <div
                                key={day}
                                className="text-center text-xs text-muted-foreground py-1"
                            >
                                {day}
                            </div>
                        ))}
                    </div>
                )}

                {/* 히트맵 셀 */}
                <div
                    className={cn(
                        "grid gap-1",
                        viewMode === "weekly" ? "grid-cols-7" : "grid-cols-7"
                    )}
                >
                    {viewMode === "monthly" && (
                        // 월간 뷰: 첫 주 빈 셀 추가
                        <>
                            {Array.from({ length: new Date(dateRange[0]).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}
                        </>
                    )}
                    {dateRange.map((dateStr) => {
                        const cell = heatmapData.get(dateStr);
                        const count = cell?.count || 0;
                        const isToday = dateStr === new Date().toISOString().split("T")[0];

                        return (
                            <button
                                key={dateStr}
                                onClick={() => cell && setSelectedCell(cell)}
                                className={cn(
                                    "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all",
                                    getIntensityClass(count),
                                    count > 0 && "cursor-pointer hover:ring-2 hover:ring-primary/50",
                                    isToday && "ring-2 ring-primary"
                                )}
                                title={cell ? `${cell.memberNames.length}명 참여` : undefined}
                            >
                                <span className={cn(
                                    "font-medium",
                                    count > 3 ? "text-white" : ""
                                )}>
                                    {new Date(dateStr).getDate()}
                                </span>
                                {count > 0 && (
                                    <span className={cn(
                                        "text-[10px]",
                                        count > 3 ? "text-white/80" : "text-muted-foreground"
                                    )}>
                                        {count}명
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 범례 */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>적음</span>
                <div className="flex gap-0.5">
                    {[0, 1, 3, 5, 7].map((n) => (
                        <div
                            key={n}
                            className={cn("w-4 h-4 rounded", getIntensityClass(n))}
                        />
                    ))}
                </div>
                <span>많음</span>
            </div>

            {/* 상세 모달 */}
            {selectedCell && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            {formatDateLabel(selectedCell.date)}
                        </h3>

                        {selectedCell.eventTitle && (
                            <p className="text-sm text-primary mt-2">
                                {selectedCell.eventTitle}
                            </p>
                        )}

                        <div className="mt-4">
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                <Users className="h-4 w-4" />
                                참여 멤버 ({selectedCell.memberNames.length}명)
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedCell.memberNames.map((name) => (
                                    <span
                                        key={name}
                                        className="px-2 py-1 bg-muted rounded-full text-sm"
                                    >
                                        {name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedCell(null)}
                            className="w-full mt-6 py-2.5 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
