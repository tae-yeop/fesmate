// Supabase Storage 기반 이미지 저장소

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
} from "./image-utils";
import { createClient } from "@/lib/supabase/client";

/** 버킷 타입 */
export type BucketName = "post-images" | "ticket-images" | "avatars";

/**
 * Supabase Storage 기반 이미지 저장소
 *
 * 사용법:
 * ```ts
 * const storage = getSupabaseImageStorage("post-images");
 * const result = await storage.upload(file, userId);
 * ```
 */
export class SupabaseImageStorage implements ImageStorageAdapter {
    readonly storageType = "supabase" as const;
    private bucketName: BucketName;

    constructor(bucketName: BucketName = "post-images") {
        this.bucketName = bucketName;
    }

    /**
     * 이미지 업로드
     * @param file 업로드할 파일
     * @param options 업로드 옵션
     * @param userId 사용자 ID (폴더 구분용)
     */
    async upload(
        file: File,
        options?: ImageUploadOptions,
        userId?: string
    ): Promise<ImageUploadResult> {
        const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...options };

        // 유효성 검사
        const validation = validateImageFile(file, opts);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        try {
            const supabase = createClient();

            // 현재 사용자 확인
            const { data: { user } } = await supabase.auth.getUser();
            const ownerId = userId || user?.id;

            if (!ownerId) {
                return { success: false, error: "로그인이 필요합니다" };
            }

            // 이미지 리사이즈 및 압축
            const { dataUrl, width, height } = await resizeImage(file, opts);

            // 썸네일 생성
            let thumbnailUrl: string | undefined;
            if (opts.generateThumbnail) {
                thumbnailUrl = await generateThumbnail(dataUrl, opts.thumbnailSize);
            }

            // Data URL을 Blob으로 변환
            const resizedBlob = await this.dataUrlToBlob(dataUrl);
            const resizedFile = new File([resizedBlob], file.name, { type: resizedBlob.type });

            // 파일명 생성 (userId/timestamp_random_filename)
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 9);
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const filePath = `${ownerId}/${timestamp}_${randomStr}_${sanitizedName}`;

            // Supabase Storage에 업로드
            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(filePath, resizedFile, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (error) {
                console.error("[SupabaseImageStorage] Upload error:", error);
                return { success: false, error: error.message };
            }

            // Public URL 생성
            const { data: urlData } = supabase.storage
                .from(this.bucketName)
                .getPublicUrl(data.path);

            // 썸네일도 업로드 (옵션)
            let thumbnailPublicUrl: string | undefined;
            if (thumbnailUrl) {
                const thumbnailBlob = await this.dataUrlToBlob(thumbnailUrl);
                const thumbnailFile = new File([thumbnailBlob], `thumb_${file.name}`, { type: "image/jpeg" });
                const thumbnailPath = `${ownerId}/thumbnails/${timestamp}_${randomStr}_thumb.jpg`;

                const { data: thumbData, error: thumbError } = await supabase.storage
                    .from(this.bucketName)
                    .upload(thumbnailPath, thumbnailFile, {
                        cacheControl: "3600",
                        upsert: false,
                    });

                if (!thumbError && thumbData) {
                    const { data: thumbUrlData } = supabase.storage
                        .from(this.bucketName)
                        .getPublicUrl(thumbData.path);
                    thumbnailPublicUrl = thumbUrlData.publicUrl;
                }
            }

            // 이미지 객체 생성
            const image: UploadedImage = {
                id: data.path,
                url: urlData.publicUrl,
                thumbnailUrl: thumbnailPublicUrl || urlData.publicUrl,
                fileName: file.name,
                fileSize: resizedFile.size,
                mimeType: resizedFile.type,
                width,
                height,
                uploadedAt: new Date(),
                storageType: "supabase",
            };

            return { success: true, image };
        } catch (error) {
            console.error("[SupabaseImageStorage] Error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "이미지 업로드에 실패했습니다",
            };
        }
    }

    /**
     * 이미지 삭제
     */
    async delete(imageId: string): Promise<boolean> {
        try {
            const supabase = createClient();

            const { error } = await supabase.storage
                .from(this.bucketName)
                .remove([imageId]);

            if (error) {
                console.error("[SupabaseImageStorage] Delete error:", error);
                return false;
            }

            // 썸네일도 삭제 시도
            const parts = imageId.split("/");
            if (parts.length >= 2) {
                const userId = parts[0];
                const fileName = parts[parts.length - 1];
                const thumbnailPath = `${userId}/thumbnails/thumb_${fileName}`;
                await supabase.storage.from(this.bucketName).remove([thumbnailPath]);
            }

            return true;
        } catch (error) {
            console.error("[SupabaseImageStorage] Delete error:", error);
            return false;
        }
    }

    /**
     * 이미지 URL 조회
     */
    getUrl(imageId: string): string | null {
        if (!imageId) return null;

        const supabase = createClient();
        const { data } = supabase.storage
            .from(this.bucketName)
            .getPublicUrl(imageId);

        return data.publicUrl;
    }

    /**
     * 여러 이미지 삭제
     */
    async deleteMany(imageIds: string[]): Promise<number> {
        if (imageIds.length === 0) return 0;

        try {
            const supabase = createClient();

            const { error } = await supabase.storage
                .from(this.bucketName)
                .remove(imageIds);

            if (error) {
                console.error("[SupabaseImageStorage] DeleteMany error:", error);
                return 0;
            }

            return imageIds.length;
        } catch (error) {
            console.error("[SupabaseImageStorage] DeleteMany error:", error);
            return 0;
        }
    }

    /**
     * 사용자의 모든 이미지 목록 조회
     */
    async listUserImages(userId: string): Promise<string[]> {
        try {
            const supabase = createClient();

            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .list(userId, {
                    limit: 100,
                    sortBy: { column: "created_at", order: "desc" },
                });

            if (error) {
                console.error("[SupabaseImageStorage] List error:", error);
                return [];
            }

            return data
                .filter(file => !file.name.startsWith("thumbnails"))
                .map(file => `${userId}/${file.name}`);
        } catch (error) {
            console.error("[SupabaseImageStorage] List error:", error);
            return [];
        }
    }

    /**
     * Data URL을 Blob으로 변환
     */
    private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
        const response = await fetch(dataUrl);
        return response.blob();
    }
}

// 버킷별 싱글톤 인스턴스
const instances: Map<BucketName, SupabaseImageStorage> = new Map();

/**
 * Supabase Image Storage 인스턴스 반환
 */
export function getSupabaseImageStorage(
    bucketName: BucketName = "post-images"
): SupabaseImageStorage {
    if (!instances.has(bucketName)) {
        instances.set(bucketName, new SupabaseImageStorage(bucketName));
    }
    return instances.get(bucketName)!;
}
