# FesMate Database Schema Design

> **문서 상태:** 설계 중
> **기준 버전:** PRD v0.5
> **마지막 업데이트:** 2025-12-23

---

## 목차

1. [개요](#개요)
2. [엔티티 관계도 (ERD)](#엔티티-관계도-erd)
3. [테이블 상세](#테이블-상세)
   - [Core: 행사/장소/아티스트](#core-행사장소아티스트)
   - [User: 사용자/인증](#user-사용자인증)
   - [Content: 글/댓글/알림](#content-글댓글알림)
   - [Social: 크루/팔로우/참여](#social-크루팔로우참여)
   - [Guide: 콜가이드](#guide-콜가이드)
4. [RLS 정책](#rls-정책)
5. [인덱스 전략](#인덱스-전략)
6. [마이그레이션 계획](#마이그레이션-계획)

---

## 개요

### 설계 원칙

1. **Supabase/PostgreSQL 기반**: Auth, RLS, Realtime 활용
2. **정규화 우선**: 중복 최소화, 필요 시 denormalize
3. **ENUM 대신 CHECK**: 유연한 타입 확장
4. **timestamptz 사용**: 타임존 인식 시간 저장
5. **UUID 기본키**: Supabase auth.uid()와 일관성

### 현재 프론트엔드 데이터 구조

| Context | 저장소 | 마이그레이션 대상 테이블 |
|---------|--------|------------------------|
| WishlistContext | localStorage | `user_events` |
| MyTimetableContext | localStorage | `user_slot_marks`, `custom_events` |
| HelpfulContext | localStorage | `post_reactions` |
| CommentContext | localStorage | `comments` |
| CrewContext | localStorage | `crews`, `crew_members`, `crew_events` |
| FollowContext | localStorage | `follows` |
| BlockContext | localStorage | `blocks` |
| ParticipationContext | localStorage | `participation_requests` |
| NotificationContext | localStorage | `notifications` |
| BadgeContext | localStorage | `user_badges` |
| CallGuideContext | localStorage | `songs`, `call_guides`, `call_guide_entries` |

---

## 엔티티 관계도 (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE ENTITIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐      ┌────────────┐      ┌──────────┐            │
│  │  venues  │◀────▶│   events   │◀────▶│  stages  │            │
│  └──────────┘      └─────┬──────┘      └──────────┘            │
│                          │                                      │
│         ┌────────────────┼────────────────┐                    │
│         ▼                ▼                ▼                    │
│  ┌──────────────┐  ┌──────────┐  ┌────────────────────┐       │
│  │ event_artists│  │   slots  │  │ operational_slots  │       │
│  └──────┬───────┘  └──────────┘  └────────────────────┘       │
│         ▼                                                      │
│  ┌──────────┐                                                  │
│  │ artists  │                                                  │
│  └──────────┘                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         USER ENTITIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐      ┌──────────────┐      ┌─────────────────┐  │
│  │  users   │─────▶│  user_events │      │  user_slot_marks│  │
│  └────┬─────┘      └──────────────┘      └─────────────────┘  │
│       │                                                        │
│       ├───────────▶┌──────────────┐                            │
│       │            │   follows    │                            │
│       │            └──────────────┘                            │
│       │                                                        │
│       ├───────────▶┌──────────────┐                            │
│       │            │    blocks    │                            │
│       │            └──────────────┘                            │
│       │                                                        │
│       └───────────▶┌──────────────┐                            │
│                    │ user_badges  │                            │
│                    └──────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       CONTENT ENTITIES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐      ┌────────────────┐      ┌─────────────────┐ │
│  │  posts   │─────▶│ post_reactions │      │ post_images     │ │
│  └────┬─────┘      └────────────────┘      └─────────────────┘ │
│       │                                                        │
│       └───────────▶┌──────────────┐                            │
│                    │   comments   │                            │
│                    └──────────────┘                            │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐                           │
│  │ notifications│   │   reports    │                           │
│  └──────────────┘   └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        SOCIAL ENTITIES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐      ┌───────────────┐      ┌────────────────┐   │
│  │  crews   │─────▶│ crew_members  │      │  crew_events   │   │
│  └────┬─────┘      └───────────────┘      └────────────────┘   │
│       │                                                        │
│       ├───────────▶┌────────────────────┐                      │
│       │            │ crew_join_requests │                      │
│       │            └────────────────────┘                      │
│       │                                                        │
│       └───────────▶┌────────────────────┐                      │
│                    │ crew_announcements │                      │
│                    └────────────────────┘                      │
│                                                                 │
│  ┌────────────────────────┐                                    │
│  │ participation_requests │                                    │
│  └────────────────────────┘                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        GUIDE ENTITIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐      ┌──────────────┐      ┌───────────────────┐ │
│  │  songs   │─────▶│ call_guides  │─────▶│call_guide_entries│ │
│  └──────────┘      └──────────────┘      └───────────────────┘ │
│                           │                                    │
│                           └─────▶┌────────────────────┐        │
│                                  │call_guide_versions │        │
│                                  └────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 테이블 상세

### Core: 행사/장소/아티스트

#### `venues` - 공연장/장소

```sql
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    capacity INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venues_name ON venues USING gin(to_tsvector('korean', name));
```

#### `artists` - 아티스트

```sql
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image_url TEXT,
    genre TEXT,
    fanchant TEXT,                    -- 응원법
    lightstick_color TEXT,            -- 응원봉 색상
    popular_songs TEXT[],             -- 대표곡 배열
    social_links JSONB,               -- [{type, url}, ...]

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artists_name ON artists USING gin(to_tsvector('korean', name));
CREATE INDEX idx_artists_genre ON artists(genre);
```

#### `events` - 행사

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,

    -- 일정
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,               -- 종료 시간 미정 가능
    timezone TEXT DEFAULT 'Asia/Seoul',

    -- 장소
    venue_id UUID REFERENCES venues(id),

    -- 분류
    type TEXT NOT NULL CHECK (type IN ('concert', 'festival', 'musical', 'exhibition')),
    status TEXT NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'CHANGED', 'POSTPONED', 'CANCELED')),

    -- 허브 모드 (운영자 override)
    override_mode TEXT DEFAULT 'AUTO' CHECK (override_mode IN ('AUTO', 'LIVE', 'RECAP')),

    -- 상세 정보
    poster_url TEXT,
    price TEXT,
    description TEXT,
    age_restriction TEXT,

    -- 예매 링크 (JSONB 배열)
    ticket_links JSONB,               -- [{name, url, logo?}, ...]

    -- 타임테이블 설정
    timetable_type TEXT CHECK (timetable_type IN ('linear', 'grid')),

    -- UI 배지
    badges TEXT[],

    -- 통계 (denormalized, 트리거로 업데이트)
    wishlist_count INTEGER DEFAULT 0,
    attended_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_events_title ON events USING gin(to_tsvector('korean', title));
```

#### `stages` - 페스티벌 스테이지

```sql
CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    color TEXT,                       -- 스테이지 구분 색상

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stages_event ON stages(event_id);
```

#### `event_artists` - 행사-아티스트 연결

```sql
CREATE TABLE event_artists (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,

    PRIMARY KEY (event_id, artist_id)
);
```

#### `slots` - 타임테이블 슬롯 (페스티벌용)

```sql
CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES artists(id),
    stage_id UUID REFERENCES stages(id),

    title TEXT,                       -- 아티스트가 아닌 경우 (예: "티켓 박스 오픈")
    day INTEGER,                      -- 다일 행사의 경우 몇일차인지 (1, 2, 3...)
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slots_event ON slots(event_id);
CREATE INDEX idx_slots_start ON slots(start_at);
CREATE INDEX idx_slots_artist ON slots(artist_id);
```

#### `operational_slots` - 운영 일정 (단독 공연용)

```sql
CREATE TABLE operational_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    type TEXT NOT NULL CHECK (type IN (
        'md_sale', 'ticket_pickup', 'locker_open', 'queue_start',
        'standing_entry', 'seated_entry', 'show_start', 'show_end',
        'intermission', 'shuttle', 'photo_time', 'encore', 'custom'
    )),
    title TEXT,                       -- 커스텀 제목 (type=custom일 때)
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    location TEXT,                    -- 위치 (예: "1층 로비")
    description TEXT,
    is_highlight BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_operational_slots_event ON operational_slots(event_id);
CREATE INDEX idx_operational_slots_start ON operational_slots(start_at);
```

---

### User: 사용자/인증

#### `users` - 사용자 프로필 (auth.users 확장)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    nickname TEXT NOT NULL,
    profile_image TEXT,
    bio TEXT,

    role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),

    -- OAuth 정보 (Supabase Auth에서 관리하지만 빠른 조회용)
    provider TEXT,
    email TEXT,

    -- 통계 (denormalized)
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    attended_count INTEGER DEFAULT 0,

    -- 대표 배지
    featured_badges TEXT[],

    -- 프라이버시 설정
    privacy_settings JSONB DEFAULT '{
        "wishlist": "public",
        "attended": "public",
        "followers": "public",
        "following": "public",
        "crews": "public",
        "activity": "friends"
    }'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_email ON users(email);
```

#### `user_events` - 사용자-행사 관계 (찜/다녀옴)

```sql
CREATE TABLE user_events (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    is_wishlist BOOLEAN DEFAULT FALSE,
    is_attended BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, event_id)
);

CREATE INDEX idx_user_events_user ON user_events(user_id);
CREATE INDEX idx_user_events_event ON user_events(event_id);
CREATE INDEX idx_user_events_wishlist ON user_events(user_id) WHERE is_wishlist = TRUE;
CREATE INDEX idx_user_events_attended ON user_events(user_id) WHERE is_attended = TRUE;
```

#### `user_slot_marks` - 슬롯 마킹 (나만의 타임테이블)

```sql
CREATE TABLE user_slot_marks (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,

    mark_type TEXT NOT NULL CHECK (mark_type IN ('watch', 'meal', 'rest', 'move', 'skip')),
    memo TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, slot_id)
);

CREATE INDEX idx_user_slot_marks_user ON user_slot_marks(user_id);
```

#### `custom_events` - 커스텀 이벤트 (나만의 타임테이블)

```sql
CREATE TABLE custom_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    type TEXT NOT NULL CHECK (type IN ('meal', 'rest', 'move', 'meet', 'other')),
    title TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    memo TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custom_events_user_event ON custom_events(user_id, event_id);
```

#### `follows` - 팔로우 관계

```sql
CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

#### `blocks` - 차단 관계

```sql
CREATE TABLE blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
```

#### `user_badges` - 획득한 배지

```sql
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,           -- BADGE_DEFINITIONS의 id

    earned_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_event_id UUID REFERENCES events(id),
    trigger_event_title TEXT,

    UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
```

---

### Content: 글/댓글/알림

#### `posts` - 글

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 분류
    type TEXT NOT NULL CHECK (type IN (
        -- 실시간
        'gate', 'md', 'facility', 'safety',
        -- 공식
        'official',
        -- 커뮤니티
        'companion', 'taxi', 'meal', 'lodge', 'transfer',
        'tip', 'question', 'fanevent', 'afterparty',
        -- 기록
        'review', 'video'
    )),
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'EXPIRING', 'EXPIRED', 'CLOSED')),

    -- 내용
    content TEXT NOT NULL,

    -- 반응 (denormalized)
    helpful_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,

    -- 실시간 제보용
    trust_level TEXT CHECK (trust_level IN ('A', 'B', 'C')),

    -- 리뷰용
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    slot_id UUID REFERENCES slots(id),

    -- 영상용
    video_url TEXT,

    -- 커뮤니티용
    meet_at TIMESTAMPTZ,
    depart_at TIMESTAMPTZ,
    checkin_at TIMESTAMPTZ,
    max_people INTEGER,
    current_people INTEGER DEFAULT 1,
    budget TEXT,
    price TEXT,
    rules TEXT,
    contact_method TEXT,

    -- 장소 필드 (PRD 6.4.1)
    place_text TEXT,
    place_hint TEXT,

    -- 만료
    expires_at TIMESTAMPTZ,

    -- 끌어올리기
    last_bumped_at TIMESTAMPTZ,

    -- 공식 공지용
    is_pinned BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_event ON posts(event_id);
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_expires ON posts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_posts_content ON posts USING gin(to_tsvector('korean', content));
```

#### `post_images` - 글 이미지

```sql
CREATE TABLE post_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_images_post ON post_images(post_id);
```

#### `post_reactions` - 글 반응 (도움됨)

```sql
CREATE TABLE post_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    reaction_type TEXT DEFAULT 'helpful' CHECK (reaction_type IN ('helpful')),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);
```

#### `comments` - 댓글

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

#### `notifications` - 알림

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type TEXT NOT NULL CHECK (type IN (
        'ticket_open_reminder', 'event_start_reminder', 'slot_start_reminder',
        'official_notice_published', 'live_report_trending',
        'hub_post_replied', 'community_post_replied', 'community_post_matched',
        'post_expiring_soon', 'post_expired', 'report_result',
        'event_time_changed', 'event_cancelled',
        'participation_reminder_1d', 'participation_reminder_1h',
        'participation_accepted', 'participation_declined',
        'participation_canceled', 'participation_changed'
    )),

    -- 관련 엔티티
    event_id UUID REFERENCES events(id),
    post_id UUID REFERENCES posts(id),
    slot_id UUID REFERENCES slots(id),

    -- 내용
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    deep_link TEXT,

    -- 상태
    is_read BOOLEAN DEFAULT FALSE,

    -- 제어
    dedupe_key TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_dedupe ON notifications(dedupe_key);
```

#### `reports` - 신고

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
    target_id UUID NOT NULL,
    target_user_id UUID NOT NULL REFERENCES users(id),

    reason TEXT NOT NULL CHECK (reason IN (
        'spam', 'scam', 'abuse', 'hate', 'harassment', 'privacy', 'illegal', 'other'
    )),
    detail TEXT,

    status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'in_review', 'action_taken', 'no_action')),

    reviewed_at TIMESTAMPTZ,
    review_note TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);
```

---

### Social: 크루/팔로우/참여

#### `crews` - 크루

```sql
CREATE TABLE crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,
    description TEXT,
    region TEXT NOT NULL,
    genre TEXT NOT NULL,

    is_public BOOLEAN DEFAULT TRUE,
    join_type TEXT DEFAULT 'open' CHECK (join_type IN ('open', 'approval')),
    max_members INTEGER DEFAULT 50,

    logo_emoji TEXT,
    logo_url TEXT,
    banner_url TEXT,

    -- 통계 (denormalized)
    member_count INTEGER DEFAULT 1,
    event_count INTEGER DEFAULT 0,

    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crews_region ON crews(region);
CREATE INDEX idx_crews_genre ON crews(genre);
CREATE INDEX idx_crews_public ON crews(is_public);
CREATE INDEX idx_crews_name ON crews USING gin(to_tsvector('korean', name));
```

#### `crew_members` - 크루 멤버

```sql
CREATE TABLE crew_members (
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),

    joined_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (crew_id, user_id)
);

CREATE INDEX idx_crew_members_user ON crew_members(user_id);
CREATE INDEX idx_crew_members_crew ON crew_members(crew_id);
```

#### `crew_events` - 크루 공동 관심 행사

```sql
CREATE TABLE crew_events (
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    added_by UUID NOT NULL REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (crew_id, event_id)
);

CREATE INDEX idx_crew_events_crew ON crew_events(crew_id);
```

#### `crew_join_requests` - 크루 가입 신청

```sql
CREATE TABLE crew_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),

    UNIQUE (crew_id, user_id)
);

CREATE INDEX idx_crew_join_requests_crew ON crew_join_requests(crew_id);
CREATE INDEX idx_crew_join_requests_user ON crew_join_requests(user_id);
CREATE INDEX idx_crew_join_requests_pending ON crew_join_requests(crew_id)
    WHERE status = 'pending';
```

#### `crew_announcements` - 크루 공지

```sql
CREATE TABLE crew_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),

    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crew_announcements_crew ON crew_announcements(crew_id);
```

#### `participation_requests` - 커뮤니티 참여 신청

```sql
CREATE TABLE participation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    post_author_id UUID NOT NULL REFERENCES users(id),

    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'canceled')),

    scheduled_at TIMESTAMPTZ,
    activity_location TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,

    UNIQUE (applicant_id, post_id)
);

CREATE INDEX idx_participation_requests_applicant ON participation_requests(applicant_id);
CREATE INDEX idx_participation_requests_post ON participation_requests(post_id);
CREATE INDEX idx_participation_requests_author ON participation_requests(post_author_id);
```

---

### Guide: 콜가이드

#### `songs` - 곡

```sql
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,
    artist_id UUID NOT NULL REFERENCES artists(id),
    artist_name TEXT NOT NULL,        -- denormalized

    youtube_id TEXT NOT NULL,
    duration INTEGER NOT NULL,        -- 재생 시간 (초)
    thumbnail_url TEXT,
    release_year INTEGER,
    album TEXT,

    has_call_guide BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_songs_artist ON songs(artist_id);
CREATE INDEX idx_songs_title ON songs USING gin(to_tsvector('korean', title));
CREATE UNIQUE INDEX idx_songs_youtube ON songs(youtube_id);
```

#### `call_guides` - 콜가이드

```sql
CREATE TABLE call_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'verified')),

    helpful_count INTEGER DEFAULT 0,

    created_by UUID NOT NULL REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    contributors UUID[],

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (song_id)
);

CREATE INDEX idx_call_guides_song ON call_guides(song_id);
CREATE INDEX idx_call_guides_status ON call_guides(status);
```

#### `call_guide_entries` - 콜가이드 항목

```sql
CREATE TABLE call_guide_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_guide_id UUID NOT NULL REFERENCES call_guides(id) ON DELETE CASCADE,

    start_time DECIMAL(8, 2) NOT NULL,  -- 시작 시간 (초)
    end_time DECIMAL(8, 2),

    type TEXT NOT NULL CHECK (type IN ('lyrics', 'sing', 'action', 'jump', 'clap', 'light', 'etc')),

    text TEXT NOT NULL,
    text_romanized TEXT,
    text_original TEXT,
    instruction TEXT,
    intensity INTEGER CHECK (intensity >= 1 AND intensity <= 3),

    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_guide_entries_guide ON call_guide_entries(call_guide_id);
CREATE INDEX idx_call_guide_entries_time ON call_guide_entries(call_guide_id, start_time);
```

#### `call_guide_versions` - 콜가이드 버전 히스토리

```sql
CREATE TABLE call_guide_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_guide_id UUID NOT NULL REFERENCES call_guides(id) ON DELETE CASCADE,

    version INTEGER NOT NULL,
    entries JSONB NOT NULL,           -- 버전별 엔트리 스냅샷

    edited_by UUID NOT NULL REFERENCES users(id),
    change_description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_guide_versions_guide ON call_guide_versions(call_guide_id);
```

---

## RLS 정책

### 기본 원칙

1. **읽기**: 대부분 공개 (차단된 사용자 제외)
2. **쓰기**: 본인만 가능
3. **수정/삭제**: 본인 또는 관리자만 가능

### 주요 정책 예시

```sql
-- users: 누구나 읽기, 본인만 수정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE USING (auth.uid() = id);

-- user_events: 본인 데이터만 접근
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
ON user_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own events"
ON user_events FOR ALL USING (auth.uid() = user_id);

-- posts: 누구나 읽기 (차단 사용자 제외), 본인만 쓰기/수정
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by everyone except blocked"
ON posts FOR SELECT USING (
    NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = auth.uid()
        AND blocked_id = posts.user_id
    )
);

CREATE POLICY "Users can create posts"
ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE USING (auth.uid() = user_id);

-- crews: 공개 크루는 누구나 읽기, 비공개는 멤버만
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public crews are viewable"
ON crews FOR SELECT USING (
    is_public = TRUE
    OR EXISTS (
        SELECT 1 FROM crew_members
        WHERE crew_id = crews.id
        AND user_id = auth.uid()
    )
);

-- follows: 본인 관계만 관리
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
ON follows FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows"
ON follows FOR ALL USING (auth.uid() = follower_id);
```

---

## 인덱스 전략

### 복합 인덱스

```sql
-- 행사 탐색 (타입 + 날짜)
CREATE INDEX idx_events_type_date ON events(type, start_at);

-- 글 목록 (행사 + 타입 + 생성일)
CREATE INDEX idx_posts_event_type_created ON posts(event_id, type, created_at DESC);

-- 알림 목록 (사용자 + 읽음 + 생성일)
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);
```

### 부분 인덱스

```sql
-- 활성 글만
CREATE INDEX idx_posts_active ON posts(event_id, created_at DESC)
    WHERE status = 'ACTIVE';

-- 미읽음 알림만
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
    WHERE is_read = FALSE;

-- 대기 중인 가입 신청만
CREATE INDEX idx_join_requests_pending ON crew_join_requests(crew_id)
    WHERE status = 'pending';
```

---

## 마이그레이션 계획

### Phase 1: Core 테이블 (읽기 전용)

| 테이블 | 설명 | 우선순위 |
|--------|------|---------|
| venues | 공연장 | P0 |
| artists | 아티스트 | P0 |
| events | 행사 | P0 |
| stages | 스테이지 | P1 |
| slots | 슬롯 | P1 |
| operational_slots | 운영 일정 | P1 |

**작업 내용:**
- Mock 데이터 Supabase에 시드
- 조회 쿼리 작성 (getEvents, getEventById)
- Context에서 Mock → Supabase 전환

### Phase 2: User 테이블

| 테이블 | 설명 | 현재 Context |
|--------|------|-------------|
| users | 사용자 | AuthContext |
| user_events | 찜/다녀옴 | WishlistContext |
| user_slot_marks | 슬롯 마킹 | MyTimetableContext |
| follows | 팔로우 | FollowContext |
| blocks | 차단 | BlockContext |

**작업 내용:**
- Auth 연동 (회원가입 시 users 레코드 생성)
- localStorage → Supabase 마이그레이션 함수
- RLS 정책 적용

### Phase 3: Content 테이블

| 테이블 | 설명 | 현재 Context |
|--------|------|-------------|
| posts | 글 | Mock |
| post_reactions | 도움됨 | HelpfulContext |
| comments | 댓글 | CommentContext |
| notifications | 알림 | NotificationContext |

**작업 내용:**
- 글 CRUD API
- Realtime 구독 (새 글/댓글 알림)
- 이미지 업로드 (Supabase Storage)

### Phase 4: Social 테이블

| 테이블 | 설명 | 현재 Context |
|--------|------|-------------|
| crews | 크루 | CrewContext |
| crew_members | 멤버 | CrewContext |
| participation_requests | 참여 신청 | ParticipationContext |

### Phase 5: Guide 테이블

| 테이블 | 설명 | 현재 Context |
|--------|------|-------------|
| songs | 곡 | CallGuideContext |
| call_guides | 콜가이드 | CallGuideContext |
| call_guide_entries | 엔트리 | CallGuideContext |

---

## 다음 단계

1. [ ] SQL 마이그레이션 파일 작성 (`supabase/migrations/`)
2. [ ] RLS 정책 상세 작성
3. [ ] Seed 데이터 준비 (Mock → SQL)
4. [ ] TypeScript 타입 생성 (`supabase gen types`)
5. [ ] 쿼리 함수 작성 (`src/lib/supabase/queries/`)
6. [ ] Context 전환 (Phase별 점진적)

---

## 참고 자료

- [Supabase 문서](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PRD v0.5](/docs/PRD_fesmate_v0.5_UPDATED.md)
- [기존 타입 정의](/src/types/)
