// 로컬 스토리지 기반 이미지 저장소 (개발용)
// TODO: Supabase Storage로 전환 시 supabase-image-storage.ts 구현

import {
    ImageStorageAdapter,
    ImageUploadOptions,
    ImageUploadResult,
    UploadedImage,
    DEFAULT_UPLOAD_OPTIONS,
} from "@/types/image";
import {
    validateImageFile,
    resizeImage,
    generateThumbnail,
    generateImageId,
} from "./image-utils";
import { buildSharedKey, DOMAINS } from "./keys";

const STORAGE_KEY = buildSharedKey(DOMAINS.IMAGES);
const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB 제한 (localStorage 한계)

/**
 * 로컬 스토리지 기반 이미지 저장소
 *
 * 주의: localStorage는 용량 제한(약 5-10MB)이 있으므로
 * 실제 서비스에서는 Supabase Storage 사용 권장
 */
export class LocalImageStorage implements ImageStorageAdapter {
    readonly storageType = "local" as const;

    private getStoredImages(): Record<string, UploadedImage> {
        if (typeof window === "undefined") return {};
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }

    private saveStoredImages(images: Record<string, UploadedImage>): void {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
        } catch (e) {
            console.error("이미지 저장 실패:", e);
            // 용량 초과 시 오래된 이미지 삭제
            this.cleanupOldImages();
        }
    }

    private cleanupOldImages(): void {
        const images = this.getStoredImages();
        const sorted = Object.values(images).sort(
            (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
        );

        // 가장 오래된 이미지부터 삭제
        while (sorted.length > 0) {
            const oldest = sorted.shift();
            if (oldest) {
                delete images[oldest.id];
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
                    break;
                } catch {
                    continue;
                }
            }
        }
    }

    async upload(file: File, options?: ImageUploadOptions): Promise<ImageUploadResult> {
        const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...options };

        // 유효성 검사
        const validation = validateImageFile(file, opts);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        try {
            // 이미지 리사이즈 및 압축
            const { dataUrl, width, height } = await resizeImage(file, opts);

            // 썸네일 생성
            let thumbnailUrl: string | undefined;
            if (opts.generateThumbnail) {
                thumbnailUrl = await generateThumbnail(dataUrl, opts.thumbnailSize);
            }

            // 이미지 객체 생성
            const image: UploadedImage = {
                id: generateImageId(),
                url: dataUrl,
                thumbnailUrl,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                width,
                height,
                uploadedAt: new Date(),
                storageType: "local",
            };

            // 저장
            const images = this.getStoredImages();
            images[image.id] = image;
            this.saveStoredImages(images);

            return { success: true, image };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "이미지 업로드에 실패했습니다",
            };
        }
    }

    async delete(imageId: string): Promise<boolean> {
        const images = this.getStoredImages();
        if (!images[imageId]) return false;

        delete images[imageId];
        this.saveStoredImages(images);
        return true;
    }

    getUrl(imageId: string): string | null {
        const images = this.getStoredImages();
        return images[imageId]?.url || null;
    }

    getImage(imageId: string): UploadedImage | null {
        const images = this.getStoredImages();
        return images[imageId] || null;
    }

    getAllImages(): UploadedImage[] {
        return Object.values(this.getStoredImages());
    }

    getStorageUsage(): { used: number; max: number; percentage: number } {
        if (typeof window === "undefined") {
            return { used: 0, max: MAX_STORAGE_SIZE, percentage: 0 };
        }

        const data = localStorage.getItem(STORAGE_KEY) || "";
        const used = new Blob([data]).size;
        return {
            used,
            max: MAX_STORAGE_SIZE,
            percentage: Math.round((used / MAX_STORAGE_SIZE) * 100),
        };
    }
}

// 싱글톤 인스턴스
let localStorageInstance: LocalImageStorage | null = null;

export function getLocalImageStorage(): LocalImageStorage {
    if (!localStorageInstance) {
        localStorageInstance = new LocalImageStorage();
    }
    return localStorageInstance;
}
