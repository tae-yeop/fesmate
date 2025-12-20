"use client";

import { useState, useEffect } from "react";
import { X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomEventType, CUSTOM_EVENT_PRESETS, CustomEvent } from "@/types/my-timetable";

interface CustomEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (event: Omit<CustomEvent, "id" | "eventId" | "createdAt">) => void;
    eventDate: Date; // 행사 날짜 (기본 날짜로 사용)
    editEvent?: CustomEvent; // 수정 모드
}

export function CustomEventModal({
    isOpen,
    onClose,
    onSubmit,
    eventDate,
    editEvent,
}: CustomEventModalProps) {
    const [type, setType] = useState<CustomEventType>("meal");
    const [title, setTitle] = useState("");
    const [startTime, setStartTime] = useState("12:00");
    const [endTime, setEndTime] = useState("13:00");
    const [memo, setMemo] = useState("");

    // 수정 모드일 때 초기값 설정
    useEffect(() => {
        if (editEvent) {
            setType(editEvent.type);
            setTitle(editEvent.title);
            const start = new Date(editEvent.startAt);
            const end = new Date(editEvent.endAt);
            setStartTime(
                `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`
            );
            setEndTime(
                `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`
            );
            setMemo(editEvent.memo || "");
        } else {
            // 새 이벤트 초기화
            setType("meal");
            setTitle("");
            setStartTime("12:00");
            setEndTime("13:00");
            setMemo("");
        }
    }, [editEvent, isOpen]);

    // 타입 선택 시 제목 자동 설정
    useEffect(() => {
        if (!editEvent && type !== "other") {
            setTitle(CUSTOM_EVENT_PRESETS[type].label);
        }
    }, [type, editEvent]);

    // 시작 시간 변경 시 종료 시간 자동 조정
    useEffect(() => {
        if (!editEvent) {
            const [hours, minutes] = startTime.split(":").map(Number);
            const duration = CUSTOM_EVENT_PRESETS[type].defaultDuration;
            const endDate = new Date();
            endDate.setHours(hours, minutes + duration, 0, 0);
            setEndTime(
                `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`
            );
        }
    }, [startTime, type, editEvent]);

    const handleSubmit = () => {
        if (!title.trim()) return;

        const [startHours, startMinutes] = startTime.split(":").map(Number);
        const [endHours, endMinutes] = endTime.split(":").map(Number);

        const startAt = new Date(eventDate);
        startAt.setHours(startHours, startMinutes, 0, 0);

        const endAt = new Date(eventDate);
        endAt.setHours(endHours, endMinutes, 0, 0);

        // 종료 시간이 시작보다 이르면 다음 날로 처리
        if (endAt <= startAt) {
            endAt.setDate(endAt.getDate() + 1);
        }

        onSubmit({
            type,
            title: title.trim(),
            startAt,
            endAt,
            memo: memo.trim() || undefined,
        });

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-50 w-full max-w-md mx-0 sm:mx-4 bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold">
                        {editEvent ? "일정 수정" : "개인 일정 추가"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* 프리셋 버튼 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            일정 유형
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {(Object.keys(CUSTOM_EVENT_PRESETS) as CustomEventType[]).map(
                                (presetType) => {
                                    const preset = CUSTOM_EVENT_PRESETS[presetType];
                                    return (
                                        <button
                                            key={presetType}
                                            onClick={() => setType(presetType)}
                                            className={cn(
                                                "px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
                                                type === presetType
                                                    ? "bg-primary text-primary-foreground"
                                                    : "border hover:bg-accent"
                                            )}
                                        >
                                            <span>{preset.icon}</span>
                                            <span>{preset.label}</span>
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    </div>

                    {/* 제목 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            제목
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="일정 제목을 입력하세요"
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* 시간 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            시간
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-muted-foreground">~</span>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    {/* 메모 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            메모 (선택)
                        </label>
                        <textarea
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="추가 메모를 입력하세요"
                            rows={2}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim()}
                        className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                        {editEvent ? "수정" : "추가"}
                    </button>
                </div>
            </div>
        </div>
    );
}
