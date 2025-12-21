"use client";

import {
    createContext,
    useContext,
    useMemo,
    ReactNode,
} from "react";
import {
    LeaderboardScore,
    LeaderboardPeriod,
    ACTIVITY_SCORES,
    calculateScore,
} from "@/types/leaderboard";
import { MOCK_USER_PROFILES } from "./follow-context";
import { MOCK_POSTS } from "./mock-data";

// ===== Mock 활동 데이터 생성 =====

interface UserActivity {
    userId: string;
    helpfulReviews: number;
    liveReports: number;
    comments: number;
    posts: number;
    attended: number;
}

// Mock 데이터에서 사용자별 활동 집계
function aggregateUserActivities(): UserActivity[] {
    const activityMap = new Map<string, UserActivity>();

    // 초기화
    MOCK_USER_PROFILES.forEach(user => {
        activityMap.set(user.id, {
            userId: user.id,
            helpfulReviews: 0,
            liveReports: 0,
            comments: 0,
            posts: 0,
            attended: user.attendedCount || 0,
        });
    });

    // MOCK_POSTS에서 활동 집계
    MOCK_POSTS.forEach(post => {
        const activity = activityMap.get(post.userId);
        if (!activity) return;

        // 실시간 제보 (gate, md, facility, safety)
        if (["gate", "md", "facility", "safety"].includes(post.type)) {
            activity.liveReports += 1;
        }
        // 후기 (도움됨 카운트 포함)
        else if (post.type === "review") {
            activity.helpfulReviews += post.helpfulCount || 0;
        }
        // 일반 글
        else {
            activity.posts += 1;
        }
    });

    // 추가 Mock 활동 데이터 (다양한 점수 분포를 위해)
    const additionalActivities: Partial<Record<string, Partial<UserActivity>>> = {
        user1: { helpfulReviews: 15, liveReports: 8, comments: 25, attended: 15 },
        user2: { helpfulReviews: 45, liveReports: 20, comments: 60, attended: 48 },
        user3: { helpfulReviews: 12, liveReports: 5, comments: 30, attended: 32 },
        user4: { helpfulReviews: 80, liveReports: 35, comments: 120, attended: 67 },
        user5: { helpfulReviews: 8, liveReports: 3, comments: 15, attended: 28 },
        user6: { helpfulReviews: 25, liveReports: 12, comments: 45, attended: 41 },
    };

    Object.entries(additionalActivities).forEach(([userId, extra]) => {
        const activity = activityMap.get(userId);
        if (activity && extra) {
            activity.helpfulReviews += extra.helpfulReviews || 0;
            activity.liveReports += extra.liveReports || 0;
            activity.comments += extra.comments || 0;
            activity.attended = extra.attended || activity.attended;
        }
    });

    return Array.from(activityMap.values());
}

// ===== Context =====

interface LeaderboardContextValue {
    /** 리더보드 조회 */
    getLeaderboard: (period: LeaderboardPeriod, limit?: number) => LeaderboardScore[];
    /** 특정 사용자 랭킹 조회 */
    getUserRanking: (userId: string, period: LeaderboardPeriod) => LeaderboardScore | null;
    /** Top N 조회 */
    getTopUsers: (n: number) => LeaderboardScore[];
}

const LeaderboardContext = createContext<LeaderboardContextValue | null>(null);

export function LeaderboardProvider({ children }: { children: ReactNode }) {
    // 사용자별 활동 집계
    const userActivities = useMemo(() => aggregateUserActivities(), []);

    // 리더보드 점수 계산 및 랭킹
    const leaderboard = useMemo((): LeaderboardScore[] => {
        const scores = userActivities.map(activity => {
            const user = MOCK_USER_PROFILES.find(u => u.id === activity.userId);
            if (!user) return null;

            const breakdown = {
                helpfulReviews: activity.helpfulReviews,
                liveReports: activity.liveReports,
                comments: activity.comments,
                posts: activity.posts,
                attended: activity.attended,
            };

            const totalScore = calculateScore(breakdown);

            return {
                userId: user.id,
                nickname: user.nickname,
                avatar: user.avatar,
                totalScore,
                breakdown,
                rank: 0, // 나중에 설정
                badges: user.featuredBadges,
            };
        }).filter((s): s is NonNullable<typeof s> => s !== null) as LeaderboardScore[];

        // 점수순 정렬 후 랭킹 부여
        scores.sort((a, b) => b.totalScore - a.totalScore);
        scores.forEach((score, index) => {
            score.rank = index + 1;
            // 랭킹 변화 시뮬레이션 (Mock) - 결정적인 값 사용 (hydration 에러 방지)
            const mockChanges = [2, -1, 1, 0, -2, 1];
            score.rankChange = mockChanges[index % mockChanges.length];
        });

        return scores;
    }, [userActivities]);

    // 기간별 리더보드 (Mock: 실제로는 기간별 필터링 필요)
    const getLeaderboard = useMemo(() => {
        return (period: LeaderboardPeriod, limit?: number): LeaderboardScore[] => {
            // Mock에서는 기간 구분 없이 동일한 데이터 반환
            // 실제 구현에서는 createdAt 기준 필터링 필요
            let result = [...leaderboard];

            // 기간별로 점수 조정 (시뮬레이션)
            if (period === "weekly") {
                result = result.map(s => ({
                    ...s,
                    totalScore: Math.floor(s.totalScore * 0.15),
                }));
                result.sort((a, b) => b.totalScore - a.totalScore);
                result.forEach((s, i) => { s.rank = i + 1; });
            } else if (period === "monthly") {
                result = result.map(s => ({
                    ...s,
                    totalScore: Math.floor(s.totalScore * 0.4),
                }));
                result.sort((a, b) => b.totalScore - a.totalScore);
                result.forEach((s, i) => { s.rank = i + 1; });
            }

            if (limit) {
                result = result.slice(0, limit);
            }

            return result;
        };
    }, [leaderboard]);

    // 사용자 랭킹 조회
    const getUserRanking = useMemo(() => {
        return (userId: string, period: LeaderboardPeriod): LeaderboardScore | null => {
            const board = getLeaderboard(period);
            return board.find(s => s.userId === userId) || null;
        };
    }, [getLeaderboard]);

    // Top N 조회 (all_time 기준)
    const getTopUsers = useMemo(() => {
        return (n: number): LeaderboardScore[] => {
            return leaderboard.slice(0, n);
        };
    }, [leaderboard]);

    return (
        <LeaderboardContext.Provider
            value={{
                getLeaderboard,
                getUserRanking,
                getTopUsers,
            }}
        >
            {children}
        </LeaderboardContext.Provider>
    );
}

export function useLeaderboard() {
    const context = useContext(LeaderboardContext);
    if (!context) {
        throw new Error("useLeaderboard must be used within LeaderboardProvider");
    }
    return context;
}
