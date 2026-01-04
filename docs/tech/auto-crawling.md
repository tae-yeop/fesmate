# 자동 크롤링 파이프라인

> 예매처 사이트를 주기적으로 크롤링하여 새 행사를 자동으로 발견하고 DB에 등록하는 시스템

## 개요

기존 URL Import 파이프라인(`src/lib/crawl/`)을 확장하여 **Vercel Cron 기반 자동 크롤링** 시스템을 구현합니다.

### 핵심 기능

1. **새 행사 자동 발견**: 예매처 카테고리 페이지에서 개별 행사 URL 추출
2. **신뢰도 기반 자동 승인**: 신뢰도 HIGH는 자동 반영, MEDIUM/LOW는 수동 검토
3. **Admin UI**: 크롤링 현황 모니터링 및 제안 검토

---

## 시스템 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Vercel Cron     │────▶│ List Crawler    │────▶│ Detail Crawler  │
│ (6시간마다)     │     │ (URL 발견)      │     │ (정보 추출)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                        ┌────────────────────────────────┘
                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ raw_source_items│────▶│change_suggestions│────▶│ Auto Approver   │
│ (원본 저장)     │     │ (변경 제안)     │     │ (신뢰도 분류)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────┬───────────────┘
                        ▼                ▼
               ┌─────────────┐   ┌─────────────┐
               │ 자동 반영   │   │ Admin UI    │
               │ (high)      │   │ (수동 검토) │
               └──────┬──────┘   └──────┬──────┘
                      │                 │
                      └────────┬────────┘
                               ▼
                       ┌─────────────┐
                       │   events    │
                       │ (프로덕션)  │
                       └─────────────┘
```

---

## 파일 구조

```
src/lib/crawl/
├── index.ts              # 메인 export (기존 + 자동 크롤링)
├── fetcher.ts            # HTTP 요청 (기존)
├── detector.ts           # 소스 사이트 감지 (기존)
├── normalizer.ts         # 데이터 정규화 (기존)
├── extractors/           # 사이트별 추출기 (기존)
│   ├── base.ts
│   ├── generic.ts
│   ├── yes24.ts
│   ├── interpark.ts
│   └── index.ts
├── list-crawler.ts       # 목록 페이지 크롤러 (NEW)
├── auto-approver.ts      # 자동 승인 로직 (NEW)
└── scheduler.ts          # 스케줄러 (NEW)

src/app/api/cron/
├── crawl-discovery/
│   └── route.ts          # 목록 크롤링 Cron API
└── process-suggestions/
    └── route.ts          # 제안 처리 Cron API

src/app/admin/
├── layout.tsx            # Admin 레이아웃
└── crawl/
    ├── page.tsx          # 크롤링 대시보드
    └── suggestions/
        └── page.tsx      # 제안 검토 화면

supabase/migrations/
└── 00008_crawl_tables.sql  # 크롤링 DB 스키마
```

---

## DB 스키마

### 1. crawl_sources (크롤 대상 관리)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| source_site | TEXT | yes24, interpark, melon, ticketlink |
| source_type | TEXT | list (목록) / detail (상세) |
| url | TEXT | 크롤 대상 URL |
| list_config | JSONB | 목록 페이지 설정 (linkPattern, maxPages) |
| is_active | BOOLEAN | 활성화 여부 |
| crawl_interval_hours | INTEGER | 크롤 간격 (기본 6시간) |
| last_crawled_at | TIMESTAMPTZ | 마지막 크롤 시간 |
| next_crawl_at | TIMESTAMPTZ | 다음 크롤 예정 시간 |
| consecutive_failures | INTEGER | 연속 실패 횟수 (3회 시 비활성화) |

### 2. raw_source_items (원본 데이터 저장)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| source_id | UUID | FK → crawl_sources |
| source_url | TEXT | 크롤한 URL |
| content_hash | TEXT | HTML SHA256 해시 (변경 감지) |
| extraction_method | TEXT | json-ld / embedded-json / dom |
| raw_event | JSONB | 추출된 RawEvent |
| normalized_data | JSONB | 정규화된 CreateEventInput |
| confidence | TEXT | high / medium / low |
| status | TEXT | pending / processed / matched / new / failed |

### 3. change_suggestions (변경 제안)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| raw_item_id | UUID | FK → raw_source_items |
| suggestion_type | TEXT | new_event / update_event / cancel_event |
| suggested_data | JSONB | 제안된 행사 데이터 |
| confidence | TEXT | high / medium / low |
| confidence_reasons | TEXT[] | 판단 근거 |
| status | TEXT | pending / auto_approved / approved / rejected / applied |
| requires_review | BOOLEAN | 수동 검토 필요 여부 |

### 4. crawl_runs (실행 기록)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| source_id | UUID | FK → crawl_sources |
| run_type | TEXT | scheduled / manual / retry |
| status | TEXT | running / completed / failed / partial |
| urls_discovered | INTEGER | 발견된 URL 수 |
| new_events | INTEGER | 새 행사 수 |
| auto_approved | INTEGER | 자동 승인 수 |

---

## 자동 승인 로직

### 승인 결정 기준

```typescript
function decideApproval(suggestion): 'auto_approve' | 'manual_review'
```

**자동 승인 조건 (모두 충족 시)**:
1. 신뢰도가 `high`
2. 추출 방법이 `json-ld` 또는 `embedded-json`
3. 필수 필드 모두 존재 (title, startAt, venueName)

**수동 검토 필요**:
1. 신뢰도가 `medium` 또는 `low`
2. DOM 파싱으로 추출
3. 필수 필드 누락
4. 기존 행사 업데이트에서 중요 필드 변경 (title, startAt, venueName)

### 신뢰도 계산

```typescript
function calculateConfidence(data, method, warnings): ExtractConfidence
```

| 항목 | 점수 |
|------|------|
| title 있음 | +2 |
| startAt 있음 | +2 |
| venueName 있음 | +1 |
| posterUrl 있음 | +1 |
| price 있음 | +0.5 |
| artists 있음 | +0.5 |
| JSON-LD 추출 | +1 |
| 경고 1개당 | -0.5 |

**결과**: 5+ → HIGH, 3+ → MEDIUM, <3 → LOW

---

## Vercel Cron 설정

`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/crawl-discovery",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/process-suggestions",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

