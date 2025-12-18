# Tech Spec — Ingestion & Crawling Pipeline (v0.5)

**Status:** Draft  
**Owner:** Data/Platform  
**Last updated:** 2025-12-18  
**Related:** PRD 6.11, Admin IA (Future), Dev Menu (Time Travel/Scenario)

---

## 0. 목적
FesMate의 행사(Event) 데이터를 **외부 소스(예매처/주관사 웹, SNS 공지 링크)**로부터 수집/정규화하고,
변경사항을 안전하게 반영하기 위한 파이프라인(ETL + 변경 관리)을 정의한다.

> MVP에서는 자동 수집 파이프라인을 붙이지 않고 목업/시드 데이터로 UI/UX를 검증한다.  
> 본 문서는 **Future 연결을 위한 설계서**이며, MVP 단계에서도 “나중에 갈아끼우기 쉬운 구조”를 목표로 한다.

---

## 1. 범위 (Scope)
### In
- 소스별 커넥터(Connector) 구조
- 추출 우선순위: **JSON-LD → embedded JSON → DOM 파싱** (+ 필요 시 Headless 렌더링)
- 공통 스키마 정규화(`RawEvent` → `Event`)
- 변경 감지(diff) 및 `change_suggestion` 생성
- 출처/신뢰도/스냅샷(provenance) 저장
- 운영 승인 워크플로우(Internal/Future)와의 접점

### Out (Non-goals)
- 캡차 회피/봇 차단 우회/계정 공유 등 약관 위반 행위
- 예매/잔여좌석 같은 실시간 판매 데이터 확보(제휴/API 없이)
- 완전 자동 반영(운영 승인 없이 프로덕션 데이터를 덮어쓰기) — 최소 P1 이후

---

## 2. 아키텍처 개요 (권장)
### 2.1 파이프라인 단계
1) **Fetcher**
- URL 요청(HTTP) 또는 Headless 렌더링 결과 획득
- 캐시/재시도/타임아웃/레이트리밋/중복 요청 방지
- `User-Agent` 고정 및 요청 로그 기록

2) **Extractor (Connector)**
- 소스별 파서: `yes24`, `interpark`, `official_site`, `instagram_post_link` 등
- 결과는 공통 형태 `RawEvent` 또는 `RawAnnouncement`로만 반환

3) **Normalizer**
- 날짜/시간/타임존 파싱
- 장소 표준화(문자열 정규화 우선, Place ID/좌표는 Future)
- 이미지/포스터 URL 정리, 타임테이블 구조화(가능한 범위)

4) **Change Detector**
- 이전 스냅샷과 비교하여 변경 필드(diff)를 계산
- `change_suggestion` 생성(“무엇이 바뀌었는지” + confidence)

5) **Provenance / Audit**
- `source_url`, `source_site`, `fetched_at`, `source_hash`, `confidence`, `raw_payload_ref`
- “왜 이렇게 표시됐지?”를 10초 안에 추적할 수 있게

---

## 3. 데이터 계약 (권장 스키마)
### 3.1 raw_source_item
수집 원문을 그대로 저장(추적성/재현성)
- `id`
- `source_site` (enum)
- `source_url`
- `fetched_at`
- `http_status`
- `content_type`
- `content_hash`
- `raw_payload` (gzip/blob) 또는 `raw_payload_ref`

### 3.2 RawEvent (Extractor output)
- `source_site`, `source_url`
- `title`
- `start_at`, `end_at` (가능하면 ISO8601)
- `venue_text`
- `poster_urls[]`
- `ticketing_urls[]`
- `price_text` / `offers[]` (가능한 범위)
- `schedule_text` + `performances[]` (원문 + 구조화 동시 보관)
- `metadata` (source-specific)

### 3.3 Event (Product canonical)
현재 프론트의 Event 모델과 1:1 매핑을 목표로 하되, provenance 필드는 별도 테이블/필드로 분리한다.
- `id`
- `title`
- `period` / `start_at` / `end_at`
- `venue`(텍스트)
- `genres[]`, `region`
- `status` (예정/변경/연기/취소/종료)
- `timetable` (선택)
- `official_links[]`
- `updated_at`

### 3.4 change_suggestion
- `id`
- `event_id`
- `diff_fields[]` (예: start_at 변경, venue 변경)
- `before` / `after` (필드별)
- `confidence` (A/B/C 또는 0~1)
- `requires_review` (bool)
- `created_at`
- `status` (PENDING/APPROVED/REJECTED/APPLIED)

---

## 4. Extractor 우선순위(권장)
1) JSON-LD (`script[type="application/ld+json"]`)
2) Embedded JSON (`__NEXT_DATA__`, `window.__APOLLO_STATE__` 등)
3) DOM 파싱(CSS selector / 정규식)
4) (필요 시) Headless 렌더링(Playwright) — 비용이 크므로 최후

---

## 5. 스케줄링(폴링) 정책(권장)
- 기본: 6시간 간격
- D-7 ~ D-1: 3시간 간격
- LIVE 윈도우(start-24h ~ end+6h): 30분 간격

> 초기에 “소스별”이 아니라 “행사 단위”로 동적으로 조절하는 것이 운영이 쉽다.

---

## 6. 운영 워크플로우(Internal/Future)
### 6.1 운영 승인(권장)
- change_suggestion이 생성되면 Admin 화면에서 diff 확인
- 승인 시에만 `event` 반영 + 관련 알림 트리거
- 운영자가 수동 수정한 필드는 `locked=true`로 자동 덮어쓰기 방지(P1)

### 6.2 모니터링/알림
- 커넥터별 성공률/파싱 실패율/필드 누락률
- 변경 폭(급격한 start_at 변동 등) 이상치 감지
- 파싱 실패 시 슬랙/이메일(Internal) 알림

---

## 7. MVP 단계에서의 현실적 적용: URL Import (권장)
자동 폴링 이전에 “수집 UX”를 MVP에 얹고 싶다면:
- 사용자/운영자가 예매처/공식 페이지 URL을 붙여넣는다
- 서버가 1회 fetch+extract
- 결과를 **프리필 폼**으로 보여주고, 최종 저장은 사람이 확인/수정 후 확정

장점:
- Admin UI 없이도 데이터 입력 가능
- 파싱이 일부 깨져도 품질이 유지됨(사람이 마지막 확인)

---

## 8. 테스트 전략
- 소스별 샘플 URL 스냅샷(HTML + 기대값) 저장
- 커넥터 단위 Golden Test(필드 누락/형식 변화 감지)
- canary(일부 이벤트만 주기적 수집) → 안정화 후 확대

---

## 9. 오픈 이슈
- 공연/회차 모델(1 Event 내 다회차) 표준화 수준
- 장소 정규화(Place ID/좌표) 도입 시점
- 공식 공지(SNS) 신뢰도/중복 제거 기준
