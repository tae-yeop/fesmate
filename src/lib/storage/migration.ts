/**
 * Storage Migration v1
 *
 * 레거시 키(fesmate_xxx)를 새 키 형식(fesmate:v1:xxx)으로 마이그레이션
 *
 * 마이그레이션 규칙:
 * 1. 앱 시작 시 1회만 실행 (완료 플래그로 체크)
 * 2. 레거시 데이터가 있으면 새 키로 이동
 * 3. 새 키에 이미 데이터가 있으면 병합 정책 적용
 * 4. 성공 시에만 레거시 키 삭제
 */

import {
  buildKey,
  buildUserKey,
  buildSharedKey,
  buildDeviceKey,
  DOMAINS,
  LEGACY_KEY_MAPPINGS,
  LegacyKeyMapping,
  Domain,
} from "./keys";

// 마이그레이션 완료 플래그 키
const MIGRATION_FLAG_KEY = "fesmate:v1:migrated";
const MIGRATION_VERSION = "1";

/**
 * 마이그레이션이 이미 완료되었는지 확인
 */
export function isMigrationCompleted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MIGRATION_FLAG_KEY) === MIGRATION_VERSION;
}

/**
 * 마이그레이션 완료 표시
 */
function markMigrationComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MIGRATION_FLAG_KEY, MIGRATION_VERSION);
}

/**
 * 배열 데이터 병합 (중복 제거)
 * ID 기반 또는 값 기반으로 중복 제거
 */
function mergeArrays<T>(oldData: T[], newData: T[]): T[] {
  // ID가 있는 객체 배열인 경우
  if (
    oldData.length > 0 &&
    typeof oldData[0] === "object" &&
    oldData[0] !== null &&
    "id" in (oldData[0] as object)
  ) {
    const newIds = new Set((newData as Array<{ id: string }>).map((item) => item.id));
    const uniqueOld = (oldData as Array<{ id: string }>).filter((item) => !newIds.has(item.id));
    return [...newData, ...(uniqueOld as T[])];
  }

  // 단순 값 배열인 경우 (string[], number[] 등)
  return [...new Set([...newData, ...oldData])];
}

/**
 * 객체 데이터 병합 (새 데이터 우선)
 */
function mergeObjects<T extends Record<string, unknown>>(oldData: T, newData: T): T {
  const result = { ...oldData };

  for (const key of Object.keys(newData)) {
    const newValue = newData[key];
    const oldValue = result[key];

    if (newValue === undefined || newValue === null) {
      continue; // 새 데이터가 없으면 기존 유지
    }

    if (Array.isArray(newValue) && Array.isArray(oldValue)) {
      (result as Record<string, unknown>)[key] = mergeArrays(oldValue, newValue);
    } else if (
      typeof newValue === "object" &&
      newValue !== null &&
      typeof oldValue === "object" &&
      oldValue !== null &&
      !Array.isArray(newValue)
    ) {
      (result as Record<string, unknown>)[key] = mergeObjects(
        oldValue as Record<string, unknown>,
        newValue as Record<string, unknown>
      );
    } else {
      (result as Record<string, unknown>)[key] = newValue; // 새 데이터 우선
    }
  }

  return result;
}

/**
 * 데이터 병합 (타입에 따라 적절한 방식 선택)
 */
function mergeData<T>(oldData: T, newData: T): T {
  if (Array.isArray(oldData) && Array.isArray(newData)) {
    return mergeArrays(oldData, newData) as T;
  }

  if (typeof oldData === "object" && oldData !== null && typeof newData === "object" && newData !== null) {
    return mergeObjects(oldData as Record<string, unknown>, newData as Record<string, unknown>) as T;
  }

  // 기본 타입은 새 데이터 우선
  return newData;
}

/**
 * 단일 키 마이그레이션
 */
function migrateKey(oldKey: string, newKey: string): boolean {
  try {
    const oldData = localStorage.getItem(oldKey);
    if (!oldData) return true; // 레거시 데이터 없음 = 성공

    const existingNew = localStorage.getItem(newKey);

    if (existingNew) {
      // 새 키에 이미 데이터가 있으면 병합
      try {
        const oldParsed = JSON.parse(oldData);
        const newParsed = JSON.parse(existingNew);
        const merged = mergeData(oldParsed, newParsed);
        localStorage.setItem(newKey, JSON.stringify(merged));
      } catch {
        // 파싱 실패 시 새 데이터 유지
        console.warn(`[Migration] Failed to merge ${oldKey}, keeping new data`);
      }
    } else {
      // 새 키에 데이터 없으면 단순 이동
      localStorage.setItem(newKey, oldData);
    }

    // 성공적으로 이동했으면 레거시 키 삭제
    localStorage.removeItem(oldKey);
    return true;
  } catch (error) {
    console.error(`[Migration] Failed to migrate ${oldKey}:`, error);
    return false;
  }
}

