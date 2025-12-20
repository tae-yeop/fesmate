"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
    MyTimetable,
    CustomEvent,
    SharedTimetable,
    TimetableItem,
    SlotMarkType,
    SlotMark,
    SLOT_MARK_PRESETS,
    generateShareId,
    findConflicts,
    TimeConflict,
    getCheckedSlotIdsFromMarks,
} from "@/types/my-timetable";
import { Slot } from "@/types/event";

const STORAGE_KEY = "fesmate_my_timetables_v2";
const SHARED_STORAGE_KEY = "fesmate_shared_timetables_v2";

interface MyTimetableContextType {
    // 슬롯 마킹 (새로운 방식)
    getSlotMark: (eventId: string, slotId: string) => SlotMark | undefined;
    setSlotMark: (eventId: string, slotId: string, markType: SlotMarkType, memo?: string) => void;
    clearSlotMark: (eventId: string, slotId: string) => void;
    getMarkedSlots: (eventId: string) => SlotMark[];

    // 하위 호환 - 기존 체크 방식 (watch 마킹으로 처리)
    isSlotChecked: (eventId: string, slotId: string) => boolean;
    toggleSlotCheck: (eventId: string, slotId: string) => void;
    getCheckedSlotIds: (eventId: string) => string[];

    // 커스텀 이벤트 (빈 시간에 추가)
    addCustomEvent: (eventId: string, event: Omit<CustomEvent, "id" | "eventId" | "createdAt">) => void;
    updateCustomEvent: (eventId: string, eventItemId: string, updates: Partial<CustomEvent>) => void;
    deleteCustomEvent: (eventId: string, eventItemId: string) => void;
    getCustomEvents: (eventId: string) => CustomEvent[];

    // 타임테이블 전체
    getMyTimetable: (eventId: string) => MyTimetable | null;
    clearMyTimetable: (eventId: string) => void;

    // 통합 뷰 (마킹된 슬롯 + 커스텀 이벤트)
    getTimetableItems: (eventId: string, slots: Slot[], ownerNickname?: string, ownerColor?: string) => TimetableItem[];

    // 충돌 감지
    getConflicts: (eventId: string, slots: Slot[]) => TimeConflict[];

    // 공유
    createShareLink: (eventId: string, nickname: string) => string;
    addSharedTimetable: (shareId: string, timetable: SharedTimetable) => void;
    getSharedTimetables: (eventId: string) => SharedTimetable[];
    removeSharedTimetable: (shareId: string) => void;

    // 오버레이 뷰
    getOverlayItems: (eventId: string, slots: Slot[], myNickname: string) => {
        items: TimetableItem[];
        together: TimetableItem[][]; // 함께 보는 슬롯 그룹
        alone: TimetableItem[]; // 나만 보는 슬롯
    };
}

const MyTimetableContext = createContext<MyTimetableContextType | null>(null);

// 색상 팔레트 (오버레이용)
const OVERLAY_COLORS = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // violet
    "#EC4899", // pink
];

