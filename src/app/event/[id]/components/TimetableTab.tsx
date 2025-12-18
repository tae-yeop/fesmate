"use client";

import { useState } from "react";
import { Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, Slot } from "@/types/event";
import { formatTime } from "@/lib/utils/date-format";

interface TimetableTabProps {
    event: Event;
    slots: Slot[];
}

export function TimetableTab({ event, slots }: TimetableTabProps) {
    const now = new Date();
    const [checkedSlots, setCheckedSlots] = useState<Set<string>>(new Set());

    // Now/Next 계산
    const currentSlot = slots.find(s => {
        const start = new Date(s.startAt).getTime();
        const end = new Date(s.endAt).getTime();
        return now.getTime() >= start && now.getTime() < end;
    });

    const toggleSlot = (slotId: string) => {
        setCheckedSlots(prev => {
            const next = new Set(prev);
            if (next.has(slotId)) {
                next.delete(slotId);
            } else {
                next.add(slotId);
            }
            return next;
        });
    };

    // 슬롯을 날짜별로 그룹화
    const slotsByDay = slots.reduce((acc, slot) => {
        const day = slot.day || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(slot);
        return acc;
    }, {} as Record<number, Slot[]>);

    return (
        <div className="space-y-6">
            {/* Now/Next */}
            {currentSlot && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-primary">Now Playing</span>
                    </div>
                    <p className="font-medium">{currentSlot.title || currentSlot.artist?.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {formatTime(currentSlot.startAt)} - {formatTime(currentSlot.endAt)} | {currentSlot.stage}
                    </p>
                </div>
            )}

            {/* 타임테이블 */}
            {slots.length > 0 ? (
                Object.entries(slotsByDay).map(([day, daySlots]) => (
                    <div key={day}>
                        {Object.keys(slotsByDay).length > 1 && (
                            <h3 className="font-bold mb-3">Day {day}</h3>
                        )}
                        <div className="space-y-3">
                            {daySlots.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).map(slot => {
                                const isCurrent = currentSlot?.id === slot.id;
                                const isPast = new Date(slot.endAt).getTime() < now.getTime();
                                const isChecked = checkedSlots.has(slot.id);

                                return (
                                    <div
                                        key={slot.id}
                                        className={cn(
                                            "flex items-center gap-3 text-sm p-3 rounded-lg border",
                                            isCurrent && "bg-primary/5 border-primary/20",
                                            isPast && !isCurrent && "opacity-50"
                                        )}
                                    >
                                        <div className="w-14 font-bold text-primary">
                                            {formatTime(slot.startAt)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{slot.title || slot.artist?.name}</p>
                                            <p className="text-xs text-muted-foreground">{slot.stage}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleSlot(slot.id)}
                                            className={cn(
                                                "transition-colors",
                                                isChecked ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                                            )}
                                        >
                                            <Star className={cn("h-5 w-5", isChecked && "fill-yellow-400")} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">타임테이블이 없습니다</p>
                </div>
            )}

            {/* 보고 싶은 슬롯 요약 */}
            {checkedSlots.size > 0 && (
                <div className="rounded-lg border bg-yellow-50 p-4">
                    <h4 className="font-bold text-sm mb-2 flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                        내가 보고 싶은 슬롯 ({checkedSlots.size}개)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {slots.filter(s => checkedSlots.has(s.id)).map(slot => (
                            <span key={slot.id} className="text-xs bg-white px-2 py-1 rounded">
                                {formatTime(slot.startAt)} {slot.title || slot.artist?.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
