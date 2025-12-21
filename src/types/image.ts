// 이미지 업로드 관련 타입 정의

/** 업로드된 이미지 정보 */
export interface UploadedImage {
    /** 고유 ID */
    id: string;
    /** 이미지 URL (로컬: data URL, 원격: https URL) */
    url: string;
    /** 썸네일 URL (선택, 없으면 url 사용) */
    thumbnailUrl?: string;
    /** 원본 파일명 */
    fileName: string;
    /** 파일 크기 (bytes) */
    fileSize: number;
    /** MIME 타입 */
    mimeType: string;
    /** 이미지 너비 */
    width?: number;
    /** 이미지 높이 */
    height?: number;
    /** 업로드 시각 */
    uploadedAt: Date;
    /** 저장소 타입 (마이그레이션용) */
    storageType: "local" | "supabase";
}

/** 이미지 업로드 옵션 */
export interface ImageUploadOptions {
    /** 최대 파일 크기 (bytes, 기본 5MB) */
    maxFileSize?: number;
    /** 최대 이미지 수 */
    maxImages?: number;
    /** 허용 MIME 타입 */
    allowedTypes?: string[];
    /** 리사이즈 최대 너비 (기본 1200px) */
    maxWidth?: number;
    /** 리사이즈 최대 높이 (기본 1200px) */
    maxHeight?: number;
    /** 썸네일 생성 여부 */
    generateThumbnail?: boolean;
    /** 썸네일 크기 */
    thumbnailSize?: number;
    /** 압축 품질 (0-1, 기본 0.8) */
    quality?: number;
}

/** 기본 업로드 옵션 */
export const DEFAULT_UPLOAD_OPTIONS: Required<ImageUploadOptions> = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxImages: 5,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    maxWidth: 1200,
    maxHeight: 1200,
    generateThumbnail: true,
    thumbnailSize: 200,
    quality: 0.8,
};

/** 이미지 업로드 결과 */
export interface ImageUploadResult {
    success: boolean;
    image?: UploadedImage;
    error?: string;
}

/** 이미지 저장소 인터페이스 (추상화) */
export interface ImageStorageAdapter {
    /** 이미지 업로드 */
    upload(file: File, options?: ImageUploadOptions): Promise<ImageUploadResult>;
    /** 이미지 삭제 */
    delete(imageId: string): Promise<boolean>;
    /** 이미지 URL 조회 */
    getUrl(imageId: string): string | null;
    /** 저장소 타입 */
    readonly storageType: "local" | "supabase";
}
