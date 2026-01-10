"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import { useDevContext } from "@/lib/dev-context";
import { useAuth } from "@/lib/auth-context";
import { MOCK_EVENTS, MOCK_USERS } from "@/lib/mock-data";
import { isValidUUID } from "@/lib/utils";
import { createSharedAdapter, DOMAINS } from "./storage";
import { Event, EventType, Venue, TicketLink } from "@/types/event";
import {
    UserRegisteredEvent,
    CreateEventInput,
    EventSource,
    RegistrationStatus,
    SimilarEventMatch,
    calculateEventSimilarity,
} from "@/types/event-registration";
import {
    getUserRegisteredEvents,
    getAllUserEvents,
    createUserEvent,
    updateUserEvent as updateUserEventDb,
    deleteUserEvent as deleteUserEventDb,
    type UserEventWithRelations,
} from "@/lib/supabase/queries";

// ===== Mock 데이터 =====

/** 사용자 등록 행사 Mock 데이터 */
export const MOCK_USER_EVENTS: UserRegisteredEvent[] = [
    {
        id: "user-event-1",
        title: "홍대 인디밴드 연말 합동공연",
        startAt: new Date("2025-12-28T19:00:00"),
        endAt: new Date("2025-12-28T22:00:00"),
        timezone: "Asia/Seoul",
        venue: {
            id: "venue-user-1",
            name: "롤링홀",
            address: "서울 마포구 서교동 364-20",
        },
        type: "concert",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        posterUrl: undefined,
        price: "현장 30,000원 / 예매 25,000원",
        artists: [
            { id: "a-user-1", name: "잔나비" },
            { id: "a-user-2", name: "실리카겔" },
            { id: "a-user-3", name: "새소년" },
        ],
        registeredBy: "user1",
        registrationStatus: "published",
        source: "user",
        createdAt: new Date("2025-01-01T10:00:00"),
    },
    {
        id: "user-event-2",
        title: "재즈 클럽 특별 공연",
        startAt: new Date("2025-01-15T20:00:00"),
        timezone: "Asia/Seoul",
        venue: {
            id: "venue-user-2",
            name: "클럽 에반스",
            address: "서울 강남구 신사동 123-45",
        },
        type: "concert",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        price: "무료 (음료 주문 필수)",
        registeredBy: "user3",
        registrationStatus: "published",
        source: "user",
        createdAt: new Date("2025-01-02T15:00:00"),
    },
];

// ===== Context 타입 =====

interface EventRegistrationContextValue {
    /** 사용자 등록 행사 목록 */
    userEvents: UserRegisteredEvent[];
    /** 내가 등록한 행사 목록 */
    myEvents: UserRegisteredEvent[];
    /** 행사 등록 */
    registerEvent: (input: CreateEventInput) => Promise<UserRegisteredEvent | null>;
    /** 행사 수정 */
    updateEvent: (eventId: string, updates: Partial<CreateEventInput>) => Promise<boolean>;
    /** 행사 삭제 */
    deleteEvent: (eventId: string) => Promise<boolean>;
    /** 유사 행사 검색 (중복 감지) */
    findSimilarEvents: (input: Partial<CreateEventInput>) => SimilarEventMatch[];
    /** 행사 조회 */
    getEvent: (eventId: string) => UserRegisteredEvent | undefined;
    /** 내가 등록한 행사인지 확인 */
    isMyEvent: (eventId: string) => boolean;
    /** 현재 사용자 ID */
    currentUserId: string;
    /** 로딩 상태 */
    isLoading: boolean;
    /** Supabase 데이터 여부 */
    isFromSupabase: boolean;
}

const EventRegistrationContext = createContext<EventRegistrationContextValue | null>(null);

// Storage adapter (Dev 모드용)
const userEventsAdapter = createSharedAdapter<UserRegisteredEvent[]>({
    domain: DOMAINS.USER_EVENTS,
    dateFields: ["startAt", "endAt", "createdAt", "updatedAt"],
});

// 사용자 닉네임 조회 헬퍼
const getUserNickname = (userId: string): string => {
    const user = MOCK_USERS.find(u => u.id === userId);
    return user?.nickname || "익명";
};

