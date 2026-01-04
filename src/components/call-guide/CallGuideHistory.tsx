"use client";

import { useState } from "react";
import { History, ChevronDown, ChevronUp, User, Clock, RotateCcw } from "lucide-react";
import { CallGuideVersion, CallGuideEntry } from "@/types/call-guide";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/utils/date-format";
import { MOCK_USER_PROFILES } from "@/lib/mock-user-profiles";

interface CallGuideHistoryProps {
    versions: CallGuideVersion[];
    currentVersion: number;
    onRestore?: (version: CallGuideVersion) => void;
    className?: string;
}

/**
 * 콜가이드 버전 히스토리 UI
 * - 버전별 변경 내역 표시
 * - 이전 버전 복원 기능
 */
export function CallGuideHistory({
    versions,
    currentVersion,
    onRestore,
    className,
}: CallGuideHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

    if (versions.length === 0) {
        return null;
    }

    const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

    const getUserName = (userId: string) => {
        const user = MOCK_USER_PROFILES.find((u) => u.id === userId);
        return user?.nickname || "알 수 없음";
    };

    const formatTimeAgo = (date: Date) => {
        return getRelativeTime(date);
    };

    const formatDuration = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className={cn("bg-white border border-gray-200 rounded-lg", className)}>
            {/* 헤더 */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm">버전 히스토리</span>
                    <span className="text-xs text-gray-500">
                        (v{currentVersion}, {versions.length}개 버전)
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
            </button>

            {/* 버전 목록 */}
            {isExpanded && (
                <div className="border-t border-gray-100 max-h-80 overflow-y-auto">
                    {sortedVersions.map((version, index) => (
                        <div
                            key={version.id}
                            className={cn(
                                "border-b border-gray-50 last:border-b-0",
                                version.version === currentVersion && "bg-indigo-50"
                            )}
                        >
                            {/* 버전 요약 */}
                            <div
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                                onClick={() =>
                                    setExpandedVersion(
                                        expandedVersion === version.version
                                            ? null
                                            : version.version
                                    )
                                }
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            v{version.version}
                                        </span>
                                        {version.version === currentVersion && (
                                            <span className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                                                현재
                                            </span>
                                        )}
                                    </div>
                                    {version.changeDescription && (
                                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                                            {version.changeDescription}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {getUserName(version.editedBy)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatTimeAgo(version.editedAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* 복원 버튼 */}
                                {version.version !== currentVersion && onRestore && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRestore(version);
                                        }}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        복원
                                    </button>
                                )}
                            </div>

                            {/* 엔트리 상세 (확장 시) */}
                            {expandedVersion === version.version && (
                                <div className="px-3 pb-3">
                                    <div className="bg-gray-50 rounded-lg p-2 max-h-40 overflow-y-auto">
                                        <p className="text-xs text-gray-500 mb-2">
                                            엔트리 {version.entries.length}개
                                        </p>
                                        <div className="space-y-1">
                                            {version.entries.slice(0, 5).map((entry, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 text-xs"
                                                >
                                                    <span className="text-gray-400 font-mono">
                                                        {formatDuration(entry.startTime)}
                                                    </span>
                                                    <span className={cn(
                                                        "px-1 rounded text-[10px]",
                                                        entry.type === "sing" && "bg-amber-100 text-amber-700",
                                                        entry.type === "lyrics" && "bg-blue-100 text-blue-700",
                                                        entry.type === "action" && "bg-green-100 text-green-700",
                                                        entry.type === "jump" && "bg-red-100 text-red-700",
                                                        entry.type === "clap" && "bg-pink-100 text-pink-700",
                                                        entry.type === "light" && "bg-yellow-100 text-yellow-700"
                                                    )}>
                                                        {entry.type}
                                                    </span>
                                                    <span className="text-gray-700 truncate">
                                                        {entry.text}
                                                    </span>
                                                </div>
                                            ))}
                                            {version.entries.length > 5 && (
                                                <p className="text-xs text-gray-400">
                                                    ... 외 {version.entries.length - 5}개
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * 버전 비교 뷰 (두 버전 간 diff 표시)
 */
interface VersionDiffProps {
    oldVersion: CallGuideVersion;
    newVersion: CallGuideVersion;
}

export function CallGuideVersionDiff({ oldVersion, newVersion }: VersionDiffProps) {
    const getEntryKey = (entry: CallGuideEntry) =>
        `${entry.startTime}-${entry.type}-${entry.text}`;

    const oldEntryKeys = new Set(oldVersion.entries.map(getEntryKey));
    const newEntryKeys = new Set(newVersion.entries.map(getEntryKey));

    const added = newVersion.entries.filter((e) => !oldEntryKeys.has(getEntryKey(e)));
    const removed = oldVersion.entries.filter((e) => !newEntryKeys.has(getEntryKey(e)));
    const unchanged = newVersion.entries.filter((e) => oldEntryKeys.has(getEntryKey(e)));

    const formatDuration = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-3">
                v{oldVersion.version} → v{newVersion.version} 변경사항
            </h4>

            {added.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs text-green-600 font-medium mb-1">
                        + {added.length}개 추가
                    </p>
                    <div className="space-y-1">
                        {added.map((entry, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 text-xs bg-green-50 p-1 rounded"
                            >
                                <span className="text-gray-500 font-mono">
                                    {formatDuration(entry.startTime)}
                                </span>
                                <span className="text-green-700">{entry.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {removed.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs text-red-600 font-medium mb-1">
                        - {removed.length}개 삭제
                    </p>
                    <div className="space-y-1">
                        {removed.map((entry, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 text-xs bg-red-50 p-1 rounded"
                            >
                                <span className="text-gray-500 font-mono">
                                    {formatDuration(entry.startTime)}
                                </span>
                                <span className="text-red-700 line-through">
                                    {entry.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {added.length === 0 && removed.length === 0 && (
                <p className="text-xs text-gray-500">변경된 엔트리가 없습니다</p>
            )}
        </div>
    );
}
