# src/components/ 가이드

이 디렉토리는 재사용 가능한 React 컴포넌트를 포함합니다.

## 디렉토리 구조

```
src/components/
├── layout/           # 레이아웃 컴포넌트
│   ├── Header.tsx    # 상단 네비게이션
│   └── MobileNav.tsx # 하단 탭 바 (모바일)
├── events/           # 이벤트 관련
│   ├── EventCard.tsx         # 이벤트 카드 (탐색 그리드)
│   ├── EventListItem.tsx     # 이벤트 리스트 아이템
│   └── EventCalendarView.tsx # 캘린더 뷰
├── posts/            # 글 관련
│   ├── PostComposer.tsx    # 글 작성/수정 모달
│   └── PostDetailModal.tsx # 글 상세 모달
├── safety/           # 신고/차단
│   ├── ReportModal.tsx       # 신고 모달
│   ├── BlockConfirmModal.tsx # 차단 확인 모달
│   └── PostActionMenu.tsx    # 글 액션 메뉴 (...)
├── social/           # 소셜 기능
│   ├── CompanionRequestModal.tsx # 동행 제안 모달
│   └── FriendActivityFeed.tsx    # 친구 활동 피드
├── auth/             # 인증
│   └── SocialLoginButtons.tsx # OAuth 로그인 버튼
├── maps/             # 지도
│   └── MapActionSheet.tsx # 지도앱 선택 액션시트
├── dev/              # 개발 도구
│   ├── DevPanel.tsx    # Dev 메뉴 패널
│   └── DevStatusBar.tsx # 상단 Dev 상태 표시줄
├── artists/          # 아티스트
│   └── ArtistDetailModal.tsx # 아티스트 상세 모달
├── timetable/        # 타임테이블
│   ├── MyTimetableView.tsx  # 내 타임테이블 뷰
│   └── CustomEventModal.tsx # 커스텀 일정 추가 모달
├── crew/             # 크루
│   └── CreateCrewModal.tsx # 크루 생성 모달
├── community/        # 커뮤니티
│   └── JoinModal.tsx # 크루 가입 모달
├── profile/          # 프로필
│   └── ProfileEditModal.tsx # 프로필 수정 모달
└── leaderboard/      # 리더보드
    └── LeaderboardPreview.tsx # 리더보드 미리보기
```

## 컴포넌트 작성 규칙

### 기본 구조

```tsx
"use client";  // 클라이언트 컴포넌트

import { useState } from "react";
import { X, SomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SomeType } from "@/types/xxx";

interface ComponentNameProps {
    isOpen: boolean;
    onClose: () => void;
    // ...
}

/**
 * 컴포넌트 설명 - PRD v0.5 기준
 * - 기능 1
 * - 기능 2
 */
export function ComponentName({ isOpen, onClose, ...props }: ComponentNameProps) {
    // 상태, 로직...

    if (!isOpen) return null;  // 모달 패턴

    return (
        <div className={cn("base-classes", conditionalClass && "extra")}>
            {/* 내용 */}
        </div>
    );
}
```

### 모달 컴포넌트 패턴

모든 모달은 동일한 패턴을 따릅니다:

```tsx
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit?: (data: SomeData) => void;
}

export function SomeModal({ isOpen, onClose, onSubmit }: ModalProps) {
    const [step, setStep] = useState<"select" | "confirm" | "done">("select");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">제목</h2>
                    <button onClick={onClose}>
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {/* 본문 */}
                <div className="p-4">
                    {step === "select" && (/* ... */)}
                    {step === "confirm" && (/* ... */)}
                    {step === "done" && (/* ... */)}
                </div>
            </div>
        </div>
    );
}
```

## 아이콘 사용

**Lucide React**만 사용합니다:

```tsx
import { Star, Users, MapPin, X, Check } from "lucide-react";

<Star className="h-4 w-4" />
<Star className="h-5 w-5 text-yellow-500 fill-current" />  // 채워진 아이콘
```

### 자주 쓰는 아이콘

| 용도 | 아이콘 |
|------|--------|
| 닫기 | `X` |
| 확인 | `Check`, `CheckCircle2` |
| 찜 | `Star` |
| 다녀옴 | `CheckCircle2` |
| 위치 | `MapPin` |
| 시간 | `Clock`, `Calendar` |
| 사람 | `Users`, `User` |
| 설정 | `Settings`, `MoreVertical` |
| 뒤로가기 | `ChevronLeft`, `ArrowLeft` |
| 경고 | `AlertTriangle` |

## 스타일링

### cn() 유틸리티

조건부 클래스 조합에 `cn()` 사용:

```tsx
import { cn } from "@/lib/utils";

<button className={cn(
    "px-4 py-2 rounded-lg",
    isActive ? "bg-primary text-white" : "bg-muted",
    disabled && "opacity-50 cursor-not-allowed"
)}>
```

### 디자인 토큰

CSS 변수 사용 (`globals.css`에 정의):

```tsx
// 배경색
className="bg-background"      // 기본 배경
className="bg-card"            // 카드 배경
className="bg-muted"           // 비활성 배경

// 텍스트
className="text-foreground"    // 기본 텍스트
className="text-muted-foreground"  // 보조 텍스트
className="text-primary"       // 강조 텍스트

// 테두리
className="border"             // 기본 테두리
className="border-primary"     // 강조 테두리
```

### 반응형

- 모바일 퍼스트: 기본이 모바일, `md:` 이상이 데스크톱
- 하단 탭 바 공간: `pb-16 md:pb-0`

## 주요 컴포넌트 설명

### EventCard

이벤트 그리드 표시용 카드:

```tsx
<EventCard
    event={event}
    isWishlist={isWishlist}
    isAttended={isAttended}
    onWishlistToggle={() => toggleWishlist(event.id)}
/>
```

### PostComposer

글 작성/수정 모달. 15개 글 타입 지원:

```tsx
<PostComposer
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    eventId="e2"
    eventTitle="Seoul Jazz Festival"
    initialType="companion"  // 선택적
    editPost={existingPost}  // 수정 모드
    onEditComplete={handleUpdate}
/>
```

### ReportModal / BlockConfirmModal

신고/차단 모달:

```tsx
<ReportModal
    isOpen={showReport}
    onClose={() => setShowReport(false)}
    targetType="post"
    targetId={post.id}
    targetUserId={post.userId}
    onSubmit={handleReport}
/>

<BlockConfirmModal
    isOpen={showBlock}
    onClose={() => setShowBlock(false)}
    targetUserId={userId}
    onConfirm={handleBlock}
/>
```

### MapActionSheet

지도앱 선택 액션시트:

```tsx
<MapActionSheet
    isOpen={showMap}
    onClose={() => setShowMap(false)}
    placeName="올림픽공원"
    address="서울시 송파구..."
/>
```

## 흔한 실수

1. **`"use client"` 누락**: 이벤트 핸들러, hooks 사용 시 필수
2. **isOpen 조기 리턴 누락**: 모달이 항상 렌더링됨
3. **cn() import 오류**: `@/lib/utils`에서 import
4. **아이콘 크기 미지정**: `className="h-4 w-4"` 필수
5. **z-index 충돌**: 모달은 `z-50`, DevPanel은 `z-[100]`

## 타입 import

컴포넌트에서 사용하는 타입은 `@/types/`에서 import:

```tsx
import { Event, Slot } from "@/types/event";
import { Post, PostType } from "@/types/post";
import { ReportReason, ReportTargetType } from "@/types/report";
import { Notification } from "@/types/notification";
```
