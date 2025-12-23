# FesMate

공연/전시/페스티벌 정보를 한 곳에 모으는 "행사 허브" 앱

## 기술 스택

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS 4, Lucide Icons
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)

## 현재 상태

| 영역 | 상태 | 비고 |
|------|------|------|
| 프론트엔드 UI | 99% 완료 | Mock 데이터 기반 |
| 인증 | Google OAuth | Supabase Auth 사용 |
| 데이터 저장 | localStorage | Mock 데이터 + Context |
| DB 스키마 | 설계 완료 | `supabase/migrations/` |

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## 환경 변수

`.env.local` 파일 생성:

```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
├── components/             # React 컴포넌트
├── lib/                    # 유틸리티, 컨텍스트, Supabase 클라이언트
└── types/                  # TypeScript 타입 정의 (database.ts 포함)

supabase/
└── migrations/             # PostgreSQL 마이그레이션 파일
    ├── 00001_core_tables.sql      # venues, artists, events, stages, slots
    ├── 00002_user_tables.sql      # users, user_events, follows, blocks
    ├── 00003_content_tables.sql   # posts, comments, notifications
    ├── 00004_social_tables.sql    # crews, participation_requests
    ├── 00005_guide_tables.sql     # songs, call_guides
    └── 00006_rls_policies.sql     # Row Level Security 정책

docs/
├── tech/
│   ├── database-schema.md         # DB 스키마 설계 (ERD, 테이블 상세)
│   └── supabase-migration-plan.md # Mock → Supabase 마이그레이션 계획
└── TODO.md                        # 개발 진행 현황
```

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│              Supabase Cloud                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │PostgreSQL│ │   Auth   │ │ Storage/Realtime │ │
│  │  + RLS   │ │  (OAuth) │ │    (Future)      │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────┘
                     ↑ HTTPS
                     │
┌─────────────────────────────────────────────────┐
│           Next.js App (Vercel)                   │
│  ┌──────────────────────────────────────────┐   │
│  │ React 19 + App Router + Server Components│   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ Context (현재: localStorage, 미래: Supabase)│   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Supabase 연동 (향후)

현재는 **Mock 데이터 + localStorage** 기반으로 동작합니다.
Supabase 실제 연동 시:

```bash
# 1. Supabase CLI 설치
npm install -g supabase

# 2. 로컬 개발 환경 (선택)
supabase init
supabase start

# 3. 마이그레이션 실행
supabase db push

# 4. 타입 생성
supabase gen types typescript --local > src/types/database.generated.ts
```

자세한 마이그레이션 계획: [docs/tech/supabase-migration-plan.md](./docs/tech/supabase-migration-plan.md)

## 사용자 설정

### 기본 지도앱 설정
커뮤니티 글에서 [지도] 버튼 클릭 시 사용할 기본 지도앱을 설정할 수 있습니다.

- **설정 방법**: [지도] 버튼 클릭 → 지도앱 선택 → "다음부터 이 지도로 열기" 체크
- **변경 방법**: [지도] 버튼 옆 [⚙️] 아이콘 클릭 → 다른 지도앱 선택
- **초기화 방법**: 브라우저 개발자도구 > Application > Local Storage > `fesmate_default_map_app` 삭제

## 문서

| 문서 | 설명 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | 프로젝트 상세 가이드 (AI용) |
| [docs/TODO.md](./docs/TODO.md) | 개발 진행 현황 |
| [docs/00_index.md](./docs/00_index.md) | 문서 지도 |
| [docs/tech/database-schema.md](./docs/tech/database-schema.md) | DB 스키마 설계 |
| [docs/tech/supabase-migration-plan.md](./docs/tech/supabase-migration-plan.md) | Supabase 마이그레이션 계획 |
