# localStorage 리팩토링 계획

> **목적**: localStorage 접근을 단일 레이어로 추상화하고, 키 네이밍 규칙을 통일하여 유지보수성과 안정성 향상

---

## 현황 분석 (2024-12-24 업데이트)

### 1. localStorage 사용 현황 상세

#### 1.1 userId 포함 키 (9개) - 사용자별 데이터 격리됨

| 파일 | 키 생성 함수 | 키 패턴 | 데이터 Shape | Date 필드 |
|------|-------------|---------|-------------|-----------|
| [badge-context.tsx](../../src/lib/badge-context.tsx):42 | `getStorageKey(userId)` | `fesmate_badges_{userId}` | `Badge[]` | `earnedAt` |
| [block-context.tsx](../../src/lib/block-context.tsx):22 | `STORAGE_KEY_PREFIX + userId` | `fesmate_blocked_users_{userId}` | `Block[]` | `blockedAt` |
| [join-context.tsx](../../src/lib/join-context.tsx):38 | `STORAGE_KEY_PREFIX + userId` | `fesmate_join_requests_{userId}` | `JoinRequest[]` | `createdAt` |
| [my-timetable-context.tsx](../../src/lib/my-timetable-context.tsx):21 | `getStorageKey(userId)` | `fesmate_my_timetables_{userId}` | `Record<eventId, Timetable>` | 없음 |
| [my-timetable-context.tsx](../../src/lib/my-timetable-context.tsx):22 | `getSharedStorageKey(userId)` | `fesmate_shared_timetables_{userId}` | `SharedTimetable[]` | `sharedAt` |
| [my-timetable-context.tsx](../../src/lib/my-timetable-context.tsx):23 | `getOverlayStorageKey(userId)` | `fesmate_overlay_friends_{userId}` | `Record<eventId, string[]>` | 없음 |
| [ticketbook-context.tsx](../../src/lib/ticketbook-context.tsx):51 | `getStorageKey(userId)` | `fesmate_ticketbook_{userId}` | `{ tickets, sortBy, sortOrder }` | `eventDate, createdAt` |
| [wishlist-context.tsx](../../src/lib/wishlist-context.tsx):26 | `getWishlistStorageKey(userId)` | `fesmate_wishlist_{userId}` | `string[]` (eventIds) | 없음 |
| [wishlist-context.tsx](../../src/lib/wishlist-context.tsx):27 | `getAttendedStorageKey(userId)` | `fesmate_attended_{userId}` | `string[]` (eventIds) | 없음 |

#### 1.2 userId 미포함 키 (17개) - 다중 사용자 데이터 혼합 위험

