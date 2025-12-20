"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Clock, Star, ChevronRight, Calendar, MapPin, Plus, List, AlertTriangle, X, LayoutGrid, ListIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, Slot } from "@/types/event";
import { formatTime } from "@/lib/utils/date-format";
import { useDevContext } from "@/lib/dev-context";
import { useMyTimetable } from "@/lib/my-timetable-context";
import { MyTimetableView, CustomEventModal } from "@/components/timetable";
import { SlotMarkType, SLOT_MARK_PRESETS } from "@/types/my-timetable";
import { downloadICS, getExportSummary } from "@/lib/utils/ics-export";

interface TimetableTabProps {
    event: Event;
    slots: Slot[];
}

// 스테이지별 색상
const STAGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    "Main Stage": { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
    "Second Stage": { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" },
    "Third Stage": { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
};

const DEFAULT_STAGE_COLOR = { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" };

function getStageColor(stage: string, index: number) {
    if (STAGE_COLORS[stage]) return STAGE_COLORS[stage];
    // 기본 색상 순환
    const colors = [
        { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
        { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
        { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
    ];
    return colors[index % colors.length] || DEFAULT_STAGE_COLOR;
}

// 슬롯 마킹 메뉴 컴포넌트
function SlotMarkMenu({
    slotId,
    slotTitle,
    currentMark,
    onSelect,
    onClear,
    onClose,
}: {
    slotId: string;
    slotTitle: string;
    currentMark?: SlotMarkType;
    onSelect: (type: SlotMarkType) => void;
    onClear: () => void;
    onClose: () => void;
}) {
    const menuRef = useRef<HTMLDivElement>(null);

    // 바깥 클릭 시 닫기
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const markTypes: SlotMarkType[] = ["watch", "meal", "rest", "move", "skip"];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
            <div
                ref={menuRef}
                className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm animate-slide-up"
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-bold text-sm truncate flex-1 mr-2">{slotTitle}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>
                <div className="p-3 space-y-2">
                    <p className="text-xs text-muted-foreground mb-3 px-1">이 시간에 뭘 할까요?</p>
                    <div className="grid grid-cols-5 gap-2">
                        {markTypes.map((type) => {
                            const preset = SLOT_MARK_PRESETS[type];
                            const isSelected = currentMark === type;
                            return (
                                <button
                                    key={type}
                                    onClick={() => {
                                        onSelect(type);
                                        onClose();
                                    }}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                                        isSelected
                                            ? `${preset.bgColor} border-current ${preset.color}`
                                            : "border-transparent bg-gray-50 hover:bg-gray-100"
                                    )}
                                >
                                    <span className="text-xl">{preset.icon}</span>
                                    <span className={cn("text-xs font-medium", isSelected && preset.color)}>
                                        {preset.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {currentMark && (
                        <button
                            onClick={() => {
                                onClear();
                                onClose();
                            }}
                            className="w-full mt-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            표시 제거
                        </button>
                    )}
                </div>
                <div className="p-3 pt-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}

export function TimetableTab({ event, slots }: TimetableTabProps) {
    const { getNow } = useDevContext();
    const now = getNow();
    const { getSlotMark, setSlotMark, clearSlotMark, getMarkedSlots, getConflicts, addCustomEvent, getCustomEvents } = useMyTimetable();

    const [selectedDay, setSelectedDay] = useState<number | "all">("all");
    const [selectedStage, setSelectedStage] = useState<string | "all">("all");
    const [showMyTimetable, setShowMyTimetable] = useState(false);
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [markingSlot, setMarkingSlot] = useState<Slot | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [savedToast, setSavedToast] = useState(false);
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [exportedToast, setExportedToast] = useState(false);

    // 마킹된 슬롯 목록
    const markedSlots = getMarkedSlots(event.id);
    const markedSlotCount = markedSlots.length;
    const watchSlotCount = markedSlots.filter(m => m.type === "watch").length;

    // 커스텀 이벤트 목록
    const customEvents = getCustomEvents(event.id);

    // 내보내기 요약 정보
    const exportSummary = useMemo(() =>
        getExportSummary(markedSlots, customEvents),
        [markedSlots, customEvents]
    );

    // 충돌 감지
    const conflicts = getConflicts(event.id, slots);
    const hasConflicts = conflicts.length > 0;

    // Now/Next 계산
    const { currentSlot, nextSlot, progress, remainingMinutes } = useMemo(() => {
        const current = slots.find(s => {
            const start = new Date(s.startAt).getTime();
            const end = new Date(s.endAt).getTime();
            return now.getTime() >= start && now.getTime() < end;
        });

        const next = slots
            .filter(s => new Date(s.startAt).getTime() > now.getTime())
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

        // 진행률 계산
        let prog = 0;
        let remaining = 0;
        if (current) {
            const start = new Date(current.startAt).getTime();
            const end = new Date(current.endAt).getTime();
            const elapsed = now.getTime() - start;
            const total = end - start;
            prog = Math.min(100, Math.max(0, (elapsed / total) * 100));
            remaining = Math.ceil((end - now.getTime()) / (1000 * 60));
        }

        return { currentSlot: current, nextSlot: next, progress: prog, remainingMinutes: remaining };
    }, [slots, now]);

    const handleMarkSlot = (slotId: string, markType: SlotMarkType) => {
        setSlotMark(event.id, slotId, markType);
    };

    const handleClearMark = (slotId: string) => {
        clearSlotMark(event.id, slotId);
    };

    // 슬롯을 날짜별로 그룹화
    const slotsByDay = useMemo(() => slots.reduce((acc, slot) => {
        const day = slot.day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(slot);
        return acc;
    }, {} as Record<number, Slot[]>), [slots]);

    // 사용 가능한 Day 목록
    const availableDays = useMemo(() => {
        return Object.keys(slotsByDay).map(Number).sort((a, b) => a - b);
    }, [slotsByDay]);

    // 사용 가능한 Stage 목록
    const availableStages = useMemo(() => {
        const stages = new Set<string>();
        slots.forEach(s => s.stage && stages.add(s.stage));
        return Array.from(stages).sort();
    }, [slots]);

    // 오늘이 몇 번째 Day인지 계산
    const todayDay = useMemo(() => {
        if (availableDays.length <= 1) return null;

        // 각 Day의 첫 슬롯 날짜와 오늘 비교
        for (const day of availableDays) {
            const daySlots = slotsByDay[day];
            if (daySlots && daySlots.length > 0) {
                const firstSlotDate = new Date(daySlots[0].startAt);
                const isSameDay =
                    firstSlotDate.getFullYear() === now.getFullYear() &&
                    firstSlotDate.getMonth() === now.getMonth() &&
                    firstSlotDate.getDate() === now.getDate();
                if (isSameDay) return day;
            }
        }
        return null;
    }, [availableDays, slotsByDay, now]);

    // 자동으로 오늘 Day 선택 (초기 로드 시)
    useEffect(() => {
        if (todayDay !== null && selectedDay === "all") {
            setSelectedDay(todayDay);
        }
    }, [todayDay]);

    // 필터링된 슬롯
    const filteredSlots = useMemo(() => {
        let filtered = slots;

        if (selectedDay !== "all") {
            filtered = filtered.filter(s => (s.day || 1) === selectedDay);
        }

        if (selectedStage !== "all") {
            filtered = filtered.filter(s => s.stage === selectedStage);
        }

        return filtered.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }, [slots, selectedDay, selectedStage]);

    // 필터링된 슬롯을 날짜별로 그룹화
    const filteredSlotsByDay = useMemo(() => {
        return filteredSlots.reduce((acc, slot) => {
            const day = slot.day || 1;
            if (!acc[day]) acc[day] = [];
            acc[day].push(slot);
            return acc;
        }, {} as Record<number, Slot[]>);
    }, [filteredSlots]);

    // 그리드 뷰용: 선택된 Day의 슬롯들만
    const dayFilteredSlots = useMemo(() => {
        if (selectedDay === "all") {
            // 전체일 때는 첫 번째 Day만 그리드로 표시
            const firstDay = availableDays[0] || 1;
            return slots.filter(s => (s.day || 1) === firstDay);
        }
        return slots.filter(s => (s.day || 1) === selectedDay);
    }, [slots, selectedDay, availableDays]);

    // 그리드 뷰용: 스테이지별로 슬롯 분류
    const slotsByStage = useMemo(() => {
        const byStage: Record<string, Slot[]> = {};
        dayFilteredSlots.forEach(slot => {
            const stage = slot.stage || "Main";
            if (!byStage[stage]) byStage[stage] = [];
            byStage[stage].push(slot);
        });
        // 시간순 정렬
        Object.keys(byStage).forEach(stage => {
            byStage[stage].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        });
        return byStage;
    }, [dayFilteredSlots]);

    // 그리드 뷰용: 시간 범위 계산
    const timeRange = useMemo(() => {
        if (dayFilteredSlots.length === 0) return { startHour: 10, endHour: 23, totalMinutes: 780 };

        let minTime = Infinity;
        let maxTime = -Infinity;

        dayFilteredSlots.forEach(slot => {
            const start = new Date(slot.startAt).getTime();
            const end = new Date(slot.endAt).getTime();
            if (start < minTime) minTime = start;
            if (end > maxTime) maxTime = end;
        });

        const startDate = new Date(minTime);
        const endDate = new Date(maxTime);

        // 시작 시간을 정시로 내림, 종료 시간을 정시로 올림
        const startHour = startDate.getHours();
        const endHour = endDate.getMinutes() > 0 ? endDate.getHours() + 1 : endDate.getHours();

        return {
            startHour,
            endHour,
            totalMinutes: (endHour - startHour) * 60,
            startTime: new Date(startDate.setHours(startHour, 0, 0, 0)).getTime(),
        };
    }, [dayFilteredSlots]);

    // 그리드에서 슬롯의 위치와 높이 계산
    const getSlotPosition = (slot: Slot) => {
        const startTime = new Date(slot.startAt);
        const endTime = new Date(slot.endAt);

        const startMinutes = (startTime.getHours() - timeRange.startHour) * 60 + startTime.getMinutes();
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

        const top = (startMinutes / timeRange.totalMinutes) * 100;
        const height = (duration / timeRange.totalMinutes) * 100;

        return { top, height, duration };
    };

    // 시간 라벨 생성
    const timeLabels = useMemo(() => {
        const labels = [];
        for (let h = timeRange.startHour; h <= timeRange.endHour; h++) {
            labels.push(h);
        }
        return labels;
    }, [timeRange]);

    // 시간을 "오후 02:00" 형식으로 포맷
    const formatHourLabel = (hour: number) => {
        const period = hour >= 12 ? "오후" : "오전";
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return { period, time: `${displayHour.toString().padStart(2, "0")}:00` };
    };

    // Day 날짜 포맷
    const getDayDateLabel = (day: number) => {
        const daySlots = slotsByDay[day];
        if (!daySlots || daySlots.length === 0) return `Day ${day}`;

        const date = new Date(daySlots[0].startAt);
        const month = date.getMonth() + 1;
        const dayOfMonth = date.getDate();
        const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];

        return `${month}/${dayOfMonth}(${weekday})`;
    };

    // 저장 확인 핸들러
    const handleSaveConfirm = () => {
        setShowSaveConfirm(false);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
    };

    // 캘린더 내보내기 핸들러
    const handleExportConfirm = () => {
        downloadICS(event, slots, markedSlots, customEvents);
        setShowExportConfirm(false);
        setExportedToast(true);
        setTimeout(() => setExportedToast(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Day 스위처 */}
            {availableDays.length > 1 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">일자 선택</span>
                        </div>
                        {todayDay !== null && selectedDay !== todayDay && (
                            <button
                                onClick={() => setSelectedDay(todayDay)}
                                className="text-xs text-primary font-medium hover:underline"
                            >
                                오늘로 이동
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        <button
                            onClick={() => setSelectedDay("all")}
                            className={cn(
                                "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                                selectedDay === "all"
                                    ? "bg-primary text-primary-foreground"
                                    : "border hover:bg-accent"
                            )}
                        >
                            전체
                        </button>
                        {availableDays.map(day => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={cn(
                                    "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors relative",
                                    selectedDay === day
                                        ? "bg-primary text-primary-foreground"
                                        : "border hover:bg-accent",
                                    todayDay === day && selectedDay !== day && "border-primary"
                                )}
                            >
                                Day {day}
                                <span className="block text-[10px] opacity-80">{getDayDateLabel(day)}</span>
                                {todayDay === day && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stage 필터 & 뷰 모드 토글 */}
            {availableStages.length > 1 && (
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        {viewMode === "list" && (
                            <>
                                <button
                                    onClick={() => setSelectedStage("all")}
                                    className={cn(
                                        "flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                        selectedStage === "all"
                                            ? "bg-secondary text-secondary-foreground"
                                            : "border hover:bg-accent"
                                    )}
                                >
                                    전체 스테이지
                                </button>
                                {availableStages.map(stage => (
                                    <button
                                        key={stage}
                                        onClick={() => setSelectedStage(stage)}
                                        className={cn(
                                            "flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                                            selectedStage === stage
                                                ? "bg-secondary text-secondary-foreground"
                                                : "border hover:bg-accent"
                                        )}
                                    >
                                        {stage}
                                    </button>
                                ))}
                            </>
                        )}
                        {viewMode === "grid" && (
                            <span className="text-xs text-muted-foreground">{availableStages.length}개 스테이지</span>
                        )}
                    </div>
                    {/* 뷰 모드 토글 */}
                    <div className="flex items-center gap-1 border rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={cn(
                                "p-1.5 rounded transition-colors",
                                viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                            )}
                            title="그리드 뷰"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={cn(
                                "p-1.5 rounded transition-colors",
                                viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                            )}
                            title="리스트 뷰"
                        >
                            <ListIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Now/Next Progress Bar */}
            {(currentSlot || nextSlot) && (
                <div className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 space-y-3">
                    {/* Current Slot */}
                    {currentSlot && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-sm font-bold text-primary">NOW</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {remainingMinutes}분 남음
                                </span>
                            </div>
                            <p className="font-medium mb-1">{currentSlot.title || currentSlot.artist?.name}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                                {formatTime(currentSlot.startAt)} - {formatTime(currentSlot.endAt)} | {currentSlot.stage}
                            </p>
                            {/* Progress Bar */}
                            <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                                <span>{formatTime(currentSlot.startAt)}</span>
                                <span>{Math.round(progress)}%</span>
                                <span>{formatTime(currentSlot.endAt)}</span>
                            </div>
                        </div>
                    )}

                    {/* Next Slot */}
                    {nextSlot && (
                        <div className={cn(currentSlot && "pt-3 border-t border-primary/10")}>
                            <div className="flex items-center gap-2 mb-1">
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">NEXT</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm">{nextSlot.title || nextSlot.artist?.name}</p>
                                <span className="text-xs text-muted-foreground">
                                    {formatTime(nextSlot.startAt)} | {nextSlot.stage}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 타임테이블 - 그리드 뷰 */}
            {viewMode === "grid" && availableStages.length > 1 && dayFilteredSlots.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    {/* 가로 스크롤 컨테이너 */}
                    <div className="overflow-x-auto">
                        <div className="min-w-[400px]">
                            {/* 스테이지 헤더 */}
                            <div className="flex border-b sticky top-0 z-10 bg-white">
                                <div className="w-14 shrink-0 border-r bg-muted/30" /> {/* 시간 컬럼 */}
                                {availableStages.map((stage, idx) => {
                                    const stageColor = getStageColor(stage, idx);
                                    return (
                                        <div
                                            key={stage}
                                            className={cn(
                                                "flex-1 min-w-[110px] py-2.5 px-1 text-center text-[11px] font-bold border-r last:border-r-0",
                                                stageColor.bg, stageColor.text
                                            )}
                                        >
                                            {stage.replace(" Stage", "")}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 타임 그리드 */}
                            <div className="flex">
                                {/* 시간 라벨 컬럼 */}
                                <div className="w-14 shrink-0 border-r bg-muted/10">
                                    {timeLabels.map((hour) => {
                                        const { period, time } = formatHourLabel(hour);
                                        return (
                                            <div
                                                key={hour}
                                                className="h-20 border-b last:border-b-0 flex flex-col items-center justify-start pt-1"
                                            >
                                                <span className="text-[9px] text-primary font-medium">{period}</span>
                                                <span className="text-[11px] text-primary font-bold">{time.split(":")[0]}:00</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 스테이지 컬럼들 */}
                                {availableStages.map((stage, stageIdx) => {
                                    const stageSlots = slotsByStage[stage] || [];
                                    const stageColor = getStageColor(stage, stageIdx);

                                    return (
                                        <div
                                            key={stage}
                                            className="flex-1 min-w-[110px] border-r last:border-r-0 relative bg-white"
                                            style={{ height: `${timeLabels.length * 80}px` }}
                                        >
                                            {/* 시간 가이드 라인 */}
                                            {timeLabels.map((hour, idx) => (
                                                <div
                                                    key={hour}
                                                    className="absolute w-full border-b border-gray-100"
                                                    style={{ top: `${(idx / timeLabels.length) * 100}%` }}
                                                />
                                            ))}

                                            {/* 슬롯 블록들 */}
                                            {stageSlots.map(slot => {
                                                const { top, height, duration } = getSlotPosition(slot);
                                                const slotMark = getSlotMark(event.id, slot.id);
                                                const markPreset = slotMark ? SLOT_MARK_PRESETS[slotMark.type] : null;
                                                const isCurrent = currentSlot?.id === slot.id;
                                                const isPast = new Date(slot.endAt).getTime() < now.getTime();

                                                return (
                                                    <button
                                                        key={slot.id}
                                                        onClick={() => setMarkingSlot(slot)}
                                                        className={cn(
                                                            "absolute left-0.5 right-0.5 rounded-sm border-l-4 p-1.5 text-left transition-all overflow-hidden shadow-sm",
                                                            "hover:shadow-md hover:z-10 active:scale-[0.98]",
                                                            slotMark
                                                                ? `${markPreset?.solidBg} ${markPreset?.borderColor} text-white`
                                                                : `${stageColor.bg} ${stageColor.border.replace("border-", "border-l-")}`,
                                                            isCurrent && "ring-2 ring-primary ring-offset-1",
                                                            isPast && !isCurrent && "opacity-40"
                                                        )}
                                                        style={{
                                                            top: `${top}%`,
                                                            height: `${Math.max(height, 5)}%`,
                                                            minHeight: "32px",
                                                        }}
                                                    >
                                                        <div className="flex flex-col h-full justify-center">
                                                            <div className="flex items-start justify-between gap-0.5">
                                                                <span className={cn(
                                                                    "text-[11px] font-bold leading-tight",
                                                                    duration < 50 ? "line-clamp-1" : "line-clamp-2",
                                                                    slotMark ? "text-white" : stageColor.text
                                                                )}>
                                                                    {slot.title || slot.artist?.name}
                                                                </span>
                                                            </div>
                                                            {duration >= 50 && (
                                                                <span className={cn(
                                                                    "text-[9px] mt-0.5",
                                                                    slotMark ? "text-white/80" : "text-muted-foreground"
                                                                )}>
                                                                    {formatTime(slot.startAt)}-{formatTime(slot.endAt)} ({duration}min)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 타임테이블 - 리스트 뷰 */}
            {(viewMode === "list" || availableStages.length <= 1) && (
                <>
                    {filteredSlots.length > 0 ? (
                        Object.entries(filteredSlotsByDay).map(([day, daySlots]) => (
                            <div key={day}>
                                {/* Day 헤더 (전체 보기 시에만 표시) */}
                                {selectedDay === "all" && Object.keys(filteredSlotsByDay).length > 1 && (
                                    <div className="flex items-center gap-2 mb-3">
                                        <h3 className="font-bold">Day {day}</h3>
                                        <span className="text-xs text-muted-foreground">{getDayDateLabel(Number(day))}</span>
                                        {todayDay === Number(day) && (
                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded">오늘</span>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {daySlots.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).map(slot => {
                                        const isCurrent = currentSlot?.id === slot.id;
                                        const isPast = new Date(slot.endAt).getTime() < now.getTime();
                                        const slotMark = getSlotMark(event.id, slot.id);
                                        const hasSlotConflict = slotMark?.type === "watch" && conflicts.some(c => c.items.some(item => item.id === slot.id));
                                        const markPreset = slotMark ? SLOT_MARK_PRESETS[slotMark.type] : null;
                                        const stageIdx = availableStages.indexOf(slot.stage || "");
                                        const stageColor = getStageColor(slot.stage || "", stageIdx);

                                        return (
                                            <button
                                                key={slot.id}
                                                onClick={() => setMarkingSlot(slot)}
                                                className={cn(
                                                    "flex items-center gap-3 text-sm p-3 rounded-lg border w-full text-left transition-all active:scale-[0.98]",
                                                    isCurrent && "bg-primary/5 border-primary/20",
                                                    isPast && !isCurrent && "opacity-50",
                                                    hasSlotConflict && "border-amber-300 bg-amber-50",
                                                    slotMark && !hasSlotConflict && `${markPreset?.bgColor} border`
                                                )}
                                            >
                                                <div className="w-14 font-bold text-primary shrink-0">
                                                    {formatTime(slot.startAt)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-medium truncate">{slot.title || slot.artist?.name}</p>
                                                        {hasSlotConflict && (
                                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", stageColor.bg, stageColor.text)}>
                                                            {slot.stage}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors border-2",
                                                    slotMark
                                                        ? `${markPreset?.solidBg} border-transparent`
                                                        : "border-gray-200 bg-white hover:border-gray-300"
                                                )}>
                                                    {slotMark && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : slots.length > 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">선택한 조건에 맞는 슬롯이 없습니다</p>
                            <button
                                onClick={() => {
                                    setSelectedDay("all");
                                    setSelectedStage("all");
                                }}
                                className="mt-2 text-xs text-primary hover:underline"
                            >
                                필터 초기화
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">타임테이블이 없습니다</p>
                        </div>
                    )}
                </>
            )}

            {/* 나만의 타임테이블 만들기 섹션 - 타임테이블 아래 배치 */}
            <div className="rounded-xl border-2 border-dashed border-yellow-300 bg-gradient-to-r from-yellow-50/50 to-amber-50/50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">나만의 타임테이블</h3>
                            <p className="text-xs text-muted-foreground">
                                위 타임테이블에서 슬롯을 탭해서 표시하세요
                            </p>
                        </div>
                    </div>
                    {markedSlotCount > 0 && (
                        <button
                            onClick={() => setShowSaveConfirm(true)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600 transition-colors shadow-sm"
                        >
                            저장하기
                        </button>
                    )}
                </div>

                {/* 현재 선택 상태 */}
                {markedSlotCount > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border border-yellow-200">
                        <span className="text-xs font-medium text-muted-foreground">선택됨:</span>
                        {watchSlotCount > 0 && (
                            <span className="text-xs px-2 py-1 bg-yellow-400 text-yellow-900 rounded-full font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-yellow-600" />
                                보기 {watchSlotCount}
                            </span>
                        )}
                        {markedSlots.filter(m => m.type === "meal").length > 0 && (
                            <span className="text-xs px-2 py-1 bg-orange-400 text-orange-900 rounded-full font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-orange-600" />
                                밥 {markedSlots.filter(m => m.type === "meal").length}
                            </span>
                        )}
                        {markedSlots.filter(m => m.type === "rest").length > 0 && (
                            <span className="text-xs px-2 py-1 bg-blue-400 text-blue-900 rounded-full font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                휴식 {markedSlots.filter(m => m.type === "rest").length}
                            </span>
                        )}
                        {markedSlots.filter(m => m.type === "move").length > 0 && (
                            <span className="text-xs px-2 py-1 bg-green-400 text-green-900 rounded-full font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-600" />
                                이동 {markedSlots.filter(m => m.type === "move").length}
                            </span>
                        )}
                        {markedSlots.filter(m => m.type === "skip").length > 0 && (
                            <span className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded-full font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-gray-500" />
                                스킵 {markedSlots.filter(m => m.type === "skip").length}
                            </span>
                        )}
                        {hasConflicts && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                충돌 {conflicts.length}
                            </span>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setShowExportConfirm(true)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                title="캘린더 내보내기"
                            >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">내보내기</span>
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => setShowMyTimetable(true)}
                                className="text-xs text-primary font-medium hover:underline"
                            >
                                전체 보기 →
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400" /> 보기</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400" /> 밥</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400" /> 휴식</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400" /> 이동</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300" /> 스킵</span>
                    </div>
                )}
            </div>

            {/* 나만의 타임테이블 뷰 모달 */}
            {showMyTimetable && (
                <MyTimetableView
                    event={event}
                    slots={slots}
                    onClose={() => setShowMyTimetable(false)}
                />
            )}

            {/* 커스텀 이벤트 추가 모달 */}
            <CustomEventModal
                isOpen={showAddEvent}
                onClose={() => setShowAddEvent(false)}
                onSubmit={(eventData) => addCustomEvent(event.id, eventData)}
                eventDate={new Date(event.startAt)}
            />

            {/* 슬롯 마킹 메뉴 */}
            {markingSlot && (
                <SlotMarkMenu
                    slotId={markingSlot.id}
                    slotTitle={markingSlot.title || markingSlot.artist?.name || "슬롯"}
                    currentMark={getSlotMark(event.id, markingSlot.id)?.type}
                    onSelect={(type) => handleMarkSlot(markingSlot.id, type)}
                    onClear={() => handleClearMark(markingSlot.id)}
                    onClose={() => setMarkingSlot(null)}
                />
            )}

            {/* 저장 확인 모달 */}
            {showSaveConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-sm p-6 animate-slide-up">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                                <Star className="h-8 w-8 fill-yellow-400 text-yellow-500" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">저장하시겠습니까?</h3>
                            <p className="text-sm text-muted-foreground">
                                {markedSlotCount}개의 슬롯이 나만의 타임테이블에 저장됩니다.
                            </p>
                        </div>

                        {/* 선택 요약 */}
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {watchSlotCount > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-yellow-400 text-yellow-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-yellow-600" />
                                    보기 {watchSlotCount}
                                </span>
                            )}
                            {markedSlots.filter(m => m.type === "meal").length > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-orange-400 text-orange-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-orange-600" />
                                    밥 {markedSlots.filter(m => m.type === "meal").length}
                                </span>
                            )}
                            {markedSlots.filter(m => m.type === "rest").length > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-blue-400 text-blue-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    휴식 {markedSlots.filter(m => m.type === "rest").length}
                                </span>
                            )}
                            {markedSlots.filter(m => m.type === "move").length > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-green-400 text-green-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-600" />
                                    이동 {markedSlots.filter(m => m.type === "move").length}
                                </span>
                            )}
                            {markedSlots.filter(m => m.type === "skip").length > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-gray-300 text-gray-700 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-gray-500" />
                                    스킵 {markedSlots.filter(m => m.type === "skip").length}
                                </span>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSaveConfirm(false)}
                                className="flex-1 py-3 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSaveConfirm}
                                className="flex-1 py-3 rounded-xl bg-yellow-500 text-white text-sm font-bold hover:bg-yellow-600 transition-colors"
                            >
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 저장 완료 토스트 */}
            {savedToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                    <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium">나만의 타임테이블에 저장되었습니다!</span>
                    </div>
                </div>
            )}

            {/* 캘린더 내보내기 확인 모달 */}
            {showExportConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-sm p-6 animate-slide-up">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                                <Download className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">캘린더 내보내기</h3>
                            <p className="text-sm text-muted-foreground">
                                {exportSummary.totalCount}개의 일정을 .ics 파일로 내보냅니다.
                            </p>
                        </div>

                        {/* 내보내기 요약 */}
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                            {exportSummary.watchCount > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-yellow-400 text-yellow-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-yellow-600" />
                                    공연 {exportSummary.watchCount}
                                </span>
                            )}
                            {exportSummary.mealCount > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-orange-400 text-orange-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-orange-600" />
                                    밥 {exportSummary.mealCount}
                                </span>
                            )}
                            {exportSummary.restCount > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-blue-400 text-blue-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                                    휴식 {exportSummary.restCount}
                                </span>
                            )}
                            {exportSummary.moveCount > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-green-400 text-green-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-green-600" />
                                    이동 {exportSummary.moveCount}
                                </span>
                            )}
                            {exportSummary.customCount > 0 && (
                                <span className="text-xs px-2.5 py-1 bg-purple-400 text-purple-900 rounded-full font-medium flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                                    커스텀 {exportSummary.customCount}
                                </span>
                            )}
                        </div>

                        <p className="text-xs text-center text-muted-foreground mb-6">
                            Google Calendar, Apple Calendar, Outlook 등에서<br />가져오기 할 수 있습니다.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowExportConfirm(false)}
                                className="flex-1 py-3 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleExportConfirm}
                                className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                다운로드
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 내보내기 완료 토스트 */}
            {exportedToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                    <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <Download className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium">캘린더 파일이 다운로드되었습니다!</span>
                    </div>
                </div>
            )}
        </div>
    );
}