export function EventRegistrationProvider({ children }: { children: ReactNode }) {
    const { mockUserId, isLoggedIn: isDevLoggedIn } = useDevContext();
    const { user: authUser } = useAuth();

    // 실제 인증 사용자가 있으면 Supabase 사용, 없으면 Dev 모드
    const realUserId = authUser?.id;
    const isRealUser = !!realUserId && isValidUUID(realUserId);

    // Dev 모드에서 mockUserId 사용 (Dev 모드 로그인 상태일 때만)
    const devUserId = isDevLoggedIn ? (mockUserId || "user1") : null;

    // 최종 사용자 ID (로그아웃 상태에서는 null)
    const currentUserId = realUserId || devUserId || "";

    const [userEvents, setUserEvents] = useState<UserRegisteredEvent[]>(MOCK_USER_EVENTS);
    const [isLoading, setIsLoading] = useState(false);
    const [isFromSupabase, setIsFromSupabase] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // 초기 데이터 로드
    useEffect(() => {
        if (isLoaded) return;

        // 실제 사용자: Supabase에서 로드
        if (isRealUser && realUserId) {
            setIsLoading(true);
            Promise.all([
                getUserRegisteredEvents(realUserId),
                getAllUserEvents(),
            ])
                .then(([myEvents, allEvents]) => {
                    // Supabase 데이터를 UserRegisteredEvent 형태로 변환
                    const convertToUserRegisteredEvent = (e: UserEventWithRelations): UserRegisteredEvent => ({
                        id: e.id,
                        title: e.title,
                        startAt: e.startAt,
                        endAt: e.endAt,
                        timezone: e.timezone,
                        venue: e.venue,
                        type: e.type,
                        status: e.status,
                        overrideMode: e.overrideMode,
                        posterUrl: e.posterUrl,
                        price: e.price,
                        ticketLinks: e.ticketLinks,
                        artists: e.artists,
                        description: e.description,
                        registeredBy: e.registeredBy || "",
                        registrationStatus: e.registrationStatus,
                        source: e.source,
                        createdAt: new Date(),
                    });

                    // 내가 등록한 행사 + 다른 사용자의 공개된 행사 병합 (중복 제거)
                    const myEventIds = new Set(myEvents.map(e => e.id));
                    const otherEvents = allEvents.filter(e => !myEventIds.has(e.id));
                    const combined = [...myEvents, ...otherEvents].map(convertToUserRegisteredEvent);

                    setUserEvents(combined);
                    setIsFromSupabase(true);
                })
                .catch((error) => {
                    console.error("[EventRegistrationContext] Supabase load failed:", error);
                    // Supabase 실패 시 Mock 데이터로 폴백
                    setUserEvents(MOCK_USER_EVENTS);
                    setIsFromSupabase(false);
                })
                .finally(() => {
                    setIsLoading(false);
                    setIsLoaded(true);
                });
            return;
        }

        // Dev 모드: localStorage에서 로드
        try {
            const stored = userEventsAdapter.get();
            if (stored && stored.length > 0) {
                setUserEvents(stored);
            }
        } catch (error) {
            console.error("[EventRegistrationContext] Failed to load from localStorage:", error);
        }

        setIsLoaded(true);
    }, [isRealUser, realUserId, isLoaded]);

    // localStorage에 저장 (Dev 모드)
    useEffect(() => {
        if (!isLoaded || isFromSupabase) return;

        try {
            userEventsAdapter.set(userEvents);
        } catch (error) {
            console.error("[EventRegistrationContext] Failed to save to localStorage:", error);
        }
    }, [userEvents, isLoaded, isFromSupabase]);

    // 내가 등록한 행사 목록
    const myEvents = useMemo(() => {
        return userEvents.filter(e => e.registeredBy === currentUserId);
    }, [userEvents, currentUserId]);

    // 유사 행사 검색
    const findSimilarEvents = useCallback((input: Partial<CreateEventInput>): SimilarEventMatch[] => {
        const matches: SimilarEventMatch[] = [];

        // 기존 Mock 이벤트 검색
        MOCK_EVENTS.forEach(event => {
            const match = calculateEventSimilarity(input, event);
            if (match) {
                matches.push(match);
            }
        });

        // 사용자 등록 이벤트 검색
        userEvents.forEach(event => {
            const match = calculateEventSimilarity(input, event);
            if (match) {
                matches.push(match);
            }
        });

        // 유사도 높은 순으로 정렬
        return matches.sort((a, b) => b.similarity - a.similarity);
    }, [userEvents]);

    // 행사 등록
    const registerEvent = useCallback(async (input: CreateEventInput): Promise<UserRegisteredEvent | null> => {
        if (!currentUserId) {
            console.error("[EventRegistrationContext] No user logged in");
            return null;
        }

        setIsLoading(true);

        try {
            // 실제 사용자: Supabase에 저장
            if (isRealUser && realUserId) {
                const created = await createUserEvent(realUserId, {
                    title: input.title,
                    startAt: input.startAt,
                    endAt: input.endAt,
                    timezone: input.timezone,
                    venueName: input.venueName,
                    venueAddress: input.venueAddress,
                    venueLat: input.venueLat,
                    venueLng: input.venueLng,
                    eventType: input.eventType,
                    posterUrl: input.posterUrl,
                    price: input.price,
                    ticketLinks: input.ticketLinks,
                    artists: input.artists,
                    description: input.description,
                });

                const newEvent: UserRegisteredEvent = {
                    id: created.id,
                    title: created.title,
                    startAt: created.startAt,
                    endAt: created.endAt,
                    timezone: created.timezone,
                    venue: created.venue,
                    type: created.type,
                    status: created.status,
                    overrideMode: created.overrideMode,
                    posterUrl: created.posterUrl,
                    price: created.price,
                    ticketLinks: created.ticketLinks,
                    artists: created.artists,
                    description: created.description,
                    registeredBy: created.registeredBy || realUserId,
                    registrationStatus: created.registrationStatus,
                    source: created.source,
                    createdAt: new Date(),
                };

                setUserEvents(prev => [...prev, newEvent]);
                return newEvent;
            }

            // Dev 모드: localStorage에 저장
            const venue: Venue = {
                id: `venue-${Date.now()}`,
                name: input.venueName,
                address: input.venueAddress,
                lat: input.venueLat,
                lng: input.venueLng,
            };

            const artists = input.artists?.map((name, idx) => ({
                id: `artist-${Date.now()}-${idx}`,
                name,
            })) || [];

            const newEvent: UserRegisteredEvent = {
                id: `user-event-${Date.now()}`,
                title: input.title,
                startAt: input.startAt,
                endAt: input.endAt,
                timezone: input.timezone || "Asia/Seoul",
                venue,
                type: input.eventType,
                status: "SCHEDULED",
                overrideMode: "AUTO",
                posterUrl: input.posterUrl,
                price: input.price,
                ticketLinks: input.ticketLinks,
                artists: artists.length > 0 ? artists : undefined,
                description: input.description,
                registeredBy: currentUserId,
                registrationStatus: "published",
                source: "user",
                createdAt: new Date(),
            };

            setUserEvents(prev => [...prev, newEvent]);
            return newEvent;
        } catch (error) {
            console.error("[EventRegistrationContext] Failed to register event:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId, isRealUser, realUserId]);

    // 행사 수정
    const updateEvent = useCallback(async (eventId: string, updates: Partial<CreateEventInput>): Promise<boolean> => {
        if (!currentUserId) return false;

        setIsLoading(true);

        try {
            const eventIndex = userEvents.findIndex(e => e.id === eventId);
            if (eventIndex === -1) return false;

            const event = userEvents[eventIndex];

            // 본인 행사만 수정 가능
            if (event.registeredBy !== currentUserId) return false;

            // 실제 사용자: Supabase 업데이트
            if (isRealUser && realUserId && isValidUUID(eventId)) {
                const updated = await updateUserEventDb(realUserId, eventId, {
                    title: updates.title,
                    startAt: updates.startAt,
                    endAt: updates.endAt,
                    timezone: updates.timezone,
                    venueName: updates.venueName,
                    venueAddress: updates.venueAddress,
                    venueLat: updates.venueLat,
                    venueLng: updates.venueLng,
                    eventType: updates.eventType,
                    posterUrl: updates.posterUrl,
                    price: updates.price,
                    ticketLinks: updates.ticketLinks,
                    artists: updates.artists,
                    description: updates.description,
                });

                if (!updated) return false;

                const updatedEvent: UserRegisteredEvent = {
                    id: updated.id,
                    title: updated.title,
                    startAt: updated.startAt,
                    endAt: updated.endAt,
                    timezone: updated.timezone,
                    venue: updated.venue,
                    type: updated.type,
                    status: updated.status,
                    overrideMode: updated.overrideMode,
                    posterUrl: updated.posterUrl,
                    price: updated.price,
                    ticketLinks: updated.ticketLinks,
                    artists: updated.artists,
                    description: updated.description,
                    registeredBy: updated.registeredBy || realUserId,
                    registrationStatus: updated.registrationStatus,
                    source: updated.source,
                    createdAt: event.createdAt,
                    updatedAt: new Date(),
                };

                setUserEvents(prev => {
                    const next = [...prev];
                    next[eventIndex] = updatedEvent;
                    return next;
                });

                return true;
            }

            // Dev 모드: localStorage 업데이트
            let venue = event.venue;
            if (updates.venueName || updates.venueAddress) {
                venue = {
                    id: venue?.id || `venue-${Date.now()}`,
                    name: updates.venueName || venue?.name || "",
                    address: updates.venueAddress || venue?.address || "",
                    lat: updates.venueLat ?? venue?.lat,
                    lng: updates.venueLng ?? venue?.lng,
                };
            }

            let artists = event.artists;
            if (updates.artists) {
                artists = updates.artists.map((name, idx) => ({
                    id: `artist-${Date.now()}-${idx}`,
                    name,
                }));
            }

            const updatedEvent: UserRegisteredEvent = {
                ...event,
                title: updates.title ?? event.title,
                startAt: updates.startAt ?? event.startAt,
                endAt: updates.endAt ?? event.endAt,
                timezone: updates.timezone ?? event.timezone,
                venue,
                type: updates.eventType ?? event.type,
                posterUrl: updates.posterUrl ?? event.posterUrl,
                price: updates.price ?? event.price,
                ticketLinks: updates.ticketLinks ?? event.ticketLinks,
                artists: artists && artists.length > 0 ? artists : undefined,
                description: updates.description ?? event.description,
                updatedAt: new Date(),
            };

            setUserEvents(prev => {
                const next = [...prev];
                next[eventIndex] = updatedEvent;
                return next;
            });

            return true;
        } catch (error) {
            console.error("[EventRegistrationContext] Failed to update event:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userEvents, currentUserId, isRealUser, realUserId]);

    // 행사 삭제
    const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
        if (!currentUserId) return false;

        setIsLoading(true);

        try {
            const event = userEvents.find(e => e.id === eventId);
            if (!event) return false;

            // 본인 행사만 삭제 가능
            if (event.registeredBy !== currentUserId) return false;

            // 실제 사용자: Supabase 삭제
            if (isRealUser && realUserId && isValidUUID(eventId)) {
                const deleted = await deleteUserEventDb(realUserId, eventId);
                if (!deleted) return false;
            }

            setUserEvents(prev => prev.filter(e => e.id !== eventId));

            return true;
        } catch (error) {
            console.error("[EventRegistrationContext] Failed to delete event:", error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [userEvents, currentUserId, isRealUser, realUserId]);

    // 행사 조회
    const getEvent = useCallback((eventId: string): UserRegisteredEvent | undefined => {
        return userEvents.find(e => e.id === eventId);
    }, [userEvents]);

    // 내가 등록한 행사인지 확인
    const isMyEvent = useCallback((eventId: string): boolean => {
        const event = userEvents.find(e => e.id === eventId);
        return event?.registeredBy === currentUserId;
    }, [userEvents, currentUserId]);

    const value: EventRegistrationContextValue = {
        userEvents,
        myEvents,
        registerEvent,
        updateEvent,
        deleteEvent,
        findSimilarEvents,
        getEvent,
        isMyEvent,
        currentUserId,
        isLoading,
        isFromSupabase,
    };

    return (
        <EventRegistrationContext.Provider value={value}>
            {children}
        </EventRegistrationContext.Provider>
    );
}

export function useEventRegistration() {
    const context = useContext(EventRegistrationContext);
    if (!context) {
        throw new Error("useEventRegistration must be used within EventRegistrationProvider");
    }
    return context;
}