| 파일 | 상수명 | 키 이름 | 데이터 Shape | Date 필드 | 문제 |
|------|--------|---------|-------------|-----------|------|
| [call-guide-context.tsx](../../src/lib/call-guide-context.tsx):54 | `STORAGE_KEY_SONGS` | `fesmate_songs` | `Song[]` | 없음 | 전역 캐시 (OK) |
| [call-guide-context.tsx](../../src/lib/call-guide-context.tsx):55 | `STORAGE_KEY_CALL_GUIDES` | `fesmate_call_guides` | `CallGuide[]` | `createdAt, updatedAt` | 전역 캐시 (OK) |
| [call-guide-context.tsx](../../src/lib/call-guide-context.tsx):56 | `STORAGE_KEY_VERSIONS` | `fesmate_call_guide_versions` | `CallGuideVersion[]` | `createdAt` | 전역 캐시 (OK) |
| [call-guide-context.tsx](../../src/lib/call-guide-context.tsx):57 | `STORAGE_KEY_HELPFUL` | `fesmate_call_guide_helpful` | `Record<guideId, boolean>` | 없음 | **userId 필요** |
| [comment-context.tsx](../../src/lib/comment-context.tsx):86 | `STORAGE_KEY` | `fesmate_comments` | `Comment[]` | `createdAt, updatedAt` | **userId 필요** |
| [companion-context.tsx](../../src/lib/companion-context.tsx):78 | `STORAGE_KEY_COMPANION` | `fesmate_companion_requests` | `CompanionRequest[]` | `createdAt` | **userId 필요** |
| [crew-context.tsx](../../src/lib/crew-context.tsx):313 | `STORAGE_KEY_CREWS` | `fesmate_crews` | `Crew[]` | `createdAt` | 전역 캐시 (OK) |
| [crew-context.tsx](../../src/lib/crew-context.tsx):314 | `STORAGE_KEY_MEMBERS` | `fesmate_crew_members` | `CrewMember[]` | `joinedAt` | 전역 캐시 (OK) |
| [crew-context.tsx](../../src/lib/crew-context.tsx):315 | `STORAGE_KEY_ACTIVITIES` | `fesmate_crew_activities` | `CrewActivity[]` | `createdAt` | 전역 캐시 (OK) |
| [crew-context.tsx](../../src/lib/crew-context.tsx):316 | `STORAGE_KEY_CREW_EVENTS` | `fesmate_crew_events` | `CrewEvent[]` | 없음 | 전역 캐시 (OK) |
| [crew-context.tsx](../../src/lib/crew-context.tsx):317 | `STORAGE_KEY_JOIN_REQUESTS` | `fesmate_crew_join_requests` | `CrewJoinRequest[]` | `createdAt` | **userId 필요** |
| [crew-context.tsx](../../src/lib/crew-context.tsx):318 | `STORAGE_KEY_ANNOUNCEMENTS` | `fesmate_crew_announcements` | `CrewAnnouncement[]` | `createdAt` | 전역 캐시 (OK) |
| [follow-context.tsx](../../src/lib/follow-context.tsx):203 | `STORAGE_KEY_FOLLOWS` | `fesmate_follows` | `Follow[]` | `followedAt` | **userId 필요** |
| [helpful-context.tsx](../../src/lib/helpful-context.tsx):20 | `STORAGE_KEY` | `fesmate_helpful_posts` | `Record<postId, {count, helpful}>` | 없음 | **userId 필요** |
| [notification-context.tsx](../../src/lib/notification-context.tsx):57 | `STORAGE_KEY_NOTIFICATIONS` | `fesmate_notifications` | `Notification[]` | `createdAt` | **userId 필요** |
| [participation-context.tsx](../../src/lib/participation-context.tsx):162 | `STORAGE_KEY_PARTICIPATION` | `fesmate_participation_requests` | `ParticipationRequest[]` | `createdAt` | **userId 필요** |
| [user-profile-context.tsx](../../src/lib/user-profile-context.tsx):106 | `STORAGE_KEY` | `fesmate_user_profiles` | `Record<userId, UserProfile>` | 없음 | 전역 캐시 (OK) |

#### 1.3 설정/유틸 키 (2개)

| 파일 | 상수명 | 키 이름 | 데이터 Shape | 용도 |
|------|--------|---------|-------------|------|
| [useTicketView.ts](../../src/components/ticketbook/useTicketView.ts):6 | `STORAGE_KEY` | `fesmate_ticketbook_view` | `"portrait" \| "landscape" \| "auto"` | 뷰 모드 설정 |
| [map-deeplink.ts](../../src/lib/utils/map-deeplink.ts):50 | `STORAGE_KEY` | `fesmate_default_map_app` | `MapProvider` | 기본 지도앱 |

#### 1.4 이미지 저장 (기존 storage 모듈)

| 파일 | 상수명 | 키 이름 | 데이터 Shape |
|------|--------|---------|-------------|
| [local-image-storage.ts](../../src/lib/storage/local-image-storage.ts):18 | `STORAGE_KEY` | `fesmate_images` | `StoredImage[]` |

### 2. 문제 요약

#### userId 필요한 키 (8개) - 데이터 혼합 위험
1. `fesmate_call_guide_helpful` - 사용자별 "도움됨" 반응
2. `fesmate_comments` - 사용자별 댓글 (authorId는 있지만 키가 전역)
3. `fesmate_companion_requests` - 동행 요청 (senderId/receiverId 있지만 키가 전역)
4. `fesmate_crew_join_requests` - 크루 가입 신청
5. `fesmate_follows` - 팔로우 관계
6. `fesmate_helpful_posts` - 도움됨 반응
7. `fesmate_notifications` - 알림
8. `fesmate_participation_requests` - 참여 신청

#### 전역 캐시로 유지 가능한 키 (8개)
- songs, call_guides, call_guide_versions - 콘텐츠 캐시
- crews, crew_members, crew_activities, crew_events, crew_announcements - 크루 공용 데이터
- user_profiles - 프로필 캐시

