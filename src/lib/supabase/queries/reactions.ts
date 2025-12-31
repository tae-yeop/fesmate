/**
 * Reactions Query Functions
 *
 * 도움됨(helpful) 반응 Supabase 쿼리
 */

import { createClient } from "../client";

export interface PostReaction {
    userId: string;
    postId: string;
    reactionType: "helpful";
    createdAt: Date;
}

/**
 * 사용자의 모든 도움됨 마킹 목록 조회
 */
export async function getUserReactions(userId: string): Promise<string[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("post_reactions")
        .select("post_id")
        .eq("user_id", userId)
        .eq("reaction_type", "helpful");

    if (error) {
        console.error("[getUserReactions] Error:", error);
        throw error;
    }

    return (data ?? []).map((row) => row.post_id);
}

/**
 * 특정 게시글에 도움됨 마킹했는지 확인
 */
export async function hasReaction(
    userId: string,
    postId: string
): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("post_reactions")
        .select("user_id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .single();

    if (error && error.code !== "PGRST116") {
        // PGRST116: no rows returned
        console.error("[hasReaction] Error:", error);
        throw error;
    }

    return !!data;
}

/**
 * 도움됨 추가
 */
export async function addReaction(
    userId: string,
    postId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase.from("post_reactions").insert({
        user_id: userId,
        post_id: postId,
        reaction_type: "helpful",
    });

    if (error) {
        // 이미 존재하는 경우 무시 (unique constraint)
        if (error.code === "23505") {
            return;
        }
        // FK 위반 (post가 존재하지 않음) - 무시
        if (error.code === "23503") {
            console.warn("[addReaction] Post not found in DB (mock data):", postId);
            return;
        }
        // UUID 형식이 아닌 경우 - Mock 데이터
        if (error.code === "22P02") {
            console.warn("[addReaction] Invalid UUID format (mock data):", postId);
            return;
        }
        console.error("[addReaction] Error:", JSON.stringify(error, null, 2));
        console.error("[addReaction] Error code:", error.code);
        console.error("[addReaction] Error message:", error.message);
        throw error;
    }
}

/**
 * 도움됨 제거
 */
export async function removeReaction(
    userId: string,
    postId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from("post_reactions")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

    if (error) {
        // UUID 형식이 아닌 경우 - Mock 데이터
        if (error.code === "22P02") {
            console.warn("[removeReaction] Invalid UUID format (mock data):", postId);
            return;
        }
        console.error("[removeReaction] Error:", JSON.stringify(error, null, 2));
        console.error("[removeReaction] Error code:", error.code);
        throw error;
    }
    // 삭제할 레코드가 없어도 에러가 아님 (Mock 데이터의 경우)
}

/**
 * 도움됨 토글 (있으면 제거, 없으면 추가)
 * @returns 토글 후 도움됨 상태 (true = 도움됨 마킹됨)
 *
 * 주의: Mock 데이터(post1, post2 등)는 DB에 없으므로 FK 에러가 발생할 수 있음.
 * 이 경우 에러를 무시하고 정상 반환합니다.
 */
export async function toggleReaction(
    userId: string,
    postId: string
): Promise<boolean> {
    const supabase = createClient();

    // 현재 상태 확인
    const { data: existing, error: selectError } = await supabase
        .from("post_reactions")
        .select("user_id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .single();

    // PGRST116: no rows returned (정상)
    // 22P02: invalid UUID format (Mock 데이터) - 새로 추가로 처리
    if (selectError && selectError.code !== "PGRST116") {
        if (selectError.code === "22P02") {
            // Mock 데이터 - 항상 "없음"으로 처리하여 addReaction 시도
            console.warn("[toggleReaction] Invalid UUID format (mock data):", postId);
            await addReaction(userId, postId);
            return true;
        }
        console.warn("[toggleReaction] Select error:", selectError.code, selectError.message);
    }

    if (existing) {
        // 이미 있으면 제거
        await removeReaction(userId, postId);
        return false;
    } else {
        // 없으면 추가
        await addReaction(userId, postId);
        return true;
    }
}

/**
 * 게시글의 도움됨 카운트 조회
 * 주의: posts 테이블의 helpful_count 트리거가 자동 업데이트하므로
 * 가능하면 posts.helpful_count를 직접 조회하는 것이 효율적
 */
export async function getReactionCount(postId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
        .from("post_reactions")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

    if (error) {
        console.error("[getReactionCount] Error:", error);
        throw error;
    }

    return count ?? 0;
}
