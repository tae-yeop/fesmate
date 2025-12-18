/**
 * 날짜 포맷 유틸리티 - 한국어 기준
 */

/** 날짜+시간 전체 표시 (예: 2024년 12월 25일 (수) 오후 7:00) */
export function formatDateTime(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(date));
}

/** 날짜만 표시 (예: 2024년 12월 25일 (수)) */
export function formatDate(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    }).format(new Date(date));
}

/** 짧은 날짜 표시 (예: 12월 25일 (수)) */
export function formatShortDate(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
    }).format(new Date(date));
}

/** 시간만 표시 (예: 오후 7:00) */
export function formatTime(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(date));
}

/** 상대 시간 표시 (예: 방금 전, 5분 전, 3시간 전) */
export function getRelativeTime(date: Date) {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;

    return new Intl.DateTimeFormat("ko-KR", {
        month: "short",
        day: "numeric"
    }).format(new Date(date));
}

/** D-Day 계산 (예: D-Day, D-3, D+5) */
export function getDday(date: Date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diff = target.getTime() - now.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "D-Day";
    if (days > 0) return `D-${days}`;
    return `D+${Math.abs(days)}`;
}
