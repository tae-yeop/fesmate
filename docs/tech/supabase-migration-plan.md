# Supabase Migration Plan

> **문서 상태:** 설계 완료
> **마지막 업데이트:** 2025-12-23

이 문서는 현재 localStorage 기반 Mock 데이터에서 Supabase로 마이그레이션하기 위한 구체적인 계획을 정리합니다.

---

## 목차

1. [마이그레이션 개요](#마이그레이션-개요)
2. [Phase 1: Core 테이블 (읽기 전용)](#phase-1-core-테이블-읽기-전용)
3. [Phase 2: User 테이블](#phase-2-user-테이블)
4. [Phase 3: Content 테이블](#phase-3-content-테이블)
5. [Phase 4: Social 테이블](#phase-4-social-테이블)
6. [Phase 5: Guide 테이블](#phase-5-guide-테이블)
7. [쿼리 함수 구조](#쿼리-함수-구조)
8. [Context 전환 패턴](#context-전환-패턴)

---

## 마이그레이션 개요

### 현재 상태

| 데이터 | 현재 저장소 | Context |
|--------|------------|---------|
| 행사/아티스트/장소 | `mock-data.ts` | 직접 import |
| 찜/다녀옴 | localStorage | `WishlistContext` |
| 슬롯 마킹 | localStorage | `MyTimetableContext` |
| 도움됨 | localStorage | `HelpfulContext` |
| 댓글 | localStorage | `CommentContext` |
| 크루 | localStorage | `CrewContext` |
| 팔로우 | localStorage | `FollowContext` |
| 차단 | localStorage | `BlockContext` |
| 참여 신청 | localStorage | `ParticipationContext` |
| 알림 | localStorage | `NotificationContext` |
| 배지 | localStorage | `BadgeContext` |

### 목표 상태

- 모든 데이터를 Supabase PostgreSQL에 저장
- RLS로 보안 제어
- Realtime으로 실시간 업데이트
- 로컬 캐시 + optimistic updates로 UX 유지

### 마이그레이션 원칙

1. **점진적 전환**: Phase별로 하나씩 전환
2. **하위 호환성**: 기존 타입 인터페이스 유지
3. **Fallback**: Supabase 오류 시 localStorage 폴백
4. **Optimistic Updates**: UI 즉시 반영 후 서버 동기화

---

## Phase 1: Core 테이블 (읽기 전용)

### 대상 테이블

- `venues`
- `artists`
- `events`
- `stages`
- `event_artists`
- `slots`
- `operational_slots`

### 쿼리 함수

```typescript
// src/lib/supabase/queries/events.ts

import { createClient } from '@/lib/supabase/client';
import type { DbEvent, DbVenue, DbArtist, DbSlot } from '@/types/database';
import type { Event, Venue, Artist, Slot } from '@/types/event';

/**
 * 행사 목록 조회
 */
export async function getEvents(options?: {
    type?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
}) {
    const supabase = createClient();

    let query = supabase
        .from('events')
        .select(`
            *,
            venue:venues(*),
            artists:event_artists(
                artist:artists(*)
            )
        `)
        .order('start_at', { ascending: true });

    if (options?.type) {
        query = query.eq('type', options.type);
    }
    if (options?.status) {
        query = query.eq('status', options.status);
    }
    if (options?.from) {
        query = query.gte('start_at', options.from);
    }
    if (options?.to) {
        query = query.lte('start_at', options.to);
    }
    if (options?.limit) {
        query = query.limit(options.limit);
    }
    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data?.map(transformDbEventToEvent) ?? [];
}

/**
 * 행사 상세 조회
 */
export async function getEventById(eventId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('events')
        .select(`
            *,
            venue:venues(*),
            artists:event_artists(
                display_order,
                artist:artists(*)
            ),
            stages(*),
            slots(*, artist:artists(*), stage:stages(*)),
            operational_slots(*)
        `)
        .eq('id', eventId)
        .single();

    if (error) throw error;
    return transformDbEventToEvent(data);
}

/**
 * DB 타입 → 프론트엔드 타입 변환
 */
function transformDbEventToEvent(dbEvent: any): Event {
    return {
        id: dbEvent.id,
        title: dbEvent.title,
        startAt: new Date(dbEvent.start_at),
        endAt: dbEvent.end_at ? new Date(dbEvent.end_at) : undefined,
        timezone: dbEvent.timezone,
        venue: dbEvent.venue ? {
            id: dbEvent.venue.id,
            name: dbEvent.venue.name,
            address: dbEvent.venue.address,
            lat: dbEvent.venue.lat,
            lng: dbEvent.venue.lng,
        } : undefined,
        type: dbEvent.type,
        status: dbEvent.status,
        overrideMode: dbEvent.override_mode,
        posterUrl: dbEvent.poster_url,
        price: dbEvent.price,
        description: dbEvent.description,
        ageRestriction: dbEvent.age_restriction,
        ticketLinks: dbEvent.ticket_links,
        timetableType: dbEvent.timetable_type,
        badges: dbEvent.badges,
        artists: dbEvent.artists?.map((ea: any) => ({
            id: ea.artist.id,
            name: ea.artist.name,
            imageUrl: ea.artist.image_url,
            genre: ea.artist.genre,
        })),
        stages: dbEvent.stages?.map((s: any) => ({
            id: s.id,
            name: s.name,
            color: s.color,
        })),
        slots: dbEvent.slots?.map((slot: any) => ({
            id: slot.id,
            day: slot.day,
            startAt: new Date(slot.start_at),
            endAt: new Date(slot.end_at),
            artist: slot.artist ? {
                id: slot.artist.id,
                name: slot.artist.name,
                imageUrl: slot.artist.image_url,
            } : undefined,
            stage: slot.stage ? {
                id: slot.stage.id,
                name: slot.stage.name,
                color: slot.stage.color,
            } : undefined,
            title: slot.title,
        })),
        operationalSlots: dbEvent.operational_slots?.map((os: any) => ({
            id: os.id,
            type: os.type,
            title: os.title,
            startAt: new Date(os.start_at),
            endAt: os.end_at ? new Date(os.end_at) : undefined,
            location: os.location,
            description: os.description,
            isHighlight: os.is_highlight,
        })),
    };
}
```

### Context 전환

```typescript
// src/lib/event-context.tsx (새로 생성)

"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getEvents, getEventById } from '@/lib/supabase/queries/events';
import { MOCK_EVENTS } from '@/lib/mock-data';
import type { Event } from '@/types/event';

interface EventContextType {
    events: Event[];
    loading: boolean;
    error: Error | null;
    getEvent: (id: string) => Event | undefined;
    refetch: () => Promise<void>;
}

const EventContext = createContext<EventContextType | null>(null);

export function EventProvider({ children }: { children: React.ReactNode }) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getEvents();
            setEvents(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch events, using mock data:', err);
            setError(err as Error);
            // Fallback to mock data
            setEvents(MOCK_EVENTS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const getEvent = useCallback((id: string) => {
        return events.find(e => e.id === id);
    }, [events]);

    return (
        <EventContext.Provider value={{
            events,
            loading,
            error,
            getEvent,
            refetch: fetchEvents,
        }}>
            {children}
        </EventContext.Provider>
    );
}

export function useEvents() {
    const context = useContext(EventContext);
    if (!context) {
        throw new Error('useEvents must be used within EventProvider');
    }
    return context;
}
```

### Seed 데이터

```typescript
// scripts/seed-events.ts

import { createClient } from '@supabase/supabase-js';
import { MOCK_EVENTS, MOCK_ARTISTS, MOCK_VENUES } from '../src/lib/mock-data';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedEvents() {
    // 1. Venues
    const { error: venueError } = await supabase
        .from('venues')
        .upsert(MOCK_VENUES.map(v => ({
            id: v.id,
            name: v.name,
            address: v.address,
            lat: v.lat,
            lng: v.lng,
        })));

    if (venueError) console.error('Venue error:', venueError);

    // 2. Artists
    const { error: artistError } = await supabase
        .from('artists')
        .upsert(MOCK_ARTISTS.map(a => ({
            id: a.id,
            name: a.name,
            image_url: a.imageUrl,
            genre: a.genre,
        })));

    if (artistError) console.error('Artist error:', artistError);

    // 3. Events
    for (const event of MOCK_EVENTS) {
        const { error: eventError } = await supabase
            .from('events')
            .upsert({
                id: event.id,
                title: event.title,
                start_at: event.startAt.toISOString(),
                end_at: event.endAt?.toISOString(),
                timezone: event.timezone,
                venue_id: event.venue?.id,
                type: event.type,
                status: event.status,
                poster_url: event.posterUrl,
                price: event.price,
                ticket_links: event.ticketLinks,
                timetable_type: event.timetableType,
            });

        if (eventError) console.error('Event error:', eventError);

        // Event-Artist relations
        if (event.artists) {
            await supabase
                .from('event_artists')
                .upsert(event.artists.map((a, i) => ({
                    event_id: event.id,
                    artist_id: a.id,
                    display_order: i,
                })));
        }

        // Slots
        if (event.slots) {
            await supabase
                .from('slots')
                .upsert(event.slots.map(s => ({
                    id: s.id,
                    event_id: event.id,
                    artist_id: s.artist?.id,
                    stage_id: s.stage?.id,
                    day: s.day,
                    start_at: s.startAt.toISOString(),
                    end_at: s.endAt.toISOString(),
                    title: s.title,
                })));
        }
    }

    console.log('Seed completed!');
}

seedEvents();
```

---

## Phase 2: User 테이블

### 대상 테이블

- `users` (auth.users 연동)
- `user_events` (찜/다녀옴)
- `user_slot_marks` (슬롯 마킹)
- `custom_events` (커스텀 이벤트)
- `follows`
- `blocks`
- `user_badges`

### WishlistContext 전환

```typescript
// src/lib/supabase/queries/user-events.ts

import { createClient } from '@/lib/supabase/client';

export async function getUserEvents(userId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('user_events')
        .select('event_id, is_wishlist, is_attended')
        .eq('user_id', userId);

    if (error) throw error;
    return data;
}

export async function toggleWishlist(userId: string, eventId: string) {
    const supabase = createClient();

    // upsert with toggle
    const { data: existing } = await supabase
        .from('user_events')
        .select('is_wishlist')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

    const newValue = !(existing?.is_wishlist ?? false);

    const { error } = await supabase
        .from('user_events')
        .upsert({
            user_id: userId,
            event_id: eventId,
            is_wishlist: newValue,
        }, {
            onConflict: 'user_id,event_id',
        });

    if (error) throw error;
    return newValue;
}

export async function toggleAttended(userId: string, eventId: string) {
    const supabase = createClient();

    const { data: existing } = await supabase
        .from('user_events')
        .select('is_attended')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

    const newValue = !(existing?.is_attended ?? false);

    const { error } = await supabase
        .from('user_events')
        .upsert({
            user_id: userId,
            event_id: eventId,
            is_attended: newValue,
        }, {
            onConflict: 'user_id,event_id',
        });

    if (error) throw error;
    return newValue;
}
```

### Context 전환 패턴

```typescript
// src/lib/wishlist-context.tsx (수정 버전)

"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getUserEvents, toggleWishlist, toggleAttended } from '@/lib/supabase/queries/user-events';

interface WishlistContextType {
    wishlist: string[];
    attended: string[];
    isWishlisted: (eventId: string) => boolean;
    isAttended: (eventId: string) => boolean;
    toggleWishlistItem: (eventId: string) => Promise<void>;
    toggleAttendedItem: (eventId: string) => Promise<void>;
    loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState<string[]>([]);
    const [attended, setAttended] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // 초기 로드
    useEffect(() => {
        if (!user) {
            // 비로그인 시 localStorage 사용
            const saved = localStorage.getItem('fesmate_wishlist');
            if (saved) {
                const data = JSON.parse(saved);
                setWishlist(data.wishlist || []);
                setAttended(data.attended || []);
            }
            setLoading(false);
            return;
        }

        // 로그인 시 Supabase에서 로드
        (async () => {
            try {
                const data = await getUserEvents(user.id);
                setWishlist(data.filter(d => d.is_wishlist).map(d => d.event_id));
                setAttended(data.filter(d => d.is_attended).map(d => d.event_id));
            } catch (err) {
                console.error('Failed to load user events:', err);
                // Fallback to localStorage
                const saved = localStorage.getItem('fesmate_wishlist');
                if (saved) {
                    const data = JSON.parse(saved);
                    setWishlist(data.wishlist || []);
                    setAttended(data.attended || []);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

    // localStorage 저장 (비로그인 시)
    useEffect(() => {
        if (!user) {
            localStorage.setItem('fesmate_wishlist', JSON.stringify({ wishlist, attended }));
        }
    }, [wishlist, attended, user]);

    const isWishlisted = useCallback((eventId: string) => {
        return wishlist.includes(eventId);
    }, [wishlist]);

    const isAttended = useCallback((eventId: string) => {
        return attended.includes(eventId);
    }, [attended]);

    const toggleWishlistItem = useCallback(async (eventId: string) => {
        // Optimistic update
        const wasWishlisted = wishlist.includes(eventId);
        setWishlist(prev =>
            wasWishlisted
                ? prev.filter(id => id !== eventId)
                : [...prev, eventId]
        );

        if (user) {
            try {
                await toggleWishlist(user.id, eventId);
            } catch (err) {
                // Rollback on error
                console.error('Failed to toggle wishlist:', err);
                setWishlist(prev =>
                    wasWishlisted
                        ? [...prev, eventId]
                        : prev.filter(id => id !== eventId)
                );
            }
        }
    }, [wishlist, user]);

    const toggleAttendedItem = useCallback(async (eventId: string) => {
        const wasAttended = attended.includes(eventId);
        setAttended(prev =>
            wasAttended
                ? prev.filter(id => id !== eventId)
                : [...prev, eventId]
        );

        if (user) {
            try {
                await toggleAttended(user.id, eventId);
            } catch (err) {
                console.error('Failed to toggle attended:', err);
                setAttended(prev =>
                    wasAttended
                        ? [...prev, eventId]
                        : prev.filter(id => id !== eventId)
                );
            }
        }
    }, [attended, user]);

    return (
        <WishlistContext.Provider value={{
            wishlist,
            attended,
            isWishlisted,
            isAttended,
            toggleWishlistItem,
            toggleAttendedItem,
            loading,
        }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within WishlistProvider');
    }
    return context;
}
```

---

## Phase 3: Content 테이블

### 대상 테이블

- `posts`
- `post_images`
- `post_reactions`
- `comments`
- `notifications`
- `reports`

### 글 CRUD

```typescript
// src/lib/supabase/queries/posts.ts

import { createClient } from '@/lib/supabase/client';
import type { DbPost, TablesInsert } from '@/types/database';

export async function getPosts(options: {
    eventId?: string;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
}) {
    const supabase = createClient();

    let query = supabase
        .from('posts')
        .select(`
            *,
            user:users(id, nickname, profile_image),
            images:post_images(id, url, display_order)
        `)
        .order('created_at', { ascending: false });

    if (options.eventId) {
        query = query.eq('event_id', options.eventId);
    }
    if (options.type) {
        query = query.eq('type', options.type);
    }
    if (options.status) {
        query = query.eq('status', options.status);
    }
    if (options.limit) {
        query = query.limit(options.limit);
    }
    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function createPost(post: TablesInsert<'posts'>) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('posts')
        .insert(post)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updatePost(postId: string, updates: Partial<DbPost>) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deletePost(postId: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

    if (error) throw error;
}
```

### Realtime 구독

```typescript
// src/lib/supabase/realtime/posts.ts

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToEventPosts(
    eventId: string,
    callback: (payload: any) => void
): RealtimeChannel {
    const supabase = createClient();

    return supabase
        .channel(`event-posts:${eventId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'posts',
                filter: `event_id=eq.${eventId}`,
            },
            callback
        )
        .subscribe();
}

// 사용 예시:
// const channel = subscribeToEventPosts(eventId, (payload) => {
//     if (payload.eventType === 'INSERT') {
//         setPosts(prev => [payload.new, ...prev]);
//     }
// });
// return () => channel.unsubscribe();
```

---

## Phase 4: Social 테이블

### 대상 테이블

- `crews`
- `crew_members`
- `crew_events`
- `crew_join_requests`
- `crew_announcements`
- `participation_requests`

### 크루 쿼리

```typescript
// src/lib/supabase/queries/crews.ts

import { createClient } from '@/lib/supabase/client';

export async function getCrews(options?: {
    region?: string;
    genre?: string;
    isPublic?: boolean;
}) {
    const supabase = createClient();

    let query = supabase
        .from('crews')
        .select(`
            *,
            members:crew_members(
                user:users(id, nickname, profile_image),
                role
            )
        `);

    if (options?.region) {
        query = query.eq('region', options.region);
    }
    if (options?.genre) {
        query = query.eq('genre', options.genre);
    }
    if (options?.isPublic !== undefined) {
        query = query.eq('is_public', options.isPublic);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getCrewById(crewId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('crews')
        .select(`
            *,
            members:crew_members(
                user:users(*),
                role,
                joined_at
            ),
            events:crew_events(
                event:events(*)
            ),
            announcements:crew_announcements(
                *,
                author:users(id, nickname)
            ),
            join_requests:crew_join_requests(
                *,
                user:users(id, nickname, profile_image)
            )
        `)
        .eq('id', crewId)
        .single();

    if (error) throw error;
    return data;
}

export async function createCrew(crew: {
    name: string;
    description?: string;
    region: string;
    genre: string;
    isPublic?: boolean;
    joinType?: 'open' | 'approval';
    logoEmoji?: string;
}) {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) throw new Error('Not authenticated');

    // 크루 생성
    const { data: crewData, error: crewError } = await supabase
        .from('crews')
        .insert({
            name: crew.name,
            description: crew.description,
            region: crew.region,
            genre: crew.genre,
            is_public: crew.isPublic ?? true,
            join_type: crew.joinType ?? 'open',
            logo_emoji: crew.logoEmoji,
            created_by: userData.user.id,
        })
        .select()
        .single();

    if (crewError) throw crewError;

    // 생성자를 리더로 추가
    const { error: memberError } = await supabase
        .from('crew_members')
        .insert({
            crew_id: crewData.id,
            user_id: userData.user.id,
            role: 'leader',
        });

    if (memberError) throw memberError;

    return crewData;
}
```

---

## Phase 5: Guide 테이블

### 대상 테이블

- `songs`
- `call_guides`
- `call_guide_entries`
- `call_guide_versions`
- `call_guide_reactions`

(콜가이드 기능은 추후 상세 설계)

---

## 쿼리 함수 구조

### 디렉토리 구조

```
src/lib/supabase/
├── client.ts           # 브라우저용 클라이언트
├── server.ts           # 서버용 클라이언트 (RSC)
├── queries/
│   ├── events.ts       # 행사 CRUD
│   ├── user-events.ts  # 찜/다녀옴
│   ├── posts.ts        # 글 CRUD
│   ├── comments.ts     # 댓글 CRUD
│   ├── crews.ts        # 크루 CRUD
│   ├── follows.ts      # 팔로우
│   ├── blocks.ts       # 차단
│   └── notifications.ts # 알림
├── realtime/
│   ├── posts.ts        # 글 구독
│   └── notifications.ts # 알림 구독
└── hooks/
    ├── useEvents.ts    # SWR/React Query 래퍼
    ├── usePosts.ts
    └── useNotifications.ts
```

### 에러 처리 패턴

```typescript
// src/lib/supabase/utils/error.ts

export class SupabaseError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = 'SupabaseError';
    }
}

export function handleSupabaseError(error: any): never {
    if (error?.code === 'PGRST116') {
        throw new SupabaseError('Not found', 'NOT_FOUND', error);
    }
    if (error?.code === '42501') {
        throw new SupabaseError('Permission denied', 'FORBIDDEN', error);
    }
    if (error?.code === '23505') {
        throw new SupabaseError('Already exists', 'CONFLICT', error);
    }
    throw new SupabaseError(
        error?.message || 'Unknown error',
        error?.code || 'UNKNOWN',
        error
    );
}
```

---

## Context 전환 패턴

### 전환 단계

1. **기존 Context 유지**: 인터페이스 변경 없음
2. **쿼리 함수 추가**: Supabase 호출 로직
3. **Context 내부 교체**: localStorage → Supabase
4. **Fallback 유지**: 오류 시 localStorage 사용

### 예시: HelpfulContext

```typescript
// 전환 전
const toggleHelpful = (postId: string) => {
    setHelpful(prev => {
        const next = prev.includes(postId)
            ? prev.filter(id => id !== postId)
            : [...prev, postId];
        localStorage.setItem('fesmate_helpful', JSON.stringify(next));
        return next;
    });
};

// 전환 후
const toggleHelpful = async (postId: string) => {
    // Optimistic update
    const wasHelpful = helpful.includes(postId);
    setHelpful(prev =>
        wasHelpful
            ? prev.filter(id => id !== postId)
            : [...prev, postId]
    );

    if (user) {
        try {
            if (wasHelpful) {
                await supabase
                    .from('post_reactions')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('post_id', postId);
            } else {
                await supabase
                    .from('post_reactions')
                    .insert({ user_id: user.id, post_id: postId });
            }
        } catch (err) {
            // Rollback
            setHelpful(prev =>
                wasHelpful
                    ? [...prev, postId]
                    : prev.filter(id => id !== postId)
            );
        }
    } else {
        // 비로그인 시 localStorage
        localStorage.setItem('fesmate_helpful', JSON.stringify(helpful));
    }
};
```

---

## 마이그레이션 체크리스트

### Phase 1: Core (읽기 전용)
- [ ] Supabase 프로젝트 설정
- [ ] Migration 파일 실행
- [ ] RLS 정책 적용
- [ ] Seed 데이터 삽입
- [ ] `getEvents`, `getEventById` 쿼리 작성
- [ ] EventProvider 생성 또는 기존 import 교체
- [ ] 테스트: 탐색 페이지에서 행사 목록 로드

### Phase 2: User
- [ ] Auth 연동 (회원가입 시 users 생성)
- [ ] `user_events` 쿼리 작성
- [ ] WishlistContext Supabase 연동
- [ ] FollowContext Supabase 연동
- [ ] BlockContext Supabase 연동
- [ ] 테스트: 로그인 후 찜/다녀옴 동기화

### Phase 3: Content
- [ ] `posts` CRUD 쿼리 작성
- [ ] `comments` CRUD 쿼리 작성
- [ ] PostComposer Supabase 연동
- [ ] HelpfulContext Supabase 연동
- [ ] CommentContext Supabase 연동
- [ ] Realtime 구독 설정
- [ ] 테스트: 글 작성/댓글/도움됨 실시간 반영

### Phase 4: Social
- [ ] `crews` CRUD 쿼리 작성
- [ ] `participation_requests` 쿼리 작성
- [ ] CrewContext Supabase 연동
- [ ] ParticipationContext Supabase 연동
- [ ] 테스트: 크루 생성/가입/관리

### Phase 5: Guide
- [ ] `songs`, `call_guides` 쿼리 작성
- [ ] CallGuideContext Supabase 연동
- [ ] 테스트: 콜가이드 조회/생성

---

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JS 클라이언트](https://supabase.com/docs/reference/javascript)
- [RLS 가이드](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime 가이드](https://supabase.com/docs/guides/realtime)
- [데이터베이스 스키마](/docs/tech/database-schema.md)
- [SQL 마이그레이션](/supabase/migrations/)
