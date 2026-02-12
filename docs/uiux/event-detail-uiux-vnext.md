# 행사 상세 UI/UX 개선 제안 (vNext)

> **작성일:** 2026-01-19  
> **수정일:** 2026-01-19  
> **상태:** 설계 초안  
> **우선순위:** 홈 다음 2순위  
> **테마:** 라이트 테마 기반

---

## 1. 배경 및 목표

### 1.1 현재 구조
행사 상세 페이지는 **탭 기반 허브** 구조입니다.
- 개요(Overview): 기본 정보, 예매 링크, 통계
- 허브(Hub): LIVE/RECAP 모드, 실시간 제보, 커뮤니티
- 타임테이블: Now/Next, 슬롯 목록
- 아티스트: 출연진 목록, 콜가이드 연동

### 1.2 개선 목표
- **정보 밀도 최적화**: 핵심 정보 빠른 파악
- **라이트 테마**: 웜 화이트 배경 + 소프트 섀도우
- **탭 UX 강화**: 부드러운 전환 + 상태 표시 (SOIL 스타일)
- **LIVE/RECAP 구분 명확화**: 모드별 UI 차별화
- **액션 버튼 개선**: 찜/다녀옴 피드백 강화

### 1.3 주요 레퍼런스
| 레퍼런스 | 적용 포인트 |
|----------|-------------|
| **Melbourne Food & Wine Festival** | Hero 구조, Quick Info Chips |
| **SOIL** | 탭 전환 애니메이션, 톤 |
| **Wilde Weide Festival** | 타임테이블 UX |
| **Eventbrite** | 정보 카드 그룹화 |

---

## 2. 현재 행사 상세 구조 (AS-IS)

```
src/app/event/[id]/page.tsx
├── Sticky Header (뒤로가기, 제목, 공유)
├── Hero Section
│   ├── 포스터 + LIVE/RECAP 뱃지
│   ├── 제목/일시/장소
│   └── 찜/다녀옴 버튼
├── Tab Navigation (개요/허브/타임테이블/아티스트)
└── Tab Content
    ├── OverviewTab - 기본 정보, 예매, 통계
    ├── HubTab - 4박스 요약, 피드, 필터
    ├── TimetableTab - Now/Next, 슬롯 목록
    └── ArtistsTab - 출연진 목록
```

**탭 컴포넌트:**
- `OverviewTab.tsx` - 행사 정보 카드형 나열
- `HubTab.tsx` - LIVE/RECAP 분기 + 4박스 요약 + 피드
- `TimetableTab.tsx` - Grid/List 뷰 + Now/Next
- `ArtistsTab.tsx` - 아티스트 카드 + 콜가이드 연동

---

## 3. 제안 행사 상세 구조 (TO-BE)

### 3.1 전체 구조

```
행사 상세 (vNext)
├── [1] Sticky Header (개선)
│   └── 뒤로가기 / 제목(축약) / 공유 + 더보기
├── [2] Hero Section (리디자인)
│   ├── 포스터 (glass effect + parallax hint)
│   ├── 상태 뱃지 (LIVE/RECAP/SOON/ENDED)
│   ├── Quick Info Chips (날짜/장소/가격)
│   └── Action Row (찜/다녀옴 - 분리형)
├── [3] Tab Navigation (개선)
│   └── Sticky + Underline Slider + LIVE 뱃지
├── [4] Tab Content (각 탭 개선)
│   ├── OverviewTab - 카드 그룹화 + CTA 강조
│   ├── HubTab - 상태칩 + 피드 하이라이트
│   ├── TimetableTab - Now/Next 강조 + 진행바
│   └── ArtistsTab - 그리드 + 콜가이드 배지
└── [5] Floating Action (개선)
    └── FAB + 길게 누르면 카테고리 확장
```

### 3.2 섹션별 상세

#### [1] Sticky Header (개선)
- **현재**: 뒤로가기 / 제목 / 공유
- **개선**: 
  - 제목은 스크롤 시에만 표시 (히어로에서 사라진 후)
  - 더보기 메뉴 (신고, 공유, 캘린더 추가)
- **Micro**: 스크롤 다운 시 제목 fade-in (100ms)

#### [2] Hero Section (리디자인)
**포스터 영역**
- Glass effect 배경 (포스터 blur + overlay)
- 포스터 카드에 soft shadow + 살짝 기울기 (3D 힌트)
- 상태 뱃지 위치 통일 (좌상단)

