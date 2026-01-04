-- =============================================
-- Migration: 00008_crawl_tables.sql
-- Description: 자동 크롤링 파이프라인을 위한 테이블 생성
-- =============================================

-- =============================================
-- 1. CRAWL_SOURCES - 크롤 대상 URL 관리
-- =============================================
CREATE TABLE crawl_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 소스 정보
    source_site TEXT NOT NULL CHECK (source_site IN (
        'yes24', 'interpark', 'melon', 'ticketlink', 'official', 'unknown'
    )),
    source_type TEXT NOT NULL CHECK (source_type IN (
        'list',      -- 목록 페이지 (카테고리/검색) - URL 발견용
        'detail'     -- 개별 상세 페이지 - 정보 추출용
    )),
    url TEXT NOT NULL,

    -- 목록 페이지 설정 (source_type='list'인 경우)
    list_config JSONB DEFAULT '{}'::jsonb,
    -- {
    --   "category": "concert",
    --   "linkPattern": "정규식 패턴",
    --   "maxPages": 5
    -- }

    -- 스케줄링
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,              -- 높을수록 우선
    crawl_interval_hours INTEGER DEFAULT 6,  -- 크롤 간격 (시간)
    last_crawled_at TIMESTAMPTZ,
    next_crawl_at TIMESTAMPTZ,

    -- 관리 정보
    name TEXT,                               -- 관리용 라벨 (예: "YES24 콘서트 목록")
    notes TEXT,

    -- 통계
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,  -- 연속 실패 횟수 (3회 시 비활성화)
    last_error TEXT,
    last_error_at TIMESTAMPTZ,

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_crawl_sources_next_crawl ON crawl_sources(next_crawl_at)
    WHERE is_active = TRUE;
CREATE INDEX idx_crawl_sources_site ON crawl_sources(source_site);
CREATE INDEX idx_crawl_sources_type ON crawl_sources(source_type);
CREATE UNIQUE INDEX idx_crawl_sources_url ON crawl_sources(url);

-- 코멘트
COMMENT ON TABLE crawl_sources IS '크롤링 대상 URL 관리 테이블';
COMMENT ON COLUMN crawl_sources.source_type IS 'list: 목록 페이지(URL 발견용), detail: 개별 상세 페이지';
COMMENT ON COLUMN crawl_sources.list_config IS '목록 페이지 크롤링 설정 (linkPattern, maxPages 등)';
COMMENT ON COLUMN crawl_sources.consecutive_failures IS '연속 실패 횟수 - 3회 초과 시 자동 비활성화';


-- =============================================
-- 2. RAW_SOURCE_ITEMS - 크롤링 원본 데이터 저장
-- =============================================
CREATE TABLE raw_source_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 소스 참조
    source_id UUID REFERENCES crawl_sources(id) ON DELETE SET NULL,
    source_site TEXT NOT NULL,
    source_url TEXT NOT NULL,

    -- 수집 결과
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    http_status INTEGER,
    content_type TEXT,
    content_hash TEXT,                       -- SHA256 해시 (변경 감지용)

    -- 추출 결과
    extraction_method TEXT CHECK (extraction_method IN (
        'json-ld', 'embedded-json', 'dom', 'headless', NULL
    )),
    raw_event JSONB,                         -- RawEvent 전체
    normalized_data JSONB,                   -- CreateEventInput (정규화 후)
    confidence TEXT CHECK (confidence IN ('high', 'medium', 'low', NULL)),
    warnings TEXT[],

    -- 처리 상태
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',       -- 처리 대기
        'processing',    -- 처리 중
        'processed',     -- 정상 처리됨
        'matched',       -- 기존 행사와 매칭됨
        'new',           -- 새 행사로 판단됨
        'failed',        -- 실패
        'skipped'        -- 건너뜀 (중복 등)
    )),

    -- 매칭 결과
    matched_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    similarity_score DECIMAL(3,2),           -- 0.00 ~ 1.00

    -- 에러 정보
    error_code TEXT,
    error_message TEXT,

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_raw_source_items_source ON raw_source_items(source_id);
CREATE INDEX idx_raw_source_items_status ON raw_source_items(status);
CREATE INDEX idx_raw_source_items_fetched ON raw_source_items(fetched_at DESC);
CREATE INDEX idx_raw_source_items_hash ON raw_source_items(content_hash);
CREATE INDEX idx_raw_source_items_url ON raw_source_items(source_url);
CREATE INDEX idx_raw_source_items_site ON raw_source_items(source_site);

