/**
 * Follows Query Functions
 *
 * 팔로우 관계 Supabase 쿼리
 */

import { createClient } from "../client";

export interface Follow {
    followerId: string;
    followingId: string;
    createdAt: Date;
}

/**
 * 사용자의 팔로워 목록 조회 (나를 팔로우하는 사람들)
 */
export async function getFollowers(userId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);

    if (error) {
        console.error("[getFollowers] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.follower_id);
}

/**
 * 사용자가 팔로우하는 목록 조회 (내가 팔로우하는 사람들)
 */
export async function getFollowing(userId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

    if (error) {
        console.error("[getFollowing] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.following_id);
}

/**
 * 모든 팔로우 관계 조회 (특정 사용자 관련)
 */
export async function getAllFollows(userId: string): Promise<Follow[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("follows")
        .select("*")
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

    if (error) {
        console.error("[getAllFollows] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        followerId: row.follower_id,
        followingId: row.following_id,
        createdAt: new Date(row.created_at),
    }));
}

/**
 * 팔로우 여부 확인
 */
export async function isFollowing(
    followerId: string,
    followingId: string
): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
        .single();

    if (error && error.code !== "PGRST116") {
        // PGRST116: no rows returned
        console.error("[isFollowing] Error:", error);
        throw error;
    }

    return !!data;
}

/**
 * 팔로우
 */
export async function followUser(
    followerId: string,
    followingId: string
): Promise<void> {
    if (followerId === followingId) {
        throw new Error("Cannot follow yourself");
    }

    const supabase = createClient();

    const { error } = await supabase.from("follows").insert({
        follower_id: followerId,
        following_id: followingId,
    });

    if (error) {
        // 이미 팔로우 중인 경우 무시
        if (error.code === "23505") {
            // unique violation
            return;
        }
        console.error("[followUser] Error:", error);
        throw error;
    }
}

/**
 * 언팔로우
 */
export async function unfollowUser(
    followerId: string,
    followingId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId);

    if (error) {
        console.error("[unfollowUser] Error:", error);
        throw error;
    }
}

/**
 * 맞팔 여부 확인
 */
export async function isMutualFollow(
    userId1: string,
    userId2: string
): Promise<boolean> {
    const supabase = createClient();

    // userId1 -> userId2 팔로우 확인
    const { data: follow1 } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", userId1)
        .eq("following_id", userId2)
        .single();

    if (!follow1) return false;

    // userId2 -> userId1 팔로우 확인
    const { data: follow2 } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", userId2)
        .eq("following_id", userId1)
        .single();

    return !!follow2;
}

/**
 * 팔로우 카운트 조회
 */
export async function getFollowCounts(
    userId: string
): Promise<{ followers: number; following: number }> {
    const supabase = createClient();

    // users 테이블에서 카운트 조회 (트리거로 자동 업데이트됨)
    const { data, error } = await supabase
        .from("users")
        .select("follower_count, following_count")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("[getFollowCounts] Error:", error);
        // 에러 시 직접 카운트
        const followers = await getFollowers(userId);
        const following = await getFollowing(userId);
        return { followers: followers.length, following: following.length };
    }

    return {
        followers: data?.follower_count ?? 0,
        following: data?.following_count ?? 0,
    };
}
