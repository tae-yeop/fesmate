-- =============================================
-- Migration: 00001_core_tables.sql
-- Description: Core entities - venues, artists, events, stages, slots
-- Phase: 1 (Read-only core data)
-- =============================================

-- =============================================
-- VENUES - 공연장/장소
-- =============================================
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

-- 장소명 검색용 인덱스
CREATE INDEX idx_venues_name ON venues USING gin(to_tsvector('simple', name));

COMMENT ON TABLE venues IS '공연장/장소 정보';
COMMENT ON COLUMN venues.lat IS '위도';
COMMENT ON COLUMN venues.lng IS '경도';
COMMENT ON COLUMN venues.capacity IS '수용 인원';

-- =============================================
-- ARTISTS - 아티스트
-- =============================================
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

CREATE INDEX idx_artists_name ON artists USING gin(to_tsvector('simple', name));
CREATE INDEX idx_artists_genre ON artists(genre);

COMMENT ON TABLE artists IS '아티스트 정보';
COMMENT ON COLUMN artists.fanchant IS '응원법/팬덤 문화';
COMMENT ON COLUMN artists.lightstick_color IS '응원봉 색상';
COMMENT ON COLUMN artists.social_links IS 'SNS 링크 [{type: "instagram"|"youtube"|..., url: "..."}]';

-- =============================================
-- EVENTS - 행사
-- =============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,

    -- 일정
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,               -- 종료 시간 미정 가능
    timezone TEXT DEFAULT 'Asia/Seoul',

    -- 장소
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,

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
    ticket_links JSONB DEFAULT '[]'::jsonb,

    -- 타임테이블 설정
    timetable_type TEXT CHECK (timetable_type IN ('linear', 'grid')),

    -- UI 배지
    badges TEXT[] DEFAULT '{}',

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
CREATE INDEX idx_events_title ON events USING gin(to_tsvector('simple', title));
CREATE INDEX idx_events_type_date ON events(type, start_at);

COMMENT ON TABLE events IS '행사 정보 - 최상위 엔터티';
COMMENT ON COLUMN events.override_mode IS '허브 모드 강제 설정 (AUTO: 자동, LIVE: 강제 LIVE, RECAP: 강제 RECAP)';
COMMENT ON COLUMN events.timetable_type IS '타임테이블 뷰 타입 (linear: 단독공연, grid: 페스티벌)';
COMMENT ON COLUMN events.ticket_links IS '예매처 링크 [{name, url, logo?}]';

-- =============================================
-- STAGES - 페스티벌 스테이지
-- =============================================
CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    color TEXT,                       -- 스테이지 구분 색상

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stages_event ON stages(event_id);

COMMENT ON TABLE stages IS '페스티벌 스테이지 정보';
COMMENT ON COLUMN stages.display_order IS '표시 순서';
COMMENT ON COLUMN stages.color IS '스테이지 구분 색상 (예: #EF4444)';

-- =============================================
-- EVENT_ARTISTS - 행사-아티스트 연결
-- =============================================
CREATE TABLE event_artists (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,

    PRIMARY KEY (event_id, artist_id)
);

CREATE INDEX idx_event_artists_artist ON event_artists(artist_id);

COMMENT ON TABLE event_artists IS '행사-아티스트 다대다 연결 테이블';

-- =============================================
-- SLOTS - 타임테이블 슬롯 (페스티벌용)
-- =============================================
CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,

    title TEXT,                       -- 아티스트가 아닌 경우 (예: "티켓 박스 오픈")
    day INTEGER,                      -- 다일 행사의 경우 몇일차인지 (1, 2, 3...)
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slots_event ON slots(event_id);
CREATE INDEX idx_slots_start ON slots(start_at);
CREATE INDEX idx_slots_artist ON slots(artist_id);
CREATE INDEX idx_slots_event_day ON slots(event_id, day);

COMMENT ON TABLE slots IS '타임테이블 슬롯 (페스티벌용 아티스트 공연 시간)';
COMMENT ON COLUMN slots.day IS '다일 행사의 경우 몇일차인지 (1, 2, 3...)';
COMMENT ON COLUMN slots.title IS '아티스트가 아닌 슬롯의 제목 (예: "티켓 박스 오픈")';

-- =============================================
-- OPERATIONAL_SLOTS - 운영 일정 (단독 공연용)
-- =============================================
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

COMMENT ON TABLE operational_slots IS '운영 일정 (단독 공연용 타임라인)';
COMMENT ON COLUMN operational_slots.type IS '슬롯 타입: md_sale(MD판매), ticket_pickup(티켓수령), show_start(공연시작) 등';
COMMENT ON COLUMN operational_slots.is_highlight IS '중요 표시 (공연 시작 등)';

-- =============================================
-- UPDATED_AT 트리거 함수
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artists_updated_at
    BEFORE UPDATE ON artists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =============================================
-- Migration: 00002_user_tables.sql
-- Description: User entities - users, user_events, follows, blocks, badges
-- Phase: 2 (User data with RLS)
-- =============================================

