# src/app/ 가이드

이 디렉토리는 Next.js App Router 페이지를 포함합니다.

## 라우트 구조

```
src/app/
├── layout.tsx              # 루트 레이아웃 (Provider 중첩)
├── globals.css             # 글로벌 스타일 + CSS 변수
├── page.tsx                # / (홈)
├── explore/page.tsx        # /explore (탐색)
├── community/page.tsx      # /community (커뮤니티)
├── myfes/page.tsx          # /myfes (내 행사)
├── notifications/page.tsx  # /notifications (알림)
├── login/page.tsx          # /login (로그인)
├── profile/page.tsx        # /profile (내 프로필)
├── leaderboard/page.tsx    # /leaderboard (리더보드)
├── event/[id]/             # 행사 상세 (동적 라우트)
│   ├── page.tsx            # /event/:id
│   └── components/         # 탭 컴포넌트
│       ├── OverviewTab.tsx
│       ├── HubTab.tsx
│       ├── TimetableTab.tsx
│       └── ArtistsTab.tsx
├── user/[id]/page.tsx      # /user/:id (사용자 프로필)
├── crew/[id]/page.tsx      # /crew/:id (크루 상세)
└── auth/callback/route.ts  # OAuth 콜백 (API Route)
```

## 메인 4탭 네비게이션

| 탭 | 라우트 | 설명 |
|----|--------|------|
| 홈 | `/` | 오늘 요약, 추천, LIVE 행사 |
| 탐색 | `/explore` | 카드/리스트/캘린더 뷰, 필터 |
| 커뮤니티 | `/community` | 7개 카테고리, 글 목록 |
| MyFes | `/myfes` | 찜/다녀옴 행사, 타임라인 |

## 페이지 작성 규칙

### 클라이언트 컴포넌트

대부분의 페이지는 `"use client"` 사용:

```tsx
"use client";

import { useState, useMemo } from "react";
import { useWishlist } from "@/lib/wishlist-context";
import { MOCK_EVENTS } from "@/lib/mock-data";

export default function PageName() {
    // 상태, hooks...
    return (
        <div className="min-h-screen bg-background pb-20">
            {/* pb-20: 하단 MobileNav 공간 */}
        </div>
    );
}
```

### URL 파라미터 (동적 라우트)

```tsx
// src/app/event/[id]/page.tsx
interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}

export default async function EventPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { tab } = await searchParams;
    // ...
}
```

**주의**: Next.js 15부터 `params`와 `searchParams`는 **Promise**입니다.

## 행사 상세 페이지 (event/[id])

### 탭 구조

```
/event/:id              → 개요 탭 (기본)
/event/:id?tab=hub      → 허브 탭
/event/:id?tab=timetable → 타임테이블 탭
/event/:id?tab=artists  → 아티스트 탭
```

### 딥링크 지원

알림에서 특정 탭으로 바로 이동:

```tsx
// 예: 허브 새 글 알림 클릭
router.push(`/event/${eventId}?tab=hub`);
```

### 탭 컴포넌트

각 탭은 `components/` 폴더에 분리:

```tsx
// components/HubTab.tsx
interface HubTabProps {
    event: Event;
    hubMode: "LIVE" | "RECAP";
    posts: Post[];
}

export function HubTab({ event, hubMode, posts }: HubTabProps) {
    // ...
}
```

## 허브 모드 (LIVE vs RECAP)

```tsx
import { getHubMode } from "@/types/event";

const hubMode = getHubMode(event, now);
// hubMode: "LIVE" | "RECAP"
```

### 모드 전환 기준

- **LIVE**: `현재 >= (startAt - 24h)` AND `현재 < (endAt + 6h)`
- **RECAP**: `현재 >= (endAt + 6h)`
- `overrideMode` 설정 시 강제 적용

### 모드별 UI 차이

| 요소 | LIVE | RECAP |
|------|------|-------|
| 허브 4박스 | 실시간 활성 | 요약 통계 |
| 글 타입 | 실시간 제보 강조 | 후기/영상 강조 |
| 배지 | 🔴 LIVE | 📹 RECAP |

## 커뮤니티 페이지 카테고리

```tsx
const CATEGORY_TABS = [
    { id: "all", label: "전체", types: [] },
    { id: "companion", label: "동행", types: ["companion"] },
    { id: "taxi", label: "택시", types: ["taxi"] },
    { id: "meal", label: "밥", types: ["meal"] },
    { id: "lodge", label: "숙소", types: ["lodge"] },
    { id: "transfer", label: "양도", types: ["transfer"] },
    { id: "tips", label: "후기·팁", types: ["review_total", "tip"] },
    { id: "question", label: "질문", types: ["question"] },
];
```

## 주요 Context 사용

페이지에서 자주 사용하는 Context:

```tsx
import { useWishlist } from "@/lib/wishlist-context";
import { useHelpful } from "@/lib/helpful-context";
import { useDevContext } from "@/lib/dev-context";
import { useBlock } from "@/lib/block-context";
import { useParticipation } from "@/lib/participation-context";

// 찜/다녀옴
const { isWishlist, isAttended, toggleWishlist, toggleAttended } = useWishlist();

// 도움됨
const { isHelpful, toggleHelpful, getHelpfulCount } = useHelpful();

// Dev 도구 (시나리오, 시간 시뮬레이터)
const { scenario, simulatedNow, mockUserId } = useDevContext();

// 차단
const { isBlocked, blockUser } = useBlock();

// 참여 신청
const { sendRequest, getMyRequestStatus } = useParticipation();
```

## 스타일 패턴

### 페이지 레이아웃

```tsx
<div className="min-h-screen bg-background">
    {/* 상단 헤더 (고정) */}
    <div className="sticky top-0 z-10 bg-background border-b">
        {/* ... */}
    </div>

    {/* 본문 */}
    <div className="px-4 py-4 pb-20">
        {/* pb-20: 하단 MobileNav 공간 */}
    </div>
</div>
```

### 섹션 구조

```tsx
<section className="mb-8">
    <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">섹션 제목</h2>
        <Link href="/more" className="text-sm text-muted-foreground">
            더보기
        </Link>
    </div>
    {/* 콘텐츠 */}
</section>
```

## API Routes

### OAuth 콜백

```
src/app/auth/callback/route.ts
```

```tsx
// GET /auth/callback?code=xxx
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    // Supabase 세션 교환...
}
```

## 흔한 실수

1. **params/searchParams await 누락**: Next.js 15에서 Promise입니다
2. **pb-20 누락**: 하단 MobileNav에 콘텐츠가 가려짐
3. **Mock 데이터 직접 수정**: Context를 통해 상태 관리해야 함
4. **서버/클라이언트 혼용**: Context 사용 시 `"use client"` 필수
