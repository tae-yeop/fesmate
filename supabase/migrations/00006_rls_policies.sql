-- =============================================
-- Migration: 00006_rls_policies.sql
-- Description: Row Level Security policies for all tables
-- Phase: All (Security layer)
-- =============================================

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- 관리자 체크 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 차단 체크 함수 (내가 차단한 사용자인지)
CREATE OR REPLACE FUNCTION is_blocked(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = auth.uid()
        AND blocked_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 크루 멤버 체크 함수
CREATE OR REPLACE FUNCTION is_crew_member(target_crew_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM crew_members
        WHERE crew_id = target_crew_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 크루 리더 체크 함수
CREATE OR REPLACE FUNCTION is_crew_leader(target_crew_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM crew_members
        WHERE crew_id = target_crew_id
        AND user_id = auth.uid()
        AND role = 'leader'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CORE TABLES - Read-only for regular users
-- =============================================

-- venues: 모두 읽기 가능, 관리자만 수정
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are viewable by everyone"
    ON venues FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert venues"
    ON venues FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update venues"
    ON venues FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete venues"
    ON venues FOR DELETE
    USING (is_admin());

-- artists: 모두 읽기 가능, 관리자만 수정
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists are viewable by everyone"
    ON artists FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert artists"
    ON artists FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update artists"
    ON artists FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete artists"
    ON artists FOR DELETE
    USING (is_admin());

-- events: 모두 읽기 가능, 관리자만 수정
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by everyone"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert events"
    ON events FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update events"
    ON events FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete events"
    ON events FOR DELETE
    USING (is_admin());

-- stages: 모두 읽기 가능, 관리자만 수정
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stages are viewable by everyone"
    ON stages FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert stages"
    ON stages FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update stages"
    ON stages FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete stages"
    ON stages FOR DELETE
    USING (is_admin());

-- event_artists: 모두 읽기 가능, 관리자만 수정
ALTER TABLE event_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event artists are viewable by everyone"
    ON event_artists FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert event artists"
    ON event_artists FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete event artists"
    ON event_artists FOR DELETE
    USING (is_admin());

-- slots: 모두 읽기 가능, 관리자만 수정
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slots are viewable by everyone"
    ON slots FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert slots"
    ON slots FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update slots"
    ON slots FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete slots"
    ON slots FOR DELETE
    USING (is_admin());

-- operational_slots: 모두 읽기 가능, 관리자만 수정
ALTER TABLE operational_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operational slots are viewable by everyone"
    ON operational_slots FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert operational slots"
    ON operational_slots FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update operational slots"
    ON operational_slots FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete operational slots"
    ON operational_slots FOR DELETE
    USING (is_admin());

-- =============================================
-- USER TABLES
-- =============================================

-- users: 모두 읽기 가능, 본인만 수정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User profiles are viewable by everyone"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- users 삭제는 auth.users 삭제 시 CASCADE

-- user_events: 본인만 전체 접근 (찜 목록은 프라이버시 설정에 따라)
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
    ON user_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own events"
    ON user_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
    ON user_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
    ON user_events FOR DELETE
    USING (auth.uid() = user_id);

-- 다른 사용자의 공개된 찜/다녀옴 조회 (프라이버시 설정 기반)
CREATE POLICY "View public wishlists"
    ON user_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = user_events.user_id
            AND (
                (is_wishlist = TRUE AND u.privacy_settings->>'wishlist' = 'public')
                OR (is_attended = TRUE AND u.privacy_settings->>'attended' = 'public')
            )
        )
    );

-- user_slot_marks: 본인만 전체 접근
ALTER TABLE user_slot_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own slot marks"
    ON user_slot_marks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own slot marks"
    ON user_slot_marks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slot marks"
    ON user_slot_marks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own slot marks"
    ON user_slot_marks FOR DELETE
    USING (auth.uid() = user_id);

-- custom_events: 본인만 전체 접근
ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom events"
    ON custom_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own custom events"
    ON custom_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom events"
    ON custom_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom events"
    ON custom_events FOR DELETE
    USING (auth.uid() = user_id);

-- follows: 모두 읽기 가능, 본인만 팔로우 관리
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
    ON follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON follows FOR DELETE
    USING (auth.uid() = follower_id);

-- blocks: 본인만 전체 접근
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks"
    ON blocks FOR SELECT
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
    ON blocks FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
    ON blocks FOR DELETE
    USING (auth.uid() = blocker_id);

-- user_badges: 모두 읽기 가능 (시스템에서 부여)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone"
    ON user_badges FOR SELECT
    USING (true);

-- 배지는 시스템에서 부여하므로 service_role로만 INSERT/DELETE

-- =============================================
-- CONTENT TABLES
-- =============================================

-- posts: 차단된 사용자 글 제외하고 읽기, 본인만 쓰기/수정
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable except blocked users"
    ON posts FOR SELECT
    USING (NOT is_blocked(user_id));

CREATE POLICY "Authenticated users can create posts"
    ON posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own posts"
    ON posts FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- post_images: 글에 연결된 이미지 접근 정책
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post images follow post visibility"
    ON post_images FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_images.post_id
            AND NOT is_blocked(p.user_id)
        )
    );