-- =============================================
-- USERS - 사용자 프로필 (auth.users 확장)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    nickname TEXT NOT NULL,
    profile_image TEXT,
    bio TEXT,

    role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),

    -- OAuth 정보 (빠른 조회용)
    provider TEXT,
    email TEXT,

    -- 통계 (denormalized, 트리거로 업데이트)
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    attended_count INTEGER DEFAULT 0,

    -- 대표 배지 ID 목록
    featured_badges TEXT[] DEFAULT '{}',

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

COMMENT ON TABLE users IS '사용자 프로필 (auth.users 확장)';
COMMENT ON COLUMN users.role IS 'USER: 일반 사용자, ADMIN: 관리자';
COMMENT ON COLUMN users.privacy_settings IS '프라이버시 설정 {wishlist, attended, followers, following, crews, activity}';

-- =============================================
-- USER_EVENTS - 사용자-행사 관계 (찜/다녀옴)
-- =============================================
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

COMMENT ON TABLE user_events IS '사용자-행사 관계 (찜/다녀옴)';
COMMENT ON COLUMN user_events.is_wishlist IS '⭐ 찜 (Wishlist): 관심/예매 예정';
COMMENT ON COLUMN user_events.is_attended IS '✅ 다녀옴 (Attended): 관람 완료';

-- =============================================
-- USER_SLOT_MARKS - 슬롯 마킹 (나만의 타임테이블)
-- =============================================
CREATE TABLE user_slot_marks (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,

    mark_type TEXT NOT NULL CHECK (mark_type IN ('watch', 'meal', 'rest', 'move', 'skip')),
    memo TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, slot_id)
);

CREATE INDEX idx_user_slot_marks_user ON user_slot_marks(user_id);

COMMENT ON TABLE user_slot_marks IS '슬롯 마킹 (나만의 타임테이블)';
COMMENT ON COLUMN user_slot_marks.mark_type IS '마킹 타입: watch(보기), meal(밥), rest(휴식), move(이동), skip(스킵)';

-- =============================================
-- CUSTOM_EVENTS - 커스텀 이벤트 (나만의 타임테이블)
-- =============================================
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

COMMENT ON TABLE custom_events IS '커스텀 이벤트 (슬롯 사이 빈 시간에 추가하는 개인 일정)';

-- =============================================
-- FOLLOWS - 팔로우 관계
-- =============================================
CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

COMMENT ON TABLE follows IS '팔로우 관계 (follower_id가 following_id를 팔로우)';

-- =============================================
-- BLOCKS - 차단 관계
-- =============================================
CREATE TABLE blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);

COMMENT ON TABLE blocks IS '차단 관계 (blocker_id가 blocked_id를 차단)';

-- =============================================
-- USER_BADGES - 획득한 배지
-- =============================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,           -- BADGE_DEFINITIONS의 id

    earned_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    trigger_event_title TEXT,

    UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

COMMENT ON TABLE user_badges IS '획득한 배지';
COMMENT ON COLUMN user_badges.badge_id IS '배지 정의 ID (프론트엔드 BADGE_DEFINITIONS 참조)';
COMMENT ON COLUMN user_badges.trigger_event_id IS '배지 획득 계기가 된 행사';

-- =============================================
-- TRIGGERS: 통계 업데이트
-- =============================================

-- user_events 변경 시 events 통계 업데이트
CREATE OR REPLACE FUNCTION update_event_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- wishlist_count 업데이트
        UPDATE events SET
            wishlist_count = (SELECT COUNT(*) FROM user_events WHERE event_id = NEW.event_id AND is_wishlist = TRUE),
            attended_count = (SELECT COUNT(*) FROM user_events WHERE event_id = NEW.event_id AND is_attended = TRUE)
        WHERE id = NEW.event_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        UPDATE events SET
            wishlist_count = (SELECT COUNT(*) FROM user_events WHERE event_id = OLD.event_id AND is_wishlist = TRUE),
            attended_count = (SELECT COUNT(*) FROM user_events WHERE event_id = OLD.event_id AND is_attended = TRUE)
        WHERE id = OLD.event_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_stats
    AFTER INSERT OR UPDATE OR DELETE ON user_events
    FOR EACH ROW EXECUTE FUNCTION update_event_stats();

-- follows 변경 시 users 통계 업데이트
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
        UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
    AFTER INSERT OR DELETE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- updated_at 트리거
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_events_updated_at
    BEFORE UPDATE ON user_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 새 사용자 생성 함수 (Auth 트리거용)
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, nickname, email, provider)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
        NEW.email,
        NEW.raw_app_meta_data->>'provider'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auth 사용자 생성 시 자동으로 프로필 생성
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- =============================================
-- Migration: 00003_content_tables.sql
-- Description: Content entities - posts, comments, reactions, notifications, reports
-- Phase: 3 (User-generated content)
-- =============================================

