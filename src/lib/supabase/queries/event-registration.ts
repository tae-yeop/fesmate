/**
 * Event Registration Query Functions
 *
 * 사용자 행사 등록 관련 Supabase 쿼리
 */

import { createClient } from "../client";
import type { TablesInsert, TablesUpdate } from "@/types/database";
import type { Event, Venue, Artist, TicketLink } from "@/types/event";
import type { EventSource, RegistrationStatus } from "@/types/event-registration";
import { transformDbEventToEvent } from "./events";

// =============================================
// Types
// =============================================

export interface CreateUserEventInput {
    title: string;
    startAt: Date;
    endAt?: Date;
    timezone?: string;
    venueName: string;
    venueAddress: string;
    venueLat?: number;
    venueLng?: number;
    eventType: "concert" | "festival" | "musical" | "exhibition";
    posterUrl?: string;
    price?: string;
    ticketLinks?: TicketLink[];
    artists?: string[];
    description?: string;
}

export interface UpdateUserEventInput extends Partial<CreateUserEventInput> {
    registrationStatus?: RegistrationStatus;
}

export interface UserEventWithRelations extends Event {
    registeredBy: string | null;
    source: EventSource;
    registrationStatus: RegistrationStatus;
}

// =============================================
// Query Functions
// =============================================

/**
 * 사용자 등록 행사 목록 조회
 */
export async function getUserRegisteredEvents(userId: string): Promise<UserEventWithRelations[]> {
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
        .eq("registered_by", userId)
        .eq("source", "user")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getUserRegisteredEvents] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        ...transformDbEventToEvent(row),
        registeredBy: row.registered_by,
        source: row.source as EventSource,
        registrationStatus: row.registration_status as RegistrationStatus,
    }));
}

/**
 * 모든 사용자 등록 행사 조회 (공개된 것만)
 */
export async function getAllUserEvents(): Promise<UserEventWithRelations[]> {
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
        .eq("source", "user")
        .eq("registration_status", "published")
        .order("start_at", { ascending: true });

    if (error) {
        console.error("[getAllUserEvents] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        ...transformDbEventToEvent(row),
        registeredBy: row.registered_by,
        source: row.source as EventSource,
        registrationStatus: row.registration_status as RegistrationStatus,
    }));
}

/**
 * 사용자 등록 행사 상세 조회
 */
export async function getUserEventById(eventId: string): Promise<UserEventWithRelations | null> {
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
        .eq("id", eventId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return null;
        }
        console.error("[getUserEventById] Error:", error);
        throw error;
    }

    return {
        ...transformDbEventToEvent(data),
        registeredBy: data.registered_by,
        source: data.source as EventSource,
        registrationStatus: data.registration_status as RegistrationStatus,
    };
}

/**
 * 행사 등록
 */
export async function createUserEvent(
    userId: string,
    input: CreateUserEventInput
): Promise<UserEventWithRelations> {
    const supabase = createClient();

    // 1. Venue 생성 또는 조회
    let venueId: string | null = null;

    // 기존 venue 검색 (같은 이름과 주소)
    const { data: existingVenue } = await supabase
        .from("venues")
        .select("id")
        .eq("name", input.venueName)
        .eq("address", input.venueAddress)
        .maybeSingle();

    if (existingVenue) {
        venueId = existingVenue.id;
    } else {
        // 새 venue 생성
        const { data: newVenue, error: venueError } = await supabase
            .from("venues")
            .insert({
                name: input.venueName,
                address: input.venueAddress,
                lat: input.venueLat,
                lng: input.venueLng,
            })
            .select()
            .single();

        if (venueError) {
            console.error("[createUserEvent] Venue creation error:", venueError);
            throw venueError;
        }

        venueId = newVenue.id;
    }

    // 2. Event 생성
    const eventInsert: TablesInsert<"events"> = {
        title: input.title,
        start_at: input.startAt.toISOString(),
        end_at: input.endAt?.toISOString(),
        timezone: input.timezone || "Asia/Seoul",
        venue_id: venueId,
        type: input.eventType,
        status: "SCHEDULED",
        override_mode: "AUTO",
        poster_url: input.posterUrl,
        price: input.price,
        description: input.description,
        ticket_links: input.ticketLinks ? JSON.stringify(input.ticketLinks) : null,
        source: "user",
        registered_by: userId,
        registration_status: "published",
    };

    const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert(eventInsert)
        .select()
        .single();

    if (eventError) {
        console.error("[createUserEvent] Event creation error:", eventError);
        throw eventError;
    }

    // 3. Artists 생성 및 연결
    if (input.artists && input.artists.length > 0) {
        for (let i = 0; i < input.artists.length; i++) {
            const artistName = input.artists[i];

            // 기존 아티스트 검색
            let { data: existingArtist } = await supabase
                .from("artists")
                .select("id")
                .eq("name", artistName)
                .maybeSingle();

            let artistId: string;

            if (existingArtist) {
                artistId = existingArtist.id;
            } else {
                // 새 아티스트 생성
                const { data: newArtist, error: artistError } = await supabase
                    .from("artists")
                    .insert({ name: artistName })
                    .select()
                    .single();

                if (artistError) {
                    console.error("[createUserEvent] Artist creation error:", artistError);
                    continue;
                }

                artistId = newArtist.id;
            }

            // event_artists 연결
            await supabase.from("event_artists").insert({
                event_id: eventData.id,
                artist_id: artistId,
                display_order: i,
            });
        }
    }

    // 4. 생성된 행사 조회하여 반환
    const result = await getUserEventById(eventData.id);
    if (!result) {
        throw new Error("Failed to fetch created event");
    }

    return result;
}

