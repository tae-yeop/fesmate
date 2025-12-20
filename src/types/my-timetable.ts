// 나만의 타임테이블 관련 타입 정의 (PRD 6.2.1)

/** 슬롯 마킹 타입 (슬롯별로 사용자가 지정하는 상태) */
export type SlotMarkType = "watch" | "meal" | "rest" | "move" | "skip";

/** 슬롯 마킹 프리셋 */
export const SLOT_MARK_PRESETS: Record<SlotMarkType, {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    solidBg: string;
    solidText: string;
    borderColor: string;
}> = {
    watch: {
        label: "보기",
        icon: "⭐",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-300",
        solidBg: "bg-yellow-400",
        solidText: "text-yellow-900",
        borderColor: "border-l-yellow-500",
    },
    meal: {
        label: "밥",
        icon: "🍚",
        color: "text-orange-600",
        bgColor: "bg-orange-50 border-orange-300",
        solidBg: "bg-orange-400",
        solidText: "text-orange-900",
        borderColor: "border-l-orange-500",
    },
    rest: {
        label: "휴식",
        icon: "☕",
        color: "text-blue-600",
        bgColor: "bg-blue-50 border-blue-300",
        solidBg: "bg-blue-400",
        solidText: "text-blue-900",
        borderColor: "border-l-blue-500",
    },
    move: {
        label: "이동",
        icon: "🚶",
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-300",
        solidBg: "bg-green-400",
        solidText: "text-green-900",
        borderColor: "border-l-green-500",
    },
    skip: {
        label: "스킵",
        icon: "⏭️",
        color: "text-gray-500",
        bgColor: "bg-gray-100 border-gray-300",
        solidBg: "bg-gray-300",
        solidText: "text-gray-700",
        borderColor: "border-l-gray-400",
    },
};

/** 슬롯 마킹 정보 */
export interface SlotMark {
    slotId: string;
    type: SlotMarkType;
    memo?: string;
}

/** 커스텀 이벤트 타입 (사용자가 추가하는 개인 일정 - 슬롯 사이 빈 시간에) */
export type CustomEventType = "meal" | "rest" | "move" | "meet" | "other";

/** 커스텀 이벤트 프리셋 */
export const CUSTOM_EVENT_PRESETS: Record<CustomEventType, { label: string; icon: string; defaultDuration: number }> = {
    meal: { label: "밥", icon: "🍚", defaultDuration: 60 },
    rest: { label: "휴식", icon: "☕", defaultDuration: 30 },
    move: { label: "이동", icon: "🚶", defaultDuration: 20 },
    meet: { label: "만남", icon: "👋", defaultDuration: 30 },
    other: { label: "기타", icon: "📝", defaultDuration: 30 },
};

/** 커스텀 이벤트 (슬롯 사이 빈 시간에 추가하는 개인 일정) */
export interface CustomEvent {
    id: string;
    eventId: string; // 어떤 행사에 속하는지
    type: CustomEventType;
    title: string;
    startAt: Date;
    endAt: Date;
    memo?: string;
    createdAt: Date;
}

/** 나만의 타임테이블 (행사별) */
export interface MyTimetable {
    eventId: string;
    slotMarks: SlotMark[]; // 슬롯별 마킹 (보기/밥/휴식/이동/스킵)
    customEvents: CustomEvent[]; // 빈 시간에 추가하는 커스텀 이벤트
    updatedAt: Date;
}

/** 하위 호환용 - checkedSlotIds getter */
export function getCheckedSlotIdsFromMarks(marks: SlotMark[]): string[] {
    return marks.filter(m => m.type === "watch").map(m => m.slotId);
}

/** 공유된 타임테이블 (친구가 공유한 것) */
export interface SharedTimetable {
    id: string; // 공유 ID (URL에 사용)
    eventId: string;
    ownerNickname: string;
    ownerId?: string;
    slotMarks: SlotMark[];
    customEvents: CustomEvent[];
    sharedAt: Date;
}

/** 타임테이블 아이템 (슬롯 또는 커스텀 이벤트) - 통합 뷰용 */
export interface TimetableItem {
    id: string;
    type: "slot" | "custom";
    title: string;
    startAt: Date;
    endAt: Date;
    stage?: string;
    slotMarkType?: SlotMarkType; // 슬롯의 마킹 타입 (watch/meal/rest/move/skip)
    customEventType?: CustomEventType;
    memo?: string;
    ownerId?: string; // 오버레이 시 누구의 일정인지
    ownerNickname?: string;
    ownerColor?: string;
}

/** 시간 충돌 정보 */
export interface TimeConflict {
    items: TimetableItem[];
    overlapStart: Date;
    overlapEnd: Date;
}

/**
 * 두 시간 범위가 겹치는지 확인
 */
export function hasTimeOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
): boolean {
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();

    return s1 < e2 && s2 < e1;
}

/**
 * 겹치는 시간 범위 계산
 */
export function getOverlapRange(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
): { start: Date; end: Date } | null {
    const s1 = new Date(start1).getTime();
    const e1 = new Date(end1).getTime();
    const s2 = new Date(start2).getTime();
    const e2 = new Date(end2).getTime();

    if (s1 >= e2 || s2 >= e1) return null;

    return {
        start: new Date(Math.max(s1, s2)),
        end: new Date(Math.min(e1, e2)),
    };
}

/**
 * 타임테이블 아이템 목록에서 충돌 찾기
 */
export function findConflicts(items: TimetableItem[]): TimeConflict[] {
    const conflicts: TimeConflict[] = [];
    const sortedItems = [...items].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    for (let i = 0; i < sortedItems.length; i++) {
        for (let j = i + 1; j < sortedItems.length; j++) {
            const item1 = sortedItems[i];
            const item2 = sortedItems[j];

            // 같은 사람의 일정만 충돌 체크 (오버레이 시 다른 사람 일정은 충돌 아님)
            if (item1.ownerId && item2.ownerId && item1.ownerId !== item2.ownerId) {
                continue;
            }

            const overlap = getOverlapRange(item1.startAt, item1.endAt, item2.startAt, item2.endAt);
            if (overlap) {
                // 이미 있는 충돌에 추가할지 확인
                const existingConflict = conflicts.find(c =>
                    c.items.some(item => item.id === item1.id || item.id === item2.id)
                );

                if (existingConflict) {
                    if (!existingConflict.items.find(item => item.id === item2.id)) {
                        existingConflict.items.push(item2);
                    }
                } else {
                    conflicts.push({
                        items: [item1, item2],
                        overlapStart: overlap.start,
                        overlapEnd: overlap.end,
                    });
                }
            }
        }
    }

    return conflicts;
}

/**
 * 공유 ID 생성 (간단한 랜덤 문자열)
 */
export function generateShareId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
