"use client";

import {
    Star,
    CheckCircle2,
    PenSquare,
    MessageCircle,
    ThumbsUp,
    Users,
    Trophy,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityStatsProps {
    wishlistCount: number;
    attendedCount: number;
    postCount: number;
    commentCount: number;
    helpfulCount: number;
    participationCount: number;
    badgeCount: number;
    totalBadges: number;
    leaderboardRank?: number;
    leaderboardScore?: number;
}

export function ActivityStats({
    wishlistCount,
    attendedCount,
    postCount,
    commentCount,
    helpfulCount,
    participationCount,
    badgeCount,
    totalBadges,
    leaderboardRank,
    leaderboardScore,
}: ActivityStatsProps) {
    const statCards = [
        {
            label: "찜한 행사",
            value: wishlistCount,
            icon: Star,
            color: "text-yellow-500",
            bg: "bg-yellow-50",
        },
        {
            label: "다녀온 행사",
            value: attendedCount,
            icon: CheckCircle2,
            color: "text-green-500",
            bg: "bg-green-50",
        },
        {
            label: "작성한 글",
            value: postCount,
            icon: PenSquare,
            color: "text-blue-500",
            bg: "bg-blue-50",
        },
        {
            label: "작성한 댓글",
            value: commentCount,
            icon: MessageCircle,
            color: "text-purple-500",
            bg: "bg-purple-50",
        },
        {
            label: "도움됨 표시",
            value: helpfulCount,
            icon: ThumbsUp,
            color: "text-pink-500",
            bg: "bg-pink-50",
        },
        {
            label: "참여 신청",
            value: participationCount,
            icon: Users,
            color: "text-orange-500",
            bg: "bg-orange-50",
        },
    ];

    return (
        <div className="space-y-6">
            {/* 요약 카드 그리드 */}
            <div className="grid grid-cols-2 gap-3">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="p-4 rounded-xl border bg-card"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn("p-1.5 rounded-lg", stat.bg)}>
                                    <Icon className={cn("h-4 w-4", stat.color)} />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {stat.label}
                                </span>
                            </div>
                            <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* 배지 진행도 */}
            <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-amber-50">
                        <Trophy className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="font-medium">배지 수집</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 rounded-full transition-all"
                                style={{
                                    width: `${Math.min(100, (badgeCount / totalBadges) * 100)}%`,
                                }}
                            />
                        </div>
                    </div>
                    <span className="text-sm font-medium">
                        {badgeCount} / {totalBadges}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    {totalBadges - badgeCount}개의 배지를 더 획득할 수 있어요
                </p>
            </div>

            {/* 리더보드 */}
            {leaderboardRank !== undefined && leaderboardScore !== undefined && (
                <div className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">리더보드</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">현재 순위</p>
                            <p className="text-2xl font-bold">
                                {leaderboardRank === 0 ? "-" : `#${leaderboardRank}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">총 점수</p>
                            <p className="text-2xl font-bold">{leaderboardScore}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