-- 코멘트
COMMENT ON TABLE raw_source_items IS '크롤링 원본 데이터 저장 (추적성/재현성)';
COMMENT ON COLUMN raw_source_items.content_hash IS 'HTML 콘텐츠 SHA256 해시 - 변경 감지용';
COMMENT ON COLUMN raw_source_items.similarity_score IS '기존 행사와의 유사도 점수 (0.00 ~ 1.00)';


-- =============================================
-- 3. CHANGE_SUGGESTIONS - 변경 제안 (승인 워크플로우)
-- =============================================
CREATE TABLE change_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 원본 참조
    raw_item_id UUID REFERENCES raw_source_items(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    source_site TEXT NOT NULL,

    -- 제안 타입
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
        'new_event',     -- 새 행사 등록
        'update_event',  -- 기존 행사 수정
        'cancel_event'   -- 행사 취소 감지
    )),

    -- 대상 행사 (update/cancel인 경우)
    target_event_id UUID REFERENCES events(id) ON DELETE CASCADE,

    -- 제안 내용
    suggested_data JSONB NOT NULL,           -- CreateEventInput 형식
    diff_fields TEXT[],                      -- 변경된 필드 목록
    diff_detail JSONB,                       -- { field: { before, after } }

    -- 신뢰도
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    confidence_reasons TEXT[],               -- 신뢰도 판단 근거
    extraction_method TEXT,                  -- 추출 방법 (json-ld, dom 등)

    -- 승인 상태
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',        -- 검토 대기
        'auto_approved',  -- 자동 승인됨
        'approved',       -- 수동 승인됨
        'rejected',       -- 거절됨
        'applied'         -- 적용 완료
    )),
    requires_review BOOLEAN DEFAULT TRUE,

    -- 처리 정보
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- 적용 결과
    applied_at TIMESTAMPTZ,
    applied_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_change_suggestions_status ON change_suggestions(status);
CREATE INDEX idx_change_suggestions_type ON change_suggestions(suggestion_type);
CREATE INDEX idx_change_suggestions_confidence ON change_suggestions(confidence);
CREATE INDEX idx_change_suggestions_pending ON change_suggestions(created_at)
    WHERE status = 'pending';
CREATE INDEX idx_change_suggestions_target ON change_suggestions(target_event_id);
CREATE INDEX idx_change_suggestions_review ON change_suggestions(requires_review, status)
    WHERE requires_review = TRUE AND status = 'pending';

-- 코멘트
COMMENT ON TABLE change_suggestions IS '크롤링 결과 변경 제안 - 승인 워크플로우';
COMMENT ON COLUMN change_suggestions.requires_review IS 'TRUE: 수동 검토 필요, FALSE: 자동 승인 가능';
COMMENT ON COLUMN change_suggestions.diff_detail IS '변경 상세 - { field: { before: 이전값, after: 새값 } }';