-- =============================================
-- POSTS - 글
-- =============================================
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
    slot_id UUID REFERENCES slots(id) ON DELETE SET NULL,

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
CREATE INDEX idx_posts_event_type_created ON posts(event_id, type, created_at DESC);
CREATE INDEX idx_posts_active ON posts(event_id, created_at DESC) WHERE status = 'ACTIVE';
CREATE INDEX idx_posts_content ON posts USING gin(to_tsvector('simple', content));

COMMENT ON TABLE posts IS '글 (실시간 제보, 커뮤니티, 후기 등)';
COMMENT ON COLUMN posts.type IS '글 타입: gate/md/facility/safety (실시간), companion/taxi/meal 등 (커뮤니티), review/video (기록)';
COMMENT ON COLUMN posts.status IS '글 상태: ACTIVE, EXPIRING, EXPIRED, CLOSED';
COMMENT ON COLUMN posts.trust_level IS '실시간 제보 신뢰도: A(높음), B(중간), C(낮음)';

-- =============================================
-- POST_IMAGES - 글 이미지
-- =============================================
CREATE TABLE post_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    url TEXT NOT NULL,
    storage_path TEXT,                -- Supabase Storage 경로
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_images_post ON post_images(post_id);

COMMENT ON TABLE post_images IS '글에 첨부된 이미지';

-- =============================================
-- POST_REACTIONS - 글 반응 (도움됨)
-- =============================================
CREATE TABLE post_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    reaction_type TEXT DEFAULT 'helpful' CHECK (reaction_type IN ('helpful')),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);

COMMENT ON TABLE post_reactions IS '글 반응 (도움됨)';

-- =============================================
-- COMMENTS - 댓글
-- =============================================
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

COMMENT ON TABLE comments IS '댓글 (대댓글 지원)';
COMMENT ON COLUMN comments.parent_id IS '부모 댓글 ID (대댓글인 경우)';

-- =============================================
-- NOTIFICATIONS - 알림
-- =============================================
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
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES slots(id) ON DELETE SET NULL,

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
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_dedupe ON notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

COMMENT ON TABLE notifications IS '알림';
COMMENT ON COLUMN notifications.type IS '알림 타입';
COMMENT ON COLUMN notifications.deep_link IS '클릭 시 이동할 딥링크 (예: /event/123?tab=hub)';
COMMENT ON COLUMN notifications.dedupe_key IS '중복 방지 키 (30분 내 동일 키 알림 묶음)';

-- =============================================
-- REPORTS - 신고
-- =============================================
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
    reviewed_by UUID REFERENCES users(id),
    review_note TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_pending ON reports(status) WHERE status IN ('received', 'in_review');

COMMENT ON TABLE reports IS '신고';
COMMENT ON COLUMN reports.target_type IS '신고 대상 타입: post, comment, user';
COMMENT ON COLUMN reports.reason IS '신고 사유: spam, scam, abuse, hate, harassment, privacy, illegal, other';

-- =============================================
-- TRIGGERS: 통계 업데이트
-- =============================================

-- post_reactions 변경 시 posts.helpful_count 업데이트
CREATE OR REPLACE FUNCTION update_post_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET helpful_count = helpful_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.post_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_helpful_count
    AFTER INSERT OR DELETE ON post_reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_helpful_count();

-- comments 변경 시 posts.comment_count 업데이트
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
        UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = NEW.post_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
    AFTER INSERT OR DELETE OR UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- posts 변경 시 events.report_count, review_count 업데이트
CREATE OR REPLACE FUNCTION update_event_post_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_event_id UUID;
BEGIN
    v_event_id := COALESCE(NEW.event_id, OLD.event_id);

    UPDATE events SET
        report_count = (SELECT COUNT(*) FROM posts WHERE event_id = v_event_id AND type IN ('gate', 'md', 'facility', 'safety')),
        review_count = (SELECT COUNT(*) FROM posts WHERE event_id = v_event_id AND type = 'review')
    WHERE id = v_event_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_post_stats
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_event_post_stats();

-- updated_at 트리거
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =============================================
-- Migration: 00004_social_tables.sql
-- Description: Social entities - crews, participation
-- Phase: 4 (Social features)
-- =============================================

-- =============================================
-- CREWS - 크루
-- =============================================
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
CREATE INDEX idx_crews_public ON crews(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_crews_name ON crews USING gin(to_tsvector('simple', name));

COMMENT ON TABLE crews IS '크루 (같이 공연을 다니는 지속적인 모임)';
COMMENT ON COLUMN crews.join_type IS '가입 방식: open(자유 가입), approval(승인 필요)';
COMMENT ON COLUMN crews.region IS '활동 지역';
COMMENT ON COLUMN crews.genre IS '주요 장르';

-- =============================================
-- CREW_MEMBERS - 크루 멤버
-- =============================================
CREATE TABLE crew_members (
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),

    joined_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (crew_id, user_id)
);

CREATE INDEX idx_crew_members_user ON crew_members(user_id);
CREATE INDEX idx_crew_members_crew ON crew_members(crew_id);

