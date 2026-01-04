"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Send, X, Check, MessageSquare } from "lucide-react";
import {
    CallGuideSuggestion as Suggestion,
    SuggestionChange,
    SUGGESTION_STATUS_CONFIG,
    SUGGESTION_TYPE_CONFIG,
    SuggestionType,
} from "@/types/call-guide-suggestion";
import { CallGuideEntry, CallType, CALL_TYPE_CONFIG } from "@/types/call-guide";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils/date-format";
import { MOCK_USER_PROFILES } from "@/lib/mock-user-profiles";

interface SuggestionFormProps {
    /** 현재 엔트리 (수정/삭제 시) */
    entry?: CallGuideEntry;
    /** 제안 타입 */
    type: SuggestionType;
    /** 제출 핸들러 */
    onSubmit: (change: SuggestionChange, description: string) => void;
    /** 취소 핸들러 */
    onCancel: () => void;
}

/**
 * 수정 제안 폼
 */
export function SuggestionForm({ entry, type, onSubmit, onCancel }: SuggestionFormProps) {
    const [description, setDescription] = useState("");
    const [startTime, setStartTime] = useState(entry?.startTime.toString() || "0");
    const [endTime, setEndTime] = useState(entry?.endTime?.toString() || "");
    const [callType, setCallType] = useState<CallType>(entry?.type || "sing");
    const [text, setText] = useState(entry?.text || "");
    const [instruction, setInstruction] = useState(entry?.instruction || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!description.trim()) {
            alert("변경 이유를 입력해주세요.");
            return;
        }

        const change: SuggestionChange = {
            type,
            entryId: entry?.id,
            oldEntry: entry,
        };

        if (type !== "delete") {
            change.newEntry = {
                startTime: parseFloat(startTime) || 0,
                endTime: endTime ? parseFloat(endTime) : undefined,
                type: callType,
                text: text.trim(),
                instruction: instruction.trim() || undefined,
            };
        }

        onSubmit(change, description.trim());
    };

    const typeConfig = CALL_TYPE_CONFIG[callType];

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
                {type === "add" && <Plus className="h-4 w-4 text-green-600" />}
                {type === "edit" && <Pencil className="h-4 w-4 text-blue-600" />}
                {type === "delete" && <Trash2 className="h-4 w-4 text-red-600" />}
                <span className="font-medium text-sm">
                    {SUGGESTION_TYPE_CONFIG[type].label} 제안
                </span>
            </div>

            {type !== "delete" && (
                <div className="space-y-3 mb-4">
                    {/* 시간 입력 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">시작 시간 (초)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">종료 시간 (초, 선택)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* 타입 선택 */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">콜 타입</label>
                        <select
                            value={callType}
                            onChange={(e) => setCallType(e.target.value as CallType)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {Object.entries(CALL_TYPE_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>
                                    {config.icon} {config.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 텍스트 입력 */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">텍스트</label>
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={typeConfig.examples[0] || "콜 텍스트 입력"}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    {/* 설명 입력 (허용되는 타입만) */}
                    {typeConfig.allowInstruction && (
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">동작 설명 (선택)</label>
                            <input
                                type="text"
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                placeholder="예: 양손 들고 좌우로"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 기존 엔트리 표시 (삭제 시) */}
            {type === "delete" && entry && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600 mb-1">삭제할 엔트리:</p>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-gray-500">
                            {Math.floor(entry.startTime / 60)}:{String(Math.floor(entry.startTime % 60)).padStart(2, "0")}
                        </span>
                        <span className={cn("px-1 rounded text-xs", CALL_TYPE_CONFIG[entry.type]?.color)}>
                            {entry.type}
                        </span>
                        <span className="text-gray-700">{entry.text}</span>
                    </div>
                </div>
            )}

            {/* 변경 이유 */}
            <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">
                    변경 이유 <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="왜 이 변경이 필요한지 설명해주세요"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={2}
                    required
                />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
                <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                    <Send className="h-4 w-4" />
                    제안하기
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                    취소
                </button>
            </div>
        </form>
    );
}

interface SuggestionCardProps {
    suggestion: Suggestion;
    /** 현재 사용자가 검토 권한이 있는지 */
    canReview?: boolean;
    /** 승인 핸들러 */
    onApprove?: () => void;
    /** 거절 핸들러 */
    onReject?: (reason: string) => void;
}

/**
 * 수정 제안 카드
 */
export function SuggestionCard({
    suggestion,
    canReview = false,
    onApprove,
    onReject,
}: SuggestionCardProps) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const statusConfig = SUGGESTION_STATUS_CONFIG[suggestion.status];
    const typeConfig = SUGGESTION_TYPE_CONFIG[suggestion.type];

    const user = MOCK_USER_PROFILES.find((u) => u.id === suggestion.suggestedBy);

    const handleReject = () => {
        if (!rejectReason.trim()) {
            alert("거절 사유를 입력해주세요.");
            return;
        }
        onReject?.(rejectReason.trim());
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusConfig.bgColor, statusConfig.color)}>
                        {statusConfig.label}
                    </span>
                    <span className={cn("flex items-center gap-1 text-xs", typeConfig.color)}>
                        {suggestion.type === "add" && <Plus className="h-3 w-3" />}
                        {suggestion.type === "edit" && <Pencil className="h-3 w-3" />}
                        {suggestion.type === "delete" && <Trash2 className="h-3 w-3" />}
                        {typeConfig.label}
                    </span>
                </div>
                <span className="text-xs text-gray-500">
                    {getRelativeTime(suggestion.createdAt)}
                </span>
            </div>

            {/* 제안자 정보 */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {user?.avatar || "👤"}
                </div>
                <span className="text-sm text-gray-700">{user?.nickname || "알 수 없음"}</span>
            </div>

            {/* 설명 */}
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-700">{suggestion.description}</p>
                </div>
            </div>

            {/* 변경 내역 */}
            <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">변경 내역:</p>
                <div className="space-y-2">
                    {suggestion.changes.map((change, i) => (
                        <SuggestionChangePreview key={i} change={change} />
                    ))}
                </div>
            </div>

            {/* 거절 사유 (거절된 경우) */}
            {suggestion.status === "rejected" && suggestion.rejectReason && (
                <div className="mb-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600 mb-1">거절 사유:</p>
                    <p className="text-sm text-red-700">{suggestion.rejectReason}</p>
                </div>
            )}

            {/* 검토 버튼 */}
            {canReview && suggestion.status === "pending" && (
                <div className="pt-3 border-t border-gray-100">
                    {!showRejectForm ? (
                        <div className="flex gap-2">
                            <button
                                onClick={onApprove}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                            >
                                <Check className="h-4 w-4" />
                                승인
                            </button>
                            <button
                                onClick={() => setShowRejectForm(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                                <X className="h-4 w-4" />
                                거절
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="거절 사유를 입력해주세요"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleReject}
                                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                >
                                    거절 확인
                                </button>
                                <button
                                    onClick={() => setShowRejectForm(false)}
                                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SuggestionChangePreview({ change }: { change: SuggestionChange }) {
    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    if (change.type === "delete" && change.oldEntry) {
        return (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-sm">
                <Trash2 className="h-3 w-3 text-red-500" />
                <span className="font-mono text-gray-500 text-xs">
                    {formatTime(change.oldEntry.startTime)}
                </span>
                <span className="line-through text-red-600">{change.oldEntry.text}</span>
            </div>
        );
    }

    if (change.type === "add" && change.newEntry) {
        return (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm">
                <Plus className="h-3 w-3 text-green-500" />
                <span className="font-mono text-gray-500 text-xs">
                    {formatTime(change.newEntry.startTime)}
                </span>
                <span className="text-green-700">{change.newEntry.text}</span>
            </div>
        );
    }

    if (change.type === "edit" && change.oldEntry && change.newEntry) {
        return (
            <div className="p-2 bg-blue-50 rounded text-sm space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">기존:</span>
                    <span className="font-mono text-gray-500 text-xs">
                        {formatTime(change.oldEntry.startTime)}
                    </span>
                    <span className="line-through text-gray-500">{change.oldEntry.text}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-600">수정:</span>
                    <span className="font-mono text-gray-500 text-xs">
                        {formatTime(change.newEntry.startTime)}
                    </span>
                    <span className="text-blue-700">{change.newEntry.text}</span>
                </div>
            </div>
        );
    }

    return null;
}
