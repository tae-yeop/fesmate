// 이미지 처리 유틸리티 함수

import { DEFAULT_UPLOAD_OPTIONS, ImageUploadOptions } from "@/types/image";

/**
 * 파일 유효성 검사
 */
export function validateImageFile(
    file: File,
    options: ImageUploadOptions = {}
): { valid: boolean; error?: string } {
    const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...options };

    // 파일 타입 검사
    if (!opts.allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `허용되지 않는 파일 형식입니다. (허용: ${opts.allowedTypes.join(", ")})`,
        };
    }

    // 파일 크기 검사
    if (file.size > opts.maxFileSize) {
        const maxSizeMB = Math.round(opts.maxFileSize / 1024 / 1024);
        return {
            valid: false,
            error: `파일 크기가 너무 큽니다. (최대 ${maxSizeMB}MB)`,
        };
    }

    return { valid: true };
}

/**
 * 이미지 리사이즈 및 압축
 */
export async function resizeImage(
    file: File,
    options: ImageUploadOptions = {}
): Promise<{ dataUrl: string; width: number; height: number }> {
    const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            let { width, height } = img;

            // 리사이즈 필요 여부 확인
            if (width > opts.maxWidth || height > opts.maxHeight) {
                const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            // Canvas에 그리기
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Canvas context를 생성할 수 없습니다"));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // 압축된 데이터 URL 생성
            const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
            const dataUrl = canvas.toDataURL(mimeType, opts.quality);

            resolve({ dataUrl, width, height });
        };

        img.onerror = () => reject(new Error("이미지를 로드할 수 없습니다"));
        reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다"));

        reader.readAsDataURL(file);
    });
}

/**
 * 썸네일 생성
 */
export async function generateThumbnail(
    dataUrl: string,
    size: number = 200
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;

        img.onload = () => {
            const canvas = document.createElement("canvas");

            // 정사각형 썸네일 (중앙 크롭)
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Canvas context를 생성할 수 없습니다"));
                return;
            }

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
        };

        img.onerror = () => reject(new Error("썸네일 생성에 실패했습니다"));
    });
}

/**
 * 고유 ID 생성
 */
export function generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
