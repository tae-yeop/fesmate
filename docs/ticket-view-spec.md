# 티켓북 뷰 시스템 스펙

## 개요

티켓 이미지를 사용자가 선택한 뷰 방향에 맞게 표시하는 시스템.
핵심 원칙: **이미지의 긴 쪽이 뷰의 긴 방향에 맞춰져야 한다.**

---

## 뷰 타입

### 1. 세로뷰 (Portrait View)
- 카드 비율: `2:3` (가로:세로)
- 세로가 긴 카드
- 이미지의 긴 쪽이 세로로 배치됨

### 2. 가로뷰 (Landscape View)
- 카드 비율: `3:2` (가로:세로)
- 가로가 긴 카드
- 이미지의 긴 쪽이 가로로 배치됨

---

## 회전 로직

### 원칙
```
이미지 긴 방향 + 뷰 긴 방향 → 회전 필요 여부

세로로 긴 이미지 (height > width):
  - 세로뷰 → 회전 불필요 (긴 쪽이 이미 세로)
  - 가로뷰 → 90도 회전 (긴 쪽을 가로로)

가로로 긴 이미지 (width > height):
  - 세로뷰 → 90도 회전 (긴 쪽을 세로로)
  - 가로뷰 → 회전 불필요 (긴 쪽이 이미 가로)
```

### 진리표

| 이미지 비율 | 선택한 뷰 | 회전 | 결과 |
|------------|----------|------|------|
| 세로 (H > W) | 세로뷰 | ❌ | 이미지 그대로, 긴 쪽이 세로 |
| 세로 (H > W) | 가로뷰 | ✅ 90° | 회전하여 긴 쪽이 가로 |
| 가로 (W > H) | 세로뷰 | ✅ 90° | 회전하여 긴 쪽이 세로 |
| 가로 (W > H) | 가로뷰 | ❌ | 이미지 그대로, 긴 쪽이 가로 |
| 정사각형 | 세로뷰 | ❌ | 세로 카드에 맞춤 |
| 정사각형 | 가로뷰 | ❌ | 가로 카드에 맞춤 |

---

## 사용자 인터페이스

### 뷰 선택 UI
```
┌─────────────────────────────────────┐
│  [📱 세로]  [📺 가로]               │  ← 뷰 선택 토글
├─────────────────────────────────────┤
│                                     │
│     ┌─────────┐                     │
│     │         │                     │
│     │  티켓   │                     │
│     │  이미지 │                     │
│     │         │                     │
│     └─────────┘                     │
│                                     │
└─────────────────────────────────────┘
```

### 위치
- **TicketGrid**: 그리드 상단에 뷰 선택 토글
- **TicketViewer**: 뷰어 상단에 뷰 전환 버튼

### 기본값
- 각 티켓의 원본 비율에 맞는 뷰가 기본값
- 세로로 긴 이미지 → 기본 세로뷰
- 가로로 긴 이미지 → 기본 가로뷰

---

## 저장 방식

### 전역 설정 (localStorage)
```typescript
// 전체 티켓북의 기본 뷰 모드
localStorage.setItem("fesmate_ticketbook_view", "portrait" | "landscape" | "auto");
```

### 개별 티켓 설정 (선택적)
```typescript
// Ticket 타입에 추가
interface Ticket {
  // ... 기존 필드
  preferredView?: "portrait" | "landscape"; // 해당 티켓의 선호 뷰
}
```

---

## 컴포넌트 구조

### 변경할 파일
1. `TicketGrid.tsx` - 뷰 선택 토글 추가
2. `AdaptiveTicketCard.tsx` → `TicketCardView.tsx`로 리네임 및 로직 수정
3. `TicketViewer.tsx` - 뷰 전환 버튼 추가
4. `LandscapeTicketCard.tsx` - 삭제 (통합)

### 새 컴포넌트
```
src/components/ticketbook/
├── TicketViewToggle.tsx      # 뷰 선택 토글 버튼
├── TicketCardView.tsx        # 통합 티켓 카드 (회전 로직 포함)
└── useTicketView.ts          # 뷰 상태 관리 훅
```

---

## 구현 로직

### 핵심 함수: needsRotation
```typescript
/**
 * 이미지와 뷰 방향을 비교하여 회전 필요 여부 판단
 */
function needsRotation(
  imageWidth: number,
  imageHeight: number,
  viewMode: "portrait" | "landscape"
): boolean {
  const isImageLandscape = imageWidth > imageHeight;
  const isViewLandscape = viewMode === "landscape";

  // 이미지 방향과 뷰 방향이 다르면 회전 필요
  return isImageLandscape !== isViewLandscape;
}
```

### CSS 회전 적용
```typescript
const style = needsRotation(width, height, viewMode)
  ? {
      transform: "rotate(90deg)",
      // 회전 후 카드 영역을 채우도록 크기 조정
      width: "150%",  // 세로뷰일 때 (카드 높이를 이미지 너비로)
      height: "66.67%",
    }
  : undefined;
```

---

## 예시 시나리오

### 시나리오 1: 가로 티켓 + 세로뷰
```
원본 이미지: 1200 x 600 (가로로 긺)
선택한 뷰: 세로뷰 (2:3)

→ 90도 회전하여 긴 쪽(1200)이 세로로
→ 결과: 세로로 긴 카드에 티켓이 세로로 길게 표시
```

### 시나리오 2: 가로 티켓 + 가로뷰
```
원본 이미지: 1200 x 600 (가로로 긺)
선택한 뷰: 가로뷰 (3:2)

→ 회전 없음 (긴 쪽이 이미 가로)
→ 결과: 가로로 긴 카드에 티켓이 가로로 길게 표시
```

### 시나리오 3: 세로 티켓 + 가로뷰
```
원본 이미지: 600 x 1200 (세로로 긺)
선택한 뷰: 가로뷰 (3:2)

→ 90도 회전하여 긴 쪽(1200)이 가로로
→ 결과: 가로로 긴 카드에 티켓이 가로로 길게 표시
```

---

## 구현 순서

1. [x] `TicketViewToggle.tsx` 컴포넌트 생성
2. [x] `useTicketView.ts` 훅 생성 (localStorage 연동)
3. [x] `TicketCardView.tsx` 컴포넌트 생성 (회전 로직 통합)
4. [x] `TicketGrid.tsx`에 뷰 토글 통합
5. [x] `TicketViewer.tsx`에 뷰 전환 버튼 추가
6. [x] 기존 `AdaptiveTicketCard`, `LandscapeTicketCard` 정리 (deprecated로 유지)
7. [ ] 테스트 및 검증
