/**
 * Events Seed Script
 *
 * MOCK_EVENTS 데이터를 Supabase에 삽입
 * 외래키 의존성: venues, artists 먼저 삽입 필요
 */

import { adminClient } from "./admin-client";
import { VENUE_IDS, ARTIST_IDS, EVENT_IDS, STAGE_IDS, OPERATIONAL_SLOT_IDS } from "./uuid-map";
import type { TablesInsert } from "../../src/types/database";

// 헬퍼 함수: 날짜 생성
const addDays = (date: Date, days: number) =>
    new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const now = new Date();

// Events 데이터 (MOCK_EVENTS 기반)
export const SEED_EVENTS: TablesInsert<"events">[] = [
    // Scenario A: 기본 (단일일정, 예정)
    {
        id: EVENT_IDS["55948"],
        title: "THE MARCHING OF AG! TOUR IN SEOUL",
        start_at: addDays(now, 30).toISOString(),
        end_at: addDays(now, 30).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v1,
        type: "concert",
        status: "SCHEDULED",
        override_mode: "AUTO",
        poster_url: "https://i.scdn.co/image/ab6761610000e5eb4a3678104d4a3678104d4a36",
        price: "VIP 143,000원 / 일반 132,000원",
        age_restriction: "8세 이상",
        ticket_links: [
            { name: "인터파크 티켓", url: "https://tickets.interpark.com/goods/24016943" },
            { name: "YES24 티켓", url: "https://ticket.yes24.com/Perf/55948" },
        ],
        timetable_type: "linear",
        wishlist_count: 1200,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["Hot"],
    },

    // Scenario B: 다일(multi-day) 페스티벌 - 진행중
    {
        id: EVENT_IDS.e2,
        title: "Seoul Jazz Festival 2025",
        start_at: addDays(now, -1).toISOString(),
        end_at: addDays(now, 1).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v3,
        type: "festival",
        status: "SCHEDULED",
        override_mode: "AUTO",
        poster_url: "/images/seoul-jazz.jpg",
        price: "1일권 165,000원 / 2일권 280,000원",
        description: "서울재즈페스티벌 2025",
        ticket_links: [
            { name: "멜론티켓", url: "https://ticket.melon.com/performance/detail.htm?prodId=209123" },
            { name: "티켓링크", url: "https://www.ticketlink.co.kr/product/45678" },
        ],
        timetable_type: "grid",
        wishlist_count: 3200,
        attended_count: 1500,
        report_count: 42,
        review_count: 120,
        badges: ["LIVE"],
    },

    // Scenario C: 종료 시각 누락 (엣지)
    {
        id: EVENT_IDS["24016943"],
        title: "뮤지컬 시카고 25주년 내한공연",
        start_at: addDays(now, -30).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v2,
        type: "musical",
        status: "SCHEDULED",
        override_mode: "AUTO",
        poster_url: "http://ticketimage.interpark.com/Play/image/large/24/24016943_p.gif",
        price: "VIP 160,000원",
        age_restriction: "8세 이상",
        wishlist_count: 5400,
        attended_count: 4200,
        report_count: 0,
        review_count: 350,
        badges: [],
    },

    // Scenario D: 취소(CANCELED)
    {
        id: EVENT_IDS.e4,
        title: "취소된 콘서트 예시",
        start_at: addDays(now, 14).toISOString(),
        end_at: addDays(now, 14).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v4,
        type: "concert",
        status: "CANCELED",
        override_mode: "AUTO",
        price: "전석 110,000원",
        wishlist_count: 800,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["취소됨"],
    },

    // Scenario E: 연기(POSTPONED)
    {
        id: EVENT_IDS.e5,
        title: "연기된 공연 예시",
        start_at: addDays(now, 60).toISOString(),
        end_at: addDays(now, 60).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v5,
        type: "concert",
        status: "POSTPONED",
        override_mode: "AUTO",
        price: "R석 132,000원 / S석 110,000원",
        wishlist_count: 450,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["일정 변경"],
    },

    // 추가: 곧 시작할 행사
    {
        id: EVENT_IDS.e6,
        title: "다가오는 인디 공연",
        start_at: addDays(now, 3).toISOString(),
        end_at: addDays(now, 3).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v6,
        type: "concert",
        status: "SCHEDULED",
        override_mode: "AUTO",
        price: "30,000원",
        wishlist_count: 150,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["D-3"],
    },

    // 무료 행사 - 서울
    {
        id: EVENT_IDS.e7,
        title: "한강 버스킹 페스티벌",
        start_at: addDays(now, 7).toISOString(),
        end_at: addDays(now, 7).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v7,
        type: "festival",
        status: "SCHEDULED",
        override_mode: "AUTO",
        price: "무료",
        description: "한강에서 즐기는 무료 버스킹 공연",
        wishlist_count: 500,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["Free"],
    },

    // 부산 행사
    {
        id: EVENT_IDS.e8,
        title: "부산 락 페스티벌 2025",
        start_at: addDays(now, 14).toISOString(),
        end_at: addDays(now, 15).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v8,
        type: "festival",
        status: "SCHEDULED",
        override_mode: "AUTO",
        poster_url: "/images/busan-rock.jpg",
        price: "1일권 88,000원 / 2일권 150,000원",
        description: "부산 최대 규모 락 페스티벌",
        wishlist_count: 2100,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["Hot"],
    },

    // 인천 무료 행사
    {
        id: EVENT_IDS.e9,
        title: "인천 펜타포트 프리 스테이지",
        start_at: addDays(now, 21).toISOString(),
        end_at: addDays(now, 21).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v9,
        type: "concert",
        status: "SCHEDULED",
        override_mode: "AUTO",
        price: "무료 (사전등록 필수)",
        description: "펜타포트 페스티벌 사전 무료 공연",
        wishlist_count: 800,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["Free"],
    },

    // 대전 행사
    {
        id: EVENT_IDS.e10,
        title: "대전 사이언스 뮤직 페스티벌",
        start_at: addDays(now, 10).toISOString(),
        end_at: addDays(now, 10).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v10,
        type: "festival",
        status: "SCHEDULED",
        override_mode: "AUTO",
        price: "55,000원",
        description: "과학과 음악의 만남",
        wishlist_count: 350,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
    },

    // 광주 무료 전시
    {
        id: EVENT_IDS.e11,
        title: "광주 미디어아트 전시",
        start_at: addDays(now, 5).toISOString(),
        end_at: addDays(now, 60).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v11,
        type: "exhibition",
        status: "SCHEDULED",
        override_mode: "AUTO",
        price: "무료",
        description: "광주에서 만나는 미디어아트",
        wishlist_count: 420,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["Free"],
    },

    // Scenario G: 멀티스테이지 페스티벌 (인천 펜타포트 스타일)
    {
        id: EVENT_IDS.pentaport,
        title: "Incheon Pentaport Rock Festival 2025",
        start_at: addDays(now, 0).toISOString(),
        end_at: addDays(now, 2).toISOString(),
        timezone: "Asia/Seoul",
        venue_id: VENUE_IDS.v12,
        type: "festival",
        status: "SCHEDULED",
        override_mode: "AUTO",
        poster_url: "/images/pentaport.jpg",
        price: "1일권 99,000원 / 3일권 220,000원",
        description: "대한민국 대표 록 페스티벌. 3개 스테이지에서 동시 진행!",
        ticket_links: [
            { name: "인터파크 티켓", url: "https://tickets.interpark.com/pentaport" },
            { name: "멜론티켓", url: "https://ticket.melon.com/pentaport" },
        ],
        timetable_type: "grid",
        wishlist_count: 8500,
        attended_count: 0,
        report_count: 28,
        review_count: 0,
        badges: ["LIVE", "Hot"],
    },

    // Scenario F: 해외 (Asia/Tokyo)
    {
        id: EVENT_IDS.eF,
        title: "SUMMER SONIC 2025 TOKYO",
        start_at: addDays(now, 45).toISOString(),
        end_at: addDays(now, 46).toISOString(),
        timezone: "Asia/Tokyo",
        venue_id: VENUE_IDS.vF,
        type: "festival",
        status: "SCHEDULED",
        override_mode: "AUTO",
        poster_url: "/images/summer-sonic.jpg",
        price: "1日券 ¥19,800 / 2日券 ¥37,000",
        description: "일본 최대 여름 록 페스티벌",
        wishlist_count: 890,
        attended_count: 0,
        report_count: 0,
        review_count: 0,
        badges: ["해외"],
    },
];