CREATE POLICY "Users can add images to own posts"
    ON post_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own post images"
    ON post_images FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id
            AND p.user_id = auth.uid()
        )
    );

-- post_reactions: 모두 읽기, 본인만 반응 관리
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions are viewable by everyone"
    ON post_reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can add reactions"
    ON post_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
    ON post_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- comments: 차단된 사용자 제외 읽기, 본인만 작성/수정
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable except blocked users"
    ON comments FOR SELECT
    USING (NOT is_blocked(user_id));

CREATE POLICY "Authenticated users can create comments"
    ON comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON comments FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- notifications: 본인 알림만 접근
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- notifications INSERT는 시스템에서 (service_role)

-- reports: 본인 신고만 읽기, 관리자는 전체 접근
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    USING (auth.uid() = reporter_id OR is_admin());

CREATE POLICY "Authenticated users can create reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Only admins can update reports"
    ON reports FOR UPDATE
    USING (is_admin());

-- =============================================
-- SOCIAL TABLES (CREWS)
-- =============================================

-- crews: 공개 크루는 모두 읽기, 비공개는 멤버만
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public crews are viewable by everyone"
    ON crews FOR SELECT
    USING (is_public = TRUE OR is_crew_member(id));

CREATE POLICY "Authenticated users can create crews"
    ON crews FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only crew leaders can update crew"
    ON crews FOR UPDATE
    USING (is_crew_leader(id) OR is_admin());

CREATE POLICY "Only crew leaders can delete crew"
    ON crews FOR DELETE
    USING (is_crew_leader(id) OR is_admin());

-- crew_members: 크루 공개 여부에 따라 읽기
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crew members visible based on crew visibility"
    ON crew_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crews c
            WHERE c.id = crew_members.crew_id
            AND (c.is_public = TRUE OR is_crew_member(c.id))
        )
    );

-- 크루 가입은 join_type에 따라 (open이면 바로, approval이면 리더 승인 필요)
CREATE POLICY "Users can join open crews"
    ON crew_members FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM crews c
            WHERE c.id = crew_id
            AND (
                c.join_type = 'open'
                OR c.created_by = auth.uid()  -- 생성자가 자신을 리더로 추가
            )
        )
    );

-- 리더가 멤버 추가 (승인)
CREATE POLICY "Leaders can add members"
    ON crew_members FOR INSERT
    WITH CHECK (is_crew_leader(crew_id));

-- 본인 탈퇴 또는 리더가 강퇴
CREATE POLICY "Users can leave or leaders can kick"
    ON crew_members FOR DELETE
    USING (
        auth.uid() = user_id
        OR is_crew_leader(crew_id)
    );

