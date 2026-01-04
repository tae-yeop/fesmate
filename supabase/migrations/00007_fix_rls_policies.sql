-- =============================================
-- Fix RLS policies for user_badges and user_events
-- =============================================
--
-- 문제: 클라이언트에서 배지 저장 시 INSERT 권한 없음
-- 해결: 본인 배지에 대한 INSERT/UPDATE 정책 추가

-- user_badges: 본인 배지 INSERT 허용
CREATE POLICY "Users can earn badges"
    ON user_badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- user_badges: 본인 배지 UPDATE 허용 (trigger_event 정보 업데이트 등)
CREATE POLICY "Users can update own badges"
    ON user_badges FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- user_events: UPSERT 문제 해결을 위한 정책 재정의
-- 기존 정책이 있다면 무시하고, 없다면 추가
DO $$
BEGIN
    -- 기존 UPDATE 정책이 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_events'
        AND policyname = 'Users can update own event status'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update own event status"
            ON user_events FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;
