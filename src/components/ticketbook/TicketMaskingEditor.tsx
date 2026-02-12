"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    X,
    Wand2,
    Eye,
    EyeOff,
    Download,
    RotateCcw,
    Trash2,
    Plus,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    MaskRegion,
    MaskStyle,
    MaskType,
    TicketType,
    MASK_TYPE_LABELS,
    getSuggestedMaskRegions,
    applyMasksToCanvas,
    createMaskRegion,
    exportMaskedImage,
} from "@/lib/ticket-masking";

interface TicketMaskingEditorProps {
    imageUrl: string;
    ticketType?: TicketType;
    initialMasks?: MaskRegion[];
    onSave: (masks: MaskRegion[], maskedImageUrl: string) => void;
    onCancel: () => void;
}

export function TicketMaskingEditor({
    imageUrl,
    ticketType = "generic",
    initialMasks = [],
    onSave,
    onCancel,
}: TicketMaskingEditorProps) {
    const [masks, setMasks] = useState<MaskRegion[]>(initialMasks);
    const [maskStyle, setMaskStyle] = useState<MaskStyle>({
        type: "blur",
        blurAmount: 20,
    });
    const [showPreview, setShowPreview] = useState(false);
    const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [history, setHistory] = useState<MaskRegion[][]>([initialMasks]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            if (imageRef.current) {
                imageRef.current.src = img.src;
            }
            updatePreview();
        };
        img.src = imageUrl;
    }, [imageUrl]);

    useEffect(() => {
        if (showPreview) {
            updatePreview();
        }
    }, [masks, maskStyle, showPreview]);

    const updatePreview = useCallback(() => {
        if (!previewCanvasRef.current || !imageRef.current) return;

        const img = imageRef.current;
        if (!img.complete || img.naturalWidth === 0) return;

        applyMasksToCanvas(previewCanvasRef.current, img, masks, maskStyle);
    }, [masks, maskStyle]);

    const addToHistory = useCallback((newMasks: MaskRegion[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newMasks);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setMasks(history[historyIndex - 1]);
        }
    }, [history, historyIndex]);

    const handleAutoDetect = useCallback(() => {
        const suggested = getSuggestedMaskRegions(ticketType);
        const newMasks = [...masks, ...suggested];
        setMasks(newMasks);
        addToHistory(newMasks);
    }, [ticketType, masks, addToHistory]);

    const handleDeleteMask = useCallback((maskId: string) => {
        const newMasks = masks.filter(m => m.id !== maskId);
        setMasks(newMasks);
        addToHistory(newMasks);
        if (selectedMaskId === maskId) {
            setSelectedMaskId(null);
        }
    }, [masks, selectedMaskId, addToHistory]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDrawing(true);
        setDrawStart({ x, y });
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !drawStart || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const tempMask = createMaskRegion(
            Math.min(drawStart.x, x),
            Math.min(drawStart.y, y),
            Math.abs(x - drawStart.x),
            Math.abs(y - drawStart.y)
        );

        const existingMasks = masks.filter(m => !m.id.startsWith("temp-"));
        setMasks([...existingMasks, { ...tempMask, id: "temp-drawing" }]);
    }, [isDrawing, drawStart, masks]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !drawStart) return;

        const tempMask = masks.find(m => m.id === "temp-drawing");
        if (tempMask && tempMask.width > 2 && tempMask.height > 2) {
            const newMask = {
                ...tempMask,
                id: `mask-${Date.now()}`,
            };
            const newMasks = masks.filter(m => m.id !== "temp-drawing").concat(newMask);
            setMasks(newMasks);
            addToHistory(newMasks);
        } else {
            setMasks(masks.filter(m => m.id !== "temp-drawing"));
        }

        setIsDrawing(false);
        setDrawStart(null);
    }, [isDrawing, drawStart, masks, addToHistory]);

    const handleExport = useCallback(async () => {
        if (!canvasRef.current || !imageRef.current) return;

        applyMasksToCanvas(canvasRef.current, imageRef.current, masks, maskStyle);
        const blob = await exportMaskedImage(canvasRef.current);
        const url = URL.createObjectURL(blob);
        onSave(masks, url);
    }, [masks, maskStyle, onSave]);

    return (
        <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-white/10">
                <h2 className="text-white font-bold">개인정보 마스킹</h2>
                <button onClick={onCancel} className="p-2 text-white/70 hover:text-white">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div
                    ref={containerRef}
                    className="flex-1 relative overflow-auto flex items-center justify-center p-4"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div className="relative max-w-full max-h-full">
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="티켓"
                            className={cn(
                                "max-w-full max-h-[70vh] object-contain",
                                showPreview && "hidden"
                            )}
                            crossOrigin="anonymous"
                        />
                        <canvas
                            ref={previewCanvasRef}
                            className={cn(
                                "max-w-full max-h-[70vh] object-contain",
                                !showPreview && "hidden"
                            )}
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {!showPreview && masks.map(mask => (
                            <div
                                key={mask.id}
                                className={cn(
                                    "absolute border-2 cursor-pointer transition-colors",
                                    selectedMaskId === mask.id
                                        ? "border-primary bg-primary/20"
                                        : "border-white/50 bg-white/10 hover:border-white"
                                )}
                                style={{
                                    left: `${mask.x}%`,
                                    top: `${mask.y}%`,
                                    width: `${mask.width}%`,
                                    height: `${mask.height}%`,
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMaskId(mask.id === selectedMaskId ? null : mask.id);
                                }}
                            >
                                {selectedMaskId === mask.id && (
                                    <button
                                        className="absolute -top-3 -right-3 p-1 bg-red-500 rounded-full text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMask(mask.id);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                                <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1 rounded">
                                    {MASK_TYPE_LABELS[mask.type]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-72 border-l border-white/10 bg-black/50 p-4 overflow-y-auto">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-white text-sm font-medium mb-2">자동 감지</h3>
                            <button
                                onClick={handleAutoDetect}
                                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90"
                            >
                                <Wand2 className="h-4 w-4" />
                                자동 영역 추가
                            </button>
                            <p className="text-white/50 text-xs mt-2">
                                일반적인 개인정보 위치를 자동으로 감지합니다
                            </p>
                        </div>

                        <div>
                            <h3 className="text-white text-sm font-medium mb-2">마스킹 스타일</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {(["blur", "solid", "pattern"] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setMaskStyle(prev => ({ ...prev, type }))}
                                        className={cn(
                                            "py-2 rounded text-xs font-medium",
                                            maskStyle.type === type
                                                ? "bg-primary text-white"
                                                : "bg-white/10 text-white/70 hover:bg-white/20"
                                        )}
                                    >
                                        {type === "blur" && "흐림"}
                                        {type === "solid" && "단색"}
                                        {type === "pattern" && "패턴"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white text-sm font-medium mb-2">
                                마스킹 영역 ({masks.length})
                            </h3>
                            {masks.length === 0 ? (
                                <p className="text-white/50 text-xs">
                                    드래그하여 마스킹할 영역을 선택하세요
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {masks.filter(m => !m.id.startsWith("temp-")).map(mask => (
                                        <div
                                            key={mask.id}
                                            className={cn(
                                                "p-2 rounded flex items-center justify-between text-sm",
                                                selectedMaskId === mask.id
                                                    ? "bg-primary/30 text-white"
                                                    : "bg-white/10 text-white/70"
                                            )}
                                            onClick={() => setSelectedMaskId(mask.id)}
                                        >
                                            <span>{MASK_TYPE_LABELS[mask.type]}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteMask(mask.id);
                                                }}
                                                className="p-1 hover:text-red-400"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={undo}
                                disabled={historyIndex === 0}
                                className="flex-1 py-2 rounded bg-white/10 text-white/70 text-sm flex items-center justify-center gap-1 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <RotateCcw className="h-4 w-4" />
                                되돌리기
                            </button>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex-1 py-2 rounded bg-white/10 text-white/70 text-sm flex items-center justify-center gap-1 hover:bg-white/20"
                            >
                                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {showPreview ? "편집" : "미리보기"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-white/10 flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10"
                >
                    취소
                </button>
                <button
                    onClick={handleExport}
                    disabled={masks.length === 0}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Check className="h-4 w-4" />
                    적용하기
                </button>
            </div>
        </div>
    );
}