| Cron Job | 스케줄 | 설명 |
|----------|--------|------|
| crawl-discovery | 6시간마다 | 목록 크롤링 → 새 행사 발견 |
| process-suggestions | 30분마다 | 자동 승인된 제안 → events 반영 |

---

## API 엔드포인트

### GET /api/cron/crawl-discovery

목록 페이지 크롤링을 실행하여 새 행사 URL을 발견하고 상세 정보를 추출합니다.

**인증**: `Authorization: Bearer {CRON_SECRET}` (프로덕션)

**응답**:
```json
{
  "success": true,
  "data": {
    "processed": 3,
    "newEvents": 15,
    "errors": 0,
    "runIds": ["uuid1", "uuid2"],
    "durationMs": 45000
  }
}
```

### GET /api/cron/process-suggestions

자동 승인된 change_suggestions를 events 테이블에 반영합니다.

**응답**:
```json
{
  "success": true,
  "data": {
    "processed": 10,
    "approved": 8,
    "errors": 2,
    "durationMs": 5000
  }
}
```

---

## 목록 크롤러 설정

`src/lib/crawl/list-crawler.ts`:

```typescript
const SITE_LIST_CONFIGS = {
    yes24: {
        baseUrl: "https://ticket.yes24.com",
        defaultLinkPattern: /\/Perf\/\d+/gi,
        categories: [
            { name: "콘서트", path: "/New/Genre/GenreList.aspx?genre=15456", maxPages: 5 },
            { name: "뮤지컬/연극", path: "/New/Genre/GenreList.aspx?genre=15457", maxPages: 3 },
            { name: "전시/행사", path: "/New/Genre/GenreList.aspx?genre=15459", maxPages: 3 },
        ]
    },
    // 인터파크: CSR로 인해 서버 사이드 크롤링 제한
    // 멜론티켓, 티켓링크: 추후 구현
};
```

### Rate Limiting

| 사이트 | 요청 간격 |
|--------|----------|
| YES24 | 2초 |
| 인터파크 | 3초 |
| 멜론 | 2초 |
| 티켓링크 | 2초 |

---

## Admin UI

### 크롤링 대시보드 (`/admin/crawl`)

- **통계 카드**: 활성 소스, 검토 대기, 오늘 실행, 오늘 발견
- **수동 크롤링 실행** 버튼
- **최근 실행 목록**: 상태, 발견 URL, 자동승인, 에러

### 제안 검토 (`/admin/crawl/suggestions`)

- **필터**: 대기 중 / 전체
- **제안 카드**: 신뢰도 배지, 행사 정보, 포스터, 원본 링크
- **판단 근거** 표시
- **승인/거절** 버튼

---

## 환경 변수

```env
# Vercel Cron 인증 토큰
CRON_SECRET=your-secret-token-here
```

---

## 사용 방법

### 1. DB 마이그레이션 적용

**방법 A: Supabase CLI (권장)**

```bash
# 프로젝트 연결 (최초 1회)
npx supabase link --project-ref YOUR_PROJECT_REF

# 마이그레이션 적용
npx supabase db push
```

