# 사용자 이벤트 등록 시스템 (PRD 6.20)

> **목적**: 사용자가 직접 행사 정보를 등록하고, 타임테이블을 편집할 수 있도록 지원
> **상태**: 📋 기획 (미구현)

---

## 1. 개요

### 1.1 배경
- 현재 행사 데이터는 관리자 또는 크롤링을 통해서만 추가됨
- 작은 공연, 지역 행사, 비공식 이벤트 등은 등록되지 않는 경우가 많음
- 사용자가 직접 행사를 등록하고 관리할 수 있으면 데이터 커버리지 확대

### 1.2 목표
1. **사용자 행사 등록**: 누구나 행사 정보를 등록할 수 있음
2. **타임테이블 편집**: 등록자 또는 권한 있는 사용자가 타임테이블 수정 가능
3. **커뮤니티 검증**: 다른 사용자의 수정 제안 및 검증 시스템
4. **품질 관리**: 중복/스팸 방지 및 신뢰도 시스템

---

## 2. 사용자 스토리

### 2.1 행사 등록
> "인디밴드 공연을 보러 가는데 FesMate에 등록이 안 되어 있어서 직접 등록하고 싶어요"

**플로우:**
1. 탐색 페이지에서 "행사 등록" 버튼 클릭
2. 행사 기본 정보 입력 (필수/선택)
3. 타임테이블 정보 입력 (옵션)
4. 검토 후 등록 완료
5. 다른 사용자가 볼 수 있음

### 2.2 타임테이블 편집
> "공식 사이트에서 타임테이블이 업데이트됐는데 FesMate에는 반영이 안 됐어요"

**플로우:**
1. 행사 상세 > 타임테이블 탭에서 "수정 제안" 버튼 클릭
2. 기존 데이터 위에 수정/추가/삭제
3. 변경 이유 작성 후 제출
4. 관리자 또는 원 등록자가 승인
5. 승인 시 반영, 기여자로 기록

### 2.3 셋리스트 편집
> "어제 공연 셋리스트를 기록해두고 싶어요"

**플로우:**
1. 행사 상세 > 아티스트 탭에서 슬롯 클릭
2. "셋리스트 추가/편집" 버튼 클릭
3. 곡 목록 입력 (순서, 곡명, 특이사항)
4. 저장 → 다른 사용자도 열람 가능

---

## 3. 기능 상세

### 3.1 행사 등록 폼

#### 필수 입력 항목
| 필드 | 타입 | 설명 |
|------|------|------|
| 제목 (title) | string | 행사 이름 |
| 시작일시 (start_at) | datetime | 행사 시작 시각 |
| 장소명 (venue_name) | string | 공연장/행사장 이름 |
| 장소 주소 (venue_address) | string | 도로명 또는 지번 주소 |
| 행사 유형 (event_type) | enum | concert / festival / exhibition / musical / sports / etc |

#### 선택 입력 항목
| 필드 | 타입 | 설명 |
|------|------|------|
| 종료일시 (end_at) | datetime | 행사 종료 시각 |
| 포스터 (poster_url) | image | 행사 포스터 이미지 |
| 티켓 가격 (price) | string | 가격 정보 (무료, 유료, 미정) |
| 예매 링크 (ticket_links) | array | 예매처 URL 목록 |
| 출연진 (artists) | array | 출연 아티스트 목록 |
| 설명 (description) | text | 행사 소개 |
| 공식 사이트 (official_url) | url | 공식 페이지 링크 |
| 타임존 (timezone) | string | 기본: Asia/Seoul |

#### UI 모크업
```
┌─────────────────────────────────────┐
│  🎤 행사 등록                     [X] │
├─────────────────────────────────────┤
│                                     │
│  📋 기본 정보                        │
│  ┌─────────────────────────────┐   │
│  │ 행사 제목 *                   │   │
│  │ [                          ] │   │
│  └─────────────────────────────┘   │
│                                     │
│  📅 일정                            │
│  ┌────────────┐ ┌────────────┐    │
│  │ 시작일시 *   │ │ 종료일시     │    │
│  │ [12/25 19:00]│ │ [12/25 22:00]│    │
│  └────────────┘ └────────────┘    │
│                                     │
│  📍 장소                            │
│  ┌─────────────────────────────┐   │
│  │ 장소명 *                      │   │
│  │ [홍대 롤링홀              ] │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 주소 *                       │   │
│  │ [서울 마포구 서교동 364-20  ] │   │
│  └─────────────────────────────┘   │
│  [🔍 주소 검색]                     │
│                                     │
│  🎭 행사 유형 *                      │
│  (•) 콘서트  ( ) 페스티벌  ( ) 전시  │
│  ( ) 뮤지컬  ( ) 스포츠   ( ) 기타  │
│                                     │
│  🖼️ 포스터 (선택)                   │
│  [이미지 업로드]                     │
│                                     │
│  👥 출연진 (선택)                    │
│  [+ 아티스트 추가]                   │
│                                     │
│  💰 가격 정보 (선택)                 │
│  [일반 50,000원, 스탠딩 45,000원   ] │
│                                     │
│  🔗 예매 링크 (선택)                 │
│  [+ 예매처 추가]                     │
│                                     │
├─────────────────────────────────────┤
│  [취소]                   [등록하기] │
└─────────────────────────────────────┘
```

