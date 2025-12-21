// 콜가이드 Mock 데이터
// 아티스트별 곡과 콜가이드 샘플

import { Song, CallGuide, CallGuideEntry } from "@/types/call-guide";

/** Mock 곡 데이터 */
export const MOCK_SONGS: Song[] = [
    {
        id: "song1",
        title: "Dynamite",
        artistId: "artist1",
        artistName: "BTS",
        youtubeId: "gdZLi9oWNZg",
        duration: 199, // 3:19
        thumbnailUrl: "https://i.ytimg.com/vi/gdZLi9oWNZg/maxresdefault.jpg",
        releaseYear: 2020,
        album: "Dynamite (Single)",
        hasCallGuide: true,
    },
    {
        id: "song2",
        title: "Butter",
        artistId: "artist1",
        artistName: "BTS",
        youtubeId: "WMweEpGlu_U",
        duration: 164, // 2:44
        thumbnailUrl: "https://i.ytimg.com/vi/WMweEpGlu_U/maxresdefault.jpg",
        releaseYear: 2021,
        album: "Butter (Single)",
        hasCallGuide: true,
    },
    {
        id: "song3",
        title: "Hype Boy",
        artistId: "artist2",
        artistName: "NewJeans",
        youtubeId: "11cta61wi0g",
        duration: 180, // 3:00
        thumbnailUrl: "https://i.ytimg.com/vi/11cta61wi0g/maxresdefault.jpg",
        releaseYear: 2022,
        album: "New Jeans",
        hasCallGuide: true,
    },
    {
        id: "song4",
        title: "Attention",
        artistId: "artist2",
        artistName: "NewJeans",
        youtubeId: "js1CtxSY38I",
        duration: 181, // 3:01
        thumbnailUrl: "https://i.ytimg.com/vi/js1CtxSY38I/maxresdefault.jpg",
        releaseYear: 2022,
        album: "New Jeans",
        hasCallGuide: false,
    },
    {
        id: "song5",
        title: "Love Dive",
        artistId: "artist3",
        artistName: "IVE",
        youtubeId: "Y8JFxS1HlDo",
        duration: 177, // 2:57
        thumbnailUrl: "https://i.ytimg.com/vi/Y8JFxS1HlDo/maxresdefault.jpg",
        releaseYear: 2022,
        album: "Love Dive (Single)",
        hasCallGuide: true,
    },
    {
        id: "song6",
        title: "Next Level",
        artistId: "artist4",
        artistName: "aespa",
        youtubeId: "4TWR90KJl84",
        duration: 223, // 3:43
        thumbnailUrl: "https://i.ytimg.com/vi/4TWR90KJl84/maxresdefault.jpg",
        releaseYear: 2021,
        album: "Next Level (Single)",
        hasCallGuide: true,
    },
    {
        id: "song7",
        title: "Haru Haru",
        artistId: "artist5",
        artistName: "BIGBANG",
        youtubeId: "MzCbEdtNbJ0",
        duration: 275, // 4:35
        thumbnailUrl: "https://i.ytimg.com/vi/MzCbEdtNbJ0/maxresdefault.jpg",
        releaseYear: 2008,
        album: "Stand Up",
        hasCallGuide: true,
    },
];