### 3. 발견된 문제점

#### 문제 1: userId 미포함 키 (8개 수정 필요)
- 다중 사용자 환경에서 데이터 혼합 위험
- 예: user1이 작성한 댓글이 user2 화면에도 표시
- 위 "2. 문제 요약" 참조

#### 문제 2: Date 복원 로직 중복 (12개 Context)
```typescript
// 모든 Context에서 반복되는 패턴
const parsed = JSON.parse(data);
const restored = parsed.map((item) => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
}));
```
Date 필드가 있는 Context: badge, block, join, ticketbook, call-guide, comment, companion, crew(5개), follow, notification, participation

#### 문제 3: 추상화 레이어 부재
- 각 Context가 직접 localStorage 호출 (17개 파일)
- 테스트 어려움, 코드 중복
- 총 localStorage 호출: 70+ 위치

#### 문제 4: 키 네이밍 불일치
- 패턴 A: `fesmate_{domain}_{userId}` (9개)
- 패턴 B: `fesmate_{domain}` (17개 - userId 없음)
- 버전 관리 없음 (스키마 변경 시 마이그레이션 불가)

---

## 리팩토링 계획

### Phase 1: 런타임 안전성 점검 (커밋 1) - ✅ 완료

**분석 결과**:
- `.prev` 오타: **없음** (모든 71개 사용 정상)
- JSON.parse 예외 처리: **모두 try-catch 적용됨**
- 타입 안전성: **TypeScript로 보장됨**

**결론**: 런타임 오류 없음. Phase 2로 바로 진행.

---

### Phase 2: Storage Adapter 도입 (커밋 2)

**목표**: localStorage 접근을 단일 레이어로 추상화

#### 2.0 권장 파일 구조

```
src/lib/storage/
├── index.ts                    # Public exports
├── types.ts                    # StorageAdapter 인터페이스
├── adapter.ts                  # createLocalStorageAdapter 구현
├── keys.ts                     # 키 생성 유틸리티 (Phase 3에서 확장)
├── date-utils.ts               # Date 복원 유틸리티
├── local-image-storage.ts      # (기존) 이미지 저장
└── hooks/
    ├── useStorage.ts           # 범용 스토리지 훅
    ├── useUserStorage.ts       # userId 기반 스토리지 훅
    └── useGlobalStorage.ts     # 전역 캐시용 스토리지 훅
```

**기존 파일과의 관계**:
- `local-image-storage.ts`: 유지 (이미지 전용)
- 새 모듈: 일반 JSON 데이터용

#### 2.1 Storage Adapter 인터페이스

```typescript
// src/lib/storage/storage-adapter.ts

export interface StorageAdapter<T> {
  get(): T | null;
  set(data: T): void;
  remove(): void;
  exists(): boolean;
}

export interface StorageOptions<T> {
  key: string;
  defaultValue: T;
  dateFields?: string[];  // Date로 복원할 필드명
  version?: number;
}
```

#### 2.2 LocalStorage 구현체

```typescript
// src/lib/storage/local-storage-adapter.ts

export function createLocalStorageAdapter<T>(
  options: StorageOptions<T>
): StorageAdapter<T> {
  const { key, defaultValue, dateFields = [] } = options;

  return {
    get(): T | null {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        return restoreDates(parsed, dateFields);
      } catch (error) {
        console.error(`[Storage] Failed to parse ${key}:`, error);
        return null;
      }
    },

    set(data: T): void {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error(`[Storage] Failed to save ${key}:`, error);
      }
    },

    remove(): void {
      if (typeof window === "undefined") return;
      localStorage.removeItem(key);
    },

    exists(): boolean {
      if (typeof window === "undefined") return false;
      return localStorage.getItem(key) !== null;
    },
  };
}

// Date 복원 유틸리티
function restoreDates<T>(data: T, dateFields: string[]): T {
  if (Array.isArray(data)) {
    return data.map((item) => restoreDatesInObject(item, dateFields)) as T;
  }
  return restoreDatesInObject(data, dateFields);
}

function restoreDatesInObject<T extends Record<string, any>>(
  obj: T,
  dateFields: string[]
): T {
  const result = { ...obj };
  dateFields.forEach((field) => {
    if (result[field]) {
      result[field] = new Date(result[field]);
    }
  });
  return result;
}
```

#### 2.3 Repository 패턴

