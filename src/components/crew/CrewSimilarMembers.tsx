"use client";

import { useMemo } from "react";
import { useCrew } from "@/lib/crew-context";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Sparkles, Users, Heart, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useDevContext } from "@/lib/dev-context";

interface CrewSimilarMembersProps {
    crewId: string;
}

interface SimilarMember {
    userId: string;
    nickname: string;
    avatar?: string;
    similarity: number;
    commonEvents: string[];
    commonCount: number;
}

function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;

    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
}

export function CrewSimilarMembers({ crewId }: CrewSimilarMembersProps) {
    const { getCrewEvents, getCrewMembers } = useCrew();
    const { user } = useAuth();
    const { mockUserId, isLoggedIn: devIsLoggedIn } = useDevContext();

    const currentUserId = user?.id || (devIsLoggedIn ? mockUserId : null);

    const crewEvents = getCrewEvents(crewId);
    const members = getCrewMembers(crewId);

    const similarMembers = useMemo(() => {
        if (!currentUserId) return [];

        const memberEvents: Record<string, Set<string>> = {};

        crewEvents.forEach((ce) => {
            if (!memberEvents[ce.userId]) {
                memberEvents[ce.userId] = new Set();
            }
            memberEvents[ce.userId].add(ce.eventId);
        });

        const currentUserEvents = memberEvents[currentUserId] || new Set();

        if (currentUserEvents.size === 0) return [];

        const similarities: SimilarMember[] = [];

        Object.entries(memberEvents).forEach(([userId, events]) => {
            if (userId === currentUserId) return;

            const similarity = calculateJaccardSimilarity(currentUserEvents, events);
            const commonEventIds = [...currentUserEvents].filter((e) => events.has(e));

            if (similarity > 0) {
                const member = members.find((m) => m.userId === userId);
                const commonEventTitles = commonEventIds
                    .map((eventId) => {
                        const event = MOCK_EVENTS.find((e) => e.id === eventId);
                        return event?.title;
                    })
                    .filter(Boolean) as string[];

                similarities.push({
                    userId,
                    nickname: member?.userNickname || "Unknown",
                    avatar: member?.userAvatar,
                    similarity: Math.round(similarity * 100),
                    commonEvents: commonEventTitles.slice(0, 3),
                    commonCount: commonEventIds.length,
                });
            }
        });

        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);
    }, [crewEvents, members, currentUserId]);

    if (!currentUserId) {
        return (
            <div className="p-6 bg-muted/30 rounded-xl text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                    로그인하면 취향이 비슷한 멤버를 추천받을 수 있어요
                </p>
            </div>
        );
    }

    if (similarMembers.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">취향 유사 멤버</h3>
                </div>
                <div className="p-6 bg-muted/30 rounded-xl text-center">
                    <Heart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                        아직 데이터가 부족해요<br />
                        행사에 참여하면 비슷한 취향의 멤버를 찾아드릴게요!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">취향 유사 멤버</h3>
            </div>

            <p className="text-sm text-muted-foreground">
                함께 본 공연을 기반으로 추천해요 (Jaccard 유사도)
            </p>

            <div className="space-y-3">
                {similarMembers.map((member, index) => (
                    <Link
                        key={member.userId}
                        href={`/user/${member.userId}`}
                        className="block p-4 bg-card rounded-xl border hover:border-primary/50 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xl">
                                    {member.avatar || "👤"}
                                </div>
                                {index < 3 && (
                                    <div className={cn(
                                        "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                                        index === 0 ? "bg-yellow-400 text-yellow-900" :
                                            index === 1 ? "bg-gray-300 text-gray-700" :
                                                "bg-orange-400 text-orange-900"
                                    )}>
                                        {index + 1}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{member.nickname}</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-bold",
                                        member.similarity >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                            member.similarity >= 40 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                    )}>
                                        {member.similarity}% 일치
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>공통 행사 {member.commonCount}개</span>
                                </div>

                                {member.commonEvents.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {member.commonEvents.map((event) => (
                                            <span
                                                key={event}
                                                className="px-2 py-0.5 bg-muted rounded text-xs truncate max-w-[150px]"
                                            >
                                                {event}
                                            </span>
                                        ))}
                                        {member.commonCount > 3 && (
                                            <span className="text-xs text-muted-foreground">
                                                +{member.commonCount - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </Link>
                ))}
            </div>

            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <strong>Jaccard 유사도</strong>: 두 사람이 본 공연 중 겹치는 비율을 계산해요.
                같은 공연을 많이 볼수록 유사도가 높아집니다.
            </div>
        </div>
    );
}
