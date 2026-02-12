# FesMate 개발 TODO 리스트

> **Last updated:** 2026-01-19 (UI/UX 개선 설계 완료)  
> **기준 문서:** `docs/PRD.md`, `docs/UX_IA.md`, `docs/SUMMARY.md`

---

## 현재 상태 요약

| 구분 | 상태 | 비고 |
|------|------|------|
| **프론트엔드 UI** | ✅ 99% 완료 | 35개 페이지, 73개 컴포넌트 |
| **상태관리 (Context)** | ✅ 31개 완료 | 대부분 Supabase 쿼리 연동 |
| **백엔드 쿼리** | ✅ 27개 완료 | src/lib/supabase/queries/ |
| **인증** | ✅ Google OAuth | 카카오는 사업자 인증 필요 |
| **DB 스키마** | ✅ 설계 완료 | 마이그레이션 파일 14개 |
| **PWA** | ✅ 완료 | sw.js, manifest.json |
| **E2E 테스트** | ✅ 152개 통과 | Playwright |
| **UI/UX 개선** | 📐 설계 완료 | 라이트 테마, 구현 대기 |
| **배포** | ⏳ 미착수 | Vercel 예정 |

---

## ✅ 완료된 기능

### 프로젝트 셋업
- [x] Next.js 16 (App Router) + TypeScript 5
- [x] Tailwind CSS 4 디자인 시스템
- [x] Supabase 클라이언트 설정
- [x] E2E 테스트 (Playwright) - 152개 통과

### 페이지 (35개)
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
- [x] 연말 리포트 (`/report/[year]`)
- [x] Admin 페이지 9개 (`/admin/*`)

### Context (31개)
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
- [x] TrustContext - 신뢰도/어뷰징 감지 (localStorage)
- [x] CrewSubgroupContext - 크루 소그룹 (localStorage)
- [x] SlotContentContext - 슬롯 콘텐츠
- [x] TimetableSuggestionContext - 타임테이블 제안
- [x] GalleryContext - 갤러리
- [x] PushContext - 푸시 알림
- [x] RateLimitContext - 레이트 제한
- [x] SanctionContext - 제재
- [x] SetlistContext - 셋리스트 (localStorage)
- [x] ThemeContext - 테마/다크모드 (localStorage)
- [x] OfflineContext - 오프라인 임시저장 (IndexedDB)

### 컴포넌트 (73개+)
- [x] 레이아웃: Header, MobileNav
- [x] 이벤트: EventCard, EventListItem, EventCalendarView, EventRegistrationModal
- [x] 글: PostComposer, PostDetailModal, HiddenPostPlaceholder
- [x] 티켓북: TicketCard, TicketGrid, TicketViewer, TicketEditorModal, ShareModal 등 14개
- [x] 콜가이드: CallGuideViewer, CallGuideEditor, CallGuideList, CallGuideHistory, CallGuideSuggestion, CallGuideReport (6개)
- [x] 타임테이블: LinearTimeline, MyTimetableView, SlotEditModal 등 6개
- [x] 크루: CreateCrewModal, CrewCalendar, CrewTimetableOverlay, CreateSubgroupModal
- [x] 소셜: CompanionRequestModal, FriendActivityFeed, FriendsHighlightCarousel
- [x] 안전: ReportModal, BlockConfirmModal, PostActionMenu
- [x] 활동: ActivityTimeline, ActivityStats, ActivityCard
- [x] 리포트: YearlyReportCard, ReportGenerator
- [x] 기타: DevPanel, DevStatusBar, MapActionSheet, LoginPromptModal 등
- [x] 셋리스트: SetlistEditorModal, SetlistViewer
- [x] 티켓 마스킹: TicketMaskingEditor

### 특수 기능
- [x] FieldNote (콜가이드): 뷰어/에디터, YouTube 동기화, 버전 히스토리, 신고/롤백
- [x] 나만의 타임테이블: 슬롯 마킹, 커스텀 이벤트, ICS 내보내기
- [x] 크루 시스템: 생성/가입/캘린더/소그룹/히트맵
- [x] 리더보드: 주간/월간/전체, Wilson Score 적용, 신고 시 점수 차감
- [x] 배지 시스템: 23개 배지, 자동 획득
- [x] 티켓북: 호모그래피 에디터, 템플릿
- [x] 지도 딥링크: Google Maps, 카카오맵, 네이버지도
- [x] 공유 기능: Web Share API + 클립보드, SNS 공유 유틸
- [x] PWA: Service Worker, Web App Manifest
- [x] 다크모드: ThemeContext, CSS 변수

