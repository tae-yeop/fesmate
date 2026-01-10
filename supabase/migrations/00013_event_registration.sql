-- =============================================
-- Migration: 00013_event_registration.sql
-- Description: 사용자 행사 등록 기능을 위한 events 테이블 컬럼 추가
-- =============================================

-- 행사 소스 (출처)
-- official: 공식 등록 (운영자)
-- user: 사용자 등록
-- crawl: 크롤링 수집
ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'official'
    CHECK (source IN ('official', 'user', 'crawl'));

-- 등록자 (사용자 등록 행사인 경우)
ALTER TABLE events ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 등록 상태
-- draft: 작성 중 (미공개)
-- pending: 검토 대기
-- published: 게시됨
-- rejected: 반려됨
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'published'
    CHECK (registration_status IN ('draft', 'pending', 'published', 'rejected'));

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_registered_by ON events(registered_by);
CREATE INDEX IF NOT EXISTS idx_events_registration_status ON events(registration_status);

-- 코멘트
COMMENT ON COLUMN events.source IS '행사 소스: official(공식), user(사용자 등록), crawl(크롤링)';
COMMENT ON COLUMN events.registered_by IS '등록자 사용자 ID (source=user인 경우)';
COMMENT ON COLUMN events.registration_status IS '등록 상태: draft(작성중), pending(검토대기), published(게시됨), rejected(반려)';

-- RLS 정책 추가: 사용자는 자신이 등록한 행사만 수정/삭제 가능
-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;

-- 새 정책 추가
-- 모든 사용자가 published 상태의 행사를 볼 수 있음 (기존 SELECT 정책 유지)
-- 인증된 사용자만 행사 등록 가능
CREATE POLICY "Users can create events"
    ON events FOR INSERT
    TO authenticated
    WITH CHECK (
        -- source가 'user'인 경우 registered_by가 본인이어야 함
        (source = 'user' AND registered_by = auth.uid())
        OR
        -- 관리자는 모든 소스로 등록 가능
        (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'))
    );

-- 본인 행사 또는 관리자만 수정 가능
CREATE POLICY "Users can update own events"
    ON events FOR UPDATE
    TO authenticated
    USING (
        registered_by = auth.uid()
        OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    )
    WITH CHECK (
        registered_by = auth.uid()
        OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- 본인 행사 또는 관리자만 삭제 가능
CREATE POLICY "Users can delete own events"
    ON events FOR DELETE
    TO authenticated
    USING (
        registered_by = auth.uid()
        OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    );
