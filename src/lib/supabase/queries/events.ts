/**
 * Events Query Functions
 *
 * Phase 1: Core 테이블 조회 (읽기 전용)
 * Supabase에서 행사 데이터를 조회하는 함수들
 */

import { createClient } from "../client";
import type { Database, DbEvent, DbVenue, DbArtist, DbStage, DbSlot, DbOperationalSlot } from "@/types/database";
import type { Event, Venue, Artist, Stage, Slot, OperationalSlot, TicketLink } from "@/types/event";

// =============================================
// Types
// =============================================

export interface EventQueryOptions {
    type?: "concert" | "festival" | "musical" | "exhibition";
    status?: "SCHEDULED" | "CHANGED" | "POSTPONED" | "CANCELED";
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
    search?: string;
}

interface DbEventWithRelations extends DbEvent {
    venue: DbVenue | null;
    artists: Array<{
        display_order: number;
        artist: DbArtist;
    }> | null;
    stages: DbStage[] | null;
    slots: Array<DbSlot & {
        artist: DbArtist | null;
        stage: DbStage | null;
    }> | null;
    operational_slots: DbOperationalSlot[] | null;
}

// =============================================
// Query Functions
// =============================================

/**
 * 행사 목록 조회
 */
export async function getEvents(options?: EventQueryOptions): Promise<Event[]> {
    const supabase = createClient();

    let query = supabase
        .from("events")
        .select(`
            *,
            venue:venues(*),
            artists:event_artists(
                display_order,
                artist:artists(*)
            )
        `)
        .order("start_at", { ascending: true });

    if (options?.type) {
        query = query.eq("type", options.type);
    }
    if (options?.status) {
        query = query.eq("status", options.status);
    }
    if (options?.from) {
        query = query.gte("start_at", options.from);
    }
    if (options?.to) {
        query = query.lte("start_at", options.to);
    }
    if (options?.search) {
        query = query.ilike("title", `%${options.search}%`);
    }
    if (options?.limit) {
        query = query.limit(options.limit);
    }
    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Failed to fetch events:", error);
        throw error;
    }

    return (data ?? []).map(transformDbEventToEvent);
}

/**
 * 행사 상세 조회 (모든 관계 포함)
 */
export async function getEventById(eventId: string): Promise<Event | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("events")
        .select(`
            *,
            venue:venues(*),
            artists:event_artists(
                display_order,
                artist:artists(*)
            ),
            stages(*),
            slots(
                *,
                artist:artists(*),
                stage:stages(*)
            ),
            operational_slots(*)
        `)
        .eq("id", eventId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // Not found
            return null;
        }
        console.error("Failed to fetch event:", error);
        throw error;
    }

    return transformDbEventToEvent(data as DbEventWithRelations);
}

/**
 * 여러 행사 ID로 조회 (찜/다녀옴 목록용)
 */
export async function getEventsByIds(eventIds: string[]): Promise<Event[]> {
    if (eventIds.length === 0) return [];

    const supabase = createClient();

    const { data, error } = await supabase
        .from("events")
        .select(`
            *,
            venue:venues(*),
            artists:event_artists(
                display_order,
                artist:artists(*)
            )
        `)
        .in("id", eventIds);

    if (error) {
        console.error("Failed to fetch events by IDs:", error);
        throw error;
    }

    return (data ?? []).map(transformDbEventToEvent);
}

/**
 * 행사 검색 (전문 검색)
 */
export async function searchEvents(query: string, options?: Omit<EventQueryOptions, "search">): Promise<Event[]> {
    return getEvents({ ...options, search: query });
}

// =============================================
// Transformers
// =============================================

/**
 * DB 행사 → 프론트엔드 타입 변환
 */
export function transformDbEventToEvent(dbEvent: DbEventWithRelations | DbEvent): Event {
    const event = dbEvent as DbEventWithRelations;

    return {
        id: event.id,
        title: event.title,
        startAt: new Date(event.start_at),
        endAt: event.end_at ? new Date(event.end_at) : undefined,
        timezone: event.timezone || "Asia/Seoul",
        venue: event.venue ? transformDbVenueToVenue(event.venue) : undefined,
        type: event.type,
        status: event.status,
        overrideMode: event.override_mode,
        posterUrl: event.poster_url ?? undefined,
        price: event.price ?? undefined,
        description: event.description ?? undefined,
        ageRestriction: event.age_restriction ?? undefined,
        ticketLinks: event.ticket_links as unknown as TicketLink[] | undefined,
        timetableType: event.timetable_type ?? undefined,
        badges: event.badges ?? undefined,
        artists: event.artists
            ?.sort((a, b) => a.display_order - b.display_order)
            .map((ea) => transformDbArtistToArtist(ea.artist)),
        stages: event.stages?.map(transformDbStageToStage),
        slots: event.slots
            ?.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
            .map(transformDbSlotToSlot),
        operationalSlots: event.operational_slots
            ?.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
            .map(transformDbOperationalSlotToOperationalSlot),
        stats: {
            wishlistCount: event.wishlist_count,
            attendedCount: event.attended_count,
            reportCount: event.report_count,
            reviewCount: event.review_count,
            companionCount: 0, // TODO: posts 테이블에서 동행 글 수 계산
        },
    };
}

function transformDbVenueToVenue(dbVenue: DbVenue): Venue {
    return {
        id: dbVenue.id,
        name: dbVenue.name,
        address: dbVenue.address,
        lat: dbVenue.lat ?? undefined,
        lng: dbVenue.lng ?? undefined,
    };
}

function transformDbArtistToArtist(dbArtist: DbArtist): Artist {
    return {
        id: dbArtist.id,
        name: dbArtist.name,
        image: dbArtist.image_url ?? undefined,
        genre: dbArtist.genre ?? undefined,
        fanchant: dbArtist.fanchant ?? undefined,
        lightstickColor: dbArtist.lightstick_color ?? undefined,
        popularSongs: dbArtist.popular_songs ?? undefined,
    };
}

function transformDbStageToStage(dbStage: DbStage): Stage {
    return {
        id: dbStage.id,
        name: dbStage.name,
        order: dbStage.display_order,
        color: dbStage.color ?? undefined,
    };
}

function transformDbSlotToSlot(dbSlot: DbSlot & { artist?: DbArtist | null; stage?: DbStage | null }): Slot {
    return {
        id: dbSlot.id,
        eventId: dbSlot.event_id,
        artistId: dbSlot.artist_id ?? undefined,
        day: dbSlot.day ?? undefined,
        startAt: new Date(dbSlot.start_at),
        endAt: new Date(dbSlot.end_at),
        artist: dbSlot.artist ? transformDbArtistToArtist(dbSlot.artist) : undefined,
        stage: dbSlot.stage?.name ?? undefined,
        title: dbSlot.title ?? undefined,
    };
}

function transformDbOperationalSlotToOperationalSlot(dbSlot: DbOperationalSlot): OperationalSlot {
    return {
        id: dbSlot.id,
        eventId: dbSlot.event_id,
        type: dbSlot.type,
        title: dbSlot.title ?? undefined,
        startAt: new Date(dbSlot.start_at),
        endAt: dbSlot.end_at ? new Date(dbSlot.end_at) : undefined,
        location: dbSlot.location ?? undefined,
        description: dbSlot.description ?? undefined,
        isHighlight: dbSlot.is_highlight,
    };
}