-- crew_events: 멤버만 읽기/쓰기
ALTER TABLE crew_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crew events visible to members"
    ON crew_events FOR SELECT
    USING (is_crew_member(crew_id));

CREATE POLICY "Members can add crew events"
    ON crew_events FOR INSERT
    WITH CHECK (
        is_crew_member(crew_id)
        AND auth.uid() = added_by
    );

CREATE POLICY "Members can remove crew events"
    ON crew_events FOR DELETE
    USING (
        auth.uid() = added_by
        OR is_crew_leader(crew_id)
    );

-- crew_join_requests: 관련자만 접근
ALTER TABLE crew_join_requests ENABLE ROW LEVEL SECURITY;

-- 본인 신청 또는 크루 리더만 조회
CREATE POLICY "View own requests or as crew leader"
    ON crew_join_requests FOR SELECT
    USING (
        auth.uid() = user_id
        OR is_crew_leader(crew_id)
    );

CREATE POLICY "Users can request to join"
    ON crew_join_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can process requests"
    ON crew_join_requests FOR UPDATE
    USING (is_crew_leader(crew_id));

CREATE POLICY "Users can cancel own request"
    ON crew_join_requests FOR DELETE
    USING (auth.uid() = user_id);

-- crew_announcements: 멤버만 읽기, 리더만 쓰기
ALTER TABLE crew_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crew announcements visible to members"
    ON crew_announcements FOR SELECT
    USING (is_crew_member(crew_id));

CREATE POLICY "Only leaders can create announcements"
    ON crew_announcements FOR INSERT
    WITH CHECK (is_crew_leader(crew_id) AND auth.uid() = author_id);

CREATE POLICY "Only leaders can update announcements"
    ON crew_announcements FOR UPDATE
    USING (is_crew_leader(crew_id));

CREATE POLICY "Only leaders can delete announcements"
    ON crew_announcements FOR DELETE
    USING (is_crew_leader(crew_id));

-- =============================================
-- SOCIAL TABLES (PARTICIPATION)
-- =============================================

-- participation_requests: 관련자만 접근
ALTER TABLE participation_requests ENABLE ROW LEVEL SECURITY;

-- 신청자 또는 글 작성자만 조회
CREATE POLICY "View own participation requests"
    ON participation_requests FOR SELECT
    USING (
        auth.uid() = applicant_id
        OR auth.uid() = post_author_id
    );

CREATE POLICY "Authenticated users can create requests"
    ON participation_requests FOR INSERT
    WITH CHECK (auth.uid() = applicant_id);

-- 글 작성자만 상태 변경 (수락/거절)
CREATE POLICY "Post authors can respond to requests"
    ON participation_requests FOR UPDATE
    USING (auth.uid() = post_author_id);

-- 신청자는 취소 가능
CREATE POLICY "Applicants can cancel requests"
    ON participation_requests FOR DELETE
    USING (auth.uid() = applicant_id);

-- =============================================
-- GUIDE TABLES (CALL GUIDES)
-- =============================================

-- songs: 모두 읽기, 관리자만 관리
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Songs are viewable by everyone"
    ON songs FOR SELECT
    USING (true);

CREATE POLICY "Only admins can manage songs"
    ON songs FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Only admins can update songs"
    ON songs FOR UPDATE
    USING (is_admin());

CREATE POLICY "Only admins can delete songs"
    ON songs FOR DELETE
    USING (is_admin());

-- call_guides: 공개된 가이드는 모두 읽기, 작성자/관리자만 수정
ALTER TABLE call_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published call guides are viewable"
    ON call_guides FOR SELECT
    USING (
        status IN ('published', 'verified')
        OR auth.uid() = created_by
        OR is_admin()
    );

CREATE POLICY "Authenticated users can create call guides"
    ON call_guides FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can update own call guides"
    ON call_guides FOR UPDATE
    USING (auth.uid() = created_by OR is_admin());

CREATE POLICY "Authors can delete own call guides"
    ON call_guides FOR DELETE
    USING (auth.uid() = created_by OR is_admin());