/** Mock 콜가이드 엔트리 - Dynamite */
const DYNAMITE_ENTRIES: CallGuideEntry[] = [
    {
        id: "entry1-1",
        startTime: 0,
        endTime: 8,
        type: "lyrics",
        text: "(인트로)",
    },
    {
        id: "entry1-2",
        startTime: 8,
        endTime: 15,
        type: "clap",
        text: "👏👏👏👏",
        instruction: "비트에 맞춰 박수",
        intensity: 2,
    },
    {
        id: "entry1-3",
        startTime: 15,
        endTime: 23,
        type: "lyrics",
        text: "Cause I, I, I'm in the stars tonight",
        textRomanized: "Cause I, I, I'm in the stars tonight",
    },
    {
        id: "entry1-4",
        startTime: 23,
        endTime: 30,
        type: "sing",
        text: "So watch me bring the fire and set the night alight",
        instruction: "함께 부르기!",
        intensity: 2,
    },
    {
        id: "entry1-5",
        startTime: 50,
        endTime: 58,
        type: "sing",
        text: "Dy-na-na-na-na-na-na-na, na-na, life is dynamite",
        instruction: "모두 함께!",
        intensity: 3,
    },
    {
        id: "entry1-6",
        startTime: 58,
        endTime: 66,
        type: "jump",
        text: "🦘 점프!",
        instruction: "후렴에서 함께 점프",
        intensity: 3,
    },
    {
        id: "entry1-7",
        startTime: 66,
        endTime: 82,
        type: "action",
        text: "👋 손 흔들기",
        instruction: "손을 좌우로 흔들기",
        intensity: 2,
    },
    {
        id: "entry1-8",
        startTime: 150,
        endTime: 160,
        type: "sing",
        text: "BTS!",
        instruction: "아미밤 흔들며 외치기",
        intensity: 3,
    },
    {
        id: "entry1-9",
        startTime: 180,
        endTime: 195,
        type: "light",
        text: "📱 아미밤 ON",
        instruction: "아미밤 또는 플래시 켜기",
        intensity: 2,
    },
];

/** Mock 콜가이드 엔트리 - Hype Boy */
const HYPEBOY_ENTRIES: CallGuideEntry[] = [
    {
        id: "entry3-1",
        startTime: 0,
        endTime: 12,
        type: "lyrics",
        text: "(인트로)",
    },
    {
        id: "entry3-2",
        startTime: 12,
        endTime: 24,
        type: "lyrics",
        text: "I've been waiting all my life",
        textOriginal: "I've been waiting all my life",
    },
    {
        id: "entry3-3",
        startTime: 24,
        endTime: 36,
        type: "sing",
        text: "I just wanna be your love, oh",
        instruction: "함께 부르기",
        intensity: 2,
    },
    {
        id: "entry3-4",
        startTime: 50,
        endTime: 62,
        type: "sing",
        text: "뉴진스!",
        instruction: "팬덤 콜",
        intensity: 2,
    },
    {
        id: "entry3-5",
        startTime: 62,
        endTime: 74,
        type: "sing",
        text: "Cookie, hype boy, tell me what you want",
        instruction: "모두 함께!",
        intensity: 3,
    },
    {
        id: "entry3-6",
        startTime: 100,
        endTime: 112,
        type: "action",
        text: "🙌 양손 위로",
        instruction: "양손 위로 들고 좌우로 흔들기",
        intensity: 2,
    },
    {
        id: "entry3-7",
        startTime: 150,
        endTime: 165,
        type: "action",
        text: "🌊 파도타기",
        instruction: "구역별로 파도타기",
        intensity: 2,
    },
];

/** Mock 콜가이드 엔트리 - Love Dive */
const LOVEDIVE_ENTRIES: CallGuideEntry[] = [
    {
        id: "entry5-1",
        startTime: 0,
        endTime: 10,
        type: "lyrics",
        text: "내 맘을 Dive in Dive in",
        textOriginal: "내 맘을 Dive in Dive in",
    },
    {
        id: "entry5-2",
        startTime: 10,
        endTime: 18,
        type: "sing",
        text: "Love is so dangerous",
        instruction: "속삭이듯 함께",
        intensity: 1,
    },
    {
        id: "entry5-3",
        startTime: 45,
        endTime: 55,
        type: "sing",
        text: "아이브!",
        instruction: "유진이 \"우리가 누구?\" 하면 리스폰스",
        intensity: 2,
    },
    {
        id: "entry5-4",
        startTime: 60,
        endTime: 72,
        type: "sing",
        text: "Love Dive! 빠져드는 Love",
        instruction: "후렴 함께 부르기",
        intensity: 3,
    },
    {
        id: "entry5-5",
        startTime: 120,
        endTime: 135,
        type: "light",
        text: "📱 플래시 ON",
        instruction: "브릿지에서 플래시 흔들기",
        intensity: 2,
    },
];