// Stages 데이터 (grid 타입 이벤트용)
export const SEED_STAGES: TablesInsert<"stages">[] = [
    // Seoul Jazz Festival
    { id: STAGE_IDS["sjf-main"], event_id: EVENT_IDS.e2, name: "Main Stage", display_order: 1, color: "#EF4444" },
    { id: STAGE_IDS["sjf-second"], event_id: EVENT_IDS.e2, name: "Second Stage", display_order: 2, color: "#F59E0B" },

    // Pentaport
    { id: STAGE_IDS["pp-main"], event_id: EVENT_IDS.pentaport, name: "Main Stage", display_order: 1, color: "#EF4444" },
    { id: STAGE_IDS["pp-second"], event_id: EVENT_IDS.pentaport, name: "Second Stage", display_order: 2, color: "#F59E0B" },
    { id: STAGE_IDS["pp-third"], event_id: EVENT_IDS.pentaport, name: "Third Stage", display_order: 3, color: "#3B82F6" },
];

// Event-Artist 관계 데이터
export const SEED_EVENT_ARTISTS: TablesInsert<"event_artists">[] = [
    // Scenario A
    { event_id: EVENT_IDS["55948"], artist_id: ARTIST_IDS.a1, display_order: 1 },

    // Scenario B: Seoul Jazz Festival
    { event_id: EVENT_IDS.e2, artist_id: ARTIST_IDS.a2, display_order: 1 },
    { event_id: EVENT_IDS.e2, artist_id: ARTIST_IDS.a3, display_order: 2 },
    { event_id: EVENT_IDS.e2, artist_id: ARTIST_IDS.a5, display_order: 3 },
    { event_id: EVENT_IDS.e2, artist_id: ARTIST_IDS.a6, display_order: 4 },
    { event_id: EVENT_IDS.e2, artist_id: ARTIST_IDS.a7, display_order: 5 },
    { event_id: EVENT_IDS.e2, artist_id: ARTIST_IDS.a8, display_order: 6 },
    { event_id: EVENT_IDS.e2, artist_id: ARTIST_IDS.a9, display_order: 7 },

    // e6: 다가오는 인디 공연
    { event_id: EVENT_IDS.e6, artist_id: ARTIST_IDS.a4, display_order: 1 },

    // e7: 한강 버스킹
    { event_id: EVENT_IDS.e7, artist_id: ARTIST_IDS.a10, display_order: 1 },

    // e8: 부산 락 페스티벌
    { event_id: EVENT_IDS.e8, artist_id: ARTIST_IDS.a11, display_order: 1 },
    { event_id: EVENT_IDS.e8, artist_id: ARTIST_IDS.a12, display_order: 2 },

    // e9: 인천 펜타포트 프리
    { event_id: EVENT_IDS.e9, artist_id: ARTIST_IDS.a13, display_order: 1 },

    // e10: 대전 사이언스 뮤직
    { event_id: EVENT_IDS.e10, artist_id: ARTIST_IDS.a14, display_order: 1 },

    // Pentaport
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp1, display_order: 1 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp2, display_order: 2 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp3, display_order: 3 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp4, display_order: 4 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp5, display_order: 5 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp6, display_order: 6 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp7, display_order: 7 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp8, display_order: 8 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp9, display_order: 9 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp10, display_order: 10 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp11, display_order: 11 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS.pp12, display_order: 12 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS["pp-bts"], display_order: 13 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS["pp-nj"], display_order: 14 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS["pp-ive"], display_order: 15 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS["pp-aespa"], display_order: 16 },
    { event_id: EVENT_IDS.pentaport, artist_id: ARTIST_IDS["pp-bb"], display_order: 17 },

    // Scenario F
    { event_id: EVENT_IDS.eF, artist_id: ARTIST_IDS.aF1, display_order: 1 },
    { event_id: EVENT_IDS.eF, artist_id: ARTIST_IDS.aF2, display_order: 2 },
];

