"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trophy, TrendingUp, TrendingDown, Minus, Medal, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/lib/leaderboard-context";
import { useUserProfile } from "@/lib/user-profile-context";
import {
    LeaderboardPeriod,
    ACTIVITY_SCORES,
    getRankTier,
    RANK_TIERS,
} from "@/types/leaderboard";

const PERIOD_TABS: { id: LeaderboardPeriod; label: string }[] = [
    { id: "weekly", label: "주간" },
    { id: "monthly", label: "월간" },
    { id: "all_time", label: "전체" },
];

export default function LeaderboardPage() {
    const router = useRouter();
    const { getLeaderboard, getUserRanking } = useLeaderboard();
    const { currentUserId } = useUserProfile();

    const [activePeriod, setActivePeriod] = useState<LeaderboardPeriod>("weekly");
    const [showScoreInfo, setShowScoreInfo] = useState(false);

    // 리더보드 데이터
    const leaderboard = useMemo(
        () => getLeaderboard(activePeriod, 100),
        [getLeaderboard, activePeriod]
    );

    // 내 랭킹
    const myRanking = useMemo(
        () => currentUserId ? getUserRanking(currentUserId, activePeriod) : null,
        [getUserRanking, currentUserId, activePeriod]
    );

    // Top 3
    const top3 = leaderboard.slice(0, 3);
    const restList = leaderboard.slice(3);

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-6">
            {/* 헤더 */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
                <div className="container flex items-center gap-3 h-14 px-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                        aria-label="뒤로가기"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <h1 className="text-lg font-semibold">리더보드</h1>
                    </div>
                    <button
                        onClick={() => setShowScoreInfo(!showScoreInfo)}
                        className="ml-auto p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                        aria-label="점수 안내"
                    >
                        <HelpCircle className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* 점수 안내 (토글) */}
            {showScoreInfo && (
                <div className="bg-muted/50 border-b px-4 py-3">
                    <div className="container max-w-2xl mx-auto">
                        <h3 className="text-sm font-medium mb-2">점수 계산 방법</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>도움됨 받은 후기: <span className="text-foreground font-medium">+{ACTIVITY_SCORES.helpful_review}점</span></div>
                            <div>현장 제보: <span className="text-foreground font-medium">+{ACTIVITY_SCORES.live_report}점</span></div>
                            <div>댓글: <span className="text-foreground font-medium">+{ACTIVITY_SCORES.comment}점</span></div>
                            <div>글 작성: <span className="text-foreground font-medium">+{ACTIVITY_SCORES.post}점</span></div>
                            <div>다녀온 인증: <span className="text-foreground font-medium">+{ACTIVITY_SCORES.attended}점</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* 기간 탭 */}
            <div className="sticky top-14 z-30 bg-background border-b">
                <div className="container max-w-2xl mx-auto">
                    <div className="flex">
                        {PERIOD_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActivePeriod(tab.id)}
                                className={cn(
                                    "flex-1 py-3 text-sm font-medium transition-colors relative",
                                    activePeriod === tab.id
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                {activePeriod === tab.id && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 내 랭킹 (로그인 시) */}
            {myRanking && (
                <div className="bg-gradient-to-r from-primary/10 to-pink-500/10 border-b">
                    <div className="container max-w-2xl mx-auto px-4 py-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background border-2 border-primary/30">
                                <span className="text-lg font-bold text-primary">#{myRanking.rank}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{myRanking.avatar}</span>
                                    <span className="font-semibold">나의 순위</span>
                                    {myRanking.rankChange !== undefined && myRanking.rankChange !== 0 && (
                                        <span className={cn(
                                            "flex items-center text-xs",
                                            myRanking.rankChange > 0 ? "text-green-600" : "text-red-500"
                                        )}>
                                            {myRanking.rankChange > 0 ? (
                                                <><TrendingUp className="h-3 w-3 mr-0.5" />{myRanking.rankChange}</>
                                            ) : (
                                                <><TrendingDown className="h-3 w-3 mr-0.5" />{Math.abs(myRanking.rankChange)}</>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {myRanking.totalScore.toLocaleString()}점
                                </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                                <div>후기 {myRanking.breakdown.helpfulReviews}</div>
                                <div>제보 {myRanking.breakdown.liveReports}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top 3 포디움 */}
            <div className="bg-gradient-to-b from-yellow-50/50 to-transparent dark:from-yellow-900/10 py-6">
                <div className="container max-w-2xl mx-auto px-4">
                    <div className="flex items-end justify-center gap-4">
                        {/* 2등 */}
                        {top3[1] && (
                            <Link href={`/user/${top3[1].userId}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-3xl border-4 border-gray-300 dark:border-gray-500 shadow-lg">
                                        {top3[1].avatar || "👤"}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-400 text-white text-xs font-bold flex items-center justify-center shadow">
                                        2
                                    </div>
                                </div>
                                <p className="mt-2 text-sm font-medium truncate max-w-20">{top3[1].nickname}</p>
                                <p className="text-xs text-muted-foreground">{top3[1].totalScore.toLocaleString()}점</p>
                                <div className="mt-2 w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-t-lg" />
                            </Link>
                        )}

                        {/* 1등 */}
                        {top3[0] && (
                            <Link href={`/user/${top3[0].userId}`} className="flex flex-col items-center -mt-4 hover:opacity-80 transition-opacity">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-4xl border-4 border-yellow-400 shadow-xl">
                                        {top3[0].avatar || "👤"}
                                    </div>
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                                        <Medal className="h-6 w-6 text-yellow-500 drop-shadow-lg" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 text-white text-sm font-bold flex items-center justify-center shadow">
                                        1
                                    </div>
                                </div>
                                <p className="mt-2 text-sm font-semibold truncate max-w-24">{top3[0].nickname}</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">{top3[0].totalScore.toLocaleString()}점</p>
                                <div className="mt-2 w-20 h-24 bg-yellow-200 dark:bg-yellow-700/50 rounded-t-lg" />
                            </Link>
                        )}

                        {/* 3등 */}
                        {top3[2] && (
                            <Link href={`/user/${top3[2].userId}`} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center text-2xl border-4 border-orange-300 shadow-lg">
                                        {top3[2].avatar || "👤"}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shadow">
                                        3
                                    </div>
                                </div>
                                <p className="mt-2 text-sm font-medium truncate max-w-16">{top3[2].nickname}</p>
                                <p className="text-xs text-muted-foreground">{top3[2].totalScore.toLocaleString()}점</p>
                                <div className="mt-2 w-14 h-12 bg-orange-200 dark:bg-orange-700/50 rounded-t-lg" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* 4위 이하 리스트 */}
            <div className="container max-w-2xl mx-auto p-4">
                <div className="space-y-2">
                    {restList.map((user) => {
                        const tier = getRankTier(user.rank);
                        const tierInfo = RANK_TIERS[tier];
                        const isMe = currentUserId === user.userId;

                        return (
                            <Link
                                key={user.userId}
                                href={`/user/${user.userId}`}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                                    isMe
                                        ? "bg-primary/5 border-primary/30"
                                        : "bg-card hover:bg-muted/50"
                                )}
                            >
                                {/* 순위 */}
                                <div className={cn(
                                    "w-8 text-center font-bold",
                                    tierInfo.color
                                )}>
                                    {tierInfo.emoji || user.rank}
                                </div>

                                {/* 아바타 */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-pink-500/10 flex items-center justify-center text-xl flex-shrink-0">
                                    {user.avatar || "👤"}
                                </div>

                                {/* 정보 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">
                                            {user.nickname}
                                        </span>
                                        {isMe && (
                                            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                                나
                                            </span>
                                        )}
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
                                        {user.rankChange === 0 && (
                                            <Minus className="h-3 w-3 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        <span>후기 {user.breakdown.helpfulReviews}</span>
                                        <span>제보 {user.breakdown.liveReports}</span>
                                        <span>댓글 {user.breakdown.comments}</span>
                                    </div>
                                </div>

                                {/* 점수 */}
                                <div className="text-right">
                                    <div className="font-semibold">
                                        {user.totalScore.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">점</div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {leaderboard.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">아직 리더보드 데이터가 없어요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
