"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/utils/date-format";

export type ActivityType =
    | "wishlist"
    | "attended"
    | "post"
    | "comment"
    | "helpful"
    | "participation_sent"
    | "participation_received"
    | "participation_accepted"
    | "badge";

export interface ActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    description?: string;
    link?: string;
    timestamp: Date;
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
}

interface ActivityCardProps {
    activity: ActivityItem;
    onClick?: () => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
    const Icon = activity.icon;

    const content = (
        <div
            className={cn(
                "flex items-start gap-3 p-4 border-b hover:bg-muted/50 transition-colors",
                onClick && "cursor-pointer"
            )}
            onClick={onClick}
        >
            {/* Icon */}
            <div className={cn("p-2 rounded-full flex-shrink-0", activity.iconBg)}>
                <Icon className={cn("h-4 w-4", activity.iconColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">{activity.title}</p>
                {activity.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {activity.description}
                    </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                    {formatTimeAgo(activity.timestamp)}
                </p>
            </div>
        </div>
    );

    if (activity.link) {
        return <Link href={activity.link}>{content}</Link>;
    }

    return content;
}
