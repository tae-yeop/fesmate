"use client";

import { useState, useCallback } from "react";
import {
    X,
    Music,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Save,
    Send,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetlist } from "@/lib/setlist-context";
import {
    Setlist,
    SetlistFormSong,
    createEmptySong,
    formSongToInput,
} from "@/types/setlist";

interface SetlistEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    slotId: string;
    eventId: string;
    artistId: string;
    artistName: string;
    existingSetlist?: Setlist;
    onSuccess?: (setlist: Setlist) => void;
}

export function SetlistEditorModal({
    isOpen,
    onClose,
    slotId,
    eventId,
    artistId,
    artistName,
    existingSetlist,
    onSuccess,
}: SetlistEditorModalProps) {
    const { createSetlist, updateSetlist, isLoading } = useSetlist();
    
    const [songs, setSongs] = useState<SetlistFormSong[]>(() => {
        if (existingSetlist) {
            return existingSetlist.songs.map((s, i) => ({
                tempId: s.id,
                order: i + 1,
                title: s.title,
                isEncore: s.isEncore,
                note: s.note || "",
            }));
        }
        return [createEmptySong(1)];
    });

    const addSong = useCallback(() => {
        setSongs(prev => [...prev, createEmptySong(prev.length + 1)]);
    }, []);

    const removeSong = useCallback((tempId: string) => {
        setSongs(prev => {
            const filtered = prev.filter(s => s.tempId !== tempId);
            return filtered.map((s, i) => ({ ...s, order: i + 1 }));
        });
    }, []);

    const updateSong = useCallback((tempId: string, field: keyof SetlistFormSong, value: string | boolean | number) => {
        setSongs(prev => prev.map(s => 
            s.tempId === tempId ? { ...s, [field]: value } : s
        ));
    }, []);

    const moveSong = useCallback((tempId: string, direction: 'up' | 'down') => {
        setSongs(prev => {
            const index = prev.findIndex(s => s.tempId === tempId);
            if (index === -1) return prev;
            
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;
            
            const newSongs = [...prev];
            [newSongs[index], newSongs[newIndex]] = [newSongs[newIndex], newSongs[index]];
            
            return newSongs.map((s, i) => ({ ...s, order: i + 1 }));
        });
    }, []);

    const handleSave = async (publish: boolean) => {
        const validSongs = songs.filter(s => s.title.trim());
        if (validSongs.length === 0) return;

        const songInputs = validSongs.map(formSongToInput);

        if (existingSetlist) {
            const success = await updateSetlist(existingSetlist.id, {
                songs: songInputs,
                status: publish ? "published" : "draft",
            });
            if (success) {
                onSuccess?.({ ...existingSetlist, songs: songInputs as Setlist['songs'], status: publish ? "published" : "draft" });
                onClose();
            }
        } else {
            const result = await createSetlist({
                slotId,
                eventId,
                artistId,
                artistName,
                songs: songInputs,
            });
            if (result) {
                if (publish) {
                    await updateSetlist(result.id, { status: "published" });
                }
                onSuccess?.(result);
                onClose();
            }
        }
    };

    const hasValidSongs = songs.some(s => s.title.trim());

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-background rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <Music className="h-5 w-5 text-primary" />
                        <div>
                            <h2 className="font-bold">셋리스트 {existingSetlist ? "편집" : "추가"}</h2>
                            <p className="text-xs text-muted-foreground">{artistName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                        {songs.map((song, index) => (
                            <div
                                key={song.tempId}
                                className={cn(
                                    "p-3 border rounded-lg space-y-2",
                                    song.isEncore && "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground w-6">
                                        {song.order}.
                                    </span>
                                    <input
                                        type="text"
                                        value={song.title}
                                        onChange={(e) => updateSong(song.tempId, 'title', e.target.value)}
                                        placeholder="곡 제목"
                                        className="flex-1 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                    />
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => moveSong(song.tempId, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => moveSong(song.tempId, 'down')}
                                            disabled={index === songs.length - 1}
                                            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => removeSong(song.tempId)}
                                            disabled={songs.length === 1}
                                            className="p-1.5 rounded hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pl-8">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={song.isEncore}
                                            onChange={(e) => updateSong(song.tempId, 'isEncore', e.target.checked)}
                                            className="rounded border-muted-foreground"
                                        />
                                        <span className={song.isEncore ? "text-amber-700" : "text-muted-foreground"}>
                                            앵콜
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={song.note}
                                        onChange={(e) => updateSong(song.tempId, 'note', e.target.value)}
                                        placeholder="메모 (선택)"
                                        className="flex-1 px-2 py-1 rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs"
                                    />
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addSong}
                            className="w-full py-3 border-2 border-dashed rounded-lg text-sm text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            곡 추가
                        </button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4 text-center">
                        드래그 대신 화살표 버튼으로 순서를 변경할 수 있어요
                    </p>
                </div>

                <div className="p-4 border-t flex gap-2 shrink-0">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={!hasValidSongs || isLoading}
                        className="flex-1 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        임시저장
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={!hasValidSongs || isLoading}
                        className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        공개하기
                    </button>
                </div>
            </div>
        </div>
    );
}