### 3.2 타임테이블 편집

#### 편집 가능 항목
- **슬롯 추가**: 새 공연/세션 추가
- **슬롯 수정**: 시간, 아티스트, 스테이지 변경
- **슬롯 삭제**: 취소된 슬롯 제거
- **스테이지 추가/수정**: 페스티벌의 경우 스테이지 관리
- **운영 슬롯 추가**: 오프닝, 휴식, 서프라이즈 등

#### 편집 권한 레벨
| 레벨 | 대상 | 권한 |
|------|------|------|
| 등록자 | 행사 최초 등록자 | 즉시 수정 가능 |
| 신뢰 사용자 | 기여도 높은 유저 | 즉시 수정 가능 (추후) |
| 일반 사용자 | 모든 로그인 유저 | 수정 제안 → 승인 필요 |
| 비로그인 | - | 열람만 가능 |

#### 수정 제안 플로우
```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  수정 내용     │ ──▶ │  제안 대기열   │ ──▶ │  승인/반려     │
│  작성         │     │  등록         │     │  처리         │
└───────────────┘     └───────────────┘     └───────────────┘
                                                   │
                      ┌────────────────────────────┴────────┐
                      ▼                                     ▼
              ┌───────────────┐                     ┌───────────────┐
              │  반영 완료     │                     │  반려 알림     │
              │  기여자 기록   │                     │  사유 전달     │
              └───────────────┘                     └───────────────┘
```

### 3.3 셋리스트 편집

#### 데이터 구조
```typescript
interface Setlist {
  id: string;
  slotId: string;          // 어떤 슬롯(공연)의 셋리스트인지
  eventId: string;
  artistId: string;
  songs: SetlistSong[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: "draft" | "published";
  helpfulCount: number;
}

interface SetlistSong {
  order: number;           // 순서 (1부터 시작)
  title: string;           // 곡명
  isEncore: boolean;       // 앵콜 여부
  note?: string;           // 특이사항 (어쿠스틱 버전, 콜라보 등)
  duration?: number;       // 곡 길이 (초)
  callGuideId?: string;    // 연결된 콜가이드 ID
}
```

#### UI 모크업
```
┌─────────────────────────────────────┐
│  📝 셋리스트 편집                  [X] │
│  [아티스트명] @ [행사명]              │
├─────────────────────────────────────┤
│                                     │
│  🎵 곡 목록                          │
│                                     │
│  1. [곡 제목 입력              ] [🗑️]│
│     □ 앵콜  [메모 추가]              │
│                                     │
│  2. [곡 제목 입력              ] [🗑️]│
│     □ 앵콜  [메모 추가]              │
│                                     │
│  3. [곡 제목 입력              ] [🗑️]│
│     ☑ 앵콜  "어쿠스틱 버전"          │
│                                     │
│  [+ 곡 추가]                        │
│                                     │
│  ─────────────────────────────────  │
│  💡 팁: 드래그해서 순서를 변경할 수 있어요 │
│                                     │
├─────────────────────────────────────┤
│  [취소]                   [저장하기] │
└─────────────────────────────────────┘
```

---

## 4. 데이터베이스 스키마

### 4.1 신규 테이블

