// 커뮤니티 글 참여 신청 관련 타입 정의

/** 참여 신청 상태 */
export type ParticipationStatus =
    | "pending"   // 대기 중
    | "accepted"  // 수락됨
    | "declined"  // 거절됨
    | "canceled"; // 취소됨 (신청자가 취소)

/** 활동 상태 */
export type ActivityStatus =
    | "upcoming"    // 예정
    | "ongoing"     // 진행중
    | "completed";  // 완료

/** 참여 신청 */
export interface ParticipationRequest {
    id: string;
    /** 신청하는 사용자 ID */
    applicantId: string;
    /** 글 ID */
    postId: string;
    /** 글 작성자 ID */
    postAuthorId: string;
    /** 글 타입 (companion, taxi, meal 등) */
    postType?: string;
    /** 메시지 (선택) */
    message?: string;
    /** 상태 */
    status: ParticipationStatus;
    /** 생성 시각 */
    createdAt: Date;
    /** 응답 시각 (수락/거절 시) */
    respondedAt?: Date;
    /** 활동 예정 시각 (택시팟 출발시간, 밥약 시간 등) */
    scheduledAt?: Date;
    /** 활동 장소 (선택) */
    activityLocation?: string;
}

/** 참여 신청 생성 입력 */
export interface CreateParticipationInput {
    postId: string;
    postAuthorId: string;
    /** 글 타입 (companion, taxi, meal 등) - UI 표시용 */
    postType?: string;
    message?: string;
}

/** 글 타입별 참여 라벨 */
export const PARTICIPATION_LABELS: Record<string, { action: string; noun: string; icon: string }> = {
    companion: { action: "동행 신청", noun: "동행", icon: "👫" },
    taxi: { action: "택시팟 신청", noun: "택시팟", icon: "🚕" },
    meal: { action: "밥 신청", noun: "밥약", icon: "🍚" },
    lodge: { action: "숙소 신청", noun: "숙소", icon: "🏠" },
    accommodation: { action: "숙소 신청", noun: "숙소", icon: "🏠" },
    transfer: { action: "양도 신청", noun: "양도", icon: "🎫" },
};

/** 활동 상태 라벨 */
export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, { label: string; color: string }> = {
    upcoming: { label: "예정", color: "blue" },
    ongoing: { label: "진행중", color: "green" },
    completed: { label: "완료", color: "gray" },
};

/** 활동 상태 계산 */
export function getActivityStatus(scheduledAt: Date | undefined, now: Date = new Date()): ActivityStatus {
    if (!scheduledAt) return "upcoming";

    const scheduled = new Date(scheduledAt);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < -2) return "completed";  // 2시간 지남
    if (diffHours < 0) return "ongoing";     // 시작됨
    return "upcoming";                        // 예정
}