**상태 뱃지**
| 상태 | 색상 | 효과 |
|------|------|------|
| LIVE | red-500 | pulse 1.5s |
| SOON (7일 내) | amber-500 | - |
| RECAP | gray-600 | - |
| ENDED | gray-400 | - |

**Quick Info Chips**
- 3개 칩으로 핵심 정보 요약: `📅 1/25(토)` `📍 올림픽홀` `💰 99,000원`
- 칩 탭 시 상세 정보로 스크롤/모달

**Action Row (분리형)**
- 찜 버튼: 아이콘 + "찜" + 수치 (N명)
- 다녀옴 버튼: 아이콘 + "다녀옴" + 수치
- **Micro**: 
  - 클릭 시 아이콘 scale 1.2 → 1.0 (200ms)
  - 수치 증가 시 숫자 bounce

#### [3] Tab Navigation (개선)
- Sticky (헤더 아래 고정)
- Underline slider: 탭 전환 시 밑줄이 슬라이드
- LIVE 뱃지: 허브 탭에 LIVE 상태일 때 표시
- **Micro**: 탭 전환 150ms, 밑줄 슬라이드 200ms ease-out

#### [4-A] OverviewTab (개선)
**정보 카드 그룹화**
```
┌─────────────────────────────────┐
│ 📋 핵심 정보                      │
│ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │일시 │ │장소 │ │가격 │        │
│ └─────┘ └─────┘ └─────┘        │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 🎫 예매                          │
│ [인터파크] [YES24] [멜론티켓]     │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 📊 통계                          │
│ 찜 1,234 │ 다녀옴 567 │ 후기 89  │
└─────────────────────────────────┘
```

**예매 CTA 강화**
- 예매 오픈 전: "D-7 예매 오픈" 카운트다운
- 예매 중: Primary 버튼 강조
- 예매 종료: muted 처리

#### [4-B] HubTab (개선)
**상단 상태칩**
- LIVE 모드: `🔴 LIVE` 칩 + 마지막 업데이트 시간
- RECAP 모드: `📝 RECAP` 칩 + 평균 평점

**4박스 요약 개선**
| 박스 | LIVE 모드 | RECAP 모드 |
|------|-----------|------------|
| 1 | 실시간 제보 요약 | 총평/평점 |
| 2 | Now/Next | 베스트 후기 |
| 3 | 공식 안내 | 베스트 영상 |
| 4 | 커뮤니티 요약 | 슬롯별 요약 |

**피드 하이라이트**
- 새 글 등장: 0.15s highlight + slide-in
- 글 타입 칩 색상 통일
- 도움됨 버튼: 클릭 시 +1 애니메이션

#### [4-C] TimetableTab (개선)
**Now/Next 강조 블록**
```
┌─────────────────────────────────┐
│ 🎵 NOW                          │
│ IU - 14:00~14:45                │
│ ████████████░░░░░░ 65%          │
│ [콜가이드 보기]                  │
├─────────────────────────────────┤
│ ⏭️ NEXT                         │
│ NewJeans - 15:00~15:45          │
│ 15분 후 시작                     │
└─────────────────────────────────┘
```

**진행바**
- 현재 슬롯: 진행률 표시 (실시간 업데이트)
- 색상: primary gradient

**슬롯 카드**
- 시간 / 스테이지 / 아티스트 / 콜가이드 뱃지
- 체크(⭐보고 싶은 슬롯) 시 하이라이트

#### [4-D] ArtistsTab (개선)
**그리드 레이아웃**
- 2열 그리드 (아티스트 카드)
- 카드: 이미지 + 이름 + 콜가이드 뱃지

**콜가이드 연동**
- 콜가이드 있는 아티스트: `📣 콜가이드` 뱃지
- 탭 시 콜가이드 페이지로 이동

#### [5] Floating Action (개선)
**FAB 확장 (옵션)**
- 기본: + 버튼
- 길게 누르면: 카테고리 선택 (실시간 제보 / 커뮤니티 / 후기)
- **Micro**: 확장 시 radial menu 200ms

---

## 4. 마이크로 인터랙션 가이드

| 요소 | 효과 | 시간 | 비고 |
|------|------|------|------|
| 탭 전환 | fade + slide | 150ms | content area |
| 탭 밑줄 슬라이드 | translateX | 200ms | ease-out |
| 찜/다녀옴 클릭 | icon scale 1.2→1 | 200ms | + 수치 bounce |
| LIVE 뱃지 | pulse | 1.5s | infinite |
| Now 진행바 | width animate | 1s | linear |
| 새 글 등장 | highlight + slide | 150ms | bg fade 2s |
| FAB 확장 | radial expand | 200ms | scale + fade |
| 헤더 제목 | fade in | 100ms | 스크롤 트리거 |