-- call_guide_entries: 가이드 접근 권한 따라감
ALTER TABLE call_guide_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entries follow call guide visibility"
    ON call_guide_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_entries.call_guide_id
            AND (
                cg.status IN ('published', 'verified')
                OR cg.created_by = auth.uid()
                OR is_admin()
            )
        )
    );

CREATE POLICY "Authors can manage own call guide entries"
    ON call_guide_entries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_id
            AND (cg.created_by = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Authors can update own call guide entries"
    ON call_guide_entries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_id
            AND (cg.created_by = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "Authors can delete own call guide entries"
    ON call_guide_entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_id
            AND (cg.created_by = auth.uid() OR is_admin())
        )
    );

-- call_guide_versions: 가이드 접근 권한 따라감
ALTER TABLE call_guide_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Versions follow call guide visibility"
    ON call_guide_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM call_guides cg
            WHERE cg.id = call_guide_versions.call_guide_id
            AND (
                cg.status IN ('published', 'verified')
                OR cg.created_by = auth.uid()
                OR is_admin()
            )
        )
    );

-- versions INSERT는 시스템에서 (트리거 또는 service_role)

-- call_guide_reactions: 모두 읽기, 본인만 반응 관리
ALTER TABLE call_guide_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call guide reactions are viewable"
    ON call_guide_reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can add call guide reactions"
    ON call_guide_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
    ON call_guide_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- GRANTS for anon and authenticated roles
-- =============================================

-- anon: 읽기 전용 (공개 데이터만)
GRANT SELECT ON venues TO anon;
GRANT SELECT ON artists TO anon;
GRANT SELECT ON events TO anon;
GRANT SELECT ON stages TO anon;
GRANT SELECT ON event_artists TO anon;
GRANT SELECT ON slots TO anon;
GRANT SELECT ON operational_slots TO anon;
GRANT SELECT ON users TO anon;
GRANT SELECT ON crews TO anon;
GRANT SELECT ON songs TO anon;
GRANT SELECT ON call_guides TO anon;
GRANT SELECT ON call_guide_entries TO anon;

-- authenticated: 전체 CRUD (RLS에서 제어)
GRANT ALL ON venues TO authenticated;
GRANT ALL ON artists TO authenticated;
GRANT ALL ON events TO authenticated;
GRANT ALL ON stages TO authenticated;
GRANT ALL ON event_artists TO authenticated;
GRANT ALL ON slots TO authenticated;
GRANT ALL ON operational_slots TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON user_events TO authenticated;
GRANT ALL ON user_slot_marks TO authenticated;
GRANT ALL ON custom_events TO authenticated;
GRANT ALL ON follows TO authenticated;
GRANT ALL ON blocks TO authenticated;
GRANT ALL ON user_badges TO authenticated;
GRANT ALL ON posts TO authenticated;
GRANT ALL ON post_images TO authenticated;
GRANT ALL ON post_reactions TO authenticated;
GRANT ALL ON comments TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON reports TO authenticated;
GRANT ALL ON crews TO authenticated;
GRANT ALL ON crew_members TO authenticated;
GRANT ALL ON crew_events TO authenticated;
GRANT ALL ON crew_join_requests TO authenticated;
GRANT ALL ON crew_announcements TO authenticated;
GRANT ALL ON participation_requests TO authenticated;
GRANT ALL ON songs TO authenticated;
GRANT ALL ON call_guides TO authenticated;
GRANT ALL ON call_guide_entries TO authenticated;
GRANT ALL ON call_guide_versions TO authenticated;
GRANT ALL ON call_guide_reactions TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION is_admin() IS '현재 사용자가 관리자인지 확인';
COMMENT ON FUNCTION is_blocked(UUID) IS '현재 사용자가 대상을 차단했는지 확인';
COMMENT ON FUNCTION is_crew_member(UUID) IS '현재 사용자가 크루 멤버인지 확인';
COMMENT ON FUNCTION is_crew_leader(UUID) IS '현재 사용자가 크루 리더인지 확인';
