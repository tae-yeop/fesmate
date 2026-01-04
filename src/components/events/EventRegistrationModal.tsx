"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Calendar,
    MapPin,
    Music,
    Check,
    Plus,
    AlertTriangle,
    Ticket,
    Link as LinkIcon,
    Info,
    Loader2,
    Download,
    CheckCircle2,
} from "lucide-react";
import { ImportUrlResponse, SITE_LABELS, ExtractConfidence } from "@/types/crawl";
import { cn } from "@/lib/utils";
import { useEventRegistration } from "@/lib/event-registration-context";
import { ImageUploader } from "@/components/image/ImageUploader";
import {
    EventRegistrationStep,
    EventRegistrationFormState,
    INITIAL_FORM_STATE,
    EVENT_TYPE_LABELS,
    CreateEventInput,
    SimilarEventMatch,
} from "@/types/event-registration";
import { EventType, TicketLink } from "@/types/event";
import { UploadedImage } from "@/types/image";

interface EventRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (eventId: string) => void;
}

const STEPS: { key: EventRegistrationStep; label: string; icon: React.ReactNode }[] = [
    { key: "basic", label: "기본 정보", icon: <Calendar className="h-4 w-4" /> },
    { key: "venue", label: "장소 & 상세", icon: <MapPin className="h-4 w-4" /> },
    { key: "artists", label: "출연진", icon: <Music className="h-4 w-4" /> },
    { key: "confirm", label: "확인", icon: <Check className="h-4 w-4" /> },
];

