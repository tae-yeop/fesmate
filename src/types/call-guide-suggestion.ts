/**
 * 콜가이드 수정 제안 타입
 */

import { CallGuideEntry } from "./call-guide";

/** 수정 제안 상태 */
export type SuggestionStatus = "pending" | "approved" | "rejected" | "withdrawn";

/** 수정 제안 타입 */
export type SuggestionType = "add" | "edit" | "delete";

/** 콜가이드 수정 제안 */
export interface CallGuideSuggestion {
    id: string;
    /** 대상 콜가이드 ID */
    callGuideId: string;
    /** 대상 곡 ID */
    songId: string;
    /** 제안자 ID */
    suggestedBy: string;
    /** 제안 타입 */
    type: SuggestionType;
    /** 상태 */
    status: SuggestionStatus;
    /** 제안 설명 */
    description: string;
    /** 변경 내역 */
    changes: SuggestionChange[];
    /** 생성 일시 */
    createdAt: Date;
    /** 검토 일시 */
    reviewedAt?: Date;
    /** 검토자 ID */
    reviewedBy?: string;
    /** 거절 사유 */
    rejectReason?: string;
}

/** 개별 변경 내역 */
export interface SuggestionChange {
    /** 변경 타입 */
    type: SuggestionType;
    /** 수정 대상 엔트리 ID (edit/delete 시) */
    entryId?: string;
    /** 기존 엔트리 (edit/delete 시) */
    oldEntry?: CallGuideEntry;
    /** 새 엔트리 (add/edit 시) */
    newEntry?: Omit<CallGuideEntry, "id">;
}

/** 수정 제안 생성 입력 */
export interface CreateSuggestionInput {
    callGuideId: string;
    songId: string;
    type: SuggestionType;
    description: string;
    changes: SuggestionChange[];
}

/** 수정 제안 검토 입력 */
export interface ReviewSuggestionInput {
    suggestionId: string;
    action: "approve" | "reject";
    rejectReason?: string;
}

/** 수정 제안 상태 설정 */
export const SUGGESTION_STATUS_CONFIG: Record<SuggestionStatus, {
    label: string;
    color: string;
    bgColor: string;
}> = {
    pending: {
        label: "검토 대기",
        color: "text-amber-700",
        bgColor: "bg-amber-100",
    },
    approved: {
        label: "승인됨",
        color: "text-green-700",
        bgColor: "bg-green-100",
    },
    rejected: {
        label: "거절됨",
        color: "text-red-700",
        bgColor: "bg-red-100",
    },
    withdrawn: {
        label: "철회됨",
        color: "text-gray-700",
        bgColor: "bg-gray-100",
    },
};

/** 수정 제안 타입 설정 */
export const SUGGESTION_TYPE_CONFIG: Record<SuggestionType, {
    label: string;
    icon: string;
    color: string;
}> = {
    add: {
        label: "추가",
        icon: "Plus",
        color: "text-green-600",
    },
    edit: {
        label: "수정",
        icon: "Pencil",
        color: "text-blue-600",
    },
    delete: {
        label: "삭제",
        icon: "Trash2",
        color: "text-red-600",
    },
};
