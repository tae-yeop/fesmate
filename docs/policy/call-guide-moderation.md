# 콜가이드 모더레이션 정책 (Call Guide Moderation Policy)

> 커뮤니티 기반 콜가이드 편집 시스템의 악용 방지 및 품질 관리 정책

## 1. 개요

FesMate의 콜가이드는 위키피디아, Genius, Stack Overflow 등 성공적인 커뮤니티 편집 플랫폼의 정책을 참고하여 설계되었습니다.

### 핵심 원칙
- **선의 추정 (Assume Good Faith)**: 처음에는 편집자의 선의를 가정
- **예방 > 처벌**: 차단은 처벌이 아닌 추가 피해 방지 목적
- **점진적 권한**: 기여도에 따른 단계적 권한 부여
- **투명한 기록**: 모든 편집 히스토리 보존

---

## 2. 사용자 신뢰 등급 시스템

### 2.1 등급 체계

| 등급 | 명칭 | 요건 | 권한 |
|------|------|------|------|
| Lv.0 | 신규 | 가입 직후 | 조회만 가능 |
| Lv.1 | 입문자 | 가입 4일 + 편집 3회 | 편집 제안 가능 (승인 필요) |
| Lv.2 | 기여자 | 가입 30일 + 승인된 편집 10회 | 직접 편집 가능 |
| Lv.3 | 에디터 | 승인된 편집 50회 + 도움됨 100회 | 다른 사용자 편집 검토 |
| Lv.4 | 모더레이터 | 운영팀 지정 | 차단/보호/되돌리기 권한 |

