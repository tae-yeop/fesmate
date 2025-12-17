# CLAUDE.md - FesMate 프로젝트 가이드

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
| UI | React 19, Tailwind CSS 4 |
| Icons | Lucide React |
| Backend | Supabase (PostgreSQL + Auth) |
| Utilities | clsx, tailwind-merge |

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # 루트 레이아웃 (Header + MobileNav)
│   ├── page.tsx            # 홈페이지
│   ├── events/
│   │   ├── [id]/page.tsx   # 행사 상세 페이지
│   │   └── hub/page.tsx    # 허브 페이지
│   └── login/page.tsx      # 로그인 페이지
├── components/
│   ├── layout/             # Header, MobileNav
│   ├── events/             # EventCard, EventSection
│   └── auth/               # SocialLoginButtons
├── lib/
│   ├── utils.ts            # cn() 유틸리티
│   ├── mock-data.ts        # 목업 데이터
│   └── supabase/           # Supabase 클라이언트 (client.ts, server.ts)
└── types/
    └── event.ts            # Event, Artist, Venue 타입
```

## 핵심 개념 (PRD v0.5 기준)

### 상태 모델
- **⭐ 찜 (Wishlist)**: 관심/예매 예정
- **✅ 다녀옴 (Attended)**: 관람 완료 (리뷰/영상/기록의 기준)

### 허브 모드
- **LIVE**: `현재 >= (start_at - 24h)` AND `현재 < (end_at + 6h)`
- **RECAP**: `현재 >= (end_at + 6h)`
- 운영자 `override_mode`로 강제 가능

### 글 타입 (Post Type)
- 실시간: 게이트/MD/시설/안전
- 공식: Official 공지
- 커뮤니티: 동행/택시/밥/숙소/직거래양도/질문/팁
- 기록: 후기(총평/슬롯)/영상(링크)

### 메인 탭 구조
1. **홈**: 오늘 일정 요약, 추천 행사
2. **탐색(행사)**: 카드뷰/리스트뷰/캘린더뷰
3. **커뮤니티**: 동행/택시/밥/숙소/양도/후기·팁/질문
4. **MyFes**: 예정+지난 혼합 타임라인

## 현재 구현 vs 최신 문서 불일치

> 기존 구현이 최신 문서(v0.5)와 맞지 않는 부분이 있어 코드베이스 정렬이 필요합니다.

| 영역 | 현재 구현 | 최신 문서 (v0.5) |
|------|-----------|------------------|
| 네비게이션 | 5탭 (Home/Events/Transfer/Artists/My) | 4탭 (홈/탐색/커뮤니티/MyFes) |
| 상태 모델 | Interest 버튼 1개 | ⭐찜 / ✅다녀옴 분리 |
| 행사 상태 | upcoming/live/ended | SCHEDULED/CHANGED/POSTPONED/CANCELED |
| 행사 페이지 | 단순 섹션 나열 | 탭 구조 + 허브 4박스 + LIVE/RECAP |
| 커뮤니티 | Transfer 1개 메뉴 | 7개 카테고리 + 자동 만료 |
| 타입 | date/time (string) | start_at/end_at (Date) + timezone |

## 개발 현황

### 완료 (Phase 0)
- [x] Next.js 16 프로젝트 초기화 (App Router)
- [x] TypeScript 5, ESLint 설정
- [x] Tailwind CSS 4 디자인 시스템
- [x] 기본 레이아웃 (Header, MobileNav) - **구조 변경 필요**
- [x] 이벤트 카드/섹션 컴포넌트 - **상태 모델 업데이트 필요**
- [x] 행사 상세 페이지 UI - **탭 구조로 재구성 필요**
- [x] 로그인 페이지 UI
- [x] Supabase 클라이언트 설정
- [x] Mock 데이터 구조 - **타입 재정의 필요**

### 즉시 필요 (Phase 1: 코드베이스 정렬)
- [ ] 타입 정의 수정 (event.ts, post.ts, user.ts)
- [ ] 네비게이션 4탭 구조로 변경
- [ ] 라우트 구조 변경 (/explore, /event/[id], /community, /myfes)
- [ ] 상태 모델 적용 (⭐찜/✅다녀옴)

### 진행 중
- [ ] 인증 시스템 (카카오/네이버/구글 OAuth via Supabase)
- [ ] 데이터베이스 스키마 설계

### 미착수 (MVP P0)
- [ ] 탐색 3뷰 (카드/리스트/캘린더) + 필터/정렬
- [ ] 행사 허브 (4박스 요약 + 피드)
- [ ] LIVE/RECAP 모드 전환
- [ ] 글 작성 템플릿
- [ ] 커뮤니티 7개 카테고리 + 자동 만료
- [ ] MyFes 혼합 타임라인
- [ ] 인앱 알림
- [ ] 신고/차단
- [ ] Dev 메뉴 (시나리오/시간 시뮬레이터)

## 주요 명령어

```bash
# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start

# 린트
npm run lint
```

## 코딩 컨벤션

### 파일 구조
- 컴포넌트: `src/components/{domain}/{ComponentName}.tsx`
- 페이지: `src/app/{route}/page.tsx`
- 타입: `src/types/{domain}.ts`
- 유틸리티: `src/lib/{name}.ts`

### 스타일링
- Tailwind CSS 사용
- `cn()` 유틸리티로 조건부 클래스 조합
- 디자인 토큰: `globals.css`의 CSS 변수 활용

### 타입
- 모든 컴포넌트에 Props 타입 정의
- API 응답/요청에 인터페이스 사용
- `event.ts` 참고하여 도메인 타입 확장

## 참고 문서

- [PRD v0.5](/docs/PRD_fesmate_v0.5.md) - 제품 요구사항
- [UX/IA v0.5](/docs/UX_IA_fesmate_v0.5.md) - 정보구조 및 화면 구성
- [기획 요약 v0.5](/docs/fes_app_planning_summary_v0.5.md) - 전체 기획 정리
- [TODO](/docs/TODO.md) - 개발 태스크 목록

## MVP 우선순위

| 우선순위 | 기능 |
|----------|------|
| P0 | Dev 메뉴(시나리오/시간/상태 트리거), 탐색 3뷰, 행사 페이지 탭, 허브 4박스+피드, LIVE/RECAP 전환, 글 작성 템플릿, ⭐찜/✅다녀옴, MyFes 타임라인, 커뮤니티 카테고리+자동만료, 인앱 알림, 신고/차단 |
| P1 | 도움됨 반응, 신뢰도 고도화, 슬롯 알림, 오프라인 임시저장, 대표 카드 선정 |
| P2 | Admin 도구, 후기·영상 탭, 인앱 영상 업로드, 모더레이션 자동화 |

## 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OAuth (TODO)
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 주의사항

1. **MVP 원칙**: 목업/시드 데이터 + Dev 메뉴로 UI/UX 검증 우선
2. **결제 없음**: 티켓/MD 거래 중개, 안전결제/에스크로 미제공
3. **실시간 연동 불가**: 예매처 좌석/재고 등 공식 데이터 직접 연동 없음
4. **타임존**: 행사 로컬 타임존(기본 Asia/Seoul) 기준으로 모드 전환
