# FesMate 개발 TODO 리스트 (v0.5)

> 기준 문서: PRD_fesmate_v0.5.md, UX_IA_fesmate_v0.5.md, fes_app_planning_summary_v0.5.md

## 진행 상태
- [ ] 미착수
- [~] 진행중
- [x] 완료

---

## 현재 구현 vs 최신 문서 불일치 사항

### 1. 네비게이션 구조
| 현재 | 최신 문서 |
|------|-----------|
| Home, Events, Transfer, Artists, My (5탭) | 홈, 탐색(행사), 커뮤니티, MyFes (4탭) |

### 2. 상태 모델
| 현재 | 최신 문서 |
|------|-----------|
| "Interest" 버튼 하나 | ⭐찜(Wishlist) / ✅다녀옴(Attended) 분리 |
| status: upcoming/live/ended | status: SCHEDULED/CHANGED/POSTPONED/CANCELED |
| - | override_mode: AUTO/LIVE/RECAP |

### 3. 행사 페이지
| 현재 | 최신 문서 |
|------|-----------|
| 단순 섹션 나열 | 탭 구조: 개요/허브/타임테이블/아티스트 |
| - | 허브 4박스 요약 + 피드 |
| - | LIVE/RECAP 모드 전환 |

### 4. 커뮤니티
| 현재 | 최신 문서 |
|------|-----------|
| Transfer (양도) 1개 메뉴 | 7개 카테고리: 동행/택시/밥/숙소/양도/후기·팁/질문 |
| - | 자동 만료 로직 |

### 5. 타입 정의 (event.ts)
| 현재 | 최신 문서 |
|------|-----------|
| date: string, time: string | start_at: Date, end_at: Date |
| - | timezone: string (기본 Asia/Seoul) |
| - | override_mode: AUTO/LIVE/RECAP |

---

## Phase 0: 프로젝트 셋업

### 개발 환경 구성
- [x] Next.js 16 프로젝트 초기화 (App Router)
- [x] TypeScript 5 설정
- [x] ESLint 설정
- [x] Tailwind CSS 4 설치 및 디자인 시스템
- [x] Git 저장소 생성
- [ ] 환경변수 설정 (.env.local)

### 백엔드 기본 구조
- [x] Supabase 클라이언트 설정 (client.ts, server.ts)
- [ ] Supabase 프로젝트 생성 및 연결
- [ ] 데이터베이스 스키마 설계 (PRD 기준)

---

## Phase 1: 코드베이스 정렬 (최신 문서 반영) [P0]

### 1.1 타입 정의 수정
- [ ] `event.ts` 재정의
  - [ ] status: SCHEDULED/CHANGED/POSTPONED/CANCELED
  - [ ] start_at, end_at (Date)
  - [ ] timezone (기본 Asia/Seoul)
  - [ ] override_mode: AUTO/LIVE/RECAP
- [ ] `post.ts` 생성 (글 타입 정의)
  - [ ] PostType: gate/md/facility/safety/official/companion/taxi/meal/lodge/transfer/review/video/question
- [ ] `user.ts` 생성
  - [ ] wishlist (⭐찜), attended (✅다녀옴)

### 1.2 네비게이션 구조 변경
- [ ] MobileNav 수정: 4탭 구조로 변경
  - [ ] 홈 → /
  - [ ] 탐색(행사) → /explore
  - [ ] 커뮤니티 → /community
  - [ ] MyFes → /myfes
- [ ] Header 수정: 통합 검색 + 알림함 + 프로필

### 1.3 라우트 구조 변경
- [ ] /events/hub → /explore (탐색)
- [ ] /events/[id] → /event/[id] (행사 상세)
- [ ] /companions → /community (커뮤니티)
- [ ] /my → /myfes (MyFes)

---

## Phase 2: 탐색(행사) 구현 [P0]

### 2.1 탐색 페이지 (/explore)
- [ ] 3뷰 토글: 카드뷰 | 리스트뷰 | 캘린더뷰
- [ ] 필터: 지역(시/구), 기간, 장르, 유/무료
- [ ] 정렬: 가까운 날짜(기본) / 최신 등록
- [ ] 검색 바

### 2.2 카드뷰
- [x] 기본 EventCard 컴포넌트
- [ ] ⭐찜 빠른 토글 추가
- [ ] ✅다녀옴 배지 표시
- [ ] 진행중 배지 표시

### 2.3 리스트뷰
- [ ] 정보 밀도 높은 리스트 컴포넌트

