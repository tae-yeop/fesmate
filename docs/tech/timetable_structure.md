# 타임테이블 구조 설계 (Timetable Structure)

> 단독 공연과 페스티벌의 타임테이블 구조 차이점과 통합 처리 방안

## 개요

행사 유형에 따라 타임테이블 구조가 크게 다릅니다:
- **단독 공연 (Concert)**: 운영 일정 중심 (MD 판매, 입장, 공연 시작 등)
- **페스티벌 (Festival)**: 멀티 스테이지 + 아티스트 라인업 중심

## 행사 유형별 타임테이블 비교

### 단독 공연 (Concert/Musical/Exhibition)

```
┌─────────────────────────────────────────────────────────────┐
│  🎤 아티스트A 단독 콘서트                                     │
│  2025-03-15 (토) 올림픽공원 체조경기장                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⏰ 오늘의 일정                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  09:00  🛍️  MD 현장 판매 시작                                │
│              └─ 1층 로비 MD 부스                             │
│                                                             │
│  15:00  🎫  티켓 현장 수령 시작                               │
│              └─ 티켓 박스 (2층 로비)                          │
│                                                             │
│  16:00  🧳  물품 보관소 오픈                                  │
│              └─ 지하 1층                                     │
│                                                             │
│  17:00  🚶  스탠딩 대기 시작                                  │
│              └─ A게이트 앞 대기열                             │
│                                                             │
│  17:30  🚪  스탠딩 입장 시작                                  │
│              └─ 번호표 순서대로                               │
│                                                             │
│  18:00  🪑  지정석 입장 시작                                  │
│              └─ 전 게이트                                    │
│                                                             │
│  19:00  🎵  공연 시작                        ← NOW           │
│              └─ 예상 러닝타임: 2시간 30분                     │
│                                                             │
│  21:30  🔚  공연 종료 (예정)                                  │
│                                                             │
│  21:45  🚌  셔틀버스 운행 시작                                │
│              └─ 잠실역, 강남역 방면                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**특징**:
- 단일 아티스트 (또는 게스트 포함 소수)
- 운영 일정이 중요 (MD, 입장, 셔틀 등)
- 시간순 선형 진행
- 스테이지 개념 없음 (또는 단일 스테이지)

### 페스티벌 (Festival)

```
┌─────────────────────────────────────────────────────────────┐
│  🎪 Pentaport Rock Festival 2025                            │
│  Day 2 / 2025-08-02 (토)                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  스테이지 선택: [전체] [Main] [Sub] [Green]                   │
│                                                             │
│  ┌─────────────┬─────────────┬─────────────┐               │
│  │ Main Stage  │ Sub Stage   │ Green Stage │               │
│  ├─────────────┼─────────────┼─────────────┤               │
│  │             │             │             │               │
│  │ 14:00-14:50 │ 14:30-15:10 │ 14:00-14:40 │               │
│  │ 밴드A       │ 밴드D       │ 밴드G       │               │
│  │             │             │             │               │
│  │ 15:10-16:00 │ 15:30-16:10 │ 15:00-15:40 │               │
│  │ 밴드B       │ 밴드E       │ 밴드H       │               │
│  │             │             │             │               │
│  │ 16:20-17:20 │ 16:30-17:10 │ 16:00-16:40 │  ← NOW       │
│  │ 밴드C ⭐    │ 밴드F       │ 밴드I       │               │
│  │             │             │             │               │
│  │ 17:40-18:40 │ 17:30-18:10 │ 17:00-17:40 │               │
│  │ 해드라이너  │ 밴드J       │ 밴드K       │               │
│  │             │             │             │               │
│  └─────────────┴─────────────┴─────────────┘               │
│                                                             │
│  📍 NOW: Main Stage - 밴드C (16:35/17:20)                   │
│  ⏭️ NEXT: Sub Stage - 밴드F (17:30~)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**특징**:
- 다수 아티스트 (수십~수백 팀)
- 멀티 스테이지 (2~5개)
- 동시간대 여러 공연 진행
- 다일 행사 (Day 1, Day 2...)
- 아티스트 라인업이 핵심

