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
