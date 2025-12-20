/**
 * 리더보드 시스템 타입 정의 (PRD 6.15)
 * - 커뮤니티 기여자 인정
 * - 건강한 참여 동기
 */

/** 점수 기간 타입 */
export type LeaderboardPeriod = "weekly" | "monthly" | "all_time";

/** 활동 타입별 점수 */
export const ACTIVITY_SCORES = {
    /** 도움됨 받은 후기 */
    helpful_review: 10,
    /** 현장 제보 (게이트/MD/시설/안전) */
    live_report: 5,
    /** 답변/댓글 */
    comment: 3,
    /** 글 작성 (일반) */
    post: 2,
    /** 다녀온 인증 */
    attended: 1,
} as const;

/** 활동 기록 */
export interface ActivityRecord {
    id: string;
    userId: string;
    type: keyof typeof ACTIVITY_SCORES;
    /** 관련 포스트 ID */
    postId?: string;
    /** 관련 행사 ID */
    eventId?: string;
    /** 도움됨 카운트 (후기인 경우) */
    helpfulCount?: number;
    /** 활동 일시 */
    createdAt: Date;
}

/** 사용자 리더보드 점수 */
export interface LeaderboardScore {
    userId: string;
    nickname: string;
    avatar?: string;
    /** 총 점수 */
    totalScore: number;
    /** 점수 상세 */
    breakdown: {
        helpfulReviews: number;  // 도움됨 받은 후기 수
        liveReports: number;     // 현장 제보 수
        comments: number;        // 댓글 수
        posts: number;           // 글 작성 수
        attended: number;        // 다녀온 수
    };
    /** 랭킹 */
    rank: number;
    /** 이전 기간 대비 변화 */
    rankChange?: number;
    /** 배지 */
    badges?: string[];
}

/** 리더보드 엔트리 (표시용) */
export interface LeaderboardEntry extends LeaderboardScore {
    /** 점수 계산에 사용된 활동 수 */
    activityCount: number;
}

/** 랭킹 티어 */
export type RankTier = "diamond" | "gold" | "silver" | "bronze" | "none";

/** 랭킹 티어 설정 */
export const RANK_TIERS: Record<RankTier, { minRank: number; maxRank: number; label: string; emoji: string; color: string }> = {
    diamond: { minRank: 1, maxRank: 3, label: "다이아몬드", emoji: "💎", color: "text-cyan-500" },
    gold: { minRank: 4, maxRank: 10, label: "골드", emoji: "🥇", color: "text-yellow-500" },
    silver: { minRank: 11, maxRank: 30, label: "실버", emoji: "🥈", color: "text-gray-400" },
    bronze: { minRank: 31, maxRank: 100, label: "브론즈", emoji: "🥉", color: "text-orange-600" },
    none: { minRank: 101, maxRank: Infinity, label: "", emoji: "", color: "text-muted-foreground" },
};

/** 랭킹에서 티어 가져오기 */
export function getRankTier(rank: number): RankTier {
    if (rank <= 3) return "diamond";
    if (rank <= 10) return "gold";
    if (rank <= 30) return "silver";
    if (rank <= 100) return "bronze";
    return "none";
}

/** 점수 계산 (도움됨 가중치 적용) */
export function calculateScore(breakdown: LeaderboardScore["breakdown"]): number {
    return (
        breakdown.helpfulReviews * ACTIVITY_SCORES.helpful_review +
        breakdown.liveReports * ACTIVITY_SCORES.live_report +
        breakdown.comments * ACTIVITY_SCORES.comment +
        breakdown.posts * ACTIVITY_SCORES.post +
        breakdown.attended * ACTIVITY_SCORES.attended
    );
}
