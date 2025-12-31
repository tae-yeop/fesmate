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

/** 타임테이블 뷰 타입 */
export type TimetableViewType = "linear" | "grid";

/** 스테이지 정보 (페스티벌용) */
export interface Stage {
    id: string;
    name: string;
    order: number;  // 표시 순서
    color?: string; // 스테이지 구분 색상
}

/** 운영 슬롯 타입 (단독 공연용) */
export type OperationalSlotType =
    | "md_sale"        // MD 현장 판매
    | "ticket_pickup"  // 티켓 현장 수령
    | "locker_open"    // 물품 보관소
    | "queue_start"    // 대기열 시작
    | "standing_entry" // 스탠딩 입장
    | "seated_entry"   // 지정석 입장
    | "show_start"     // 공연 시작
    | "show_end"       // 공연 종료
    | "intermission"   // 인터미션
    | "shuttle"        // 셔틀버스
    | "photo_time"     // 포토타임
    | "encore"         // 앵콜
    | "custom";        // 기타

/** 운영 슬롯 타입 라벨 */
export const OPERATIONAL_SLOT_LABELS: Record<OperationalSlotType, { label: string; icon: string }> = {
    md_sale: { label: "MD 판매", icon: "🛍️" },
    ticket_pickup: { label: "티켓 수령", icon: "🎫" },
    locker_open: { label: "물품 보관", icon: "🧳" },
    queue_start: { label: "대기열 시작", icon: "🚶" },
    standing_entry: { label: "스탠딩 입장", icon: "🚪" },
    seated_entry: { label: "지정석 입장", icon: "🪑" },
    show_start: { label: "공연 시작", icon: "🎵" },
    show_end: { label: "공연 종료", icon: "🔚" },
    intermission: { label: "인터미션", icon: "☕" },
    shuttle: { label: "셔틀버스", icon: "🚌" },
    photo_time: { label: "포토타임", icon: "📸" },
    encore: { label: "앵콜", icon: "🎤" },
    custom: { label: "기타", icon: "📋" },
};

/** 운영 슬롯 (단독 공연용 타임라인 아이템) */
export interface OperationalSlot {
    id: string;
    eventId: string;
    type: OperationalSlotType;
    title?: string;         // 커스텀 제목 (type이 custom일 때)
    startAt: Date;
    endAt?: Date;           // 종료 시간 (선택)
    location?: string;      // 위치 (예: "1층 로비", "A게이트")
    description?: string;   // 상세 설명
    isHighlight?: boolean;  // 중요 표시 (공연 시작 등)
}

/** 공연장/장소 */
export interface Venue {
    id: string;
    name: string;
    address: string;
    lat?: number;
    lng?: number;
}

/** 아티스트 소셜 링크 */
export interface ArtistSocialLink {
    type: "instagram" | "youtube" | "spotify" | "twitter" | "website";
    url: string;
}

/** 아티스트 */
export interface Artist {
    id: string;
    name: string;
    image?: string;
    genre?: string;
    /** 호응법/팬덤 문화 */
    fanchant?: string;
    /** 응원봉 색상 */
    lightstickColor?: string;
    /** 소셜 링크 */
    socialLinks?: ArtistSocialLink[];
    /** 대표곡 */
    popularSongs?: string[];
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

/** 예매처 링크 */
export interface TicketLink {
    name: string;      // 예매처 이름 (예: "인터파크 티켓", "YES24")
    url: string;       // 예매 URL
    logo?: string;     // 예매처 로고 URL (선택)
}

/** 행사(Event) - 최상위 엔터티 */
export interface Event {
    id: string;
    title: string;

    // 일정
    startAt: Date;
    endAt?: Date;  // 종료 시간 미정인 경우 null/undefined
    timezone: string; // 기본 "Asia/Seoul"

    // 장소 (Supabase에서는 optional로 처리)
    venue?: Venue;

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

    // 예매 링크
    ticketLinks?: TicketLink[];

    // 타임테이블 설정
    timetableType?: TimetableViewType; // "linear" (단독공연) | "grid" (페스티벌), 기본값은 type에 따라 자동
    stages?: Stage[];                   // 페스티벌 스테이지 목록

    // 관계
    artists?: Artist[];
    slots?: Slot[];                     // 페스티벌용 아티스트 슬롯
    operationalSlots?: OperationalSlot[]; // 단독 공연용 운영 일정

    // 통계
    stats?: EventStats;

    // 배지 (UI 표시용)
    badges?: string[];

    // 메타 (Supabase 연동 후 optional)
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * LIVE/RECAP 모드 계산 함수
 * - LIVE: 현재 >= (startAt - 24h) AND 현재 < (endAt + 6h)
 * - RECAP: 현재 >= (endAt + 6h)
 * - endAt 누락 시: startAt 기준 24시간 동안 LIVE, 이후 RECAP
 */
export function getHubMode(event: Event, now: Date = new Date()): "LIVE" | "RECAP" {
    // override가 AUTO가 아니면 override 값 사용
    if (event.overrideMode !== "AUTO") {
        return event.overrideMode as "LIVE" | "RECAP";
    }

    const startAt = new Date(event.startAt);
    const liveStart = new Date(startAt.getTime() - 24 * 60 * 60 * 1000); // startAt - 24h

    // endAt이 없는 경우: startAt + 24시간을 기본 종료 시간으로 사용
    const endAt = event.endAt
        ? new Date(event.endAt)
        : new Date(startAt.getTime() + 24 * 60 * 60 * 1000); // startAt + 24h

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

/**
 * 타임테이블 뷰 타입 결정
 * - 명시적으로 지정된 경우 해당 값 사용
 * - 페스티벌/뮤지컬 → grid
 * - 콘서트/전시 → linear
 */
export function getTimetableViewType(event: Event): TimetableViewType {
    // 명시적 설정이 있으면 사용
    if (event.timetableType) {
        return event.timetableType;
    }

    // 스테이지가 2개 이상이면 grid
    if (event.stages && event.stages.length >= 2) {
        return "grid";
    }

    // 행사 유형에 따라 기본값 결정
    switch (event.type) {
        case "festival":
            return "grid";
        case "concert":
        case "musical":
        case "exhibition":
        default:
            return "linear";
    }
}
