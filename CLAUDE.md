# CLAUDE.md - FesMate 프로젝트 가이드

> **AI를 위한 컨텍스트 상속 문서입니다.**

---

## 프로젝트 개요

**FesMate**는 공연/전시/페스티벌(**행사**) 단위로 예매 일정, 타임테이블, 공식 안내, 현장 실시간 제보, 커뮤니티, 리뷰/영상을 한 곳에 모으는 "행사 허브" 앱입니다.

### 핵심 컨셉
- **행사(Event)** 중심: 모든 정보가 행사 단위로 통합
- **LIVE/RECAP 모드**: 진행 중엔 실시간 정보, 종료 후엔 회고/리뷰 중심
- **써드파티 서비스**: 예매처 실시간 연동 불가, 직접 판매/결제 없음

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, Lucide React |
| Backend | Supabase (PostgreSQL + Auth + Storage) |

## 현재 상태

| 구분 | 상태 | 비고 |
|------|------|------|
| 프론트엔드 UI | ✅ 99% 완료 | 33개 페이지, 68개 컴포넌트 |
| 상태관리 | ✅ 28개 Context | 대부분 Supabase 쿼리 연동 |
| 백엔드 쿼리 | ✅ 27개 완료 | src/lib/supabase/queries/ |
| 인증 | ✅ Google OAuth | 카카오는 사업자 인증 필요 |
| DB 스키마 | ✅ 설계 완료 | 마이그레이션 파일 6개 |

---

## 프로젝트 구조

```
src/
├── app/                    # 33개 페이지 (Next.js App Router)
├── components/             # 68개 컴포넌트
├── lib/
│   ├── *-context.tsx       # 28개 Context
│   ├── supabase/queries/   # 27개 쿼리 함수
│   └── mock-data.ts        # Mock 데이터
└── types/                  # 타입 정의

supabase/migrations/        # 6개 마이그레이션 파일
docs/                       # 문서 (TODO.md, PRD.md 등)
e2e/                        # Playwright E2E 테스트
```

---

## 주요 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm run test:e2e     # E2E 테스트
npm run verify       # typecheck + lint + build + test
```

---

## 참고 문서

| 문서 | 설명 |
|------|------|
| [docs/TODO.md](docs/TODO.md) | 개발 진행 현황 |
| [docs/PRD.md](docs/PRD.md) | 제품 요구사항 |
| [docs/UX_IA.md](docs/UX_IA.md) | 정보구조/화면 구성 |
| [docs/00_index.md](docs/00_index.md) | 문서 인덱스 |

---

## AI 개발 가이드라인

### 코드 작성 규칙

1. **Context 작업**
   - Provider 순서: `layout.tsx`의 중첩 순서 유지
   - `MOCK_USER_PROFILES`는 배열: `.find()` 사용
   - localStorage 키: `fesmate_{name}` 형식

2. **컴포넌트 작업**
   - `"use client"` 필수: hooks, 이벤트 핸들러 사용 시
   - 모달 패턴: `isOpen`, `onClose`, step 상태 관리
   - 아이콘: Lucide React만 사용

3. **페이지 작업**
   - Next.js 15에서 `params`/`searchParams`는 Promise: `await` 필수
   - 하단 MobileNav 공간: `pb-20`

### 흔한 실수

```typescript
// ❌ 잘못된 예
MOCK_USER_PROFILES["user1"]
const { id } = params

// ✅ 올바른 예
MOCK_USER_PROFILES.find(u => u.id === "user1")
const { id } = await params
```

### 두 시스템 구분

| 기능 | Context | 용도 |
|------|---------|------|
| 1:1 동행 제안 | `CompanionContext` | 사용자→사용자, 특정 행사 |
| 글 참여 신청 | `ParticipationContext` | 커뮤니티 글(동행/택시/밥/숙소) |

---

## 작업 완료 후 체크리스트

1. `npm run build` 성공 확인
2. `npm run test:e2e` 통과 확인
3. 사용자에게 테스트 방법 안내
4. `docs/TODO.md` 완료 항목 체크
