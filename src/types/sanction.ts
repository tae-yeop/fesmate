/**
 * 제재 시스템 타입 정의
 * 경고, 정지, 차단 등 자동/수동 제재
 */

/** 제재 타입 */
export type SanctionType = "warning" | "suspension" | "ban";

/** 제재 사유 */
export type SanctionReason =
    | "multiple_reports" // 다수 신고
    | "spam" // 스팸 행위
    | "harassment" // 괴롭힘
    | "inappropriate_content" // 부적절한 콘텐츠
    | "scam" // 사기 의심
    | "impersonation" // 사칭
    | "other"; // 기타

/** 제재 설정 */
export interface SanctionConfig {
    /** 경고로 전환되는 신고 횟수 */
    reportsForWarning: number;
    /** 정지로 전환되는 경고 횟수 */
    warningsForSuspension: number;
    /** 정지 기간 (일) */
    suspensionDays: number;
    /** 영구 차단되는 정지 횟수 */
    suspensionsForBan: number;
}

/** 기본 제재 설정 */
export const SANCTION_CONFIG: SanctionConfig = {
    reportsForWarning: 3,
    warningsForSuspension: 3,
    suspensionDays: 7,
    suspensionsForBan: 3,
};

/** 제재 기록 */
export interface UserSanction {
    id: string;
    userId: string;
    /** 제재 타입 */
    type: SanctionType;
    /** 제재 사유 */
    reason: SanctionReason;
    /** 상세 설명 */
    description?: string;
    /** 관련 신고 ID 목록 */
    relatedReportIds?: string[];
    /** 만료 시간 (정지의 경우) */
    expiresAt?: Date;
    /** 생성자 (SYSTEM 또는 관리자 ID) */
    createdBy: string;
    /** 생성 시간 */
    createdAt: Date;
    /** 활성 상태 */
    isActive: boolean;
    /** 해제 시간 */
    resolvedAt?: Date;
    /** 해제자 */
    resolvedBy?: string;
}

/** 사용자 제재 상태 */
export interface UserSanctionStatus {
    userId: string;
    /** 활성 경고 수 */
    activeWarnings: number;
    /** 총 경고 수 */
    totalWarnings: number;
    /** 활성 정지 */
    activeSuspension?: UserSanction;
    /** 총 정지 수 */
    totalSuspensions: number;
    /** 영구 차단 여부 */
    isBanned: boolean;
    /** 글 작성 가능 여부 */
    canPost: boolean;
    /** 댓글 작성 가능 여부 */
    canComment: boolean;
    /** 제한 사유 메시지 */
    restrictionMessage?: string;
}

/** 제재 타입별 설명 */
export const SANCTION_TYPE_INFO: Record<
    SanctionType,
    { name: string; description: string; severity: number }
> = {
    warning: {
        name: "경고",
        description: "커뮤니티 가이드라인 위반으로 경고를 받았습니다",
        severity: 1,
    },
    suspension: {
        name: "정지",
        description: "일정 기간 동안 글 작성이 제한됩니다",
        severity: 2,
    },
    ban: {
        name: "영구 차단",
        description: "더 이상 서비스를 이용할 수 없습니다",
        severity: 3,
    },
};

/** 제재 사유별 설명 */
export const SANCTION_REASON_INFO: Record<SanctionReason, string> = {
    multiple_reports: "다수의 사용자로부터 신고를 받음",
    spam: "스팸 또는 도배 행위",
    harassment: "다른 사용자에 대한 괴롭힘",
    inappropriate_content: "부적절한 콘텐츠 게시",
    scam: "사기 또는 사기 시도 의심",
    impersonation: "타인 사칭",
    other: "기타 커뮤니티 가이드라인 위반",
};

/**
 * 정지 만료 여부 체크
 */
export function isSuspensionExpired(sanction: UserSanction): boolean {
    if (sanction.type !== "suspension") return true;
    if (!sanction.expiresAt) return false;
    return new Date() > new Date(sanction.expiresAt);
}

/**
 * 정지 남은 시간 계산
 */
export function getRemainingTime(sanction: UserSanction): {
    days: number;
    hours: number;
    expired: boolean;
} {
    if (!sanction.expiresAt) {
        return { days: 0, hours: 0, expired: false };
    }

    const now = new Date();
    const expires = new Date(sanction.expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) {
        return { days: 0, hours: 0, expired: true };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return { days, hours, expired: false };
}

/**
 * 제재 상태 메시지 생성
 */
export function getSanctionMessage(status: UserSanctionStatus): string | null {
    if (status.isBanned) {
        return "계정이 영구 차단되었습니다. 더 이상 서비스를 이용할 수 없습니다.";
    }

    if (status.activeSuspension) {
        const remaining = getRemainingTime(status.activeSuspension);
        if (!remaining.expired) {
            return `계정이 정지 중입니다. 남은 시간: ${remaining.days}일 ${remaining.hours}시간`;
        }
    }

    if (status.activeWarnings > 0) {
        const remaining = SANCTION_CONFIG.warningsForSuspension - status.activeWarnings;
        return `경고 ${status.activeWarnings}회를 받았습니다. ${remaining}회 추가 경고 시 정지됩니다.`;
    }

    return null;
}