```typescript
// src/lib/storage/repositories/comment-repository.ts

import { createLocalStorageAdapter } from "../local-storage-adapter";
import { Comment } from "@/types/comment";
import { getStorageKey } from "../storage-keys";

export function createCommentRepository(userId: string | null) {
  const key = getStorageKey("comments", userId);

  const adapter = createLocalStorageAdapter<Comment[]>({
    key,
    defaultValue: [],
    dateFields: ["createdAt", "updatedAt"],
  });

  return {
    getAll: () => adapter.get() ?? [],
    save: (comments: Comment[]) => adapter.set(comments),
    add: (comment: Comment) => {
      const current = adapter.get() ?? [];
      adapter.set([...current, comment]);
    },
    remove: (commentId: string) => {
      const current = adapter.get() ?? [];
      adapter.set(current.filter((c) => c.id !== commentId));
    },
    clear: () => adapter.remove(),
  };
}
```

#### 2.4 Context 리팩토링 예시

**Before (CommentContext)**:
```typescript
useEffect(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const restored = parsed.map((c: Comment) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : undefined,
      }));
      setComments(restored);
    }
  } catch (error) {
    console.error("Failed to load comments:", error);
  }
}, []);
```

**After**:
```typescript
const repository = useMemo(
  () => createCommentRepository(currentUserId),
  [currentUserId]
);

useEffect(() => {
  setComments(repository.getAll());
}, [repository]);

useEffect(() => {
  repository.save(comments);
}, [comments, repository]);
```

---

### Phase 3: 키 네이밍 규칙 통일 (커밋 3)

**목표**: 일관된 키 네이밍 규칙 적용

#### 3.1 키 네이밍 규칙

```
fesmate:{version}:{namespace}:{scope}:{identifier}

- version: 스키마 버전 (v1, v2, ...)
- namespace: 도메인 (user, content, social, guide, settings)
- scope: user_{userId} | global | guest
- identifier: 데이터 식별자 (comments, wishlist, ...)
```

#### 3.2 키 생성 유틸리티

```typescript
// src/lib/storage/storage-keys.ts

const STORAGE_VERSION = "v1";
const STORAGE_PREFIX = "fesmate";

type Namespace = "user" | "content" | "social" | "guide" | "settings";

interface KeyConfig {
  namespace: Namespace;
  identifier: string;
  requiresUserId: boolean;
}

const KEY_CONFIGS: Record<string, KeyConfig> = {
  // User namespace (userId 필수)
  wishlist: { namespace: "user", identifier: "wishlist", requiresUserId: true },
  attended: { namespace: "user", identifier: "attended", requiresUserId: true },
  badges: { namespace: "user", identifier: "badges", requiresUserId: true },
  blocks: { namespace: "user", identifier: "blocks", requiresUserId: true },
  timetables: { namespace: "user", identifier: "timetables", requiresUserId: true },
  ticketbook: { namespace: "user", identifier: "ticketbook", requiresUserId: true },
  notifications: { namespace: "user", identifier: "notifications", requiresUserId: true },

  // Content namespace (userId 필수)
  comments: { namespace: "content", identifier: "comments", requiresUserId: true },
  helpful: { namespace: "content", identifier: "helpful", requiresUserId: true },

  // Social namespace (userId 필수)
  follows: { namespace: "social", identifier: "follows", requiresUserId: true },
  crews: { namespace: "social", identifier: "crews", requiresUserId: false },  // 전역 데이터
  participation: { namespace: "social", identifier: "participation", requiresUserId: true },
  companion: { namespace: "social", identifier: "companion", requiresUserId: true },

  // Guide namespace (전역)
  songs: { namespace: "guide", identifier: "songs", requiresUserId: false },
  callGuides: { namespace: "guide", identifier: "call-guides", requiresUserId: false },

  // Settings namespace (userId 필수)
  mapApp: { namespace: "settings", identifier: "map-app", requiresUserId: true },
  ticketView: { namespace: "settings", identifier: "ticket-view", requiresUserId: true },
  profiles: { namespace: "settings", identifier: "profiles", requiresUserId: false },
};

export function getStorageKey(
  configKey: keyof typeof KEY_CONFIGS,
  userId: string | null
): string {
  const config = KEY_CONFIGS[configKey];
  const scope = config.requiresUserId
    ? userId
      ? `user_${userId}`
      : "guest"
    : "global";

  return `${STORAGE_PREFIX}:${STORAGE_VERSION}:${config.namespace}:${scope}:${config.identifier}`;
}

// 예시 출력:
// getStorageKey("comments", "user123")
//   → "fesmate:v1:content:user_user123:comments"
// getStorageKey("songs", null)
//   → "fesmate:v1:guide:global:songs"
// getStorageKey("wishlist", null)
//   → "fesmate:v1:user:guest:wishlist"
```

