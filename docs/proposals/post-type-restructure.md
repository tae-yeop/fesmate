# 글 타입 구조 개선 제안

> 작성일: 2025-12-21
> 상태: 📋 제안

---

## 배경

현재 허브에서 글 작성 시 카테고리 분류에 혼선이 있음:
1. **"팁"이 후기 섹션에 표시됨** - 타입 정의는 Community지만 UI에서는 Review 섹션에 분류
2. **팬이벤트/뒷풀이 글 타입 부재** - 공연 전후 팬 모임 관련 글 작성 수요 존재

---

## 현재 구조

### post.ts 타입 정의
```typescript
// 커뮤니티 타입 (자동 만료 대상)
type CommunityPostType =
    | "companion"   // 동행
    | "taxi"        // 택시팟
    | "meal"        // 밥
    | "lodge"       // 숙소
    | "transfer"    // 직거래양도
    | "tip"         // 후기·팁 ← Community로 정의됨
    | "question";   // 질문

// 기록 타입 (만료 없음)
type RecordPostType = "review" | "video";
```

### HubTab.tsx 분류 (문제 지점)
```typescript
// 현재: "tip"이 reviewPosts에 포함됨 (의도와 불일치)
communityPosts: posts.filter(p => ["companion", "taxi", "meal", "lodge", "transfer"].includes(p.type)),
reviewPosts: posts.filter(p => ["review", "video", "tip"].includes(p.type)),
```

---

## 제안 변경사항

### 1. 글 타입 재분류

| 타입 | 현재 분류 | 변경 후 | 비고 |
|------|----------|---------|------|
| tip | Community (정의) → Review (UI) | Community (통일) | UI 분류 수정 |
| fanevent | 신규 | Community | 팬이벤트/생일카페/포토존 |
| afterparty | 신규 | Community | 뒷풀이/팬미팅 후 모임 |

### 2. 타입 정의 변경

```typescript
// post.ts
export type CommunityPostType =
    | "companion"   // 동행(일반)
    | "taxi"        // 택시팟
    | "meal"        // 밥
    | "lodge"       // 숙소
    | "transfer"    // 직거래양도
    | "tip"         // 팁/꿀팁
    | "question"    // 질문
    | "fanevent"    // 팬이벤트 (신규)
    | "afterparty"; // 뒷풀이 (신규)

export const POST_TYPE_LABELS: Record<PostType, string> = {
    // ... 기존 유지
    tip: "팁",              // 라벨 간소화 (후기 분리)
    fanevent: "팬이벤트",   // 신규
    afterparty: "뒷풀이",   // 신규
};
```

### 3. HubTab.tsx 분류 수정

```typescript
// 변경 후: "tip"을 communityPosts로 이동
communityPosts: posts.filter(p =>
    ["companion", "taxi", "meal", "lodge", "transfer", "tip", "fanevent", "afterparty"].includes(p.type)
),
reviewPosts: posts.filter(p => ["review", "video"].includes(p.type)),
```

### 4. 만료 정책

| 타입 | 만료 규칙 |
|------|----------|
| tip | 만료 없음 (기존 유지) |
| fanevent | event_start_at + 6시간 |
| afterparty | meet_at + 6시간 (companion과 동일) |

---

## 신규 타입 상세

### fanevent (팬이벤트)
- **용도**: 생일카페, 포토존, 서포트 부스, 팬 주최 이벤트 공유
- **필수 필드**: placeText (장소), 운영 시간
- **선택 필드**: 이미지, 입장료, 주의사항
- **만료**: 행사 시작 + 6시간

### afterparty (뒷풀이)
- **용도**: 공연 후 팬들끼리 모임, 회식, 2차
- **필수 필드**: meetAt (모임 시간), placeText (장소)
- **선택 필드**: maxPeople, budget, 규칙
- **만료**: meet_at + 6시간

---

## UI 변경사항

### 허브 4박스 (PRD 6.3.2)
- **커뮤니티 박스**: 동행/택시/밥/숙소/양도 + **팁/팬이벤트/뒷풀이** 추가
- **후기 박스**: 후기/영상만 유지 (팁 제외)

### PostComposer 글쓰기 템플릿
- **커뮤니티 섹션**: 팁, 팬이벤트, 뒷풀이 추가
- **팬이벤트 템플릿**:
  - 장소명 (필수)
  - 운영 시간
  - 설명
  - 이미지
- **뒷풀이 템플릿**:
  - 동행 템플릿과 유사
  - 모임 시간, 장소, 인원, 예산

### 커뮤니티 페이지 (/community)
- 카테고리 탭에 "팬이벤트", "뒷풀이" 추가

---

## 마이그레이션

1. `post.ts` 타입 정의 수정
2. `POST_TYPE_LABELS` 업데이트
3. `calculateExpiresAt()` 함수에 fanevent, afterparty 케이스 추가
4. `HubTab.tsx` 분류 로직 수정
5. `PostComposer.tsx` 템플릿 추가
6. `/community/page.tsx` 카테고리 탭 추가
7. Mock 데이터 샘플 추가

---

## 테스트 케이스

1. **팁 글 작성** → 커뮤니티 섹션에 표시 확인
2. **팬이벤트 글 작성** → 장소/시간 필드 동작 확인
3. **뒷풀이 글 작성** → 인원/예산 필드 동작 확인
4. **만료 테스트** → Dev 패널로 시간 조정 후 만료 확인
5. **허브 필터링** → 커뮤니티/후기 필터 정상 동작 확인

---

## 우선순위

| 항목 | 우선순위 | 예상 작업량 |
|------|---------|------------|
| "팁" 분류 수정 | P0 | 작음 |
| fanevent 타입 추가 | P1 | 중간 |
| afterparty 타입 추가 | P1 | 중간 |
| UI 템플릿 추가 | P1 | 중간 |
| 커뮤니티 페이지 탭 추가 | P2 | 작음 |
