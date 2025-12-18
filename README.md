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

## 사용자 설정

### 기본 지도앱 설정
커뮤니티 글에서 [지도] 버튼 클릭 시 사용할 기본 지도앱을 설정할 수 있습니다.

- **설정 방법**: [지도] 버튼 클릭 → 지도앱 선택 → "다음부터 이 지도로 열기" 체크
- **변경 방법**: [지도] 버튼 옆 [⚙️] 아이콘 클릭 → 다른 지도앱 선택
- **초기화 방법**: 브라우저 개발자도구 > Application > Local Storage > `fesmate_default_map_app` 삭제

## 문서

- [CLAUDE.md](./CLAUDE.md) - 프로젝트 상세 가이드
- [docs/TODO.md](./docs/TODO.md) - 개발 진행 현황
