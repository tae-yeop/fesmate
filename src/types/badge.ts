/**
 * 배지 시스템 타입 정의 (PRD 6.16.2)
 * - 출석 배지: 첫 공연, 10회, 50회, 100회
 * - 장르 배지: 록 마스터, 힙합 러버, 인디 탐험가
 * - 지역 배지: 서울 정복, 전국 투어러
 * - 시즌 배지: 2025 페스티벌러, 연말결산
 * - 기여 배지: 도움왕, 제보왕, 질문 해결사
 */

/** 배지 카테고리 */
export type BadgeCategory = "attendance" | "genre" | "region" | "season" | "contribution";

/** 배지 희귀도 */
export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

/** 배지 정의 */
export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    category: BadgeCategory;
    rarity: BadgeRarity;
    icon: string; // 이모지
    /** 획득 조건 체크 함수명 */
    conditionKey: string;
    /** 조건 값 (예: 관람 횟수 10) */
    conditionValue?: number;
}

/** 획득한 배지 */
export interface EarnedBadge {
    badgeId: string;
    earnedAt: Date;
    /** 획득 계기가 된 행사 ID */
    triggerEventId?: string;
    /** 획득 계기가 된 행사 제목 */
    triggerEventTitle?: string;
    /** 진행도 (예: 10회 중 7회) */
    progress?: number;
    progressMax?: number;
}

/** 배지 카테고리 라벨 */
export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
    attendance: "출석",
    genre: "장르",
    region: "지역",
    season: "시즌",
    contribution: "기여",
};

/** 배지 희귀도 라벨 및 색상 */
export const BADGE_RARITY_CONFIG: Record<BadgeRarity, { label: string; color: string; bgColor: string }> = {
    common: { label: "일반", color: "text-gray-600", bgColor: "bg-gray-100" },
    rare: { label: "레어", color: "text-blue-600", bgColor: "bg-blue-100" },
    epic: { label: "에픽", color: "text-purple-600", bgColor: "bg-purple-100" },
    legendary: { label: "전설", color: "text-yellow-600", bgColor: "bg-yellow-100" },
};

