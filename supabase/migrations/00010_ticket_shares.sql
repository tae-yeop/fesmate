-- =============================================
-- Migration: 00010_ticket_shares.sql
-- Description: Ticket shares (public gallery) table
-- Phase: Ticketbook Extension
-- =============================================

-- =============================================
-- 1. Ticket Shares Table
-- =============================================

CREATE TABLE IF NOT EXISTS ticket_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 짧은 공개 URL ID (8자 alphanumeric)
    share_id TEXT UNIQUE NOT NULL,

    -- 소유자
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 공유 정보
    title TEXT,
    description TEXT,

    -- 공개 설정
    is_public BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,  -- NULL이면 만료 없음

    -- 포함된 티켓 ID 배열
    ticket_ids UUID[] NOT NULL DEFAULT '{}',

    -- 통계
    view_count INTEGER DEFAULT 0,

    -- 시스템
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_shares_share_id ON ticket_shares(share_id);
CREATE INDEX IF NOT EXISTS idx_ticket_shares_user ON ticket_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_shares_public ON ticket_shares(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_ticket_shares_expires ON ticket_shares(expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON TABLE ticket_shares IS '티켓 공유 갤러리';
COMMENT ON COLUMN ticket_shares.share_id IS '공개 URL용 짧은 ID';
COMMENT ON COLUMN ticket_shares.ticket_ids IS '공유에 포함된 티켓 ID 배열';
COMMENT ON COLUMN ticket_shares.expires_at IS '만료 시간 (NULL이면 만료 없음)';

-- =============================================
-- 2. Row Level Security
-- =============================================

ALTER TABLE ticket_shares ENABLE ROW LEVEL SECURITY;

-- 공개된 공유는 누구나 조회 가능
CREATE POLICY "ticket_shares_select_public"
    ON ticket_shares FOR SELECT
    USING (
        is_public = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- 본인의 공유는 항상 조회 가능
CREATE POLICY "ticket_shares_select_own"
    ON ticket_shares FOR SELECT
    USING (auth.uid() = user_id);

-- 본인만 생성 가능
CREATE POLICY "ticket_shares_insert"
    ON ticket_shares FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 본인만 수정 가능
CREATE POLICY "ticket_shares_update"
    ON ticket_shares FOR UPDATE
    USING (auth.uid() = user_id);

-- 본인만 삭제 가능
CREATE POLICY "ticket_shares_delete"
    ON ticket_shares FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_shares TO authenticated;
GRANT SELECT ON ticket_shares TO anon;  -- 공개 공유 조회용

-- =============================================
-- 3. Helper Functions
-- =============================================

-- 조회수 증가 함수 (RPC)
CREATE OR REPLACE FUNCTION increment_share_view_count(p_share_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE ticket_shares
    SET view_count = view_count + 1
    WHERE share_id = p_share_id
    AND is_public = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_share_view_count IS '공유 조회수 증가 (공개 공유만)';

-- 만료된 공유 정리 함수 (정기 실행용)
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ticket_shares
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_shares IS '만료된 공유 정리';

-- =============================================
-- 4. Updated At Trigger
-- =============================================

CREATE OR REPLACE FUNCTION update_ticket_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ticket_shares_updated_at
    BEFORE UPDATE ON ticket_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_shares_updated_at();