### 2.4 캘린더뷰
- [ ] 월/주 캘린더 컴포넌트
- [ ] 날짜 셀: 행사 존재 표시 (점/숫자)
- [ ] 날짜 클릭 → 대표 카드 1장 우선 노출 (내 찜/팔로우 기반)
- [ ] 바텀시트/패널

### 2.5 지난 행사 탐색
- [ ] 최근 12~24개월 범위
- [ ] 클릭 시 RECAP 모드로 진입

---

## Phase 3: 행사 페이지 구현 [P0]

### 3.1 행사 상세 헤더
- [ ] ⭐찜 / ✅다녀옴 버튼 (조작 메인)
- [ ] 예매 일정/링크/리마인더
- [ ] 공유 버튼

### 3.2 탭 구조
- [ ] 개요 탭
- [ ] 허브 탭 (LIVE/RECAP)
- [ ] 타임테이블 탭
- [ ] 아티스트 탭
- [ ] (P2) 후기·영상 탭

### 3.3 허브 탭 - 4박스 요약
- [ ] 실시간: 게이트/MD/시설/안전 요약 + 업데이트 시각 + 신뢰도
- [ ] 타임테이블: Now/Next + 진행 바
- [ ] 공식안내: Official 공지(핀) + 링크/미리보기
- [ ] 커뮤니티 요약: 동행/양도 최신 글 스니펫

### 3.4 허브 피드
- [ ] 필터 칩 (글 타입)
- [ ] 정렬: 최신 / 도움됨
- [ ] 포스트 카드 컴포넌트
- [ ] 하단 고정 CTA: **+ 올리기**

### 3.5 LIVE/RECAP 모드 전환
- [ ] 자동 전환 규칙 구현
  - LIVE: 현재 >= (start_at - 24h) AND 현재 < (end_at + 6h)
  - RECAP: 현재 >= (end_at + 6h)
- [ ] override_mode 지원

### 3.6 타임테이블 탭
- [ ] Now/Next 고정
- [ ] 슬롯 리스트: 시간/스테이지/아티스트
- [ ] ⭐ "보고 싶은 슬롯" 체크
- [ ] 아티스트 정보 드로어/모달

### 3.7 아티스트 탭/페이지
- [ ] 라인업 리스트
- [ ] 아티스트 상세: 프로필/팔로우/호응법/셋리스트

---

## Phase 4: 글 작성 시스템 [P0]

### 4.1 템플릿 기반 작성
- [x] 글 타입 선택 UI
- [x] 실시간 제보 템플릿 (게이트/MD/시설/안전)
- [x] 커뮤니티 템플릿 (동행/택시/밥/숙소/양도)
- [x] 후기 템플릿 (총평/슬롯 리뷰)
- [x] 영상 링크 템플릿

### 4.2 공통 기능
- [ ] 사진 업로드 (최대 3~5장)
- [x] 도움됨(Helpful) 반응
- [x] 신뢰도(A/B/C) 표기 (MVP: 단순 규칙)

---

## Phase 5: 커뮤니티 구현 [P0]

### 5.1 커뮤니티 페이지 (/community)
- [x] 7개 카테고리 탭: 동행/택시/밥/숙소/직거래양도/후기·팁/질문
- [x] 상단 행사 필터 (기본: 내 MyFes)
- [x] 기본 정렬: 약속 시간 가까운 순

### 5.2 자동 만료 로직
- [x] 상태: ACTIVE/EXPIRING/EXPIRED/CLOSED
- [x] 카테고리별 expires_at 산정
  - 택시팟: depart_at + 2h
  - 밥: meet_at + 3h
  - 숙소: checkin_at + 24h
  - 동행(일반): meet_at + 6h
  - 직거래양도: min(meet_at, start_at) + 1h
  - 후기·팁: 만료 없음 (30일 후 아카이브)
  - 질문: created_at + 14일

### 5.3 안전 기능
- [ ] 신고/차단 기능
- [ ] 연락처 마스킹
- [x] 위험 경고 문구

---

## Phase 6: MyFes 구현 [P0]

### 6.1 혼합 타임라인
- [x] 예정+지난 한 타임라인
- [x] 기본 진입: 오늘 근처 (오늘 앵커)

### 6.2 타임라인 카드
- [x] 상태 배지: ⭐찜 / ✅다녀옴 / 진행중
- [x] 퀵액션
  - 예정/진행중: 허브, 내 타임테이블
  - 다녀옴: RECAP 보기, 리뷰/영상 추가
- [x] 내가 남긴 것 카운트

### 6.3 보조 기능
- [ ] 월 점프/미니 캘린더
- [x] 필터: 종류/지역/리뷰 미작성만

---