**방법 B: Supabase Dashboard에서 직접 실행**

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → SQL Editor
3. `supabase/migrations/00008_crawl_tables.sql` 내용 복사 후 실행

### 2. 기존 데이터 수정 (이미 마이그레이션을 적용한 경우)

마이그레이션 초기 버전에서 `next_crawl_at`이 설정되지 않아 크롤링이 동작하지 않을 수 있습니다.
이 경우 Supabase SQL Editor에서 다음 쿼리를 실행하세요:

```sql
-- 모든 활성 소스의 next_crawl_at을 현재 시간으로 설정
UPDATE crawl_sources
SET next_crawl_at = NOW()
WHERE is_active = TRUE AND next_crawl_at IS NULL;
```

### 3. 환경 변수 설정

`.env.local`에 `CRON_SECRET` 추가:

```env
CRON_SECRET=your-secret-token-here
```

### 4. 개발 환경 테스트

```bash
npm run dev
```

- `/admin/crawl` 접속
- "수동 크롤링 실행" 버튼 클릭
- `/admin/crawl/suggestions`에서 제안 확인

### 5. Vercel 배포

배포 후 Cron이 자동으로 실행됩니다:
- 6시간마다: 목록 크롤링
- 30분마다: 제안 처리

---

## 주요 고려사항

### 1. Rate Limiting

- 사이트별 요청 간격 준수 (2-3초)
- 너무 빠른 요청은 IP 차단 위험

### 2. 에러 핸들링

- 연속 3회 실패 시 소스 자동 비활성화
- `consecutive_failures` 컬럼으로 추적

### 3. 중복 감지

- `content_hash`로 동일 콘텐츠 스킵
- URL 정규화로 트래킹 파라미터 제거

### 4. 보안

- Cron 엔드포인트 토큰 검증 (프로덕션)
- Admin 페이지 인증 필수

### 5. CSR 사이트 제한

- 인터파크는 JavaScript 렌더링 필요
- 향후 Playwright/Puppeteer로 Headless 크롤링 구현 가능

---

## 트러블슈팅

### "크롤링 완료: 0개 새 행사 발견" (next_crawl_at이 NULL인 경우)

**원인**: `crawl_sources` 테이블의 `next_crawl_at`이 NULL이면 스케줄러가 크롤링 대상을 찾지 못합니다.

**해결**: Supabase SQL Editor에서 실행:

### "크롤링 완료: 0개 새 행사 발견" (YES24 목록 페이지)

**원인**: YES24 목록 페이지는 **JavaScript로 동적 렌더링(CSR)**됩니다. 서버 사이드 HTTP 요청으로는 실제 공연 목록을 가져올 수 없습니다.

**현재 상태**:
- 자동 크롤링 파이프라인 구조는 완성됨
- YES24 목록 페이지는 Headless 브라우저(Playwright) 필요
- 개별 공연 상세 페이지(`/Perf/12345`)는 정상 작동

**임시 해결책**:
1. 기존 URL Import 기능(`/api/import-url`)으로 개별 URL 수동 등록
2. 향후 Playwright 기반 Headless 크롤링 구현 예정

### "크롤링 완료: 0개 새 행사 발견" (next_crawl_at 시간 문제)

**원인**: `next_crawl_at`이 미래 시간으로 설정되어 스케줄러가 대상을 찾지 못합니다.

**해결**: Supabase SQL Editor에서 실행:

```sql
UPDATE crawl_sources
SET next_crawl_at = NOW()
WHERE is_active = TRUE AND next_crawl_at IS NULL;
```

### "Could not find the table 'public.crawl_sources'"

**원인**: DB 마이그레이션이 적용되지 않았습니다.

**해결**:
1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/00008_crawl_tables.sql` 내용 복사 후 실행

### "Cannot find project ref. Have you run supabase link?"

**원인**: Supabase CLI가 프로젝트에 연결되지 않았습니다.

**해결**:
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

프로젝트 ref는 Supabase Dashboard URL에서 확인:
`https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

---

## 향후 확장

1. **추가 사이트 지원**
   - 멜론티켓 목록 크롤러
   - 티켓링크 목록 크롤러

2. **Headless 크롤링**
   - Playwright로 CSR 사이트 지원
   - Vercel Serverless Function 타임아웃 고려

3. **모니터링 강화**
   - Slack/Discord 알림
   - 에러율 대시보드
   - 사이트 구조 변경 감지

4. **기존 행사 업데이트**
   - 주기적으로 등록된 행사 URL 재크롤링
   - 변경사항 감지 및 업데이트 제안

---

## 관련 문서

- [URL Import (수동 크롤링)](./ingestion_crawling.md)
- [DB 스키마](./database-schema.md)
- [Supabase 마이그레이션](./supabase-migration-plan.md)
