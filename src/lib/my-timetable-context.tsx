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
import { useDevContext } from "./dev-context";

// 사용자별 storage key 생성
const getStorageKey = (userId: string) => `fesmate_my_timetables_${userId}`;
const getSharedStorageKey = (userId: string) => `fesmate_shared_timetables_${userId}`;
const getOverlayStorageKey = (userId: string) => `fesmate_overlay_friends_${userId}`;

// Mock: 친구들의 타임테이블 (실제로는 서버에서 가져와야 함)
// 각 사용자별, 행사별 슬롯 마킹 데이터
// 실제 슬롯 ID 참조: pp-d{day}-s{stage}-{order}
// Day1: NELL(pp-d1-s1-1), Jaurim(pp-d1-s1-2), Hyukoh(pp-d1-s1-3), YB(pp-d1-s1-4), Headline(pp-d1-s1-5)
// Day2: s1: 1,2,3,4,5 / s2: 1,2,3,4,5
// Day3: s1: 1,2,3,4,5
const MOCK_FRIEND_TIMETABLES: Record<string, Record<string, SlotMark[]>> = {
    // user2 (록페스러버)의 타임테이블 - user1과 Hyukoh(pp-d1-s1-3) 겹침
    user2: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // NELL
            { slotId: "pp-d1-s1-3", type: "watch" },  // Hyukoh ← user1과 겹치는 슬롯
            { slotId: "pp-d2-s1-1", type: "watch" },  // Day2 첫 공연
            { slotId: "pp-d2-s1-4", type: "watch" },  // Day2 네번째
        ],
        e2: [
            { slotId: "slot1", type: "watch" },
            { slotId: "slot3", type: "watch" },
        ],
    },
    // user3 (인디키드)의 타임테이블
    user3: {
        pentaport: [
            { slotId: "pp-d1-s1-2", type: "watch" },  // Jaurim
            { slotId: "pp-d1-s2-1", type: "watch" },  // Jazz Stage
            { slotId: "pp-d2-s2-2", type: "watch" },
        ],
        e2: [
            { slotId: "slot2", type: "watch" },
            { slotId: "slot3", type: "watch" },
        ],
    },
    // user4 (투어러)의 타임테이블
    user4: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // NELL
            { slotId: "pp-d1-s1-3", type: "watch" },  // Hyukoh ← user1과 겹칠 수 있음
            { slotId: "pp-d2-s1-2", type: "watch" },
            { slotId: "pp-d3-s1-1", type: "watch" },
        ],
    },
};

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

    // 공유 (기존 - 링크 방식)
    createShareLink: (eventId: string, nickname: string) => string;
    addSharedTimetable: (shareId: string, timetable: SharedTimetable) => void;
    getSharedTimetables: (eventId: string) => SharedTimetable[];
    removeSharedTimetable: (shareId: string) => void;

    // 친구 타임테이블 (새로운 방식 - 친구 목록에서 선택)
    getFriendTimetable: (userId: string, eventId: string) => SlotMark[] | null;
    addFriendToOverlay: (userId: string, userNickname: string, eventId: string) => void;
    removeFriendFromOverlay: (userId: string, eventId: string) => void;
    getOverlayFriends: (eventId: string) => { userId: string; nickname: string }[];

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
    const { mockUserId, isLoggedIn } = useDevContext();
    const currentUserId = mockUserId || "guest";

    const [timetables, setTimetables] = useState<Record<string, MyTimetable>>({});
    const [sharedTimetables, setSharedTimetables] = useState<SharedTimetable[]>([]);
    // 행사별 오버레이에 추가된 친구 목록: { [eventId]: [{ userId, nickname }] }
    const [overlayFriends, setOverlayFriends] = useState<Record<string, { userId: string; nickname: string }[]>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

    // 사용자 변경 또는 초기 로드 시 localStorage에서 로드
    useEffect(() => {
        // 로그아웃 상태면 빈 데이터 사용
        if (!isLoggedIn) {
            setTimetables({});
            setSharedTimetables([]);
            setOverlayFriends({});
            setIsLoaded(true);
            setLoadedUserId(null);
            return;
        }

        // 같은 사용자면 다시 로드하지 않음
        if (loadedUserId === currentUserId) return;

        try {
            const stored = localStorage.getItem(getStorageKey(currentUserId));
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
            } else {
                setTimetables({});
            }

            const sharedStored = localStorage.getItem(getSharedStorageKey(currentUserId));
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
            } else {
                setSharedTimetables([]);
            }

            // overlayFriends 로드
            const overlayStored = localStorage.getItem(getOverlayStorageKey(currentUserId));
            if (overlayStored) {
                setOverlayFriends(JSON.parse(overlayStored));
            } else {
                setOverlayFriends({});
            }
        } catch (e) {
            console.error("Failed to load timetables:", e);
            setTimetables({});
            setSharedTimetables([]);
            setOverlayFriends({});
        }
        setLoadedUserId(currentUserId);
        setIsLoaded(true);
    }, [currentUserId, isLoggedIn, loadedUserId]);

    // localStorage에 저장 (로그인 상태에서만)
    useEffect(() => {
        if (isLoaded && isLoggedIn && loadedUserId === currentUserId) {
            localStorage.setItem(getStorageKey(currentUserId), JSON.stringify(timetables));
        }
    }, [timetables, isLoaded, isLoggedIn, currentUserId, loadedUserId]);

    useEffect(() => {
        if (isLoaded && isLoggedIn && loadedUserId === currentUserId) {
            localStorage.setItem(getSharedStorageKey(currentUserId), JSON.stringify(sharedTimetables));
        }
    }, [sharedTimetables, isLoaded, isLoggedIn, currentUserId, loadedUserId]);

    useEffect(() => {
        if (isLoaded && isLoggedIn && loadedUserId === currentUserId) {
            localStorage.setItem(getOverlayStorageKey(currentUserId), JSON.stringify(overlayFriends));
        }
    }, [overlayFriends, isLoaded, isLoggedIn, currentUserId, loadedUserId]);

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

        // 친구 아이템 (기존 공유 방식 + 새로운 친구 선택 방식)
        const friendItems: TimetableItem[] = [];
        let colorIndex = 1;

        // 1. 기존 공유 링크 방식 (SharedTimetable)
        const shared = getSharedTimetables(eventId);
        shared.forEach((s) => {
            const color = OVERLAY_COLORS[colorIndex % OVERLAY_COLORS.length];
            colorIndex++;
            const watchMarks = s.slotMarks.filter(m => m.type === "watch");

            watchMarks.forEach(mark => {
                const slot = slots.find(sl => sl.id === mark.slotId);
                if (slot) {
                    friendItems.push({
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

        // 2. 새로운 친구 선택 방식 (overlayFriends + MOCK_FRIEND_TIMETABLES)
        const friends = overlayFriends[eventId] || [];
        friends.forEach((friend) => {
            const friendMarks = MOCK_FRIEND_TIMETABLES[friend.userId]?.[eventId];
            if (!friendMarks) return;

            const color = OVERLAY_COLORS[colorIndex % OVERLAY_COLORS.length];
            colorIndex++;
            const watchMarks = friendMarks.filter(m => m.type === "watch");

            watchMarks.forEach(mark => {
                const slot = slots.find(sl => sl.id === mark.slotId);
                if (slot) {
                    friendItems.push({
                        id: `${friend.userId}-${slot.id}`,
                        type: "slot",
                        title: slot.title || slot.artist?.name || "무제",
                        startAt: new Date(slot.startAt),
                        endAt: new Date(slot.endAt),
                        stage: slot.stage,
                        slotMarkType: "watch",
                        ownerId: friend.userId,
                        ownerNickname: friend.nickname,
                        ownerColor: color,
                    });
                }
            });
        });

        // 전체 아이템
        const allItems = [...myItemsWithOwner, ...friendItems].sort(
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
    }, [getTimetableItems, getSharedTimetables, overlayFriends]);

    // 친구 타임테이블 가져오기 (Mock 데이터에서)
    const getFriendTimetable = useCallback((userId: string, eventId: string): SlotMark[] | null => {
        const userTimetables = MOCK_FRIEND_TIMETABLES[userId];
        if (!userTimetables) return null;
        return userTimetables[eventId] || null;
    }, []);

    // 오버레이에 친구 추가
    const addFriendToOverlay = useCallback((userId: string, userNickname: string, eventId: string) => {
        setOverlayFriends(prev => {
            const eventFriends = prev[eventId] || [];
            // 이미 추가된 친구인지 확인
            if (eventFriends.some(f => f.userId === userId)) {
                return prev;
            }
            return {
                ...prev,
                [eventId]: [...eventFriends, { userId, nickname: userNickname }],
            };
        });
    }, []);

    // 오버레이에서 친구 제거
    const removeFriendFromOverlay = useCallback((userId: string, eventId: string) => {
        setOverlayFriends(prev => {
            const eventFriends = prev[eventId] || [];
            return {
                ...prev,
                [eventId]: eventFriends.filter(f => f.userId !== userId),
            };
        });
    }, []);

    // 오버레이에 추가된 친구 목록 가져오기
    const getOverlayFriends = useCallback((eventId: string): { userId: string; nickname: string }[] => {
        return overlayFriends[eventId] || [];
    }, [overlayFriends]);

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
                getFriendTimetable,
                addFriendToOverlay,
                removeFriendFromOverlay,
                getOverlayFriends,
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
