# GitHub Copilot Instructions for FesMate

## 프로젝트 개요
FesMate는 공연/페스티벌/전시 정보를 통합 관리하고, 현장 실시간 제보, 동행 매칭, 공연 기록 등을 제공하는 웹 서비스입니다.

## 기술 스택
- **프론트엔드**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **백엔드**: Next.js API Routes, Prisma ORM
- **데이터베이스**: PostgreSQL
- **실시간**: Socket.IO, Redis Pub/Sub
- **인증**: OAuth (Kakao, Naver, Apple) + JWT
- **스토리지**: AWS S3 또는 Cloudflare R2
- **배포**: Vercel

---

## 코딩 스타일 & 컨벤션

### TypeScript
- **타입 정의**: `any` 사용 금지, 명시적 타입 선언 필수
- **인터페이스 명명**: `I` prefix 사용 안 함 (예: `User`, `Event`)
- **타입 vs 인터페이스**: 단순 데이터 구조는 `type`, 확장 가능한 객체는 `interface`
- **Enum**: 문자열 enum 사용 (예: `enum EventType { CONCERT = 'concert', FESTIVAL = 'festival' }`)

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  trustScore: number;
}

type EventFilter = {
  dateFrom?: Date;
  dateTo?: Date;
  genre?: string[];
};

// ❌ Bad
interface IUser { ... }
let data: any = ...;
```

### Next.js App Router
- **파일 구조**: `app/` 디렉토리 사용
- **서버 컴포넌트 우선**: 클라이언트 상호작용이 필요한 경우만 `'use client'`
- **API Routes**: `app/api/` 내에 RESTful 구조로 구성
- **메타데이터**: 각 페이지에 `metadata` export 필수

```typescript
// app/events/[id]/page.tsx
export const metadata = {
  title: '공연 상세 | FesMate',
  description: '공연 정보 및 실시간 현장 제보'
};

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  // 서버 컴포넌트: 데이터 직접 fetch
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  return <EventDetail event={event} />;
}
```

### 컴포넌트 구조
- **명명**: PascalCase (예: `EventCard.tsx`, `ReportForm.tsx`)
- **Props 타입**: 컴포넌트와 같은 파일 내에 정의 또는 `types/` 디렉토리
- **폴더 구조**:
  ```
  components/
    ├── common/          # 재사용 가능한 공통 컴포넌트
    ├── events/          # 공연 관련
    ├── reports/         # 제보 관련
    ├── companions/      # 동행 관련
    └── layout/          # 레이아웃 컴포넌트
  ```

```typescript
// components/events/EventCard.tsx
interface EventCardProps {
  event: {
    id: string;
    title: string;
    posterUrl: string;
    startDate: Date;
  };
  onInterest?: (eventId: string) => void;
}

export function EventCard({ event, onInterest }: EventCardProps) {
  return (
    <div className="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      {/* ... */}
    </div>
  );
}
```

### Tailwind CSS
- **유틸리티 클래스 우선**: 커스텀 CSS 최소화
- **반응형**: 모바일 퍼스트 (`sm:`, `md:`, `lg:` 사용)
- **다크모드**: `dark:` prefix 사용 (추후 지원)
- **색상**: `tailwind.config.ts`에 브랜드 컬러 정의

```typescript
// ✅ Good
<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
  예매 알림 받기
</button>

// ❌ Bad - 인라인 스타일 사용
<button style={{ padding: '8px 16px', backgroundColor: '#3B82F6' }}>
```

---

## 데이터베이스 & Prisma

### 모델 명명 규칙
- **단수형**: `User`, `Event`, `Report` (복수형 X)
- **관계 테이블**: `EventArtist`, `UserEventInterest`
- **필드명**: camelCase (예: `createdAt`, `posterUrl`)

### 쿼리 패턴
```typescript
// ✅ Good - 필요한 필드만 select
const events = await prisma.event.findMany({
  select: {
    id: true,
    title: true,
    startDate: true,
    venue: { select: { name: true, address: true } }
  },
  where: { startDate: { gte: new Date() } },
  orderBy: { startDate: 'asc' },
  take: 20
});