> **참고**: [Wikipedia의 자동인증(autoconfirmed)](https://en.wikipedia.org/wiki/Wikipedia:Protection_policy) 시스템과 [Genius의 IQ 시스템](https://d3.harvard.edu/platform-digit/submission/genius-annotating-the-world-one-rap-at-a-time/) 참조

### 2.2 신뢰도 점수 (Trust Score)

```typescript
interface UserTrustScore {
  userId: string;
  level: 0 | 1 | 2 | 3 | 4;

  // 활동 지표
  totalEdits: number;           // 총 편집 횟수
  approvedEdits: number;        // 승인된 편집
  revertedEdits: number;        // 되돌려진 편집
  helpfulReceived: number;      // 받은 도움됨

  // 계산된 점수
  trustScore: number;           // 0-100
  accuracyRate: number;         // 승인률 (%)

  // 상태
  warnings: number;             // 경고 횟수
  isSuspended: boolean;         // 정지 여부
  suspendedUntil?: Date;        // 정지 해제일
}

// 신뢰도 점수 계산
function calculateTrustScore(user: UserTrustScore): number {
  const baseScore = Math.min(user.approvedEdits * 2, 50);
  const helpfulBonus = Math.min(user.helpfulReceived * 0.1, 30);
  const accuracyBonus = user.accuracyRate * 0.2;
  const warningPenalty = user.warnings * 10;

  return Math.max(0, Math.min(100, baseScore + helpfulBonus + accuracyBonus - warningPenalty));
}
```

---

## 3. 편집 검토 시스템

### 3.1 편집 승인 워크플로우

```
[신규/입문자 편집] → [대기열] → [에디터 검토] → [승인/거절/수정요청]
                                    ↓
[기여자 이상 편집] ───────────────→ [즉시 반영] → [사후 검토 가능]
```

### 3.2 편집 대기열 (Edit Queue)

| 대기열 유형 | 설명 | 검토 권한 |
|------------|------|----------|
| 신규 편집 | Lv.1 사용자의 편집 제안 | Lv.3+ |
| 대량 수정 | 10개 이상 엔트리 변경 | Lv.3+ |
| 분쟁 편집 | 되돌리기 2회 이상 발생 | Lv.4 |
| 신고된 편집 | 사용자 신고 접수 | Lv.4 |

> **참고**: [Stack Overflow Review Queues](https://stackoverflowteams.help/en/articles/8075993-review-queues) 시스템 참조

### 3.3 검토 액션

```typescript
type ReviewAction =
  | "approve"        // 승인
  | "reject"         // 거절
  | "improve"        // 수정 후 승인
  | "skip"           // 건너뛰기 (다른 검토자에게)
  | "escalate";      // 상위 권한자에게 에스컬레이션

interface EditReview {
  editId: string;
  reviewerId: string;
  action: ReviewAction;
  reason?: string;
  improvedVersion?: CallGuideEntry[];
  reviewedAt: Date;
}
```

---

## 4. 버전 관리 및 되돌리기

### 4.1 버전 히스토리

모든 편집은 버전으로 기록되어 되돌리기가 가능합니다.

```typescript
interface CallGuideVersion {
  id: string;
  callGuideId: string;
  version: number;
  entries: CallGuideEntry[];

  // 편집 정보
  editedBy: string;
  editedAt: Date;
  changeDescription?: string;

  // 메타데이터
  entriesAdded: number;
  entriesModified: number;
  entriesDeleted: number;

  // 상태
  isReverted: boolean;
  revertedBy?: string;
  revertReason?: string;
}
```

### 4.2 되돌리기 (Rollback)

| 되돌리기 유형 | 설명 | 권한 |
|--------------|------|------|
| 단일 되돌리기 | 마지막 편집만 취소 | Lv.2+ |
| 버전 복원 | 특정 버전으로 복원 | Lv.3+ |
| 대량 되돌리기 | 특정 사용자의 모든 편집 취소 | Lv.4 |

> **참고**: [GitHub Wiki History](https://docs.github.com/en/communities/documenting-your-project-with-wikis/viewing-a-wikis-history-of-changes) 및 [MediaWiki Rollback](https://www.mediawiki.org/wiki/Manual:Combating_vandalism) 참조

---

## 5. 악용 유형 및 대응

### 5.1 악용 유형 정의

| 유형 | 설명 | 심각도 |
|------|------|--------|
| **반달리즘** | 의도적인 내용 훼손, 부적절한 내용 삽입 | 높음 |
| **스팸** | 광고, 홍보 목적 편집 | 중간 |
| **편집 전쟁** | 반복적인 상호 되돌리기 | 중간 |
| **저품질 편집** | 잘못된 정보, 오타 다수 | 낮음 |
| **다중 계정 악용** | 여러 계정으로 자기 편집 승인 | 높음 |

### 5.2 5단계 경고 시스템

[Wikipedia의 5단계 경고 시스템](https://en.wikipedia.org/wiki/Wikipedia:Vandalism)을 참고합니다:

```typescript
type WarningLevel = 1 | 2 | 3 | 4 | 5;

interface UserWarning {
  userId: string;
  level: WarningLevel;
  reason: string;
  issuedBy: string;
  issuedAt: Date;
  relatedEditId?: string;
}

const WARNING_DESCRIPTIONS = {
  1: "친절한 안내 - 선의의 실수로 가정",
  2: "주의 환기 - 정책 위반 가능성 알림",
  3: "경고 - 명확한 정책 위반 지적",
  4: "최종 경고 - 차단 직전 단계",
  5: "차단 통보 - 임시 또는 영구 차단"
};
```

### 5.3 차단 정책

| 위반 유형 | 1차 | 2차 | 3차 |
|----------|-----|-----|-----|
| 반달리즘 | 24시간 | 7일 | 영구 |
| 스팸 | 7일 | 30일 | 영구 |
| 편집 전쟁 | 24시간 | 7일 | 30일 |
| 저품질 편집 | 경고 | 24시간 | 7일 |
| 다중 계정 악용 | 즉시 영구 | - | - |

> **참고**: [Wikipedia Blocking Policy](https://en.wikipedia.org/wiki/Wikipedia:Blocking_policy) - "차단은 처벌이 아닌 피해 방지 목적"

```typescript
interface UserBlock {
  userId: string;
  blockedBy: string;
  reason: string;
  startAt: Date;
  endAt?: Date;              // null = 영구
  scope: "edit" | "all";     // 편집만 또는 전체 활동
  appealable: boolean;
}
```

---

## 6. 콘텐츠 보호

### 6.1 보호 등급

| 보호 등급 | 편집 가능자 | 적용 조건 |
|----------|------------|----------|
| 없음 | 모든 사용자 | 기본 상태 |
| 준보호 | Lv.2+ (기여자 이상) | 반복적 반달리즘 |
| 확장보호 | Lv.3+ (에디터 이상) | 심각한 분쟁 |
| 완전보호 | Lv.4 (모더레이터) | 법적 이슈 등 |

> **참고**: [Wikipedia Protection Policy](https://en.wikipedia.org/wiki/Wikipedia:Protection_policy) - "보호는 최소 수준으로, 최단 기간만"

### 6.2 검증된 콜가이드 (Verified)

```typescript
interface VerifiedCallGuide {
  callGuideId: string;
  verifiedBy: string;         // 공식 아티스트 또는 공연기획사
  verifiedAt: Date;
  verificationSource: "artist" | "agency" | "official_fanclub";
  isLocked: boolean;          // 추가 편집 차단 여부
}
```

- 검증된 콜가이드는 황금색 배지로 표시
- 아티스트/기획사 공식 검증 시 편집 제한 가능
- [Genius의 Verified Artist](https://en.wikipedia.org/wiki/Genius_(company)) 시스템 참조

---

## 7. 자동화 도구

### 7.1 악용 필터 (Abuse Filter)

[MediaWiki AbuseFilter](https://www.mediawiki.org/wiki/Extension:AbuseFilter)를 참고한 자동 필터링:

```typescript
interface AbuseFilter {
  id: string;
  name: string;
  pattern: RegExp | string;
  action: "warn" | "block" | "flag" | "disallow";
  isActive: boolean;
}

// 예시 필터
const ABUSE_FILTERS: AbuseFilter[] = [
  {
    id: "filter_1",
    name: "욕설 필터",
    pattern: /욕설패턴|비속어패턴/gi,
    action: "disallow",
    isActive: true
  },
  {
    id: "filter_2",
    name: "대량 삭제 감지",
    pattern: "삭제된 엔트리 > 10",
    action: "flag",
    isActive: true
  },
  {
    id: "filter_3",
    name: "외부 링크 차단",
    pattern: /https?:\/\/(?!youtube|youtu\.be)/gi,
    action: "warn",
    isActive: true
  }
];
```

### 7.2 자동 되돌리기 봇

[Wikipedia의 ClueBot NG](https://en.wikipedia.org/wiki/Vandalism_on_Wikipedia)를 참고:

```typescript
interface AutoRevertRule {
  condition: string;
  action: "revert" | "flag";
  notifyUser: boolean;
}

const AUTO_REVERT_RULES: AutoRevertRule[] = [
  {
    condition: "모든 엔트리 삭제 (엔트리 > 5개일 때)",
    action: "revert",
    notifyUser: true
  },
  {
    condition: "신규 사용자가 검증된 콜가이드 편집",
    action: "flag",
    notifyUser: true
  }
];
```

---

## 8. 신고 및 이의제기

### 8.1 신고 시스템

```typescript
type ReportReason =
  | "vandalism"       // 반달리즘
  | "incorrect"       // 잘못된 정보
  | "spam"            // 스팸
  | "offensive"       // 불쾌한 내용
  | "copyright";      // 저작권 위반

interface CallGuideReport {
  id: string;
  callGuideId: string;
  entryId?: string;           // 특정 엔트리 신고 시
  reporterId: string;
  reason: ReportReason;
  description?: string;
  status: "pending" | "resolved" | "dismissed";
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}
```

### 8.2 이의제기 (Appeal)

차단된 사용자의 이의제기 절차:

1. **이의제기 제출**: 차단 사유에 대한 해명
2. **검토**: 다른 모더레이터가 검토 (차단한 모더레이터 제외)
3. **결정**: 차단 유지 / 기간 단축 / 해제
4. **통보**: 결과 및 사유 안내

> **참고**: [Wikipedia Guide to Appealing Blocks](https://en.wikipedia.org/wiki/Wikipedia:Guide_to_appealing_blocks)

---

## 9. 구현 우선순위

### Phase 1 (MVP)
- [x] 버전 히스토리 기본 구조
- [ ] 단순 되돌리기 기능
- [ ] 기본 신고 기능

### Phase 2
- [ ] 사용자 신뢰 등급 시스템
- [ ] 편집 대기열 및 검토
- [ ] 5단계 경고 시스템

### Phase 3
- [ ] 차단 시스템
- [ ] 콘텐츠 보호 등급
- [ ] 악용 필터

### Phase 4
- [ ] 자동 되돌리기 봇
- [ ] 이의제기 시스템
- [ ] 검증된 콜가이드

---

## 10. 참고 자료

### 위키피디아
- [Wikipedia:Protection policy](https://en.wikipedia.org/wiki/Wikipedia:Protection_policy)
- [Wikipedia:Vandalism](https://en.wikipedia.org/wiki/Wikipedia:Vandalism)
- [Wikipedia:Blocking policy](https://en.wikipedia.org/wiki/Wikipedia:Blocking_policy)
- [Wikipedia:Guide to appealing blocks](https://en.wikipedia.org/wiki/Wikipedia:Guide_to_appealing_blocks)

### 미디어위키
- [Manual:Combating vandalism](https://www.mediawiki.org/wiki/Manual:Combating_vandalism)
- [Extension:AbuseFilter](https://www.mediawiki.org/wiki/Extension:AbuseFilter)

### GitHub
- [Viewing a wiki's history of changes](https://docs.github.com/en/communities/documenting-your-project-with-wikis/viewing-a-wikis-history-of-changes)
- [Changing access permissions for wikis](https://docs.github.com/en/communities/documenting-your-project-with-wikis/changing-access-permissions-for-wikis)

### Genius
- [Genius: Annotating the World, One Rap at a Time](https://d3.harvard.edu/platform-digit/submission/genius-annotating-the-world-one-rap-at-a-time/)

### Stack Overflow
- [Review Queues](https://stackoverflowteams.help/en/articles/8075993-review-queues)
- [A Theory of Moderation](https://stackoverflow.blog/2009/05/18/a-theory-of-moderation/)

### 기타
- [Fandom Wiki Rules and Blocking Policy](https://community.fandom.com/wiki/Wiki_Rules_and_Blocking_Policy)
- [Wikidata:Blocking policy](https://www.wikidata.org/wiki/Special:MyLanguage/Wikidata:Blocking_policy)