/** Mock 콜가이드 엔트리 - Next Level */
const NEXTLEVEL_ENTRIES: CallGuideEntry[] = [
    {
        id: "entry6-1",
        startTime: 0,
        endTime: 12,
        type: "lyrics",
        text: "Kosmo, open the door",
        textOriginal: "Kosmo, open the door",
    },
    {
        id: "entry6-2",
        startTime: 12,
        endTime: 25,
        type: "lyrics",
        text: "(빌드업)",
    },
    {
        id: "entry6-3",
        startTime: 35,
        endTime: 50,
        type: "sing",
        text: "Watch me while I work it out out out",
        instruction: "함께 부르기!",
        intensity: 2,
    },
    {
        id: "entry6-4",
        startTime: 50,
        endTime: 62,
        type: "sing",
        text: "에스파!",
        instruction: "팬덤 콜",
        intensity: 2,
    },
    {
        id: "entry6-5",
        startTime: 95,
        endTime: 110,
        type: "sing",
        text: "I'm on the Next Level, Yeah",
        instruction: "후렴 함께! 강하게!",
        intensity: 3,
    },
    {
        id: "entry6-6",
        startTime: 130,
        endTime: 145,
        type: "action",
        text: "💃 손동작 따라하기",
        instruction: "안무 포인트 따라하기",
        intensity: 2,
    },
    {
        id: "entry6-7",
        startTime: 180,
        endTime: 195,
        type: "jump",
        text: "🦘 점프!",
        instruction: "마지막 후렴 점프",
        intensity: 3,
    },
];

/** Mock 콜가이드 엔트리 - Haru Haru */
const HARUHARU_ENTRIES: CallGuideEntry[] = [
    {
        id: "entry7-1",
        startTime: 0,
        endTime: 20,
        type: "lyrics",
        text: "(인트로)",
    },
    {
        id: "entry7-2",
        startTime: 20,
        endTime: 35,
        type: "lyrics",
        text: "나의 머리가 나빠서",
        textOriginal: "나의 머리가 나빠서",
    },
    {
        id: "entry7-3",
        startTime: 60,
        endTime: 80,
        type: "sing",
        text: "하루하루 지나가면",
        instruction: "모두 함께 부르기",
        intensity: 3,
    },
    {
        id: "entry7-4",
        startTime: 80,
        endTime: 95,
        type: "sing",
        text: "빅뱅!",
        instruction: "팬덤 콜",
        intensity: 2,
    },
    {
        id: "entry7-5",
        startTime: 150,
        endTime: 170,
        type: "light",
        text: "📱 옐로우 라이트",
        instruction: "응원봉/플래시 흔들기",
        intensity: 2,
    },
    {
        id: "entry7-6",
        startTime: 200,
        endTime: 220,
        type: "sing",
        text: "이젠 정말 안녕",
        instruction: "클라이맥스 떼창",
        intensity: 3,
    },
    {
        id: "entry7-7",
        startTime: 240,
        endTime: 260,
        type: "action",
        text: "🌊 파도타기",
        instruction: "아웃트로 파도타기",
        intensity: 2,
    },
];

