// 알림(Notification) 관련 타입 정의 - PRD v0.5 기준

/** 알림 타입 */
export type NotificationType =
    // 리마인더
    | "ticket_open_reminder"      // 예매 오픈 N분 전
    | "event_start_reminder"      // 행사 시작 N시간 전
    | "slot_start_reminder"       // 보고 싶은 슬롯 N분 전 (P1)
    // 허브 업데이트
    | "official_notice_published" // 새 공식 공지
    | "live_report_trending"      // 도움됨 급상승 제보 (P1)
    | "hub_post_replied"          // 내 허브 글에 댓글
    // 커뮤니티
    | "community_post_replied"    // 내 커뮤니티 글에 댓글
    | "community_post_matched"    // 새 모집글 알림 (P1)
    // 만료/안전
    | "post_expiring_soon"        // 내 모집글 마감 임박
    | "post_expired"              // 내 모집글 마감
    | "report_result"             // 신고 처리 결과 (P2)
    // 시스템
    | "event_time_changed"        // 행사 일정 변경
    | "event_cancelled";          // 행사 취소

/** 알림 인터페이스 */
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;

    // 관련 엔티티
    eventId?: string;
    postId?: string;
    slotId?: string;

    // 내용
    title: string;
    body: string;
    imageUrl?: string;

    // 딥링크
    deepLink?: string;

    // 상태
    isRead: boolean;

    // 메타
    createdAt: Date;
}

/** 알림 타입별 아이콘/색상 매핑 */
export const NOTIFICATION_CONFIG: Record<NotificationType, {
    icon: string;
    color: string;
    label: string;
}> = {
    ticket_open_reminder: {
        icon: "Ticket",
        color: "text-purple-600 bg-purple-100",
        label: "예매 오픈",
    },
    event_start_reminder: {
        icon: "Calendar",
        color: "text-blue-600 bg-blue-100",
        label: "행사 시작",
    },
    slot_start_reminder: {
        icon: "Clock",
        color: "text-cyan-600 bg-cyan-100",
        label: "슬롯 시작",
    },
    official_notice_published: {
        icon: "Megaphone",
        color: "text-yellow-600 bg-yellow-100",
        label: "공식 공지",
    },
    live_report_trending: {
        icon: "TrendingUp",
        color: "text-red-600 bg-red-100",
        label: "실시간 제보",
    },
    hub_post_replied: {
        icon: "MessageCircle",
        color: "text-green-600 bg-green-100",
        label: "댓글",
    },
    community_post_replied: {
        icon: "MessageCircle",
        color: "text-green-600 bg-green-100",
        label: "댓글",
    },
    community_post_matched: {
        icon: "Users",
        color: "text-pink-600 bg-pink-100",
        label: "새 모집",
    },
    post_expiring_soon: {
        icon: "AlertCircle",
        color: "text-amber-600 bg-amber-100",
        label: "마감 임박",
    },
    post_expired: {
        icon: "Clock",
        color: "text-gray-600 bg-gray-100",
        label: "마감",
    },
    report_result: {
        icon: "Shield",
        color: "text-indigo-600 bg-indigo-100",
        label: "신고 결과",
    },
    event_time_changed: {
        icon: "CalendarClock",
        color: "text-orange-600 bg-orange-100",
        label: "일정 변경",
    },
    event_cancelled: {
        icon: "XCircle",
        color: "text-red-600 bg-red-100",
        label: "행사 취소",
    },
};