### P2 확장 기능 (2026-01-11 완료)
- [x] UI/UX 전면 리뉴얼 (색상, 타이포그래피, 간격)
- [x] 다크모드 지원 (`src/lib/theme-context.tsx`)
- [x] 사용자 행사 등록 (`EventRegistrationModal.tsx`)
- [x] 타임테이블 편집 (`SuggestionReviewPanel.tsx`)
- [x] 셋리스트 편집 (`SetlistEditorModal.tsx`, `SetlistViewer.tsx`)
- [x] Admin 모더레이션 도구 (`/admin/moderation`)
- [x] AI 티켓 마스킹 (`TicketMaskingEditor.tsx`)
- [x] SNS 공유 유틸 (`share-utils.ts`)
- [x] 연말 결산 리포트 (`/report/[year]`)

### 알림 시스템 고도화
- [x] Quiet Hours (22:00–08:00) + urgent 타입 예외
- [x] 중복 묶음 (dedupe_key, 30분 내 1회)
- [x] 슬롯 시작 10분 전 알림 (slot_start_reminder)

### 콜가이드 고도화
- [x] 버전 히스토리 UI (CallGuideHistory.tsx)
- [x] 수정 제안 (CallGuideSuggestion.tsx)
- [x] 신고/롤백 기능 (CallGuideReport.tsx)
- [x] LIVE 연동 (HubTab)

### 리더보드 고도화
- [x] Wilson Score 계산 (`src/types/leaderboard.ts`)
- [x] 최근성 가중치 (Recency Weight/Decay Factor)
- [x] 어뷰징 패턴 감지 (`src/lib/trust-context.tsx` - ACTIVITY_LIMITS)

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
| DB 스키마 설계 | ✅ 완료 | `supabase/migrations/` 14개 |
| 쿼리 함수 | ✅ 완료 | 27개 파일 |
| Context 연동 | ✅ 완료 | 26개 Context에서 import |
| 마이그레이션 실행 | ✅ 완료 | 13개 마이그레이션 동기화 |
| 환경변수 설정 | ✅ 완료 | .env.local |
| 타입 생성 | ✅ 완료 | `src/types/database.generated.ts` |

### Admin 페이지 완성도
| 페이지 | 상태 | 비고 |
|--------|------|------|
| `/admin` | ✅ 95% | 대시보드 |
| `/admin/audit` | ✅ 70% | 감사 로그 |
| `/admin/moderation` | ✅ 90% | 모더레이션 도구 |
| `/admin/reports` | ✅ 100% | 신고 관리 - 필터/탭/상세보기/상태변경 |
| `/admin/events` | ✅ 100% | 행사 관리 - 검색/필터/수정/삭제 |
| `/admin/users` | ✅ 100% | 사용자 관리 - 정지/해제/경고/상세 |
| `/admin/content` | ✅ 100% | 콘텐츠 관리 - 글/댓글 삭제 |
| `/admin/crawl` | ⏳ 40% | 크롤링 관리 |
| `/admin/crawl/suggestions` | ✅ 100% | 크롤링 제안 승인/거절 |

---

## ⏳ 미구현 (향후 계획)

### P1 - 다음 단계
| 항목 | 상태 | 비고 |
|------|------|------|
| 카카오 OAuth | ⏸️ 보류 | 사업자 인증 필요 |
| 네이버 OAuth | ⏸️ 보류 | 사업자 인증 필요 |
| 슬롯 알림 실제 푸시 | ⏳ 미구현 | FCM/APNS 연동 필요 |
| 오프라인 임시저장 | ✅ 완료 | IndexedDB, 자동저장, 동기화 |

### P2 - 크루 고급 기능 ✅ 완료 (2026-01-13)
| 항목 | 상태 | 비고 |
|------|------|------|
| 크루 히트맵 뷰 | ✅ 완료 | `CrewHeatmap.tsx` - 주간/월간 참여 시각화 |
| 크루 통계/차트 뷰 | ✅ 완료 | `CrewStats.tsx` - 장르/공연장/월별 통계 |
| 취향 유사 멤버 추천 | ✅ 완료 | `CrewSimilarMembers.tsx` - Jaccard 유사도 |

