# 콜가이드 시스템 (Call Guide System)

> 아티스트 곡별 호응법(콜&리스폰스)을 커뮤니티가 함께 작성/편집하는 시스템

## 개요

콜가이드는 공연에서 관객이 아티스트와 함께 호응하는 방법을 정리한 가이드입니다.
YouTube 영상과 시간 동기화하여 가사와 호응 지시를 실시간으로 표시합니다.

```
┌─────────────────────────────────────────────────┐
│  ▶ YouTube Player                               │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │          [영상 재생 영역]                 │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│  ──●────────────────────────── 1:23 / 3:45     │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐   │
│  │ 1:20  🎤 [가사] 너를 만난 이 거리에서      │   │
│  │ 1:23  📣 [떼창] 함께 불러요!              │ ← 현재 │
│  │ 1:28  👋 [동작] 손 흔들기                 │   │
│  │ 1:35  🎤 [가사] 영원히 기억할게           │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 콜 타입 (Call Types)

| 타입 | 아이콘 | 색상 | 설명 | 예시 |
|------|--------|------|------|------|
| `lyrics` | 🎤 | gray | 가사 표시 | 일반 가사 |
| `singalong` | 🎵 | blue | 떼창 구간 | 코러스, 후렴 |
| `call` | 📣 | orange | 추임새/콜 | "Hey!", "Yeah!" |
| `response` | 💬 | purple | 리스폰스 | 아티스트 질문에 대한 응답 |
| `action` | 👋 | green | 동작 | 손흔들기, 점프 |
| `jump` | 🦘 | green | 점프 | 떼점프 구간 |
| `light` | 📱 | yellow | 조명 | 플래시, 응원봉 |
| `quiet` | 🤫 | muted | 조용히 | 발라드, 멘트 구간 |
| `clap` | 👏 | pink | 박수 | 리듬에 맞춰 박수 |
| `wave` | 🌊 | cyan | 파도 | 파도타기 |

## 데이터 구조

### Song (곡 정보)

```typescript
interface Song {
  id: string;                    // 고유 ID
  title: string;                 // 곡 제목
  artistId: string;              // 아티스트 ID
  artistName: string;            // 아티스트 이름
  youtubeId: string;             // YouTube 영상 ID
  duration: number;              // 재생 시간 (초)
  thumbnailUrl?: string;         // 썸네일 URL
  releaseYear?: number;          // 발매 연도
  album?: string;                // 앨범명
}
```

### CallGuideEntry (콜가이드 항목)

```typescript
interface CallGuideEntry {
  id: string;                    // 고유 ID
  startTime: number;             // 시작 시간 (초, 소수점 허용)
  endTime?: number;              // 종료 시간 (선택)
  type: CallType;                // 콜 타입
  text: string;                  // 표시할 텍스트 (가사/지시)
  textRomanized?: string;        // 로마자 표기
  textOriginal?: string;         // 원문 (일본어/영어 등)
  instruction?: string;          // 추가 설명
  intensity?: 1 | 2 | 3;         // 강도 (1: 약, 2: 보통, 3: 강)
}
```

### CallGuide (콜가이드 전체)

```typescript
interface CallGuide {
  id: string;                    // 고유 ID
  songId: string;                // 곡 ID
  entries: CallGuideEntry[];     // 항목 목록
  createdBy: string;             // 최초 작성자 ID
  createdAt: Date;               // 생성 시각
  updatedAt: Date;               // 수정 시각
  version: number;               // 버전 번호
  contributors: string[];        // 기여자 목록
  status: 'draft' | 'published' | 'verified';
  verifiedBy?: string;           // 검증자 ID
  helpfulCount: number;          // 도움됨 수
}
```

### CallGuideVersion (버전 히스토리)

```typescript
interface CallGuideVersion {
  id: string;
  callGuideId: string;
  version: number;
  entries: CallGuideEntry[];
  editedBy: string;
  editedAt: Date;
  changeDescription?: string;    // 변경 설명
}
```

## YouTube 연동

### YouTube IFrame API 사용

```typescript
// YouTube Player 초기화
const player = new YT.Player('player', {
  height: '360',
  width: '640',
  videoId: song.youtubeId,
  playerVars: {
    autoplay: 0,
    controls: 1,
    rel: 0,
  },
  events: {
    onReady: onPlayerReady,
    onStateChange: onPlayerStateChange,
  }
});