// ❌ Bad - 모든 필드 가져오기
const events = await prisma.event.findMany();
```

### 트랜잭션
- 여러 테이블 동시 업데이트 시 트랜잭션 사용
```typescript
await prisma.$transaction([
  prisma.companion.update({ ... }),
  prisma.companionParticipant.create({ ... }),
  prisma.notification.create({ ... })
]);
```

---

## API 설계

### RESTful 원칙
```
GET    /api/events              # 목록
GET    /api/events/[id]         # 상세
POST   /api/events              # 생성
PATCH  /api/events/[id]         # 수정
DELETE /api/events/[id]         # 삭제

POST   /api/events/[id]/reports # 하위 리소스 생성
GET    /api/events/[id]/reports # 하위 리소스 목록
```

### 응답 형식
```typescript
// 성공
{
  success: true,
  data: { ... },
  message?: string
}

// 에러
{
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: '로그인이 필요합니다.'
  }
}

// 페이지네이션
{
  success: true,
  data: [...],
  pagination: {
    page: 1,
    pageSize: 20,
    totalPages: 5,
    totalCount: 97
  }
}
```

### 에러 처리
```typescript
// app/api/events/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const events = await prisma.event.findMany();
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
```

---

## 인증 & 권한

### JWT 검증
```typescript
// lib/auth.ts
import { verify } from 'jsonwebtoken';

export async function verifyToken(token: string) {
  try {
    const decoded = verify(token, process.env.JWT_SECRET!);
    return decoded as { userId: string };
  } catch {
    return null;
  }
}

// API에서 사용
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }
  
  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'INVALID_TOKEN' } }, { status: 401 });
  }
  
  // 로직 계속...
}
```

### Protected Routes (클라이언트)
```typescript
// hooks/useAuth.ts
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      // 토큰 검증 및 사용자 정보 가져오기
    }
  }, []);
  
  return { user };
}
```

---

## 실시간 기능 (Socket.IO)

### 서버 설정
```typescript
// lib/socket.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export function initSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL }
  });
  
  // Redis adapter (프로덕션)
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  
  io.on('connection', (socket) => {
    socket.on('join-event', (eventId) => {
      socket.join(`event:${eventId}`);
    });
    
    socket.on('new-report', async (data) => {
      // DB 저장 후 브로드캐스트
      const report = await createReport(data);
      io.to(`event:${data.eventId}`).emit('report-created', report);
    });
  });
  
  return io;
}
```

### 클라이언트 연결
```typescript
// hooks/useSocket.ts
'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(eventId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  
  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!);
    socketInstance.emit('join-event', eventId);
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, [eventId]);
  
  return socket;
}
```

---

## 이미지 처리

### 업로드 (클라이언트)
```typescript
// components/common/ImageUpload.tsx
'use client';

export function ImageUpload({ onUpload }: { onUpload: (url: string) => void }) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 클라이언트 측 리사이징
    const resized = await resizeImage(file, 1920);
    
    // FormData로 업로드
    const formData = new FormData();
    formData.append('image', resized);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const { data } = await response.json();
    onUpload(data.url);
  };
  
  return <input type="file" accept="image/*" onChange={handleChange} />;
}
```

### 업로드 처리 (서버)
```typescript
// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('image') as File;
  
  // Sharp로 WebP 변환
  const buffer = Buffer.from(await file.arrayBuffer());
  const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
  
  // S3 업로드
  const key = `images/${Date.now()}-${file.name.replace(/\.[^.]+$/, '.webp')}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: webpBuffer,
    ContentType: 'image/webp'
  }));
  
  const url = `${process.env.CDN_URL}/${key}`;
  return NextResponse.json({ success: true, data: { url } });
}
```

---

## 신뢰도 계산 (윌슨 스코어)

