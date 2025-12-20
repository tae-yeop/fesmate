import { Event, Slot } from "@/types/event";
import { Post } from "@/types/post";
import { Notification } from "@/types/notification";

/**
 * Mock 행사 데이터 - PRD v0.5 기준
 * Scenario A~F 시나리오 데이터셋
 */

// 헬퍼 함수: 날짜 생성
const addDays = (date: Date, days: number) =>
    new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const now = new Date();

export const MOCK_EVENTS: Event[] = [
    // Scenario A: 기본 (단일일정, 예정)
    {
        id: "55948",
        title: "THE MARCHING OF AG! TOUR IN SEOUL",
        startAt: addDays(now, 30),
        endAt: addDays(now, 30),
        timezone: "Asia/Seoul",
        venue: {
            id: "v1",
            name: "YES24 LIVE HALL",
            address: "서울시 광진구 능동로 130",
        },
        type: "concert",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        posterUrl: "https://i.scdn.co/image/ab6761610000e5eb4a3678104d4a3678104d4a36",
        price: "VIP 143,000원 / 일반 132,000원",
        ageRestriction: "8세 이상",
        artists: [
            {
                id: "a1",
                name: "Atarashii Gakko!",
                image: "https://i.scdn.co/image/ab6761610000e5eb4a3678104d4a3678104d4a36",
                genre: "J-Pop",
                fanchant: "공연 시작 전 '새로운 학교의 리더즈!' 구호. 'オトナブルー' 후렴에서 다같이 점프!",
                lightstickColor: "#FF6B9D",
                socialLinks: [
                    { type: "instagram", url: "https://www.instagram.com/japanleaders" },
                    { type: "youtube", url: "https://www.youtube.com/@AtarashiiGakko" },
                    { type: "spotify", url: "https://open.spotify.com/artist/1qM3FNcvYKaUXqVFCFNvXK" },
                ],
                popularSongs: ["オトナブルー", "TOKYO CALLING", "Pineapple Kryptonite", "NAINAINAI"],
            },
        ],
        ticketLinks: [
            { name: "인터파크 티켓", url: "https://tickets.interpark.com/goods/24016943" },
            { name: "YES24 티켓", url: "https://ticket.yes24.com/Perf/55948" },
        ],
        stats: {
            reportCount: 0,
            companionCount: 3,
            wishlistCount: 1200,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["Hot"],
        createdAt: addDays(now, -10),
        updatedAt: addDays(now, -10),
    },

    // Scenario B: 다일(multi-day) 페스티벌 - 진행중
    {
        id: "e2",
        title: "Seoul Jazz Festival 2025",
        startAt: addDays(now, -1), // 어제 시작
        endAt: addDays(now, 1),    // 내일 종료
        timezone: "Asia/Seoul",
        venue: {
            id: "v3",
            name: "올림픽공원",
            address: "서울시 송파구 올림픽로 424",
        },
        type: "festival",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        posterUrl: "/images/seoul-jazz.jpg",
        price: "1일권 165,000원 / 2일권 280,000원",
        description: "서울재즈페스티벌 2025",
        artists: [
            {
                id: "a2",
                name: "Norah Jones",
                genre: "Jazz / Soul",
                image: "https://i.scdn.co/image/ab6761610000e5eb5c4c7c6e8e5e7c8c9d9e0f1a",
                fanchant: "조용히 음악에 집중하는 분위기. 박수와 환호로 호응!",
                socialLinks: [
                    { type: "instagram", url: "https://www.instagram.com/norahjones" },
                    { type: "spotify", url: "https://open.spotify.com/artist/2Kx7MNY7cI1ENniW7vT30N" },
                ],
                popularSongs: ["Don't Know Why", "Come Away with Me", "Sunrise"],
            },
            {
                id: "a3",
                name: "Robert Glasper",
                genre: "Jazz / Hip-Hop",
                fanchant: "그루브에 맞춰 몸을 흔들며 호응. 즉흥 연주 시 박수!",
                socialLinks: [
                    { type: "instagram", url: "https://www.instagram.com/robertglasper" },
                    { type: "youtube", url: "https://www.youtube.com/@RobertGlasper" },
                ],
                popularSongs: ["Afro Blue", "F.T.B.", "Levels"],
            },
            {
                id: "a5",
                name: "Snarky Puppy",
                genre: "Jazz Fusion",
                fanchant: "그루브에 몸을 맡기고 자유롭게! 솔로 파트마다 환호!",
                socialLinks: [
                    { type: "instagram", url: "https://www.instagram.com/snarkypuppy" },
                    { type: "youtube", url: "https://www.youtube.com/@SnarkypuppyNYC" },
                ],
                popularSongs: ["Lingus", "What About Me?", "Shofukan"],
            },
            {
                id: "a6",
                name: "Hiatus Kaiyote",
                genre: "Future Soul / Neo-Soul",
                fanchant: "복잡한 리듬에 맞춰 고개 끄덕이기. 클라이맥스에서 함성!",
                socialLinks: [
                    { type: "instagram", url: "https://www.instagram.com/hiatuskaiyote" },
                    { type: "spotify", url: "https://open.spotify.com/artist/3ggwAqZD3l" },
                ],
                popularSongs: ["Nakamarra", "Breathing Underwater", "Get Sun"],
            },
            {
                id: "a7",
                name: "Cory Wong",
                genre: "Funk / Jazz",
                fanchant: "펑키한 리듬에 박수! 'Wong's Cafe' 때 다같이 점프!",
                lightstickColor: "#FFD700",
                socialLinks: [
                    { type: "instagram", url: "https://www.instagram.com/corywong" },
                    { type: "youtube", url: "https://www.youtube.com/@corywong" },
                ],
                popularSongs: ["Golden", "Lunchtime", "Wong's Cafe"],
            },
            {
                id: "a8",
                name: "Jacob Collier",
                genre: "Multi-genre / Jazz",
                fanchant: "관객 합창 파트 많음! 화음 맞추기 도전. 손뼉 박자 맞추기!",
                socialLinks: [
                    { type: "instagram", url: "https://www.instagram.com/jacobcollier" },
                    { type: "youtube", url: "https://www.youtube.com/@jacobcollier" },
                ],
                popularSongs: ["Moon River", "All I Need", "In My Room"],
            },
            {
                id: "a9",
                name: "Youn Sun Nah",
                genre: "Jazz Vocal",
                fanchant: "조용히 경청. 감동적인 순간엔 박수 대신 환호!",
                socialLinks: [
                    { type: "instagram", url: "https://www.instagram.com/younsunnah" },
                ],
                popularSongs: ["My Favorite Things", "Momento Magico", "Lento"],
            },
        ],
        ticketLinks: [
            { name: "멜론티켓", url: "https://ticket.melon.com/performance/detail.htm?prodId=209123" },
            { name: "티켓링크", url: "https://www.ticketlink.co.kr/product/45678" },
        ],
        stats: {
            reportCount: 42,
            companionCount: 15,
            wishlistCount: 3200,
            attendedCount: 1500,
            reviewCount: 120,
        },
        badges: ["LIVE"],
        createdAt: addDays(now, -60),
        updatedAt: addDays(now, -1),
    },

    // Scenario C: 종료 시각 누락 (엣지) - endAt 없음
    {
        id: "24016943",
        title: "뮤지컬 시카고 25주년 내한공연",
        startAt: addDays(now, -30),
        // endAt 누락 - "종료 시간 미정" 테스트
        timezone: "Asia/Seoul",
        venue: {
            id: "v2",
            name: "디큐브아트센터",
            address: "서울시 구로구 경인로 662",
        },
        type: "musical",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        posterUrl: "http://ticketimage.interpark.com/Play/image/large/24/24016943_p.gif",
        price: "VIP 160,000원",
        ageRestriction: "8세 이상",
        stats: {
            reportCount: 0,
            companionCount: 8,
            wishlistCount: 5400,
            attendedCount: 4200,
            reviewCount: 350,
        },
        badges: [],
        createdAt: addDays(now, -90),
        updatedAt: addDays(now, -7),
    },

    // Scenario D: 취소(CANCELED)
    {
        id: "e4",
        title: "취소된 콘서트 예시",
        startAt: addDays(now, 14),
        endAt: addDays(now, 14),
        timezone: "Asia/Seoul",
        venue: {
            id: "v4",
            name: "KSPO DOME",
            address: "서울시 송파구 올림픽로 424",
        },
        type: "concert",
        status: "CANCELED",
        overrideMode: "AUTO",
        price: "전석 110,000원",
        stats: {
            reportCount: 0,
            companionCount: 0,
            wishlistCount: 800,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["취소됨"],
        createdAt: addDays(now, -30),
        updatedAt: addDays(now, -2),
    },

    // Scenario E: 연기(POSTPONED)
    {
        id: "e5",
        title: "연기된 공연 예시",
        startAt: addDays(now, 60), // 원래 날짜에서 연기
        endAt: addDays(now, 60),
        timezone: "Asia/Seoul",
        venue: {
            id: "v5",
            name: "블루스퀘어",
            address: "서울시 용산구 이태원로 294",
        },
        type: "concert",
        status: "POSTPONED",
        overrideMode: "AUTO",
        price: "R석 132,000원 / S석 110,000원",
        stats: {
            reportCount: 0,
            companionCount: 2,
            wishlistCount: 450,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["일정 변경"],
        createdAt: addDays(now, -45),
        updatedAt: addDays(now, -3),
    },

    // 추가: 곧 시작할 행사
    {
        id: "e6",
        title: "다가오는 인디 공연",
        startAt: addDays(now, 3),
        endAt: addDays(now, 3),
        timezone: "Asia/Seoul",
        venue: {
            id: "v6",
            name: "홍대 클럽",
            address: "서울시 마포구 와우산로",
        },
        type: "concert",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        price: "30,000원",
        artists: [
            { id: "a4", name: "인디 밴드 A", genre: "Indie Rock" },
        ],
        stats: {
            reportCount: 0,
            companionCount: 5,
            wishlistCount: 150,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["D-3"],
        createdAt: addDays(now, -7),
        updatedAt: addDays(now, -7),
    },

    // 무료 행사 - 서울
    {
        id: "e7",
        title: "한강 버스킹 페스티벌",
        startAt: addDays(now, 7),
        endAt: addDays(now, 7),
        timezone: "Asia/Seoul",
        venue: {
            id: "v7",
            name: "반포한강공원",
            address: "서울시 서초구 신반포로11길 40",
        },
        type: "festival",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        price: "무료",
        description: "한강에서 즐기는 무료 버스킹 공연",
        artists: [
            { id: "a10", name: "버스킹 아티스트", genre: "Acoustic" },
        ],
        stats: {
            reportCount: 0,
            companionCount: 8,
            wishlistCount: 500,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["Free"],
        createdAt: addDays(now, -5),
        updatedAt: addDays(now, -5),
    },

    // 부산 행사
    {
        id: "e8",
        title: "부산 락 페스티벌 2025",
        startAt: addDays(now, 14),
        endAt: addDays(now, 15),
        timezone: "Asia/Seoul",
        venue: {
            id: "v8",
            name: "부산 삼락생태공원",
            address: "부산시 사상구 삼락동",
        },
        type: "festival",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        posterUrl: "/images/busan-rock.jpg",
        price: "1일권 88,000원 / 2일권 150,000원",
        description: "부산 최대 규모 락 페스티벌",
        artists: [
            { id: "a11", name: "락 밴드 A", genre: "Rock" },
            { id: "a12", name: "락 밴드 B", genre: "Rock" },
        ],
        stats: {
            reportCount: 0,
            companionCount: 12,
            wishlistCount: 2100,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["Hot"],
        createdAt: addDays(now, -20),
        updatedAt: addDays(now, -20),
    },

    // 인천 무료 행사
    {
        id: "e9",
        title: "인천 펜타포트 프리 스테이지",
        startAt: addDays(now, 21),
        endAt: addDays(now, 21),
        timezone: "Asia/Seoul",
        venue: {
            id: "v9",
            name: "송도 센트럴파크",
            address: "인천시 연수구 송도동",
        },
        type: "concert",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        price: "무료 (사전등록 필수)",
        description: "펜타포트 페스티벌 사전 무료 공연",
        artists: [
            { id: "a13", name: "인디 아티스트 C", genre: "Indie" },
        ],
        stats: {
            reportCount: 0,
            companionCount: 3,
            wishlistCount: 800,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["Free"],
        createdAt: addDays(now, -3),
        updatedAt: addDays(now, -3),
    },

    // 대전 행사
    {
        id: "e10",
        title: "대전 사이언스 뮤직 페스티벌",
        startAt: addDays(now, 10),
        endAt: addDays(now, 10),
        timezone: "Asia/Seoul",
        venue: {
            id: "v10",
            name: "대전엑스포시민광장",
            address: "대전시 유성구 대덕대로 480",
        },
        type: "festival",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        price: "55,000원",
        description: "과학과 음악의 만남",
        artists: [
            { id: "a14", name: "일렉트로닉 아티스트", genre: "Electronic" },
        ],
        stats: {
            reportCount: 0,
            companionCount: 2,
            wishlistCount: 350,
            attendedCount: 0,
            reviewCount: 0,
        },
        createdAt: addDays(now, -8),
        updatedAt: addDays(now, -8),
    },

    // 광주 무료 전시
    {
        id: "e11",
        title: "광주 미디어아트 전시",
        startAt: addDays(now, 5),
        endAt: addDays(now, 60),
        timezone: "Asia/Seoul",
        venue: {
            id: "v11",
            name: "국립아시아문화전당",
            address: "광주시 동구 문화전당로 38",
        },
        type: "exhibition",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        price: "무료",
        description: "광주에서 만나는 미디어아트",
        stats: {
            reportCount: 0,
            companionCount: 0,
            wishlistCount: 420,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["Free"],
        createdAt: addDays(now, -15),
        updatedAt: addDays(now, -15),
    },

    // Scenario G: 멀티스테이지 페스티벌 (인천 펜타포트 스타일)
    {
        id: "pentaport",
        title: "Incheon Pentaport Rock Festival 2025",
        startAt: addDays(now, 0), // 오늘 시작
        endAt: addDays(now, 2),   // 3일간
        timezone: "Asia/Seoul",
        venue: {
            id: "v12",
            name: "송도 달빛축제공원",
            address: "인천시 연수구 송도동",
        },
        type: "festival",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        posterUrl: "/images/pentaport.jpg",
        price: "1일권 99,000원 / 3일권 220,000원",
        description: "대한민국 대표 록 페스티벌. 3개 스테이지에서 동시 진행!",
        artists: [
            { id: "pp1", name: "NELL", genre: "Alternative Rock", image: "/artists/nell.jpg" },
            { id: "pp2", name: "Jaurim", genre: "Rock", image: "/artists/jaurim.jpg" },
            { id: "pp3", name: "YB", genre: "Rock", image: "/artists/yb.jpg" },
            { id: "pp4", name: "Hyukoh", genre: "Indie Rock", image: "/artists/hyukoh.jpg" },
            { id: "pp5", name: "The Black Skirts", genre: "Indie Pop", image: "/artists/blackskirts.jpg" },
            { id: "pp6", name: "SECHSKIES", genre: "K-Pop", image: "/artists/sechskies.jpg" },
            { id: "pp7", name: "Crying Nut", genre: "Punk Rock", image: "/artists/cryingnut.jpg" },
            { id: "pp8", name: "No Brain", genre: "Punk Rock", image: "/artists/nobrain.jpg" },
            { id: "pp9", name: "GUCKKASTEN", genre: "Alternative Rock", image: "/artists/guckkasten.jpg" },
            { id: "pp10", name: "BUZZ", genre: "Rock", image: "/artists/buzz.jpg" },
            { id: "pp11", name: "Daybreak", genre: "Indie", image: "/artists/daybreak.jpg" },
            { id: "pp12", name: "Jannabi", genre: "Indie Rock", image: "/artists/jannabi.jpg" },
        ],
        ticketLinks: [
            { name: "인터파크 티켓", url: "https://tickets.interpark.com/pentaport" },
            { name: "멜론티켓", url: "https://ticket.melon.com/pentaport" },
        ],
        stats: {
            reportCount: 28,
            companionCount: 45,
            wishlistCount: 8500,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["LIVE", "Hot"],
        createdAt: addDays(now, -60),
        updatedAt: addDays(now, -1),
    },

    // Scenario F: 해외 (Asia/Tokyo)
    {
        id: "eF",
        title: "SUMMER SONIC 2025 TOKYO",
        startAt: addDays(now, 45),
        endAt: addDays(now, 46),
        timezone: "Asia/Tokyo",
        venue: {
            id: "vF",
            name: "ZOZOマリンスタジアム",
            address: "千葉市美浜区美浜1",
        },
        type: "festival",
        status: "SCHEDULED",
        overrideMode: "AUTO",
        posterUrl: "/images/summer-sonic.jpg",
        price: "1日券 ¥19,800 / 2日券 ¥37,000",
        description: "일본 최대 여름 록 페스티벌",
        artists: [
            { id: "aF1", name: "Japanese Artist A", genre: "J-Rock" },
            { id: "aF2", name: "International Artist B", genre: "Pop" },
        ],
        stats: {
            reportCount: 0,
            companionCount: 5,
            wishlistCount: 890,
            attendedCount: 0,
            reviewCount: 0,
        },
        badges: ["해외"],
        createdAt: addDays(now, -30),
        updatedAt: addDays(now, -30),
    },
];

/**
 * Mock 슬롯(타임테이블) 데이터
 */
export const MOCK_SLOTS: Slot[] = [
    // ============================================
    // Incheon Pentaport Rock Festival 2025
    // 3일간, 3개 스테이지 (Main Stage, Second Stage, Third Stage)
    // ============================================

    // Day 1 (오늘)
    // 14:00 - 3개 스테이지 동시
    {
        id: "pp-d1-s1-1",
        eventId: "pentaport",
        artistId: "pp11",
        artist: { id: "pp11", name: "Daybreak", genre: "Indie" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(14, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(15, 0, 0, 0)),
    },
    {
        id: "pp-d1-s2-1",
        eventId: "pentaport",
        artistId: "pp7",
        artist: { id: "pp7", name: "Crying Nut", genre: "Punk Rock" },
        stage: "Second Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(14, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(15, 0, 0, 0)),
    },
    {
        id: "pp-d1-s3-1",
        eventId: "pentaport",
        title: "신인 밴드 쇼케이스",
        stage: "Third Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(14, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(15, 0, 0, 0)),
    },

    // 15:00 - 3개 스테이지 동시
    {
        id: "pp-d1-s1-2",
        eventId: "pentaport",
        artistId: "pp5",
        artist: { id: "pp5", name: "The Black Skirts", genre: "Indie Pop" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(16, 0, 0, 0)),
    },
    {
        id: "pp-d1-s2-2",
        eventId: "pentaport",
        artistId: "pp8",
        artist: { id: "pp8", name: "No Brain", genre: "Punk Rock" },
        stage: "Second Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(16, 0, 0, 0)),
    },
    {
        id: "pp-d1-s3-2",
        eventId: "pentaport",
        title: "DJ Party",
        stage: "Third Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(16, 0, 0, 0)),
    },

    // 16:00 - 3개 스테이지 동시
    {
        id: "pp-d1-s1-3",
        eventId: "pentaport",
        artistId: "pp4",
        artist: { id: "pp4", name: "Hyukoh", genre: "Indie Rock" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(16, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(17, 30, 0, 0)),
    },
    {
        id: "pp-d1-s2-3",
        eventId: "pentaport",
        artistId: "pp12",
        artist: { id: "pp12", name: "Jannabi", genre: "Indie Rock" },
        stage: "Second Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(16, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(17, 0, 0, 0)),
    },
    {
        id: "pp-d1-s3-3",
        eventId: "pentaport",
        title: "Rock School 워크샵",
        stage: "Third Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(16, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(17, 0, 0, 0)),
    },

    // 17:30 - 메인 헤드라이너
    {
        id: "pp-d1-s1-4",
        eventId: "pentaport",
        artistId: "pp1",
        artist: { id: "pp1", name: "NELL", genre: "Alternative Rock" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(17, 30, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(19, 0, 0, 0)),
    },
    {
        id: "pp-d1-s2-4",
        eventId: "pentaport",
        artistId: "pp10",
        artist: { id: "pp10", name: "BUZZ", genre: "Rock" },
        stage: "Second Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(17, 30, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(18, 30, 0, 0)),
    },

    // 19:00 - 클로징
    {
        id: "pp-d1-s1-5",
        eventId: "pentaport",
        artistId: "pp3",
        artist: { id: "pp3", name: "YB", genre: "Rock" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, 0).setHours(19, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(21, 0, 0, 0)),
    },

    // Day 2 (내일)
    // 14:00
    {
        id: "pp-d2-s1-1",
        eventId: "pentaport",
        artistId: "pp7",
        artist: { id: "pp7", name: "Crying Nut", genre: "Punk Rock" },
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(14, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(15, 0, 0, 0)),
    },
    {
        id: "pp-d2-s2-1",
        eventId: "pentaport",
        artistId: "pp11",
        artist: { id: "pp11", name: "Daybreak", genre: "Indie" },
        stage: "Second Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(14, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(15, 0, 0, 0)),
    },
    {
        id: "pp-d2-s3-1",
        eventId: "pentaport",
        title: "버스킹 존",
        stage: "Third Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(14, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(15, 0, 0, 0)),
    },

    // 15:00
    {
        id: "pp-d2-s1-2",
        eventId: "pentaport",
        artistId: "pp8",
        artist: { id: "pp8", name: "No Brain", genre: "Punk Rock" },
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(16, 0, 0, 0)),
    },
    {
        id: "pp-d2-s2-2",
        eventId: "pentaport",
        artistId: "pp5",
        artist: { id: "pp5", name: "The Black Skirts", genre: "Indie Pop" },
        stage: "Second Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(16, 0, 0, 0)),
    },
    {
        id: "pp-d2-s3-2",
        eventId: "pentaport",
        artistId: "pp12",
        artist: { id: "pp12", name: "Jannabi", genre: "Indie Rock" },
        stage: "Third Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(16, 0, 0, 0)),
    },

    // 16:00
    {
        id: "pp-d2-s1-3",
        eventId: "pentaport",
        artistId: "pp9",
        artist: { id: "pp9", name: "GUCKKASTEN", genre: "Alternative Rock" },
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(16, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(17, 30, 0, 0)),
    },
    {
        id: "pp-d2-s2-3",
        eventId: "pentaport",
        artistId: "pp4",
        artist: { id: "pp4", name: "Hyukoh", genre: "Indie Rock" },
        stage: "Second Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(16, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(17, 0, 0, 0)),
    },

    // 17:30
    {
        id: "pp-d2-s1-4",
        eventId: "pentaport",
        artistId: "pp2",
        artist: { id: "pp2", name: "Jaurim", genre: "Rock" },
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(17, 30, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(19, 0, 0, 0)),
    },
    {
        id: "pp-d2-s2-4",
        eventId: "pentaport",
        artistId: "pp1",
        artist: { id: "pp1", name: "NELL", genre: "Alternative Rock" },
        stage: "Second Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(17, 30, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(19, 0, 0, 0)),
    },

    // 19:00 - Day 2 클로징
    {
        id: "pp-d2-s1-5",
        eventId: "pentaport",
        artistId: "pp6",
        artist: { id: "pp6", name: "SECHSKIES", genre: "K-Pop" },
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 1).setHours(19, 0, 0, 0)),
        endAt: new Date(addDays(now, 1).setHours(21, 0, 0, 0)),
    },

    // Day 3 (모레)
    // 14:00
    {
        id: "pp-d3-s1-1",
        eventId: "pentaport",
        artistId: "pp12",
        artist: { id: "pp12", name: "Jannabi", genre: "Indie Rock" },
        stage: "Main Stage",
        day: 3,
        startAt: new Date(addDays(now, 2).setHours(14, 0, 0, 0)),
        endAt: new Date(addDays(now, 2).setHours(15, 0, 0, 0)),
    },
    {
        id: "pp-d3-s2-1",
        eventId: "pentaport",
        artistId: "pp10",
        artist: { id: "pp10", name: "BUZZ", genre: "Rock" },
        stage: "Second Stage",
        day: 3,
        startAt: new Date(addDays(now, 2).setHours(14, 0, 0, 0)),
        endAt: new Date(addDays(now, 2).setHours(15, 0, 0, 0)),
    },

    // 15:00
    {
        id: "pp-d3-s1-2",
        eventId: "pentaport",
        artistId: "pp4",
        artist: { id: "pp4", name: "Hyukoh", genre: "Indie Rock" },
        stage: "Main Stage",
        day: 3,
        startAt: new Date(addDays(now, 2).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 2).setHours(16, 0, 0, 0)),
    },
    {
        id: "pp-d3-s2-2",
        eventId: "pentaport",
        artistId: "pp9",
        artist: { id: "pp9", name: "GUCKKASTEN", genre: "Alternative Rock" },
        stage: "Second Stage",
        day: 3,
        startAt: new Date(addDays(now, 2).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 2).setHours(16, 30, 0, 0)),
    },

    // 16:00
    {
        id: "pp-d3-s1-3",
        eventId: "pentaport",
        artistId: "pp2",
        artist: { id: "pp2", name: "Jaurim", genre: "Rock" },
        stage: "Main Stage",
        day: 3,
        startAt: new Date(addDays(now, 2).setHours(16, 0, 0, 0)),
        endAt: new Date(addDays(now, 2).setHours(17, 30, 0, 0)),
    },

    // 17:30 - Final Day 헤드라이너
    {
        id: "pp-d3-s1-4",
        eventId: "pentaport",
        artistId: "pp3",
        artist: { id: "pp3", name: "YB", genre: "Rock" },
        stage: "Main Stage",
        day: 3,
        startAt: new Date(addDays(now, 2).setHours(17, 30, 0, 0)),
        endAt: new Date(addDays(now, 2).setHours(19, 0, 0, 0)),
    },
    {
        id: "pp-d3-s2-4",
        eventId: "pentaport",
        artistId: "pp6",
        artist: { id: "pp6", name: "SECHSKIES", genre: "K-Pop" },
        stage: "Second Stage",
        day: 3,
        startAt: new Date(addDays(now, 2).setHours(17, 30, 0, 0)),
        endAt: new Date(addDays(now, 2).setHours(19, 0, 0, 0)),
    },

    // 19:00 - Grand Finale
    {
        id: "pp-d3-s1-5",
        eventId: "pentaport",
        title: "All Artists Grand Finale",
        stage: "Main Stage",
        day: 3,
        startAt: new Date(addDays(now, 2).setHours(19, 0, 0, 0)),
        endAt: new Date(addDays(now, 2).setHours(21, 30, 0, 0)),
    },

    // ============================================
    // Seoul Jazz Festival 2025 - Day 1 (어제)
    {
        id: "slot1",
        eventId: "e2",
        title: "오프닝 세레모니",
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(12, 0, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(12, 30, 0, 0)),
    },
    {
        id: "slot2",
        eventId: "e2",
        artistId: "a9",
        artist: { id: "a9", name: "Youn Sun Nah", genre: "Jazz Vocal" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(13, 0, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(14, 0, 0, 0)),
    },
    {
        id: "slot3",
        eventId: "e2",
        artistId: "a7",
        artist: { id: "a7", name: "Cory Wong", genre: "Funk / Jazz" },
        stage: "Jazz Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(13, 30, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(14, 30, 0, 0)),
    },
    {
        id: "slot4",
        eventId: "e2",
        artistId: "a5",
        artist: { id: "a5", name: "Snarky Puppy", genre: "Jazz Fusion" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(16, 30, 0, 0)),
    },
    {
        id: "slot5",
        eventId: "e2",
        artistId: "a6",
        artist: { id: "a6", name: "Hiatus Kaiyote", genre: "Future Soul / Neo-Soul" },
        stage: "Jazz Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(15, 30, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(16, 30, 0, 0)),
    },
    {
        id: "slot6",
        eventId: "e2",
        artistId: "a2",
        artist: { id: "a2", name: "Norah Jones", genre: "Jazz / Soul" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(17, 0, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(18, 30, 0, 0)),
    },
    {
        id: "slot7",
        eventId: "e2",
        title: "Day 1 피날레 - All Stars Jam Session",
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(19, 0, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(20, 30, 0, 0)),
    },

    // Seoul Jazz Festival 2025 - Day 2 (오늘)
    {
        id: "slot8",
        eventId: "e2",
        title: "Day 2 오프닝",
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 0).setHours(12, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(12, 30, 0, 0)),
    },
    {
        id: "slot9",
        eventId: "e2",
        artistId: "a7",
        artist: { id: "a7", name: "Cory Wong", genre: "Funk / Jazz" },
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 0).setHours(13, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(14, 0, 0, 0)),
    },
    {
        id: "slot10",
        eventId: "e2",
        artistId: "a6",
        artist: { id: "a6", name: "Hiatus Kaiyote", genre: "Future Soul / Neo-Soul" },
        stage: "Jazz Stage",
        day: 2,
        startAt: new Date(addDays(now, 0).setHours(13, 30, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(14, 30, 0, 0)),
    },
    {
        id: "slot11",
        eventId: "e2",
        artistId: "a3",
        artist: { id: "a3", name: "Robert Glasper", genre: "Jazz / Hip-Hop" },
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 0).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(16, 30, 0, 0)),
    },
    {
        id: "slot12",
        eventId: "e2",
        artistId: "a5",
        artist: { id: "a5", name: "Snarky Puppy", genre: "Jazz Fusion" },
        stage: "Jazz Stage",
        day: 2,
        startAt: new Date(addDays(now, 0).setHours(16, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(17, 30, 0, 0)),
    },
    {
        id: "slot13",
        eventId: "e2",
        artistId: "a8",
        artist: { id: "a8", name: "Jacob Collier", genre: "Multi-genre / Jazz" },
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 0).setHours(18, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(19, 30, 0, 0)),
    },
    {
        id: "slot14",
        eventId: "e2",
        title: "클로징 - Grand Finale with All Artists",
        stage: "Main Stage",
        day: 2,
        startAt: new Date(addDays(now, 0).setHours(20, 0, 0, 0)),
        endAt: new Date(addDays(now, 0).setHours(21, 30, 0, 0)),
    },
];

/**
 * Mock 허브 글 데이터
 */
export const MOCK_POSTS: Post[] = [
    // 실시간 제보
    {
        id: "post1",
        eventId: "e2",
        userId: "user1",
        type: "gate",
        status: "ACTIVE",
        content: "A게이트 줄이 줄어들고 있어요! 지금이 기회",
        helpfulCount: 12,
        trustLevel: "A",
        createdAt: addDays(now, 0),
        updatedAt: addDays(now, 0),
    },
    {
        id: "post2",
        eventId: "e2",
        userId: "user2",
        type: "md",
        status: "ACTIVE",
        content: "포토카드 아직 재고 있습니다! 2번 부스",
        images: ["/images/md1.jpg"],
        helpfulCount: 8,
        trustLevel: "B",
        createdAt: addDays(now, 0),
        updatedAt: addDays(now, 0),
    },

    // 커뮤니티 글
    {
        id: "post3",
        eventId: "e2",
        userId: "user3",
        type: "companion",
        status: "ACTIVE",
        content: "서울재즈페스티벌 같이 가실 분! 연락 주세요~ 카톡: jazzlover123 / 010-1234-5678",
        meetAt: addDays(now, 0),
        maxPeople: 4,
        currentPeople: 2,
        location: "올림픽공원 정문",
        placeText: "올림픽공원 정문",
        placeHint: "5호선 올림픽공원역 3번 출구",
        expiresAt: addDays(now, 1),
        helpfulCount: 0,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
    },
    {
        id: "post4",
        eventId: "e2",
        userId: "user4",
        type: "taxi",
        status: "ACTIVE",
        content: "올림픽공원 → 강남역 택시 같이 타실 분",
        departAt: new Date(addDays(now, 0).setHours(22, 0, 0, 0)),
        maxPeople: 4,
        currentPeople: 1,
        placeText: "올림픽공원 평화의 광장",
        placeHint: "메인 스테이지 앞 출구",
        expiresAt: new Date(addDays(now, 1).setHours(0, 0, 0, 0)),
        helpfulCount: 0,
        createdAt: addDays(now, 0),
        updatedAt: addDays(now, 0),
    },

    // 커뮤니티 글 - 밥
    {
        id: "post5",
        eventId: "e2",
        userId: "user5",
        type: "meal",
        status: "ACTIVE",
        content: "공연 전 저녁 같이 드실 분~ 올림픽공원 근처 맛집 가요!",
        meetAt: new Date(addDays(now, 0).setHours(17, 0, 0, 0)),
        maxPeople: 5,
        currentPeople: 3,
        location: "올림픽공원 9번 출구",
        placeText: "올림픽공원역 9번 출구",
        placeHint: "5호선 올림픽공원역",
        expiresAt: new Date(addDays(now, 0).setHours(20, 0, 0, 0)),
        helpfulCount: 0,
        createdAt: addDays(now, -0.1),
        updatedAt: addDays(now, -0.1),
    },

    // 커뮤니티 글 - 숙소
    {
        id: "post6",
        eventId: "e2",
        userId: "user6",
        type: "lodge",
        status: "ACTIVE",
        content: "잠실역 근처 숙소 쉐어하실 분 구합니다. 여성분만요!",
        meetAt: addDays(now, 0),
        maxPeople: 2,
        currentPeople: 1,
        location: "잠실역 근처",
        placeText: "잠실역",
        placeHint: "2호선 잠실역 4번 출구",
        expiresAt: addDays(now, 1),
        helpfulCount: 0,
        createdAt: addDays(now, -0.5),
        updatedAt: addDays(now, -0.5),
    },

    // 커뮤니티 글 - 양도
    {
        id: "post7",
        eventId: "55948",
        userId: "user1",
        type: "transfer",
        status: "ACTIVE",
        content: "일반석 1장 양도합니다. 정가에 드려요. 직거래 희망 (홍대입구역)",
        price: "132,000원",
        maxPeople: 1,
        currentPeople: 0,
        location: "홍대입구역",
        placeText: "홍대입구역",
        placeHint: "2호선 홍대입구역 9번 출구 앞 스타벅스",
        expiresAt: addDays(now, 29),
        helpfulCount: 2,
        createdAt: addDays(now, -2),
        updatedAt: addDays(now, -2),
    },

    // 커뮤니티 글 - 질문
    {
        id: "post8",
        eventId: "e2",
        userId: "user2",
        type: "question",
        status: "ACTIVE",
        content: "서울재즈페스티벌 돗자리 반입 가능한가요? 처음 가봐서 잘 모르겠어요.",
        helpfulCount: 5,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
    },

    // 후기/팁
    {
        id: "post9",
        eventId: "e2",
        userId: "user3",
        type: "tip",
        status: "ACTIVE",
        content: "작년에 갔을 때 팁 공유드려요! 1. 돗자리 필수 2. 선크림 필수 3. 음식 반입 불가하니 현장 푸드트럭 이용하세요",
        helpfulCount: 34,
        createdAt: addDays(now, -3),
        updatedAt: addDays(now, -3),
    },

    // 리뷰 (RECAP용)
    {
        id: "post10",
        eventId: "24016943",
        userId: "user5",
        type: "review",
        status: "ACTIVE",
        content: "정말 최고의 공연이었습니다! 배우들의 가창력이 압도적이고, 무대 연출도 완벽했어요.",
        rating: 5,
        helpfulCount: 45,
        createdAt: addDays(now, -10),
        updatedAt: addDays(now, -10),
    },
    {
        id: "post11",
        eventId: "24016943",
        userId: "user6",
        type: "video",
        status: "ACTIVE",
        content: "커튼콜 영상입니다",
        videoUrl: "https://youtube.com/watch?v=example",
        helpfulCount: 23,
        createdAt: addDays(now, -9),
        updatedAt: addDays(now, -9),
    },

    // 마감 임박 글
    {
        id: "post12",
        eventId: "e6",
        userId: "user4",
        type: "companion",
        status: "EXPIRING",
        content: "인디 공연 같이 가요! 아는 사람 없어서 혼자 가기 외로워요ㅠㅠ @indie_fan 이나 test@email.com 으로 연락주세요!",
        meetAt: addDays(now, 3),
        maxPeople: 2,
        currentPeople: 1,
        location: "홍대입구역 9번 출구",
        placeText: "홍대입구역 9번 출구",
        placeHint: "2호선 홍대입구역",
        expiresAt: addDays(now, 3),
        helpfulCount: 0,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
    },

    // EXPIRED 상태 - 시간 경과로 자동 마감된 글
    {
        id: "post13",
        eventId: "e2",
        userId: "user3",
        type: "companion",
        status: "EXPIRED",
        content: "서울재즈페스티벌 1일차 같이 가실 분! 카톡: jazz_day1 / 010-9876-5432",
        meetAt: addDays(now, -1),
        maxPeople: 3,
        currentPeople: 1,
        location: "올림픽공원 정문",
        placeText: "올림픽공원 정문",
        placeHint: "5호선 올림픽공원역 3번 출구",
        expiresAt: addDays(now, -1),
        helpfulCount: 2,
        createdAt: addDays(now, -3),
        updatedAt: addDays(now, -1),
    },
    {
        id: "post14",
        eventId: "e2",
        userId: "user5",
        type: "taxi",
        status: "EXPIRED",
        content: "재즈페스 1일차 끝나고 강남역 택시 쉐어해요! 010-1111-2222",
        departAt: new Date(addDays(now, -1).setHours(21, 30, 0, 0)),
        maxPeople: 4,
        currentPeople: 2,
        placeText: "올림픽공원 후문",
        placeHint: "9호선 한성백제역 방면",
        expiresAt: new Date(addDays(now, -1).setHours(22, 0, 0, 0)),
        helpfulCount: 3,
        createdAt: addDays(now, -2),
        updatedAt: addDays(now, -1),
    },
    {
        id: "post15",
        eventId: "55948",
        userId: "user2",
        type: "transfer",
        status: "EXPIRED",
        content: "AG 콘서트 VIP 1장 양도합니다. 마감 시간 지나서 자동 종료됨",
        price: "143,000원",
        maxPeople: 1,
        currentPeople: 0,
        location: "강남역",
        placeText: "강남역 10번 출구",
        placeHint: "2호선 강남역",
        expiresAt: addDays(now, -5),
        helpfulCount: 8,
        createdAt: addDays(now, -10),
        updatedAt: addDays(now, -5),
    },

    // CLOSED 상태 - 모집 완료로 작성자가 직접 마감
    {
        id: "post16",
        eventId: "e2",
        userId: "user6",
        type: "companion",
        status: "CLOSED",
        content: "재즈페스 2일차 동행 구해요~ 같이 Jacob Collier 봐요! DM: @jazzfan2025",
        meetAt: addDays(now, 0),
        maxPeople: 2,
        currentPeople: 2,
        location: "잠실역 8번 출구",
        placeText: "잠실역 8번 출구",
        placeHint: "2호선 잠실역",
        expiresAt: addDays(now, 1),
        helpfulCount: 5,
        createdAt: addDays(now, -2),
        updatedAt: addDays(now, -0.5),
    },
    {
        id: "post17",
        eventId: "e2",
        userId: "user4",
        type: "meal",
        status: "CLOSED",
        content: "재즈페스 저녁 같이 드실 분~ 모집 완료! 감사합니다 :)",
        meetAt: new Date(addDays(now, 0).setHours(18, 0, 0, 0)),
        maxPeople: 4,
        currentPeople: 4,
        location: "송파역 맛집",
        placeText: "송파역 1번 출구",
        placeHint: "8호선 송파역",
        expiresAt: new Date(addDays(now, 0).setHours(20, 0, 0, 0)),
        helpfulCount: 2,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -0.3),
    },
    {
        id: "post18",
        eventId: "55948",
        userId: "user1",
        type: "transfer",
        status: "CLOSED",
        content: "AG 일반석 양도 완료! 거래 성사됐습니다~",
        price: "132,000원",
        maxPeople: 1,
        currentPeople: 1,
        location: "신촌역",
        placeText: "신촌역 3번 출구",
        placeHint: "2호선 신촌역",
        expiresAt: addDays(now, 25),
        helpfulCount: 6,
        createdAt: addDays(now, -7),
        updatedAt: addDays(now, -3),
    },
    {
        id: "post19",
        eventId: "e6",
        userId: "user3",
        type: "lodge",
        status: "CLOSED",
        content: "인디 공연 날 숙소 쉐어 - 홍대 근처, 모집 완료됐어요!",
        meetAt: addDays(now, 3),
        maxPeople: 2,
        currentPeople: 2,
        location: "홍대 게스트하우스",
        placeText: "홍대입구역 근처",
        placeHint: "2호선 홍대입구역 도보 5분",
        expiresAt: addDays(now, 3),
        helpfulCount: 1,
        createdAt: addDays(now, -4),
        updatedAt: addDays(now, -2),
    },
];

/**
 * Mock 사용자 데이터
 */
/**
 * MOCK_USERS - MOCK_USER_PROFILES와 일치하는 사용자 목록
 * 리더보드, 프로필, 친구 기능 등에서 동일한 사용자 정보 사용
 */
export const MOCK_USERS = [
    {
        id: "user1",
        nickname: "페스티벌러",
        role: "USER" as const,
        createdAt: addDays(now, -100),
        updatedAt: addDays(now, -100),
    },
    {
        id: "user2",
        nickname: "록페스러버",
        role: "USER" as const,
        createdAt: addDays(now, -80),
        updatedAt: addDays(now, -80),
    },
    {
        id: "user3",
        nickname: "인디키드",
        role: "USER" as const,
        createdAt: addDays(now, -60),
        updatedAt: addDays(now, -60),
    },
    {
        id: "user4",
        nickname: "투어러",
        role: "USER" as const,
        createdAt: addDays(now, -45),
        updatedAt: addDays(now, -45),
    },
    {
        id: "user5",
        nickname: "재즈매니아",
        role: "USER" as const,
        createdAt: addDays(now, -30),
        updatedAt: addDays(now, -30),
    },
    {
        id: "user6",
        nickname: "DJ마스터",
        role: "USER" as const,
        createdAt: addDays(now, -20),
        updatedAt: addDays(now, -20),
    },
];

/**
 * 헬퍼: 이벤트 ID로 이벤트 찾기
 */
export function getEventById(id: string): Event | undefined {
    return MOCK_EVENTS.find(e => e.id === id);
}

/**
 * 헬퍼: 이벤트의 슬롯 목록 가져오기
 */
export function getSlotsByEventId(eventId: string): Slot[] {
    return MOCK_SLOTS.filter(s => s.eventId === eventId);
}

/**
 * 헬퍼: 이벤트의 포스트 목록 가져오기
 */
export function getPostsByEventId(eventId: string): Post[] {
    return MOCK_POSTS.filter(p => p.eventId === eventId);
}

/**
 * 헬퍼: 커뮤니티 카테고리 글 목록 가져오기
 */
const COMMUNITY_TYPES = ["companion", "taxi", "meal", "lodge", "transfer", "tip", "question", "review", "video"];

export function getCommunityPosts(category?: string, eventId?: string): Post[] {
    let posts = MOCK_POSTS.filter(p => COMMUNITY_TYPES.includes(p.type));

    if (category && category !== "all") {
        // tip과 review를 같은 카테고리로 묶음
        if (category === "tip") {
            posts = posts.filter(p => p.type === "tip" || p.type === "review" || p.type === "video");
        } else {
            posts = posts.filter(p => p.type === category);
        }
    }

    if (eventId && eventId !== "all") {
        posts = posts.filter(p => p.eventId === eventId);
    }

    return posts;
}

/**
 * Mock 알림 데이터
 */
export const MOCK_NOTIFICATIONS: Notification[] = [
    // 읽지 않은 알림들
    {
        id: "notif1",
        userId: "user1",
        type: "event_start_reminder",
        eventId: "e2",
        title: "Seoul Jazz Festival 2025",
        body: "행사가 내일 시작됩니다! 준비되셨나요?",
        deepLink: "/event/e2",
        isRead: false,
        createdAt: addDays(now, -0.1),
    },
    {
        id: "notif2",
        userId: "user1",
        type: "hub_post_replied",
        eventId: "e2",
        postId: "post3",
        title: "내 동행 글에 댓글이 달렸어요",
        body: "재즈매니아님: 저도 같이 가고 싶어요!",
        deepLink: "/event/e2?tab=hub",
        isRead: false,
        createdAt: addDays(now, -0.2),
    },
    {
        id: "notif3",
        userId: "user1",
        type: "official_notice_published",
        eventId: "e2",
        title: "공식 공지가 등록되었습니다",
        body: "주차장 이용 안내 및 셔틀버스 운행 시간표",
        deepLink: "/event/e2?tab=hub",
        isRead: false,
        createdAt: addDays(now, -0.5),
    },
    {
        id: "notif4",
        userId: "user1",
        type: "post_expiring_soon",
        postId: "post3",
        title: "동행 모집글이 곧 마감됩니다",
        body: "2시간 후 자동 마감됩니다. 모집 상태를 확인해주세요.",
        deepLink: "/community",
        isRead: false,
        createdAt: addDays(now, -0.3),
    },

    // 읽은 알림들
    {
        id: "notif5",
        userId: "user1",
        type: "ticket_open_reminder",
        eventId: "55948",
        title: "THE MARCHING OF AG! 예매 오픈 30분 전",
        body: "예매 오픈이 곧 시작됩니다. 준비하세요!",
        deepLink: "/event/55948",
        isRead: true,
        createdAt: addDays(now, -1),
    },
    {
        id: "notif6",
        userId: "user1",
        type: "community_post_replied",
        postId: "post7",
        title: "양도글에 문의가 왔어요",
        body: "인디팬님: 아직 양도 가능한가요?",
        deepLink: "/community",
        isRead: true,
        createdAt: addDays(now, -1.5),
    },
    {
        id: "notif7",
        userId: "user1",
        type: "event_time_changed",
        eventId: "e5",
        title: "연기된 공연 일정이 변경되었습니다",
        body: "새로운 일정: 2025년 2월 15일",
        deepLink: "/event/e5",
        isRead: true,
        createdAt: addDays(now, -3),
    },
    {
        id: "notif8",
        userId: "user1",
        type: "event_cancelled",
        eventId: "e4",
        title: "취소된 콘서트 - 행사 취소 안내",
        body: "해당 행사가 취소되었습니다. 예매처에서 환불을 진행해주세요.",
        deepLink: "/event/e4",
        isRead: true,
        createdAt: addDays(now, -5),
    },
];

/**
 * 헬퍼: 알림 목록 가져오기
 */
export function getNotifications(userId?: string): Notification[] {
    if (userId) {
        return MOCK_NOTIFICATIONS.filter(n => n.userId === userId);
    }
    return MOCK_NOTIFICATIONS;
}

/**
 * 헬퍼: 읽지 않은 알림 개수
 */
export function getUnreadNotificationCount(userId?: string): number {
    const notifications = userId
        ? MOCK_NOTIFICATIONS.filter(n => n.userId === userId)
        : MOCK_NOTIFICATIONS;
    return notifications.filter(n => !n.isRead).length;
}

/**
 * 시나리오 ID 매핑 - PRD 6.10
 */
export const SCENARIO_EVENT_IDS: Record<string, string> = {
    A: "55948",      // 기본: 단일일정, 예정
    B: "e2",         // 다일 페스티벌: 2일 이상, LIVE (재즈페스)
    C: "24016943",   // 종료 시각 누락: end_at 없음
    D: "e4",         // 취소: CANCELED 상태
    E: "e5",         // 연기: POSTPONED 상태
    F: "eF",         // 해외: Asia/Tokyo
    G: "pentaport",  // 멀티스테이지 페스티벌 (3일, 3스테이지)
};

/**
 * 헬퍼: 시나리오별 이벤트 가져오기
 */
export function getEventByScenario(scenario: string): Event | undefined {
    const eventId = SCENARIO_EVENT_IDS[scenario];
    return eventId ? getEventById(eventId) : undefined;
}

/**
 * 헬퍼: 시나리오별 포스트 목록 가져오기
 */
export function getPostsByScenario(scenario: string): Post[] {
    const eventId = SCENARIO_EVENT_IDS[scenario];
    return eventId ? getPostsByEventId(eventId) : [];
}

/**
 * 헬퍼: 시나리오별 슬롯 목록 가져오기
 */
export function getSlotsByScenario(scenario: string): Slot[] {
    const eventId = SCENARIO_EVENT_IDS[scenario];
    return eventId ? getSlotsByEventId(eventId) : [];
}
