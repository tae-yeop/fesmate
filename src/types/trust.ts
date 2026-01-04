/**
 * 신뢰도 시스템 타입 정의
 * 사용자 활동 기반 신뢰도 점수 및 등급
 */

/** 신뢰도 등급 */
export type TrustGrade = "A" | "B" | "C";

/** 등급별 설정 */
export interface TrustGradeConfig {
    /** 등급 이름 */
    name: string;
    /** 최소 점수 */
    minScore: number;
    /** 색상 (Tailwind) */
    color: string;
    /** 배경색 (Tailwind) */
    bgColor: string;
    /** 설명 */
    description: string;
}

/** 등급 설정 */
export const TRUST_GRADE_CONFIG: Record<TrustGrade, TrustGradeConfig> = {
    A: {
        name: "신뢰",
        minScore: 80,
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "신뢰할 수 있는 사용자",
    },
    B: {
        name: "보통",
        minScore: 50,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        description: "일반 사용자",
    },
    C: {
        name: "주의",
        minScore: 0,
        color: "text-red-600",
        bgColor: "bg-red-100",
        description: "주의가 필요한 사용자",
    },
};

/** 점수 변동 설정 */
export interface TrustScoreConfig {
    /** 기본 점수 */
    baseScore: number;
    /** 최대 점수 */
    maxScore: number;
    /** 최소 점수 */
    minScore: number;
    /** 도움됨 받을 때 +점수 */
    helpfulReceived: number;
    /** 신고당할 때 -점수 */
    reportedAgainst: number;
    /** 경고 받을 때 -점수 */
    warningReceived: number;
    /** 정지 받을 때 -점수 */
    suspensionReceived: number;
    /** 글 작성 시 +점수 (일일 한도 있음) */
    postCreated: number;
    /** 댓글 작성 시 +점수 */
    commentCreated: number;
    /** 일일 활동 점수 한도 */
    dailyActivityLimit: number;
}

/** 기본 점수 설정 */
export const TRUST_SCORE_CONFIG: TrustScoreConfig = {
    baseScore: 50,
    maxScore: 100,
    minScore: 0,
    helpfulReceived: 1,
    reportedAgainst: -10,
    warningReceived: -15,
    suspensionReceived: -30,
    postCreated: 0.5,
    commentCreated: 0.2,
    dailyActivityLimit: 5,
};

/** 사용자 신뢰도 정보 */
export interface UserTrust {
    userId: string;
    /** 현재 점수 (0-100) */
    score: number;
    /** 현재 등급 */
    grade: TrustGrade;
    /** 받은 도움됨 수 */
    helpfulReceived: number;
    /** 받은 신고 수 */
    reportsAgainst: number;
    /** 받은 경고 수 */
    warningsReceived: number;
    /** 마지막 업데이트 */
    updatedAt: Date;
}

/** 신뢰도 변동 기록 */
export interface TrustScoreChange {
    id: string;
    userId: string;
    /** 변동 전 점수 */
    previousScore: number;
    /** 변동 후 점수 */
    newScore: number;
    /** 변동량 */
    delta: number;
    /** 변동 사유 */
    reason: TrustChangeReason;
    /** 관련 ID (글, 댓글, 신고 등) */
    relatedId?: string;
    /** 변동 시간 */
    createdAt: Date;
}

/** 신뢰도 변동 사유 */
export type TrustChangeReason =
    | "helpful_received"
    | "helpful_removed"
    | "reported_against"
    | "warning_received"
    | "suspension_received"
    | "post_created"
    | "comment_created"
    | "manual_adjustment";

/**
 * 점수로 등급 계산
 */
export function calculateGrade(score: number): TrustGrade {
    if (score >= TRUST_GRADE_CONFIG.A.minScore) return "A";
    if (score >= TRUST_GRADE_CONFIG.B.minScore) return "B";
    return "C";
}

/**
 * 등급 설정 가져오기
 */
export function getGradeConfig(grade: TrustGrade): TrustGradeConfig {
    return TRUST_GRADE_CONFIG[grade];
}

/**
 * 등급별 글 신뢰도 레벨 매핑
 * 사용자 등급 → 작성 글의 기본 trustLevel
 */
export function gradeToTrustLevel(grade: TrustGrade): number {
    switch (grade) {
        case "A":
            return 2; // 높은 신뢰도
        case "B":
            return 1; // 보통
        case "C":
            return 0; // 낮은 신뢰도
    }
}