## 데이터 구조

### 현재 Slot 타입 (아티스트 중심)

```typescript
interface Slot {
  id: string;
  eventId: string;
  artistId?: string;
  artist?: Artist;
  stage?: string;
  day?: number;
  startAt: Date;
  endAt: Date;
  title?: string;  // 아티스트가 아닌 경우
}
```

### 확장: OperationalSlot (운영 일정)

```typescript
/** 운영 일정 타입 */
type OperationalSlotType =
  | 'md_sale'           // MD 판매 시작/종료
  | 'ticket_pickup'     // 티켓 현장 수령
  | 'locker_open'       // 물품 보관소 오픈
  | 'queue_start'       // 대기열 시작
  | 'standing_entry'    // 스탠딩 입장
  | 'seated_entry'      // 지정석 입장
  | 'show_start'        // 공연 시작
  | 'show_end'          // 공연 종료
  | 'intermission'      // 인터미션
  | 'encore'            // 앵콜
  | 'shuttle'           // 셔틀버스
  | 'photo_time'        // 포토타임
  | 'custom';           // 기타

/** 운영 일정 슬롯 */
interface OperationalSlot {
  id: string;
  eventId: string;
  type: OperationalSlotType;
  title: string;              // 표시할 제목
  description?: string;       // 상세 설명
  location?: string;          // 위치 (예: "1층 로비", "A게이트")
  startAt: Date;
  endAt?: Date;               // 종료 시간 (없으면 시점 이벤트)
  icon?: string;              // 커스텀 아이콘
  isHighlight?: boolean;      // 중요 일정 여부
}
```

### 통합 타임라인 아이템

```typescript
/** 타임라인 아이템 (아티스트 슬롯 + 운영 슬롯 통합) */
type TimelineItem =
  | { type: 'performance'; slot: Slot }
  | { type: 'operational'; slot: OperationalSlot };

/** 통합 타임라인 */
interface Timeline {
  eventId: string;
  eventType: EventType;
  day?: number;
  items: TimelineItem[];
}
```

## 행사 유형별 처리 로직

### 1. 타임테이블 뷰 결정

```typescript
function getTimelineViewType(event: Event): 'linear' | 'grid' {
  switch (event.type) {
    case 'festival':
      // 페스티벌: 스테이지가 2개 이상이면 그리드 뷰
      const stageCount = new Set(event.slots?.map(s => s.stage)).size;
      return stageCount >= 2 ? 'grid' : 'linear';

    case 'concert':
    case 'musical':
    case 'exhibition':
    default:
      // 단독 공연: 항상 선형 뷰
      return 'linear';
  }
}
```

### 2. 타임라인 아이템 정렬

```typescript
function sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
  return items.sort((a, b) => {
    const timeA = a.type === 'performance' ? a.slot.startAt : a.slot.startAt;
    const timeB = b.type === 'performance' ? b.slot.startAt : b.slot.startAt;
    return new Date(timeA).getTime() - new Date(timeB).getTime();
  });
}
```

### 3. 현재 진행 중인 아이템 찾기

```typescript
function getCurrentItems(items: TimelineItem[], now: Date): TimelineItem[] {
  return items.filter(item => {
    const slot = item.type === 'performance' ? item.slot : item.slot;
    const start = new Date(slot.startAt);
    const end = slot.endAt ? new Date(slot.endAt) : null;

    if (!end) {
      // 종료 시간 없음: 시작 시간 이후면 현재
      return now >= start;
    }

    return now >= start && now < end;
  });
}
```

## UI 컴포넌트 구조

### 단독 공연용: LinearTimeline

```
src/components/timetable/
├── LinearTimeline.tsx      # 선형 타임라인 (단독 공연)
│   ├── OperationalItem.tsx # 운영 일정 아이템
│   └── PerformanceItem.tsx # 공연 아이템 (게스트 등)
```

