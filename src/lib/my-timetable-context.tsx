"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
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
import { useAuth } from "./auth-context";
import { createUserAdapter, DOMAINS } from "./storage";
import { isValidUUID } from "./utils";
import {
    getUserSlotMarks as getSlotMarksFromDB,
    getAllUserSlotMarks,
    setSlotMark as setSlotMarkInDB,
    deleteSlotMark as deleteSlotMarkFromDB,
    getCustomEvents as getCustomEventsFromDB,
    getAllCustomEvents,
    createCustomEvent as createCustomEventInDB,
    updateCustomEvent as updateCustomEventInDB,
    deleteCustomEvent as deleteCustomEventFromDB,
    SlotMark as DbSlotMark,
    CustomEvent as DbCustomEvent,
} from "./supabase/queries";

// Storage adapter factories (userId 기반)
// Note: MyTimetable과 SharedTimetable은 Date 필드가 중첩 객체에 있어서
// 수동 Date 복원을 수행합니다.
const createTimetablesAdapter = createUserAdapter<Record<string, MyTimetable>>({
    domain: DOMAINS.TIMETABLES,
});

const createSharedAdapter = createUserAdapter<SharedTimetable[]>({
    domain: DOMAINS.SHARED_TIMETABLES,
});

const createOverlayAdapter = createUserAdapter<Record<string, { userId: string; nickname: string }[]>>({
    domain: DOMAINS.OVERLAY_FRIENDS,
});

