// 행사(Event) 관련 타입 정의 - PRD v0.5 기준

/** 행사 상태 */
export type EventStatus =
    | "SCHEDULED"   // 예정
    | "CHANGED"     // 일정 변경
    | "POSTPONED"   // 연기
    | "CANCELED";   // 취소

/** 허브 모드 (LIVE/RECAP) */
export type HubMode = "AUTO" | "LIVE" | "RECAP";

/** 행사 유형 */
export type EventType = "concert" | "festival" | "musical" | "exhibition";

/** 공연장/장소 */
export interface Venue {
    id: string;
    name: string;
    address: string;
    lat?: number;
    lng?: number;
}

/** 아티스트 */
export interface Artist {
    id: string;
    name: string;
    image?: string;
    genre?: string;
}

/** 타임테이블 슬롯 */
export interface Slot {
    id: string;
    eventId: string;
    artistId?: string;
    artist?: Artist;
    stage?: string;
    day?: number; // 다일 행사의 경우 몇일차인지
    startAt: Date;
    endAt: Date;
    title?: string; // 아티스트가 아닌 경우 (예: "티켓 박스 오픈")
}

/** 행사 통계 */
export interface EventStats {
    reportCount: number;     // 실시간 제보 수
    companionCount: number;  // 동행 글 수
    wishlistCount: number;   // 찜한 사용자 수
    attendedCount: number;   // 다녀옴 표시한 사용자 수
    reviewCount: number;     // 리뷰 수
}

/** 행사(Event) - 최상위 엔터티 */
export interface Event {
    id: string;
    title: string;

    // 일정
    startAt: Date;
    endAt: Date;
    timezone: string; // 기본 "Asia/Seoul"

    // 장소
    venue: Venue;

    // 분류
    type: EventType;
    status: EventStatus;

    // 허브 모드 (운영자 override)
    overrideMode: HubMode;

    // 상세 정보
    posterUrl?: string;
    price?: string;
    description?: string;
    ageRestriction?: string;

    // 관계
    artists?: Artist[];
    slots?: Slot[];

    // 통계
    stats?: EventStats;

    // 배지 (UI 표시용)
    badges?: string[];

    // 메타
    createdAt: Date;
    updatedAt: Date;
}

/**
 * LIVE/RECAP 모드 계산 함수
 * - LIVE: 현재 >= (startAt - 24h) AND 현재 < (endAt + 6h)
 * - RECAP: 현재 >= (endAt + 6h)
 */
export function getHubMode(event: Event, now: Date = new Date()): "LIVE" | "RECAP" {
    // override가 AUTO가 아니면 override 값 사용
    if (event.overrideMode !== "AUTO") {
        return event.overrideMode as "LIVE" | "RECAP";
    }

    const startAt = new Date(event.startAt);
    const endAt = new Date(event.endAt);

    const liveStart = new Date(startAt.getTime() - 24 * 60 * 60 * 1000); // startAt - 24h
    const liveEnd = new Date(endAt.getTime() + 6 * 60 * 60 * 1000);      // endAt + 6h

    if (now >= liveStart && now < liveEnd) {
        return "LIVE";
    }

    return "RECAP";
}

/**
 * D-day 배지 계산
 */
export function getDDayBadge(startAt: Date, now: Date = new Date()): string | null {
    const diffMs = new Date(startAt).getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return "D-Day";
    if (diffDays <= 7) return `D-${diffDays}`;

    return null;
}
