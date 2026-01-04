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

/** 페널티 점수 (차감) */
export const PENALTY_SCORES = {
    /** 신고당함 (콘텐츠 신고) */
    reported_content: -10,
    /** 신고당함 (사용자 신고) */
    reported_user: -20,
    /** 콘텐츠 삭제됨 (정책 위반) */
    content_removed: -15,
    /** 경고 받음 */
    warned: -30,
    /** 일시 정지 (7일) */
    suspended_week: -100,
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

// ===== 윌슨 스코어 =====

/**
 * 윌슨 스코어 하한 계산 (Wilson Score Lower Bound)
 * - 적은 표본에서도 신뢰할 수 있는 평점 제공
 * - 도움됨/신고 비율 기반 품질 점수 계산에 사용
 *
 * @param positive 긍정 반응 수 (예: 도움됨)
 * @param total 전체 반응 수 (예: 도움됨 + 신고)
 * @param confidence 신뢰 수준 (기본 0.95 = 95%)
 * @returns 윌슨 스코어 하한 (0~1)
 */
export function wilsonScoreLowerBound(
    positive: number,
    total: number,
    confidence: number = 0.95
): number {
    if (total === 0) return 0;

    // Z-score for confidence level (1.96 for 95%)
    const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.645;

    const phat = positive / total;
    const denominator = 1 + (z * z) / total;
    const numerator =
        phat +
        (z * z) / (2 * total) -
        z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total);

    return numerator / denominator;
}

/**
 * 윌슨 스코어 기반 콘텐츠 품질 점수 계산
 * - 도움됨과 신고 비율을 기반으로 품질 점수 산출
 * - 표본이 적을수록 보수적으로 평가
 *
 * @param helpfulCount 도움됨 수
 * @param reportCount 신고 수 (기본 0)
 * @returns 품질 점수 (0~100)
 */
export function calculateQualityScore(
    helpfulCount: number,
    reportCount: number = 0
): number {
    const total = helpfulCount + reportCount;
    if (total === 0) return 50; // 기본 중립 점수

    const wilsonScore = wilsonScoreLowerBound(helpfulCount, total);
    return Math.round(wilsonScore * 100);
}

// ===== 최근성 가중치 (Decay Factor) =====

/**
 * 최근성 가중치 설정
 * - halfLifeDays: 반감기 (일수). 이 기간 후 점수가 50%로 감소
 * - minWeight: 최소 가중치 (아무리 오래되어도 이 이상 유지)
 */
export const RECENCY_CONFIG = {
    /** 반감기 (일) - 14일 후 50% 감소 */
    halfLifeDays: 14,
    /** 최소 가중치 - 아무리 오래되어도 10% 유지 */
    minWeight: 0.1,
} as const;

/**
 * 최근성 가중치 계산 (지수 감쇠)
 * - 최신 활동일수록 높은 가중치
 * - 시간이 지날수록 지수적으로 감소
 *
 * @param activityDate 활동 일시
 * @param referenceDate 기준 일시 (기본: 현재)
 * @returns 가중치 (minWeight ~ 1.0)
 */
export function calculateRecencyWeight(
    activityDate: Date,
    referenceDate: Date = new Date()
): number {
    const daysDiff = (referenceDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff <= 0) return 1.0;

    // 지수 감쇠: weight = e^(-λt)
    // λ = ln(2) / halfLife 이므로 t일 후 50% 감소
    const lambda = Math.log(2) / RECENCY_CONFIG.halfLifeDays;
    const weight = Math.exp(-lambda * daysDiff);

    // 최소 가중치 보장
    return Math.max(RECENCY_CONFIG.minWeight, weight);
}

/**
 * 최근성 가중치가 적용된 점수 계산
 * - 활동 일시를 고려하여 점수에 가중치 적용
 *
 * @param score 원래 점수
 * @param activityDate 활동 일시
 * @returns 가중치가 적용된 점수
 */
export function applyRecencyWeight(score: number, activityDate: Date): number {
    const weight = calculateRecencyWeight(activityDate);
    return Math.round(score * weight);
}

/**
 * 활동 기록 배열의 총점 계산 (최근성 가중치 적용)
 *
 * @param activities 활동 기록 배열
 * @returns 가중치가 적용된 총점
 */
export function calculateWeightedTotalScore(
    activities: { score: number; createdAt: Date }[]
): number {
    return activities.reduce((total, activity) => {
        return total + applyRecencyWeight(activity.score, activity.createdAt);
    }, 0);
}
