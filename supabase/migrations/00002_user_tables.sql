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
