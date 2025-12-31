/**
 * Venues Seed Script
 *
 * MOCK_EVENTS에서 venue 정보를 추출하여 Supabase에 삽입
 */

import { adminClient } from "./admin-client";
import { VENUE_IDS } from "./uuid-map";
import type { TablesInsert } from "../../src/types/database";

// Mock venues 데이터 (MOCK_EVENTS에서 추출)
export const SEED_VENUES: TablesInsert<"venues">[] = [
    {
        id: VENUE_IDS.v1,
        name: "YES24 LIVE HALL",
        address: "서울시 광진구 능동로 130",
        lat: 37.5470,
        lng: 127.0722,
    },
    {
        id: VENUE_IDS.v2,
        name: "디큐브아트센터",
        address: "서울시 구로구 경인로 662",
        lat: 37.5086,
        lng: 126.8892,
    },
    {
        id: VENUE_IDS.v3,
        name: "올림픽공원",
        address: "서울시 송파구 올림픽로 424",
        lat: 37.5212,
        lng: 127.1215,
    },
    {
        id: VENUE_IDS.v4,
        name: "KSPO DOME",
        address: "서울시 송파구 올림픽로 424",
        lat: 37.5168,
        lng: 127.1304,
    },
    {
        id: VENUE_IDS.v5,
        name: "블루스퀘어",
        address: "서울시 용산구 이태원로 294",
        lat: 37.5410,
        lng: 126.9970,
    },
    {
        id: VENUE_IDS.v6,
        name: "홍대 클럽",
        address: "서울시 마포구 와우산로",
        lat: 37.5547,
        lng: 126.9234,
    },
    {
        id: VENUE_IDS.v7,
        name: "반포한강공원",
        address: "서울시 서초구 신반포로11길 40",
        lat: 37.5097,
        lng: 127.0012,
    },
    {
        id: VENUE_IDS.v8,
        name: "부산 삼락생태공원",
        address: "부산시 사상구 삼락동",
        lat: 35.1433,
        lng: 128.9737,
    },
    {
        id: VENUE_IDS.v9,
        name: "송도 센트럴파크",
        address: "인천시 연수구 송도동",
        lat: 37.3917,
        lng: 126.6409,
    },
    {
        id: VENUE_IDS.v10,
        name: "대전엑스포시민광장",
        address: "대전시 유성구 대덕대로 480",
        lat: 36.3733,
        lng: 127.3880,
    },
    {
        id: VENUE_IDS.v11,
        name: "국립아시아문화전당",
        address: "광주시 동구 문화전당로 38",
        lat: 35.1468,
        lng: 126.9184,
    },
    {
        id: VENUE_IDS.v12,
        name: "송도 달빛축제공원",
        address: "인천시 연수구 송도동",
        lat: 37.4016,
        lng: 126.6380,
    },
    {
        id: VENUE_IDS.vF,
        name: "ZOZOマリンスタジアム",
        address: "千葉市美浜区美浜1",
        lat: 35.6450,
        lng: 140.0318,
    },
];

export async function seedVenues(): Promise<void> {
    console.log("🏟️  Seeding venues...");

    // 기존 데이터 삭제
    const { error: deleteError } = await adminClient
        .from("venues")
        .delete()
        .in("id", SEED_VENUES.map(v => v.id));

    if (deleteError) {
        console.warn("Warning: Could not delete existing venues:", deleteError.message);
    }

    // 새 데이터 삽입
    const { data, error } = await adminClient
        .from("venues")
        .upsert(SEED_VENUES, { onConflict: "id" })
        .select();

    if (error) {
        throw new Error(`Failed to seed venues: ${error.message}`);
    }

    console.log(`✅ Seeded ${data?.length ?? 0} venues`);
}

// 직접 실행 시
if (require.main === module) {
    seedVenues()
        .then(() => {
            console.log("Venues seeding completed!");
            process.exit(0);
        })
        .catch((err) => {
            console.error("Venues seeding failed:", err);
            process.exit(1);
        });
}