/**
 * 행사 수정
 */
export async function updateUserEvent(
    userId: string,
    eventId: string,
    input: UpdateUserEventInput
): Promise<UserEventWithRelations | null> {
    const supabase = createClient();

    // 권한 확인
    const { data: existing, error: checkError } = await supabase
        .from("events")
        .select("registered_by")
        .eq("id", eventId)
        .single();

    if (checkError || !existing) {
        console.error("[updateUserEvent] Event not found:", checkError);
        return null;
    }

    if (existing.registered_by !== userId) {
        console.error("[updateUserEvent] Permission denied");
        return null;
    }

    // Venue 업데이트 (필요한 경우)
    let venueId: string | undefined;
    if (input.venueName || input.venueAddress) {
        const { data: existingVenue } = await supabase
            .from("venues")
            .select("id")
            .eq("name", input.venueName || "")
            .eq("address", input.venueAddress || "")
            .maybeSingle();

        if (existingVenue) {
            venueId = existingVenue.id;
        } else if (input.venueName && input.venueAddress) {
            const { data: newVenue, error: venueError } = await supabase
                .from("venues")
                .insert({
                    name: input.venueName,
                    address: input.venueAddress,
                    lat: input.venueLat,
                    lng: input.venueLng,
                })
                .select()
                .single();

            if (!venueError && newVenue) {
                venueId = newVenue.id;
            }
        }
    }

    // Event 업데이트
    const eventUpdate: TablesUpdate<"events"> = {};

    if (input.title !== undefined) eventUpdate.title = input.title;
    if (input.startAt !== undefined) eventUpdate.start_at = input.startAt.toISOString();
    if (input.endAt !== undefined) eventUpdate.end_at = input.endAt.toISOString();
    if (input.timezone !== undefined) eventUpdate.timezone = input.timezone;
    if (venueId !== undefined) eventUpdate.venue_id = venueId;
    if (input.eventType !== undefined) eventUpdate.type = input.eventType;
    if (input.posterUrl !== undefined) eventUpdate.poster_url = input.posterUrl;
    if (input.price !== undefined) eventUpdate.price = input.price;
    if (input.description !== undefined) eventUpdate.description = input.description;
    if (input.ticketLinks !== undefined) {
        eventUpdate.ticket_links = JSON.stringify(input.ticketLinks);
    }
    if (input.registrationStatus !== undefined) {
        eventUpdate.registration_status = input.registrationStatus;
    }

    const { error: updateError } = await supabase
        .from("events")
        .update(eventUpdate)
        .eq("id", eventId);

    if (updateError) {
        console.error("[updateUserEvent] Update error:", updateError);
        throw updateError;
    }

    // Artists 업데이트 (필요한 경우)
    if (input.artists !== undefined) {
        // 기존 연결 삭제
        await supabase.from("event_artists").delete().eq("event_id", eventId);

        // 새 연결 추가
        for (let i = 0; i < input.artists.length; i++) {
            const artistName = input.artists[i];

            let { data: existingArtist } = await supabase
                .from("artists")
                .select("id")
                .eq("name", artistName)
                .maybeSingle();

            let artistId: string;

            if (existingArtist) {
                artistId = existingArtist.id;
            } else {
                const { data: newArtist, error: artistError } = await supabase
                    .from("artists")
                    .insert({ name: artistName })
                    .select()
                    .single();

                if (artistError) continue;
                artistId = newArtist.id;
            }

            await supabase.from("event_artists").insert({
                event_id: eventId,
                artist_id: artistId,
                display_order: i,
            });
        }
    }

    return getUserEventById(eventId);
}

/**
 * 행사 삭제
 */
export async function deleteUserEvent(userId: string, eventId: string): Promise<boolean> {
    const supabase = createClient();

    // 권한 확인
    const { data: existing, error: checkError } = await supabase
        .from("events")
        .select("registered_by")
        .eq("id", eventId)
        .single();

    if (checkError || !existing) {
        console.error("[deleteUserEvent] Event not found:", checkError);
        return false;
    }

    if (existing.registered_by !== userId) {
        console.error("[deleteUserEvent] Permission denied");
        return false;
    }

    // event_artists 연결 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
    await supabase.from("event_artists").delete().eq("event_id", eventId);

    // Event 삭제
    const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

    if (error) {
        console.error("[deleteUserEvent] Delete error:", error);
        return false;
    }

    return true;
}

/**
 * 특정 사용자가 등록한 행사인지 확인
 */
export async function isEventOwner(userId: string, eventId: string): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("events")
        .select("registered_by")
        .eq("id", eventId)
        .single();

    if (error || !data) {
        return false;
    }

    return data.registered_by === userId;
}