// 현재 재생 시간 추적 (100ms 간격)
const syncInterval = setInterval(() => {
  const currentTime = player.getCurrentTime();
  updateActiveEntry(currentTime);
}, 100);
```

### 시간 동기화 로직

```typescript
function updateActiveEntry(currentTime: number) {
  const activeEntry = entries.find(entry =>
    currentTime >= entry.startTime &&
    (!entry.endTime || currentTime < entry.endTime)
  );

  if (activeEntry !== previousActive) {
    highlightEntry(activeEntry);
    scrollToEntry(activeEntry);
  }
}
```

## 에디터 UX

### 타임스탬프 입력 방식

1. **실시간 마킹**: 영상 재생 중 키보드로 마킹
   - `Space`: 현재 시간에 빈 항목 추가
   - `1-9`: 콜 타입 단축키
   - `Enter`: 텍스트 입력 모드

2. **수동 입력**: 시간 직접 입력
   - `MM:SS.ms` 형식 (예: `01:23.5`)

3. **드래그 조정**: 타임라인에서 드래그로 미세 조정

### 키보드 단축키

| 키 | 기능 |
|----|------|
| `Space` | 재생/일시정지 |
| `←` / `→` | 5초 이동 |
| `Shift + ←/→` | 1초 이동 |
| `M` | 현재 시간에 마킹 |
| `1` | 가사 (lyrics) |
| `2` | 떼창 (singalong) |
| `3` | 콜 (call) |
| `4` | 동작 (action) |
| `5` | 조명 (light) |
| `Delete` | 항목 삭제 |
| `Ctrl+S` | 저장 |

## 컴포넌트 구조

```
src/
├── types/
│   └── call-guide.ts           # 타입 정의
├── lib/
│   └── call-guide-context.tsx  # Context (CRUD, 동기화)
├── components/
│   └── call-guide/
│       ├── index.ts
│       ├── CallGuideViewer.tsx      # 뷰어 (재생 + 가이드 표시)
│       ├── CallGuideEditor.tsx      # 에디터 (작성/수정)
│       ├── CallGuideTimeline.tsx    # 타임라인 UI
│       ├── CallGuideEntry.tsx       # 개별 항목
│       ├── CallTypePalette.tsx      # 콜 타입 선택
│       ├── YouTubePlayer.tsx        # YouTube 플레이어 래퍼
│       └── MiniCallGuide.tsx        # 미니 뷰어 (공연 중)
└── app/
    └── call-guide/
        ├── page.tsx                 # 콜가이드 목록
        ├── [songId]/
        │   └── page.tsx             # 콜가이드 뷰어
        └── edit/
            └── [songId]/
                └── page.tsx         # 콜가이드 에디터
```

## 페이지 라우팅

| 경로 | 설명 |
|------|------|
| `/call-guide` | 콜가이드 목록 (아티스트별/최근/인기) |
| `/call-guide/[songId]` | 콜가이드 뷰어 |
| `/call-guide/edit/[songId]` | 콜가이드 에디터 |
| `/call-guide/new` | 새 콜가이드 생성 (곡 검색) |

## 연동 포인트

### 1. 타임테이블 연동

```
타임테이블 슬롯 → 아티스트 클릭 → 호응법 탭 → 곡 목록 → 콜가이드 뷰어
```

### 2. 아티스트 페이지 연동

```
아티스트 페이지 → 호응법 탭 → 인기순/최근순 콜가이드 목록
```

### 3. LIVE 모드 연동

```
현재 공연 중인 슬롯 → 예상 셋리스트 → 현재 곡 추정 → 미니 콜가이드 표시
```

### 4. 알림 연동

```
슬롯 시작 10분 전 → "호응법 확인하기" 푸시 알림 → 콜가이드 목록으로 이동
```

## 저장소 전환 (LocalStorage → Supabase)

### Phase 1: LocalStorage

```typescript
const STORAGE_KEY = 'fesmate_call_guides';

function saveCallGuide(callGuide: CallGuide) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const updated = [...existing.filter(g => g.id !== callGuide.id), callGuide];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
```

### Phase 2: Supabase

```sql
-- 콜가이드 테이블
CREATE TABLE call_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID REFERENCES songs(id),
  entries JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  helpful_count INTEGER DEFAULT 0
);

-- 버전 히스토리
CREATE TABLE call_guide_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_guide_id UUID REFERENCES call_guides(id),
  version INTEGER NOT NULL,
  entries JSONB NOT NULL,
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMPTZ DEFAULT now(),
  change_description TEXT
);

-- RLS 정책
ALTER TABLE call_guides ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능
CREATE POLICY "Public read" ON call_guides FOR SELECT USING (true);

-- 로그인 사용자만 작성 가능
CREATE POLICY "Auth insert" ON call_guides FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- 작성자 또는 기여자만 수정 가능
CREATE POLICY "Contributors update" ON call_guides FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = ANY(contributors));
```

## 신뢰도 시스템

### 신뢰도 등급

| 등급 | 조건 | 표시 |
|------|------|------|
| 검증됨 (Verified) | 관리자 검증 | ✅ 공식 가이드 |
| 신뢰 (Trusted) | 도움됨 50+ 또는 기여자 5+ | ⭐ 커뮤니티 추천 |
| 일반 (Normal) | 기본 상태 | (표시 없음) |
| 초안 (Draft) | 미완성/비공개 | 📝 작성 중 |

### 기여도 점수

- 콜가이드 최초 작성: 20점
- 콜가이드 수정 기여: 5점
- 도움됨 받음: 2점 (per 1개)
- 검증됨 승인: 30점

## 향후 확장

### P2 기능

1. **음성 가이드**: TTS로 콜 타이밍에 음성 안내
2. **진동 피드백**: 모바일에서 콜 타이밍에 진동
3. **AR 오버레이**: 카메라로 무대 보며 가이드 표시
4. **셋리스트 연동**: 실시간 셋리스트와 콜가이드 자동 연결

### 데이터 수집

1. **Setlist.fm API**: 과거 셋리스트 데이터
2. **YouTube 자막**: 자동 가사 추출 (베이스라인)
3. **커뮤니티 제보**: 실시간 셋리스트 업데이트
