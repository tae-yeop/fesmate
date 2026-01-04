/**
 * Leaderboard Query Functions
 *
 * 리더보드 관련 쿼리
 * - 사용자별 활동 통계 집계
 * - 점수 계산 및 랭킹
 */

import { createClient } from "../client";
import { LeaderboardScore, calculateScore } from "@/types/leaderboard";

// ===== Types =====

export interface UserActivityStats {
    userId: string;
    nickname: string;
    profileImage: string | null;
    featuredBadges: string[];
    attendedCount: number;
    postCount: number;
    reviewHelpfulCount: number;
    liveReportCount: number;
    commentCount: number;
}

// ===== Query Functions =====

/**
 * 모든 사용자의 활동 통계 조회 (리더보드용)
 *
 * 집계 항목:
 * - attended_count: users 테이블에서 직접
 * - post_count: posts 테이블에서 집계
 * - review_helpful_count: posts 테이블에서 type='review'인 helpful_count 합계
 * - live_report_count: posts 테이블에서 type in (gate, md, facility, safety) 개수
 * - comment_count: comments 테이블에서 집계
 */
export async function getLeaderboardStats(): Promise<UserActivityStats[]> {
    const supabase = createClient();

    // 1. 기본 사용자 정보 조회
    const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, nickname, profile_image, featured_badges, attended_count");

    if (usersError) {
        console.error("[leaderboard] getLeaderboardStats users error:", usersError);
        throw usersError;
    }

    if (!users || users.length === 0) {
        return [];
    }

    // 2. 각 사용자별 포스트 통계 조회
    const { data: postStats, error: postStatsError } = await supabase
        .from("posts")
        .select("user_id, type, helpful_count")
        .in("user_id", users.map((u) => u.id));

    if (postStatsError) {
        console.error("[leaderboard] getLeaderboardStats posts error:", postStatsError);
        // 포스트 에러는 무시하고 계속 진행
    }

    // 3. 각 사용자별 댓글 수 조회
    const { data: commentStats, error: commentStatsError } = await supabase
        .from("comments")
        .select("user_id")
        .in("user_id", users.map((u) => u.id));

    if (commentStatsError) {
        console.error("[leaderboard] getLeaderboardStats comments error:", commentStatsError);
        // 댓글 에러는 무시하고 계속 진행
    }

    // 4. 사용자별 통계 집계
    const statsMap = new Map<string, UserActivityStats>();

    // 초기화
    users.forEach((user) => {
        statsMap.set(user.id, {
            userId: user.id,
            nickname: user.nickname,
            profileImage: user.profile_image,
            featuredBadges: user.featured_badges || [],
            attendedCount: user.attended_count || 0,
            postCount: 0,
            reviewHelpfulCount: 0,
            liveReportCount: 0,
            commentCount: 0,
        });
    });

    // 포스트 통계 집계
    if (postStats) {
        postStats.forEach((post) => {
            const stat = statsMap.get(post.user_id);
            if (!stat) return;

            stat.postCount += 1;

            // 실시간 제보
            if (["gate", "md", "facility", "safety"].includes(post.type)) {
                stat.liveReportCount += 1;
            }

            // 후기 도움됨
            if (post.type === "review") {
                stat.reviewHelpfulCount += post.helpful_count || 0;
            }
        });
    }

    // 댓글 통계 집계
    if (commentStats) {
        commentStats.forEach((comment) => {
            const stat = statsMap.get(comment.user_id);
            if (stat) {
                stat.commentCount += 1;
            }
        });
    }

    return Array.from(statsMap.values());
}

/**
 * 리더보드 점수 계산 및 랭킹 반환
 */
export async function getLeaderboard(limit?: number): Promise<LeaderboardScore[]> {
    const stats = await getLeaderboardStats();

    const scores: LeaderboardScore[] = stats.map((stat) => {
        const breakdown = {
            helpfulReviews: stat.reviewHelpfulCount,
            liveReports: stat.liveReportCount,
            comments: stat.commentCount,
            posts: stat.postCount,
            attended: stat.attendedCount,
        };

        const totalScore = calculateScore(breakdown);

        return {
            userId: stat.userId,
            nickname: stat.nickname,
            avatar: stat.profileImage || "",
            totalScore,
            breakdown,
            rank: 0,
            badges: stat.featuredBadges,
        };
    });

    // 점수순 정렬 및 랭킹 부여
    scores.sort((a, b) => b.totalScore - a.totalScore);
    scores.forEach((score, index) => {
        score.rank = index + 1;
    });

    if (limit) {
        return scores.slice(0, limit);
    }

    return scores;
}

/**
 * 특정 사용자의 랭킹 조회
 */
export async function getUserRanking(userId: string): Promise<LeaderboardScore | null> {
    const leaderboard = await getLeaderboard();
    return leaderboard.find((s) => s.userId === userId) || null;
}