// Operational Slots (운영 일정)
export const SEED_OPERATIONAL_SLOTS: TablesInsert<"operational_slots">[] = [
    // Scenario A: 55948
    {
        id: OPERATIONAL_SLOT_IDS.os1,
        event_id: EVENT_IDS["55948"],
        type: "md_sale",
        start_at: new Date(addDays(now, 30).setHours(15, 0, 0, 0)).toISOString(),
        end_at: new Date(addDays(now, 30).setHours(18, 0, 0, 0)).toISOString(),
        location: "1층 로비",
        description: "공식 MD 현장 판매. 일부 품목 한정수량.",
    },
    {
        id: OPERATIONAL_SLOT_IDS.os2,
        event_id: EVENT_IDS["55948"],
        type: "ticket_pickup",
        start_at: new Date(addDays(now, 30).setHours(16, 0, 0, 0)).toISOString(),
        end_at: new Date(addDays(now, 30).setHours(18, 30, 0, 0)).toISOString(),
        location: "1층 매표소",
        description: "현장수령 예매자 티켓 수령",
    },
    {
        id: OPERATIONAL_SLOT_IDS.os3,
        event_id: EVENT_IDS["55948"],
        type: "standing_entry",
        start_at: new Date(addDays(now, 30).setHours(18, 0, 0, 0)).toISOString(),
        location: "2층 입구",
        description: "스탠딩 순번대로 입장",
    },
    {
        id: OPERATIONAL_SLOT_IDS.os4,
        event_id: EVENT_IDS["55948"],
        type: "seated_entry",
        start_at: new Date(addDays(now, 30).setHours(18, 30, 0, 0)).toISOString(),
        location: "1층 정문",
        description: "지정석 입장",
    },
    {
        id: OPERATIONAL_SLOT_IDS.os5,
        event_id: EVENT_IDS["55948"],
        type: "show_start",
        start_at: new Date(addDays(now, 30).setHours(19, 0, 0, 0)).toISOString(),
        is_highlight: true,
    },
    {
        id: OPERATIONAL_SLOT_IDS.os6,
        event_id: EVENT_IDS["55948"],
        type: "encore",
        start_at: new Date(addDays(now, 30).setHours(20, 30, 0, 0)).toISOString(),
        description: "앵콜 예상 시간",
    },
    {
        id: OPERATIONAL_SLOT_IDS.os7,
        event_id: EVENT_IDS["55948"],
        type: "show_end",
        start_at: new Date(addDays(now, 30).setHours(21, 0, 0, 0)).toISOString(),
        description: "공연 종료 예상",
    },
];

