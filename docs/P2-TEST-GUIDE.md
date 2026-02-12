# P2 기능 테스트 가이드

> **Last updated:** 2026-01-12  
> **개발 서버:** http://localhost:3010

---

## 빠른 시작

```bash
# 개발 서버 시작
npm run dev -- --port 3010

# E2E 테스트 실행 (자동)
npm run test:e2e

# P2 기능만 테스트
npx playwright test p2-features.spec.ts

# UI 모드로 테스트 (디버깅)
npm run test:e2e:ui
```

---

## P2 기능별 수동 테스트

### 1. 다크모드

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | 브라우저에서 http://localhost:3010 접속 | 시스템 테마에 따라 라이트/다크 모드 표시 |
| 2 | 개발자 도구 > Application > Local Storage > fesmate-theme 확인 | 값이 "system", "light", "dark" 중 하나 |
| 3 | `localStorage.setItem("fesmate-theme", "dark")` 실행 후 새로고침 | 다크모드로 전환 |
| 4 | HTML 요소에 `dark` 클래스 추가 확인 | `<html class="dark">` |

**테스트 파일:** `src/lib/theme-context.tsx`

---

### 2. 연말 결산 리포트

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | http://localhost:3010/report/2025 접속 | 전체화면 슬라이드쇼 표시 |
| 2 | 오른쪽 화살표(→) 키 누르기 | 다음 슬라이드로 이동 |
| 3 | 왼쪽 화살표(←) 키 누르기 | 이전 슬라이드로 이동 |
| 4 | 화면 오른쪽 클릭 | 다음 슬라이드로 이동 |
| 5 | 5초 대기 | 자동으로 다음 슬라이드로 이동 |
| 6 | 하단 진행 바 확인 | 현재 슬라이드 위치 표시 |

**테스트 파일:** `src/app/report/[year]/page.tsx`, `src/lib/yearly-report.ts`

---

### 3. Admin 모더레이션 도구

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | http://localhost:3010/admin/moderation 접속 | 모더레이션 대시보드 표시 |
| 2 | 상단 통계 카드 확인 | 대기중/긴급/오늘 처리 건수 표시 |
| 3 | "전체" 탭 클릭 | 모든 항목 표시 |
| 4 | "신고" 탭 클릭 | 신고 항목만 필터링 |
| 5 | "제안" 탭 클릭 | 타임테이블 제안만 필터링 |
| 6 | 개별 항목 승인/반려 버튼 확인 | 버튼 표시됨 |

**테스트 파일:** `src/app/admin/moderation/page.tsx`

---

### 4. 셋리스트 편집

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | http://localhost:3010/event/e7 접속 | PENTA 이벤트 상세 페이지 |
| 2 | 타임테이블 탭 클릭 | 공연 일정 표시 |
| 3 | 슬롯 클릭 | 셋리스트 표시 (있는 경우) |
| 4 | "셋리스트 추가" 버튼 클릭 (로그인 필요) | SetlistEditorModal 열림 |
| 5 | 곡 제목 입력 후 추가 | 목록에 곡 추가됨 |
| 6 | 드래그로 순서 변경 | 곡 순서 변경 |
| 7 | "앵콜" 체크박스 토글 | 앵콜 구분 표시 |
| 8 | "도움됨" 버튼 클릭 | 카운트 증가 |

**테스트 파일:** `src/lib/setlist-context.tsx`, `src/components/setlist/`

---

### 5. AI 티켓 마스킹

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | http://localhost:3010/myfes 접속 | MyFes 페이지 |
| 2 | "티켓북" 탭 클릭 | 티켓 목록 표시 |
| 3 | 티켓 추가 버튼 클릭 | 티켓 에디터 모달 열림 |
| 4 | 이미지 업로드 | 티켓 이미지 표시 |
| 5 | "마스킹" 탭 클릭 | TicketMaskingEditor 표시 |
| 6 | "자동 감지" 버튼 클릭 | 개인정보 영역 자동 선택 |
| 7 | 마우스 드래그로 영역 선택 | 마스킹 영역 추가 |
| 8 | 마스킹 스타일 선택 (흐림/단색/패턴) | 스타일 변경 |
| 9 | "미리보기" 토글 | 마스킹 결과 미리보기 |

**테스트 파일:** `src/lib/ticket-masking.ts`, `src/components/ticketbook/TicketMaskingEditor.tsx`

