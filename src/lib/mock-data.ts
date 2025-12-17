import { Event, Slot } from "@/types/event";
import { Post } from "@/types/post";

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
            },
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
            { id: "a2", name: "재즈 아티스트 A", genre: "Jazz" },
            { id: "a3", name: "재즈 아티스트 B", genre: "Jazz" },
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

    // Scenario C: 종료 시각 누락 (엣지) - 지난 행사 (RECAP)
    {
        id: "24016943",
        title: "뮤지컬 시카고 25주년 내한공연",
        startAt: addDays(now, -30),
        endAt: addDays(now, -7), // 7일 전 종료
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
];

/**
 * Mock 슬롯(타임테이블) 데이터
 */
export const MOCK_SLOTS: Slot[] = [
    // Seoul Jazz Festival 2025 - Day 1
    {
        id: "slot1",
        eventId: "e2",
        title: "오프닝",
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(12, 0, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(12, 30, 0, 0)),
    },
    {
        id: "slot2",
        eventId: "e2",
        artistId: "a2",
        artist: { id: "a2", name: "재즈 아티스트 A", genre: "Jazz" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(13, 0, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(14, 30, 0, 0)),
    },
    {
        id: "slot3",
        eventId: "e2",
        artistId: "a3",
        artist: { id: "a3", name: "재즈 아티스트 B", genre: "Jazz" },
        stage: "Main Stage",
        day: 1,
        startAt: new Date(addDays(now, -1).setHours(15, 0, 0, 0)),
        endAt: new Date(addDays(now, -1).setHours(16, 30, 0, 0)),
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
        content: "서울재즈페스티벌 같이 가실 분!",
        meetAt: addDays(now, 0),
        maxPeople: 4,
        currentPeople: 2,
        location: "올림픽공원 정문",
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
        content: "인디 공연 같이 가요! 아는 사람 없어서 혼자 가기 외로워요ㅠㅠ",
        meetAt: addDays(now, 3),
        maxPeople: 2,
        currentPeople: 1,
        location: "홍대입구역 9번 출구",
        expiresAt: addDays(now, 3),
        helpfulCount: 0,
        createdAt: addDays(now, -1),
        updatedAt: addDays(now, -1),
    },
];

/**
 * Mock 사용자 데이터
 */
export const MOCK_USERS = [
    {
        id: "user1",
        nickname: "재즈매니아",
        role: "USER" as const,
        createdAt: addDays(now, -100),
        updatedAt: addDays(now, -100),
    },
    {
        id: "user2",
        nickname: "MD수집가",
        role: "USER" as const,
        createdAt: addDays(now, -80),
        updatedAt: addDays(now, -80),
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