COMMENT ON TABLE crew_members IS '크루 멤버';
COMMENT ON COLUMN crew_members.role IS '역할: leader(크루장), member(멤버)';

-- =============================================
-- CREW_EVENTS - 크루 공동 관심 행사
-- =============================================
CREATE TABLE crew_events (
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    added_by UUID NOT NULL REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (crew_id, event_id)
);

CREATE INDEX idx_crew_events_crew ON crew_events(crew_id);
CREATE INDEX idx_crew_events_event ON crew_events(event_id);

COMMENT ON TABLE crew_events IS '크루 공동 관심 행사 (크루 캘린더)';

-- =============================================
-- CREW_JOIN_REQUESTS - 크루 가입 신청
-- =============================================
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
CREATE INDEX idx_crew_join_requests_pending ON crew_join_requests(crew_id) WHERE status = 'pending';

COMMENT ON TABLE crew_join_requests IS '크루 가입 신청';

-- =============================================
-- CREW_ANNOUNCEMENTS - 크루 공지
-- =============================================
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
CREATE INDEX idx_crew_announcements_pinned ON crew_announcements(crew_id) WHERE is_pinned = TRUE;

COMMENT ON TABLE crew_announcements IS '크루 공지사항';

-- =============================================
-- PARTICIPATION_REQUESTS - 커뮤니티 참여 신청
-- =============================================
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
CREATE INDEX idx_participation_requests_pending ON participation_requests(post_author_id) WHERE status = 'pending';

COMMENT ON TABLE participation_requests IS '커뮤니티 글 참여 신청 (동행/택시/밥/숙소 등)';

-- =============================================
-- TRIGGERS: 통계 업데이트
-- =============================================

-- crew_members 변경 시 crews.member_count 업데이트
CREATE OR REPLACE FUNCTION update_crew_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE crews SET member_count = member_count + 1 WHERE id = NEW.crew_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE crews SET member_count = GREATEST(1, member_count - 1) WHERE id = OLD.crew_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crew_member_count
    AFTER INSERT OR DELETE ON crew_members
    FOR EACH ROW EXECUTE FUNCTION update_crew_member_count();

-- crew_events 변경 시 crews.event_count 업데이트
CREATE OR REPLACE FUNCTION update_crew_event_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE crews SET event_count = event_count + 1 WHERE id = NEW.crew_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE crews SET event_count = GREATEST(0, event_count - 1) WHERE id = OLD.crew_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crew_event_count
    AFTER INSERT OR DELETE ON crew_events
    FOR EACH ROW EXECUTE FUNCTION update_crew_event_count();

-- updated_at 트리거
CREATE TRIGGER update_crews_updated_at
    BEFORE UPDATE ON crews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_announcements_updated_at
    BEFORE UPDATE ON crew_announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =============================================
-- Migration: 00005_guide_tables.sql
-- Description: Guide entities - songs, call_guides
-- Phase: 5 (FieldNote - Call Guide)
-- =============================================

-- =============================================
-- SONGS - 곡
-- =============================================
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    artist_name TEXT NOT NULL,        -- denormalized for quick lookup

    youtube_id TEXT NOT NULL,
    duration INTEGER NOT NULL,        -- 재생 시간 (초)
    thumbnail_url TEXT,
    release_year INTEGER,
    album TEXT,

    has_call_guide BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_songs_artist ON songs(artist_id);
CREATE INDEX idx_songs_title ON songs USING gin(to_tsvector('simple', title));
CREATE UNIQUE INDEX idx_songs_youtube ON songs(youtube_id);
CREATE INDEX idx_songs_has_guide ON songs(has_call_guide) WHERE has_call_guide = TRUE;

COMMENT ON TABLE songs IS '곡 정보';
COMMENT ON COLUMN songs.youtube_id IS 'YouTube 영상 ID';
COMMENT ON COLUMN songs.duration IS '재생 시간 (초)';

-- =============================================
-- CALL_GUIDES - 콜가이드
-- =============================================
CREATE TABLE call_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'verified')),

    helpful_count INTEGER DEFAULT 0,

    created_by UUID NOT NULL REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    contributors UUID[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (song_id)
);

CREATE INDEX idx_call_guides_song ON call_guides(song_id);
CREATE INDEX idx_call_guides_status ON call_guides(status);
CREATE INDEX idx_call_guides_published ON call_guides(status) WHERE status = 'published';

COMMENT ON TABLE call_guides IS '콜가이드 (곡별 호응법)';
COMMENT ON COLUMN call_guides.status IS '상태: draft(초안), published(공개), verified(검증됨)';
COMMENT ON COLUMN call_guides.contributors IS '기여자 UUID 목록';

