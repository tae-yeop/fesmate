# FesMate 개발 TODO 리스트

> **Last updated:** 2026-01-11  
> **기준 문서:** `docs/PRD.md`, `docs/UX_IA.md`, `docs/SUMMARY.md`

---

## 현재 상태 요약

| 구분 | 상태 | 비고 |
|------|------|------|
| **프론트엔드 UI** | ✅ 99% 완료 | 33개 페이지, 68개 컴포넌트 |
| **상태관리 (Context)** | ✅ 28개 완료 | 대부분 Supabase 쿼리 연동 |
| **백엔드 쿼리** | ✅ 27개 완료 | src/lib/supabase/queries/ |
| **인증** | ✅ Google OAuth | 카카오는 사업자 인증 필요 |
| **DB 스키마** | ✅ 설계 완료 | 마이그레이션 파일 6개 |
| **배포** | ⏳ 미착수 | Vercel 예정 |

---

## ✅ 완료된 기능

### 프로젝트 셋업
- [x] Next.js 16 (App Router) + TypeScript 5
- [x] Tailwind CSS 4 디자인 시스템
- [x] Supabase 클라이언트 설정
- [x] E2E 테스트 (Playwright)

### 페이지 (33개)
- [x] 홈 (`/`)
- [x] 탐색 (`/explore`) - 3뷰 토글, 필터/정렬/검색
- [x] 행사 상세 (`/event/[id]`) - 4탭 구조, LIVE/RECAP
- [x] 커뮤니티 (`/community`) - 9개 카테고리
- [x] MyFes (`/myfes`) - 혼합 타임라인, 갤러리
- [x] FieldNote (`/fieldnote`) - 콜가이드 홈
- [x] 콜가이드 뷰어/에디터 (`/fieldnote/call/[songId]`)
- [x] 아티스트별 가이드 (`/fieldnote/artist/[id]`)
- [x] 알림 (`/notifications`)
- [x] 로그인 (`/login`)
- [x] 프로필 (`/profile`, `/profile/edit`, `/profile/activity`)
- [x] 사용자 프로필 (`/user/[id]`)
- [x] 크루 프로필 (`/crew/[id]`)
- [x] 리더보드 (`/leaderboard`)
- [x] 가이드 (`/guide`)
- [x] 공유 페이지 (`/share/tickets/[shareId]`, `/share/gallery/[shareId]`)
- [x] Admin 페이지 6개 (`/admin/*`)

### Context (28개)
- [x] AuthContext - Google OAuth
- [x] WishlistContext - 찜/다녀옴 (Supabase 연동)
- [x] HelpfulContext - 도움됨 반응 (Supabase 연동)
- [x] CommentContext - 댓글 (Supabase 연동)
- [x] PostContext - 글 CRUD (Supabase 연동)
- [x] CrewContext - 크루 관리 (Supabase 연동)
- [x] ParticipationContext - 참여 신청 (Supabase 연동)
- [x] FollowContext - 팔로우 (Supabase 연동)
- [x] BlockContext - 차단 (Supabase 연동)
- [x] BadgeContext - 배지 (Supabase 연동)
- [x] LeaderboardContext - 리더보드 (Supabase 연동)
- [x] CallGuideContext - 콜가이드 (Supabase 연동)
- [x] TicketbookContext - 티켓북 (Supabase 연동)
- [x] CompanionContext - 동행 제안 (Supabase 연동)
- [x] JoinContext - 참여 (Supabase 연동)
- [x] MyTimetableContext - 나만의 타임테이블 (Supabase 연동)
- [x] NotificationContext - 알림 (Supabase 연동)
- [x] UserProfileContext - 사용자 프로필 (Supabase 연동)
- [x] EventRegistrationContext - 행사 등록 (Supabase 연동)
- [x] DevContext - 개발 메뉴 (localStorage)
- [x] TrustContext - 신뢰도 (localStorage)
- [x] CrewSubgroupContext - 크루 소그룹 (localStorage)
- [x] SlotContentContext - 슬롯 콘텐츠
- [x] TimetableSuggestionContext - 타임테이블 제안
- [x] GalleryContext - 갤러리
- [x] PushContext - 푸시 알림
- [x] RateLimitContext - 레이트 제한
- [x] SanctionContext - 제재

