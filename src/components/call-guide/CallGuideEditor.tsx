"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Plus,
    Trash2,
    Save,
    X,
    Clock,
    ChevronDown,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    CallGuide,
    CallGuideEntry,
    CallType,
    CALL_TYPE_CONFIG,
    CALL_TYPES,
    formatTime,
    parseTime,
    CreateCallGuideEntryInput,
} from "@/types/call-guide";
import type { YTPlayer } from "@/types/youtube";
import "@/types/youtube";

interface CallGuideEditorProps {
    callGuide: CallGuide;
    onSave: (entries: CallGuideEntry[], changeDescription?: string) => void;
    onCancel: () => void;
    className?: string;
}

// CALL_TYPES는 types/call-guide.ts에서 import됨

export function CallGuideEditor({
    callGuide,
    onSave,
    onCancel,
    className,
}: CallGuideEditorProps) {
    const [player, setPlayer] = useState<YTPlayer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    const [entries, setEntries] = useState<CallGuideEntry[]>([...callGuide.entries]);
    const [editingEntry, setEditingEntry] = useState<string | null>(null);
    const [newEntry, setNewEntry] = useState<Partial<CreateCallGuideEntryInput> | null>(null);
    const [changeDescription, setChangeDescription] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

        new window.YT.Player("youtube-editor-player", {
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
    }, [callGuide.song?.youtubeId]);

    // 시간 업데이트 인터벌
    useEffect(() => {
        if (!player || !isPlayerReady) return;

        if (isPlaying) {
            timeUpdateIntervalRef.current = setInterval(() => {
                setCurrentTime(player.getCurrentTime());
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
    }, [player, isPlaying, isPlayerReady]);

    // 변경 감지
    useEffect(() => {
        const originalJson = JSON.stringify(callGuide.entries);
        const currentJson = JSON.stringify(entries);
        setHasChanges(originalJson !== currentJson);
    }, [entries, callGuide.entries]);

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

    // 현재 시간에 새 엔트리 추가 시작
    const handleAddAtCurrentTime = () => {
        if (isPlaying && player) {
            player.pauseVideo();
        }
        setNewEntry({
            startTime: currentTime,
            type: "lyrics",
            text: "",
        });
    };

    // 새 엔트리 저장
    const handleSaveNewEntry = () => {
        if (!newEntry || !newEntry.text || newEntry.startTime === undefined) return;

        const entry: CallGuideEntry = {
            id: `entry-${Date.now()}`,
            startTime: newEntry.startTime,
            endTime: newEntry.endTime,
            type: newEntry.type || "lyrics",
            text: newEntry.text,
            textRomanized: newEntry.textRomanized,
            textOriginal: newEntry.textOriginal,
            instruction: newEntry.instruction,
            intensity: newEntry.intensity,
        };

        setEntries((prev) =>
            [...prev, entry].sort((a, b) => a.startTime - b.startTime)
        );
        setNewEntry(null);
    };

    // 엔트리 수정
    const handleUpdateEntry = (entryId: string, updates: Partial<CallGuideEntry>) => {
        setEntries((prev) =>
            prev
                .map((e) => (e.id === entryId ? { ...e, ...updates } : e))
                .sort((a, b) => a.startTime - b.startTime)
        );
    };

    // 엔트리 삭제
    const handleDeleteEntry = (entryId: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
    };

    // 저장
    const handleSave = () => {
        onSave(entries, changeDescription || undefined);
    };

    const getTypeConfig = (type: CallType) => {
        return CALL_TYPE_CONFIG[type];
    };

    return (
        <div className={cn("flex flex-col bg-background h-full", className)}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold">콜가이드 편집</h2>
                    {hasChanges && (
                        <span className="text-xs text-orange-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            저장되지 않은 변경
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={cn(
                            "flex items-center gap-1 px-3 py-1 text-sm rounded",
                            hasChanges
                                ? "bg-purple-600 text-white hover:bg-purple-700"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                    >
                        <Save className="h-4 w-4" />
                        저장
                    </button>
                </div>
            </div>

            {/* 비디오 플레이어 */}
            <div className="relative aspect-video bg-black">
                <div id="youtube-editor-player" className="w-full h-full" />

                {/* 현재 시간 오버레이 */}
                <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 text-white rounded text-sm">
                    {formatTime(currentTime, true)}
                </div>
            </div>

            {/* 컨트롤 바 */}
            <div className="bg-gray-900 text-white px-4 py-2">
                {/* 프로그레스 바 */}
                <div
                    className="h-2 bg-gray-700 rounded-full mb-2 cursor-pointer relative"
                    onClick={(e) => {
                        if (!player || !duration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percentage = x / rect.width;
                        const newTime = percentage * duration;
                        player.seekTo(newTime, true);
                        setCurrentTime(newTime);
                    }}
                >
                    {/* 엔트리 마커 */}
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-purple-400 rounded-sm cursor-pointer hover:bg-purple-300"
                            style={{ left: `${(entry.startTime / (duration || 1)) * 100}%` }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSeekTo(entry.startTime);
                            }}
                            title={`${formatTime(entry.startTime)} - ${entry.text}`}
                        />
                    ))}
                    {/* 현재 위치 */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white"
                        style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                </div>

                {/* 컨트롤 버튼 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSeek(-5)}
                            className="p-1 hover:bg-white/10 rounded"
                            disabled={!isPlayerReady}
                            title="-5초"
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
                            onClick={() => handleSeek(5)}
                            className="p-1 hover:bg-white/10 rounded"
                            disabled={!isPlayerReady}
                            title="+5초"
                        >
                            <SkipForward className="h-4 w-4" />
                        </button>
                        <span className="text-sm ml-2">
                            {formatTime(currentTime, true)} / {formatTime(duration)}
                        </span>
                    </div>

                    <button
                        onClick={handleAddAtCurrentTime}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                        disabled={!isPlayerReady}
                    >
                        <Plus className="h-4 w-4" />
                        현재 위치에 추가
                    </button>
                </div>
            </div>

            {/* 새 엔트리 폼 */}
            {newEntry && (
                <div className="p-4 bg-purple-50 border-b">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">새 엔트리 추가</span>
                        <button onClick={() => setNewEntry(null)}>
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* 시간 */}
                        <div>
                            <label className="text-xs text-gray-500">시간 (시작 ~ 끝)</label>
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    value={formatTime(newEntry.startTime || 0, true)}
                                    onChange={(e) => {
                                        const time = parseTime(e.target.value);
                                        if (time !== null) {
                                            setNewEntry((prev) => ({ ...prev, startTime: time }));
                                        }
                                    }}
                                    className="w-16 px-2 py-1 border rounded text-sm"
                                    placeholder="시작"
                                />
                                <span className="text-gray-400">~</span>
                                <input
                                    type="text"
                                    value={newEntry.endTime ? formatTime(newEntry.endTime, true) : ""}
                                    onChange={(e) => {
                                        if (e.target.value === "") {
                                            setNewEntry((prev) => ({ ...prev, endTime: undefined }));
                                        } else {
                                            const time = parseTime(e.target.value);
                                            if (time !== null) {
                                                setNewEntry((prev) => ({ ...prev, endTime: time }));
                                            }
                                        }
                                    }}
                                    className="w-16 px-2 py-1 border rounded text-sm"
                                    placeholder="끝"
                                />
                            </div>
                        </div>

                        {/* 타입 */}
                        <div>
                            <label className="text-xs text-gray-500">타입</label>
                            <div className="relative">
                                <select
                                    value={newEntry.type || "lyrics"}
                                    onChange={(e) =>
                                        setNewEntry((prev) => ({ ...prev, type: e.target.value as CallType }))
                                    }
                                    className="w-full px-2 py-1 border rounded text-sm appearance-none"
                                >
                                    {CALL_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {getTypeConfig(type).icon} {getTypeConfig(type).label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
                            </div>
                        </div>

                        {/* 텍스트 */}
                        <div className="col-span-2">
                            <label className="text-xs text-gray-500">
                                {newEntry.type === "lyrics" ? "가사" : "텍스트 (호응/지시)"}
                            </label>
                            <input
                                type="text"
                                value={newEntry.text || ""}
                                onChange={(e) => setNewEntry((prev) => ({ ...prev, text: e.target.value }))}
                                placeholder={
                                    getTypeConfig(newEntry.type || "lyrics").examples[0] ||
                                    "표시할 텍스트를 입력하세요"
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                                autoFocus
                            />
                            {/* 타입별 예시 표시 */}
                            {newEntry.type && getTypeConfig(newEntry.type).examples.length > 0 && (
                                <div className="mt-1 text-xs text-gray-400">
                                    예시: {getTypeConfig(newEntry.type).examples.slice(0, 3).join(", ")}
                                </div>
                            )}
                        </div>

                        {/* 설명 (lyrics 타입 제외) */}
                        {newEntry.type !== "lyrics" && getTypeConfig(newEntry.type || "sing").allowInstruction && (
                            <div className="col-span-2">
                                <label className="text-xs text-gray-500">설명 (선택)</label>
                                <input
                                    type="text"
                                    value={newEntry.instruction || ""}
                                    onChange={(e) =>
                                        setNewEntry((prev) => ({ ...prev, instruction: e.target.value }))
                                    }
                                    placeholder="추가 설명 (예: 손을 좌우로 흔들기)"
                                    className="w-full px-2 py-1 border rounded text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-3">
                        <button
                            onClick={() => setNewEntry(null)}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSaveNewEntry}
                            disabled={!newEntry.text}
                            className={cn(
                                "px-3 py-1 text-sm rounded",
                                newEntry.text
                                    ? "bg-purple-600 text-white hover:bg-purple-700"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            추가
                        </button>
                    </div>
                </div>
            )}

            {/* 엔트리 리스트 */}
            <div className="flex-1 overflow-y-auto">
                {entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                        <Plus className="h-8 w-8 mb-2" />
                        <p>아직 엔트리가 없습니다</p>
                        <p className="text-sm">영상을 재생하며 + 버튼으로 추가하세요</p>
                    </div>
                ) : (
                    entries.map((entry) => {
                        const config = getTypeConfig(entry.type);
                        const isEditing = editingEntry === entry.id;

                        return (
                            <div
                                key={entry.id}
                                className={cn(
                                    "flex items-start gap-3 px-4 py-3 border-b",
                                    isEditing && "bg-blue-50"
                                )}
                            >
                                {/* 시간 */}
                                <button
                                    onClick={() => handleSeekTo(entry.startTime)}
                                    className="text-sm text-purple-600 hover:underline w-20 shrink-0 text-left"
                                >
                                    <div>{formatTime(entry.startTime)}</div>
                                    {entry.endTime && (
                                        <div className="text-xs text-gray-400">~ {formatTime(entry.endTime)}</div>
                                    )}
                                </button>

                                {/* 타입 아이콘 */}
                                <div className="text-lg shrink-0">{config.icon}</div>

                                {/* 내용 */}
                                {isEditing ? (
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={entry.type}
                                                onChange={(e) =>
                                                    handleUpdateEntry(entry.id, {
                                                        type: e.target.value as CallType,
                                                    })
                                                }
                                                className="px-2 py-1 border rounded text-sm"
                                            >
                                                {CALL_TYPES.map((type) => (
                                                    <option key={type} value={type}>
                                                        {getTypeConfig(type).icon} {getTypeConfig(type).label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={formatTime(entry.startTime, true)}
                                                    onChange={(e) => {
                                                        const time = parseTime(e.target.value);
                                                        if (time !== null) {
                                                            handleUpdateEntry(entry.id, { startTime: time });
                                                        }
                                                    }}
                                                    className="w-16 px-2 py-1 border rounded text-sm"
                                                    placeholder="시작"
                                                />
                                                <span className="text-gray-400">~</span>
                                                <input
                                                    type="text"
                                                    value={entry.endTime ? formatTime(entry.endTime, true) : ""}
                                                    onChange={(e) => {
                                                        if (e.target.value === "") {
                                                            handleUpdateEntry(entry.id, { endTime: undefined });
                                                        } else {
                                                            const time = parseTime(e.target.value);
                                                            if (time !== null) {
                                                                handleUpdateEntry(entry.id, { endTime: time });
                                                            }
                                                        }
                                                    }}
                                                    className="w-16 px-2 py-1 border rounded text-sm"
                                                    placeholder="끝"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={entry.text}
                                                onChange={(e) =>
                                                    handleUpdateEntry(entry.id, { text: e.target.value })
                                                }
                                                placeholder={getTypeConfig(entry.type).examples[0] || ""}
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                            {/* 타입별 예시 표시 */}
                                            {getTypeConfig(entry.type).examples.length > 0 && (
                                                <div className="mt-1 text-xs text-gray-400">
                                                    예시: {getTypeConfig(entry.type).examples.slice(0, 3).join(", ")}
                                                </div>
                                            )}
                                        </div>
                                        {/* 설명 (lyrics 타입 제외) */}
                                        {entry.type !== "lyrics" && getTypeConfig(entry.type).allowInstruction && (
                                            <input
                                                type="text"
                                                value={entry.instruction || ""}
                                                onChange={(e) =>
                                                    handleUpdateEntry(entry.id, { instruction: e.target.value })
                                                }
                                                placeholder="설명 (선택)"
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        )}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setEditingEntry(null)}
                                                className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded"
                                            >
                                                완료
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => setEditingEntry(entry.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-medium", config.color)}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <div className="text-sm">{entry.text}</div>
                                        {entry.instruction && (
                                            <div className="text-xs text-gray-500">{entry.instruction}</div>
                                        )}
                                    </div>
                                )}

                                {/* 삭제 */}
                                <button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 변경 설명 (저장 시) */}
            {hasChanges && (
                <div className="p-4 border-t bg-gray-50">
                    <label className="text-sm text-gray-600">변경 설명 (선택)</label>
                    <input
                        type="text"
                        value={changeDescription}
                        onChange={(e) => setChangeDescription(e.target.value)}
                        placeholder="예: 떼창 구간 추가, 타이밍 수정"
                        className="w-full mt-1 px-3 py-2 border rounded text-sm"
                    />
                </div>
            )}
        </div>
    );
}
