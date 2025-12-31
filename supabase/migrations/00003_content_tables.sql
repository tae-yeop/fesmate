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
