"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    MAP_APPS,
    MapProvider,
    getDefaultMapApp,
    setDefaultMapApp,
    openMap,
} from "@/lib/utils/map-deeplink";

interface MapActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    placeText: string;
    placeHint?: string;
}

/**
 * 지도 앱 선택 액션시트 - PRD 6.4.1
 * 장소가 있는 글에서 [📍 지도 보기] 버튼 클릭 시 표시
 */
export function MapActionSheet({
    isOpen,
    onClose,
    placeText,
    placeHint,
}: MapActionSheetProps) {
    const [selectedProvider, setSelectedProvider] = useState<MapProvider>("google");
    const [saveAsDefault, setSaveAsDefault] = useState(false);

    // 초기화 시 저장된 기본값 로드
    useEffect(() => {
        if (isOpen) {
            setSelectedProvider(getDefaultMapApp());
            setSaveAsDefault(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelect = (provider: MapProvider) => {
        setSelectedProvider(provider);
    };

    const handleOpenMap = () => {
        // 기본값으로 저장 옵션이 체크되어 있으면 저장
        if (saveAsDefault) {
            setDefaultMapApp(selectedProvider);
        }

        // 지도 열기
        openMap(selectedProvider, placeText, placeHint);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 액션시트 */}
            <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h2 className="font-bold">지도로 보기</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-accent rounded"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 장소 정보 */}
                <div className="px-4 py-3 bg-muted/50 border-b">
                    <p className="font-medium">{placeText}</p>
                    {placeHint && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {placeHint}
                        </p>
                    )}
                </div>

                {/* 지도 앱 선택 */}
                <div className="p-4 space-y-2">
                    {MAP_APPS.map((app) => (
                        <button
                            key={app.id}
                            onClick={() => handleSelect(app.id)}
                            className={cn(
                                "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                                selectedProvider === app.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        selectedProvider === app.id
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground"
                                    )}
                                >
                                    {selectedProvider === app.id && (
                                        <Check className="h-3 w-3 text-primary-foreground" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{app.nameKo}</span>
                                        {app.recommended && (
                                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                추천
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {app.description}
                                    </p>
                                </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </button>
                    ))}
                </div>

                {/* 기본값 저장 옵션 */}
                <div className="px-4 pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={saveAsDefault}
                            onChange={(e) => setSaveAsDefault(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">
                            다음부터 이 지도로 열기
                        </span>
                    </label>
                </div>

                {/* 하단 버튼 */}
                <div className="px-4 py-4 border-t">
                    <button
                        onClick={handleOpenMap}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                        <MapPin className="h-4 w-4" />
                        지도에서 열기
                    </button>
                </div>
            </div>
        </div>
    );
}
