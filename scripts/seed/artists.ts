/**
 * Artists Seed Script
 *
 * MOCK_EVENTS에서 artist 정보를 추출하여 Supabase에 삽입
 */

import { adminClient } from "./admin-client";
import { ARTIST_IDS } from "./uuid-map";
import type { TablesInsert } from "../../src/types/database";

// Mock artists 데이터 (MOCK_EVENTS에서 추출)
export const SEED_ARTISTS: TablesInsert<"artists">[] = [
    // Scenario A: THE MARCHING OF AG!
    {
        id: ARTIST_IDS.a1,
        name: "Atarashii Gakko!",
        image_url: "https://i.scdn.co/image/ab6761610000e5eb4a3678104d4a3678104d4a36",
        genre: "J-Pop",
        fanchant: "공연 시작 전 '새로운 학교의 리더즈!' 구호. 'オトナブルー' 후렴에서 다같이 점프!",
        lightstick_color: "#FF6B9D",
        popular_songs: ["オトナブルー", "TOKYO CALLING", "Pineapple Kryptonite", "NAINAINAI"],
    },

    // Scenario B: Seoul Jazz Festival
    {
        id: ARTIST_IDS.a2,
        name: "Norah Jones",
        image_url: "https://i.scdn.co/image/ab6761610000e5eb5c4c7c6e8e5e7c8c9d9e0f1a",
        genre: "Jazz / Soul",
        fanchant: "조용히 음악에 집중하는 분위기. 박수와 환호로 호응!",
        popular_songs: ["Don't Know Why", "Come Away with Me", "Sunrise"],
    },
    {
        id: ARTIST_IDS.a3,
        name: "Robert Glasper",
        genre: "Jazz / Hip-Hop",
        fanchant: "그루브에 맞춰 몸을 흔들며 호응. 즉흥 연주 시 박수!",
        popular_songs: ["Afro Blue", "F.T.B.", "Levels"],
    },
    {
        id: ARTIST_IDS.a4,
        name: "인디 밴드 A",
        genre: "Indie Rock",
    },
    {
        id: ARTIST_IDS.a5,
        name: "Snarky Puppy",
        genre: "Jazz Fusion",
        fanchant: "그루브에 몸을 맡기고 자유롭게! 솔로 파트마다 환호!",
        popular_songs: ["Lingus", "What About Me?", "Shofukan"],
    },
    {
        id: ARTIST_IDS.a6,
        name: "Hiatus Kaiyote",
        genre: "Future Soul / Neo-Soul",
        fanchant: "복잡한 리듬에 맞춰 고개 끄덕이기. 클라이맥스에서 함성!",
        popular_songs: ["Nakamarra", "Breathing Underwater", "Get Sun"],
    },
    {
        id: ARTIST_IDS.a7,
        name: "Cory Wong",
        genre: "Funk / Jazz",
        fanchant: "펑키한 리듬에 박수! 'Wong's Cafe' 때 다같이 점프!",
        lightstick_color: "#FFD700",
        popular_songs: ["Golden", "Lunchtime", "Wong's Cafe"],
    },
    {
        id: ARTIST_IDS.a8,
        name: "Jacob Collier",
        genre: "Multi-genre / Jazz",
        fanchant: "관객 합창 파트 많음! 화음 맞추기 도전. 손뼉 박자 맞추기!",
        popular_songs: ["Moon River", "All I Need", "In My Room"],
    },
    {
        id: ARTIST_IDS.a9,
        name: "Youn Sun Nah",
        genre: "Jazz Vocal",
        fanchant: "조용히 경청. 감동적인 순간엔 박수 대신 환호!",
        popular_songs: ["My Favorite Things", "Momento Magico", "Lento"],
    },
    {
        id: ARTIST_IDS.a10,
        name: "버스킹 아티스트",
        genre: "Acoustic",
    },
    {
        id: ARTIST_IDS.a11,
        name: "락 밴드 A",
        genre: "Rock",
    },
    {
        id: ARTIST_IDS.a12,
        name: "락 밴드 B",
        genre: "Rock",
    },
    {
        id: ARTIST_IDS.a13,
        name: "인디 아티스트 C",
        genre: "Indie",
    },
    {
        id: ARTIST_IDS.a14,
        name: "일렉트로닉 아티스트",
        genre: "Electronic",
    },

    // Pentaport Festival artists
    {
        id: ARTIST_IDS.pp1,
        name: "NELL",
        image_url: "/artists/nell.jpg",
        genre: "Alternative Rock",
    },
    {
        id: ARTIST_IDS.pp2,
        name: "Jaurim",
        image_url: "/artists/jaurim.jpg",
        genre: "Rock",
    },
    {
        id: ARTIST_IDS.pp3,
        name: "YB",
        image_url: "/artists/yb.jpg",
        genre: "Rock",
    },
    {
        id: ARTIST_IDS.pp4,
        name: "Hyukoh",
        image_url: "/artists/hyukoh.jpg",
        genre: "Indie Rock",
    },
    {
        id: ARTIST_IDS.pp5,
        name: "The Black Skirts",
        image_url: "/artists/blackskirts.jpg",
        genre: "Indie Pop",
    },
    {
        id: ARTIST_IDS.pp6,
        name: "SECHSKIES",
        image_url: "/artists/sechskies.jpg",
        genre: "K-Pop",
    },
    {
        id: ARTIST_IDS.pp7,
        name: "Crying Nut",
        image_url: "/artists/cryingnut.jpg",
        genre: "Punk Rock",
    },
    {
        id: ARTIST_IDS.pp8,
        name: "No Brain",
        image_url: "/artists/nobrain.jpg",
        genre: "Punk Rock",
    },
    {
        id: ARTIST_IDS.pp9,
        name: "GUCKKASTEN",
        image_url: "/artists/guckkasten.jpg",
        genre: "Alternative Rock",
    },
    {
        id: ARTIST_IDS.pp10,
        name: "BUZZ",
        image_url: "/artists/buzz.jpg",
        genre: "Rock",
    },
    {
        id: ARTIST_IDS.pp11,
        name: "Daybreak",
        image_url: "/artists/daybreak.jpg",
        genre: "Indie",
    },
    {
        id: ARTIST_IDS.pp12,
        name: "Jannabi",
        image_url: "/artists/jannabi.jpg",
        genre: "Indie Rock",
    },

    // K-Pop artists for call guide testing
    {
        id: ARTIST_IDS["pp-bts"],
        name: "BTS",
        image_url: "/artists/bts.jpg",
        genre: "K-Pop",
        fanchant: "아미~ 방탄!",
    },
    {
        id: ARTIST_IDS["pp-nj"],
        name: "NewJeans",
        image_url: "/artists/newjeans.jpg",
        genre: "K-Pop",
        fanchant: "버니즈!",
    },
    {
        id: ARTIST_IDS["pp-ive"],
        name: "IVE",
        image_url: "/artists/ive.jpg",
        genre: "K-Pop",
        fanchant: "다이브!",
    },
    {
        id: ARTIST_IDS["pp-aespa"],
        name: "aespa",
        image_url: "/artists/aespa.jpg",
        genre: "K-Pop",
        fanchant: "마이!",
    },
    {
        id: ARTIST_IDS["pp-bb"],
        name: "BIGBANG",
        image_url: "/artists/bigbang.jpg",
        genre: "K-Pop",
        fanchant: "VIP!",
    },

    // Scenario F: Summer Sonic
    {
        id: ARTIST_IDS.aF1,
        name: "Japanese Artist A",
        genre: "J-Rock",
    },
    {
        id: ARTIST_IDS.aF2,
        name: "International Artist B",
        genre: "Pop",
    },
];

export async function seedArtists(): Promise<void> {
    console.log("🎤 Seeding artists...");

    // 기존 데이터 삭제
    const { error: deleteError } = await adminClient
        .from("artists")
        .delete()
        .in("id", SEED_ARTISTS.map(a => a.id));

    if (deleteError) {
        console.warn("Warning: Could not delete existing artists:", deleteError.message);
    }

    // 새 데이터 삽입
    const { data, error } = await adminClient
        .from("artists")
        .upsert(SEED_ARTISTS, { onConflict: "id" })
        .select();

    if (error) {
        throw new Error(`Failed to seed artists: ${error.message}`);
    }

    console.log(`✅ Seeded ${data?.length ?? 0} artists`);
}

// 직접 실행 시
if (require.main === module) {
    seedArtists()
        .then(() => {
            console.log("Artists seeding completed!");
            process.exit(0);
        })
        .catch((err) => {
            console.error("Artists seeding failed:", err);
            process.exit(1);
        });
}
