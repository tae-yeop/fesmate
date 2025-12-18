/**
 * 중앙화된 스타일 상수 - 일관된 UI를 위한 색상/스타일 정의
 */

/** LIVE/RECAP 배지 스타일 */
export const HUB_MODE_STYLES = {
    LIVE: "bg-red-100 text-red-700 animate-pulse",
    RECAP: "bg-gray-100 text-gray-700",
} as const;

/** LIVE 배지 (헤더/카드용) */
export const LIVE_BADGE_STYLE = "px-2 py-1 text-xs font-bold rounded-full bg-red-500 text-white animate-pulse";
export const LIVE_BADGE_SMALL = "px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white animate-pulse";
export const LIVE_DOT_STYLE = "h-2 w-2 rounded-full bg-red-500 animate-pulse";

/** 포스트 타입별 색상 */
export const POST_TYPE_COLORS: Record<string, string> = {
    gate: "bg-blue-100 text-blue-700",
    md: "bg-purple-100 text-purple-700",
    facility: "bg-green-100 text-green-700",
    safety: "bg-red-100 text-red-700",
    official: "bg-yellow-100 text-yellow-700",
    companion: "bg-pink-100 text-pink-700",
    taxi: "bg-orange-100 text-orange-700",
    meal: "bg-amber-100 text-amber-700",
    lodge: "bg-teal-100 text-teal-700",
    transfer: "bg-rose-100 text-rose-700",
    review: "bg-indigo-100 text-indigo-700",
    video: "bg-cyan-100 text-cyan-700",
    tip: "bg-lime-100 text-lime-700",
    question: "bg-sky-100 text-sky-700",
} as const;

/** 신뢰도 등급 색상 */
export const TRUST_LEVEL_COLORS = {
    A: "bg-green-100 text-green-700",
    B: "bg-yellow-100 text-yellow-700",
    C: "bg-red-100 text-red-700",
} as const;

/** 커뮤니티 포스트 상태 색상 */
export const COMMUNITY_STATUS_COLORS = {
    ACTIVE: "bg-green-100 text-green-700",
    EXPIRING: "bg-yellow-100 text-yellow-700",
    EXPIRED: "bg-gray-100 text-gray-500",
    CLOSED: "bg-blue-100 text-blue-700",
} as const;

/** 행사 상태 색상 */
export const EVENT_STATUS_COLORS = {
    SCHEDULED: "bg-green-100 text-green-700",
    CHANGED: "bg-orange-100 text-orange-700",
    POSTPONED: "bg-yellow-100 text-yellow-700",
    CANCELED: "bg-red-100 text-red-700",
} as const;

/** 찜/다녀옴 버튼 스타일 */
export const WISHLIST_BUTTON_STYLES = {
    active: "bg-yellow-50 border-yellow-400 text-yellow-700",
    inactive: "bg-background hover:bg-accent",
} as const;

export const ATTENDED_BUTTON_STYLES = {
    active: "bg-green-50 border-green-400 text-green-700",
    inactive: "bg-background hover:bg-accent",
} as const;

/** 알림 배지 스타일 */
export const NOTIFICATION_BADGE_STYLE = "rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white";

/** 헬퍼 함수: 포스트 타입 색상 가져오기 */
export function getPostTypeColor(type: string): string {
    return POST_TYPE_COLORS[type] || "bg-gray-100 text-gray-700";
}

/** 헬퍼 함수: 신뢰도 등급 색상 가져오기 */
export function getTrustLevelColor(level: "A" | "B" | "C"): string {
    return TRUST_LEVEL_COLORS[level];
}

/** 헬퍼 함수: 커뮤니티 상태 색상 가져오기 */
export function getCommunityStatusColor(status: keyof typeof COMMUNITY_STATUS_COLORS): string {
    return COMMUNITY_STATUS_COLORS[status];
}