## Phase 7: 인증 시스템 [P0]

### 7.1 소셜 로그인
- [x] 로그인 페이지 UI (기본 완료)
- [x] Google OAuth 연동 (Supabase Auth) ✅ 동작함
- [~] 카카오 OAuth 연동 (Supabase Auth) - **보류**

  **카카오 OAuth 이슈 (KOE205):**
  - 문제: `account_email` 권한 없음 (사업자 인증 필요)
  - 시도한 것:
    1. Supabase "Allow users without an email" 활성화
    2. Supabase "Confirm email" 비활성화
    3. 카카오 동의항목 설정 (profile_nickname, profile_image 필수동의)
    4. 카카오 리다이렉트 URI 설정
    5. 코드에서 scopes 명시적 지정 (`profile_nickname profile_image`)
  - 해결 방안: 사업자등록 후 account_email 권한 신청 또는 추가 디버깅 필요
- [ ] 네이버 OAuth 연동 (Supabase 미지원, 보류)

### 7.2 권한 관리
- [ ] 비로그인: 조회만 가능
- [ ] USER: 글/댓글, 찜/다녀옴, 알림 설정
- [ ] ADMIN: 허브 편집, override, 신고 처리

### 7.3 프로필
- [ ] 닉네임(필수), 프로필 이미지(선택), 한줄소개(선택)

---

## Phase 8: 알림 시스템 [P0]

### 8.1 인앱 알림함
- [x] 알림 목록 UI
- [x] 읽음/안읽음 상태
- [x] 딥링크 라우팅
- [x] Header 알림 배지 (읽지 않은 알림 수)

### 8.2 알림 이벤트 (MVP)
- [x] 알림 타입 정의 (12개 타입)
- [x] Mock 알림 데이터
- [ ] 실제 알림 트리거 (백엔드 연동 필요)

### 8.3 알림 정책
- [ ] Quiet Hours: 22:00–08:00
- [ ] 중복 묶음 (dedupe_key)
- [ ] 푸시 알림 (선택, P1)

---

## Phase 9: Dev 메뉴 (디버그) [P0]

> MVP UI/UX 검증을 위한 필수 기능

### 9.1 시나리오 데이터셋
- [ ] Scenario A: 기본 (단일일정, 예정)
- [ ] Scenario B: 다일(multi-day) 페스티벌
- [ ] Scenario C: 종료 시각 누락 (엣지)
- [ ] Scenario D: 취소(CANCELED)
- [ ] Scenario E: 연기/일정 변경
- [ ] Scenario F: 타임존(해외 행사)

### 9.2 시간 시뮬레이터
- [ ] now 설정
- [ ] +1h, +6h, +1d 빠른 전진
- [ ] 리셋

### 9.3 상태 토글
- [ ] event.status 토글
- [ ] override_mode 토글
- [ ] 커뮤니티 만료 트리거

### 9.4 알림 트리거
- [ ] 샘플 알림 생성
- [ ] 딥링크 테스트

### 9.5 세션 토글
- [ ] 로그아웃/유저1/유저2 전환
- [ ] 차단 상태 토글

---

## Phase 10: 안전/정책 [P0]

### 10.1 신고
- [x] 신고 사유: 스팸/사기/욕설/혐오/성희롱/개인정보/불법/기타
- [x] 신고 타입 정의 (report.ts)
- [x] 신고 모달 UI (ReportModal)
- [x] 처리 상태: received → in_review → action_taken/no_action

### 10.2 자동 숨김
- [ ] 신고 누적 시 임시 숨김/블러
- [ ] "검토 중" 표시

### 10.3 차단
- [x] 차단 Context (BlockProvider)
- [x] 차단 확인 모달 (BlockConfirmModal)
- [x] 상호 글/댓글/프로필 숨김 (클라이언트)
- [ ] 알림/멘션 차단 (백엔드 연동 필요)

### 10.4 포스트 액션 메뉴
- [x] PostActionMenu 컴포넌트
- [x] 커뮤니티 페이지 연결

### 10.5 레이트리밋
- [ ] 신규 계정 글/댓글 빈도 제한
- [ ] 동일 내용 반복 제한

---

## Phase 11: 품질/고도화 [P1]

### 11.1 도움됨 반응
- [ ] 도움됨 버튼 UI
- [ ] 정렬 적용 (RECAP: 도움됨 우선)

### 11.2 신뢰도 고도화
- [ ] 증빙(사진) 가중치
- [ ] 작성자 평판 신호

### 11.3 슬롯 알림
- [ ] slot_start_reminder: 보고 싶은 슬롯 N분 전