-- =============================================
-- 4. CRAWL_RUNS - 크롤링 실행 기록 (모니터링)
-- =============================================
CREATE TABLE crawl_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 실행 정보
    source_id UUID REFERENCES crawl_sources(id) ON DELETE SET NULL,
    run_type TEXT NOT NULL CHECK (run_type IN (
        'scheduled',     -- 스케줄 실행
        'manual',        -- 수동 실행
        'retry'          -- 재시도
    )),

    -- 시간
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- 결과
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
        'running',
        'completed',
        'failed',
        'partial'        -- 일부 성공
    )),

    -- 통계
    urls_discovered INTEGER DEFAULT 0,       -- 발견된 URL 수
    urls_processed INTEGER DEFAULT 0,        -- 처리한 URL 수
    new_events INTEGER DEFAULT 0,            -- 새 행사 수
    updated_events INTEGER DEFAULT 0,        -- 업데이트 행사 수
    auto_approved INTEGER DEFAULT 0,         -- 자동 승인 수
    pending_review INTEGER DEFAULT 0,        -- 수동 검토 대기 수
    skipped INTEGER DEFAULT 0,               -- 건너뛴 수 (중복 등)
    errors INTEGER DEFAULT 0,

    -- 에러 정보
    error_message TEXT,
    error_details JSONB,

    -- 메타
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_crawl_runs_source ON crawl_runs(source_id);
CREATE INDEX idx_crawl_runs_started ON crawl_runs(started_at DESC);
CREATE INDEX idx_crawl_runs_status ON crawl_runs(status);
CREATE INDEX idx_crawl_runs_type ON crawl_runs(run_type);

-- 코멘트
COMMENT ON TABLE crawl_runs IS '크롤링 실행 기록 - 모니터링/디버깅용';


-- =============================================
-- 5. 트리거: updated_at 자동 갱신
-- =============================================
CREATE OR REPLACE FUNCTION update_crawl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crawl_sources_updated_at
    BEFORE UPDATE ON crawl_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_crawl_updated_at();

CREATE TRIGGER trigger_change_suggestions_updated_at
    BEFORE UPDATE ON change_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_crawl_updated_at();


-- =============================================
-- 6. RLS 정책 (Row Level Security)
-- =============================================

-- crawl_sources: Admin만 쓰기 가능
ALTER TABLE crawl_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crawl_sources_read_all" ON crawl_sources
    FOR SELECT USING (true);

CREATE POLICY "crawl_sources_write_admin" ON crawl_sources
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- raw_source_items: Admin만 접근 가능
ALTER TABLE raw_source_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raw_source_items_admin_only" ON raw_source_items
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- change_suggestions: Admin만 접근 가능
ALTER TABLE change_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_suggestions_admin_only" ON change_suggestions
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- crawl_runs: Admin만 접근 가능
ALTER TABLE crawl_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crawl_runs_admin_only" ON crawl_runs
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );


-- =============================================
-- 7. 초기 데이터: 기본 크롤 소스 (목록 페이지)
-- =============================================
INSERT INTO crawl_sources (source_site, source_type, url, name, list_config, crawl_interval_hours, next_crawl_at) VALUES
-- YES24 카테고리 페이지 (next_crawl_at을 현재 시간으로 설정하여 즉시 크롤링 가능)
('yes24', 'list', 'https://ticket.yes24.com/New/Genre/GenreList.aspx?genre=15456', 'YES24 콘서트 목록',
 '{"category": "concert", "linkPattern": "/Perf/\\\\d+", "maxPages": 5}'::jsonb, 6, NOW()),
('yes24', 'list', 'https://ticket.yes24.com/New/Genre/GenreList.aspx?genre=15457', 'YES24 뮤지컬/연극 목록',
 '{"category": "musical", "linkPattern": "/Perf/\\\\d+", "maxPages": 3}'::jsonb, 12, NOW()),
('yes24', 'list', 'https://ticket.yes24.com/New/Genre/GenreList.aspx?genre=15459', 'YES24 전시/행사 목록',
 '{"category": "exhibition", "linkPattern": "/Perf/\\\\d+", "maxPages": 3}'::jsonb, 24, NOW());

-- 인터파크 (CSR 제한으로 비활성화 상태)
-- 향후 Headless 크롤링 구현 시 활성화
