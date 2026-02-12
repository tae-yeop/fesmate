-- Setlist Tables (P2 Feature)
-- 셋리스트 기능을 위한 테이블 생성

-- 셋리스트 메인 테이블
CREATE TABLE IF NOT EXISTS setlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slot_id) -- 슬롯당 하나의 셋리스트
);

-- 셋리스트 곡 목록 테이블
CREATE TABLE IF NOT EXISTS setlist_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
    song_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    is_encore BOOLEAN DEFAULT FALSE,
    note TEXT,
    duration INTEGER, -- 초 단위
    call_guide_id UUID REFERENCES call_guides(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(setlist_id, song_order)
);

-- 셋리스트 도움됨 반응 테이블
CREATE TABLE IF NOT EXISTS setlist_helpful (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(setlist_id, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_setlists_slot ON setlists(slot_id);
CREATE INDEX IF NOT EXISTS idx_setlists_event ON setlists(event_id);
CREATE INDEX IF NOT EXISTS idx_setlists_created_by ON setlists(created_by);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist ON setlist_songs(setlist_id);
CREATE INDEX IF NOT EXISTS idx_setlist_helpful_setlist ON setlist_helpful(setlist_id);

-- RLS 정책
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_helpful ENABLE ROW LEVEL SECURITY;

-- Setlists: 누구나 published 읽기, 본인 draft 읽기
CREATE POLICY "setlists_select" ON setlists
    FOR SELECT USING (status = 'published' OR created_by = auth.uid());

-- Setlists: 로그인 사용자 생성
CREATE POLICY "setlists_insert" ON setlists
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Setlists: 본인만 수정
CREATE POLICY "setlists_update" ON setlists
    FOR UPDATE USING (created_by = auth.uid());

-- Setlists: 본인만 삭제
CREATE POLICY "setlists_delete" ON setlists
    FOR DELETE USING (created_by = auth.uid());

-- Setlist Songs: 셋리스트 접근 가능하면 읽기 가능
CREATE POLICY "setlist_songs_select" ON setlist_songs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM setlists 
            WHERE setlists.id = setlist_songs.setlist_id
            AND (setlists.status = 'published' OR setlists.created_by = auth.uid())
        )
    );

-- Setlist Songs: 셋리스트 소유자만 쓰기
CREATE POLICY "setlist_songs_insert" ON setlist_songs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM setlists 
            WHERE setlists.id = setlist_songs.setlist_id
            AND setlists.created_by = auth.uid()
        )
    );

CREATE POLICY "setlist_songs_update" ON setlist_songs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM setlists 
            WHERE setlists.id = setlist_songs.setlist_id
            AND setlists.created_by = auth.uid()
        )
    );

CREATE POLICY "setlist_songs_delete" ON setlist_songs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM setlists 
            WHERE setlists.id = setlist_songs.setlist_id
            AND setlists.created_by = auth.uid()
        )
    );

-- Setlist Helpful: 로그인 사용자 CRUD
CREATE POLICY "setlist_helpful_select" ON setlist_helpful
    FOR SELECT USING (TRUE);

CREATE POLICY "setlist_helpful_insert" ON setlist_helpful
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "setlist_helpful_delete" ON setlist_helpful
    FOR DELETE USING (user_id = auth.uid());

-- 트리거: helpful_count 자동 업데이트
CREATE OR REPLACE FUNCTION update_setlist_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE setlists SET helpful_count = helpful_count + 1 WHERE id = NEW.setlist_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE setlists SET helpful_count = helpful_count - 1 WHERE id = OLD.setlist_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER setlist_helpful_count_trigger
AFTER INSERT OR DELETE ON setlist_helpful
FOR EACH ROW EXECUTE FUNCTION update_setlist_helpful_count();

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_setlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER setlist_updated_at_trigger
BEFORE UPDATE ON setlists
FOR EACH ROW EXECUTE FUNCTION update_setlist_updated_at();
