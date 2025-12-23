-- =============================================
-- Migration: 00005_guide_tables.sql
-- Description: Guide entities - songs, call_guides
-- Phase: 5 (FieldNote - Call Guide)
-- =============================================

-- =============================================
-- SONGS - 곡
-- =============================================
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    artist_name TEXT NOT NULL,        -- denormalized for quick lookup

    youtube_id TEXT NOT NULL,
    duration INTEGER NOT NULL,        -- 재생 시간 (초)
    thumbnail_url TEXT,
    release_year INTEGER,
    album TEXT,

    has_call_guide BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_songs_artist ON songs(artist_id);
CREATE INDEX idx_songs_title ON songs USING gin(to_tsvector('korean', title));
CREATE UNIQUE INDEX idx_songs_youtube ON songs(youtube_id);
CREATE INDEX idx_songs_has_guide ON songs(has_call_guide) WHERE has_call_guide = TRUE;

COMMENT ON TABLE songs IS '곡 정보';
COMMENT ON COLUMN songs.youtube_id IS 'YouTube 영상 ID';
COMMENT ON COLUMN songs.duration IS '재생 시간 (초)';

-- =============================================
-- CALL_GUIDES - 콜가이드
-- =============================================
CREATE TABLE call_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'verified')),

    helpful_count INTEGER DEFAULT 0,

    created_by UUID NOT NULL REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    contributors UUID[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (song_id)
);

CREATE INDEX idx_call_guides_song ON call_guides(song_id);
CREATE INDEX idx_call_guides_status ON call_guides(status);
CREATE INDEX idx_call_guides_published ON call_guides(status) WHERE status = 'published';

COMMENT ON TABLE call_guides IS '콜가이드 (곡별 호응법)';
COMMENT ON COLUMN call_guides.status IS '상태: draft(초안), published(공개), verified(검증됨)';
COMMENT ON COLUMN call_guides.contributors IS '기여자 UUID 목록';

-- =============================================
-- CALL_GUIDE_ENTRIES - 콜가이드 항목
-- =============================================
CREATE TABLE call_guide_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_guide_id UUID NOT NULL REFERENCES call_guides(id) ON DELETE CASCADE,

    start_time DECIMAL(8, 2) NOT NULL,  -- 시작 시간 (초, 소수점 허용)
    end_time DECIMAL(8, 2),

    type TEXT NOT NULL CHECK (type IN ('lyrics', 'sing', 'action', 'jump', 'clap', 'light', 'etc')),

    text TEXT NOT NULL,
    text_romanized TEXT,
    text_original TEXT,
    instruction TEXT,
    intensity INTEGER CHECK (intensity >= 1 AND intensity <= 3),

    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_guide_entries_guide ON call_guide_entries(call_guide_id);
CREATE INDEX idx_call_guide_entries_time ON call_guide_entries(call_guide_id, start_time);

COMMENT ON TABLE call_guide_entries IS '콜가이드 항목 (타임라인별 가사/동작)';
COMMENT ON COLUMN call_guide_entries.type IS '타입: lyrics(가사), sing(따라부르기), action(동작), jump(점프), clap(박수), light(응원봉), etc(기타)';
COMMENT ON COLUMN call_guide_entries.intensity IS '강도: 1(약), 2(보통), 3(강)';

-- =============================================
-- CALL_GUIDE_VERSIONS - 콜가이드 버전 히스토리
-- =============================================
CREATE TABLE call_guide_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_guide_id UUID NOT NULL REFERENCES call_guides(id) ON DELETE CASCADE,

    version INTEGER NOT NULL,
    entries JSONB NOT NULL,           -- 버전별 엔트리 스냅샷

    edited_by UUID NOT NULL REFERENCES users(id),
    change_description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_guide_versions_guide ON call_guide_versions(call_guide_id);
CREATE INDEX idx_call_guide_versions_version ON call_guide_versions(call_guide_id, version DESC);

COMMENT ON TABLE call_guide_versions IS '콜가이드 버전 히스토리 (롤백용)';

-- =============================================
-- CALL_GUIDE_REACTIONS - 콜가이드 반응 (도움됨)
-- =============================================
CREATE TABLE call_guide_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_guide_id UUID NOT NULL REFERENCES call_guides(id) ON DELETE CASCADE,

    reaction_type TEXT DEFAULT 'helpful' CHECK (reaction_type IN ('helpful')),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, call_guide_id)
);

CREATE INDEX idx_call_guide_reactions_guide ON call_guide_reactions(call_guide_id);

COMMENT ON TABLE call_guide_reactions IS '콜가이드 반응 (도움됨)';

-- =============================================
-- TRIGGERS
-- =============================================

-- call_guides 생성/삭제 시 songs.has_call_guide 업데이트
CREATE OR REPLACE FUNCTION update_song_has_call_guide()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE songs SET has_call_guide = TRUE WHERE id = NEW.song_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE songs SET has_call_guide = FALSE WHERE id = OLD.song_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_song_has_call_guide
    AFTER INSERT OR DELETE ON call_guides
    FOR EACH ROW EXECUTE FUNCTION update_song_has_call_guide();

-- call_guide_reactions 변경 시 call_guides.helpful_count 업데이트
CREATE OR REPLACE FUNCTION update_call_guide_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE call_guides SET helpful_count = helpful_count + 1 WHERE id = NEW.call_guide_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE call_guides SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = OLD.call_guide_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_call_guide_helpful_count
    AFTER INSERT OR DELETE ON call_guide_reactions
    FOR EACH ROW EXECUTE FUNCTION update_call_guide_helpful_count();

-- updated_at 트리거
CREATE TRIGGER update_call_guides_updated_at
    BEFORE UPDATE ON call_guides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