#### 3.3 마이그레이션 유틸리티

```typescript
// src/lib/storage/migration.ts

const OLD_KEY_MAPPINGS: Record<string, (userId: string | null) => string> = {
  "fesmate_comments": (userId) => getStorageKey("comments", userId),
  "fesmate_wishlist_": (userId) => getStorageKey("wishlist", userId),
  // ... 모든 기존 키 매핑
};

export function migrateStorageKeys(userId: string | null): void {
  if (typeof window === "undefined") return;

  const migrated = localStorage.getItem("fesmate:migration:v1");
  if (migrated === "done") return;

  Object.entries(OLD_KEY_MAPPINGS).forEach(([oldKeyPattern, getNewKey]) => {
    const newKey = getNewKey(userId);

    // 기존 데이터 찾기
    const oldKey = oldKeyPattern.endsWith("_")
      ? `${oldKeyPattern}${userId || "guest"}`
      : oldKeyPattern;

    const oldData = localStorage.getItem(oldKey);
    if (oldData && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldData);
      console.log(`[Migration] ${oldKey} → ${newKey}`);
    }
  });

  localStorage.setItem("fesmate:migration:v1", "done");
}
```

---

## 파일 구조

```
src/lib/storage/
├── index.ts                    # Public exports
├── storage-adapter.ts          # 인터페이스 정의
├── local-storage-adapter.ts    # localStorage 구현체
├── storage-keys.ts             # 키 생성 유틸리티
├── migration.ts                # 마이그레이션 유틸리티
├── utils.ts                    # Date 복원 등 유틸리티
└── repositories/
    ├── index.ts
    ├── comment-repository.ts
    ├── wishlist-repository.ts
    ├── badge-repository.ts
    ├── block-repository.ts
    ├── crew-repository.ts
    ├── follow-repository.ts
    ├── helpful-repository.ts
    ├── notification-repository.ts
    ├── participation-repository.ts
    ├── timetable-repository.ts
    ├── ticketbook-repository.ts
    ├── call-guide-repository.ts
    └── settings-repository.ts
```

---

## 구현 순서

### 커밋 1: 런타임 오류 수정
```
fix: localStorage 런타임 오류 수정

- JSON.parse 실패 시 폴백 로직 보완
- 타입 안전성 강화
```

### 커밋 2: Storage Adapter 도입
```
refactor: localStorage Storage Adapter 패턴 도입

- StorageAdapter 인터페이스 및 구현체 추가
- Repository 패턴으로 CRUD 추상화
- 모든 Context를 Repository 사용하도록 마이그레이션
- Date 복원 로직 중앙화
```

### 커밋 3: 키 네이밍 통일
```
refactor: localStorage 키 네이밍 규칙 통일

- 새 키 포맷: fesmate:{version}:{namespace}:{scope}:{identifier}
- userId/guest 분리 적용
- 기존 데이터 마이그레이션 유틸리티 추가
- 버전 관리 기반 마련
```

---

## 테스트 체크리스트

- [ ] 모든 Context가 정상 동작
- [ ] 사용자 전환 시 데이터 격리 확인
- [ ] guest → 로그인 시 데이터 유지/병합
- [ ] 기존 데이터 마이그레이션 성공
- [ ] SSR 환경에서 에러 없음
- [ ] 빌드 성공

---

## 예상 시간

| Phase | 예상 시간 | 상태 |
|-------|----------|------|
| Phase 1: 런타임 안전성 점검 | - | ✅ 완료 |
| Phase 2: Storage Adapter 도입 | 4시간 | 📋 예정 |
| Phase 3: 키 네이밍 통일 | 2시간 | 📋 예정 |
| **총계** | **6시간** | |

---

## Context별 마이그레이션 포인트

### 우선순위 1: userId 추가 필요 (데이터 격리 문제)