/** Mock 콜가이드 데이터 */
export const MOCK_CALL_GUIDES: CallGuide[] = [
    {
        id: "guide1",
        songId: "song1",
        song: MOCK_SONGS[0],
        entries: DYNAMITE_ENTRIES,
        createdBy: "user1",
        createdAt: new Date("2024-06-15"),
        updatedAt: new Date("2024-12-01"),
        version: 5,
        contributors: ["user1", "user2", "user4"],
        status: "verified",
        verifiedBy: "admin1",
        helpfulCount: 234,
    },
    {
        id: "guide2",
        songId: "song3",
        song: MOCK_SONGS[2],
        entries: HYPEBOY_ENTRIES,
        createdBy: "user3",
        createdAt: new Date("2024-08-20"),
        updatedAt: new Date("2024-11-15"),
        version: 3,
        contributors: ["user3", "user5"],
        status: "published",
        helpfulCount: 89,
    },
    {
        id: "guide3",
        songId: "song5",
        song: MOCK_SONGS[4],
        entries: LOVEDIVE_ENTRIES,
        createdBy: "user2",
        createdAt: new Date("2024-05-10"),
        updatedAt: new Date("2024-10-20"),
        version: 4,
        contributors: ["user2", "user1", "user6"],
        status: "verified",
        verifiedBy: "admin1",
        helpfulCount: 156,
    },
    {
        id: "guide4",
        songId: "song6",
        song: MOCK_SONGS[5],
        entries: NEXTLEVEL_ENTRIES,
        createdBy: "user4",
        createdAt: new Date("2024-07-05"),
        updatedAt: new Date("2024-12-10"),
        version: 6,
        contributors: ["user4", "user2", "user3", "user7"],
        status: "verified",
        verifiedBy: "admin1",
        helpfulCount: 312,
    },
    {
        id: "guide5",
        songId: "song7",
        song: MOCK_SONGS[6],
        entries: HARUHARU_ENTRIES,
        createdBy: "user1",
        createdAt: new Date("2023-12-01"),
        updatedAt: new Date("2024-08-15"),
        version: 8,
        contributors: ["user1", "user2", "user3", "user4", "user5"],
        status: "verified",
        verifiedBy: "admin1",
        helpfulCount: 567,
    },
];

/** Mock 아티스트 목록 (콜가이드용) */
export const MOCK_CALL_GUIDE_ARTISTS = [
    { id: "artist1", name: "BTS", songCount: 2, guideCount: 1 },
    { id: "artist2", name: "NewJeans", songCount: 2, guideCount: 1 },
    { id: "artist3", name: "IVE", songCount: 1, guideCount: 1 },
    { id: "artist4", name: "aespa", songCount: 1, guideCount: 1 },
    { id: "artist5", name: "BIGBANG", songCount: 1, guideCount: 1 },
];

/** 아티스트별 곡 가져오기 */
export function getMockSongsByArtist(artistId: string): Song[] {
    return MOCK_SONGS.filter((song) => song.artistId === artistId);
}

/** 곡 ID로 콜가이드 가져오기 */
export function getMockCallGuideBySongId(songId: string): CallGuide | undefined {
    return MOCK_CALL_GUIDES.find((guide) => guide.songId === songId);
}

/** 인기순 콜가이드 가져오기 */
export function getMockPopularCallGuides(limit = 10): CallGuide[] {
    return [...MOCK_CALL_GUIDES]
        .sort((a, b) => b.helpfulCount - a.helpfulCount)
        .slice(0, limit);
}

/** 최근 수정된 콜가이드 가져오기 */
export function getMockRecentCallGuides(limit = 10): CallGuide[] {
    return [...MOCK_CALL_GUIDES]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit);
}

/** 아티스트 이름으로 콜가이드 아티스트 찾기 */
export function findCallGuideArtistByName(artistName: string): typeof MOCK_CALL_GUIDE_ARTISTS[0] | undefined {
    const normalized = artistName.toLowerCase().trim();
    return MOCK_CALL_GUIDE_ARTISTS.find(
        (a) => a.name.toLowerCase() === normalized
    );
}

/** 아티스트 이름으로 콜가이드가 있는지 확인 */
export function hasCallGuideForArtist(artistName: string): boolean {
    return !!findCallGuideArtistByName(artistName);
}
