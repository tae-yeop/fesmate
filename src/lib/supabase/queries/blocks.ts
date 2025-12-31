/**
 * Blocks Query Functions
 *
 * 차단 관계 Supabase 쿼리
 */

import { createClient } from "../client";

export interface Block {
    blockerId: string;
    blockedId: string;
    createdAt: Date;
}

/**
 * 사용자가 차단한 목록 조회
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", userId);

    if (error) {
        console.error("[getBlockedUsers] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.blocked_id);
}

/**
 * 나를 차단한 사용자 목록 조회
 */
export async function getBlockedByUsers(userId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", userId);

    if (error) {
        console.error("[getBlockedByUsers] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.blocker_id);
}

/**
 * 전체 차단 목록 조회 (상세 정보 포함)
 */
export async function getBlockList(userId: string): Promise<Block[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("blocks")
        .select("*")
        .eq("blocker_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[getBlockList] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => ({
        blockerId: row.blocker_id,
        blockedId: row.blocked_id,
        createdAt: new Date(row.created_at),
    }));
}

/**
 * 차단 여부 확인
 */
export async function isUserBlocked(
    blockerId: string,
    blockedId: string
): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocker_id", blockerId)
        .eq("blocked_id", blockedId)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("[isUserBlocked] Error:", error);
        throw error;
    }

    return !!data;
}

/**
 * 사용자 차단
 */
export async function blockUser(
    blockerId: string,
    blockedId: string
): Promise<void> {
    if (blockerId === blockedId) {
        throw new Error("Cannot block yourself");
    }

    const supabase = createClient();

    const { error } = await supabase.from("blocks").insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
    });

    if (error) {
        // 이미 차단 중인 경우 무시
        if (error.code === "23505") {
            return;
        }
        console.error("[blockUser] Error:", error);
        throw error;
    }
}

/**
 * 차단 해제
 */
export async function unblockUser(
    blockerId: string,
    blockedId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", blockerId)
        .eq("blocked_id", blockedId);

    if (error) {
        console.error("[unblockUser] Error:", error);
        throw error;
    }
}
