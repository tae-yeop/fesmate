/**
 * Badge Query Functions
 *
 * 배지 관련 쿼리
 */

import { createClient } from "../client";

// ===== Types =====

export interface UserBadge {
    id: string;
    userId: string;
    badgeId: string;
    earnedAt: Date;
    triggerEventId?: string;
    triggerEventTitle?: string;
}

// ===== Transform Functions =====

interface DbUserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    earned_at: string;
    trigger_event_id: string | null;
    trigger_event_title: string | null;
}

function transformDbToUserBadge(db: DbUserBadge): UserBadge {
    return {
        id: db.id,
        userId: db.user_id,
        badgeId: db.badge_id,
        earnedAt: new Date(db.earned_at),
        triggerEventId: db.trigger_event_id || undefined,
        triggerEventTitle: db.trigger_event_title || undefined,
    };
}

// ===== Query Functions =====

/**
 * 사용자의 모든 배지 조회
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

    if (error) {
        console.error("[badges] getUserBadges error:", error);
        throw error;
    }

    return (data || []).map(transformDbToUserBadge);
}

/**
 * 특정 배지 보유 여부 확인
 */
export async function hasBadge(
    userId: string,
    badgeId: string
): Promise<boolean> {
    const supabase = createClient();
    const { count, error } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("badge_id", badgeId);

    if (error) {
        console.error("[badges] hasBadge error:", error);
        throw error;
    }

    return (count || 0) > 0;
}

/**
 * 배지 수여
 */
export async function awardBadge(
    userId: string,
    badgeId: string,
    triggerEventId?: string,
    triggerEventTitle?: string
): Promise<UserBadge> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("user_badges")
        .insert({
            user_id: userId,
            badge_id: badgeId,
            trigger_event_id: triggerEventId || null,
            trigger_event_title: triggerEventTitle || null,
        })
        .select()
        .single();

    if (error) {
        console.error("[badges] awardBadge error:", error);
        throw error;
    }

    return transformDbToUserBadge(data);
}

/**
 * 여러 배지 동시 수여
 */
export async function awardBadges(
    userId: string,
    badges: Array<{
        badgeId: string;
        triggerEventId?: string;
        triggerEventTitle?: string;
    }>
): Promise<UserBadge[]> {
    if (badges.length === 0) return [];

    const supabase = createClient();
    const { data, error } = await supabase
        .from("user_badges")
        .insert(
            badges.map((b) => ({
                user_id: userId,
                badge_id: b.badgeId,
                trigger_event_id: b.triggerEventId || null,
                trigger_event_title: b.triggerEventTitle || null,
            }))
        )
        .select();

    if (error) {
        console.error("[badges] awardBadges error:", error);
        throw error;
    }

    return (data || []).map(transformDbToUserBadge);
}

/**
 * 대표 배지 업데이트 (users 테이블의 featured_badges 필드)
 */
export async function updateFeaturedBadges(
    userId: string,
    badgeIds: string[]
): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from("users")
        .update({ featured_badges: badgeIds })
        .eq("id", userId);

    if (error) {
        console.error("[badges] updateFeaturedBadges error:", error);
        throw error;
    }
}

/**
 * 대표 배지 조회
 */
export async function getFeaturedBadges(userId: string): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("users")
        .select("featured_badges")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("[badges] getFeaturedBadges error:", error);
        throw error;
    }

    return data?.featured_badges || [];
}
