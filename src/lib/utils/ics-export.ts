/**
 * ICS 캘린더 내보내기 유틸리티
 * - 나만의 타임테이블을 .ics 파일로 내보내기
 * - Google Calendar, Apple Calendar, Outlook 등에서 가져오기 가능
 */

import { Slot, Event } from "@/types/event";
import { SlotMark, CustomEvent, SLOT_MARK_PRESETS } from "@/types/my-timetable";

interface ICSEvent {
    uid: string;
    title: string;
    description?: string;
    location?: string;
    startAt: Date;
    endAt: Date;
    category?: string;
}

/**
 * 날짜를 ICS 형식 (YYYYMMDDTHHmmss)으로 변환
 */
function formatICSDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * 현재 UTC 타임스탬프 생성
 */
function getICSTimestamp(): string {
    const now = new Date();
    return formatICSDate(now) + "Z";
}

/**
 * 텍스트를 ICS 호환 형식으로 이스케이프
 */
function escapeICSText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
}

/**
 * 긴 줄을 ICS 표준에 맞게 75자로 분할 (폴딩)
 */
function foldLine(line: string): string {
    const maxLength = 75;
    if (line.length <= maxLength) return line;

    const lines: string[] = [];
    let remaining = line;
    let isFirst = true;

    while (remaining.length > 0) {
        const len = isFirst ? maxLength : maxLength - 1;
        lines.push((isFirst ? "" : " ") + remaining.substring(0, len));
        remaining = remaining.substring(len);
        isFirst = false;
    }

    return lines.join("\r\n");
}

/**
 * 단일 VEVENT 블록 생성
 */
function createVEvent(event: ICSEvent): string {
    const lines: string[] = [
        "BEGIN:VEVENT",
        `UID:${event.uid}`,
        `DTSTAMP:${getICSTimestamp()}`,
        `DTSTART:${formatICSDate(event.startAt)}`,
        `DTEND:${formatICSDate(event.endAt)}`,
        `SUMMARY:${escapeICSText(event.title)}`,
    ];

    if (event.description) {
        lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
    }

    if (event.location) {
        lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }

    if (event.category) {
        lines.push(`CATEGORIES:${escapeICSText(event.category)}`);
    }

    lines.push("END:VEVENT");

    return lines.map(foldLine).join("\r\n");
}

/**
 * 마킹된 슬롯과 커스텀 이벤트를 ICS 형식으로 변환
 */
export function generateICS(
    event: Event,
    slots: Slot[],
    slotMarks: SlotMark[],
    customEvents: CustomEvent[]
): string {
    const icsEvents: ICSEvent[] = [];

    // 마킹된 슬롯 → ICS 이벤트
    slotMarks.forEach(mark => {
        const slot = slots.find(s => s.id === mark.slotId);
        if (!slot) return;

        const markPreset = SLOT_MARK_PRESETS[mark.type];
        const markLabel = markPreset?.label || mark.type;

        // "스킵"은 내보내기에서 제외
        if (mark.type === "skip") return;

        const title = mark.type === "watch"
            ? slot.title || slot.artist?.name || "공연"
            : `[${markLabel}] ${slot.title || slot.artist?.name || ""}`;

        const description = [
            `행사: ${event.title}`,
            slot.stage ? `스테이지: ${slot.stage}` : null,
            mark.memo ? `메모: ${mark.memo}` : null,
            `표시: ${markLabel}`,
        ].filter(Boolean).join("\\n");

        icsEvents.push({
            uid: `${mark.slotId}@fesmate.app`,
            title,
            description,
            location: event.venue?.name,
            startAt: new Date(slot.startAt),
            endAt: new Date(slot.endAt),
            category: mark.type === "watch" ? "공연" : markLabel,
        });
    });

    // 커스텀 이벤트 → ICS 이벤트
    customEvents.forEach(customEvent => {
        const description = [
            `행사: ${event.title}`,
            customEvent.memo ? `메모: ${customEvent.memo}` : null,
        ].filter(Boolean).join("\\n");

        icsEvents.push({
            uid: `${customEvent.id}@fesmate.app`,
            title: customEvent.title,
            description,
            location: event.venue?.name,
            startAt: new Date(customEvent.startAt),
            endAt: new Date(customEvent.endAt),
            category: customEvent.type,
        });
    });

    // 시간순 정렬
    icsEvents.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    // ICS 파일 생성
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FesMate//나만의 타임테이블//KO",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeICSText(event.title)} - 나만의 타임테이블`,
        ...icsEvents.map(createVEvent),
        "END:VCALENDAR",
    ].join("\r\n");

    return icsContent;
}

/**
 * ICS 파일 다운로드
 */
export function downloadICS(
    event: Event,
    slots: Slot[],
    slotMarks: SlotMark[],
    customEvents: CustomEvent[]
): void {
    const icsContent = generateICS(event, slots, slotMarks, customEvents);

    // Blob 생성
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });

    // 다운로드 링크 생성
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // 파일명: "행사명_타임테이블.ics"
    const fileName = `${event.title.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_타임테이블.ics`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // URL 해제
    URL.revokeObjectURL(url);
}

/**
 * 내보내기 요약 정보 생성
 */
export function getExportSummary(
    slotMarks: SlotMark[],
    customEvents: CustomEvent[]
): {
    totalCount: number;
    watchCount: number;
    mealCount: number;
    restCount: number;
    moveCount: number;
    customCount: number;
} {
    const nonSkipMarks = slotMarks.filter(m => m.type !== "skip");

    return {
        totalCount: nonSkipMarks.length + customEvents.length,
        watchCount: slotMarks.filter(m => m.type === "watch").length,
        mealCount: slotMarks.filter(m => m.type === "meal").length,
        restCount: slotMarks.filter(m => m.type === "rest").length,
        moveCount: slotMarks.filter(m => m.type === "move").length,
        customCount: customEvents.length,
    };
}