export async function seedEvents(): Promise<void> {
    console.log("🎪 Seeding events...");

    // 1. Events 삽입
    const { error: eventsError } = await adminClient
        .from("events")
        .upsert(SEED_EVENTS, { onConflict: "id" });

    if (eventsError) {
        throw new Error(`Failed to seed events: ${eventsError.message}`);
    }
    console.log(`✅ Seeded ${SEED_EVENTS.length} events`);

    // 2. Stages 삽입
    const { error: stagesError } = await adminClient
        .from("stages")
        .upsert(SEED_STAGES, { onConflict: "id" });

    if (stagesError) {
        throw new Error(`Failed to seed stages: ${stagesError.message}`);
    }
    console.log(`✅ Seeded ${SEED_STAGES.length} stages`);

    // 3. Event-Artists 관계 삽입 (기존 삭제 후 삽입)
    const eventIds = [...new Set(SEED_EVENT_ARTISTS.map(ea => ea.event_id))];
    await adminClient
        .from("event_artists")
        .delete()
        .in("event_id", eventIds);

    const { error: eventArtistsError } = await adminClient
        .from("event_artists")
        .insert(SEED_EVENT_ARTISTS);

    if (eventArtistsError) {
        throw new Error(`Failed to seed event_artists: ${eventArtistsError.message}`);
    }
    console.log(`✅ Seeded ${SEED_EVENT_ARTISTS.length} event-artist relations`);

    // 4. Operational Slots 삽입
    const { error: opsError } = await adminClient
        .from("operational_slots")
        .upsert(SEED_OPERATIONAL_SLOTS, { onConflict: "id" });

    if (opsError) {
        throw new Error(`Failed to seed operational_slots: ${opsError.message}`);
    }
    console.log(`✅ Seeded ${SEED_OPERATIONAL_SLOTS.length} operational slots`);
}

// 직접 실행 시
if (require.main === module) {
    seedEvents()
        .then(() => {
            console.log("Events seeding completed!");
            process.exit(0);
        })
        .catch((err) => {
            console.error("Events seeding failed:", err);
            process.exit(1);
        });
}