```typescript
// lib/trustScore.ts

/**
 * 윌슨 스코어 계산 (95% 신뢰구간)
 * @param upvotes 긍정 투표
 * @param totalVotes 총 투표
 * @returns 0-1 사이의 신뢰도 점수
 */
export function calculateWilsonScore(upvotes: number, totalVotes: number): number {
  if (totalVotes === 0) return 0;
  
  const z = 1.96; // 95% 신뢰구간
  const phat = upvotes / totalVotes;
  
  const numerator = phat + (z * z) / (2 * totalVotes) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * totalVotes)) / totalVotes);
  const denominator = 1 + (z * z) / totalVotes;
  
  return numerator / denominator;
}

/**
 * 시간 감쇠 가중치
 * @param createdAt 생성일
 * @returns 0-1 사이의 가중치
 */
export function calculateTimeDecay(createdAt: Date): number {
  const daysAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = 0.95;
  return Math.pow(decayFactor, daysAgo / 7);
}
```

---

## 테스트

### 단위 테스트 (Jest)
```typescript
// __tests__/lib/trustScore.test.ts
import { calculateWilsonScore } from '@/lib/trustScore';

describe('calculateWilsonScore', () => {
  it('should return 0 for no votes', () => {
    expect(calculateWilsonScore(0, 0)).toBe(0);
  });
  
  it('should return high score for high positive ratio', () => {
    const score = calculateWilsonScore(95, 100);
    expect(score).toBeGreaterThan(0.85);
  });
  
  it('should penalize low sample size', () => {
    const highSample = calculateWilsonScore(95, 100);
    const lowSample = calculateWilsonScore(9, 10);
    expect(highSample).toBeGreaterThan(lowSample);
  });
});
```

### E2E 테스트 (Playwright)
```typescript
// e2e/event-detail.spec.ts
import { test, expect } from '@playwright/test';

test('사용자가 공연 상세 페이지에서 관심 표시할 수 있다', async ({ page }) => {
  await page.goto('/events/test-event-id');
  
  const interestButton = page.getByRole('button', { name: /관심 표시/ });
  await expect(interestButton).toBeVisible();
  
  await interestButton.click();
  await expect(interestButton).toHaveText(/관심 해제/);
});
```

---

## 보안 고려사항

### XSS 방지
```typescript
// 사용자 입력은 항상 sanitize
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(userInput);
```

### SQL Injection 방지
```typescript
// ✅ Prisma는 자동으로 방어 (Prepared Statements)
await prisma.user.findMany({
  where: { email: userInput } // 안전
});

// ❌ Raw query 사용 시 주의
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`; // 위험!
```

### Rate Limiting
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s')
});

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

---

## 환경변수

### .env.local (개발)
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fesmate_dev"

# Auth
JWT_SECRET="your-secret-key-here"
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_REDIRECT_URI="http://localhost:3000/api/auth/kakao/callback"

# Storage
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="fesmate-dev"
CDN_URL="https://cdn.fesmate.dev"

# Redis
REDIS_URL="redis://localhost:6379"

# Socket.IO
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 환경변수 사용
```typescript
// ✅ Good - 타입 안전
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is not defined');
}

// 또는 zod로 검증
import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z.string().min(1),
  DATABASE_URL: z.string().url()
});

const env = envSchema.parse(process.env);
```

---

## 성능 최적화

### 이미지 최적화
```typescript
// Next.js Image 컴포넌트 사용
import Image from 'next/image';

<Image
  src={event.posterUrl}
  alt={event.title}
  width={400}
  height={600}
  placeholder="blur"
  blurDataURL={event.blurDataUrl}
/>
```

### 동적 임포트
```typescript
// 무거운 컴포넌트는 동적 임포트
import dynamic from 'next/dynamic';

const ReportChart = dynamic(() => import('@/components/reports/ReportChart'), {
  loading: () => <Skeleton />,
  ssr: false // 클라이언트에서만 렌더링
});
```

### 캐싱
```typescript
// Next.js fetch 캐싱
const events = await fetch('https://api.example.com/events', {
  next: { revalidate: 3600 } // 1시간 캐시
});

// Redis 캐싱
import { redis } from '@/lib/redis';

const cacheKey = `event:${id}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const event = await prisma.event.findUnique({ where: { id } });
await redis.set(cacheKey, JSON.stringify(event), { ex: 3600 });
```

---

## 접근성 (a11y)

