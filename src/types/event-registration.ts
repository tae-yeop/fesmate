// 사용자 행사 등록 관련 타입 정의 - PRD 6.20

import { Event, EventType, TicketLink } from "./event";

/** 행사 소스 (출처) */
export type EventSource = "official" | "user" | "crawl";

/** 등록 상태 */
export type RegistrationStatus = "draft" | "pending" | "published" | "rejected";

/** 행사 등록 입력 데이터 */
export interface CreateEventInput {
    // 필수 항목
    title: string;
    startAt: Date;
    venueName: string;
    venueAddress: string;
    eventType: EventType;

    // 선택 항목
    endAt?: Date;
    timezone?: string; // 기본: "Asia/Seoul"
    venueLat?: number;
    venueLng?: number;
    posterUrl?: string;
    price?: string;
    ticketLinks?: TicketLink[];
    artists?: string[]; // 아티스트 이름 목록
    description?: string;
    officialUrl?: string;
}

/** 사용자 등록 행사 (Event 확장) */
export interface UserRegisteredEvent extends Event {
    registeredBy: string; // 등록자 userId
    registrationStatus: RegistrationStatus;
    source: EventSource;
}

/** 기여 타입 */
export type ContributionType = "event_register" | "timetable_edit" | "setlist_add";

/** 기여 대상 타입 */
export type ContributionTargetType = "event" | "slot" | "setlist";

/** 기여 기록 */
export interface Contribution {
    id: string;
    userId: string;
    contributionType: ContributionType;
    targetType: ContributionTargetType;
    targetId: string;
    points: number;
    createdAt: Date;
}

/** 행사 등록 모달 단계 */
export type EventRegistrationStep = "basic" | "venue" | "artists" | "confirm";

/** 행사 등록 폼 상태 */
export interface EventRegistrationFormState {
    // Step 1: 기본 정보
    title: string;
    startAt: string; // datetime-local input용
    endAt: string;
    eventType: EventType | "";

    // Step 2: 장소 & 상세
    venueName: string;
    venueAddress: string;
    posterUrl: string;
    price: string;
    ticketLinks: TicketLink[];
    description: string;
    officialUrl: string;

    // Step 3: 출연진
    artists: string[];
}

/** 초기 폼 상태 */
export const INITIAL_FORM_STATE: EventRegistrationFormState = {
    title: "",
    startAt: "",
    endAt: "",
    eventType: "",
    venueName: "",
    venueAddress: "",
    posterUrl: "",
    price: "",
    ticketLinks: [],
    description: "",
    officialUrl: "",
    artists: [],
};

/** 행사 유형 라벨 */
export const EVENT_TYPE_LABELS: Record<EventType, { label: string; icon: string }> = {
    concert: { label: "콘서트", icon: "🎤" },
    festival: { label: "페스티벌", icon: "🎪" },
    musical: { label: "뮤지컬", icon: "🎭" },
    exhibition: { label: "전시", icon: "🖼️" },
};

/** 소스 라벨 */
export const SOURCE_LABELS: Record<EventSource, { label: string; badge: string }> = {
    official: { label: "공식", badge: "🏢" },
    user: { label: "사용자 등록", badge: "👤" },
    crawl: { label: "수집", badge: "🔍" },
};

/** 중복 행사 감지 결과 */
export interface SimilarEventMatch {
    event: Event;
    similarity: number; // 0-1 유사도
    matchedFields: ("title" | "date" | "venue" | "artist")[];
}

/**
 * 중복 행사 유사도 계산
 * - 제목 유사도 (Levenshtein distance)
 * - 날짜 일치
 * - 장소 일치
 * - 아티스트 일치
 */
export function calculateEventSimilarity(
    input: Partial<CreateEventInput>,
    existing: Event
): SimilarEventMatch | null {
    const matchedFields: SimilarEventMatch["matchedFields"] = [];
    let score = 0;

    // 제목 유사도 (단순 포함 체크)
    if (input.title && existing.title) {
        const inputTitle = input.title.toLowerCase().replace(/\s/g, "");
        const existingTitle = existing.title.toLowerCase().replace(/\s/g, "");
        if (inputTitle === existingTitle || inputTitle.includes(existingTitle) || existingTitle.includes(inputTitle)) {
            matchedFields.push("title");
            score += 0.4;
        }
    }

    // 날짜 일치 (같은 날)
    if (input.startAt && existing.startAt) {
        const inputDate = new Date(input.startAt).toDateString();
        const existingDate = new Date(existing.startAt).toDateString();
        if (inputDate === existingDate) {
            matchedFields.push("date");
            score += 0.3;
        }
    }

    // 장소 일치
    if (input.venueName && existing.venue?.name) {
        const inputVenue = input.venueName.toLowerCase().replace(/\s/g, "");
        const existingVenue = existing.venue.name.toLowerCase().replace(/\s/g, "");
        if (inputVenue === existingVenue || inputVenue.includes(existingVenue) || existingVenue.includes(inputVenue)) {
            matchedFields.push("venue");
            score += 0.2;
        }
    }

    // 아티스트 일치 (하나라도 겹치면)
    if (input.artists && input.artists.length > 0 && existing.artists && existing.artists.length > 0) {
        const inputArtists = new Set(input.artists.map(a => a.toLowerCase().replace(/\s/g, "")));
        const existingArtists = existing.artists.map(a => a.name.toLowerCase().replace(/\s/g, ""));
        const hasMatch = existingArtists.some(ea => inputArtists.has(ea));
        if (hasMatch) {
            matchedFields.push("artist");
            score += 0.1;
        }
    }

    // 유사도가 0.5 이상이면 중복 가능성 있음
    if (score >= 0.5) {
        return {
            event: existing,
            similarity: score,
            matchedFields,
        };
    }

    return null;
}
