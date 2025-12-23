-- =============================================
-- Migration: 00001_core_tables.sql
-- Description: Core entities - venues, artists, events, stages, slots
-- Phase: 1 (Read-only core data)
-- =============================================

-- =============================================
-- VENUES - 공연장/장소
-- =============================================
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    capacity INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장소명 검색용 인덱스
CREATE INDEX idx_venues_name ON venues USING gin(to_tsvector('korean', name));

COMMENT ON TABLE venues IS '공연장/장소 정보';
COMMENT ON COLUMN venues.lat IS '위도';
COMMENT ON COLUMN venues.lng IS '경도';
COMMENT ON COLUMN venues.capacity IS '수용 인원';

-- =============================================
-- ARTISTS - 아티스트
-- =============================================
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image_url TEXT,
    genre TEXT,
    fanchant TEXT,                    -- 응원법
    lightstick_color TEXT,            -- 응원봉 색상
    popular_songs TEXT[],             -- 대표곡 배열
    social_links JSONB,               -- [{type, url}, ...]

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artists_name ON artists USING gin(to_tsvector('korean', name));
CREATE INDEX idx_artists_genre ON artists(genre);

COMMENT ON TABLE artists IS '아티스트 정보';
COMMENT ON COLUMN artists.fanchant IS '응원법/팬덤 문화';
COMMENT ON COLUMN artists.lightstick_color IS '응원봉 색상';
COMMENT ON COLUMN artists.social_links IS 'SNS 링크 [{type: "instagram"|"youtube"|..., url: "..."}]';

-- =============================================
-- EVENTS - 행사
-- =============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,

    -- 일정
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,               -- 종료 시간 미정 가능
    timezone TEXT DEFAULT 'Asia/Seoul',

    -- 장소
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,

    -- 분류
    type TEXT NOT NULL CHECK (type IN ('concert', 'festival', 'musical', 'exhibition')),
    status TEXT NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'CHANGED', 'POSTPONED', 'CANCELED')),

    -- 허브 모드 (운영자 override)
    override_mode TEXT DEFAULT 'AUTO' CHECK (override_mode IN ('AUTO', 'LIVE', 'RECAP')),

    -- 상세 정보
    poster_url TEXT,
    price TEXT,
    description TEXT,
    age_restriction TEXT,

    -- 예매 링크 (JSONB 배열)
    ticket_links JSONB DEFAULT '[]'::jsonb,

    -- 타임테이블 설정
    timetable_type TEXT CHECK (timetable_type IN ('linear', 'grid')),

    -- UI 배지
    badges TEXT[] DEFAULT '{}',

    -- 통계 (denormalized, 트리거로 업데이트)
    wishlist_count INTEGER DEFAULT 0,
    attended_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_events_title ON events USING gin(to_tsvector('korean', title));
CREATE INDEX idx_events_type_date ON events(type, start_at);

COMMENT ON TABLE events IS '행사 정보 - 최상위 엔터티';
COMMENT ON COLUMN events.override_mode IS '허브 모드 강제 설정 (AUTO: 자동, LIVE: 강제 LIVE, RECAP: 강제 RECAP)';
COMMENT ON COLUMN events.timetable_type IS '타임테이블 뷰 타입 (linear: 단독공연, grid: 페스티벌)';
COMMENT ON COLUMN events.ticket_links IS '예매처 링크 [{name, url, logo?}]';

-- =============================================
-- STAGES - 페스티벌 스테이지
-- =============================================
CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    color TEXT,                       -- 스테이지 구분 색상

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stages_event ON stages(event_id);

COMMENT ON TABLE stages IS '페스티벌 스테이지 정보';
COMMENT ON COLUMN stages.display_order IS '표시 순서';
COMMENT ON COLUMN stages.color IS '스테이지 구분 색상 (예: #EF4444)';

-- =============================================
-- EVENT_ARTISTS - 행사-아티스트 연결
-- =============================================
CREATE TABLE event_artists (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,

    PRIMARY KEY (event_id, artist_id)
);

CREATE INDEX idx_event_artists_artist ON event_artists(artist_id);

COMMENT ON TABLE event_artists IS '행사-아티스트 다대다 연결 테이블';

-- =============================================
-- SLOTS - 타임테이블 슬롯 (페스티벌용)
-- =============================================
CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,

    title TEXT,                       -- 아티스트가 아닌 경우 (예: "티켓 박스 오픈")
    day INTEGER,                      -- 다일 행사의 경우 몇일차인지 (1, 2, 3...)
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slots_event ON slots(event_id);
CREATE INDEX idx_slots_start ON slots(start_at);
CREATE INDEX idx_slots_artist ON slots(artist_id);
CREATE INDEX idx_slots_event_day ON slots(event_id, day);

COMMENT ON TABLE slots IS '타임테이블 슬롯 (페스티벌용 아티스트 공연 시간)';
COMMENT ON COLUMN slots.day IS '다일 행사의 경우 몇일차인지 (1, 2, 3...)';
COMMENT ON COLUMN slots.title IS '아티스트가 아닌 슬롯의 제목 (예: "티켓 박스 오픈")';

-- =============================================
-- OPERATIONAL_SLOTS - 운영 일정 (단독 공연용)
-- =============================================
CREATE TABLE operational_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    type TEXT NOT NULL CHECK (type IN (
        'md_sale', 'ticket_pickup', 'locker_open', 'queue_start',
        'standing_entry', 'seated_entry', 'show_start', 'show_end',
        'intermission', 'shuttle', 'photo_time', 'encore', 'custom'
    )),
    title TEXT,                       -- 커스텀 제목 (type=custom일 때)
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    location TEXT,                    -- 위치 (예: "1층 로비")
    description TEXT,
    is_highlight BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_operational_slots_event ON operational_slots(event_id);
CREATE INDEX idx_operational_slots_start ON operational_slots(start_at);

COMMENT ON TABLE operational_slots IS '운영 일정 (단독 공연용 타임라인)';
COMMENT ON COLUMN operational_slots.type IS '슬롯 타입: md_sale(MD판매), ticket_pickup(티켓수령), show_start(공연시작) 등';
COMMENT ON COLUMN operational_slots.is_highlight IS '중요 표시 (공연 시작 등)';

-- =============================================
-- UPDATED_AT 트리거 함수
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artists_updated_at
    BEFORE UPDATE ON artists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
