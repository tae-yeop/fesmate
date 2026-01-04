-- 글 숨김 기능 추가
-- 다수 신고된 글 자동 숨김

-- posts 테이블에 숨김 관련 컬럼 추가
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hidden_reason VARCHAR(50),
ADD COLUMN IF NOT EXISTS report_count INT DEFAULT 0;

-- 숨김 사유 체크 제약
ALTER TABLE posts
ADD CONSTRAINT posts_hidden_reason_check
CHECK (hidden_reason IS NULL OR hidden_reason IN (
    'auto_spam',        -- 스팸 자동 감지
    'auto_reports',     -- 다수 신고
    'manual_admin',     -- 관리자 수동
    'user_deleted'      -- 사용자 삭제
));

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_is_hidden ON posts(is_hidden);
CREATE INDEX IF NOT EXISTS idx_posts_report_count ON posts(report_count);

-- 신고 수 증가 함수
CREATE OR REPLACE FUNCTION increment_post_report_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 글에 대한 신고인 경우에만 처리
    IF NEW.target_type = 'post' AND NEW.target_id IS NOT NULL THEN
        UPDATE posts
        SET report_count = report_count + 1,
            updated_at = NOW()
        WHERE id = NEW.target_id;

        -- 신고 5회 이상이면 자동 숨김
        UPDATE posts
        SET is_hidden = true,
            hidden_at = NOW(),
            hidden_reason = 'auto_reports',
            updated_at = NOW()
        WHERE id = NEW.target_id
          AND report_count >= 5
          AND is_hidden = false;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 신고 생성 시 글 신고 수 업데이트 트리거
DROP TRIGGER IF EXISTS trg_increment_post_report_count ON reports;
CREATE TRIGGER trg_increment_post_report_count
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION increment_post_report_count();

