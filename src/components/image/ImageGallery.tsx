"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadedImage } from "@/types/image";

interface ImageGalleryProps {
    /** 이미지 목록 (UploadedImage 또는 URL 문자열) */
    images: (UploadedImage | string)[];
    /** 썸네일 크기 */
    thumbnailSize?: "sm" | "md" | "lg";
    /** 클릭 시 확대 허용 */
    allowZoom?: boolean;
    /** 커스텀 클래스 */
    className?: string;
}

const THUMBNAIL_SIZES = {
    sm: "w-16 h-16",
    md: "w-20 h-20",
    lg: "w-24 h-24",
};

export function ImageGallery({
    images,
    thumbnailSize = "md",
    allowZoom = true,
    className,
}: ImageGalleryProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    if (images.length === 0) return null;

    const getImageUrl = (img: UploadedImage | string): string => {
        return typeof img === "string" ? img : img.url;
    };

    const getThumbnailUrl = (img: UploadedImage | string): string => {
        if (typeof img === "string") return img;
        return img.thumbnailUrl || img.url;
    };

    const handlePrev = () => {
        if (lightboxIndex === null) return;
        setLightboxIndex(lightboxIndex === 0 ? images.length - 1 : lightboxIndex - 1);
    };

    const handleNext = () => {
        if (lightboxIndex === null) return;
        setLightboxIndex(lightboxIndex === images.length - 1 ? 0 : lightboxIndex + 1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") handlePrev();
        if (e.key === "ArrowRight") handleNext();
        if (e.key === "Escape") setLightboxIndex(null);
    };

    return (
        <>
            {/* 썸네일 그리드 */}
            <div className={cn("flex flex-wrap gap-2", className)}>
                {images.map((image, index) => (
                    <button
                        key={index}
                        onClick={() => allowZoom && setLightboxIndex(index)}
                        className={cn(
                            "relative rounded-lg overflow-hidden border border-gray-200 group",
                            THUMBNAIL_SIZES[thumbnailSize],
                            allowZoom && "cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-1"
                        )}
                    >
                        <img
                            src={getThumbnailUrl(image)}
                            alt={`이미지 ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        {allowZoom && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        {/* 여러 장일 경우 숫자 표시 */}
                        {images.length > 1 && index === 0 && (
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                                +{images.length}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* 라이트박스 */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
                    onClick={() => setLightboxIndex(null)}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                >
                    {/* 닫기 버튼 */}
                    <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    {/* 이전 버튼 */}
                    {images.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrev();
                            }}
                            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </button>
                    )}

                    {/* 이미지 */}
                    <img
                        src={getImageUrl(images[lightboxIndex])}
                        alt={`이미지 ${lightboxIndex + 1}`}
                        className="max-w-[90vw] max-h-[90vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* 다음 버튼 */}
                    {images.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
                        >
                            <ChevronRight className="h-8 w-8" />
                        </button>
                    )}

                    {/* 인디케이터 */}
                    {images.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {images.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxIndex(index);
                                    }}
                                    className={cn(
                                        "w-2 h-2 rounded-full transition-colors",
                                        index === lightboxIndex
                                            ? "bg-white"
                                            : "bg-white/40 hover:bg-white/60"
                                    )}
                                />
                            ))}
                        </div>
                    )}

                    {/* 카운터 */}
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
                        {lightboxIndex + 1} / {images.length}
                    </div>
                </div>
            )}
        </>
    );
}
