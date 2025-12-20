// 커뮤니티 글 참여 신청 관련 타입 정의

/** 참여 신청 상태 */
export type ParticipationStatus =
    | "pending"   // 대기 중
    | "accepted"  // 수락됨
    | "declined"  // 거절됨
    | "canceled"; // 취소됨 (신청자가 취소)

/** 참여 신청 */
export interface ParticipationRequest {
    id: string;
    /** 신청하는 사용자 ID */
    applicantId: string;
    /** 글 ID */
    postId: string;
    /** 글 작성자 ID */
    postAuthorId: string;
    /** 메시지 (선택) */
    message?: string;
    /** 상태 */
    status: ParticipationStatus;
    /** 생성 시각 */
    createdAt: Date;
    /** 응답 시각 (수락/거절 시) */
    respondedAt?: Date;
}

/** 참여 신청 생성 입력 */
export interface CreateParticipationInput {
    postId: string;
    postAuthorId: string;
    message?: string;
}

/** 글 타입별 참여 라벨 */
export const PARTICIPATION_LABELS: Record<string, { action: string; noun: string }> = {
    companion: { action: "동행 신청", noun: "동행" },
    taxi: { action: "택시팟 신청", noun: "택시팟" },
    meal: { action: "밥 신청", noun: "밥약" },
    accommodation: { action: "숙소 신청", noun: "숙소" },
    transfer: { action: "양도 신청", noun: "양도" },
};
