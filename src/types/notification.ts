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
    | "event_cancelled"           // 행사 취소
    // 참여 관련 (Phase 3)
    | "participation_reminder_1d" // 활동 24시간 전 리마인더
    | "participation_reminder_1h" // 활동 1시간 전 리마인더
    | "participation_accepted"    // 참여 신청 수락됨
    | "participation_declined"    // 참여 신청 거절됨
    | "participation_canceled"    // 활동 취소됨 (글 작성자가)
    | "participation_changed";    // 일정/장소 변경됨

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

    // 중복 방지 키 (같은 키가 있으면 알림 통합)
    dedupeKey?: string;
    // 통합된 알림 수 (dedupeKey로 묶인 경우)
    groupCount?: number;

    // Quiet Hours 중 보류되었는지 여부
    deferredFromQuietHours?: boolean;

    // 메타
    createdAt: Date;
}

/** Quiet Hours 설정 (밤 22:00 ~ 아침 08:00) */
export const QUIET_HOURS = {
    start: 22, // 22:00
    end: 8,    // 08:00
} as const;

/** 현재 시간이 Quiet Hours인지 확인 */
export function isQuietHours(date: Date = new Date()): boolean {
    const hour = date.getHours();
    // 22:00 ~ 23:59 또는 00:00 ~ 07:59
    return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
}

/** Quiet Hours 제외되는 알림 타입 (긴급 알림) */
export const URGENT_NOTIFICATION_TYPES: NotificationType[] = [
    "event_cancelled",
    "event_time_changed",
    "participation_canceled",
    "participation_reminder_1h", // 1시간 전 알림은 Quiet Hours 무시
];

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
    // 참여 관련 알림 (Phase 3)
    participation_reminder_1d: {
        icon: "CalendarClock",
        color: "text-blue-600 bg-blue-100",
        label: "활동 임박",
    },
    participation_reminder_1h: {
        icon: "AlarmClock",
        color: "text-orange-600 bg-orange-100",
        label: "곧 시작",
    },
    participation_accepted: {
        icon: "CheckCircle",
        color: "text-green-600 bg-green-100",
        label: "수락됨",
    },
    participation_declined: {
        icon: "XCircle",
        color: "text-gray-600 bg-gray-100",
        label: "거절됨",
    },
    participation_canceled: {
        icon: "Ban",
        color: "text-red-600 bg-red-100",
        label: "취소됨",
    },
    participation_changed: {
        icon: "RefreshCw",
        color: "text-amber-600 bg-amber-100",
        label: "변경됨",
    },
};
