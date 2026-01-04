// 동행 제안 관련 타입 정의

/** 동행 제안 상태 */
export type CompanionRequestStatus =
    | "pending"   // 대기 중
    | "accepted"  // 수락됨
    | "declined"  // 거절됨
    | "canceled"  // 취소됨
    | "expired";  // 만료됨

/** 동행 제안 */
export interface CompanionRequest {
    id: string;
    /** 제안하는 사용자 ID */
    fromUserId: string;
    /** 제안받는 사용자 ID */
    toUserId: string;
    /** 대상 행사 ID */
    eventId: string;
    /** 함께 보려는 슬롯 ID 목록 (타임테이블에서 "같이 볼까요?" 제안 시) */
    slotIds?: string[];
    /** 메시지 (선택) */
    message?: string;
    /** 상태 */
    status: CompanionRequestStatus;
    /** 생성 시각 */
    createdAt: Date;
    /** 응답 시각 (수락/거절 시) */
    respondedAt?: Date;
}

/** 동행 제안 생성 입력 */
export interface CreateCompanionRequestInput {
    toUserId: string;
    eventId: string;
    slotIds?: string[];
    message?: string;
}

/** 동행 제안 알림 데이터 */
export interface CompanionNotificationData {
    requestId: string;
    fromUserNickname: string;
    fromUserAvatar: string;
    eventTitle: string;
    message?: string;
}