```tsx
// LinearTimeline.tsx
function LinearTimeline({ event, items, now }: Props) {
  const sortedItems = sortTimelineItems(items);
  const currentIndex = findCurrentItemIndex(sortedItems, now);

  return (
    <div className="space-y-2">
      {sortedItems.map((item, index) => (
        <TimelineItem
          key={item.id}
          item={item}
          isNow={index === currentIndex}
          isPast={index < currentIndex}
        />
      ))}
    </div>
  );
}
```

### 페스티벌용: GridTimeline

```
src/components/timetable/
├── GridTimeline.tsx        # 그리드 타임라인 (페스티벌)
│   ├── StageColumn.tsx     # 스테이지 컬럼
│   ├── SlotCard.tsx        # 아티스트 슬롯 카드
│   └── TimeAxis.tsx        # 시간 축
```

```tsx
// GridTimeline.tsx
function GridTimeline({ event, slots, stages, now }: Props) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `auto repeat(${stages.length}, 1fr)` }}>
      {/* 시간 축 */}
      <TimeAxis startHour={12} endHour={23} />

      {/* 스테이지별 컬럼 */}
      {stages.map(stage => (
        <StageColumn
          key={stage}
          stage={stage}
          slots={slots.filter(s => s.stage === stage)}
          now={now}
        />
      ))}
    </div>
  );
}
```

### 통합 래퍼: TimetableView

```tsx
// TimetableView.tsx
function TimetableView({ event }: Props) {
  const viewType = getTimelineViewType(event);
  const { getNow } = useDevContext();
  const now = getNow();

  if (viewType === 'grid') {
    return (
      <GridTimeline
        event={event}
        slots={event.slots || []}
        stages={getUniqueStages(event.slots)}
        now={now}
      />
    );
  }

  // 선형 뷰: 운영 슬롯 + 공연 슬롯 통합
  const items = mergeTimelineItems(
    event.operationalSlots || [],
    event.slots || []
  );

  return (
    <LinearTimeline
      event={event}
      items={items}
      now={now}
    />
  );
}
```

## 운영 슬롯 아이콘 매핑

```typescript
const OPERATIONAL_SLOT_ICONS: Record<OperationalSlotType, { icon: LucideIcon; color: string }> = {
  md_sale: { icon: ShoppingBag, color: 'text-pink-500' },
  ticket_pickup: { icon: Ticket, color: 'text-blue-500' },
  locker_open: { icon: Package, color: 'text-gray-500' },
  queue_start: { icon: Users, color: 'text-orange-500' },
  standing_entry: { icon: DoorOpen, color: 'text-green-500' },
  seated_entry: { icon: Armchair, color: 'text-green-500' },
  show_start: { icon: Music, color: 'text-purple-500' },
  show_end: { icon: CheckCircle, color: 'text-gray-500' },
  intermission: { icon: Coffee, color: 'text-amber-500' },
  encore: { icon: Sparkles, color: 'text-yellow-500' },
  shuttle: { icon: Bus, color: 'text-blue-500' },
  photo_time: { icon: Camera, color: 'text-pink-500' },
  custom: { icon: Clock, color: 'text-gray-500' },
};
```

## Event 타입 확장

```typescript
// src/types/event.ts 확장

interface Event {
  // ... 기존 필드 ...

  // 타임테이블 구조 힌트
  timetableType?: 'linear' | 'grid' | 'auto';

  // 운영 일정 (단독 공연용)
  operationalSlots?: OperationalSlot[];

  // 스테이지 목록 (페스티벌용)
  stages?: Stage[];
}

interface Stage {
  id: string;
  name: string;        // "Main Stage", "Sub Stage"
  shortName?: string;  // "Main", "Sub" (UI 표시용)
  order: number;       // 정렬 순서
  color?: string;      // 스테이지 구분 색상
}
```