export function MyTimetableProvider({ children }: { children: ReactNode }) {
    const [timetables, setTimetables] = useState<Record<string, MyTimetable>>({});
    const [sharedTimetables, setSharedTimetables] = useState<SharedTimetable[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // localStorage에서 로드
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Date 변환
                Object.keys(parsed).forEach(eventId => {
                    if (parsed[eventId].customEvents) {
                        parsed[eventId].customEvents = parsed[eventId].customEvents.map((e: CustomEvent) => ({
                            ...e,
                            startAt: new Date(e.startAt),
                            endAt: new Date(e.endAt),
                            createdAt: new Date(e.createdAt),
                        }));
                    }
                    parsed[eventId].updatedAt = new Date(parsed[eventId].updatedAt);
                    // 이전 버전 마이그레이션: checkedSlotIds -> slotMarks
                    if (parsed[eventId].checkedSlotIds && !parsed[eventId].slotMarks) {
                        parsed[eventId].slotMarks = parsed[eventId].checkedSlotIds.map((id: string) => ({
                            slotId: id,
                            type: "watch" as SlotMarkType,
                        }));
                        delete parsed[eventId].checkedSlotIds;
                    }
                });
                setTimetables(parsed);
            }

            const sharedStored = localStorage.getItem(SHARED_STORAGE_KEY);
            if (sharedStored) {
                const parsedShared = JSON.parse(sharedStored);
                setSharedTimetables(parsedShared.map((s: SharedTimetable) => ({
                    ...s,
                    sharedAt: new Date(s.sharedAt),
                    customEvents: (s.customEvents || []).map(e => ({
                        ...e,
                        startAt: new Date(e.startAt),
                        endAt: new Date(e.endAt),
                        createdAt: new Date(e.createdAt),
                    })),
                })));
            }
        } catch (e) {
            console.error("Failed to load timetables:", e);
        }
        setIsLoaded(true);
    }, []);

    // localStorage에 저장
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(timetables));
        }
    }, [timetables, isLoaded]);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify(sharedTimetables));
        }
    }, [sharedTimetables, isLoaded]);

    // 타임테이블 가져오기 (없으면 생성)
    const getOrCreateTimetable = useCallback((eventId: string): MyTimetable => {
        if (timetables[eventId]) {
            return timetables[eventId];
        }
        return {
            eventId,
            slotMarks: [],
            customEvents: [],
            updatedAt: new Date(),
        };
    }, [timetables]);

    // 슬롯 마킹 가져오기
    const getSlotMark = useCallback((eventId: string, slotId: string): SlotMark | undefined => {
        return timetables[eventId]?.slotMarks.find(m => m.slotId === slotId);
    }, [timetables]);

    // 슬롯 마킹 설정
    const setSlotMark = useCallback((eventId: string, slotId: string, markType: SlotMarkType, memo?: string) => {
        setTimetables(prev => {
            const current = prev[eventId] || {
                eventId,
                slotMarks: [],
                customEvents: [],
                updatedAt: new Date(),
            };

            // 기존 마킹 제거하고 새로 추가
            const newMarks = current.slotMarks.filter(m => m.slotId !== slotId);
            newMarks.push({ slotId, type: markType, memo });

            return {
                ...prev,
                [eventId]: {
                    ...current,
                    slotMarks: newMarks,
                    updatedAt: new Date(),
                },
            };
        });
    }, []);

    // 슬롯 마킹 제거
    const clearSlotMark = useCallback((eventId: string, slotId: string) => {
        setTimetables(prev => {
            const current = prev[eventId];
            if (!current) return prev;

            return {
                ...prev,
                [eventId]: {
                    ...current,
                    slotMarks: current.slotMarks.filter(m => m.slotId !== slotId),
                    updatedAt: new Date(),
                },
            };
        });
    }, []);

    // 마킹된 슬롯 목록
    const getMarkedSlots = useCallback((eventId: string): SlotMark[] => {
        return timetables[eventId]?.slotMarks ?? [];
    }, [timetables]);

    // 하위 호환: 슬롯 체크 여부 (watch 마킹으로 처리)
    const isSlotChecked = useCallback((eventId: string, slotId: string): boolean => {
        const mark = getSlotMark(eventId, slotId);
        return mark?.type === "watch";
    }, [getSlotMark]);

    // 하위 호환: 슬롯 체크 토글
    const toggleSlotCheck = useCallback((eventId: string, slotId: string) => {
        const currentMark = getSlotMark(eventId, slotId);
        if (currentMark?.type === "watch") {
            clearSlotMark(eventId, slotId);
        } else {
            setSlotMark(eventId, slotId, "watch");
        }
    }, [getSlotMark, clearSlotMark, setSlotMark]);

    // 하위 호환: 체크된 슬롯 ID 목록
    const getCheckedSlotIds = useCallback((eventId: string): string[] => {
        const marks = timetables[eventId]?.slotMarks ?? [];
        return getCheckedSlotIdsFromMarks(marks);
    }, [timetables]);

    // 커스텀 이벤트 추가
    const addCustomEvent = useCallback((
        eventId: string,
        event: Omit<CustomEvent, "id" | "eventId" | "createdAt">
    ) => {
        setTimetables(prev => {
            const current = getOrCreateTimetable(eventId);
            const newEvent: CustomEvent = {
                ...event,
                id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                eventId,
                createdAt: new Date(),
            };

            return {
                ...prev,
                [eventId]: {
                    ...current,
                    customEvents: [...(current.customEvents || []), newEvent],
                    updatedAt: new Date(),
                },
            };
        });
    }, [getOrCreateTimetable]);

    // 커스텀 이벤트 수정
    const updateCustomEvent = useCallback((
        eventId: string,
        eventItemId: string,
        updates: Partial<CustomEvent>
    ) => {
        setTimetables(prev => {
            const current = prev[eventId];
            if (!current) return prev;

            return {
                ...prev,
                [eventId]: {
                    ...current,
                    customEvents: (current.customEvents || []).map(e =>
                        e.id === eventItemId ? { ...e, ...updates } : e
                    ),
                    updatedAt: new Date(),
                },
            };
        });
    }, []);

    // 커스텀 이벤트 삭제
    const deleteCustomEvent = useCallback((eventId: string, eventItemId: string) => {
        setTimetables(prev => {
            const current = prev[eventId];
            if (!current) return prev;

            return {
                ...prev,
                [eventId]: {
                    ...current,
                    customEvents: (current.customEvents || []).filter(e => e.id !== eventItemId),
                    updatedAt: new Date(),
                },
            };
        });
    }, []);

    // 커스텀 이벤트 목록
    const getCustomEvents = useCallback((eventId: string): CustomEvent[] => {
        return timetables[eventId]?.customEvents ?? [];
    }, [timetables]);

    // 타임테이블 가져오기
    const getMyTimetable = useCallback((eventId: string): MyTimetable | null => {
        return timetables[eventId] ?? null;
    }, [timetables]);

    // 타임테이블 초기화
    const clearMyTimetable = useCallback((eventId: string) => {
        setTimetables(prev => {
            const { [eventId]: removed, ...rest } = prev;
            return rest;
        });
    }, []);

    // 통합 뷰 아이템 (마킹된 슬롯 + 커스텀 이벤트)
    const getTimetableItems = useCallback((
        eventId: string,
        slots: Slot[],
        ownerNickname?: string,
        ownerColor?: string
    ): TimetableItem[] => {
        const timetable = timetables[eventId];
        const items: TimetableItem[] = [];

        // 마킹된 슬롯 추가 (모든 마킹 타입)
        const slotMarks = timetable?.slotMarks ?? [];
        slots.forEach(slot => {
            const mark = slotMarks.find(m => m.slotId === slot.id);
            if (mark) {
                items.push({
                    id: slot.id,
                    type: "slot",
                    title: slot.title || slot.artist?.name || "무제",
                    startAt: new Date(slot.startAt),
                    endAt: new Date(slot.endAt),
                    stage: slot.stage,
                    slotMarkType: mark.type,
                    memo: mark.memo,
                    ownerNickname,
                    ownerColor,
                });
            }
        });

        // 커스텀 이벤트 추가
        (timetable?.customEvents ?? []).forEach(event => {
            items.push({
                id: event.id,
                type: "custom",
                title: event.title,
                startAt: new Date(event.startAt),
                endAt: new Date(event.endAt),
                customEventType: event.type,
                memo: event.memo,
                ownerNickname,
                ownerColor,
            });
        });

        // 시간순 정렬
        return items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }, [timetables]);

    // 충돌 감지 (watch 마킹된 슬롯만 대상)
    const getConflicts = useCallback((eventId: string, slots: Slot[]): TimeConflict[] => {
        const timetable = timetables[eventId];
        const watchMarks = (timetable?.slotMarks ?? []).filter(m => m.type === "watch");

        const watchItems: TimetableItem[] = [];
        slots.forEach(slot => {
            const mark = watchMarks.find(m => m.slotId === slot.id);
            if (mark) {
                watchItems.push({
                    id: slot.id,
                    type: "slot",
                    title: slot.title || slot.artist?.name || "무제",
                    startAt: new Date(slot.startAt),
                    endAt: new Date(slot.endAt),
                    stage: slot.stage,
                    slotMarkType: "watch",
                });
            }
        });

        return findConflicts(watchItems);
    }, [timetables]);

    // 공유 링크 생성
    const createShareLink = useCallback((eventId: string, nickname: string): string => {
        const timetable = timetables[eventId];
        if (!timetable) return "";

        const shareId = generateShareId();
        const sharedTimetable: SharedTimetable = {
            id: shareId,
            eventId,
            ownerNickname: nickname,
            slotMarks: timetable.slotMarks,
            customEvents: timetable.customEvents || [],
            sharedAt: new Date(),
        };

        setSharedTimetables(prev => [...prev, sharedTimetable]);

        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        return `${baseUrl}/event/${eventId}?share=${shareId}`;
    }, [timetables]);

    // 공유 타임테이블 추가
    const addSharedTimetable = useCallback((shareId: string, timetable: SharedTimetable) => {
        setSharedTimetables(prev => {
            if (prev.some(s => s.id === shareId)) return prev;
            return [...prev, timetable];
        });
    }, []);

    // 공유 타임테이블 목록 (특정 행사)
    const getSharedTimetables = useCallback((eventId: string): SharedTimetable[] => {
        return sharedTimetables.filter(s => s.eventId === eventId);
    }, [sharedTimetables]);

    // 공유 타임테이블 제거
    const removeSharedTimetable = useCallback((shareId: string) => {
        setSharedTimetables(prev => prev.filter(s => s.id !== shareId));
    }, []);

    // 오버레이 뷰
    const getOverlayItems = useCallback((
        eventId: string,
        slots: Slot[],
        myNickname: string
    ): {
        items: TimetableItem[];
        together: TimetableItem[][];
        alone: TimetableItem[];
    } => {
        // 내 아이템 (watch 마킹만)
        const myItems = getTimetableItems(eventId, slots, myNickname, OVERLAY_COLORS[0])
            .filter(item => item.slotMarkType === "watch" || item.type === "custom");
        const myItemsWithOwner = myItems.map(item => ({ ...item, ownerId: "me" }));

        // 친구 아이템
        const sharedItems: TimetableItem[] = [];
        const shared = getSharedTimetables(eventId);
        shared.forEach((s, index) => {
            const color = OVERLAY_COLORS[(index + 1) % OVERLAY_COLORS.length];
            const watchMarks = s.slotMarks.filter(m => m.type === "watch");

            watchMarks.forEach(mark => {
                const slot = slots.find(sl => sl.id === mark.slotId);
                if (slot) {
                    sharedItems.push({
                        id: `${s.id}-${slot.id}`,
                        type: "slot",
                        title: slot.title || slot.artist?.name || "무제",
                        startAt: new Date(slot.startAt),
                        endAt: new Date(slot.endAt),
                        stage: slot.stage,
                        slotMarkType: "watch",
                        ownerId: s.id,
                        ownerNickname: s.ownerNickname,
                        ownerColor: color,
                    });
                }
            });
        });

        // 전체 아이템
        const allItems = [...myItemsWithOwner, ...sharedItems].sort(
            (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        );

        // 함께 보는 슬롯 찾기
        const slotOwners: Record<string, TimetableItem[]> = {};
        allItems.filter(item => item.type === "slot" && item.slotMarkType === "watch").forEach(item => {
            const originalId = item.id.includes("-") ? item.id.split("-").pop()! : item.id;
            if (!slotOwners[originalId]) slotOwners[originalId] = [];
            slotOwners[originalId].push(item);
        });

        const together: TimetableItem[][] = [];
        const alone: TimetableItem[] = [];

        Object.values(slotOwners).forEach(items => {
            if (items.length > 1) {
                together.push(items);
            } else if (items[0].ownerId === "me") {
                alone.push(items[0]);
            }
        });

        return { items: allItems, together, alone };
    }, [getTimetableItems, getSharedTimetables]);

    return (
        <MyTimetableContext.Provider
            value={{
                getSlotMark,
                setSlotMark,
                clearSlotMark,
                getMarkedSlots,
                isSlotChecked,
                toggleSlotCheck,
                getCheckedSlotIds,
                addCustomEvent,
                updateCustomEvent,
                deleteCustomEvent,
                getCustomEvents,
                getMyTimetable,
                clearMyTimetable,
                getTimetableItems,
                getConflicts,
                createShareLink,
                addSharedTimetable,
                getSharedTimetables,
                removeSharedTimetable,
                getOverlayItems,
            }}
        >
            {children}
        </MyTimetableContext.Provider>
    );
}

export function useMyTimetable() {
    const context = useContext(MyTimetableContext);
    if (!context) {
        throw new Error("useMyTimetable must be used within MyTimetableProvider");
    }
    return context;
}
