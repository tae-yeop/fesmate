# src/lib/ 가이드

이 디렉토리는 React Context, 유틸리티 함수, Mock 데이터, Supabase 클라이언트를 포함합니다.

## 디렉토리 구조

```
src/lib/
├── *-context.tsx          # React Context Provider들
├── mock-data.ts           # Mock 이벤트/포스트/알림 데이터
├── utils.ts               # cn() 클래스 유틸리티
├── utils/                 # 기타 유틸리티 함수
│   ├── date-format.ts     # 날짜 포맷팅
│   ├── map-deeplink.ts    # 지도앱 딥링크
│   ├── contact-mask.ts    # 연락처 마스킹
│   └── ics-export.ts      # 캘린더 내보내기
├── constants/             # 상수 정의
│   └── styles.ts          # 테마/스타일 상수
└── supabase/              # Supabase 클라이언트
    ├── client.ts          # 브라우저용 (createBrowserClient)
    └── server.ts          # 서버용 (createServerClient)
```

## Context 규칙

### Provider 순서 (layout.tsx)

Provider는 의존성 순서대로 중첩됩니다. **반드시 이 순서를 유지**하세요:

```tsx
<AuthProvider>           // 1. 인증 (최상위)
  <DevProvider>          // 2. Dev 도구 (mockUserId 제공)
    <BlockProvider>      // 3. 차단 사용자
      <WishlistProvider> // 4. 찜/다녀옴
        <BadgeProvider>
        <CrewProvider>
        <FollowProvider>
        <UserProfileProvider>
        <HelpfulProvider>
          <CommentProvider>
            <MyTimetableProvider>
              <LeaderboardProvider>
              <JoinProvider>
              <CompanionProvider>
              <ParticipationProvider>  // 마지막
```

### 새 Context 추가 시

1. `*-context.tsx` 파일 생성
2. `"use client"` 필수
3. `layout.tsx`에 Provider 추가 (의존성 순서 고려)
4. localStorage 키: `fesmate_{context_name}` 패턴 사용

### Context 파일 구조 패턴

```tsx
"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useDevContext } from "./dev-context";

// 1. Mock 데이터 (필요시)
export const MOCK_XXX: Type[] = [...];

// 2. Context 타입 정의
interface XXXContextValue {
    currentUserId: string;
    // ...
}

// 3. Context 생성
const XXXContext = createContext<XXXContextValue | null>(null);

// 4. localStorage 키
const STORAGE_KEY = "fesmate_xxx";

// 5. Provider 컴포넌트
export function XXXProvider({ children }: { children: ReactNode }) {
    const { mockUserId } = useDevContext();
    const currentUserId = mockUserId || "user1";

    // localStorage 불러오기/저장 로직...

    return (
        <XXXContext.Provider value={...}>
            {children}
        </XXXContext.Provider>
    );
}

// 6. Hook
export function useXXX() {
    const context = useContext(XXXContext);
    if (!context) {
        throw new Error("useXXX must be used within XXXProvider");
    }
    return context;
}
```

## Mock 데이터 아키텍처

### 왜 Mock 데이터를 유지하는가?

FesMate는 **Dual-Mode 데이터 패턴**을 사용합니다:

| 상황 | 데이터 소스 | 이유 |
|------|------------|------|
| 로그인 사용자 | Supabase DB | 실제 서비스 데이터 |
| 비로그인/개발/오프라인 | Mock + localStorage | 개발 편의, 오프라인 지원 |

**Mock 데이터를 제거하면 안 되는 이유:**
1. Supabase 장애 시 개발/테스트 불가
2. 오프라인 환경에서 앱 테스트 불가
3. Dev 메뉴 시나리오 테스트 불가 (A~G 시나리오)
4. E2E 테스트가 외부 서비스 의존성 없이 동작 가능

### 사용자 데이터 통합

`MOCK_USERS`는 `MOCK_USER_PROFILES`에서 **파생**됩니다:

```tsx
// mock-data.ts
import { MOCK_USER_PROFILES } from "./follow-context";

// MOCK_USER_PROFILES가 단일 소스 (Single Source of Truth)
export const MOCK_USERS = MOCK_USER_PROFILES.map((profile, index) => ({
    id: profile.id,
    nickname: profile.nickname,  // 동기화 자동 보장
    role: "USER" as const,
    createdAt: addDays(now, -100 + index * 20),
    updatedAt: addDays(now, -100 + index * 20),
}));
```

닉네임을 변경해야 하면 **`MOCK_USER_PROFILES`만 수정**하세요.

### MOCK_USER_PROFILES는 배열입니다

`follow-context.tsx`에 정의된 `MOCK_USER_PROFILES`는 **배열**입니다.
객체처럼 접근하지 마세요:

```tsx
// ❌ 잘못된 사용
const user = MOCK_USER_PROFILES[userId];

// ✅ 올바른 사용
const user = MOCK_USER_PROFILES.find(u => u.id === userId);
```

### Mock 데이터 위치

