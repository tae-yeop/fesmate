"use client";

import Link from "next/link";
import { Trophy, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/lib/leaderboard-context";
import { getRankTier, RANK_TIERS } from "@/types/leaderboard";

interface LeaderboardPreviewProps {
    limit?: number;
}

export function LeaderboardPreview({ limit = 5 }: LeaderboardPreviewProps) {
    const { getTopUsers } = useLeaderboard();
    const topUsers = getTopUsers(limit);

    if (topUsers.length === 0) {
        return null;
    }

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-b">
                <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-semibold">이번 주 리더보드</h3>
                </div>
                <Link
                    href="/leaderboard"
                    className="text-sm text-muted-foreground flex items-center hover:text-primary transition-colors"
                >
                    전체보기
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </div>

            {/* 리스트 */}
            <div className="divide-y">
                {topUsers.map((user, index) => {
                    const tier = getRankTier(user.rank);
                    const tierInfo = RANK_TIERS[tier];

                    return (
                        <Link
                            key={user.userId}
                            href={`/user/${user.userId}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                        >
                            {/* 순위 */}
                            <div className={cn(
                                "w-6 text-center font-bold text-sm",
                                index === 0 && "text-yellow-500",
                                index === 1 && "text-gray-400",
                                index === 2 && "text-orange-500",
                                index > 2 && "text-muted-foreground"
                            )}>
                                {index < 3 ? ["🥇", "🥈", "🥉"][index] : user.rank}
                            </div>

                            {/* 아바타 */}
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0",
                                index === 0 && "bg-yellow-100 dark:bg-yellow-900/30",
                                index === 1 && "bg-gray-100 dark:bg-gray-800",
                                index === 2 && "bg-orange-100 dark:bg-orange-900/30",
                                index > 2 && "bg-muted"
                            )}>
                                {user.avatar || "👤"}
                            </div>

                            {/* 정보 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-sm truncate">
                                        {user.nickname}
                                    </span>
                                    {user.rankChange !== undefined && user.rankChange !== 0 && (
                                        <span className={cn(
                                            "flex items-center text-xs",
                                            user.rankChange > 0 ? "text-green-600" : "text-red-500"
                                        )}>
                                            {user.rankChange > 0 ? (
                                                <TrendingUp className="h-3 w-3" />
                                            ) : (
                                                <TrendingDown className="h-3 w-3" />
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 점수 */}
                            <div className="text-sm font-medium text-muted-foreground">
                                {user.totalScore.toLocaleString()}점
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
