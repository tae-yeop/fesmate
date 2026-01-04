"use client";

import { useState, useEffect, useMemo } from "react";
import {
    X,
    Clock,
    MapPin,
    User,
    Music,
    Calendar,
    Check,
    AlertTriangle,
    Info,
    Loader2,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slot, Stage, OperationalSlot, OperationalSlotType, OPERATIONAL_SLOT_LABELS } from "@/types/event";
import {
    SlotFormState,
    INITIAL_SLOT_FORM_STATE,
    ChangeType,
    CreateSuggestionInput,
    EditPermission,
} from "@/types/timetable-suggestion";

interface SlotEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    editMode: "add" | "edit";
    slotType: "artist" | "operational";
    permission: EditPermission;
    slot?: Slot | OperationalSlot;
    stages?: Stage[];
    eventStartAt?: Date; // 행사 시작 시간 (날짜 범위 제한용)
    eventEndAt?: Date;   // 행사 종료 시간 (날짜 범위 제한용)
    onSubmit: (input: CreateSuggestionInput) => Promise<void>;
    isLoading?: boolean;
}

export function SlotEditModal({
    isOpen,
    onClose,
    eventId,
    editMode,
    slotType,
    permission,
    slot,
    stages = [],
    eventStartAt,
    eventEndAt,
    onSubmit,
    isLoading = false,
}: SlotEditModalProps) {
    const [formState, setFormState] = useState<SlotFormState>(INITIAL_SLOT_FORM_STATE);
    const [reason, setReason] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // 모달 열릴 때 폼 초기화
    useEffect(() => {
        if (isOpen && slot && editMode === "edit") {
            // 기존 슬롯 데이터로 폼 초기화
            if (slotType === "artist") {
                const artistSlot = slot as Slot;
                setFormState({
                    ...INITIAL_SLOT_FORM_STATE,
                    title: artistSlot.title || "",
                    startAt: formatDateTimeLocal(artistSlot.startAt),
                    endAt: formatDateTimeLocal(artistSlot.endAt),
                    artistId: artistSlot.artistId || "",
                    artistName: artistSlot.artist?.name || artistSlot.title || "",
                    stageId: artistSlot.stage || "",
                    day: artistSlot.day || 1,
                });
            } else {
                const opSlot = slot as OperationalSlot;
                setFormState({
                    ...INITIAL_SLOT_FORM_STATE,
                    title: opSlot.title || "",
                    startAt: formatDateTimeLocal(opSlot.startAt),
                    endAt: opSlot.endAt ? formatDateTimeLocal(opSlot.endAt) : "",
                    operationType: opSlot.type,
                    location: opSlot.location || "",
                    description: opSlot.description || "",
                    isHighlight: opSlot.isHighlight || false,
                });
            }
            setReason("");
        } else if (isOpen && editMode === "add") {
            setFormState(INITIAL_SLOT_FORM_STATE);
            setReason("");
        }
    }, [isOpen, slot, editMode, slotType]);

    // datetime-local 포맷 변환
    const formatDateTimeLocal = (date: Date): string => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // 행사 날짜 범위 (min/max)
    const minDateTime = useMemo(() => {
        if (eventStartAt) {
            return formatDateTimeLocal(new Date(eventStartAt));
        }
        return undefined;
    }, [eventStartAt]);

    const maxDateTime = useMemo(() => {
        if (eventEndAt) {
            return formatDateTimeLocal(new Date(eventEndAt));
        }
        return undefined;
    }, [eventEndAt]);

    // 기본 시작 시간 (행사 시작 시간으로 설정)
    const defaultStartTime = useMemo(() => {
        if (eventStartAt) {
            return formatDateTimeLocal(new Date(eventStartAt));
        }
        return "";
    }, [eventStartAt]);

    // 모달 열릴 때 기본값 설정 (add 모드에서 행사 시작 시간으로)
    useEffect(() => {
        if (isOpen && editMode === "add" && !slot && defaultStartTime) {
            setFormState(prev => ({
                ...prev,
                startAt: defaultStartTime,
            }));
        }
    }, [isOpen, editMode, slot, defaultStartTime]);

    // 폼 필드 업데이트
    const updateField = <K extends keyof SlotFormState>(
        key: K,
        value: SlotFormState[K]
    ) => {
        setFormState((prev) => ({ ...prev, [key]: value }));
    };

    // 폼 유효성 검사
    const isFormValid = useMemo(() => {
        if (!formState.startAt) return false;

        if (slotType === "artist") {
            return formState.artistName.trim() !== "" || formState.title.trim() !== "";
        } else {
            return formState.operationType !== "";
        }
    }, [formState, slotType]);

    // 제출 핸들러
    const handleSubmit = async () => {
        if (!isFormValid) return;

        const changeType: ChangeType = editMode === "add"
            ? (slotType === "artist" ? "add_slot" : "add_operational")
            : (slotType === "artist" ? "edit_slot" : "edit_operational");

        // 변경 데이터 구성
        const afterData: Partial<Slot | OperationalSlot> = {
            startAt: new Date(formState.startAt),
            endAt: formState.endAt ? new Date(formState.endAt) : undefined,
        };

        if (slotType === "artist") {
            Object.assign(afterData, {
                title: formState.title || formState.artistName,
                artistId: formState.artistId || undefined,
                artist: formState.artistName ? { id: "", name: formState.artistName } : undefined,
                stage: formState.stageId || undefined,
                day: formState.day,
            });
        } else {
            Object.assign(afterData, {
                type: formState.operationType as OperationalSlotType,
                title: formState.title || undefined,
                location: formState.location || undefined,
                description: formState.description || undefined,
                isHighlight: formState.isHighlight,
            });
        }

        const input: CreateSuggestionInput = {
            eventId,
            changeType,
            targetId: editMode === "edit" ? slot?.id : undefined,
            beforeData: editMode === "edit" && slot ? { ...slot } : undefined,
            afterData,
            reason: reason.trim() || undefined,
        };

        await onSubmit(input);
        onClose();
    };

    // 삭제 핸들러
    const handleDelete = async () => {
        if (!slot) return;

        const changeType: ChangeType = slotType === "artist" ? "delete_slot" : "delete_operational";

        const input: CreateSuggestionInput = {
            eventId,
            changeType,
            targetId: slot.id,
            beforeData: { ...slot },
            afterData: {},
            reason: reason.trim() || undefined,
        };

        await onSubmit(input);
        setShowDeleteConfirm(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl max-w-md w-[95%] max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="font-bold text-lg">
                            {editMode === "add" ? "슬롯 추가" : "슬롯 수정"}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {permission === "immediate"
                                ? "즉시 반영됩니다"
                                : "등록자의 승인 후 반영됩니다"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 폼 내용 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* 아티스트 슬롯 */}
                    {slotType === "artist" && (
                        <>
                            {/* 아티스트/제목 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    아티스트/제목 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={formState.artistName || formState.title}
                                        onChange={(e) => {
                                            updateField("artistName", e.target.value);
                                            updateField("title", e.target.value);
                                        }}
                                        placeholder="예: 잔나비, 실리카겔"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    />
                                </div>
                            </div>

                            {/* 스테이지 */}
                            {stages.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">
                                        스테이지
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <select
                                            value={formState.stageId}
                                            onChange={(e) => updateField("stageId", e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none"
                                        >
                                            <option value="">스테이지 선택</option>
                                            {stages.map((stage) => (
                                                <option key={stage.id} value={stage.name}>
                                                    {stage.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Day */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    Day
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={formState.day}
                                        onChange={(e) => updateField("day", parseInt(e.target.value) || 1)}
                                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* 운영 슬롯 */}
                    {slotType === "operational" && (
                        <>
                            {/* 운영 유형 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    유형 <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(OPERATIONAL_SLOT_LABELS).map(([type, { label, icon }]) => (
                                        <button
                                            key={type}
                                            onClick={() => updateField("operationType", type)}
                                            className={cn(
                                                "px-2 py-2 rounded-lg border text-xs flex flex-col items-center gap-1 transition-colors",
                                                formState.operationType === type
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "hover:bg-muted"
                                            )}
                                        >
                                            <span className="text-lg">{icon}</span>
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 커스텀 제목 */}
                            {formState.operationType === "custom" && (
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">
                                        제목 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.title}
                                        onChange={(e) => updateField("title", e.target.value)}
                                        placeholder="예: VIP 라운지 오픈"
                                        className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    />
                                </div>
                            )}

                            {/* 위치 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    위치
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={formState.location}
                                        onChange={(e) => updateField("location", e.target.value)}
                                        placeholder="예: 1층 로비, A게이트"
                                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    />
                                </div>
                            </div>

                            {/* 설명 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    설명
                                </label>
                                <textarea
                                    value={formState.description}
                                    onChange={(e) => updateField("description", e.target.value)}
                                    placeholder="추가 정보를 입력하세요"
                                    rows={2}
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                                />
                            </div>

                            {/* 하이라이트 */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => updateField("isHighlight", !formState.isHighlight)}
                                    className={cn(
                                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                        formState.isHighlight
                                            ? "bg-primary border-primary"
                                            : "border-muted-foreground/30"
                                    )}
                                >
                                    {formState.isHighlight && (
                                        <Check className="h-3 w-3 text-white" />
                                    )}
                                </button>
                                <span className="text-sm">중요 일정으로 표시</span>
                            </div>
                        </>
                    )}

                    {/* 시간 (공통) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">
                                시작 시간 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="datetime-local"
                                    value={formState.startAt}
                                    onChange={(e) => updateField("startAt", e.target.value)}
                                    min={minDateTime}
                                    max={maxDateTime}
                                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">
                                종료 시간
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="datetime-local"
                                    value={formState.endAt}
                                    onChange={(e) => updateField("endAt", e.target.value)}
                                    min={minDateTime}
                                    max={maxDateTime}
                                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 행사 날짜 범위 안내 */}
                    {(minDateTime || maxDateTime) && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                            <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                                행사 기간: {minDateTime?.replace("T", " ").slice(0, 16)} ~ {maxDateTime?.replace("T", " ").slice(0, 16)}
                            </span>
                        </div>
                    )}

                    {/* 변경 이유 (제안 모드) */}
                    {permission === "suggest" && (
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">
                                변경 이유 (선택)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="등록자에게 전달할 메시지"
                                rows={2}
                                className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                            />
                        </div>
                    )}

                    {/* 안내 문구 */}
                    <div className={cn(
                        "flex items-start gap-2 p-3 rounded-lg text-xs",
                        permission === "immediate"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                    )}>
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                            {permission === "immediate"
                                ? "등록자로서 변경사항이 즉시 반영됩니다."
                                : "제안이 등록자에게 전송되며, 승인 후 반영됩니다."}
                        </span>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t flex gap-2 shrink-0">
                    {/* 삭제 버튼 (수정 모드에서만) */}
                    {editMode === "edit" && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isLoading}
                            className="px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5"
                        >
                            <Trash2 className="h-4 w-4" />
                            삭제
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                    >
                        취소
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isLoading}
                        className={cn(
                            "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                            isFormValid && !isLoading
                                ? "bg-primary text-white hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                처리 중...
                            </>
                        ) : permission === "immediate" ? (
                            <>
                                <Check className="h-4 w-4" />
                                {editMode === "add" ? "추가" : "수정"}
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                제안하기
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 삭제 확인 모달 */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-sm w-[90%] p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="h-7 w-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">슬롯 삭제</h3>
                            <p className="text-sm text-muted-foreground">
                                {permission === "immediate"
                                    ? "이 슬롯을 삭제하시겠습니까?"
                                    : "이 슬롯의 삭제를 제안하시겠습니까?"}
                            </p>
                        </div>

                        {/* 삭제 이유 (제안 모드) */}
                        {permission === "suggest" && (
                            <div className="mb-4">
                                <label className="text-sm font-medium mb-1.5 block">
                                    삭제 이유 (선택)
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="등록자에게 전달할 메시지"
                                    rows={2}
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                                />
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isLoading}
                                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                {permission === "immediate" ? "삭제" : "삭제 제안"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