```typescript
// ✅ Good
<button
  aria-label="공연 관심 표시"
  onClick={handleInterest}
>
  <HeartIcon aria-hidden="true" />
</button>

<input
  type="text"
  id="search"
  aria-describedby="search-help"
/>
<span id="search-help">공연명 또는 아티스트명을 입력하세요</span>

// 시맨틱 HTML 사용
<nav aria-label="메인 네비게이션">
  <ul>
    <li><a href="/events">공연</a></li>
    <li><a href="/companions">동행</a></li>
  </ul>
</nav>
```

---

## Git 커밋 메시지

### 커밋 컨벤션 (Conventional Commits)
```
<type>(<scope>): <subject>

<body>

<footer>
```

### 타입
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 스타일 변경 (포매팅, 세미콜론 등)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 패키지 매니저 설정 등

### 예시
```
feat(auth): 카카오 로그인 구현

- OAuth 2.0 플로우 추가
- JWT 토큰 발급 로직
- 사용자 정보 DB 저장

Closes #123
```

---

## 추가 지침

### 에러 처리
- 사용자 친화적 에러 메시지 제공
- 개발 환경에서는 상세 로그, 프로덕션에서는 일반 메시지
- 에러 바운더리 사용 (React Error Boundary)

### 로깅
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta);
    // 프로덕션: Datadog/Sentry에 전송
  },
  error: (message: string, error?: Error, meta?: any) => {
    console.error(`[ERROR] ${message}`, error, meta);
    // 프로덕션: Sentry에 전송
  }
};
```

### 주석
- 복잡한 로직에만 주석 작성
- 함수/메서드는 JSDoc 스타일
```typescript
/**
 * 공연 목록을 필터링하여 반환
 * @param filters - 필터 조건 (날짜, 지역, 장르)
 * @param page - 페이지 번호 (기본값: 1)
 * @returns 필터링된 공연 목록 및 페이지네이션 정보
 */
export async function getEvents(filters: EventFilter, page: number = 1) {
  // ...
}
```

---

## 도메인별 특수 규칙

### 공연 날짜 처리
- **항상 UTC 저장, 표시 시 한국 시간(KST)으로 변환**
```typescript
import { format, formatInTimeZone } from 'date-fns-tz';

const displayDate = formatInTimeZone(event.startDate, 'Asia/Seoul', 'yyyy년 MM월 dd일 HH:mm');
```

### 신뢰도 점수 표시
- 0-1 값을 100점 만점으로 변환하여 표시
```typescript
const displayScore = Math.round(trustScore * 100);
// 85점 이상: 🟢 높음, 60-84: 🟡 보통, 60 미만: 🔴 낮음
```

### 공연 타입별 필드
```typescript
interface BaseEvent {
  id: string;
  title: string;
  eventType: EventType;
}

interface Concert extends BaseEvent {
  eventType: 'concert';
  headliner: string;
  guests?: string[];
}

interface Festival extends BaseEvent {
  eventType: 'festival';
  lineupCount: number;
  hasTimetable: true;
}
```

---

## Copilot에게 하는 추가 요청

1. **한국어 주석 허용**: 복잡한 로직은 한국어로 설명해도 괜찮습니다.
2. **모바일 우선**: 반응형 디자인 시 모바일 화면을 우선 고려하세요.
3. **실시간 UX**: Socket 연결이 끊겼을 때 사용자에게 안내하는 UI 추가하세요.
4. **점진적 개선**: 완벽한 코드보다 동작하는 코드를 먼저 제안하고, 단계적으로 개선하세요.
5. **보안 우선**: 사용자 입력을 받는 모든 곳에 검증 로직을 추가하세요.
6. **성능 측정**: 데이터베이스 쿼리, API 응답 시간을 로깅하여 병목 지점을 찾으세요.
7. **타입 안전성**: `as`, `any` 사용을 피하고, 정확한 타입 추론을 유도하세요.
8. **테스트 가능성**: 순수 함수로 작성하고, 의존성 주입을 활용하세요.

---

## 참고 문서
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Prisma 베스트 프랙티스](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Socket.IO 문서](https://socket.io/docs/v4/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [프로젝트 기술 명세서](./docs/TECH_SPEC.md)
- [개발 TODO 리스트](./docs/TODO.md)
