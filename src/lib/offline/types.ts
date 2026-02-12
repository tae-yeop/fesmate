/**
 * 오프라인 저장소 타입 정의
 *
 * 모바일 앱 서비스 표준 전략 적용:
 * - 임시저장 데이터 7일 보관
 * - 동기화 대기열 재시도 로직
 * - 50MB 이하 저장 목표
 */

import { PostType } from "@/types/post";

// ============================================================
// Draft (임시저장) 타입
// ============================================================

/**
 * 임시저장 데이터 기본 구조
 */
export interface DraftBase {
  /** 고유 식별자 (UUID) */
  id: string;
  /** 저장 시점 */
  savedAt: Date;
  /** 만료 시점 (기본 7일) */
  expiresAt: Date;
  /** 사용자 ID (null = guest) */
  userId: string | null;
}

/**
 * 글 임시저장
 */
export interface PostDraft extends DraftBase {
  type: "post";
  /** 행사 ID */
  eventId: string | null;
  /** 글 타입 */
  postType: PostType | null;
  /** 본문 */
  content: string;
  /** 만남 시간 (ISO string) */
  meetTime?: string;
  /** 장소명 */
  placeText?: string;
  /** 장소 힌트 */
  placeHint?: string;
  /** 모집 인원 */
  maxPeople?: number;
  /** 영상 URL */
  videoUrl?: string;
  /** 별점 (후기용) */
  rating?: number;
  /** 첨부 이미지 (base64 or URL) */
  imageUrls?: string[];
}

/**
 * 댓글 임시저장
 */
export interface CommentDraft extends DraftBase {
  type: "comment";
  /** 대상 글 ID */
  postId: string;
  /** 부모 댓글 ID (대댓글인 경우) */
  parentId?: string;
  /** 댓글 내용 */
  content: string;
}

/**
 * 모든 Draft 타입 유니온
 */
export type Draft = PostDraft | CommentDraft;

// ============================================================
// Sync Queue (동기화 대기열) 타입
// ============================================================

/**
 * 동기화 작업 상태
 */
export type SyncStatus = "pending" | "syncing" | "failed" | "completed";

/**
 * 동기화 작업 타입
 */
export type SyncActionType =
  | "create_post"
  | "update_post"
  | "delete_post"
  | "create_comment"
  | "update_comment"
  | "delete_comment"
  | "toggle_helpful"
  | "toggle_wishlist";

/**
 * 동기화 대기열 항목
 */
export interface SyncQueueItem {
  /** 고유 식별자 */
  id: string;
  /** 작업 타입 */
  action: SyncActionType;
  /** 작업 데이터 (JSON) */
  payload: Record<string, unknown>;
  /** 상태 */
  status: SyncStatus;
  /** 생성 시점 */
  createdAt: Date;
  /** 마지막 시도 시점 */
  lastAttemptAt?: Date;
  /** 재시도 횟수 */
  retryCount: number;
  /** 최대 재시도 횟수 */
  maxRetries: number;
  /** 에러 메시지 */
  error?: string;
  /** 사용자 ID */
  userId: string | null;
}

// ============================================================
// IndexedDB 스키마
// ============================================================

/**
 * IndexedDB 스토어 이름
 */
export const STORE_NAMES = {
  DRAFTS: "drafts",
  SYNC_QUEUE: "syncQueue",
  METADATA: "metadata",
} as const;

/**
 * 메타데이터 항목
 */
export interface MetadataItem {
  key: string;
  value: unknown;
  updatedAt: Date;
}

// ============================================================
// 설정 상수
// ============================================================

/**
 * 오프라인 저장소 설정
 */
export const OFFLINE_CONFIG = {
  /** DB 이름 */
  DB_NAME: "fesmate-offline",
  /** DB 버전 */
  DB_VERSION: 1,
  /** 임시저장 보관 기간 (일) */
  DRAFT_RETENTION_DAYS: 7,
  /** 자동저장 디바운스 (ms) */
  AUTOSAVE_DEBOUNCE_MS: 1000,
  /** 동기화 재시도 최대 횟수 */
  MAX_SYNC_RETRIES: 5,
  /** 동기화 재시도 간격 (ms) - 지수 백오프 기준 */
  SYNC_RETRY_BASE_MS: 1000,
  /** 저장소 용량 경고 임계치 (bytes) - 50MB */
  STORAGE_WARNING_THRESHOLD: 50 * 1024 * 1024,
  /** 저장소 용량 한계 (bytes) - 80MB */
  STORAGE_LIMIT: 80 * 1024 * 1024,
} as const;

// ============================================================
// 유틸리티 타입
// ============================================================

/**
 * 저장소 사용량 정보
 */
export interface StorageUsage {
  /** 사용 중인 바이트 */
  usedBytes: number;
  /** 할당량 바이트 */
  quotaBytes: number;
  /** 사용률 (0-1) */
  usageRatio: number;
  /** 경고 수준인지 */
  isWarning: boolean;
  /** 한계 도달인지 */
  isLimitReached: boolean;
}

/**
 * 오프라인 상태
 */
export interface OfflineState {
  /** 온라인 여부 */
  isOnline: boolean;
  /** 임시저장 개수 */
  draftCount: number;
  /** 동기화 대기 개수 */
  pendingSyncCount: number;
  /** 마지막 동기화 시점 */
  lastSyncAt?: Date;
  /** 저장소 사용량 */
  storageUsage?: StorageUsage;
}