-- =============================================
-- CALL_GUIDE_ENTRIES - 콜가이드 항목
-- =============================================
CREATE TABLE call_guide_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_guide_id UUID NOT NULL REFERENCES call_guides(id) ON DELETE CASCADE,

    start_time DECIMAL(8, 2) NOT NULL,  -- 시작 시간 (초, 소수점 허용)
    end_time DECIMAL(8, 2),

    type TEXT NOT NULL CHECK (type IN ('lyrics', 'sing', 'action', 'jump', 'clap', 'light', 'etc')),

    text TEXT NOT NULL,
    text_romanized TEXT,
    text_original TEXT,
    instruction TEXT,
    intensity INTEGER CHECK (intensity >= 1 AND intensity <= 3),

    display_order INTEGER DEFAULT 0,

    -- 개별 엔트리 작성자 & 도움됨
    created_by UUID REFERENCES users(id),
    helpful_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_guide_entries_guide ON call_guide_entries(call_guide_id);
CREATE INDEX idx_call_guide_entries_time ON call_guide_entries(call_guide_id, start_time);

COMMENT ON TABLE call_guide_entries IS '콜가이드 항목 (타임라인별 가사/동작)';
COMMENT ON COLUMN call_guide_entries.type IS '타입: lyrics(가사), sing(따라부르기), action(동작), jump(점프), clap(박수), light(응원봉), etc(기타)';
COMMENT ON COLUMN call_guide_entries.intensity IS '강도: 1(약), 2(보통), 3(강)';

-- =============================================
-- CALL_GUIDE_VERSIONS - 콜가이드 버전 히스토리
-- =============================================
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
CREATE INDEX idx_call_guide_versions_version ON call_guide_versions(call_guide_id, version DESC);

COMMENT ON TABLE call_guide_versions IS '콜가이드 버전 히스토리 (롤백용)';

-- =============================================
-- CALL_GUIDE_REACTIONS - 콜가이드 반응 (도움됨)
-- =============================================
CREATE TABLE call_guide_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_guide_id UUID NOT NULL REFERENCES call_guides(id) ON DELETE CASCADE,

    reaction_type TEXT DEFAULT 'helpful' CHECK (reaction_type IN ('helpful')),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, call_guide_id)
);

CREATE INDEX idx_call_guide_reactions_guide ON call_guide_reactions(call_guide_id);

COMMENT ON TABLE call_guide_reactions IS '콜가이드 반응 (도움됨)';

-- =============================================
-- CALL_GUIDE_ENTRY_REACTIONS - 개별 엔트리 반응 (도움됨)
-- =============================================
CREATE TABLE call_guide_entry_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES call_guide_entries(id) ON DELETE CASCADE,

    reaction_type TEXT DEFAULT 'helpful' CHECK (reaction_type IN ('helpful')),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, entry_id)
);

CREATE INDEX idx_call_guide_entry_reactions_entry ON call_guide_entry_reactions(entry_id);

COMMENT ON TABLE call_guide_entry_reactions IS '콜가이드 엔트리별 반응 (도움됨)';

-- =============================================
-- TRIGGERS
-- =============================================

-- call_guides 생성/삭제 시 songs.has_call_guide 업데이트
CREATE OR REPLACE FUNCTION update_song_has_call_guide()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE songs SET has_call_guide = TRUE WHERE id = NEW.song_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE songs SET has_call_guide = FALSE WHERE id = OLD.song_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_song_has_call_guide
    AFTER INSERT OR DELETE ON call_guides
    FOR EACH ROW EXECUTE FUNCTION update_song_has_call_guide();

-- call_guide_reactions 변경 시 call_guides.helpful_count 업데이트
CREATE OR REPLACE FUNCTION update_call_guide_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE call_guides SET helpful_count = helpful_count + 1 WHERE id = NEW.call_guide_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE call_guides SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.call_guide_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_call_guide_helpful_count
    AFTER INSERT OR DELETE ON call_guide_reactions
    FOR EACH ROW EXECUTE FUNCTION update_call_guide_helpful_count();

-- call_guide_entry_reactions 변경 시 call_guide_entries.helpful_count 업데이트
CREATE OR REPLACE FUNCTION update_call_guide_entry_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE call_guide_entries SET helpful_count = helpful_count + 1 WHERE id = NEW.entry_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE call_guide_entries SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.entry_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_call_guide_entry_helpful_count
    AFTER INSERT OR DELETE ON call_guide_entry_reactions
    FOR EACH ROW EXECUTE FUNCTION update_call_guide_entry_helpful_count();

-- updated_at 트리거
CREATE TRIGGER update_call_guides_updated_at
    BEFORE UPDATE ON call_guides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =============================================