export function EventRegistrationModal({
    isOpen,
    onClose,
    onSuccess,
}: EventRegistrationModalProps) {
    const { registerEvent, findSimilarEvents, isLoading } = useEventRegistration();

    const [currentStep, setCurrentStep] = useState<EventRegistrationStep>("basic");
    const [formState, setFormState] = useState<EventRegistrationFormState>(INITIAL_FORM_STATE);
    const [posterImages, setPosterImages] = useState<UploadedImage[]>([]);
    const [artistInput, setArtistInput] = useState("");
    const [similarEvents, setSimilarEvents] = useState<SimilarEventMatch[]>([]);

    // URL Import 상태
    const [importUrl, setImportUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState<{
        sourceSite: string;
        confidence: ExtractConfidence;
    } | null>(null);

    // 스텝 인덱스
    const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

    // 폼 리셋
    useEffect(() => {
        if (isOpen) {
            setCurrentStep("basic");
            setFormState(INITIAL_FORM_STATE);
            setPosterImages([]);
            setArtistInput("");
            setSimilarEvents([]);
            setImportUrl("");
            setImportError(null);
            setImportSuccess(null);
        }
    }, [isOpen]);

    // datetime-local 형식으로 변환
    const formatDateTimeLocal = useCallback((date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }, []);

    // URL Import 핸들러
    const handleImportUrl = useCallback(async () => {
        if (!importUrl.trim()) return;

        setIsImporting(true);
        setImportError(null);
        setImportSuccess(null);

        try {
            const response = await fetch("/api/import-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: importUrl.trim() }),
            });

            const result: ImportUrlResponse = await response.json();

            if (result.success && result.data) {
                const { prefillData, sourceSite, confidence } = result.data;

                // 폼에 데이터 채우기
                setFormState((prev) => ({
                    ...prev,
                    title: prefillData.title || prev.title,
                    startAt: prefillData.startAt
                        ? formatDateTimeLocal(new Date(prefillData.startAt))
                        : prev.startAt,
                    endAt: prefillData.endAt
                        ? formatDateTimeLocal(new Date(prefillData.endAt))
                        : prev.endAt,
                    eventType: prefillData.eventType || prev.eventType,
                    venueName: prefillData.venueName || prev.venueName,
                    venueAddress: prefillData.venueAddress || prev.venueAddress,
                    posterUrl: prefillData.posterUrl || prev.posterUrl,
                    price: prefillData.price || prev.price,
                    ticketLinks: prefillData.ticketLinks || prev.ticketLinks,
                    artists: prefillData.artists || prev.artists,
                    description: prefillData.description || prev.description,
                    officialUrl: prefillData.officialUrl || prev.officialUrl,
                }));

                setImportSuccess({
                    sourceSite: SITE_LABELS[sourceSite] || sourceSite,
                    confidence,
                });
            } else {
                setImportError(result.error?.message || "알 수 없는 오류가 발생했습니다.");
            }
        } catch (error) {
            setImportError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsImporting(false);
        }
    }, [importUrl, formatDateTimeLocal]);

    // 유사 행사 검색 (확인 단계 진입 시)
    useEffect(() => {
        if (currentStep === "confirm") {
            const input: Partial<CreateEventInput> = {
                title: formState.title,
                startAt: formState.startAt ? new Date(formState.startAt) : undefined,
                venueName: formState.venueName,
                artists: formState.artists.length > 0 ? formState.artists : undefined,
            };
            const matches = findSimilarEvents(input);
            setSimilarEvents(matches);
        }
    }, [currentStep, formState, findSimilarEvents]);

    // 필수 입력 검증
    const isStepValid = useMemo(() => {
        switch (currentStep) {
            case "basic":
                return (
                    formState.title.trim() !== "" &&
                    formState.startAt !== "" &&
                    formState.eventType !== ""
                );
            case "venue":
                return (
                    formState.venueName.trim() !== "" &&
                    formState.venueAddress.trim() !== ""
                );
            case "artists":
                return true; // 출연진은 선택사항
            case "confirm":
                return true;
            default:
                return false;
        }
    }, [currentStep, formState]);

    // 폼 필드 업데이트
    const updateField = <K extends keyof EventRegistrationFormState>(
        key: K,
        value: EventRegistrationFormState[K]
    ) => {
        setFormState((prev) => ({ ...prev, [key]: value }));
    };

    // 티켓 링크 관리
    const addTicketLink = () => {
        updateField("ticketLinks", [
            ...formState.ticketLinks,
            { name: "", url: "" },
        ]);
    };

    const updateTicketLink = (index: number, field: keyof TicketLink, value: string) => {
        const updated = [...formState.ticketLinks];
        updated[index] = { ...updated[index], [field]: value };
        updateField("ticketLinks", updated);
    };

    const removeTicketLink = (index: number) => {
        updateField(
            "ticketLinks",
            formState.ticketLinks.filter((_, i) => i !== index)
        );
    };

    // 아티스트 관리
    const addArtist = () => {
        const trimmed = artistInput.trim();
        if (trimmed && !formState.artists.includes(trimmed)) {
            updateField("artists", [...formState.artists, trimmed]);
            setArtistInput("");
        }
    };

    const removeArtist = (artist: string) => {
        updateField(
            "artists",
            formState.artists.filter((a) => a !== artist)
        );
    };

    // 다음 스텝
    const goToNextStep = () => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < STEPS.length) {
            setCurrentStep(STEPS[nextIndex].key);
        }
    };

    // 이전 스텝
    const goToPrevStep = () => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            setCurrentStep(STEPS[prevIndex].key);
        }
    };

    // 행사 등록
    const handleSubmit = async () => {
        const input: CreateEventInput = {
            title: formState.title,
            startAt: new Date(formState.startAt),
            endAt: formState.endAt ? new Date(formState.endAt) : undefined,
            timezone: "Asia/Seoul",
            venueName: formState.venueName,
            venueAddress: formState.venueAddress,
            eventType: formState.eventType as EventType,
            posterUrl: posterImages[0]?.url,
            price: formState.price || undefined,
            ticketLinks: formState.ticketLinks.filter(
                (l) => l.name.trim() && l.url.trim()
            ),
            artists: formState.artists.length > 0 ? formState.artists : undefined,
            description: formState.description || undefined,
            officialUrl: formState.officialUrl || undefined,
        };

        const result = await registerEvent(input);

        if (result) {
            onSuccess?.(result.id);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl max-w-lg w-[95%] max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <h2 className="font-bold text-lg">행사 등록</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 스텝 인디케이터 */}
                <div className="px-4 py-3 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => (
                            <div
                                key={step.key}
                                className={cn(
                                    "flex items-center gap-1.5 text-xs",
                                    index <= currentStepIndex
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center",
                                        index < currentStepIndex
                                            ? "bg-primary text-white"
                                            : index === currentStepIndex
                                            ? "bg-primary/20 text-primary"
                                            : "bg-muted"
                                    )}
                                >
                                    {index < currentStepIndex ? (
                                        <Check className="h-3 w-3" />
                                    ) : (
                                        step.icon
                                    )}
                                </div>
                                <span className="hidden sm:inline">{step.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 폼 내용 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Step 1: 기본 정보 */}
                    {currentStep === "basic" && (
                        <div className="space-y-4">
                            {/* URL Import 섹션 */}
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
                                <div className="flex items-center gap-2 mb-2">
                                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">예매 URL로 자동 입력</span>
                                    <span className="text-xs text-muted-foreground">(선택)</span>
                                </div>

                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="url"
                                        value={importUrl}
                                        onChange={(e) => {
                                            setImportUrl(e.target.value);
                                            setImportError(null);
                                            setImportSuccess(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleImportUrl();
                                            }
                                        }}
                                        placeholder="https://ticket.yes24.com/... 또는 https://tickets.interpark.com/..."
                                        className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        disabled={isImporting}
                                    />
                                    <button
                                        onClick={handleImportUrl}
                                        disabled={!importUrl.trim() || isImporting}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 shrink-0",
                                            importUrl.trim() && !isImporting
                                                ? "bg-primary text-white hover:bg-primary/90"
                                                : "bg-muted text-muted-foreground cursor-not-allowed"
                                        )}
                                    >
                                        {isImporting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                가져오는 중...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4" />
                                                가져오기
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* 에러 메시지 */}
                                {importError && (
                                    <div className="flex items-center gap-1.5 text-red-600 text-xs mt-2">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span>{importError}</span>
                                    </div>
                                )}

                                {/* 성공 메시지 */}
                                {importSuccess && (
                                    <div className="flex items-center gap-1.5 text-green-600 text-xs mt-2">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>
                                            {importSuccess.sourceSite}에서 정보를 가져왔습니다.
                                            {importSuccess.confidence === "low" && " (일부 정보만 추출됨)"}
                                        </span>
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground mt-2">
                                    YES24, 인터파크, 멜론티켓, 티켓링크 URL을 지원합니다.
                                </p>
                            </div>

                            {/* 제목 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    행사 제목 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formState.title}
                                    onChange={(e) => updateField("title", e.target.value)}
                                    placeholder="예: 2025 서울 재즈 페스티벌"
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    maxLength={100}
                                />
                            </div>

                            {/* 행사 유형 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    행사 유형 <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => updateField("eventType", type)}
                                            className={cn(
                                                "px-3 py-2.5 rounded-lg border text-sm flex items-center gap-2 transition-colors",
                                                formState.eventType === type
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "hover:bg-muted"
                                            )}
                                        >
                                            <span>{EVENT_TYPE_LABELS[type].icon}</span>
                                            <span>{EVENT_TYPE_LABELS[type].label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 시작 일시 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    시작 일시 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formState.startAt}
                                    onChange={(e) => updateField("startAt", e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>

                            {/* 종료 일시 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    종료 일시 (선택)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formState.endAt}
                                    onChange={(e) => updateField("endAt", e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: 장소 & 상세 */}
                    {currentStep === "venue" && (
                        <div className="space-y-4">
                            {/* 장소명 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    장소명 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formState.venueName}
                                    onChange={(e) => updateField("venueName", e.target.value)}
                                    placeholder="예: 올림픽공원 88잔디마당"
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    maxLength={50}
                                />
                            </div>

                            {/* 주소 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    주소 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formState.venueAddress}
                                    onChange={(e) => updateField("venueAddress", e.target.value)}
                                    placeholder="예: 서울특별시 송파구 올림픽로 424"
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>

                            {/* 포스터 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    포스터 이미지 (선택)
                                </label>
                                <ImageUploader
                                    images={posterImages}
                                    onChange={setPosterImages}
                                    maxImages={1}
                                />
                            </div>

                            {/* 가격 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    가격 정보 (선택)
                                </label>
                                <input
                                    type="text"
                                    value={formState.price}
                                    onChange={(e) => updateField("price", e.target.value)}
                                    placeholder="예: 전석 88,000원 / VIP 150,000원"
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>

                            {/* 예매 링크 */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-sm font-medium">
                                        예매 링크 (선택)
                                    </label>
                                    <button
                                        onClick={addTicketLink}
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" />
                                        추가
                                    </button>
                                </div>
                                {formState.ticketLinks.length > 0 ? (
                                    <div className="space-y-2">
                                        {formState.ticketLinks.map((link, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={link.name}
                                                    onChange={(e) =>
                                                        updateTicketLink(index, "name", e.target.value)
                                                    }
                                                    placeholder="예: 인터파크"
                                                    className="flex-1 px-3 py-2 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                                />
                                                <input
                                                    type="url"
                                                    value={link.url}
                                                    onChange={(e) =>
                                                        updateTicketLink(index, "url", e.target.value)
                                                    }
                                                    placeholder="https://..."
                                                    className="flex-1 px-3 py-2 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                                />
                                                <button
                                                    onClick={() => removeTicketLink(index)}
                                                    className="p-2 text-muted-foreground hover:text-red-500"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-lg">
                                        예매 링크가 없습니다
                                    </div>
                                )}
                            </div>

                            {/* 공식 URL */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    공식 웹사이트 (선택)
                                </label>
                                <input
                                    type="url"
                                    value={formState.officialUrl}
                                    onChange={(e) => updateField("officialUrl", e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: 출연진 */}
                    {currentStep === "artists" && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    출연진 (선택)
                                </label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    출연 아티스트/팀을 추가하세요
                                </p>

                                {/* 아티스트 입력 */}
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={artistInput}
                                        onChange={(e) => setArtistInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addArtist();
                                            }
                                        }}
                                        placeholder="아티스트/팀 이름"
                                        className="flex-1 px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    />
                                    <button
                                        onClick={addArtist}
                                        disabled={!artistInput.trim()}
                                        className={cn(
                                            "px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5",
                                            artistInput.trim()
                                                ? "bg-primary text-white hover:bg-primary/90"
                                                : "bg-muted text-muted-foreground cursor-not-allowed"
                                        )}
                                    >
                                        <Plus className="h-4 w-4" />
                                        추가
                                    </button>
                                </div>

                                {/* 아티스트 목록 */}
                                {formState.artists.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {formState.artists.map((artist) => (
                                            <div
                                                key={artist}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                                            >
                                                <span>{artist}</span>
                                                <button
                                                    onClick={() => removeArtist(artist)}
                                                    className="p-0.5 hover:bg-primary/20 rounded-full"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                                        추가된 출연진이 없습니다
                                    </div>
                                )}
                            </div>

                            {/* 설명 */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">
                                    행사 설명 (선택)
                                </label>
                                <textarea
                                    value={formState.description}
                                    onChange={(e) => updateField("description", e.target.value)}
                                    placeholder="행사에 대한 추가 정보를 입력하세요"
                                    rows={4}
                                    className="w-full px-3 py-2.5 rounded-lg border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: 확인 */}
                    {currentStep === "confirm" && (
                        <div className="space-y-4">
                            {/* 중복 경고 */}
                            {similarEvents.length > 0 && (
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                    <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        유사한 행사가 있습니다
                                    </div>
                                    <ul className="space-y-1.5">
                                        {similarEvents.slice(0, 3).map((match) => (
                                            <li key={match.event.id} className="text-xs text-amber-700">
                                                <span className="font-medium">{match.event.title}</span>
                                                <span className="text-amber-600 ml-1">
                                                    (유사도 {Math.round(match.similarity * 100)}%)
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* 요약 */}
                            <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-xs text-muted-foreground mb-1">제목</div>
                                    <div className="font-medium">{formState.title}</div>
                                </div>

                                <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-xs text-muted-foreground mb-1">유형</div>
                                    <div className="flex items-center gap-1.5">
                                        <span>
                                            {EVENT_TYPE_LABELS[formState.eventType as EventType]?.icon}
                                        </span>
                                        <span>
                                            {EVENT_TYPE_LABELS[formState.eventType as EventType]?.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-xs text-muted-foreground mb-1">일시</div>
                                    <div>
                                        {formState.startAt && new Date(formState.startAt).toLocaleString("ko-KR")}
                                        {formState.endAt && (
                                            <> ~ {new Date(formState.endAt).toLocaleString("ko-KR")}</>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-xs text-muted-foreground mb-1">장소</div>
                                    <div className="font-medium">{formState.venueName}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {formState.venueAddress}
                                    </div>
                                </div>

                                {formState.artists.length > 0 && (
                                    <div className="p-3 rounded-lg bg-muted/50">
                                        <div className="text-xs text-muted-foreground mb-1">출연진</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {formState.artists.map((artist) => (
                                                <span
                                                    key={artist}
                                                    className="px-2 py-0.5 bg-primary/10 text-primary rounded text-sm"
                                                >
                                                    {artist}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {formState.price && (
                                    <div className="p-3 rounded-lg bg-muted/50">
                                        <div className="text-xs text-muted-foreground mb-1">가격</div>
                                        <div>{formState.price}</div>
                                    </div>
                                )}

                                {posterImages.length > 0 && (
                                    <div className="p-3 rounded-lg bg-muted/50">
                                        <div className="text-xs text-muted-foreground mb-1">포스터</div>
                                        <img
                                            src={posterImages[0].thumbnailUrl || posterImages[0].url}
                                            alt="포스터"
                                            className="w-20 h-28 object-cover rounded"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 안내 문구 */}
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-xs">
                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>
                                    등록된 행사는 즉시 공개됩니다. 부정확한 정보는 다른 사용자가 수정을 제안할 수 있습니다.
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="p-4 border-t flex gap-2 shrink-0">
                    {currentStep !== "basic" && (
                        <button
                            onClick={goToPrevStep}
                            disabled={isLoading}
                            className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            이전
                        </button>
                    )}

                    {currentStep === "confirm" ? (
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className={cn(
                                "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                                "bg-primary text-white hover:bg-primary/90",
                                isLoading && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    등록 중...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    등록하기
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={goToNextStep}
                            disabled={!isStepValid}
                            className={cn(
                                "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                                isStepValid
                                    ? "bg-primary text-white hover:bg-primary/90"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            다음
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
