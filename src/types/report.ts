// 신고(Report) 및 차단(Block) 관련 타입 정의 - PRD v0.5 기준

/** 신고 사유 */
export type ReportReason =
    | "spam"           // 스팸/광고
    | "scam"           // 사기/피싱
    | "abuse"          // 욕설/비방
    | "hate"           // 혐오 발언
    | "harassment"     // 성희롱
    | "privacy"        // 개인정보 노출
    | "illegal"        // 불법 콘텐츠
    | "other";         // 기타

/** 신고 대상 타입 */
export type ReportTargetType = "post" | "comment" | "user";

/** 신고 처리 상태 */
export type ReportStatus =
    | "received"       // 접수됨
    | "in_review"      // 검토 중
    | "action_taken"   // 조치 완료
    | "no_action";     // 조치 없음

/** 신고 인터페이스 */
export interface Report {
    id: string;
    reporterId: string;      // 신고자 ID
    targetType: ReportTargetType;
    targetId: string;        // 신고 대상 ID (postId, commentId, userId)
    targetUserId: string;    // 신고 대상 작성자/사용자 ID
    reason: ReportReason;
    detail?: string;         // 상세 설명 (선택)
    status: ReportStatus;
    createdAt: Date;
    reviewedAt?: Date;
    reviewNote?: string;     // 관리자 메모
}

/** 차단 인터페이스 */
export interface Block {
    id: string;
    blockerId: string;       // 차단한 사용자 ID
    blockedId: string;       // 차단당한 사용자 ID
    createdAt: Date;
}

/** 신고 사유 라벨 */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
    spam: "스팸/광고",
    scam: "사기/피싱 의심",
    abuse: "욕설/비방",
    hate: "혐오 발언",
    harassment: "성희롱",
    privacy: "개인정보 노출",
    illegal: "불법 콘텐츠",
    other: "기타",
};

/** 신고 사유 설명 */
export const REPORT_REASON_DESCRIPTIONS: Record<ReportReason, string> = {
    spam: "반복적인 홍보, 광고성 게시물",
    scam: "금전 사기, 허위 정보, 피싱 시도",
    abuse: "타인을 향한 욕설, 모욕, 비방",
    hate: "특정 집단에 대한 혐오 표현",
    harassment: "원치 않는 성적 접근, 성희롱",
    privacy: "연락처, 주소 등 개인정보 무단 노출",
    illegal: "저작권 침해, 불법 거래 등",
    other: "위 사유에 해당하지 않는 문제",
};

/** 신고 상태 라벨 */
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
    received: "접수됨",
    in_review: "검토 중",
    action_taken: "조치 완료",
    no_action: "조치 없음",
};
