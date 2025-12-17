// 사용자(User) 관련 타입 정의 - PRD v0.5 기준

/** 사용자 권한 */
export type UserRole = "USER" | "ADMIN";

/** 사용자 프로필 */
export interface User {
    id: string;

    // 필수
    nickname: string;
    role: UserRole;

    // 선택
    profileImage?: string;
    bio?: string;

    // OAuth 정보
    provider?: "kakao" | "naver" | "google";
    providerId?: string;
    email?: string;

    // 메타
    createdAt: Date;
    updatedAt: Date;
}

/** 사용자-행사 관계 (찜/다녀옴) */
export interface UserEvent {
    userId: string;
    eventId: string;

    /** ⭐ 찜 (Wishlist): 관심/예매 예정 */
    isWishlist: boolean;

    /** ✅ 다녀옴 (Attended): 관람 완료 */
    isAttended: boolean;

    createdAt: Date;
    updatedAt: Date;
}

/** 사용자-슬롯 관계 (보고 싶은 슬롯 체크) */
export interface UserSlot {
    userId: string;
    slotId: string;

    /** ⭐ 보고 싶은 슬롯 체크 */
    isChecked: boolean;

    createdAt: Date;
}

/** 사용자-아티스트 관계 (팔로우) */
export interface UserArtist {
    userId: string;
    artistId: string;

    isFollowing: boolean;

    createdAt: Date;
}

/** 차단 관계 */
export interface UserBlock {
    blockerId: string;  // 차단한 사용자
    blockedId: string;  // 차단당한 사용자

    createdAt: Date;
}

/** 알림 이벤트 타입 */
export type NotificationType =
    // 리마인더
    | "ticket_open_reminder"    // 예매 오픈 리마인더
    | "event_start_reminder"    // 행사 시작 리마인더
    | "slot_start_reminder"     // 슬롯 시작 리마인더 (P1)

    // 허브 업데이트
    | "official_notice_published"   // 새 공식 공지
    | "live_report_trending"        // 트렌딩 제보 (P1)
    | "hub_post_replied"            // 내 허브 글에 댓글

    // 커뮤니티
    | "community_post_replied"      // 내 커뮤니티 글에 댓글
    | "community_post_matched"      // 새 모집글 매칭 (P1)

    // 만료/안전
    | "post_expiring_soon"          // 내 글 곧 만료
    | "post_expired"                // 내 글 만료됨
    | "report_result"               // 신고 처리 결과 (P2)

    // 시스템
    | "event_time_changed"          // 행사 일정 변경
    | "event_cancelled";            // 행사 취소

/** 알림 */
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;

    // 대상
    eventId?: string;
    postId?: string;
    commentId?: string;
    slotId?: string;

    // 표시용
    title: string;
    body: string;
    deepLink?: string;

    // 상태
    isRead: boolean;

    // 제어
    dedupeKey?: string;
    priority?: "normal" | "high";
    channels?: ("inapp" | "push")[];

    createdAt: Date;
}

/** 신고 사유 */
export type ReportReason =
    | "spam"            // 스팸/광고
    | "fraud"           // 사기/거래 유도
    | "abuse"           // 욕설/혐오
    | "harassment"      // 성희롱
    | "privacy"         // 개인정보 노출
    | "illegal"         // 불법/위험 행위
    | "other";          // 기타

/** 신고 처리 상태 */
export type ReportStatus =
    | "RECEIVED"        // 접수됨
    | "IN_REVIEW"       // 검토 중
    | "ACTION_TAKEN"    // 조치 완료
    | "NO_ACTION";      // 조치 없음

/** 신고 */
export interface Report {
    id: string;
    reporterId: string;

    // 대상 (글 또는 댓글)
    postId?: string;
    commentId?: string;
    targetUserId: string;

    reason: ReportReason;
    description?: string;

    status: ReportStatus;

    createdAt: Date;
    updatedAt: Date;
}
