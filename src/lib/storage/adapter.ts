/**
 * LocalStorage Adapter 구현
 *
 * localStorage 접근을 추상화하고 공통 로직 처리:
 * - SSR 안전성 (typeof window 체크)
 * - JSON parse/stringify
 * - Date 필드 복원
 * - 에러 처리 및 fallback
 * - 새 키 네이밍 규칙 (fesmate:v1:scope:domain)
 */

import { StorageAdapter } from "./types";
import { restoreDates, restoreDatesInRecord } from "./date-utils";
import {
  buildUserKey,
  buildSharedKey,
  buildDeviceKey,
  Domain,
} from "./keys";

/**
 * Shared 스코프 adapter 옵션
 */
export interface SharedStorageOptions {
  /** 도메인 이름 */
  domain: Domain;
  /** Date 복원이 필요한 필드 목록 */
  dateFields?: string[];
  /** 중첩 객체 내 Date 필드 (예: "tickets.eventDate") */
  nestedDateFields?: string[];
}

/**
 * User 스코프 adapter factory 옵션
 */
export interface UserStorageOptions {
  /** 도메인 이름 */
  domain: Domain;
  /** Date 복원이 필요한 필드 목록 */
  dateFields?: string[];
  /** 중첩 객체 내 Date 필드 */
  nestedDateFields?: string[];
}

/**
 * Device 스코프 adapter 옵션
 */
export interface DeviceStorageOptions {
  /** 도메인 이름 */
  domain: Domain;
}

/**
 * 내부 adapter 생성 함수
 */
function createAdapterWithKey<T>(
  key: string,
  dateFields: string[] = [],
  nestedDateFields: string[] = []
): StorageAdapter<T> {
  return {
    get(): T | null {
      if (typeof window === "undefined") return null;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        let parsed = JSON.parse(raw);

        // Date 필드 복원
        if (dateFields.length > 0 || nestedDateFields.length > 0) {
          const allDateFields = [...dateFields, ...nestedDateFields];

          // Record<string, T> 형태인지 확인 (배열이 아니고 객체인 경우)
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            // 값이 객체인지 확인하여 Record 형태 판별
            const firstValue = Object.values(parsed)[0];
            if (firstValue && typeof firstValue === "object" && !Array.isArray(firstValue)) {
              parsed = restoreDatesInRecord(parsed, allDateFields);
            } else {
              parsed = restoreDates(parsed, allDateFields);
            }
          } else {
            parsed = restoreDates(parsed, allDateFields);
          }
        }

        return parsed as T;
      } catch (error) {
        console.error(`[Storage] Failed to parse "${key}":`, error);
        // 파싱 실패 시 corrupted 데이터 제거
        try {
          localStorage.removeItem(key);
          console.warn(`[Storage] Removed corrupted data for "${key}"`);
        } catch {
          // removeItem 실패는 무시
        }
        return null;
      }
    },

    set(data: T): void {
      if (typeof window === "undefined") return;

      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error(`[Storage] Failed to save "${key}":`, error);
        // QuotaExceededError 등 처리
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          console.warn(`[Storage] Storage quota exceeded for "${key}"`);
        }
      }
    },

    remove(): void {
      if (typeof window === "undefined") return;

      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`[Storage] Failed to remove "${key}":`, error);
      }
    },

    exists(): boolean {
      if (typeof window === "undefined") return false;

      try {
        return localStorage.getItem(key) !== null;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Shared 스코프 adapter 생성
 *
 * 전역 공유 데이터용 (예: crews, comments)
 * 키 형식: fesmate:v1:shared:{domain}
 *
 * @example
 * ```ts
 * const crewsAdapter = createSharedAdapter<Crew[]>({
 *   domain: DOMAINS.CREWS,
 *   dateFields: ["createdAt"],
 * });
 * ```
 */
export function createSharedAdapter<T>(
  options: SharedStorageOptions
): StorageAdapter<T> {
  const { domain, dateFields = [], nestedDateFields = [] } = options;
  const key = buildSharedKey(domain);
  return createAdapterWithKey<T>(key, dateFields, nestedDateFields);
}

/**
 * User 스코프 adapter factory 생성
 *
 * 개인 데이터용 (userId가 없으면 guest)
 * 키 형식: fesmate:v1:guest:{domain} 또는 fesmate:v1:user:{userId}:{domain}
 *
 * @example
 * ```ts
 * const createWishlistAdapter = createUserAdapter<string[]>({
 *   domain: DOMAINS.WISHLIST,
 * });
 *
 * const adapter = createWishlistAdapter("user123");
 * // 또는 guest: createWishlistAdapter(null);
 * ```
 */
export function createUserAdapter<T>(
  options: UserStorageOptions
): (userId: string | null) => StorageAdapter<T> {
  const { domain, dateFields = [], nestedDateFields = [] } = options;

  return (userId: string | null) => {
    const key = buildUserKey(domain, userId ?? undefined);
    return createAdapterWithKey<T>(key, dateFields, nestedDateFields);
  };
}

/**
 * Device 스코프 adapter 생성
 *
 * 기기별 설정용 (사용자 무관)
 * 키 형식: fesmate:v1:device:{domain}
 *
 * @example
 * ```ts
 * const mapAppAdapter = createDeviceAdapter<MapProvider>({
 *   domain: DOMAINS.MAP_APP,
 * });
 * ```
 */
export function createDeviceAdapter<T>(
  options: DeviceStorageOptions
): StorageAdapter<T> {
  const { domain } = options;
  const key = buildDeviceKey(domain);
  return createAdapterWithKey<T>(key);
}

// ===== 레거시 호환 (마이그레이션 기간 동안만 사용) =====
// 마이그레이션 완료 후 제거 예정

/**
 * @deprecated 레거시 호환용. createSharedAdapter 또는 createUserAdapter 사용
 */
export interface LegacyStorageOptions<T> {
  key: string;
  dateFields?: string[];
  nestedDateFields?: string[];
}

/**
 * @deprecated 레거시 호환용. createSharedAdapter 또는 createUserAdapter 사용
 */
export function createStorageAdapter<T>(
  options: LegacyStorageOptions<T>
): StorageAdapter<T> {
  const { key, dateFields = [], nestedDateFields = [] } = options;
  return createAdapterWithKey<T>(key, dateFields, nestedDateFields);
}

/**
 * @deprecated 레거시 호환용. createUserAdapter 사용
 */
export function createUserStorageAdapter<T>(
  options: Omit<LegacyStorageOptions<T>, "key"> & { keyPrefix: string }
): (userId: string | null) => StorageAdapter<T> {
  const { keyPrefix, dateFields = [], nestedDateFields = [] } = options;

  return (userId: string | null) => {
    const key = `${keyPrefix}${userId || "guest"}`;
    return createAdapterWithKey<T>(key, dateFields, nestedDateFields);
  };
}