### P2 - 오프라인 임시저장 ✅ 완료 (2026-01-13)
| 항목 | 상태 | 비고 |
|------|------|------|
| IndexedDB 저장소 | ✅ 완료 | `src/lib/offline/indexed-db.ts` - idb 라이브러리 |
| 글 임시저장 | ✅ 완료 | `src/lib/offline/draft-store.ts` - 7일 보관 |
| 자동저장 (디바운스) | ✅ 완료 | `src/lib/hooks/use-autosave.ts` - 1초 디바운스 |
| 동기화 대기열 | ✅ 완료 | `src/lib/offline/sync-queue.ts` - 지수 백오프 |
| PostComposer 통합 | ✅ 완료 | 임시저장 목록, 복원, 삭제 |
| 오프라인 상태 표시 | ✅ 완료 | `OfflineIndicator.tsx` |
| E2E 테스트 | ✅ 완료 | `e2e/offline-draft.spec.ts` - 7개 테스트 |

### P2 - UI/UX 리디자인 📐 설계 완료 (2026-01-19)

> 설계 문서: `docs/uiux/references.md`, `docs/uiux/home-uiux-vnext.md`, `docs/uiux/event-detail-uiux-vnext.md`

**테마 방향**: 라이트 테마 기반 (웜 화이트 #FAFAF8) + 선택적 다크 모드  
**주요 레퍼런스**: Melbourne F&W (구조) + SOIL (톤/전환) + Eventbrite (UX)  
**성능 가이드**: `vercel-react-best-practices` 스킬 적용

| 항목 | 상태 | 우선순위 | 비고 |
|------|------|----------|------|
| **1. UI 토큰 세트** | ⏳ 미구현 | 🔴 높음 | Tailwind config - 컬러/섀도우/radius/transition |
| **2. 공통 컴포넌트** | ⏳ 미구현 | 🔴 높음 | StatusBadge, EventCard(v2), TabSlider |
| **3. 홈 리디자인** | ⏳ 미구현 | 🔴 높음 | 히어로 + LIVE 섹션 + 카드 스타일 |
| **4. 행사 상세 리디자인** | ⏳ 미구현 | 🟡 중간 | Hero + Quick Info Chips + 탭 UX |
| **5. 마이크로 인터랙션** | ⏳ 미구현 | 🟡 중간 | 카드 호버, LIVE pulse, 탭 전환 |
| **6. 다크 모드 지원** | ⏳ 미구현 | 🟢 낮음 | 라이트 완료 후 |

**구현 순서**:
```
1. UI 토큰 → 2. 공통 컴포넌트 → 3. 홈 → 4. 행사 상세 → 5. 인터랙션 → 6. 다크 모드
```

**컬러 팔레트 (확정)**:
```css
--bg-primary: #FAFAF8;      /* 웜 화이트 */
--bg-surface: #FFFFFF;      /* 카드 */
--text-primary: #1A1A1A;    /* 텍스트 */
--status-live: #EF4444;     /* LIVE */
--status-soon: #F59E0B;     /* SOON */
```

### P3 - 미래
| 항목 | 상태 | 비고 |
|------|------|------|
| Headless 크롤링 | ⏳ 미구현 | Playwright |
| 실시간 협업 편집 | ⏳ 미구현 | |
| ML 추천 시스템 | ⏳ 미구현 | |

---

## 파일 구조

```
src/
├── app/                    # 35개 페이지 (Next.js App Router)
├── components/             # 75개+ 컴포넌트
├── lib/
│   ├── *-context.tsx       # 31개 Context
│   ├── supabase/
│   │   ├── queries/        # 27개 쿼리 함수
│   │   └── hooks/          # Realtime 훅
│   ├── offline/            # 오프라인 저장소 (IndexedDB)
│   ├── mock-data.ts        # Mock 데이터
│   └── utils/              # 유틸리티
└── types/                  # 타입 정의

supabase/migrations/        # 14개 마이그레이션 파일
docs/
├── uiux/                   # UI/UX 설계 문서 (NEW)
│   ├── references.md       # 레퍼런스 16개+
│   ├── home-uiux-vnext.md  # 홈 개선안
│   └── event-detail-uiux-vnext.md  # 행사 상세 개선안
└── ...                     # 기타 문서
e2e/                        # E2E 테스트 (152개)
public/
├── sw.js                   # Service Worker
└── manifest.json           # PWA manifest
```

---

## 주요 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 빌드
npm run test:e2e     # E2E 테스트
npm run verify       # typecheck + lint + build + test
```