## 사용 예시

### 단독 콘서트 데이터

```typescript
const concertEvent: Event = {
  id: 'concert-1',
  title: '아티스트A 단독 콘서트',
  type: 'concert',
  timetableType: 'linear',
  startAt: new Date('2025-03-15T19:00'),
  endAt: new Date('2025-03-15T21:30'),

  // 운영 일정
  operationalSlots: [
    { id: 'op-1', type: 'md_sale', title: 'MD 현장 판매 시작', startAt: new Date('2025-03-15T09:00'), location: '1층 로비' },
    { id: 'op-2', type: 'ticket_pickup', title: '티켓 현장 수령', startAt: new Date('2025-03-15T15:00'), location: '티켓박스' },
    { id: 'op-3', type: 'standing_entry', title: '스탠딩 입장', startAt: new Date('2025-03-15T17:30'), location: 'A게이트' },
    { id: 'op-4', type: 'seated_entry', title: '지정석 입장', startAt: new Date('2025-03-15T18:00'), location: '전 게이트' },
    { id: 'op-5', type: 'show_start', title: '공연 시작', startAt: new Date('2025-03-15T19:00'), isHighlight: true },
    { id: 'op-6', type: 'show_end', title: '공연 종료 (예정)', startAt: new Date('2025-03-15T21:30') },
  ],

  // 공연 슬롯 (메인 아티스트 + 게스트)
  slots: [
    { id: 's-1', artistId: 'guest-1', title: '오프닝: 게스트B', startAt: new Date('2025-03-15T19:00'), endAt: new Date('2025-03-15T19:20') },
    { id: 's-2', artistId: 'main-1', title: '메인: 아티스트A', startAt: new Date('2025-03-15T19:30'), endAt: new Date('2025-03-15T21:30') },
  ],
};
```

### 페스티벌 데이터

```typescript
const festivalEvent: Event = {
  id: 'festival-1',
  title: 'Pentaport Rock Festival 2025',
  type: 'festival',
  timetableType: 'grid',
  startAt: new Date('2025-08-01'),
  endAt: new Date('2025-08-03'),

  stages: [
    { id: 'main', name: 'Main Stage', shortName: 'Main', order: 1, color: '#ef4444' },
    { id: 'sub', name: 'Sub Stage', shortName: 'Sub', order: 2, color: '#3b82f6' },
    { id: 'green', name: 'Green Stage', shortName: 'Green', order: 3, color: '#22c55e' },
  ],

  slots: [
    // Day 1
    { id: 's-1', day: 1, stage: 'main', artistId: 'a1', startAt: new Date('2025-08-01T14:00'), endAt: new Date('2025-08-01T14:50') },
    { id: 's-2', day: 1, stage: 'sub', artistId: 'a2', startAt: new Date('2025-08-01T14:30'), endAt: new Date('2025-08-01T15:10') },
    // ... 더 많은 슬롯
  ],
};
```

## 마이그레이션 가이드

### Phase 1: 타입 확장
1. `OperationalSlotType` 타입 추가
2. `OperationalSlot` 인터페이스 추가
3. `Event`에 `operationalSlots`, `stages`, `timetableType` 필드 추가

### Phase 2: 컴포넌트 분리
1. `LinearTimeline` 컴포넌트 구현
2. `GridTimeline` 기존 코드 리팩토링
3. `TimetableView` 래퍼로 통합

### Phase 3: Mock 데이터 확장
1. 단독 콘서트 시나리오 추가 (운영 일정 포함)
2. 기존 페스티벌 데이터에 stages 필드 추가

### Phase 4: Admin 도구
1. 운영 일정 편집 UI
2. 스테이지 관리 UI
3. 타임테이블 타입 선택

## 연관 문서

- [콜가이드 시스템](./call_guide.md) - 타임테이블 슬롯에서 콜가이드 연동
- [Event 타입 정의](../../src/types/event.ts) - 기본 타입 정의
