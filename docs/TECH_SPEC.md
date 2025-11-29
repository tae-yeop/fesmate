# 기술 명세서 (Technical Specification)

## 1. 개발 전략

### 우선순위
- **Phase 1**: 웹 서비스 (Next.js PWA)
- **Phase 2**: 모바일 최적화 및 네이티브 기능
- **Phase 3**: 모바일 앱 (필요시)

### 개발 원칙
- **점진적 개발**: UX 먼저 구현 → 동작 확인 → 기능 확장
- **MVP 우선**: 핵심 기능부터 구현
- **테스트 주도**: 각 단계마다 동작 확인

---

## 2. 데이터 소스 및 크롤링 전략

### 2.1 크롤링 대상 플랫폼
- **주요 티켓팅 사이트**
  - 인터파크 티켓
  - 멜론티켓
  - YES24 티켓
  - 티켓링크
  - 세종문화회관
  - 예술의전당

### 2.2 크롤링 전략
- **수집 정보**
  - 공연명, 아티스트/출연진
  - 공연 날짜/시간
  - 장소 (위도/경도 포함)
  - 예매 오픈 일시
  - 가격 정보
  - 포스터 이미지

- **업데이트 주기**
  - 신규 공연: 1시간마다
  - 예매 오픈 임박 공연: 10분마다
  - 종료된 공연: 업데이트 중단

- **법적 검토 사항**
  - robots.txt 준수
  - 공정 이용 (Fair Use) 범위 내 수집
  - 출처 명시
  - 과도한 요청 방지 (Rate Limiting)

### 2.3 사용자 제보 시스템
- **제보 템플릿**
  - 공연 정보 제보
  - 예매처 추가
  - 오류 신고
- **검증 프로세스**
  - 최소 2명 이상 동일 정보 제보 시 반영
  - 관리자 승인 시스템

---

## 3. 데이터 모델링 (ERD)

### 3.1 핵심 엔티티

#### User (사용자)
```sql
- id (PK)
- email (unique)
- username (unique)
- profile_image_url
- oauth_provider (kakao/naver/apple)
- oauth_id
- phone_verified (boolean)
- trust_score (신뢰도 점수)
- created_at
- updated_at
```

#### Event (행사/공연)
```sql
- id (PK)
- title
- event_type (공연/페스티벌/전시/뮤지컬/클래식)
- description
- poster_image_url
- venue_id (FK)
- start_date
- end_date
- ticketing_open_date
- created_by_user_id (FK, nullable)
- verified (boolean)
- created_at
- updated_at
```

#### Venue (공연장)
```sql
- id (PK)
- name
- address
- latitude
- longitude
- capacity
- facilities (JSON)
- created_at
```

#### Artist (아티스트)
```sql
- id (PK)
- name
- genre
- profile_image_url
- official_links (JSON)
- created_at
```

#### EventArtist (공연-아티스트 매핑)
```sql
- event_id (FK)
- artist_id (FK)
- performance_date
- performance_time
- is_headliner (boolean)
```

#### Report (현장 제보)
```sql
- id (PK)
- event_id (FK)
- user_id (FK)
- report_type (queue/merch/facility/safety)
- location (공연장 내 위치)
- content (JSON - 타입별 구조화 데이터)
- images (array)
- trust_score (신뢰도)
- upvotes
- downvotes
- created_at
```

#### Review (후기)
```sql
- id (PK)
- event_id (FK)
- user_id (FK)
- rating (1-5)
- content
- images (array)
- seat_section
- visibility_rating
- sound_rating
- helpful_count
- created_at
```

#### Companion (동행/양도)
```sql
- id (PK)
- event_id (FK)
- user_id (FK)
- companion_type (티켓/숙소/택시/식사)
- title
- description
- meet_location
- meet_datetime
- capacity
- current_participants
- status (모집중/마감/완료)
- created_at
```

#### UserEventInterest (관심 공연)
```sql
- user_id (FK)
- event_id (FK)
- notification_enabled (boolean)
- created_at
```

#### GongLog (공연 기록)
```sql
- id (PK)
- user_id (FK)
- event_id (FK)
- attended_date
- notes
- images (array)
- companions (array of user_ids)
- created_at
```

#### LeaderboardScore (리더보드)
```sql
- user_id (FK)
- year
- helpful_reviews_score
- reports_score
- qa_score
- total_score
- rank
- updated_at
```

---

## 4. 신뢰도/랭킹 시스템

### 4.1 윌슨 스코어 구현
```
Wilson Score = (p + z²/2n - z * sqrt(p(1-p)/n + z²/4n²)) / (1 + z²/n)

where:
- p = 긍정 비율 (upvotes / total_votes)
- n = 총 투표 수
- z = 1.96 (95% 신뢰구간)
```

### 4.2 가중치 계산
- **최근성 가중치**: `decay_factor = 0.95 ^ (days_ago / 7)`
- **활동 타입별 점수**
  - 도움이 된 후기: 10점 × wilson_score × decay_factor
  - 현장 제보: 5점 × verification_rate × decay_factor
  - 질문 답변: 3점 × helpful_count × decay_factor
  - 신규 행사 제보: 20점 (검증 완료 시)

