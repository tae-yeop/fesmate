// 콜가이드 관련 타입 정의
// 아티스트 곡별 호응법(콜&리스폰스)을 커뮤니티가 함께 작성/편집

/** 콜 타입 (7개) */
export type CallType =
    | "lyrics"      // 가사 (instruction 불가)
    | "sing"        // 따라부르기 (떼창/콜/리스폰스 통합)
    | "action"      // 동작 (손흔들기/파도 등)
    | "jump"        // 점프
    | "clap"        // 박수
    | "light"       // 응원봉/플래시
    | "etc";        // 기타

/** 콜 타입 설정 */
export interface CallTypeConfig {
    label: string;
    icon: string;
    color: string;
    description: string;
    allowInstruction: boolean;  // instruction 입력 허용 여부
    examples: string[];         // 에디터용 예시
}

/** 콜 타입 설정 맵 */
export const CALL_TYPE_CONFIG: Record<CallType, CallTypeConfig> = {
    lyrics: {
        label: "가사",
        icon: "🎤",
        color: "text-gray-500",
        description: "가사 표시 (따라부르기 아님)",
        allowInstruction: false,
        examples: ["나를 잊지 말아요", "우리 함께 걸어요"],
    },
    sing: {
        label: "따라부르기",
        icon: "🎵",
        color: "text-blue-500",
        description: "떼창, 추임새, 리스폰스",
        allowInstruction: true,
        examples: [
            "라라라~",           // 떼창
            "야!",              // 콜
            "좋아!",            // 리스폰스
            "오예~",
        ],
    },
    action: {
        label: "동작",
        icon: "👋",
        color: "text-green-500",
        description: "손흔들기, 파도타기 등",
        allowInstruction: true,
        examples: [
            "손을 좌우로 흔들기",
            "파도타기",
            "손 위로!",
        ],
    },
    jump: {
        label: "점프",
        icon: "🦘",
        color: "text-orange-500",
        description: "떼점프 구간",
        allowInstruction: true,
        examples: [
            "모두 점프!",
            "뛰어!",
        ],
    },
    clap: {
        label: "박수",
        icon: "👏",
        color: "text-pink-500",
        description: "리듬에 맞춰 박수",
        allowInstruction: true,
        examples: [
            "짝짝 짝짝짝",
            "박수!",
        ],
    },
    light: {
        label: "응원봉",
        icon: "📱",
        color: "text-yellow-500",
        description: "플래시, 응원봉 켜기",
        allowInstruction: true,
        examples: [
            "플래시 ON",
            "응원봉 좌우로",
            "라이트 웨이브",
        ],
    },
    etc: {
        label: "기타",
        icon: "💬",
        color: "text-gray-500",
        description: "기타 안내사항",
        allowInstruction: true,
        examples: [
            "조용히 감상",
            "MC 멘트",
            "무대 전환",
        ],
    },
};

/** 콜 타입 목록 (에디터용) */
export const CALL_TYPES: CallType[] = ["lyrics", "sing", "action", "jump", "clap", "light", "etc"];

/** 곡 정보 (글로벌 엔티티) */
export interface Song {
    id: string;
    title: string;
    artistId: string;
    artistName: string;
    youtubeId: string;           // YouTube 영상 ID
    duration: number;            // 재생 시간 (초)
    thumbnailUrl?: string;
    releaseYear?: number;
    album?: string;
    hasCallGuide: boolean;
}

/** 콜가이드 항목 */
export interface CallGuideEntry {
    id: string;
    startTime: number;           // 시작 시간 (초, 소수점 허용)
    endTime?: number;            // 종료 시간 (선택)
    type: CallType;
    text: string;                // 표시할 텍스트 (가사/지시)
    textRomanized?: string;      // 로마자 표기
    textOriginal?: string;       // 원문 (일본어/영어 등)
    instruction?: string;        // 추가 설명
    intensity?: 1 | 2 | 3;       // 강도 (1: 약, 2: 보통, 3: 강)
    // 작성자 & 도움됨 (개별 엔트리용)
    createdBy?: string;          // 엔트리 작성자 ID
    helpfulCount?: number;       // 엔트리별 도움됨 카운트
}

/** 콜가이드 상태 */
export type CallGuideStatus = "draft" | "published" | "verified";

/** 콜가이드 전체 */
export interface CallGuide {
    id: string;
    songId: string;
    song?: Song;                 // denormalized
    entries: CallGuideEntry[];
    createdBy: string;           // 최초 작성자 ID
    createdAt: Date;
    updatedAt: Date;
    version: number;
    contributors: string[];      // 기여자 목록
    status: CallGuideStatus;
    verifiedBy?: string;
    helpfulCount: number;
}

/** 콜가이드 버전 히스토리 */
export interface CallGuideVersion {
    id: string;
    callGuideId: string;
    version: number;
    entries: CallGuideEntry[];
    editedBy: string;
    editedAt: Date;
    changeDescription?: string;
}

/** 콜가이드 생성 입력 */
export interface CreateCallGuideInput {
    songId: string;
    entries?: CallGuideEntry[];
}

/** 콜가이드 엔트리 생성 입력 */
export interface CreateCallGuideEntryInput {
    startTime: number;
    endTime?: number;
    type: CallType;
    text: string;
    textRomanized?: string;
    textOriginal?: string;
    instruction?: string;
    intensity?: 1 | 2 | 3;
}

/** 곡 생성 입력 (YouTube URL에서 추출) */
export interface CreateSongInput {
    title: string;
    artistId: string;
    artistName: string;
    youtubeId: string;
    duration: number;
    thumbnailUrl?: string;
    releaseYear?: number;
    album?: string;
}

/** YouTube 메타데이터 (oEmbed API 응답) */
export interface YouTubeMetadata {
    title: string;
    author_name: string;
    thumbnail_url: string;
    html: string;
}

/** YouTube URL에서 ID 추출 */
export function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/,  // 직접 ID 입력
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

/** 시간 포맷 (초 → MM:SS 또는 MM:SS.ms) */
export function formatTime(seconds: number, includeMs = false): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);

    const base = `${mins}:${secs.toString().padStart(2, "0")}`;
    return includeMs ? `${base}.${ms}` : base;
}

/** 시간 파싱 (MM:SS 또는 MM:SS.ms → 초) */
export function parseTime(timeStr: string): number | null {
    const match = timeStr.match(/^(\d+):(\d{2})(?:\.(\d))?$/);
    if (!match) return null;

    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const ms = match[3] ? parseInt(match[3], 10) / 10 : 0;

    return mins * 60 + secs + ms;
}

/** 현재 재생 시간에 해당하는 엔트리 찾기 */
export function findActiveEntry(
    entries: CallGuideEntry[],
    currentTime: number
): CallGuideEntry | null {
    // 현재 시간에 해당하는 엔트리 찾기
    return entries.find(entry => {
        const inRange = currentTime >= entry.startTime;
        if (entry.endTime) {
            return inRange && currentTime < entry.endTime;
        }
        // endTime이 없으면 다음 엔트리 시작 전까지
        const nextEntry = entries.find(e => e.startTime > entry.startTime);
        if (nextEntry) {
            return inRange && currentTime < nextEntry.startTime;
        }
        return inRange;
    }) || null;
}

/** 다음 엔트리 찾기 */
export function findNextEntry(
    entries: CallGuideEntry[],
    currentTime: number
): CallGuideEntry | null {
    const sorted = [...entries].sort((a, b) => a.startTime - b.startTime);
    return sorted.find(entry => entry.startTime > currentTime) || null;
}