-- Migration: 00006_rls_policies.sql
-- Description: Row Level Security policies for all tables
-- Phase: All (Security layer)
-- =============================================

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- 관리자 체크 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 차단 체크 함수 (내가 차단한 사용자인지)
CREATE OR REPLACE FUNCTION is_blocked(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = auth.uid()
        AND blocked_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 크루 멤버 체크 함수
CREATE OR REPLACE FUNCTION is_crew_member(target_crew_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM crew_members
        WHERE crew_id = target_crew_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 크루 리더 체크 함수
CREATE OR REPLACE FUNCTION is_crew_leader(target_crew_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM crew_members
        WHERE crew_id = target_crew_id
        AND user_id = auth.uid()
        AND role = 'leader'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CORE TABLES - Read-only for regular users
-- =============================================

-- venues: 모두 읽기 가능, 관리자만 수정
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are viewable by everyone"
    ON venues FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert venues"
    ON venues FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update venues"
    ON venues FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete venues"
    ON venues FOR DELETE
    USING (is_admin());

-- artists: 모두 읽기 가능, 관리자만 수정
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists are viewable by everyone"
    ON artists FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert artists"
    ON artists FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update artists"
    ON artists FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete artists"
    ON artists FOR DELETE
    USING (is_admin());

-- events: 모두 읽기 가능, 관리자만 수정
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert events"
    ON events FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update events"
    ON events FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete events"
    ON events FOR DELETE
    USING (is_admin());

-- stages: 모두 읽기 가능, 관리자만 수정
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stages are viewable by everyone"
    ON stages FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert stages"
    ON stages FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update stages"
    ON stages FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete stages"
    ON stages FOR DELETE
    USING (is_admin());

-- event_artists: 모두 읽기 가능, 관리자만 수정
ALTER TABLE event_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event artists are viewable by everyone"
    ON event_artists FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert event artists"
    ON event_artists FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete event artists"
    ON event_artists FOR DELETE
    USING (is_admin());

-- slots: 모두 읽기 가능, 관리자만 수정
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slots are viewable by everyone"
    ON slots FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert slots"
    ON slots FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update slots"
    ON slots FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete slots"
    ON slots FOR DELETE
    USING (is_admin());

-- operational_slots: 모두 읽기 가능, 관리자만 수정
ALTER TABLE operational_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operational slots are viewable by everyone"
    ON operational_slots FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert operational slots"
    ON operational_slots FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update operational slots"
    ON operational_slots FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete operational slots"
    ON operational_slots FOR DELETE
    USING (is_admin());

-- =============================================
-- USER TABLES
-- =============================================

-- users: 모두 읽기 가능, 본인만 수정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User profiles are viewable by everyone"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- users 삭제는 auth.users 삭제 시 CASCADE

-- user_events: 본인만 전체 접근 (찜 목록은 프라이버시 설정에 따라)
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
    ON user_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own events"
    ON user_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
    ON user_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
    ON user_events FOR DELETE
    USING (auth.uid() = user_id);

-- 다른 사용자의 공개된 찜/다녀옴 조회 (프라이버시 설정 기반)
CREATE POLICY "View public wishlists"
    ON user_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = user_events.user_id
            AND (
                (is_wishlist = TRUE AND u.privacy_settings->>'wishlist' = 'public')
                OR (is_attended = TRUE AND u.privacy_settings->>'attended' = 'public')
            )
        )
    );

-- user_slot_marks: 본인만 전체 접근
ALTER TABLE user_slot_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own slot marks"
    ON user_slot_marks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own slot marks"
    ON user_slot_marks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slot marks"
    ON user_slot_marks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own slot marks"
    ON user_slot_marks FOR DELETE
    USING (auth.uid() = user_id);

-- custom_events: 본인만 전체 접근
ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom events"
    ON custom_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own custom events"
    ON custom_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom events"
    ON custom_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom events"
    ON custom_events FOR DELETE
    USING (auth.uid() = user_id);

-- follows: 모두 읽기 가능, 본인만 팔로우 관리
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
    ON follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON follows FOR DELETE
    USING (auth.uid() = follower_id);

-- blocks: 본인만 전체 접근
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks"
    ON blocks FOR SELECT
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
    ON blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
    ON blocks FOR DELETE
    USING (auth.uid() = blocker_id);

-- user_badges: 모두 읽기 가능 (시스템에서 부여)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone"
    ON user_badges FOR SELECT
    USING (true);

-- 배지는 시스템에서 부여하므로 service_role로만 INSERT/DELETE

-- =============================================
-- CONTENT TABLES
-- =============================================

-- posts: 차단된 사용자 글 제외하고 읽기, 본인만 쓰기/수정
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable except blocked users"
    ON posts FOR SELECT
    USING (NOT is_blocked(user_id));

CREATE POLICY "Authenticated users can create posts"
    ON posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own posts"
    ON posts FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- post_images: 글에 연결된 이미지 접근 정책
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post images follow post visibility"
    ON post_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_images.post_id
            AND NOT is_blocked(p.user_id)
        )
    );

CREATE POLICY "Users can add images to own posts"
    ON post_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own post images"
    ON post_images FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id
            AND p.user_id = auth.uid()
        )
    );

-- post_reactions: 모두 읽기, 본인만 반응 관리
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone"
    ON post_reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can add reactions"
    ON post_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
    ON post_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- comments: 차단된 사용자 제외 읽기, 본인만 작성/수정
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable except blocked users"
    ON comments FOR SELECT
    USING (NOT is_blocked(user_id));