| Context | 현재 키 | 변경 후 키 | 수정 사항 |
|---------|--------|-----------|----------|
| CommentContext | `fesmate_comments` | `fesmate:v1:content:user_{userId}:comments` | userId 파라미터 추가, useAuth 연동 |
| HelpfulContext | `fesmate_helpful_posts` | `fesmate:v1:content:user_{userId}:helpful` | userId 파라미터 추가 |
| FollowContext | `fesmate_follows` | `fesmate:v1:social:user_{userId}:follows` | userId 파라미터 추가 |
| NotificationContext | `fesmate_notifications` | `fesmate:v1:user:user_{userId}:notifications` | userId 파라미터 추가 |
| ParticipationContext | `fesmate_participation_requests` | `fesmate:v1:social:user_{userId}:participation` | userId 파라미터 추가 |
| CompanionContext | `fesmate_companion_requests` | `fesmate:v1:social:user_{userId}:companion` | userId 파라미터 추가 |
| CrewContext (join_requests) | `fesmate_crew_join_requests` | `fesmate:v1:social:user_{userId}:crew_join_requests` | userId 파라미터 추가 |
| CallGuideContext (helpful) | `fesmate_call_guide_helpful` | `fesmate:v1:guide:user_{userId}:call_guide_helpful` | userId 파라미터 추가 |

### 우선순위 2: 이미 userId 포함 (키 형식만 통일)

| Context | 현재 키 | 변경 후 키 |
|---------|--------|-----------|
| BadgeContext | `fesmate_badges_{userId}` | `fesmate:v1:user:user_{userId}:badges` |
| BlockContext | `fesmate_blocked_users_{userId}` | `fesmate:v1:user:user_{userId}:blocks` |
| JoinContext | `fesmate_join_requests_{userId}` | `fesmate:v1:social:user_{userId}:join_requests` |
| WishlistContext | `fesmate_wishlist_{userId}` | `fesmate:v1:user:user_{userId}:wishlist` |
| WishlistContext | `fesmate_attended_{userId}` | `fesmate:v1:user:user_{userId}:attended` |
| TicketbookContext | `fesmate_ticketbook_{userId}` | `fesmate:v1:user:user_{userId}:ticketbook` |
| MyTimetableContext | `fesmate_my_timetables_{userId}` | `fesmate:v1:user:user_{userId}:timetables` |
| MyTimetableContext | `fesmate_shared_timetables_{userId}` | `fesmate:v1:user:user_{userId}:shared_timetables` |
| MyTimetableContext | `fesmate_overlay_friends_{userId}` | `fesmate:v1:user:user_{userId}:overlay_friends` |

### 우선순위 3: 전역 캐시 (키 형식만 통일)

| Context | 현재 키 | 변경 후 키 |
|---------|--------|-----------|
| CallGuideContext | `fesmate_songs` | `fesmate:v1:guide:global:songs` |
| CallGuideContext | `fesmate_call_guides` | `fesmate:v1:guide:global:call_guides` |
| CallGuideContext | `fesmate_call_guide_versions` | `fesmate:v1:guide:global:call_guide_versions` |
| CrewContext | `fesmate_crews` | `fesmate:v1:social:global:crews` |
| CrewContext | `fesmate_crew_members` | `fesmate:v1:social:global:crew_members` |
| CrewContext | `fesmate_crew_activities` | `fesmate:v1:social:global:crew_activities` |
| CrewContext | `fesmate_crew_events` | `fesmate:v1:social:global:crew_events` |
| CrewContext | `fesmate_crew_announcements` | `fesmate:v1:social:global:crew_announcements` |
| UserProfileContext | `fesmate_user_profiles` | `fesmate:v1:settings:global:user_profiles` |

### 우선순위 4: 설정 (키 형식만 통일)

| 파일 | 현재 키 | 변경 후 키 |
|------|--------|-----------|
| useTicketView.ts | `fesmate_ticketbook_view` | `fesmate:v1:settings:user_{userId}:ticketbook_view` |
| map-deeplink.ts | `fesmate_default_map_app` | `fesmate:v1:settings:user_{userId}:default_map_app` |

---

## 참고

- 기존 storage adapter: `src/lib/storage/` (이미지 전용)
- Context 파일: `src/lib/*-context.tsx` (17개)
- 관련 문서: `docs/tech/supabase-migration-plan.md`