---

### 6. SNS 공유 (인스타 스토리)

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | http://localhost:3010/event/e2 접속 | 이벤트 상세 페이지 |
| 2 | 공유 버튼 클릭 | 공유 옵션 표시 |
| 3 | "트위터로 공유" 클릭 | Twitter 공유 URL 열림 |
| 4 | "링크 복사" 클릭 | 클립보드에 URL 복사 |
| 5 | "스토리 이미지 생성" 클릭 (모바일) | 이미지 생성 후 다운로드 |

**테스트 파일:** `src/lib/share-utils.ts`

---

### 7. 사용자 행사 등록

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | http://localhost:3010/explore 접속 | 탐색 페이지 |
| 2 | 행사 등록/추가 버튼 클릭 | EventRegistrationModal 열림 |
| 3 | Step 1: 기본 정보 입력 | 다음 단계로 이동 |
| 4 | Step 2: 장소/일정 입력 | 다음 단계로 이동 |
| 5 | Step 3: 상세 정보 입력 | 다음 단계로 이동 |
| 6 | Step 4: 미리보기 및 제출 | 등록 완료 |
| 7 | "URL에서 가져오기" 버튼 클릭 | URL 입력 필드 표시 |
| 8 | YES24/인터파크 URL 입력 | 정보 자동 파싱 |

**테스트 파일:** `src/lib/event-registration-context.tsx`, `src/components/events/EventRegistrationModal.tsx`

---

### 8. 타임테이블 편집 (수정 제안)

| 단계 | 동작 | 예상 결과 |
|------|------|-----------|
| 1 | http://localhost:3010/event/e2 접속 | 이벤트 상세 페이지 |
| 2 | 타임테이블 탭 클릭 | 타임테이블 표시 |
| 3 | 슬롯 클릭 > "수정 제안" 버튼 | 제안 폼 열림 |
| 4 | 시간/아티스트 정보 수정 | 입력 가능 |
| 5 | "제안 제출" 클릭 | 제안 생성됨 |
| 6 | Admin에서 제안 확인 | 제안 목록에 표시 |

**테스트 파일:** `src/lib/timetable-suggestion-context.tsx`, `src/components/timetable/SuggestionReviewPanel.tsx`

---

## E2E 테스트 실행 방법

### 전체 테스트
```bash
npm run test:e2e
```

### 특정 테스트만 실행
```bash
# P2 기능만
npx playwright test p2-features.spec.ts

# Smoke 테스트만
npx playwright test smoke.spec.ts

# 특정 describe만
npx playwright test -g "다크모드"
```

### 디버깅 모드
```bash
# UI 모드 (브라우저에서 실행)
npm run test:e2e:ui

# headed 모드 (브라우저 표시)
npx playwright test --headed

# 특정 브라우저만
npx playwright test --project=chromium
```

### 리포트 확인
```bash
# 테스트 후 리포트 열기
npx playwright show-report
```

---

## 트러블슈팅

### 서버 시작 안됨
```bash
# 포트 사용 중인 프로세스 종료
lsof -ti:3010 | xargs kill -9

# 서버 재시작
npm run dev -- --port 3010
```

### 테스트 타임아웃
1. 개발 서버가 실행 중인지 확인: `curl http://localhost:3010`
2. 서버 로그 확인
3. `playwright.config.ts`의 timeout 값 조정

### 이미지 로드 에러
`next.config.ts`의 `images.remotePatterns`에 호스트 추가:
```typescript
{ hostname: "새호스트.com" }
```

---

## 관련 파일

| 기능 | Context | 컴포넌트 | 페이지 |
|------|---------|----------|--------|
| 다크모드 | theme-context.tsx | - | - |
| 연말 결산 | yearly-report.ts | - | report/[year]/page.tsx |
| 모더레이션 | - | - | admin/moderation/page.tsx |
| 셋리스트 | setlist-context.tsx | setlist/* | - |
| 티켓 마스킹 | ticket-masking.ts | TicketMaskingEditor.tsx | - |
| SNS 공유 | share-utils.ts | - | - |
| 행사 등록 | event-registration-context.tsx | EventRegistrationModal.tsx | - |
| 타임테이블 제안 | timetable-suggestion-context.tsx | SuggestionReviewPanel.tsx | - |