CREATE POLICY "Authenticated users can create comments"
    ON comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- notifications: 본인 알림만 접근
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- notifications INSERT는 시스템에서 (service_role)

-- reports: 본인 신고만 읽기, 관리자는 전체 접근
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    USING (auth.uid() = reporter_id OR is_admin());

CREATE POLICY "Authenticated users can create reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Only admins can update reports"
    ON reports FOR UPDATE
    USING (is_admin());

-- =============================================
-- SOCIAL TABLES (CREWS)
-- =============================================

-- crews: 공개 크루는 모두 읽기, 비공개는 멤버만
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public crews are viewable by everyone"
    ON crews FOR SELECT
    USING (is_public = TRUE OR is_crew_member(id));

CREATE POLICY "Authenticated users can create crews"
    ON crews FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only crew leaders can update crew"
    ON crews FOR UPDATE
    USING (is_crew_leader(id) OR is_admin());

CREATE POLICY "Only crew leaders can delete crew"
    ON crews FOR DELETE
    USING (is_crew_leader(id) OR is_admin());

-- crew_members: 크루 공개 여부에 따라 읽기
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crew members visible based on crew visibility"
    ON crew_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crews c
            WHERE c.id = crew_members.crew_id
            AND (c.is_public = TRUE OR is_crew_member(c.id))
        )
    );

-- 크루 가입은 join_type에 따라 (open이면 바로, approval이면 리더 승인 필요)
CREATE POLICY "Users can join open crews"
    ON crew_members FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM crews c
            WHERE c.id = crew_id
            AND (
                c.join_type = 'open'
                OR c.created_by = auth.uid()  -- 생성자가 자신을 리더로 추가
            )
        )
    );

-- 리더가 멤버 추가 (승인)
CREATE POLICY "Leaders can add members"
    ON crew_members FOR INSERT
    WITH CHECK (is_crew_leader(crew_id));

-- 본인 탈퇴 또는 리더가 강퇴
CREATE POLICY "Users can leave or leaders can kick"
    ON crew_members FOR DELETE
    USING (
        auth.uid() = user_id
        OR is_crew_leader(crew_id)
    );

-- crew_events: 멤버만 읽기/쓰기
ALTER TABLE crew_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crew events visible to members"
    ON crew_events FOR SELECT
    USING (is_crew_member(crew_id));

CREATE POLICY "Members can add crew events"
    ON crew_events FOR INSERT
    WITH CHECK (
        is_crew_member(crew_id)
        AND auth.uid() = added_by
    );

CREATE POLICY "Members can remove crew events"
    ON crew_events FOR DELETE
    USING (
        auth.uid() = added_by
        OR is_crew_leader(crew_id)
    );

-- crew_join_requests: 관련자만 접근
ALTER TABLE crew_join_requests ENABLE ROW LEVEL SECURITY;

-- 본인 신청 또는 크루 리더만 조회
CREATE POLICY "View own requests or as crew leader"
    ON crew_join_requests FOR SELECT
    USING (
        auth.uid() = user_id
        OR is_crew_leader(crew_id)
    );

CREATE POLICY "Users can request to join"
    ON crew_join_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can process requests"
    ON crew_join_requests FOR UPDATE
    USING (is_crew_leader(crew_id));

CREATE POLICY "Users can cancel own request"
    ON crew_join_requests FOR DELETE
    USING (auth.uid() = user_id);

-- crew_announcements: 멤버만 읽기, 리더만 쓰기
ALTER TABLE crew_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crew announcements visible to members"
    ON crew_announcements FOR SELECT
    USING (is_crew_member(crew_id));

CREATE POLICY "Only leaders can create announcements"
    ON crew_announcements FOR INSERT
    WITH CHECK (is_crew_leader(crew_id) AND auth.uid() = author_id);

CREATE POLICY "Only leaders can update announcements"
    ON crew_announcements FOR UPDATE
    USING (is_crew_leader(crew_id));

CREATE POLICY "Only leaders can delete announcements"
    ON crew_announcements FOR DELETE
    USING (is_crew_leader(crew_id));

-- =============================================
-- SOCIAL TABLES (PARTICIPATION)
-- =============================================

-- participation_requests: 관련자만 접근
ALTER TABLE participation_requests ENABLE ROW LEVEL SECURITY;

-- 신청자 또는 글 작성자만 조회
CREATE POLICY "View own participation requests"
    ON participation_requests FOR SELECT
    USING (
        auth.uid() = applicant_id
        OR auth.uid() = post_author_id
    );

CREATE POLICY "Authenticated users can create requests"
    ON participation_requests FOR INSERT
    WITH CHECK (auth.uid() = applicant_id);

-- 글 작성자만 상태 변경 (수락/거절)
CREATE POLICY "Post authors can respond to requests"
    ON participation_requests FOR UPDATE
    USING (auth.uid() = post_author_id);

