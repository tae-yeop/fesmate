-- =============================================
-- PATCH: call_guide_entry_reactions 테이블 추가
-- 실행: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. call_guide_entries에 helpful_count 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'call_guide_entries' AND column_name = 'helpful_count'
    ) THEN
        ALTER TABLE call_guide_entries ADD COLUMN helpful_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. call_guide_entries에 created_by 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'call_guide_entries' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE call_guide_entries ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END $$;

-- 3. call_guide_entry_reactions 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS call_guide_entry_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES call_guide_entries(id) ON DELETE CASCADE,
    reaction_type TEXT DEFAULT 'helpful' CHECK (reaction_type IN ('helpful')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, entry_id)
);

-- 4. 인덱스 생성 (없는 경우)
CREATE INDEX IF NOT EXISTS idx_call_guide_entry_reactions_entry
    ON call_guide_entry_reactions(entry_id);

-- 5. 트리거 함수 생성/업데이트
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

-- 6. 트리거 생성 (없는 경우)
DROP TRIGGER IF EXISTS trigger_update_call_guide_entry_helpful_count ON call_guide_entry_reactions;
CREATE TRIGGER trigger_update_call_guide_entry_helpful_count
    AFTER INSERT OR DELETE ON call_guide_entry_reactions
    FOR EACH ROW EXECUTE FUNCTION update_call_guide_entry_helpful_count();

-- 7. RLS 정책 설정
ALTER TABLE call_guide_entry_reactions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
DROP POLICY IF EXISTS "Anyone can read entry reactions" ON call_guide_entry_reactions;
CREATE POLICY "Anyone can read entry reactions" ON call_guide_entry_reactions
    FOR SELECT USING (true);

-- 인증된 사용자만 자신의 반응 추가
DROP POLICY IF EXISTS "Users can add own entry reactions" ON call_guide_entry_reactions;
CREATE POLICY "Users can add own entry reactions" ON call_guide_entry_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 인증된 사용자만 자신의 반응 삭제
DROP POLICY IF EXISTS "Users can delete own entry reactions" ON call_guide_entry_reactions;
CREATE POLICY "Users can delete own entry reactions" ON call_guide_entry_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- 완료 메시지
SELECT 'Migration completed successfully!' as status;
