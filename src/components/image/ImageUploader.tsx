"use client";

import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadedImage, ImageUploadOptions, DEFAULT_UPLOAD_OPTIONS } from "@/types/image";
import { getImageStorage, formatFileSize, validateImageFile } from "@/lib/storage";

interface ImageUploaderProps {
    /** 현재 업로드된 이미지 목록 */
    images: UploadedImage[];
    /** 이미지 변경 콜백 */
    onChange: (images: UploadedImage[]) => void;
    /** 최대 이미지 수 (기본 5) */
    maxImages?: number;
    /** 비활성화 */
    disabled?: boolean;
    /** 커스텀 클래스 */
    className?: string;
    /** 업로드 옵션 */
    uploadOptions?: ImageUploadOptions;
}

export function ImageUploader({
    images,
    onChange,
    maxImages = 5,
    disabled = false,
    className,
    uploadOptions,
}: ImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const storage = getImageStorage();
    const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...uploadOptions, maxImages };

    const canAddMore = images.length < maxImages;

    const handleUpload = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (disabled) return;

        setError(null);
        setIsUploading(true);

        const newImages: UploadedImage[] = [...images];
        const remainingSlots = maxImages - images.length;
        const filesToUpload = Array.from(files).slice(0, remainingSlots);

        for (const file of filesToUpload) {
            // 사전 유효성 검사 (빠른 피드백)
            const validation = validateImageFile(file, opts);
            if (!validation.valid) {
                setError(validation.error || "파일 업로드 실패");
                continue;
            }

            const result = await storage.upload(file, opts);

            if (result.success && result.image) {
                newImages.push(result.image);
            } else {
                setError(result.error || "파일 업로드 실패");
            }
        }

        onChange(newImages);
        setIsUploading(false);

        // 입력 초기화
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }, [images, maxImages, disabled, onChange, storage, opts]);

    const handleRemove = useCallback((imageId: string) => {
        const updated = images.filter(img => img.id !== imageId);
        onChange(updated);
        // 스토리지에서도 삭제 (선택적)
        storage.delete(imageId);
    }, [images, onChange, storage]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
        }
    }, [handleUpload]);

    return (
        <div className={cn("space-y-3", className)}>
            {/* 에러 메시지 */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto p-1 hover:bg-red-100 rounded"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* 이미지 미리보기 그리드 */}
            {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {images.map((image, index) => (
                        <div
                            key={image.id}
                            className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group"
                        >
                            <img
                                src={image.thumbnailUrl || image.url}
                                alt={`업로드 이미지 ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            {/* 삭제 버튼 */}
                            <button
                                onClick={() => handleRemove(image.id)}
                                disabled={disabled}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                            >
                                <X className="h-3 w-3" />
                            </button>
                            {/* 순서 표시 */}
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 업로드 영역 */}
            {canAddMore && (
                <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                        "relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
                        dragActive
                            ? "border-primary bg-primary/5"
                            : "border-gray-300 hover:border-gray-400",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !disabled && inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={opts.allowedTypes.join(",")}
                        multiple
                        disabled={disabled || isUploading}
                        onChange={(e) => handleUpload(e.target.files)}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center gap-2 text-center">
                        {isUploading ? (
                            <>
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                <span className="text-sm text-muted-foreground">
                                    업로드 중...
                                </span>
                            </>
                        ) : (
                            <>
                                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                <div>
                                    <span className="text-sm font-medium text-primary">
                                        사진 추가
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {" "}또는 드래그
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    최대 {maxImages}장, {formatFileSize(opts.maxFileSize)} 이하
                                    <br />
                                    ({images.length}/{maxImages})
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
