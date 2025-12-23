"use client";

import { useMemo } from "react";
import { Clock, MapPin, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, OperationalSlot, OPERATIONAL_SLOT_LABELS } from "@/types/event";
import { formatTime } from "@/lib/utils/date-format";

interface LinearTimelineProps {
    event: Event;
    operationalSlots: OperationalSlot[];
    now?: Date;
}

/**
 * 선형 타임라인 컴포넌트 (단독 공연용)
 * - 운영 일정을 시간순으로 세로 배치
 * - 현재 진행 중인 항목 하이라이트
 * - MD 판매, 티켓 수령, 입장, 공연 시작/종료 등 표시
 */
export function LinearTimeline({ event, operationalSlots, now = new Date() }: LinearTimelineProps) {
    // 시간순 정렬
    const sortedSlots = useMemo(() => {
        return [...operationalSlots].sort((a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );
    }, [operationalSlots]);

    // 현재 진행 중인 슬롯 찾기
    const currentSlotIndex = useMemo(() => {
        const nowTime = now.getTime();
        for (let i = 0; i < sortedSlots.length; i++) {
            const slot = sortedSlots[i];
            const startTime = new Date(slot.startAt).getTime();
            const endTime = slot.endAt ? new Date(slot.endAt).getTime() : startTime + 30 * 60 * 1000; // 기본 30분

            if (nowTime >= startTime && nowTime < endTime) {
                return i;
            }
        }
        // 아직 시작 전이면 -1, 모두 지났으면 마지막 인덱스
        if (sortedSlots.length > 0) {
            const firstStart = new Date(sortedSlots[0].startAt).getTime();
            if (nowTime < firstStart) return -1;
        }
        return sortedSlots.length - 1;
    }, [sortedSlots, now]);

    // 다음 슬롯 인덱스
    const nextSlotIndex = currentSlotIndex + 1 < sortedSlots.length ? currentSlotIndex + 1 : null;

    if (sortedSlots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm">등록된 운영 일정이 없습니다</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">운영 일정</h3>
                <span className="text-xs text-muted-foreground">
                    {sortedSlots.length}개 일정
                </span>
            </div>

            {/* 타임라인 */}
            <div className="relative px-4 py-4">
                {/* 세로 연결선 */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-4">
                    {sortedSlots.map((slot, index) => {
                        const slotInfo = OPERATIONAL_SLOT_LABELS[slot.type];
                        const isCurrent = index === currentSlotIndex;
                        const isNext = index === nextSlotIndex;
                        const isPast = index < currentSlotIndex;
                        const isHighlight = slot.isHighlight || slot.type === "show_start";

                        return (
                            <TimelineItem
                                key={slot.id}
                                slot={slot}
                                slotInfo={slotInfo}
                                isCurrent={isCurrent}
                                isNext={isNext}
                                isPast={isPast}
                                isHighlight={isHighlight}
                            />
                        );
                    })}
                </div>
            </div>

            {/* 안내 문구 */}
            <div className="px-4 py-3 border-t">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                        실제 운영 시간은 현장 상황에 따라 변경될 수 있습니다.
                        공식 안내를 확인해주세요.
                    </p>
                </div>
            </div>
        </div>
    );
}

interface TimelineItemProps {
    slot: OperationalSlot;
    slotInfo: { label: string; icon: string };
    isCurrent: boolean;
    isNext: boolean;
    isPast: boolean;
    isHighlight: boolean;
}

function TimelineItem({ slot, slotInfo, isCurrent, isNext, isPast, isHighlight }: TimelineItemProps) {
    const title = slot.title || slotInfo.label;

    return (
        <div
            className={cn(
                "relative flex gap-4 pl-8",
                isPast && "opacity-50"
            )}
        >
            {/* 타임라인 점/아이콘 */}
            <div
                className={cn(
                    "absolute left-5 w-6 h-6 -translate-x-1/2 rounded-full flex items-center justify-center text-sm z-10",
                    isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse"
                        : isNext
                            ? "bg-blue-500 text-white"
                            : isHighlight
                                ? "bg-amber-500 text-white"
                                : isPast
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-background border-2 border-border"
                )}
            >
                {slotInfo.icon}
            </div>

            {/* 콘텐츠 카드 */}
            <div
                className={cn(
                    "flex-1 rounded-lg border p-3 transition-all",
                    isCurrent
                        ? "border-primary bg-primary/5 shadow-sm"
                        : isNext
                            ? "border-blue-200 bg-blue-50/50"
                            : isHighlight && !isPast
                                ? "border-amber-200 bg-amber-50/50"
                                : "border-border bg-card"
                )}
            >
                {/* 상단: 배지 + 시간 */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        {isCurrent && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded">
                                NOW
                            </span>
                        )}
                        {isNext && !isCurrent && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded">
                                NEXT
                            </span>
                        )}
                        <span className={cn(
                            "text-xs font-medium",
                            isCurrent ? "text-primary" : "text-muted-foreground"
                        )}>
                            {formatTime(new Date(slot.startAt))}
                            {slot.endAt && ` ~ ${formatTime(new Date(slot.endAt))}`}
                        </span>
                    </div>
                </div>

                {/* 제목 */}
                <h4 className={cn(
                    "font-semibold text-sm",
                    isHighlight && !isPast && "text-amber-700"
                )}>
                    {title}
                </h4>

                {/* 위치 */}
                {slot.location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {slot.location}
                    </div>
                )}

                {/* 설명 */}
                {slot.description && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        {slot.description}
                    </p>
                )}
            </div>
        </div>
    );
}
