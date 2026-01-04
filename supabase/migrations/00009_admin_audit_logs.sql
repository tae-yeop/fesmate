-- =============================================
-- Migration: 00009_admin_audit_logs.sql
-- Description: Admin audit logs and user suspension fields
-- Phase: Admin Tools
-- =============================================

-- =============================================
-- 1. Admin Audit Logs Table
-- =============================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        -- Report actions
        'report_reviewed',
        'report_status_changed',
        -- Event actions
        'event_created',
        'event_edited',
        'event_status_changed',
        'event_deleted',
        -- User actions
        'user_suspended',
        'user_unsuspended',
        'user_warned',
        'user_role_changed',
        -- Content actions
        'post_deleted',
        'post_hidden',
        'comment_deleted',
        'comment_hidden',
        -- Crawl actions
        'crawl_suggestion_approved',
        'crawl_suggestion_rejected',
        'crawl_source_added',
        'crawl_source_edited'
    )),
    target_type TEXT CHECK (target_type IN ('report', 'event', 'user', 'post', 'comment', 'suggestion', 'crawl_source')),
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON admin_audit_logs(target_type, target_id);

COMMENT ON TABLE admin_audit_logs IS '관리자 작업 감사 로그';
COMMENT ON COLUMN admin_audit_logs.action_type IS '작업 유형';
COMMENT ON COLUMN admin_audit_logs.details IS '작업 상세 정보 (이전값, 새값 등)';

-- =============================================
-- 2. Extend Users Table for Suspension
-- =============================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0;

COMMENT ON COLUMN users.suspended_at IS '정지 시작 시점';
COMMENT ON COLUMN users.suspended_until IS '정지 해제 예정 시점 (NULL이면 영구 정지)';
COMMENT ON COLUMN users.suspension_reason IS '정지 사유';
COMMENT ON COLUMN users.warning_count IS '누적 경고 횟수';

-- Index for finding suspended users
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(suspended_at) WHERE suspended_at IS NOT NULL;

-- =============================================
-- 3. Row Level Security
-- =============================================

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "admin_audit_logs_select"
    ON admin_audit_logs FOR SELECT
    USING (is_admin());

-- Only admins can create audit logs (and must be the admin performing the action)
CREATE POLICY "admin_audit_logs_insert"
    ON admin_audit_logs FOR INSERT
    WITH CHECK (is_admin() AND auth.uid() = admin_id);

-- No update or delete allowed on audit logs (immutable)
-- (No policy = denied)

-- Grant permissions
GRANT SELECT, INSERT ON admin_audit_logs TO authenticated;

-- =============================================
-- 4. Helper Functions
-- =============================================

-- Function to check if a user is suspended
CREATE OR REPLACE FUNCTION is_user_suspended(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id
        AND suspended_at IS NOT NULL
        AND (suspended_until IS NULL OR suspended_until > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_user_suspended IS '사용자 정지 상태 확인';

-- =============================================
-- 5. Action Type Labels (for reference)
-- =============================================
-- report_reviewed: 신고 검토
-- report_status_changed: 신고 상태 변경
-- event_created: 행사 생성
-- event_edited: 행사 수정
-- event_status_changed: 행사 상태 변경
-- event_deleted: 행사 삭제
-- user_suspended: 사용자 정지
-- user_unsuspended: 정지 해제
-- user_warned: 경고 부여
-- user_role_changed: 권한 변경
-- post_deleted: 글 삭제
-- post_hidden: 글 숨김
-- comment_deleted: 댓글 삭제
-- comment_hidden: 댓글 숨김
-- crawl_suggestion_approved: 크롤링 제안 승인
-- crawl_suggestion_rejected: 크롤링 제안 거절
-- crawl_source_added: 크롤링 소스 추가
-- crawl_source_edited: 크롤링 소스 수정