### 컴포넌트 (68개)
- [x] 레이아웃: Header, MobileNav
- [x] 이벤트: EventCard, EventListItem, EventCalendarView, EventRegistrationModal
- [x] 글: PostComposer, PostDetailModal, HiddenPostPlaceholder
- [x] 티켓북: TicketCard, TicketGrid, TicketViewer, TicketEditorModal, ShareModal 등 14개
- [x] 콜가이드: CallGuideViewer, CallGuideEditor, CallGuideList 등 6개
- [x] 타임테이블: LinearTimeline, MyTimetableView, SlotEditModal 등 6개
- [x] 크루: CreateCrewModal, CrewCalendar, CrewTimetableOverlay, CreateSubgroupModal
- [x] 소셜: CompanionRequestModal, FriendActivityFeed, FriendsHighlightCarousel
- [x] 안전: ReportModal, BlockConfirmModal, PostActionMenu
- [x] 활동: ActivityTimeline, ActivityStats, ActivityCard
- [x] 리포트: YearlyReportCard, ReportGenerator
- [x] 기타: DevPanel, DevStatusBar, MapActionSheet, LoginPromptModal 등

### 특수 기능
- [x] FieldNote (콜가이드): 뷰어/에디터, YouTube 동기화
- [x] 나만의 타임테이블: 슬롯 마킹, 커스텀 이벤트, ICS 내보내기
- [x] 크루 시스템: 생성/가입/캘린더/소그룹/히트맵
- [x] 리더보드: 주간/월간/전체, 점수 계산
- [x] 배지 시스템: 23개 배지, 자동 획득
- [x] 티켓북: 호모그래피 에디터, 템플릿
- [x] 지도 딥링크: Google Maps, 카카오맵, 네이버지도
- [x] 공유 기능: Web Share API + 클립보드

### Supabase 쿼리 (27개 파일)
- [x] events.ts, posts.ts, comments.ts, reactions.ts
- [x] notifications.ts, crews.ts, participation.ts
- [x] follows.ts, blocks.ts, badges.ts, leaderboard.ts
- [x] call-guides.ts, tickets.ts, companions.ts
- [x] users.ts, user-events.ts, my-timetable.ts
- [x] event-registration.ts, ticket-shares.ts, reports.ts
- [x] admin.ts, index.ts

### 데이터 수집
- [x] URL Import (수동 크롤링): YES24, 인터파크 파서
- [x] 자동 크롤링: 구조 완료 (Headless 필요)
- [x] Admin 승인 UI (`/admin/crawl/suggestions`)

---

## 🔧 진행 중 / 개선 필요

### Supabase 실제 연동
| 항목 | 상태 | 비고 |
|------|------|------|
| DB 스키마 설계 | ✅ 완료 | `supabase/migrations/` |
| 쿼리 함수 | ✅ 완료 | 27개 파일 |
| Context 연동 | ✅ 완료 | 26개 Context에서 import |
| 마이그레이션 실행 | ⏳ 미완료 | Supabase 프로젝트 필요 |
| 환경변수 설정 | ⏳ 미완료 | .env.local |

### 알림 고도화
- [ ] Quiet Hours (22:00–08:00) 처리
- [ ] 중복 묶음 (dedupe_key, 30분 내 1회)
- [ ] 푸시 알림 (FCM/APNS)

### 성능 최적화
- [ ] 서버 사이드 필터/정렬
- [ ] 무한 스크롤 / 페이지네이션
- [ ] Next.js Image 컴포넌트 활용

---

## ⏳ 미구현 (향후 계획)

### P1 - 다음 단계
- [ ] Supabase 프로젝트 생성 + 마이그레이션 실행
- [ ] 카카오 OAuth (사업자 인증 필요)
- [ ] 슬롯 알림 (slot_start_reminder)
- [ ] 오프라인 임시저장

### P2 - 확장 기능
- [ ] 사용자 행사 등록 (`docs/proposals/user-event-registration.md`)
- [ ] 타임테이블 편집 (수정 제안 시스템)
- [ ] 셋리스트 편집
- [ ] Admin 모더레이션 도구
- [ ] AI 티켓 마스킹 (개인정보 자동 가림)
- [ ] SNS 공유 (인스타 스토리)
- [ ] 연말 결산 리포트

### P3 - 미래
- [ ] Headless 크롤링 (Playwright)
- [ ] 실시간 협업 편집
- [ ] ML 추천 시스템

---

## 파일 구조

```
src/
├── app/                    # 33개 페이지 (Next.js App Router)
├── components/             # 68개 컴포넌트
├── lib/
│   ├── *-context.tsx       # 28개 Context
│   ├── supabase/
│   │   ├── queries/        # 27개 쿼리 함수
│   │   └── hooks/          # Realtime 훅
│   ├── mock-data.ts        # Mock 데이터
│   └── utils/              # 유틸리티
└── types/                  # 타입 정의

supabase/migrations/        # 6개 마이그레이션 파일
docs/                       # 문서
e2e/                        # E2E 테스트
```

---

## 주요 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm run test:e2e     # E2E 테스트
npm run verify       # typecheck + lint + build + test
```