/**
 * 모든 레거시 키 마이그레이션 (v1)
 *
 * @param userId 현재 로그인한 사용자 ID (없으면 guest로 처리)
 */
export function migrateToV1(userId?: string): void {
  if (typeof window === "undefined") return;
  if (isMigrationCompleted()) return;

  console.log("[Migration] Starting v1 migration...");

  let allSuccess = true;

  for (const mapping of LEGACY_KEY_MAPPINGS) {
    const { oldKey, domain, scopeType } = mapping;

    // 새 키 생성
    let newKey: string;
    switch (scopeType) {
      case "user":
        newKey = buildUserKey(domain, userId);
        break;
      case "shared":
        newKey = buildSharedKey(domain);
        break;
      case "device":
        newKey = buildDeviceKey(domain);
        break;
    }

    // 레거시 키 처리
    if (typeof oldKey === "function") {
      // User-scoped 키 (userId 패턴)
      // 기존 사용자 데이터 마이그레이션
      if (userId) {
        const oldKeyStr = oldKey(userId);
        if (!migrateKey(oldKeyStr, newKey)) {
          allSuccess = false;
        }
      }

      // Guest 데이터도 마이그레이션 (user1 등 기본 mock userId)
      const mockUserIds = ["user1", "user2", "user3", "user4", "user5", "user6"];
      for (const mockId of mockUserIds) {
        const oldKeyStr = oldKey(mockId);
        // 현재 userId와 다른 mock 사용자의 데이터는 해당 사용자 키로 이동
        const targetKey = userId === mockId ? newKey : buildUserKey(domain, mockId);
        if (!migrateKey(oldKeyStr, targetKey)) {
          allSuccess = false;
        }
      }
    } else {
      // 전역 키
      if (!migrateKey(oldKey, newKey)) {
        allSuccess = false;
      }
    }
  }

  if (allSuccess) {
    markMigrationComplete();
    console.log("[Migration] v1 migration completed successfully");
  } else {
    console.warn("[Migration] v1 migration completed with some errors");
  }
}

/**
 * Guest 데이터를 User 데이터로 병합
 *
 * 로그인 시 호출하여 비로그인 상태에서 저장한 데이터를 사용자 데이터로 병합
 */
export function mergeGuestToUser(userId: string): void {
  if (typeof window === "undefined") return;

  console.log(`[Migration] Merging guest data to user: ${userId}`);

  // 병합 대상 도메인 (개인 데이터만)
  const userScopedDomains: Domain[] = [
    DOMAINS.WISHLIST,
    DOMAINS.ATTENDED,
    DOMAINS.BADGES,
    DOMAINS.BLOCKS,
    DOMAINS.JOIN_REQUESTS,
    DOMAINS.TIMETABLES,
    DOMAINS.SHARED_TIMETABLES,
    DOMAINS.OVERLAY_FRIENDS,
    DOMAINS.TICKETBOOK,
    DOMAINS.HELPFUL,
    DOMAINS.CALLGUIDE_HELPFUL,
    DOMAINS.NOTIFICATIONS,
  ];

  for (const domain of userScopedDomains) {
    const guestKey = buildKey({ scope: "guest", domain });
    const userKey = buildKey({ scope: "user", userId, domain });

    try {
      const guestData = localStorage.getItem(guestKey);
      if (!guestData) continue; // Guest 데이터 없음

      const userData = localStorage.getItem(userKey);

      if (!userData) {
        // User 데이터 없으면 Guest 데이터를 그대로 이동
        localStorage.setItem(userKey, guestData);
      } else {
        // 둘 다 있으면 병합 (User 우선)
        try {
          const guestParsed = JSON.parse(guestData);
          const userParsed = JSON.parse(userData);
          const merged = mergeData(guestParsed, userParsed);
          localStorage.setItem(userKey, JSON.stringify(merged));
        } catch {
          console.warn(`[Migration] Failed to merge guest data for ${domain}`);
          continue;
        }
      }

      // Guest 데이터 삭제
      localStorage.removeItem(guestKey);
      console.log(`[Migration] Merged guest data for ${domain}`);
    } catch (error) {
      console.error(`[Migration] Error merging ${domain}:`, error);
    }
  }
}

/**
 * 마이그레이션 상태 초기화 (개발/테스트용)
 */
export function resetMigration(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MIGRATION_FLAG_KEY);
  console.log("[Migration] Migration flag reset");
}
