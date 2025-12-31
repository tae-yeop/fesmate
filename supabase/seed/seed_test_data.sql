-- =============================================
-- Seed Data for Testing Supabase Integration
--
-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor
-- 2. 이 파일 내용을 복사하여 실행
--
-- 주의: 실제 사용자의 UUID를 YOUR_USER_ID에 대체해야 합니다.
-- Google 로그인 후 콘솔에서 확인: console.log(supabase.auth.getUser())
-- =============================================

-- =============================================
-- STEP 1: 사용자 ID 설정 (필수!)
-- 아래 YOUR_USER_ID를 실제 로그인한 사용자의 UUID로 교체하세요
-- =============================================
DO $$
DECLARE
    test_user_id UUID := 'ba746f29-d642-4f0c-8efa-fcb60fe3d657';
    venue_id UUID;
    event_id UUID;
    crew_id UUID;
    post_id UUID;
BEGIN
    -- 사용자 ID 검증 (이미 설정됨)
    RAISE NOTICE 'Using user ID: %', test_user_id;

    -- =============================================
    -- STEP 2: 테스트 장소 생성
    -- =============================================
    INSERT INTO venues (id, name, address, lat, lng, capacity)
    VALUES (
        gen_random_uuid(),
        '올림픽공원',
        '서울 송파구 올림픽로 424',
        37.5209,
        127.1212,
        30000
    )
    RETURNING id INTO venue_id;

    RAISE NOTICE 'Created venue: %', venue_id;

    -- =============================================
    -- STEP 3: 테스트 이벤트 생성
    -- =============================================
    INSERT INTO events (
        id, title, description, venue_id, type,
        start_at, end_at, timezone, status
    )
    VALUES (
        gen_random_uuid(),
        '서울 재즈 페스티벌 2025',
        '대한민국 최대 재즈 페스티벌',
        venue_id,
        'festival',
        NOW() + INTERVAL '7 days',
        NOW() + INTERVAL '9 days',
        'Asia/Seoul',
        'SCHEDULED'
    )
    RETURNING id INTO event_id;

    RAISE NOTICE 'Created event: %', event_id;

    -- =============================================
    -- STEP 4: 테스트 크루 생성
    -- =============================================
    INSERT INTO crews (
        id, name, description, region, genre,
        is_public, join_type, max_members,
        logo_emoji, created_by
    )
    VALUES (
        gen_random_uuid(),
        '재즈 러버스',
        '재즈 페스티벌과 클럽 공연을 함께 다니는 크루입니다 🎷',
        '서울',
        'jazz',
        TRUE,
        'open',
        20,
        '🎷',
        test_user_id
    )
    RETURNING id INTO crew_id;

    RAISE NOTICE 'Created crew: %', crew_id;

    -- 크루 생성자를 리더로 추가
    INSERT INTO crew_members (crew_id, user_id, role)
    VALUES (crew_id, test_user_id, 'leader');

    RAISE NOTICE 'Added user as crew leader';

    -- 크루 공지 추가
    INSERT INTO crew_announcements (crew_id, author_id, content, is_pinned)
    VALUES (
        crew_id,
        test_user_id,
        '🎉 크루에 오신 것을 환영합니다! 서울 재즈 페스티벌 같이 가실 분 모집 중이에요.',
        TRUE
    );

    -- 크루 이벤트 추가
    INSERT INTO crew_events (crew_id, event_id, added_by)
    VALUES (crew_id, event_id, test_user_id);

    -- =============================================
    -- STEP 5: 테스트 글(Post) 생성
    -- =============================================

    -- 동행 글
    INSERT INTO posts (
        id, user_id, event_id, type, content, status, max_people
    )
    VALUES (
        gen_random_uuid(),
        test_user_id,
        event_id,
        'companion',
        '서울 재즈 페스티벌 같이 가실 분! 7월에 같이 갈 동행 구합니다. 저는 20대 중반이고, 재즈 좋아해요!',
        'ACTIVE',
        4
    )
    RETURNING id INTO post_id;

    RAISE NOTICE 'Created companion post: %', post_id;

    -- 택시팟 글
    INSERT INTO posts (
        id, user_id, event_id, type, content, status, max_people, depart_at, place_text
    )
    VALUES (
        gen_random_uuid(),
        test_user_id,
        event_id,
        'taxi',
        '공연 끝나고 강남역 방향 택시팟 구합니다! 23시쯤 출발 예정',
        'ACTIVE',
        4,
        NOW() + INTERVAL '7 days' + INTERVAL '5 hours',
        '올림픽공원 정문'
    );

    -- 밥약 글
    INSERT INTO posts (
        id, user_id, event_id, type, content, status, max_people, meet_at, place_text
    )
    VALUES (
        gen_random_uuid(),
        test_user_id,
        event_id,
        'meal',
        '공연 시작 2시간 전에 올림픽공원 근처에서 저녁 같이 드실 분 구해요!',
        'ACTIVE',
        6,
        NOW() + INTERVAL '7 days' - INTERVAL '2 hours',
        '올림픽공원역 9번 출구'
    );

    RAISE NOTICE 'Created posts successfully';

    -- =============================================
    -- STEP 6: 추가 공개 크루 생성 (목록 테스트용)
    -- =============================================
    INSERT INTO crews (name, description, region, genre, is_public, join_type, max_members, logo_emoji, created_by)
    VALUES
        ('록페스 패밀리', '록 페스티벌 같이 다니는 크루 🎸', '전국', 'rock', TRUE, 'approval', 30, '🎸', test_user_id),
        ('인디씬 크루', '홍대 인디 공연 위주로 활동합니다', '서울', 'indie', TRUE, 'open', 15, '🎤', test_user_id),
        ('K-POP 투어러스', 'K-POP 콘서트 전국투어!', '전국', 'kpop', TRUE, 'approval', 50, '💜', test_user_id);

    RAISE NOTICE 'Created additional crews';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Seed data created successfully!';
    RAISE NOTICE 'Event ID: %', event_id;
    RAISE NOTICE 'Main Crew ID: %', crew_id;
    RAISE NOTICE '==========================================';

END $$;
