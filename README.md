# FesMate

공연/전시/페스티벌 정보를 한 곳에 모으는 "행사 허브" 앱

## 기술 스택

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS 4, Lucide Icons
- **Backend:** Supabase (PostgreSQL + Auth)

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
├── components/             # React 컴포넌트
├── lib/                    # 유틸리티, 컨텍스트
└── types/                  # TypeScript 타입 정의
```

## 문서

- [CLAUDE.md](./CLAUDE.md) - 프로젝트 상세 가이드
- [docs/TODO.md](./docs/TODO.md) - 개발 진행 현황
