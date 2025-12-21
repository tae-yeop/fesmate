"use client";

import React from "react";
import Link from "next/link";
import {
    Music,
    ThumbsUp,
    Users,
    CheckCircle,
    Clock,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CallGuide, CALL_TYPE_CONFIG } from "@/types/call-guide";

interface CallGuideListProps {
    callGuides: CallGuide[];
    title?: string;
    showArtist?: boolean;
    className?: string;
}

export function CallGuideList({
    callGuides,
    title,
    showArtist = true,
    className,
}: CallGuideListProps) {
    if (callGuides.length === 0) {
        return (
            <div className={cn("text-center py-8 text-gray-500", className)}>
                <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>콜가이드가 없습니다</p>
            </div>
        );
    }

    return (
        <div className={className}>
            {title && <h3 className="font-bold mb-3">{title}</h3>}
            <div className="space-y-2">
                {callGuides.map((guide) => (
                    <CallGuideListItem
                        key={guide.id}
                        callGuide={guide}
                        showArtist={showArtist}
                    />
                ))}
            </div>
        </div>
    );
}

interface CallGuideListItemProps {
    callGuide: CallGuide;
    showArtist?: boolean;
}

function CallGuideListItem({ callGuide, showArtist = true }: CallGuideListItemProps) {
    // 타입별 엔트리 수 계산
    const typeCounts = callGuide.entries.reduce((acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // 상위 3개 타입
    const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);

    return (
        <Link
            href={`/fieldnote/call/${callGuide.songId}`}
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                "hover:bg-gray-50 transition-colors"
            )}
        >
            {/* 썸네일 */}
            <div className="relative w-16 h-16 bg-gray-200 rounded overflow-hidden shrink-0">
                {callGuide.song?.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={callGuide.song.thumbnailUrl}
                        alt={callGuide.song.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-6 w-6 text-gray-400" />
                    </div>
                )}
                {callGuide.status === "verified" && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{callGuide.song?.title}</h4>
                </div>
                {showArtist && (
                    <p className="text-sm text-muted-foreground truncate">
                        {callGuide.song?.artistName}
                    </p>
                )}

                {/* 메타 정보 */}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {callGuide.helpfulCount}
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {callGuide.contributors.length}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        v{callGuide.version}
                    </span>
                </div>

                {/* 타입 배지 */}
                <div className="flex items-center gap-1 mt-1">
                    {topTypes.map((type) => {
                        const config = CALL_TYPE_CONFIG[type as keyof typeof CALL_TYPE_CONFIG];
                        return (
                            <span
                                key={type}
                                className="text-sm"
                                title={config.label}
                            >
                                {config.icon}
                            </span>
                        );
                    })}
                    {callGuide.entries.length > 0 && (
                        <span className="text-xs text-gray-400 ml-1">
                            {callGuide.entries.length}개 구간
                        </span>
                    )}
                </div>
            </div>

            <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
        </Link>
    );
}

interface CallGuideCardProps {
    callGuide: CallGuide;
    className?: string;
}

export function CallGuideCard({ callGuide, className }: CallGuideCardProps) {
    return (
        <Link
            href={`/fieldnote/call/${callGuide.songId}`}
            className={cn(
                "block rounded-lg border overflow-hidden",
                "hover:shadow-md transition-shadow",
                className
            )}
        >
            {/* 썸네일 */}
            <div className="relative aspect-video bg-gray-200">
                {callGuide.song?.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={callGuide.song.thumbnailUrl}
                        alt={callGuide.song.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-12 w-12 text-gray-400" />
                    </div>
                )}

                {/* 오버레이 배지 */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                    {callGuide.status === "verified" && (
                        <span className="flex items-center gap-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            검증됨
                        </span>
                    )}
                </div>

                {/* 엔트리 수 */}
                <div className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-2 py-0.5 rounded">
                    {callGuide.entries.length}개 구간
                </div>
            </div>

            {/* 정보 */}
            <div className="p-3">
                <h4 className="font-medium truncate">{callGuide.song?.title}</h4>
                <p className="text-sm text-muted-foreground truncate">
                    {callGuide.song?.artistName}
                </p>

                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {callGuide.helpfulCount}
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        기여자 {callGuide.contributors.length}명
                    </span>
                </div>
            </div>
        </Link>
    );
}