-- 숨김 글 조회 함수 (관리자용)
CREATE OR REPLACE FUNCTION get_hidden_posts(p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    type VARCHAR(50),
    is_hidden BOOLEAN,
    hidden_at TIMESTAMP WITH TIME ZONE,
    hidden_reason VARCHAR(50),
    report_count INT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        p.content,
        p.type,
        p.is_hidden,
        p.hidden_at,
        p.hidden_reason,
        p.report_count,
        p.created_at
    FROM posts p
    WHERE p.is_hidden = true
    ORDER BY p.hidden_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 글 숨김 해제 함수 (관리자용)
CREATE OR REPLACE FUNCTION unhide_post(p_post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE posts
    SET is_hidden = false,
        hidden_at = NULL,
        hidden_reason = NULL,
        updated_at = NOW()
    WHERE id = p_post_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 글 영구 삭제 함수 (관리자용)
CREATE OR REPLACE FUNCTION delete_post_permanently(p_post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- 관련 댓글 삭제
    DELETE FROM comments WHERE post_id = p_post_id;

    -- 관련 신고 상태 업데이트
    UPDATE reports
    SET status = 'RESOLVED'
    WHERE target_type = 'post' AND target_id = p_post_id;

    -- 글 삭제
    DELETE FROM posts WHERE id = p_post_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 get_community_posts 함수 수정 (숨김 글 제외)
CREATE OR REPLACE FUNCTION get_community_posts(
    p_types TEXT[],
    p_event_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    event_id UUID,
    type VARCHAR(50),
    status VARCHAR(20),
    content TEXT,
    helpful_count INT,
    max_people INT,
    current_people INT,
    meet_at TIMESTAMP WITH TIME ZONE,
    depart_at TIMESTAMP WITH TIME ZONE,
    checkin_at TIMESTAMP WITH TIME ZONE,
    place_text TEXT,
    place_hint TEXT,
    budget TEXT,
    price INT,
    rules TEXT,
    contact_method TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_bumped_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN,
    is_urgent BOOLEAN,
    is_hidden BOOLEAN,
    report_count INT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        p.event_id,
        p.type,
        p.status,
        p.content,
        p.helpful_count,
        p.max_people,
        p.current_people,
        p.meet_at,
        p.depart_at,
        p.checkin_at,
        p.place_text,
        p.place_hint,
        p.budget,
        p.price,
        p.rules,
        p.contact_method,
        p.expires_at,
        p.last_bumped_at,
        p.is_pinned,
        p.is_urgent,
        p.is_hidden,
        p.report_count,
        p.created_at,
        p.updated_at
    FROM posts p
    WHERE p.type = ANY(p_types)
      AND (p_event_id IS NULL OR p.event_id = p_event_id)
      AND p.status = 'ACTIVE'
      AND COALESCE(p.is_hidden, false) = false  -- 숨김 글 제외
      AND (p.expires_at IS NULL OR p.expires_at > NOW())
    ORDER BY
        p.is_pinned DESC NULLS LAST,
        p.is_urgent DESC NULLS LAST,
        COALESCE(p.last_bumped_at, p.created_at) DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자 신뢰도 테이블
CREATE TABLE IF NOT EXISTS user_trust (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL DEFAULT 50.00 CHECK (score >= 0 AND score <= 100),
    grade VARCHAR(1) NOT NULL DEFAULT 'B' CHECK (grade IN ('A', 'B', 'C')),
    helpful_received INT NOT NULL DEFAULT 0,
    reports_against INT NOT NULL DEFAULT 0,
    warnings_received INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 신뢰도 변동 기록
CREATE TABLE IF NOT EXISTS trust_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    previous_score DECIMAL(5,2) NOT NULL,
    new_score DECIMAL(5,2) NOT NULL,
    delta DECIMAL(5,2) NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'helpful_received',
        'helpful_removed',
        'reported_against',
        'warning_received',
        'suspension_received',
        'post_created',
        'comment_created',
        'manual_adjustment'
    )),
    related_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_trust_score ON user_trust(score);
CREATE INDEX IF NOT EXISTS idx_user_trust_grade ON user_trust(grade);
CREATE INDEX IF NOT EXISTS idx_trust_history_user_id ON trust_history(user_id);

-- 등급 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_trust_grade(p_score DECIMAL)
RETURNS VARCHAR(1) AS $$
BEGIN
    IF p_score >= 80 THEN
        RETURN 'A';
    ELSIF p_score >= 50 THEN
        RETURN 'B';
    ELSE
        RETURN 'C';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 신뢰도 업데이트 함수
CREATE OR REPLACE FUNCTION update_user_trust(
    p_user_id UUID,
    p_delta DECIMAL,
    p_reason VARCHAR(50),
    p_related_id UUID DEFAULT NULL
)
RETURNS TABLE (new_score DECIMAL, new_grade VARCHAR(1)) AS $$
DECLARE
    v_prev_score DECIMAL;
    v_new_score DECIMAL;
    v_new_grade VARCHAR(1);
BEGIN
    -- 기존 점수 조회 (없으면 생성)
    INSERT INTO user_trust (user_id, score, grade)
    VALUES (p_user_id, 50.00, 'B')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT score INTO v_prev_score
    FROM user_trust
    WHERE user_id = p_user_id;

    -- 새 점수 계산 (0-100 범위 내)
    v_new_score := GREATEST(0, LEAST(100, v_prev_score + p_delta));
    v_new_grade := calculate_trust_grade(v_new_score);

    -- 업데이트
    UPDATE user_trust
    SET score = v_new_score,
        grade = v_new_grade,
        helpful_received = CASE
            WHEN p_reason = 'helpful_received' THEN helpful_received + 1
            WHEN p_reason = 'helpful_removed' THEN GREATEST(0, helpful_received - 1)
            ELSE helpful_received
        END,
        reports_against = CASE
            WHEN p_reason = 'reported_against' THEN reports_against + 1
            ELSE reports_against
        END,
        warnings_received = CASE
            WHEN p_reason = 'warning_received' THEN warnings_received + 1
            ELSE warnings_received
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 기록 저장
    INSERT INTO trust_history (user_id, previous_score, new_score, delta, reason, related_id)
    VALUES (p_user_id, v_prev_score, v_new_score, p_delta, p_reason, p_related_id);

    RETURN QUERY SELECT v_new_score, v_new_grade;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 정책
ALTER TABLE user_trust ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_history ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 신뢰도 조회 가능
CREATE POLICY "Everyone can view trust scores"
    ON user_trust FOR SELECT
    USING (true);

-- 자신의 신뢰도 기록만 조회 가능
CREATE POLICY "Users can view own trust history"
    ON trust_history FOR SELECT
    USING (auth.uid() = user_id);

-- updated_at 자동 업데이트
CREATE TRIGGER update_user_trust_updated_at
    BEFORE UPDATE ON user_trust
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