-- 신청자는 취소 가능
CREATE POLICY "Applicants can cancel requests"
    ON participation_requests FOR DELETE
    USING (auth.uid() = applicant_id);

-- =============================================
-- GUIDE TABLES (CALL GUIDES)
-- =============================================

-- songs: 모두 읽기, 관리자만 관리
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Songs are viewable by everyone"
    ON songs FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage songs"
    ON songs FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update songs"
    ON songs FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete songs"
    ON songs FOR DELETE
    USING (is_admin());

-- call_guides: 공개된 가이드는 모두 읽기, 작성자/관리자만 수정
ALTER TABLE call_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published call guides are viewable"
    ON call_guides FOR SELECT
    USING (
        status IN ('published', 'verified')
        OR auth.uid() = created_by
        OR is_admin()
    );

CREATE POLICY "Authenticated users can create call guides"
    ON call_guides FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can update own call guides"
    ON call_guides FOR UPDATE
    USING (auth.uid() = created_by OR is_admin());

CREATE POLICY "Authors can delete own call guides"
    ON call_guides FOR DELETE
    USING (auth.uid() = created_by OR is_admin());

-- call_guide_entries: 가이드 접근 권한 따라감
ALTER TABLE call_guide_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entries follow call guide visibility"
    ON call_guide_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_entries.call_guide_id
            AND (
                cg.status IN ('published', 'verified')
                OR cg.created_by = auth.uid()
                OR is_admin()
            )
        )
    );

CREATE POLICY "Authors can manage own call guide entries"
    ON call_guide_entries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_id
            AND (cg.created_by = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Authors can update own call guide entries"
    ON call_guide_entries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_id
            AND (cg.created_by = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Authors can delete own call guide entries"
    ON call_guide_entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_id
            AND (cg.created_by = auth.uid() OR is_admin())
        )
    );

-- call_guide_versions: 가이드 접근 권한 따라감
ALTER TABLE call_guide_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Versions follow call guide visibility"
    ON call_guide_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_versions.call_guide_id
            AND (
                cg.status IN ('published', 'verified')
                OR cg.created_by = auth.uid()
                OR is_admin()
            )
        )
    );

-- versions INSERT는 시스템에서 (트리거 또는 service_role)

-- call_guide_reactions: 모두 읽기, 본인만 반응 관리
ALTER TABLE call_guide_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call guide reactions are viewable"
    ON call_guide_reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can add call guide reactions"
    ON call_guide_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
    ON call_guide_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- GRANTS for anon and authenticated roles
-- =============================================

-- anon: 읽기 전용 (공개 데이터만)
GRANT SELECT ON venues TO anon;
GRANT SELECT ON artists TO anon;
GRANT SELECT ON events TO anon;
GRANT SELECT ON stages TO anon;
GRANT SELECT ON event_artists TO anon;
GRANT SELECT ON slots TO anon;
GRANT SELECT ON operational_slots TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON crews TO anon;
GRANT SELECT ON songs TO anon;
GRANT SELECT ON call_guides TO anon;
GRANT SELECT ON call_guide_entries TO anon;

-- authenticated: 전체 CRUD (RLS에서 제어)
GRANT ALL ON venues TO authenticated;
GRANT ALL ON artists TO authenticated;
GRANT ALL ON events TO authenticated;
GRANT ALL ON stages TO authenticated;
GRANT ALL ON event_artists TO authenticated;
GRANT ALL ON slots TO authenticated;
GRANT ALL ON operational_slots TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON user_events TO authenticated;
GRANT ALL ON user_slot_marks TO authenticated;
GRANT ALL ON custom_events TO authenticated;
GRANT ALL ON follows TO authenticated;
GRANT ALL ON blocks TO authenticated;
GRANT ALL ON user_badges TO authenticated;
GRANT ALL ON posts TO authenticated;
GRANT ALL ON post_images TO authenticated;
GRANT ALL ON post_reactions TO authenticated;
GRANT ALL ON comments TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON reports TO authenticated;
GRANT ALL ON crews TO authenticated;
GRANT ALL ON crew_members TO authenticated;
GRANT ALL ON crew_events TO authenticated;
GRANT ALL ON crew_join_requests TO authenticated;
GRANT ALL ON crew_announcements TO authenticated;
GRANT ALL ON participation_requests TO authenticated;
GRANT ALL ON songs TO authenticated;
GRANT ALL ON call_guides TO authenticated;
GRANT ALL ON call_guide_entries TO authenticated;
GRANT ALL ON call_guide_versions TO authenticated;
GRANT ALL ON call_guide_reactions TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION is_admin() IS '현재 사용자가 관리자인지 확인';
COMMENT ON FUNCTION is_blocked(UUID) IS '현재 사용자가 대상을 차단했는지 확인';
COMMENT ON FUNCTION is_crew_member(UUID) IS '현재 사용자가 크루 멤버인지 확인';
COMMENT ON FUNCTION is_crew_leader(UUID) IS '현재 사용자가 크루 리더인지 확인';