```sql
-- 사용자 등록 행사 (기존 events 테이블 확장)
ALTER TABLE events ADD COLUMN registered_by UUID REFERENCES users(id);
ALTER TABLE events ADD COLUMN registration_status TEXT DEFAULT 'published'; -- draft, pending, published, rejected
ALTER TABLE events ADD COLUMN source TEXT DEFAULT 'official'; -- official, user, crawl

-- 타임테이블 수정 제안
CREATE TABLE timetable_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  suggester_id UUID NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL, -- add_slot, edit_slot, delete_slot, add_stage, edit_stage
  target_id UUID, -- 수정 대상 slot_id 또는 stage_id (신규 추가 시 NULL)
  before_data JSONB, -- 변경 전 데이터
  after_data JSONB NOT NULL, -- 변경 후 데이터
  reason TEXT, -- 변경 사유
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 셋리스트
CREATE TABLE setlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id),
  created_by UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'published', -- draft, published
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_id) -- 슬롯당 하나의 셋리스트
);

-- 셋리스트 곡 목록
CREATE TABLE setlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  song_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  is_encore BOOLEAN DEFAULT FALSE,
  note TEXT,
  duration INTEGER, -- 초 단위
  call_guide_id UUID REFERENCES call_guides(id),
  UNIQUE(setlist_id, song_order)
);

-- 기여 기록
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  contribution_type TEXT NOT NULL, -- event_register, timetable_edit, setlist_add
  target_type TEXT NOT NULL, -- event, slot, setlist
  target_id UUID NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_events_registered_by ON events(registered_by);
CREATE INDEX idx_timetable_suggestions_event ON timetable_suggestions(event_id);
CREATE INDEX idx_timetable_suggestions_status ON timetable_suggestions(status);
CREATE INDEX idx_setlists_slot ON setlists(slot_id);
CREATE INDEX idx_setlists_event ON setlists(event_id);
CREATE INDEX idx_contributions_user ON contributions(user_id);
```

### 4.2 RLS 정책

```sql
-- 사용자 등록 행사: 누구나 읽기, 로그인 사용자 쓰기
CREATE POLICY "events_user_registered_read" ON events
  FOR SELECT USING (registration_status = 'published' OR registered_by = auth.uid());

CREATE POLICY "events_user_registered_insert" ON events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 타임테이블 제안: 누구나 읽기, 로그인 사용자 쓰기
CREATE POLICY "timetable_suggestions_read" ON timetable_suggestions
  FOR SELECT USING (TRUE);

CREATE POLICY "timetable_suggestions_insert" ON timetable_suggestions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 셋리스트: 누구나 읽기, 로그인 사용자 쓰기/수정
CREATE POLICY "setlists_read" ON setlists
  FOR SELECT USING (status = 'published' OR created_by = auth.uid());

CREATE POLICY "setlists_insert" ON setlists
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "setlists_update" ON setlists
  FOR UPDATE USING (created_by = auth.uid());
```

---

## 5. 구현 계획

### Phase 1: 행사 등록 기본 (P1)
- [ ] 행사 등록 폼 UI (`EventRegistrationModal`)
- [ ] 장소 검색 API 연동 (카카오/네이버 지도 API)
- [ ] 이미지 업로드 (포스터)
- [ ] `events` 테이블 `registered_by`, `source` 컬럼 추가
- [ ] 사용자 등록 행사 목록 표시 (탐색 페이지)

### Phase 2: 타임테이블 편집 (P1)
- [ ] 타임테이블 편집 모드 UI
- [ ] 슬롯 추가/수정/삭제 기능
- [ ] 수정 제안 제출 플로우
- [ ] 제안 승인/반려 관리 UI (등록자용)
- [ ] `timetable_suggestions` 테이블 생성

### Phase 3: 셋리스트 (P2)
- [ ] 셋리스트 편집 UI (`SetlistEditorModal`)
- [ ] 드래그 앤 드롭 순서 변경
- [ ] 콜가이드 연동 (곡 → 콜가이드 링크)
- [ ] `setlists`, `setlist_songs` 테이블 생성
- [ ] 도움됨 버튼 연동

### Phase 4: 품질 관리 (P2)
- [ ] 중복 행사 감지 (제목/날짜/장소 유사도)
- [ ] 신뢰도 시스템 (기여 포인트)
- [ ] 신고/숨김 처리
- [ ] 기여자 배지 (리더보드 연동)

---

## 6. 고려사항

### 6.1 중복 방지
- 행사 등록 시 유사 행사 검색 후 안내
- 동일 장소/날짜/아티스트 조합 경고
- 관리자 병합 기능 (중복 행사 통합)

### 6.2 스팸 방지
- 신규 사용자 등록 제한 (하루 N건)
- 반복 등록/수정 쿨다운
- 신고 누적 시 등록 권한 제한

### 6.3 저작권
- 포스터 이미지 출처 표시 권장
- 셋리스트는 사용자 기록이므로 저작권 이슈 낮음

### 6.4 신뢰도
- 공식 소스 > 신뢰 사용자 등록 > 일반 사용자 등록
- 검증된 정보에 "✓ 검증됨" 배지 표시
- 수정 이력 투명하게 공개

---

## 7. 관련 문서

- [PRD v0.5](../PRD_fesmate_v0.5_UPDATED.md)
- [타임테이블 구조 설계](../tech/timetable_structure.md)
- [콜가이드 시스템 설계](../tech/call_guide.md)
- [데이터베이스 스키마](../tech/database-schema.md)

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-12-25 | 0.1 | 초안 작성 |
