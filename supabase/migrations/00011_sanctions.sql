-- 제재 시스템 테이블
-- 경고, 정지, 영구 차단 관리

-- 제재 기록 테이블
CREATE TABLE IF NOT EXISTS sanctions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 제재 유형: warning(경고), suspension(정지), ban(영구차단)
    type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'suspension', 'ban')),

    -- 제재 사유
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'multiple_reports',
        'spam',
        'harassment',
        'inappropriate_content',
        'scam',
        'impersonation',
        'other'
    )),

    -- 상세 설명
    description TEXT,

    -- 관련 신고 ID 목록 (JSON 배열)
    related_report_ids UUID[] DEFAULT '{}',

    -- 만료 시간 (정지의 경우)
    expires_at TIMESTAMP WITH TIME ZONE,

    -- 생성자 (SYSTEM 또는 관리자 UUID)
    created_by TEXT NOT NULL DEFAULT 'SYSTEM',

    -- 활성 상태
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- 해제 정보
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT,

    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_sanctions_user_id ON sanctions(user_id);
CREATE INDEX idx_sanctions_type ON sanctions(type);
CREATE INDEX idx_sanctions_is_active ON sanctions(is_active);
CREATE INDEX idx_sanctions_created_at ON sanctions(created_at);

-- 사용자별 활성 제재 조회 뷰
CREATE OR REPLACE VIEW active_sanctions AS
SELECT
    s.*,
    CASE
        WHEN s.type = 'ban' THEN true
        WHEN s.type = 'suspension' AND (s.expires_at IS NULL OR s.expires_at > NOW()) THEN true
        ELSE false
    END as is_currently_active
FROM sanctions s
WHERE s.is_active = true;

-- 사용자 제재 상태 조회 함수
CREATE OR REPLACE FUNCTION get_user_sanction_status(p_user_id UUID)
RETURNS TABLE (
    active_warnings INT,
    total_warnings INT,
    active_suspension_id UUID,
    suspension_expires_at TIMESTAMP WITH TIME ZONE,
    total_suspensions INT,
    is_banned BOOLEAN,
    can_post BOOLEAN,
    can_comment BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT
            COUNT(*) FILTER (WHERE type = 'warning' AND is_active = true) as active_warnings,
            COUNT(*) FILTER (WHERE type = 'warning') as total_warnings,
            COUNT(*) FILTER (WHERE type = 'suspension') as total_suspensions,
            BOOL_OR(type = 'ban' AND is_active = true) as is_banned
        FROM sanctions
        WHERE user_id = p_user_id
    ),
    active_suspension AS (
        SELECT id, expires_at
        FROM sanctions
        WHERE user_id = p_user_id
          AND type = 'suspension'
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1
    )
    SELECT
        stats.active_warnings::INT,
        stats.total_warnings::INT,
        active_suspension.id,
        active_suspension.expires_at,
        stats.total_suspensions::INT,
        COALESCE(stats.is_banned, false),
        NOT (COALESCE(stats.is_banned, false) OR active_suspension.id IS NOT NULL),
        NOT (COALESCE(stats.is_banned, false) OR active_suspension.id IS NOT NULL)
    FROM stats
    LEFT JOIN active_suspension ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 자동 경고 트리거 함수 (신고 누적 시)
CREATE OR REPLACE FUNCTION check_auto_warning()
RETURNS TRIGGER AS $$
DECLARE
    report_count INT;
    warning_count INT;
    suspension_count INT;
BEGIN
    -- 대상 사용자의 최근 신고 수 체크 (처리되지 않은 신고)
    SELECT COUNT(*)
    INTO report_count
    FROM reports
    WHERE target_user_id = NEW.target_user_id
      AND status = 'PENDING'
      AND created_at > NOW() - INTERVAL '30 days';

    -- 3개 이상이면 자동 경고
    IF report_count >= 3 THEN
        -- 현재 경고 수 체크
        SELECT COUNT(*)
        INTO warning_count
        FROM sanctions
        WHERE user_id = NEW.target_user_id
          AND type = 'warning'
          AND is_active = true;

        -- 경고 추가
        INSERT INTO sanctions (user_id, type, reason, description, created_by)
        VALUES (
            NEW.target_user_id,
            'warning',
            'multiple_reports',
            '신고 ' || report_count || '회 누적으로 자동 경고',
            'SYSTEM'
        );

        -- 경고 3회면 자동 정지
        IF warning_count >= 2 THEN
            -- 기존 경고 비활성화
            UPDATE sanctions
            SET is_active = false, resolved_at = NOW(), resolved_by = 'SYSTEM'
            WHERE user_id = NEW.target_user_id
              AND type = 'warning'
              AND is_active = true;

            -- 정지 추가 (7일)
            INSERT INTO sanctions (user_id, type, reason, description, expires_at, created_by)
            VALUES (
                NEW.target_user_id,
                'suspension',
                'multiple_reports',
                '경고 3회 누적으로 자동 정지',
                NOW() + INTERVAL '7 days',
                'SYSTEM'
            );

            -- 정지 횟수 체크
            SELECT COUNT(*)
            INTO suspension_count
            FROM sanctions
            WHERE user_id = NEW.target_user_id
              AND type = 'suspension';

            -- 정지 3회면 영구 차단
            IF suspension_count >= 3 THEN
                -- 기존 제재 비활성화
                UPDATE sanctions
                SET is_active = false, resolved_at = NOW(), resolved_by = 'SYSTEM'
                WHERE user_id = NEW.target_user_id
                  AND is_active = true;

                -- 영구 차단
                INSERT INTO sanctions (user_id, type, reason, description, created_by)
                VALUES (
                    NEW.target_user_id,
                    'ban',
                    'multiple_reports',
                    '정지 3회 누적으로 영구 차단',
                    'SYSTEM'
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 신고 생성 시 자동 경고 체크 트리거
DROP TRIGGER IF EXISTS trg_check_auto_warning ON reports;
CREATE TRIGGER trg_check_auto_warning
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION check_auto_warning();

-- 정지 만료 자동 해제 함수 (cron으로 실행)
CREATE OR REPLACE FUNCTION expire_suspensions()
RETURNS void AS $$
BEGIN
    UPDATE sanctions
    SET is_active = false, resolved_at = NOW(), resolved_by = 'SYSTEM'
    WHERE type = 'suspension'
      AND is_active = true
      AND expires_at IS NOT NULL
      AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 정책
ALTER TABLE sanctions ENABLE ROW LEVEL SECURITY;

-- 자신의 제재 기록 조회 허용
CREATE POLICY "Users can view own sanctions"
    ON sanctions FOR SELECT
    USING (auth.uid() = user_id);

-- 관리자만 제재 생성/수정/삭제 가능 (서비스 역할 키 사용)

-- updated_at 자동 업데이트
CREATE TRIGGER update_sanctions_updated_at
    BEFORE UPDATE ON sanctions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