/** 전체 배지 정의 목록 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    // ===== 출석 배지 =====
    {
        id: "first_concert",
        name: "첫 공연",
        description: "첫 공연에 다녀왔어요!",
        category: "attendance",
        rarity: "common",
        icon: "🎫",
        conditionKey: "attendanceCount",
        conditionValue: 1,
    },
    {
        id: "concert_10",
        name: "공연 러버",
        description: "10회 관람 달성!",
        category: "attendance",
        rarity: "rare",
        icon: "🎵",
        conditionKey: "attendanceCount",
        conditionValue: 10,
    },
    {
        id: "concert_50",
        name: "공연 마니아",
        description: "50회 관람 달성!",
        category: "attendance",
        rarity: "epic",
        icon: "🎸",
        conditionKey: "attendanceCount",
        conditionValue: 50,
    },
    {
        id: "concert_100",
        name: "공연의 신",
        description: "100회 관람 달성!",
        category: "attendance",
        rarity: "legendary",
        icon: "👑",
        conditionKey: "attendanceCount",
        conditionValue: 100,
    },

    // ===== 장르 배지 =====
    {
        id: "genre_concert_5",
        name: "콘서트 팬",
        description: "콘서트 5회 이상 관람",
        category: "genre",
        rarity: "common",
        icon: "🎤",
        conditionKey: "genreCount_concert",
        conditionValue: 5,
    },
    {
        id: "genre_festival_3",
        name: "페스티벌러",
        description: "페스티벌 3회 이상 참가",
        category: "genre",
        rarity: "rare",
        icon: "🎪",
        conditionKey: "genreCount_festival",
        conditionValue: 3,
    },
    {
        id: "genre_festival_10",
        name: "페스티벌 마스터",
        description: "페스티벌 10회 이상 참가",
        category: "genre",
        rarity: "epic",
        icon: "🔥",
        conditionKey: "genreCount_festival",
        conditionValue: 10,
    },
    {
        id: "genre_musical_5",
        name: "뮤지컬 러버",
        description: "뮤지컬 5회 이상 관람",
        category: "genre",
        rarity: "rare",
        icon: "🎭",
        conditionKey: "genreCount_musical",
        conditionValue: 5,
    },
    {
        id: "genre_exhibition_5",
        name: "전시 탐험가",
        description: "전시 5회 이상 관람",
        category: "genre",
        rarity: "rare",
        icon: "🖼️",
        conditionKey: "genreCount_exhibition",
        conditionValue: 5,
    },

    // ===== 지역 배지 =====
    {
        id: "region_seoul",
        name: "서울 정복",
        description: "서울에서 5회 이상 관람",
        category: "region",
        rarity: "common",
        icon: "🏙️",
        conditionKey: "regionCount_서울",
        conditionValue: 5,
    },
    {
        id: "region_busan",
        name: "부산 러버",
        description: "부산에서 3회 이상 관람",
        category: "region",
        rarity: "rare",
        icon: "🌊",
        conditionKey: "regionCount_부산",
        conditionValue: 3,
    },
    {
        id: "region_incheon",
        name: "인천 탐험가",
        description: "인천에서 3회 이상 관람",
        category: "region",
        rarity: "rare",
        icon: "✈️",
        conditionKey: "regionCount_인천",
        conditionValue: 3,
    },
    {
        id: "region_3cities",
        name: "여행자",
        description: "3개 이상 지역에서 관람",
        category: "region",
        rarity: "rare",
        icon: "🗺️",
        conditionKey: "regionVariety",
        conditionValue: 3,
    },
    {
        id: "region_5cities",
        name: "전국 투어러",
        description: "5개 이상 지역에서 관람",
        category: "region",
        rarity: "epic",
        icon: "🚀",
        conditionKey: "regionVariety",
        conditionValue: 5,
    },
    {
        id: "region_10cities",
        name: "대한민국 정복자",
        description: "10개 이상 지역에서 관람",
        category: "region",
        rarity: "legendary",
        icon: "🇰🇷",
        conditionKey: "regionVariety",
        conditionValue: 10,
    },

    // ===== 시즌 배지 =====
    {
        id: "season_2024",
        name: "2024 공연러",
        description: "2024년에 공연을 다녀왔어요",
        category: "season",
        rarity: "common",
        icon: "📅",
        conditionKey: "yearAttendance",
        conditionValue: 2024,
    },
    {
        id: "season_2025",
        name: "2025 공연러",
        description: "2025년에 공연을 다녀왔어요",
        category: "season",
        rarity: "common",
        icon: "📅",
        conditionKey: "yearAttendance",
        conditionValue: 2025,
    },
    {
        id: "season_summer_festival",
        name: "여름 페스티벌러",
        description: "여름(6-8월) 페스티벌 참가",
        category: "season",
        rarity: "rare",
        icon: "☀️",
        conditionKey: "summerFestival",
        conditionValue: 1,
    },

    // ===== 기여 배지 =====
    {
        id: "first_post",
        name: "첫 글",
        description: "첫 게시글을 작성했어요",
        category: "contribution",
        rarity: "common",
        icon: "✏️",
        conditionKey: "postCount",
        conditionValue: 1,
    },
    {
        id: "helpful_10",
        name: "도움꾼",
        description: "도움됨 10개 받음",
        category: "contribution",
        rarity: "rare",
        icon: "💡",
        conditionKey: "helpfulReceived",
        conditionValue: 10,
    },
    {
        id: "helpful_50",
        name: "도움왕",
        description: "도움됨 50개 받음",
        category: "contribution",
        rarity: "epic",
        icon: "🌟",
        conditionKey: "helpfulReceived",
        conditionValue: 50,
    },
    {
        id: "report_5",
        name: "제보왕",
        description: "실시간 제보 5개 작성",
        category: "contribution",
        rarity: "rare",
        icon: "📢",
        conditionKey: "reportPostCount",
        conditionValue: 5,
    },
];

/** 배지 ID로 배지 정의 찾기 */
export function getBadgeDefinition(badgeId: string): BadgeDefinition | undefined {
    return BADGE_DEFINITIONS.find(b => b.id === badgeId);
}

/** 카테고리별 배지 그룹화 */
export function getBadgesByCategory(): Record<BadgeCategory, BadgeDefinition[]> {
    const result: Record<BadgeCategory, BadgeDefinition[]> = {
        attendance: [],
        genre: [],
        region: [],
        season: [],
        contribution: [],
    };

    BADGE_DEFINITIONS.forEach(badge => {
        result[badge.category].push(badge);
    });

    return result;
}
