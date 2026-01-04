/**
 * Events Data Fetching Hooks
 *
 * Supabase에서 행사 데이터를 조회하는 React hooks
 * 오류 발생 시 Mock 데이터로 폴백
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Event } from "@/types/event";
import { getEvents, getEventById, EventQueryOptions } from "../queries/events";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { isValidUUID } from "@/lib/utils";

interface UseEventsOptions extends EventQueryOptions {
    /** 초기 로드 건너뛰기 */
    skip?: boolean;
}

interface UseEventsResult {
    events: Event[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    /** Supabase 사용 여부 (오류 시 false) */
    isFromSupabase: boolean;
}

/**
 * 행사 목록 조회 훅
 *
 * Supabase에서 데이터를 가져오고, 실패 시 Mock 데이터로 폴백
 */
export function useEvents(options?: UseEventsOptions): UseEventsResult {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isFromSupabase, setIsFromSupabase] = useState(false);

    const fetchEvents = useCallback(async () => {
        if (options?.skip) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Supabase에서 데이터 가져오기 시도
            const data = await getEvents(options);

            // 데이터가 있으면 Supabase 사용
            if (data && data.length > 0) {
                setEvents(data);
                setIsFromSupabase(true);
            } else {
                // 빈 결과면 Mock 데이터로 폴백 (시드가 안 된 경우)
                console.warn("[useEvents] Supabase returned empty, using mock data");
                setEvents(filterMockEvents(options));
                setIsFromSupabase(false);
            }
        } catch (err) {
            // Supabase 오류 시 Mock 데이터로 폴백
            console.error("[useEvents] Supabase error, falling back to mock:", err);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            setEvents(filterMockEvents(options));
            setIsFromSupabase(false);
        } finally {
            setIsLoading(false);
        }
    }, [options?.type, options?.status, options?.from, options?.to, options?.limit, options?.search, options?.skip]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return {
        events,
        isLoading,
        error,
        refetch: fetchEvents,
        isFromSupabase,
    };
}

interface UseEventResult {
    event: Event | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    isFromSupabase: boolean;
}

/**
 * 단일 행사 조회 훅
 */
export function useEvent(eventId: string | null): UseEventResult {
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isFromSupabase, setIsFromSupabase] = useState(false);

    const fetchEvent = useCallback(async () => {
        if (!eventId) {
            setEvent(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Mock 이벤트 ID(e1, e2 등)는 Supabase 호출 건너뛰고 바로 Mock에서 찾기
        if (!isValidUUID(eventId)) {
            const mockEvent = MOCK_EVENTS.find((e) => e.id === eventId) ?? null;
            setEvent(mockEvent);
            setIsFromSupabase(false);
            setIsLoading(false);
            return;
        }

        try {
            const data = await getEventById(eventId);

            if (data) {
                setEvent(data);
                setIsFromSupabase(true);
            } else {
                // Supabase에서 못 찾으면 Mock에서 찾기
                const mockEvent = MOCK_EVENTS.find((e) => e.id === eventId) ?? null;
                setEvent(mockEvent);
                setIsFromSupabase(false);
            }
        } catch (err) {
            console.error("[useEvent] Supabase error, falling back to mock:", err);
            setError(err instanceof Error ? err : new Error("Unknown error"));
            const mockEvent = MOCK_EVENTS.find((e) => e.id === eventId) ?? null;
            setEvent(mockEvent);
            setIsFromSupabase(false);
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    return {
        event,
        isLoading,
        error,
        refetch: fetchEvent,
        isFromSupabase,
    };
}

/**
 * Mock 데이터에서 필터링 (폴백용)
 */
function filterMockEvents(options?: UseEventsOptions): Event[] {
    let events = [...MOCK_EVENTS];

    if (options?.type) {
        events = events.filter((e) => e.type === options.type);
    }

    if (options?.status) {
        events = events.filter((e) => e.status === options.status);
    }

    if (options?.search) {
        const query = options.search.toLowerCase();
        events = events.filter(
            (e) =>
                e.title.toLowerCase().includes(query) ||
                e.venue?.name?.toLowerCase().includes(query) ||
                e.artists?.some((a) => a.name.toLowerCase().includes(query))
        );
    }

    if (options?.from) {
        const fromDate = new Date(options.from);
        events = events.filter((e) => new Date(e.startAt) >= fromDate);
    }

    if (options?.to) {
        const toDate = new Date(options.to);
        events = events.filter((e) => new Date(e.startAt) <= toDate);
    }

    // 기본 정렬: 시작일 오름차순
    events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    if (options?.limit) {
        events = events.slice(0, options.limit);
    }

    return events;
}
