/**
 * Storage 모듈 통합 export
 *
 * 1. 일반 데이터용 Storage Adapter
 * 2. 이미지 전용 Storage
 */

// ============================================================
// 1. 일반 데이터용 Storage Adapter (신규)
// ============================================================
export * from "./types";
export * from "./adapter";
export * from "./date-utils";
export * from "./keys";
export * from "./migration";

// ============================================================
// 2. 이미지 저장소 (기존)
// ============================================================
import { ImageStorageAdapter } from "@/types/image";
import { getLocalImageStorage } from "./local-image-storage";
import { getSupabaseImageStorage, BucketName } from "./supabase-image-storage";

// 현재 사용할 저장소 타입 (환경변수로 제어 가능)
type StorageType = "local" | "supabase";

const STORAGE_TYPE: StorageType =
  (process.env.NEXT_PUBLIC_IMAGE_STORAGE as StorageType) || "local";

/**
 * 이미지 저장소 인스턴스 반환
 *
 * 사용법:
 * ```ts
 * const storage = getImageStorage();
 * const result = await storage.upload(file);
 * ```
 *
 * 저장소 전환 방법:
 * 1. .env.local에 NEXT_PUBLIC_IMAGE_STORAGE=supabase 설정
 * 2. 또는 getImageStorage("supabase") 로 직접 지정
 */
export function getImageStorage(
  type?: StorageType,
  bucketName?: BucketName
): ImageStorageAdapter {
  const storageType = type || STORAGE_TYPE;

  switch (storageType) {
    case "supabase":
      return getSupabaseImageStorage(bucketName);

    case "local":
    default:
      return getLocalImageStorage();
  }
}

// 유틸리티 함수 re-export
export * from "./image-utils";
export { getLocalImageStorage } from "./local-image-storage";
export { getSupabaseImageStorage, type BucketName } from "./supabase-image-storage";