---

## 5. 톤 가이드 (행사 상세용) - 라이트 테마

### 5.1 컬러 팔레트

```css
/* 배경 */
--bg-primary: #FAFAF8;      /* 웜 화이트 (메인) */
--bg-secondary: #F5F5F0;    /* 약간 어두운 웜 화이트 */
--bg-surface: #FFFFFF;      /* 카드, 모달 */

/* 텍스트 */
--text-primary: #1A1A1A;
--text-secondary: #6B6B6B;
--text-muted: #9CA3AF;

/* 상태 컬러 */
--status-live: #EF4444;
--status-soon: #F59E0B;
--status-ended: #9CA3AF;
```

### 5.2 Hero 영역
- 포스터 배경: `bg-gray-100` + 소프트 그라데이션 (옵션)
- 포스터 카드: `shadow-md` + `rounded-lg` (소프트 섀도우)
- 뱃지 위치: 좌상단

### 5.3 탭 영역
- 활성 탭: `text-primary` + `font-medium`
- 비활성 탭: `text-muted` (#6B6B6B)
- 밑줄: 2px, primary color, slide 애니메이션

### 5.4 카드 스타일
- 정보 카드: `rounded-lg bg-white shadow-sm border border-gray-100`
- 요약 박스: `rounded-xl bg-gray-50 p-4`
- 피드 카드: `rounded-lg bg-white border border-gray-100 hover:shadow-md`

### 5.5 상태 색상
| 상태 | 색상 | 용도 |
|------|------|------|
| LIVE | #EF4444 (red) | 진행 중 |
| SOON | #F59E0B (amber) | 7일 내 |
| ENDED | #9CA3AF (gray) | 종료 후 |
| 찜 활성 | #FBBF24 (yellow) | 찜 상태 |
| 다녀옴 활성 | #10B981 (green) | 다녀옴 상태 |

---

## 6. 구현 우선순위

| 순서 | 항목 | 난이도 | 영향도 |
|------|------|--------|--------|
| 1 | Hero 리디자인 (Quick Info Chips) | 중 | 높음 |
| 2 | 탭 밑줄 슬라이더 | 하 | 중 |
| 3 | 찜/다녀옴 마이크로 애니메이션 | 하 | 중 |
| 4 | Now/Next 진행바 | 중 | 중 |
| 5 | HubTab 상태칩 + 하이라이트 | 중 | 중 |
| 6 | FAB 확장 메뉴 | 중 | 낮음 |

---

## 7. 관련 컴포넌트

| 파일 | 설명 | 수정 범위 |
|------|------|----------|
| `src/app/event/[id]/page.tsx` | 메인 페이지 | Hero, Tab Nav |
| `src/app/event/[id]/components/OverviewTab.tsx` | 개요 탭 | 카드 그룹화 |
| `src/app/event/[id]/components/HubTab.tsx` | 허브 탭 | 상태칩, 피드 |
| `src/app/event/[id]/components/TimetableTab.tsx` | 타임테이블 탭 | Now/Next 블록 |
| `src/app/event/[id]/components/ArtistsTab.tsx` | 아티스트 탭 | 그리드 레이아웃 |

---

## 8. 다음 단계

1. **UI 토큰 세트 정의** - Tailwind config 업데이트
2. **공통 컴포넌트 추출** - StatusBadge, QuickInfoChip, TabSlider
3. **프로토타입** - Hero + Tab 전환 구현

---

## 부록: 대화 기록 요약

### 개선 방향 (홈 문서 연계)
- **라이트 테마 기반**: 웜 화이트 배경 + 소프트 섀도우
- **레퍼런스 조합**: Melbourne F&W + SOIL + Eventbrite
- **은은한 전환**: 120~200ms 애니메이션
- **정보 밀도 조절**: 핵심만 노출, 상세는 펼침/모달

### 탭별 개선 포인트
| 탭 | 핵심 개선 |
|------|----------|
| Overview | Quick Info Chips + 예매 CTA 강조 |
| Hub | 상태칩 + 피드 하이라이트 |
| Timetable | Now/Next 진행바 |
| Artists | 그리드 + 콜가이드 뱃지 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-19 | 최초 작성 |
| 2026-01-19 | 라이트 테마 기준으로 업데이트, 레퍼런스 추가 |
