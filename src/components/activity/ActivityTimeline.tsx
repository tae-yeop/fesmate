"use client";

import { useMemo } from "react";
import {
    Star,
    CheckCircle2,
    PenSquare,
    MessageCircle,
    ThumbsUp,
    Send,
    Inbox,
    Check,
    Trophy,
} from "lucide-react";
import { ActivityCard, ActivityItem, ActivityType } from "./ActivityCard";
import { MOCK_EVENTS, MOCK_POSTS } from "@/lib/mock-data";

// 활동 타입별 아이콘/색상 설정
const ACTIVITY_CONFIG: Record<
    ActivityType,
    { icon: typeof Star; iconColor: string; iconBg: string }
> = {
    wishlist: {
        icon: Star,
        iconColor: "text-yellow-500",
        iconBg: "bg-yellow-50",
    },
    attended: {
        icon: CheckCircle2,
        iconColor: "text-green-500",
        iconBg: "bg-green-50",
    },
    post: {
        icon: PenSquare,
        iconColor: "text-blue-500",
        iconBg: "bg-blue-50",
    },
    comment: {
        icon: MessageCircle,
        iconColor: "text-purple-500",
        iconBg: "bg-purple-50",
    },
    helpful: {
        icon: ThumbsUp,
        iconColor: "text-pink-500",
        iconBg: "bg-pink-50",
    },
    participation_sent: {
        icon: Send,
        iconColor: "text-orange-500",
        iconBg: "bg-orange-50",
    },
    participation_received: {
        icon: Inbox,
        iconColor: "text-cyan-500",
        iconBg: "bg-cyan-50",
    },
    participation_accepted: {
        icon: Check,
        iconColor: "text-green-500",
        iconBg: "bg-green-50",
    },
    badge: {
        icon: Trophy,
        iconColor: "text-amber-500",
        iconBg: "bg-amber-50",
    },
};

interface ActivityTimelineProps {
    activities: ActivityItem[];
    emptyMessage?: string;
    onActivityClick?: (activity: ActivityItem) => void;
}

export function ActivityTimeline({
    activities,
    emptyMessage = "아직 활동이 없어요",
    onActivityClick,
}: ActivityTimelineProps) {
    // 날짜별 그룹핑
    const groupedActivities = useMemo(() => {
        const groups: { [key: string]: ActivityItem[] } = {};

        activities.forEach((activity) => {
            const date = new Date(activity.timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let dateKey: string;
            if (date.toDateString() === today.toDateString()) {
                dateKey = "오늘";
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateKey = "어제";
            } else {
                dateKey = date.toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                });
            }

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(activity);
        });

        return groups;
    }, [activities]);

    if (activities.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="divide-y">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date}>
                    {/* 날짜 헤더 */}
                    <div className="sticky top-[6.5rem] z-10 px-4 py-2 bg-muted/80 backdrop-blur">
                        <span className="text-xs font-medium text-muted-foreground">
                            {date}
                        </span>
                    </div>

                    {/* 활동 목록 */}
                    {dateActivities.map((activity) => (
                        <ActivityCard
                            key={activity.id}
                            activity={activity}
                            onClick={
                                onActivityClick
                                    ? () => onActivityClick(activity)
                                    : undefined
                            }
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

// 활동 아이템 생성 헬퍼 함수들
export function createWishlistActivity(
    eventId: string,
    timestamp: Date
): ActivityItem | null {
    const event = MOCK_EVENTS.find((e) => e.id === eventId);
    if (!event) return null;

    const config = ACTIVITY_CONFIG.wishlist;
    return {
        id: `wishlist_${eventId}_${timestamp.getTime()}`,
        type: "wishlist",
        title: `"${event.title}" 찜`,
        description: event.venue?.name,
        link: `/event/${eventId}`,
        timestamp,
        ...config,
    };
}

export function createAttendedActivity(
    eventId: string,
    timestamp: Date
): ActivityItem | null {
    const event = MOCK_EVENTS.find((e) => e.id === eventId);
    if (!event) return null;

    const config = ACTIVITY_CONFIG.attended;
    return {
        id: `attended_${eventId}_${timestamp.getTime()}`,
        type: "attended",
        title: `"${event.title}" 다녀옴 기록`,
        description: event.venue?.name,
        link: `/event/${eventId}`,
        timestamp,
        ...config,
    };
}

export function createPostActivity(
    postId: string,
    postTitle: string,
    eventId: string | undefined,
    timestamp: Date
): ActivityItem {
    const config = ACTIVITY_CONFIG.post;
    return {
        id: `post_${postId}`,
        type: "post",
        title: `"${postTitle}" 글 작성`,
        link: eventId ? `/event/${eventId}?tab=hub` : `/community`,
        timestamp,
        ...config,
    };
}

export function createCommentActivity(
    commentId: string,
    postId: string,
    content: string,
    timestamp: Date
): ActivityItem {
    const post = MOCK_POSTS.find((p) => p.id === postId);
    const config = ACTIVITY_CONFIG.comment;
    return {
        id: `comment_${commentId}`,
        type: "comment",
        title: post ? `"${post.content.slice(0, 30)}..."에 댓글` : "댓글 작성",
        description: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
        timestamp,
        ...config,
    };
}

export function createHelpfulActivity(
    postId: string,
    timestamp: Date
): ActivityItem {
    const post = MOCK_POSTS.find((p) => p.id === postId);
    const config = ACTIVITY_CONFIG.helpful;
    return {
        id: `helpful_${postId}_${timestamp.getTime()}`,
        type: "helpful",
        title: post
            ? `"${post.content.slice(0, 30)}..."에 도움됨 표시`
            : "도움됨 표시",
        timestamp,
        ...config,
    };
}

export function createParticipationActivity(
    requestId: string,
    type: "sent" | "received" | "accepted",
    postType: string | undefined,
    timestamp: Date
): ActivityItem {
    const activityType =
        type === "sent"
            ? "participation_sent"
            : type === "received"
              ? "participation_received"
              : "participation_accepted";
    const config = ACTIVITY_CONFIG[activityType];

    const typeLabel = postType || "참여";
    const titleMap = {
        sent: `${typeLabel} 참여 신청`,
        received: `${typeLabel} 참여 신청 받음`,
        accepted: `${typeLabel} 참여 수락됨`,
    };

    return {
        id: `participation_${requestId}`,
        type: activityType,
        title: titleMap[type],
        link: "/community?participation=true",
        timestamp,
        ...config,
    };
}

export function createBadgeActivity(
    badgeId: string,
    badgeName: string,
    timestamp: Date
): ActivityItem {
    const config = ACTIVITY_CONFIG.badge;
    return {
        id: `badge_${badgeId}_${timestamp.getTime()}`,
        type: "badge",
        title: `"${badgeName}" 배지 획득!`,
        link: "/myfes?tab=log",
        timestamp,
        ...config,
    };
}

export { ACTIVITY_CONFIG };
