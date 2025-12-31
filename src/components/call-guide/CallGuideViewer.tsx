"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize2,
    Users,
    ThumbsUp,
    Edit3,
    ChevronUp,
    ChevronDown,
    Clock,
    CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    CallGuide,
    CallGuideEntry,
    CALL_TYPE_CONFIG,
    formatTime,
    findActiveEntry,
    findNextEntry,
} from "@/types/call-guide";
import type { YTPlayer } from "@/types/youtube";
import "@/types/youtube";
import { MOCK_USER_PROFILES } from "@/lib/follow-context";

interface CallGuideViewerProps {
    callGuide: CallGuide;
    onEdit?: () => void;
    onHelpful?: () => void;
    isHelpful?: boolean;
    // 개별 엔트리 도움됨
    onEntryHelpful?: (entryId: string) => void;
    isEntryHelpful?: (entryId: string) => boolean;
    getEntryHelpfulCount?: (entryId: string, originalCount: number) => number;
    className?: string;
}

export function CallGuideViewer({
    callGuide,
    onEdit,
    onHelpful,
    isHelpful = false,
    onEntryHelpful,
    isEntryHelpful,
    getEntryHelpfulCount,
    className,
}: CallGuideViewerProps) {
    const [player, setPlayer] = useState<YTPlayer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [showEntryList, setShowEntryList] = useState(true);
    const [activeEntry, setActiveEntry] = useState<CallGuideEntry | null>(null);
    const [nextEntry, setNextEntry] = useState<CallGuideEntry | null>(null);
    const [hoveredEntry, setHoveredEntry] = useState<CallGuideEntry | null>(null);

    const playerContainerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const activeEntryRef = useRef<HTMLDivElement>(null);

    // YouTube IFrame API 로드
    useEffect(() => {
        if (window.YT) {
            initPlayer();
            return;
        }

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            initPlayer();
        };

        return () => {
            if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
            }
            if (player) {
                player.destroy();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initPlayer = useCallback(() => {
        if (!callGuide.song?.youtubeId) return;

        const newPlayer = new window.YT.Player("youtube-player", {
            height: "100%",
            width: "100%",
            videoId: callGuide.song.youtubeId,
            playerVars: {
                playsinline: 1,
                rel: 0,
                modestbranding: 1,
            },
            events: {
                onReady: (event) => {
                    setPlayer(event.target);
                    setDuration(event.target.getDuration());
                    setIsPlayerReady(true);
                },
                onStateChange: (event) => {
                    setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
                },
            },
        });

        return newPlayer;
    }, [callGuide.song?.youtubeId]);

    // 시간 업데이트 인터벌
    useEffect(() => {
        if (!player || !isPlayerReady) return;

        if (isPlaying) {
            timeUpdateIntervalRef.current = setInterval(() => {
                const time = player.getCurrentTime();
                setCurrentTime(time);

                // 현재/다음 엔트리 찾기
                const active = findActiveEntry(callGuide.entries, time);
                const next = findNextEntry(callGuide.entries, time);
                setActiveEntry(active);
                setNextEntry(next);
            }, 100);
        } else {
            if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
            }
        }

        return () => {
            if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
            }
        };
    }, [player, isPlaying, isPlayerReady, callGuide.entries]);

    // 활성 엔트리로 스크롤
    useEffect(() => {
        if (activeEntryRef.current && showEntryList) {
            activeEntryRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    }, [activeEntry, showEntryList]);

    const handlePlayPause = () => {
        if (!player) return;
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    };

    const handleSeek = (seconds: number) => {
        if (!player) return;
        const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
        player.seekTo(newTime, true);
        setCurrentTime(newTime);
    };

    const handleSeekTo = (time: number) => {
        if (!player) return;
        player.seekTo(time, true);
        setCurrentTime(time);
    };

    const handleMuteToggle = () => {
        if (!player) return;
        if (isMuted) {
            player.unMute();
        } else {
            player.mute();
        }
        setIsMuted(!isMuted);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!player || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * duration;
        player.seekTo(newTime, true);
        setCurrentTime(newTime);
    };

    // 키보드 네비게이션
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!player || !isPlayerReady) return;

            switch (e.key) {
                case " ": // 스페이스: 재생/일시정지
                    e.preventDefault();
                    handlePlayPause();
                    break;
                case "ArrowLeft": // 좌측: 10초 뒤로
                    e.preventDefault();
                    handleSeek(-10);
                    break;
                case "ArrowRight": // 우측: 10초 앞으로
                    e.preventDefault();
                    handleSeek(10);
                    break;
                case "ArrowUp": // 위: 이전 엔트리
                    e.preventDefault();
                    jumpToPrevEntry();
                    break;
                case "ArrowDown": // 아래: 다음 엔트리
                    e.preventDefault();
                    jumpToNextEntry();
                    break;
                case "m": // m: 음소거 토글
                    e.preventDefault();
                    handleMuteToggle();
                    break;
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [player, isPlayerReady, currentTime]
    );

    // 이전 엔트리로 이동
    const jumpToPrevEntry = () => {
        const sortedEntries = [...callGuide.entries].sort((a, b) => a.startTime - b.startTime);
        const prevEntry = [...sortedEntries].reverse().find((e) => e.startTime < currentTime - 0.5);
        if (prevEntry) {
            handleSeekTo(prevEntry.startTime);
        } else if (sortedEntries.length > 0) {
            handleSeekTo(0);
        }
    };

    // 다음 엔트리로 이동
    const jumpToNextEntry = () => {
        const next = findNextEntry(callGuide.entries, currentTime);
        if (next) {
            handleSeekTo(next.startTime);
        }
    };

    const getTypeConfig = (type: CallGuideEntry["type"]) => {
        return CALL_TYPE_CONFIG[type];
    };

    // 사용자 ID로 프로필 찾기
    const getUserProfile = (userId: string) => {
        return MOCK_USER_PROFILES.find((u) => u.id === userId);
    };

    // 기여자 목록 (최초 작성자 포함)
    const getContributorProfiles = () => {
        const allContributors = Array.from(new Set([callGuide.createdBy, ...callGuide.contributors]));
        return allContributors
            .map((id) => getUserProfile(id))
            .filter((p): p is NonNullable<typeof p> => p !== undefined);
    };

    return (
        <div
            className={cn("flex flex-col bg-background", className)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* 비디오 플레이어 */}
            <div className="relative aspect-video bg-black">
                <div ref={playerContainerRef} className="absolute inset-0">
                    <div id="youtube-player" className="w-full h-full" />
                </div>

                {/* 현재 콜가이드 오버레이 */}
                {activeEntry && (
                    <div className="absolute bottom-16 left-0 right-0 flex justify-center px-4 pointer-events-none">
                        <div
                            className={cn(
                                "px-4 py-2 rounded-lg backdrop-blur-sm",
                                "bg-black/70 text-white text-center",
                                "animate-in fade-in duration-200"
                            )}
                        >
                            <div className="flex items-center gap-2 justify-center mb-1">
                                <span className="text-lg">{getTypeConfig(activeEntry.type).icon}</span>
                                <span className={cn("text-sm font-medium", getTypeConfig(activeEntry.type).color)}>
                                    {getTypeConfig(activeEntry.type).label}
                                </span>
                            </div>
                            <div className="text-lg font-bold">{activeEntry.text}</div>
                            {activeEntry.instruction && (
                                <div className="text-sm text-gray-300 mt-1">{activeEntry.instruction}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* 다음 엔트리 프리뷰 */}
                {nextEntry && !activeEntry && (
                    <div className="absolute bottom-16 right-4 pointer-events-none">
                        <div className="px-3 py-1 rounded-lg bg-black/50 text-white/70 text-sm">
                            <span className="text-xs">다음: </span>
                            <span>{formatTime(nextEntry.startTime)}</span>
                            <span className="ml-1">{getTypeConfig(nextEntry.type).icon}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* 컨트롤 바 */}
            <div className="bg-gray-900 text-white px-4 py-2">
                {/* 마커 + 프로그레스 바 */}
                <div className="mb-2">
                    {/* 상단 마커 레이어 */}
                    <div className="h-6 relative flex items-end mb-1">
                        {callGuide.entries.map((entry) => {
                            const position = (entry.startTime / (duration || 1)) * 100;
                            const config = getTypeConfig(entry.type);
                            const isActive = activeEntry?.id === entry.id;
                            const isHovered = hoveredEntry?.id === entry.id;
                            const isPassed = entry.endTime
                                ? currentTime > entry.endTime
                                : currentTime > entry.startTime + 3;

                            return (
                                <div
                                    key={entry.id}
                                    className="absolute bottom-0"
                                    style={{ left: `${position}%`, transform: "translateX(-50%)" }}
                                >
                                    {/* 호버 툴팁 */}
                                    {isHovered && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-30 pointer-events-none">
                                            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                                <div className="font-medium">{config.icon} {entry.text}</div>
                                                <div className="text-gray-400">
                                                    {formatTime(entry.startTime)}
                                                    {entry.endTime && ` ~ ${formatTime(entry.endTime)}`}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleSeekTo(entry.startTime)}
                                        onMouseEnter={() => setHoveredEntry(entry)}
                                        onMouseLeave={() => setHoveredEntry(null)}
                                        className={cn(
                                            "flex flex-col items-center transition-all duration-150",
                                            "hover:scale-110 focus:outline-none focus:ring-1 focus:ring-yellow-400 rounded",
                                            isActive && "scale-125 z-20",
                                            isHovered && "scale-110",
                                            isPassed && !isActive && !isHovered && "opacity-50"
                                        )}
                                    >
                                        {/* 아이콘 */}
                                        <span
                                            className={cn(
                                                "text-sm transition-all",
                                                isActive && "animate-pulse text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.7)]",
                                                isHovered && !isActive && "text-teal-300"
                                            )}
                                        >
                                            {config.icon}
                                        </span>
                                        {/* 연결선 */}
                                        <div
                                            className={cn(
                                                "w-0.5 h-1.5 transition-colors",
                                                isActive
                                                    ? "bg-yellow-400"
                                                    : isHovered
                                                        ? "bg-teal-300"
                                                        : isPassed
                                                            ? "bg-teal-400/50"
                                                            : "bg-white/40"
                                            )}
                                        />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* 프로그레스 바 */}
                    <div
                        className="h-2 bg-gray-700 rounded-full cursor-pointer relative"
                        onClick={handleProgressClick}
                    >
                        {/* 엔트리 위치 표시선 */}
                        {callGuide.entries.map((entry) => {
                            const position = (entry.startTime / (duration || 1)) * 100;
                            const isActive = activeEntry?.id === entry.id;

                            return (
                                <div
                                    key={`line-${entry.id}`}
                                    className={cn(
                                        "absolute top-0 w-0.5 h-full transition-colors",
                                        isActive ? "bg-yellow-400 z-15" : "bg-white/20"
                                    )}
                                    style={{ left: `${position}%` }}
                                />
                            );
                        })}
                        {/* 재생된 부분 */}
                        <div
                            className="h-full bg-teal-500 rounded-full relative z-10"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        >
                            {/* 현재 위치 핸들 */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md z-20" />
                        </div>
                    </div>
                </div>

                {/* 컨트롤 버튼 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSeek(-10)}
                            className="p-1 hover:bg-white/10 rounded"
                            disabled={!isPlayerReady}
                        >
                            <SkipBack className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handlePlayPause}
                            className="p-2 hover:bg-white/10 rounded-full"
                            disabled={!isPlayerReady}
                        >
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={() => handleSeek(10)}
                            className="p-1 hover:bg-white/10 rounded"
                            disabled={!isPlayerReady}
                        >
                            <SkipForward className="h-4 w-4" />
                        </button>
                        <span className="text-sm ml-2">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleMuteToggle} className="p-1 hover:bg-white/10 rounded">
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </button>
                        <button className="p-1 hover:bg-white/10 rounded">
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 곡 정보 */}
            <div className="p-4 border-b">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold">{callGuide.song?.title}</h2>
                        <p className="text-sm text-muted-foreground">{callGuide.song?.artistName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {callGuide.status === "verified" && (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                검증됨
                            </span>
                        )}
                    </div>
                </div>

                {/* 기여자 목록 */}
                <div className="mt-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Users className="h-4 w-4" />
                        <span>기여자</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {getContributorProfiles().map((profile, index) => {
                            const isCreator = profile.id === callGuide.createdBy;
                            return (
                                <div
                                    key={profile.id}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-sm",
                                        isCreator
                                            ? "bg-purple-100 text-purple-700"
                                            : "bg-gray-100 text-gray-700"
                                    )}
                                    title={isCreator ? "최초 작성자" : `기여자 #${index}`}
                                >
                                    <span className="text-base">{profile.avatar}</span>
                                    <span className="font-medium">{profile.nickname}</span>
                                    {isCreator && (
                                        <span className="text-xs text-purple-500">(작성자)</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 통계 */}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        v{callGuide.version}
                    </span>
                    <button
                        onClick={onHelpful}
                        className={cn(
                            "flex items-center gap-1 transition-colors",
                            isHelpful ? "text-purple-600" : "hover:text-purple-600"
                        )}
                    >
                        <ThumbsUp className={cn("h-4 w-4", isHelpful && "fill-current")} />
                        {callGuide.helpfulCount}
                    </button>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-1 hover:text-purple-600"
                        >
                            <Edit3 className="h-4 w-4" />
                            편집
                        </button>
                    )}
                </div>
            </div>

            {/* 엔트리 리스트 토글 */}
            <button
                onClick={() => setShowEntryList(!showEntryList)}
                className="flex items-center justify-between w-full px-4 py-2 bg-gray-50 hover:bg-gray-100"
            >
                <span className="text-sm font-medium">콜가이드 타임라인 ({callGuide.entries.length}개)</span>
                {showEntryList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {/* 엔트리 리스트 */}
            {showEntryList && (
                <div className="flex-1 overflow-y-auto max-h-64">
                    {callGuide.entries
                        .sort((a, b) => a.startTime - b.startTime)
                        .map((entry) => {
                            const config = getTypeConfig(entry.type);
                            const isActive = activeEntry?.id === entry.id;

                            return (
                                <div
                                    key={entry.id}
                                    ref={isActive ? activeEntryRef : null}
                                    onClick={() => handleSeekTo(entry.startTime)}
                                    className={cn(
                                        "flex items-start gap-3 px-4 py-3 cursor-pointer border-b",
                                        "hover:bg-gray-50 transition-colors",
                                        isActive && "bg-teal-50 border-l-4 border-l-teal-500"
                                    )}
                                >
                                    {/* 시간 */}
                                    <div className="text-sm text-muted-foreground w-20 shrink-0">
                                        <div>{formatTime(entry.startTime)}</div>
                                        {entry.endTime && (
                                            <div className="text-xs text-gray-400">~ {formatTime(entry.endTime)}</div>
                                        )}
                                    </div>

                                    {/* 타입 아이콘 */}
                                    <div className="text-lg shrink-0">{config.icon}</div>

                                    {/* 내용 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-medium", config.color)}>
                                                {config.label}
                                            </span>
                                            {entry.intensity && (
                                                <span className="text-xs text-gray-400">
                                                    {"!".repeat(entry.intensity)}
                                                </span>
                                            )}
                                            {entry.endTime && (
                                                <span className="text-xs text-gray-400">
                                                    ({Math.round(entry.endTime - entry.startTime)}초)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm font-medium">{entry.text}</div>
                                        {entry.textRomanized && (
                                            <div className="text-xs text-gray-500">{entry.textRomanized}</div>
                                        )}
                                        {entry.instruction && (
                                            <div className="text-xs text-teal-600 mt-1">{entry.instruction}</div>
                                        )}
                                    </div>

                                    {/* 개별 엔트리 도움됨 버튼 */}
                                    {onEntryHelpful && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEntryHelpful(entry.id);
                                            }}
                                            className={cn(
                                                "flex items-center gap-1 px-2 py-1 rounded text-xs shrink-0 transition-colors",
                                                isEntryHelpful?.(entry.id)
                                                    ? "text-purple-600 bg-purple-50"
                                                    : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                                            )}
                                        >
                                            <ThumbsUp className={cn("h-3 w-3", isEntryHelpful?.(entry.id) && "fill-current")} />
                                            <span>
                                                {getEntryHelpfulCount
                                                    ? getEntryHelpfulCount(entry.id, entry.helpfulCount || 0)
                                                    : entry.helpfulCount || 0}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