### 11.4 오프라인/임시저장
- [ ] 작성 중 임시저장 (드래프트)
- [ ] 네트워크 불안정 시 재시도

### 11.5 추천/대표 카드
- [ ] 캘린더 대표 카드 선정 규칙 (팔로우/인기 tie-break)

---

## Phase 12: Admin 도구 [P2 / Future]

### 12.1 행사 관리
- [ ] 행사 생성/수정
- [ ] 상태/기간/타임존 변경

### 12.2 소스/변경 제안 검수
- [ ] 수집된 공지/변경 감지 승인/반려

### 12.3 Official 공지 관리
- [ ] 등록/핀/긴급 표시

### 12.4 모더레이션
- [ ] 신고 큐
- [ ] 글 숨김/복구
- [ ] 사용자 경고/차단

### 12.5 감사로그
- [ ] 운영자 액션 기록

---

## 데이터베이스 스키마 (참고)

### 핵심 테이블
```
events
  - id, title, start_at, end_at, timezone
  - venue_id, type, status, override_mode
  - poster_url, price, created_at, updated_at

venues
  - id, name, address, lat, lng

artists
  - id, name, image, genre

event_artists
  - event_id, artist_id, slot_order

slots (타임테이블)
  - id, event_id, artist_id, stage
  - start_at, end_at, day

posts (허브/커뮤니티 통합)
  - id, event_id, user_id
  - type (글 타입)
  - content, images
  - helpful_count, status
  - expires_at, created_at

user_events
  - user_id, event_id
  - is_wishlist, is_attended

user_slots
  - user_id, slot_id, is_checked

notifications
  - id, user_id, type
  - event_id, post_id
  - title, body, deep_link
  - is_read, created_at
```

---

## 진행률

| Phase | 제목 | 우선순위 | 상태 |
|-------|------|----------|------|
| 0 | 프로젝트 셋업 | - | [x] 완료 |
| 1 | 코드베이스 정렬 | P0 | [x] 완료 |
| 2 | 탐색(행사) | P0 | [x] 완료 |
| 3 | 행사 페이지 | P0 | [x] 완료 |
| 4 | 글 작성 시스템 | P0 | [x] 완료 |
| 5 | 커뮤니티 | P0 | [x] 완료 |
| 6 | MyFes | P0 | [x] 완료 |
| 7 | 인증 시스템 | P0 | [~] Google 완료, 카카오 보류 |
| 8 | 알림 시스템 | P0 | [x] 완료 (UI 구현) |
| 9 | Dev 메뉴 | P0 | [x] 완료 (간소화) |
| 10 | 안전/정책 | P0 | [x] 완료 (신고/차단 UI) |
| 11 | 품질/고도화 | P1 | [ ] 미착수 |
| 12 | Admin 도구 | P2 | [ ] 미착수 |

---

## 다음 단계

### 즉시 수정 (Quick Wins)
- [x] 지역 필터 로직 구현 (ExplorePage)
- [x] 무료 필터 로직 구현 (ExplorePage)
- [x] HubTab 내부 useMemo 적용

### 중기 개선
- [ ] EventDetailPage 컴포넌트 분할 (724줄 → 5개 파일)
- [ ] 날짜 포맷 유틸리티 추출 (`src/lib/utils/date-format.ts`)
- [ ] 테마/스타일 상수 중앙화

### 백엔드 연동 시
- [ ] Supabase DB 스키마 설계
- [ ] 무한 스크롤 / 페이지네이션 구현
- [ ] 서버 사이드 필터/정렬 적용

---

## 기술 부채

### 코드 구조
| 파일 | 현재 | 권장 |
|------|------|------|
| `event/[id]/page.tsx` | 724줄 (탭 컴포넌트 포함) | 탭별 분리 |
| `explore/page.tsx` | 350줄 | 유지 가능 |
| `community/page.tsx` | 356줄 | 유지 가능 |

### 필터 구현 현황
| 필터 | UI | 로직 |
|------|-----|------|
| 지역 (region) | ✅ | ✅ |
| 무료만 (freeOnly) | ✅ | ✅ |
| 기간 (period) | ✅ | ✅ |
| 장르 (genre) | ✅ | ✅ |

### 렌더링 최적화
- [x] HubTab: 포스트 분류 로직 useMemo 적용
- [ ] 리스트 가상화: 대규모 데이터 시 필요 (현재 불필요)

### UX 개선
- 무한 스크롤: 백엔드 연동 후 구현
- 데스크탑 허브: 4열 레이아웃 미적용
- 검색: 단순 문자열 매칭 (향후 퍼지 검색 고려)