| 데이터 | 파일 | 역할 |
|--------|------|------|
| Event, Slot, Post, Notification | `mock-data.ts` | 시나리오 테스트용 |
| MOCK_USERS | `mock-data.ts` | MOCK_USER_PROFILES에서 파생 |
| MOCK_USER_PROFILES | `follow-context.tsx` | 사용자 프로필 (단일 소스) |
| MOCK_CREWS | `crew-context.tsx` | 크루 데이터 |
| CompanionRequest | `companion-context.tsx` | 1:1 동행 제안 |
| ParticipationRequest | `participation-context.tsx` | 글 참여 신청 |
| Badge | `badge-context.tsx` | 뱃지 정의 |

### 시나리오 데이터 (Dev 메뉴)

`SCENARIO_EVENT_IDS`로 시나리오별 테스트 이벤트 매핑:

| 시나리오 | 이벤트 ID | 설명 |
|----------|-----------|------|
| A | `55948` | 기본 (단일일정, 예정) |
| B | `e2` | 다일 페스티벌 (LIVE) |
| C | `24016943` | 종료 시각 누락 (RECAP) |
| D | `e4` | 취소됨 (CANCELED) |
| E | `e5` | 연기됨 (POSTPONED) |
| F | `eF` | 해외 (Asia/Tokyo) |
| G | `pentaport` | 멀티스테이지 3일 페스티벌 |

## Supabase 사용

### 클라이언트 vs 서버

```tsx
// 클라이언트 컴포넌트에서 ("use client")
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// 서버 컴포넌트/API Route에서
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();  // ⚠️ async 필수!
```

### 현재 상태

Supabase는 **인증(Auth)에만 사용** 중입니다.
데이터는 모두 Mock + localStorage로 관리됩니다.

## Companion vs Participation

두 시스템은 **완전히 별개**입니다:

| 구분 | Companion (동행 제안) | Participation (글 참여) |
|------|----------------------|------------------------|
| 컨텍스트 | 1:1 사용자 간 제안 | 커뮤니티 글에 신청 |
| 대상 | 특정 사용자 + 특정 행사 | 특정 글 (Post) |
| 타입 | `companion-context.tsx` | `participation-context.tsx` |
| 글 타입 | N/A | companion, taxi, meal, accommodation, transfer |

### Participation 글 타입별 라벨

```tsx
import { PARTICIPATION_LABELS } from "@/types/participation";

// { companion: "동행 신청", taxi: "택시팟 신청", ... }
```

## DevContext 활용

Dev 메뉴에서 제공하는 값들:

```tsx
const {
    mockUserId,      // "user1" | "user2" | ...
    isLoggedIn,      // Dev 패널의 로그인 상태
    scenario,        // "A" | "B" | ... | "F"
    overrideMode,    // "LIVE" | "RECAP" | null
    simulatedNow,    // 시간 시뮬레이터 값
} = useDevContext();
```

## 유틸리티 함수

### cn() - 클래스 조합

```tsx
import { cn } from "@/lib/utils";

<div className={cn(
    "base-class",
    isActive && "active-class",
    variant === "primary" ? "primary" : "secondary"
)} />
```

### 날짜 포맷

```tsx
import { formatDate, formatTime, formatRelativeTime } from "@/lib/utils/date-format";

formatDate(date);           // "2025.01.15 (수)"
formatTime(date);           // "19:00"
formatRelativeTime(date);   // "3시간 전"
```

### 지도 딥링크

```tsx
import { openMapApp, getMapAppUrl } from "@/lib/utils/map-deeplink";

openMapApp({
    placeName: "올림픽공원",
    address: "서울시 송파구...",
    app: "kakao"  // "google" | "kakao" | "naver" | "web"
});
```

## localStorage 키 목록

| 키 | Context | 용도 |
|----|---------|------|
| `fesmate_wishlist` | WishlistContext | 찜/다녀옴 상태 |
| `fesmate_helpful` | HelpfulContext | 도움됨 반응 |
| `fesmate_comments` | CommentContext | 댓글 |
| `fesmate_my_timetable` | MyTimetableContext | 내 타임테이블 |
| `fesmate_follows` | FollowContext | 팔로우 관계 |
| `fesmate_user_profiles` | UserProfileContext | 프로필 수정 |
| `fesmate_companion_requests` | CompanionContext | 동행 제안 |
| `fesmate_participation_requests` | ParticipationContext | 글 참여 신청 |
| `fesmate_join_requests` | JoinContext | 크루 가입 신청 |
| `fesmate_default_map_app` | (지도앱 선택) | 기본 지도앱 |

## 흔한 실수

1. **서버 컴포넌트에서 Context 사용**: Context는 클라이언트에서만 동작합니다
2. **Provider 순서 무시**: 의존성 있는 Context는 순서가 중요합니다
3. **MOCK_USER_PROFILES를 객체로 착각**: 배열이므로 `.find()` 사용
4. **server.ts의 createClient를 await 없이 호출**: async 함수입니다
