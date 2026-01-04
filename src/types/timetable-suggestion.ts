// 타임테이블 편집 제안 관련 타입 정의 - PRD 6.20

import { Slot, Stage, OperationalSlot } from "./event";

/** 변경 유형 */
export type ChangeType =
    | "add_slot"        // 슬롯 추가
    | "edit_slot"       // 슬롯 수정
    | "delete_slot"     // 슬롯 삭제
    | "add_stage"       // 스테이지 추가
    | "edit_stage"      // 스테이지 수정
    | "delete_stage"    // 스테이지 삭제
    | "add_operational" // 운영 슬롯 추가
    | "edit_operational" // 운영 슬롯 수정
    | "delete_operational"; // 운영 슬롯 삭제

/** 제안 상태 */
export type SuggestionStatus = "pending" | "approved" | "rejected";

/** 편집 권한 */
export type EditPermission = "immediate" | "suggest" | "readonly";

/** 타임테이블 제안 */
export interface TimetableSuggestion {
    id: string;
    eventId: string;
    suggesterId: string;
    suggesterNickname?: string;
    changeType: ChangeType;
    targetId?: string;              // 수정/삭제 대상 ID
    beforeData?: SuggestionData;    // 변경 전 데이터 (수정/삭제 시)
    afterData: SuggestionData;      // 변경 후 데이터
    reason?: string;                // 변경 이유
    status: SuggestionStatus;
    reviewedBy?: string;
    reviewerNickname?: string;
    reviewedAt?: Date;
    rejectReason?: string;          // 반려 사유
    createdAt: Date;
}

/** 제안 데이터 (슬롯 또는 스테이지) */
export type SuggestionData =
    | Partial<Slot>
    | Partial<Stage>
    | Partial<OperationalSlot>;

/** 제안 생성 입력 */
export interface CreateSuggestionInput {
    eventId: string;
    changeType: ChangeType;
    targetId?: string;
    beforeData?: SuggestionData;
    afterData: SuggestionData;
    reason?: string;
}

/** 슬롯 편집 폼 상태 */
export interface SlotFormState {
    // 공통
    title: string;
    startAt: string;        // datetime-local input용
    endAt: string;

    // 아티스트 슬롯 전용
    artistId: string;
    artistName: string;
    stageId: string;
    day: number;

    // 운영 슬롯 전용
    operationType: string;
    location: string;
    description: string;
    isHighlight: boolean;
}

/** 슬롯 편집 폼 초기값 */
export const INITIAL_SLOT_FORM_STATE: SlotFormState = {
    title: "",
    startAt: "",
    endAt: "",
    artistId: "",
    artistName: "",
    stageId: "",
    day: 1,
    operationType: "",
    location: "",
    description: "",
    isHighlight: false,
};

/** 변경 유형 라벨 */
export const CHANGE_TYPE_LABELS: Record<ChangeType, { label: string; icon: string }> = {
    add_slot: { label: "슬롯 추가", icon: "➕" },
    edit_slot: { label: "슬롯 수정", icon: "✏️" },
    delete_slot: { label: "슬롯 삭제", icon: "🗑️" },
    add_stage: { label: "스테이지 추가", icon: "🎪" },
    edit_stage: { label: "스테이지 수정", icon: "✏️" },
    delete_stage: { label: "스테이지 삭제", icon: "🗑️" },
    add_operational: { label: "운영 일정 추가", icon: "📋" },
    edit_operational: { label: "운영 일정 수정", icon: "✏️" },
    delete_operational: { label: "운영 일정 삭제", icon: "🗑️" },
};

/** 제안 상태 라벨 */
export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, { label: string; color: string }> = {
    pending: { label: "검토 중", color: "yellow" },
    approved: { label: "승인됨", color: "green" },
    rejected: { label: "반려됨", color: "red" },
};

/**
 * 편집 권한 결정 함수
 * - 행사 등록자: 즉시 수정 가능
 * - 로그인 사용자: 제안 제출
 * - 비로그인: 읽기만 가능
 */
export function getEditPermission(
    userId: string | undefined,
    registeredBy: string | undefined
): EditPermission {
    if (!userId) return "readonly";
    if (registeredBy && userId === registeredBy) return "immediate";
    return "suggest";
}

/**
 * 제안 요약 텍스트 생성
 */
export function getSuggestionSummary(suggestion: TimetableSuggestion): string {
    const typeLabel = CHANGE_TYPE_LABELS[suggestion.changeType].label;

    // 슬롯/스테이지 이름 추출
    const afterData = suggestion.afterData as Record<string, unknown>;
    const name = (afterData?.title as string) ||
                 (afterData?.name as string) ||
                 (afterData?.artistName as string) ||
                 "항목";

    switch (suggestion.changeType) {
        case "add_slot":
        case "add_stage":
        case "add_operational":
            return `${name} 추가`;
        case "edit_slot":
        case "edit_stage":
        case "edit_operational":
            return `${name} 수정`;
        case "delete_slot":
        case "delete_stage":
        case "delete_operational":
            return `${name} 삭제`;
        default:
            return typeLabel;
    }
}

/**
 * 제안 적용 시 충돌 감지
 * - 같은 슬롯에 대한 중복 제안
 * - 시간 겹침 등
 */
export function detectSuggestionConflict(
    suggestion: TimetableSuggestion,
    existingSuggestions: TimetableSuggestion[]
): TimetableSuggestion | null {
    // 같은 대상에 대한 pending 제안이 있는지 확인
    if (suggestion.targetId) {
        const conflict = existingSuggestions.find(
            (s) =>
                s.id !== suggestion.id &&
                s.targetId === suggestion.targetId &&
                s.status === "pending" &&
                s.eventId === suggestion.eventId
        );
        return conflict || null;
    }

    return null;
}