// Mock: 친구들의 타임테이블 (실제로는 서버에서 가져와야 함)
// 각 사용자별, 행사별 슬롯 마킹 데이터
// pentaport 슬롯 ID: pp-d{day}-s{stage}-{order} (3일, 3스테이지)
// e2 (Seoul Jazz Festival) 슬롯 ID: slot1~slot14
const MOCK_FRIEND_TIMETABLES: Record<string, Record<string, SlotMark[]>> = {
    // user1 (페스티벌러) - crew1, crew2 멤버
    user1: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - BTS (공통!)
            { slotId: "pp-d1-s2-1", type: "watch" },  // Day1 Second - NewJeans
            { slotId: "pp-d2-s1-1", type: "watch" },  // Day2 Main - IVE (공통!)
        ],
        e2: [
            { slotId: "slot1", type: "watch" },
            { slotId: "slot3", type: "watch" },
        ],
    },
    // user2 (록페스러버) - crew1 리더
    user2: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - BTS (공통!)
            { slotId: "pp-d1-s1-2", type: "watch" },  // Day1 Main - aespa
            { slotId: "pp-d2-s1-1", type: "watch" },  // Day2 Main - IVE (공통!)
            { slotId: "pp-d3-s1-1", type: "watch" },  // Day3 Main - BIGBANG
        ],
        e2: [
            { slotId: "slot1", type: "watch" },
            { slotId: "slot3", type: "watch" },
            { slotId: "slot6", type: "watch" },
        ],
    },
    // user3 (인디키드) - crew2 리더
    user3: {
        pentaport: [
            { slotId: "pp-d1-s2-1", type: "watch" },  // Day1 Second - NewJeans
            { slotId: "pp-d1-s3-1", type: "watch" },  // Day1 Third
            { slotId: "pp-d2-s2-1", type: "watch" },  // Day2 Second
        ],
        e2: [
            { slotId: "slot2", type: "watch" },
            { slotId: "slot3", type: "watch" },
            { slotId: "slot7", type: "watch" },
        ],
    },
    // user4 (투어러) - crew3 리더
    user4: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - BTS (공통!)
            { slotId: "pp-d2-s1-1", type: "watch" },  // Day2 Main - IVE (공통!)
            { slotId: "pp-d3-s1-1", type: "watch" },  // Day3 Main
        ],
        e2: [
            { slotId: "slot1", type: "watch" },
            { slotId: "slot3", type: "watch" },
            { slotId: "slot8", type: "watch" },
        ],
    },
    // user7 (기타치는곰) - crew1 멤버
    user7: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - BTS (공통!)
            { slotId: "pp-d1-s3-1", type: "watch" },  // Day1 Third
            { slotId: "pp-d2-s1-1", type: "watch" },  // Day2 Main - IVE (공통!)
        ],
        e2: [
            { slotId: "slot3", type: "watch" },
            { slotId: "slot5", type: "watch" },
        ],
    },
    // user8 (드러머킴) - crew1 멤버
    user8: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - Daybreak (공통!)
            { slotId: "pp-d1-s1-2", type: "watch" },  // Day1 Main - The Black Skirts
            { slotId: "pp-d2-s1-1", type: "watch" },  // Day2 Main
        ],
        e2: [
            { slotId: "slot3", type: "watch" },
            { slotId: "slot6", type: "watch" },
        ],
    },
    // user9 (베이시스트) - crew1 멤버 (대규모 크루 테스트용)
    user9: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - Daybreak (공통!)
            { slotId: "pp-d1-s2-1", type: "watch" },  // Day1 Second - Crying Nut (공통!)
            { slotId: "pp-d2-s1-1", type: "watch" },  // Day2 Main
        ],
        e2: [
            { slotId: "slot1", type: "watch" },
            { slotId: "slot4", type: "watch" },
        ],
    },
    // user10 (보컬리스트) - crew1 멤버
    user10: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - Daybreak (공통!)
            { slotId: "pp-d1-s2-1", type: "watch" },  // Day1 Second - Crying Nut (공통!)
            { slotId: "pp-d1-s1-2", type: "watch" },  // Day1 Main - The Black Skirts
        ],
        e2: [
            { slotId: "slot2", type: "watch" },
            { slotId: "slot5", type: "watch" },
        ],
    },
    // user11 (키보디스트) - crew1 멤버
    user11: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - Daybreak (공통!)
            { slotId: "pp-d1-s2-1", type: "watch" },  // Day1 Second - Crying Nut (공통!)
            { slotId: "pp-d3-s1-1", type: "watch" },  // Day3 Main
        ],
        e2: [
            { slotId: "slot3", type: "watch" },
            { slotId: "slot7", type: "watch" },
        ],
    },
    // user12 (퍼커셔니스트) - crew1 멤버
    user12: {
        pentaport: [
            { slotId: "pp-d1-s1-1", type: "watch" },  // Day1 Main - Daybreak (공통!)
            { slotId: "pp-d1-s2-1", type: "watch" },  // Day1 Second - Crying Nut (공통!)
            { slotId: "pp-d2-s2-1", type: "watch" },  // Day2 Second
        ],
        e2: [
            { slotId: "slot1", type: "watch" },
            { slotId: "slot8", type: "watch" },
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

/**
 * DB SlotMark를 Context SlotMark로 변환
 */
function transformDbSlotMark(dbMark: DbSlotMark): SlotMark {
    return {
        slotId: dbMark.slotId,
        type: dbMark.markType as SlotMarkType,
        memo: dbMark.memo,
    };
}

/**
 * DB CustomEvent를 Context CustomEvent로 변환
 */
function transformDbCustomEvent(dbEvent: DbCustomEvent): CustomEvent {
    return {
        id: dbEvent.id,
        eventId: dbEvent.eventId,
        type: dbEvent.type as CustomEvent["type"],
        title: dbEvent.title,
        startAt: dbEvent.startAt,
        endAt: dbEvent.endAt,
        memo: dbEvent.memo,
        createdAt: dbEvent.createdAt,
    };
}

export function MyTimetableProvider({ children }: { children: ReactNode }) {
    const { user: authUser } = useAuth();
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드 또는 비로그인
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId;

    // Dev 모드에서 mockUserId 사용
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (실제 > Dev > guest)
    const currentUserId = realUserId || devUserId || "guest";
    const isLoggedIn = isRealUser || isDevLoggedIn;

    const [timetables, setTimetables] = useState<Record<string, MyTimetable>>({});
    const [sharedTimetables, setSharedTimetables] = useState<SharedTimetable[]>([]);
    // 행사별 오버레이에 추가된 친구 목록: { [eventId]: [{ userId, nickname }] }
    const [overlayFriends, setOverlayFriends] = useState<Record<string, { userId: string; nickname: string }[]>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
    const [isFromSupabase, setIsFromSupabase] = useState(false);

    // Storage adapters (userId 변경 시 재생성) - Dev 모드용
    const timetablesAdapter = useMemo(
        () => (isLoggedIn && !isRealUser) ? createTimetablesAdapter(currentUserId) : null,
        [currentUserId, isLoggedIn, isRealUser]
    );
    const sharedAdapter = useMemo(
        () => (isLoggedIn && !isRealUser) ? createSharedAdapter(currentUserId) : null,
        [currentUserId, isLoggedIn, isRealUser]
    );
    const overlayAdapter = useMemo(
        () => (isLoggedIn && !isRealUser) ? createOverlayAdapter(currentUserId) : null,
        [currentUserId, isLoggedIn, isRealUser]
    );

    // 사용자 변경 또는 초기 로드 시 데이터 로드
    useEffect(() => {
        // 사용자가 변경되었거나 처음 로드하는 경우
        if (loadedUserId !== currentUserId) {
            // 비로그인 상태면 빈 데이터 사용
            if (!isLoggedIn) {
                setTimetables({});
                setSharedTimetables([]);
                setOverlayFriends({});
                setIsLoaded(true);
                setLoadedUserId(currentUserId);
                setIsFromSupabase(false);
                return;
            }

            // 실제 사용자: Supabase에서 로드
            if (isRealUser && realUserId) {
                Promise.all([
                    getAllUserSlotMarks(realUserId),
                    getAllCustomEvents(realUserId),
                ])
                    .then(([slotMarks, customEvents]) => {
                        // SlotMarks를 eventId별로 그룹화
                        const groupedTimetables: Record<string, MyTimetable> = {};

                        // CustomEvents를 eventId별로 그룹화
                        customEvents.forEach((dbEvent) => {
                            const eventId = dbEvent.eventId;
                            if (!groupedTimetables[eventId]) {
                                groupedTimetables[eventId] = {
                                    eventId,
                                    slotMarks: [],
                                    customEvents: [],
                                    updatedAt: new Date(),
                                };
                            }
                            groupedTimetables[eventId].customEvents.push(transformDbCustomEvent(dbEvent));
                        });

                        // SlotMarks 추가 (슬롯의 eventId는 DB에서 join으로 가져와야 하지만,
                        // 현재 구조에서는 slotId만 있으므로 별도 처리 필요)
                        // 현재는 모든 슬롯 마크를 일괄 저장하고, 필요 시 개별 조회
                        slotMarks.forEach((dbMark) => {
                            // slotId에서 eventId를 추출할 수 없으므로
                            // 별도의 "all" 키에 저장하고 런타임에 매칭
                        });

                        // Note: SlotMarks는 slotId 기반이라 eventId가 없음
                        // 실제 사용 시 getMarkedSlots에서 슬롯 목록과 매칭 필요
                        // 일단 모든 슬롯 마크를 별도 상태로 저장
                        const allSlotMarks = slotMarks.map(transformDbSlotMark);

                        // 특별한 키로 모든 슬롯 마크 저장
                        if (allSlotMarks.length > 0 && !groupedTimetables["__all__"]) {
                            groupedTimetables["__all__"] = {
                                eventId: "__all__",
                                slotMarks: allSlotMarks,
                                customEvents: [],
                                updatedAt: new Date(),
                            };
                        } else if (allSlotMarks.length > 0) {
                            groupedTimetables["__all__"].slotMarks = allSlotMarks;
                        }

                        setTimetables(groupedTimetables);
                        setIsFromSupabase(true);
                    })
                    .catch((error) => {
                        console.error("[MyTimetableContext] Supabase load failed:", error);
                        setTimetables({});
                        setIsFromSupabase(false);
                    })
                    .finally(() => {
                        setIsLoaded(true);
                        setLoadedUserId(currentUserId);
                    });
                return;
            }

            // Dev 모드: localStorage에서 로드
            if (timetablesAdapter && sharedAdapter && overlayAdapter) {
                // timetables 로드 (수동 Date 변환)
                const storedTimetables = timetablesAdapter.get();
                if (storedTimetables) {
                    Object.keys(storedTimetables).forEach(eventId => {
                        const timetable = storedTimetables[eventId];
                        if (timetable.customEvents) {
                            timetable.customEvents = timetable.customEvents.map((e: CustomEvent) => ({
                                ...e,
                                startAt: new Date(e.startAt),
                                endAt: new Date(e.endAt),
                                createdAt: new Date(e.createdAt),
                            }));
                        }
                        timetable.updatedAt = new Date(timetable.updatedAt);
                        // 이전 버전 마이그레이션: checkedSlotIds -> slotMarks
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const anyTimetable = timetable as any;
                        if (anyTimetable.checkedSlotIds && !timetable.slotMarks) {
                            timetable.slotMarks = anyTimetable.checkedSlotIds.map((id: string) => ({
                                slotId: id,
                                type: "watch" as SlotMarkType,
                            }));
                            delete anyTimetable.checkedSlotIds;
                        }
                    });
                    setTimetables(storedTimetables);
                } else {
                    setTimetables({});
                }

                // sharedTimetables 로드 (수동 Date 변환)
                const storedShared = sharedAdapter.get();
                if (storedShared) {
                    setSharedTimetables(storedShared.map((s: SharedTimetable) => ({
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

                // overlayFriends 로드 (Date 없음)
                const storedOverlay = overlayAdapter.get();
                setOverlayFriends(storedOverlay || {});
            }

            setLoadedUserId(currentUserId);
            setIsLoaded(true);
            setIsFromSupabase(false);
        }
    }, [currentUserId, isLoggedIn, isRealUser, realUserId, loadedUserId, timetablesAdapter, sharedAdapter, overlayAdapter]);

    // Storage에 저장 (Dev 모드일 때만 localStorage에 저장 - 실제 사용자는 Supabase에 직접 저장)
    useEffect(() => {
        if (isLoaded && !isRealUser && loadedUserId === currentUserId && timetablesAdapter) {
            timetablesAdapter.set(timetables);
        }
    }, [timetables, isLoaded, isRealUser, currentUserId, loadedUserId, timetablesAdapter]);

    useEffect(() => {
        if (isLoaded && !isRealUser && loadedUserId === currentUserId && sharedAdapter) {
            sharedAdapter.set(sharedTimetables);
        }
    }, [sharedTimetables, isLoaded, isRealUser, currentUserId, loadedUserId, sharedAdapter]);

    useEffect(() => {
        if (isLoaded && !isRealUser && loadedUserId === currentUserId && overlayAdapter) {
            overlayAdapter.set(overlayFriends);
        }
    }, [overlayFriends, isLoaded, isRealUser, currentUserId, loadedUserId, overlayAdapter]);

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
        // 먼저 해당 eventId에서 찾기
        const eventMark = timetables[eventId]?.slotMarks.find(m => m.slotId === slotId);
        if (eventMark) return eventMark;

        // Supabase에서 로드한 경우 __all__ 키에서 찾기
        if (isFromSupabase) {
            return timetables["__all__"]?.slotMarks.find(m => m.slotId === slotId);
        }

        return undefined;
    }, [timetables, isFromSupabase]);

    // 슬롯 마킹 설정
    const setSlotMarkFn = useCallback((eventId: string, slotId: string, markType: SlotMarkType, memo?: string) => {
        // Optimistic update
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

            // __all__ 키에서도 제거하고 추가 (Supabase 모드)
            const allMarks = prev["__all__"]?.slotMarks || [];
            const newAllMarks = allMarks.filter(m => m.slotId !== slotId);
            newAllMarks.push({ slotId, type: markType, memo });

            return {
                ...prev,
                [eventId]: {
                    ...current,
                    slotMarks: newMarks,
                    updatedAt: new Date(),
                },
                "__all__": {
                    eventId: "__all__",
                    slotMarks: newAllMarks,
                    customEvents: prev["__all__"]?.customEvents || [],
                    updatedAt: new Date(),
                },
            };
        });

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(slotId)) {
            setSlotMarkInDB(realUserId, slotId, markType, memo).catch((error) => {
                console.error("[MyTimetableContext] setSlotMark failed:", error);
                // 롤백은 복잡하므로 에러 로깅만
            });
        }
    }, [isRealUser, realUserId]);

    // 슬롯 마킹 제거
    const clearSlotMark = useCallback((eventId: string, slotId: string) => {
        // Optimistic update
        setTimetables(prev => {
            const current = prev[eventId];
            const result = { ...prev };

            if (current) {
                result[eventId] = {
                    ...current,
                    slotMarks: current.slotMarks.filter(m => m.slotId !== slotId),
                    updatedAt: new Date(),
                };
            }

            // __all__ 키에서도 제거 (Supabase 모드)
            if (prev["__all__"]) {
                result["__all__"] = {
                    ...prev["__all__"],
                    slotMarks: prev["__all__"].slotMarks.filter(m => m.slotId !== slotId),
                    updatedAt: new Date(),
                };
            }

            return result;
        });

        // 로그인 + 유효한 UUID인 경우에만 Supabase에서 삭제
        if (isRealUser && realUserId && isValidUUID(slotId)) {
            deleteSlotMarkFromDB(realUserId, slotId).catch((error) => {
                console.error("[MyTimetableContext] clearSlotMark failed:", error);
            });
        }
    }, [isRealUser, realUserId]);

    // 마킹된 슬롯 목록
    const getMarkedSlots = useCallback((eventId: string): SlotMark[] => {
        // 해당 eventId의 마크 반환
        const eventMarks = timetables[eventId]?.slotMarks ?? [];
        if (eventMarks.length > 0) return eventMarks;

        // Supabase 모드에서는 __all__에서도 확인 (slotId 기반 필터링은 호출자가 처리)
        if (isFromSupabase) {
            return timetables["__all__"]?.slotMarks ?? [];
        }

        return [];
    }, [timetables, isFromSupabase]);

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
            setSlotMarkFn(eventId, slotId, "watch");
        }
    }, [getSlotMark, clearSlotMark, setSlotMarkFn]);

    // 하위 호환: 체크된 슬롯 ID 목록
    const getCheckedSlotIds = useCallback((eventId: string): string[] => {
        const marks = timetables[eventId]?.slotMarks ?? [];
        return getCheckedSlotIdsFromMarks(marks);
    }, [timetables]);

    // 커스텀 이벤트 추가
    const addCustomEventFn = useCallback((
        eventId: string,
        event: Omit<CustomEvent, "id" | "eventId" | "createdAt">
    ) => {
        const tempId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newEvent: CustomEvent = {
            ...event,
            id: tempId,
            eventId,
            createdAt: new Date(),
        };

        // Optimistic update
        setTimetables(prev => {
            const current = getOrCreateTimetable(eventId);

            return {
                ...prev,
                [eventId]: {
                    ...current,
                    customEvents: [...(current.customEvents || []), newEvent],
                    updatedAt: new Date(),
                },
            };
        });

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(eventId)) {
            createCustomEventInDB({
                userId: realUserId,
                eventId,
                type: event.type,
                title: event.title,
                startAt: event.startAt,
                endAt: event.endAt,
                memo: event.memo,
            })
                .then((dbEvent) => {
                    // DB에서 반환된 실제 ID로 교체
                    setTimetables(prev => {
                        const current = prev[eventId];
                        if (!current) return prev;

                        return {
                            ...prev,
                            [eventId]: {
                                ...current,
                                customEvents: current.customEvents.map(e =>
                                    e.id === tempId ? { ...e, id: dbEvent.id } : e
                                ),
                            },
                        };
                    });
                })
                .catch((error) => {
                    console.error("[MyTimetableContext] addCustomEvent failed:", error);
                    // 롤백
                    setTimetables(prev => {
                        const current = prev[eventId];
                        if (!current) return prev;

                        return {
                            ...prev,
                            [eventId]: {
                                ...current,
                                customEvents: current.customEvents.filter(e => e.id !== tempId),
                            },
                        };
                    });
                });
        }
    }, [getOrCreateTimetable, isRealUser, realUserId]);

    // 커스텀 이벤트 수정
    const updateCustomEventFn = useCallback((
        eventId: string,
        eventItemId: string,
        updates: Partial<CustomEvent>
    ) => {
        const originalEvent = timetables[eventId]?.customEvents?.find(e => e.id === eventItemId);

        // Optimistic update
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

        // 로그인 + 유효한 UUID인 경우에만 Supabase에 저장
        if (isRealUser && realUserId && isValidUUID(eventItemId)) {
            updateCustomEventInDB(eventItemId, {
                type: updates.type,
                title: updates.title,
                startAt: updates.startAt,
                endAt: updates.endAt,
                memo: updates.memo !== undefined ? (updates.memo ?? null) : undefined,
            }).catch((error) => {
                console.error("[MyTimetableContext] updateCustomEvent failed:", error);
                // 롤백
                if (originalEvent) {
                    setTimetables(prev => {
                        const current = prev[eventId];
                        if (!current) return prev;

                        return {
                            ...prev,
                            [eventId]: {
                                ...current,
                                customEvents: current.customEvents.map(e =>
                                    e.id === eventItemId ? originalEvent : e
                                ),
                            },
                        };
                    });
                }
            });
        }
    }, [timetables, isRealUser, realUserId]);

    // 커스텀 이벤트 삭제
    const deleteCustomEventFn = useCallback((eventId: string, eventItemId: string) => {
        const originalEvent = timetables[eventId]?.customEvents?.find(e => e.id === eventItemId);

        // Optimistic update
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

        // 로그인 + 유효한 UUID인 경우에만 Supabase에서 삭제
        if (isRealUser && realUserId && isValidUUID(eventItemId)) {
            deleteCustomEventFromDB(eventItemId).catch((error) => {
                console.error("[MyTimetableContext] deleteCustomEvent failed:", error);
                // 롤백
                if (originalEvent) {
                    setTimetables(prev => {
                        const current = prev[eventId];
                        if (!current) return prev;

                        return {
                            ...prev,
                            [eventId]: {
                                ...current,
                                customEvents: [...current.customEvents, originalEvent],
                            },
                        };
                    });
                }
            });
        }
    }, [timetables, isRealUser, realUserId]);

    // 커스텀 이벤트 목록
    const getCustomEventsFn = useCallback((eventId: string): CustomEvent[] => {
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
                setSlotMark: setSlotMarkFn,
                clearSlotMark,
                getMarkedSlots,
                isSlotChecked,
                toggleSlotCheck,
                getCheckedSlotIds,
                addCustomEvent: addCustomEventFn,
                updateCustomEvent: updateCustomEventFn,
                deleteCustomEvent: deleteCustomEventFn,
                getCustomEvents: getCustomEventsFn,
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