### 4.3 어뷰징 방지
- **MD 재고 조작 방지**
  - 영수증 사진 인증 (선택)
  - 동일 제보 2명 이상 시 신뢰도 상승
  - 반대 제보 발생 시 신뢰도 검증 필요
  
- **허위 제보 방지**
  - GPS 위치 검증 (공연장 반경 1km 이내)
  - 제보 시간 검증 (공연 기간 내)
  - 사진 메타데이터 확인 (촬영 시간)
  
- **자동화 봇 방지**
  - Rate Limiting (IP/User별)
  - CAPTCHA (의심 활동 시)
  - 계정 생성 후 24시간 제한

### 4.4 신규 사용자 콜드스타트
- **초기 신뢰도**: 50점 (중립)
- **첫 활동 보너스**: 첫 5개 기여에 1.5배 가중치
- **멘토링 시스템**: 고신뢰 유저가 추천하면 신뢰도 +10

---

## 5. 실시간 기능 아키텍처

### 5.1 WebSocket 연결 관리
- **기술 스택**: Socket.IO (fallback: Long Polling)
- **연결 범위**: Event Room별 격리
- **재연결 전략**: Exponential Backoff (1s → 2s → 4s → 8s → max 30s)

### 5.2 메시지 브로커
- **선택**: Redis Pub/Sub
- **채널 구조**
  - `event:{event_id}:reports` - 현장 제보
  - `event:{event_id}:updates` - 공식 공지
  - `user:{user_id}:notifications` - 개인 알림

### 5.3 실시간 집계
- **집계 주기**: 30초마다 배치 업데이트
- **캐싱**: Redis에 최근 1시간 데이터 캐시
- **DB 동기화**: 5분마다 PostgreSQL에 영구 저장

### 5.4 오프라인 대응
- **로컬 큐**: IndexedDB에 임시 저장
- **동기화**: 온라인 복귀 시 자동 전송
- **충돌 해결**: 서버 타임스탬프 우선

---

## 6. 이미지 처리 파이프라인

### 6.1 AI 이미지 자동 편집
- **OCR 기술**: Tesseract.js (클라이언트) + Google Cloud Vision (서버)
- **개인정보 감지**
  - 주민등록번호 패턴 인식
  - 이름 영역 감지 (티켓 레이아웃 학습)
  - 바코드/QR 코드 영역 보존
  
### 6.2 마스킹 알고리즘
```javascript
1. OCR로 텍스트 영역 추출
2. 개인정보 패턴 매칭 (정규표현식)
3. 해당 영역에 블러 또는 검은색 박스 적용
4. 바코드/QR 제외한 나머지 마스킹
```

### 6.3 이미지 최적화
- **업로드 시**
  - 클라이언트: 리사이즈 (max 1920px)
  - 서버: WebP 변환, 썸네일 생성 (200px, 400px)
  
- **CDN**: Cloudflare Images 또는 AWS CloudFront
- **저장소**: AWS S3 또는 Cloudflare R2

### 6.4 저작권 필터링
- **수동 신고 시스템**
- **DMCA 대응 프로세스**
- **워터마크 추가 옵션** (사용자 선택)

---

## 7. 인증/권한 시스템

### 7.1 OAuth 플로우
```
1. 사용자 → [소셜 로그인 버튼]
2. 백엔드 → 카카오/네이버/애플 인증 요청
3. 리다이렉트 → OAuth Provider
4. 인증 완료 → Callback URL
5. 백엔드 → Access Token 발급
6. 프론트엔드 → JWT 저장 (httpOnly Cookie + localStorage)
```

### 7.2 JWT 토큰 관리
- **Access Token**: 15분 만료, payload에 user_id
- **Refresh Token**: 30일 만료, DB에 저장
- **자동 갱신**: Access Token 만료 5분 전 갱신 요청

### 7.3 본인인증 API
- **업체**: PASS 또는 NICE 평가정보
- **사용 시점**
  - 양도 거래 시 (선택)
  - 신고 누적 시 (필수)
  - 프로 구독 시 (선택)

---

## 8. 알림 시스템

### 8.1 푸시 알림 우선순위
- **긴급 (즉시)**: 예매 오픈, 취소표 발생
- **높음 (5분 이내)**: 공연 10분 전, 동행 확정
- **보통 (1시간 배치)**: 친구 활동, 후기 좋아요
- **낮음 (일일 다이제스트)**: 추천 공연

### 8.2 알림 설정
```javascript
{
  ticketing: { open: true, restock: true },
  friends: { review: true, companion: false },
  event: { reminder: true, lineup_change: true },
  system: { rank_update: false, badge: true }
}
```

### 8.3 배치 작업
- **Cron Jobs (node-cron)**
  - 예매 오픈 체크: 매 10분
  - 공연 리마인더: 매 5분
  - 일일 다이제스트: 오전 9시

---

## 9. 검색 기능

### 9.1 OpenSearch 인덱스
```json
{
  "events": {
    "mappings": {
      "properties": {
        "title": { "type": "text", "analyzer": "korean" },
        "artist_names": { "type": "text", "analyzer": "korean" },
        "venue_name": { "type": "text" },
        "date": { "type": "date" },
        "tags": { "type": "keyword" }
      }
    }
  }
}
```

### 9.2 검색 쿼리 최적화
- **Multi-Match Query**: title^3, artist_names^2, venue_name^1
- **필터**: 날짜 범위, 지역, 장르
- **정렬**: 관련도 → 날짜 → 인기도

### 9.3 자동완성
- **Edge N-Gram Tokenizer**
- **Suggest API**: 입력 3글자부터 활성화
- **오타 교정**: Fuzzy Query (edit_distance: 1)

---

## 10. 지도 기능

### 10.1 좌석/부스 배치도
- **방식 1 (간단)**: 이미지 맵 + 클릭 영역
- **방식 2 (고급)**: Canvas 기반 좌표 시스템
- **방식 3 (최고급)**: SVG 벡터 그래픽

### 10.2 실시간 위치 제보
- **GPS 정확도 요구사항**: ±50m
- **실내 위치**: 수동 선택 (게이트 A, 메인 스테이지 등)
- **Privacy**: 정확한 GPS는 서버만 저장, 사용자에게는 영역만 표시

---

## 11. 결제 시스템 (프로 구독)

### 11.1 결제 모듈
- **선택**: 토스페이먼츠 (국내 최적화)
- **백업**: 아임포트

### 11.2 구독 플랜
- **Free**: 기본 기능
- **Pro (월 4,900원)**
  - 광고 제거
  - 고급 통계 (연말 결산 PDF 다운로드)
  - 알림 무제한
  - 우선 고객 지원

### 11.3 환불 정책
- 7일 이내 100% 환불
- 자동 갱신 3일 전 알림

---

## 12. API 명세서

### 12.1 RESTful 엔드포인트 (주요)
```
GET    /api/events              - 공연 목록
GET    /api/events/:id          - 공연 상세
POST   /api/events              - 공연 등록 (사용자 제보)
GET    /api/events/:id/reports  - 현장 제보 목록
POST   /api/events/:id/reports  - 제보 등록
GET    /api/users/me            - 내 정보
POST   /api/auth/login          - 로그인
POST   /api/companions          - 동행 등록
GET    /api/search              - 통합 검색
```

### 12.2 GraphQL 스키마 (추후 검토)
```graphql
type Event {
  id: ID!
  title: String!
  artists: [Artist!]!
  venue: Venue!
  reports(type: ReportType): [Report!]!
}

type Query {
  events(filter: EventFilter): [Event!]!
  event(id: ID!): Event
}
```

---

## 13. 테스트 전략

### 13.1 테스트 범위
- **단위 테스트**: Jest (함수/컴포넌트 레벨)
- **통합 테스트**: Supertest (API 레벨)
- **E2E 테스트**: Playwright (사용자 플로우)

### 13.2 성능 테스트
- **도구**: Apache JMeter, k6
- **목표**
  - 동시 접속자 1,000명 처리
  - API 응답 시간 < 200ms (p95)
  - WebSocket 지연 < 100ms

### 13.3 보안 테스트
- **OWASP Top 10 체크리스트**
- SQL Injection 방지: Prepared Statements
- XSS 방지: DOMPurify, CSP 헤더
- CSRF 방지: SameSite Cookie

---

## 14. 배포 및 인프라

### 14.1 호스팅
- **옵션 1**: Vercel (Next.js) + Supabase (DB)
- **옵션 2**: AWS (EC2 + RDS + S3)
- **옵션 3**: Naver Cloud Platform (국내 최적화)

### 14.2 CI/CD
```yaml
# GitHub Actions
name: Deploy
on: push
jobs:
  test:
    - run: npm test
  build:
    - run: npm run build
  deploy:
    - uses: vercel/action@v2
```

### 14.3 모니터링
- **에러 추적**: Sentry
- **로그**: Datadog 또는 CloudWatch
- **성능**: Lighthouse CI
- **업타임**: UptimeRobot

---

## 15. 법적/규정 준수

### 15.1 필수 문서
- [ ] 개인정보 처리방침
- [ ] 이용약관
- [ ] 커뮤니티 가이드라인
- [ ] 저작권 정책

### 15.2 규정 준수
- **개인정보보호법**: 동의 수집, 암호화 저장
- **전자상거래법**: 거래 명세서, 환불 규정
- **청소년 보호**: 19세 이상 콘텐츠 필터링

---

## 16. ML 추천 시스템 (Phase 2)

### 16.1 협업 필터링
```python
# User-Item Matrix
# 사용자가 관심 표시/참석한 공연 기반
from sklearn.metrics.pairwise import cosine_similarity

user_similarity = cosine_similarity(user_item_matrix)
```

### 16.2 콘텐츠 기반
- **특징 벡터**: 장르, 아티스트, 지역, 가격대
- **임베딩**: TF-IDF → 코사인 유사도

### 16.3 A/B 테스트
- **도구**: PostHog Feature Flags
- **메트릭**: CTR, 예매 전환율, 체류 시간
