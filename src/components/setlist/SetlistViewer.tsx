"use client";

import { useState } from "react";
import {
    Music,
    ThumbsUp,
    Edit2,
    User,
    Clock,
    Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetlist } from "@/lib/setlist-context";
import { Setlist } from "@/types/setlist";
import { SetlistEditorModal } from "./SetlistEditorModal";

interface SetlistViewerProps {
    setlist: Setlist;
    onEdit?: () => void;
}

export function SetlistViewer({ setlist, onEdit }: SetlistViewerProps) {
    const { toggleHelpful, helpfulSetlistIds, currentUserId } = useSetlist();
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const isHelpful = helpfulSetlistIds.includes(setlist.id);
    const isOwner = setlist.createdBy === currentUserId;

    const regularSongs = setlist.songs.filter(s => !s.isEncore);
    const encoreSongs = setlist.songs.filter(s => s.isEncore);

    const handleHelpful = async () => {
        await toggleHelpful(setlist.id);
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
        });
    };

    return (
        <>
            <div className="border rounded-xl overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Music className="h-5 w-5 text-primary" />
                            <h3 className="font-bold">{setlist.artistName}</h3>
                        </div>
                        {isOwner && (
                            <button
                                onClick={() => setIsEditorOpen(true)}
                                className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{setlist.createdByNickname}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(setlist.createdAt)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    <ol className="space-y-2">
                        {regularSongs.map((song, index) => (
                            <li key={song.id} className="flex items-start gap-3">
                                <span className="text-sm font-medium text-muted-foreground w-6 text-right">
                                    {index + 1}.
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{song.title}</p>
                                    {song.note && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {song.note}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>

                    {encoreSongs.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 mb-3">
                                <Star className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-bold text-amber-600">ENCORE</span>
                            </div>
                            <ol className="space-y-2">
                                {encoreSongs.map((song, index) => (
                                    <li key={song.id} className="flex items-start gap-3">
                                        <span className="text-sm font-medium text-amber-500 w-6 text-right">
                                            E{index + 1}.
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{song.title}</p>
                                            {song.note && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {song.note}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>

                <div className="px-4 pb-4">
                    <button
                        onClick={handleHelpful}
                        className={cn(
                            "w-full py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2",
                            isHelpful
                                ? "bg-primary/10 border-primary text-primary"
                                : "hover:bg-muted"
                        )}
                    >
                        <ThumbsUp className={cn("h-4 w-4", isHelpful && "fill-current")} />
                        <span>도움이 됐어요</span>
                        {setlist.helpfulCount > 0 && (
                            <span className="text-muted-foreground">
                                {setlist.helpfulCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {isOwner && (
                <SetlistEditorModal
                    isOpen={isEditorOpen}
                    onClose={() => setIsEditorOpen(false)}
                    slotId={setlist.slotId}
                    eventId={setlist.eventId}
                    artistId={setlist.artistId}
                    artistName={setlist.artistName}
                    existingSetlist={setlist}
                />
            )}
        </>
    );
}

interface SetlistListProps {
    eventId: string;
}

export function SetlistList({ eventId }: SetlistListProps) {
    const { getSetlistsByEvent } = useSetlist();
    const setlists = getSetlistsByEvent(eventId);

    if (setlists.length === 0) {
        return (
            <div className="text-center py-12">
                <Music className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                    아직 등록된 셋리스트가 없어요
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    공연에 참여하셨다면 셋리스트를 공유해주세요!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {setlists.map(setlist => (
                <SetlistViewer key={setlist.id} setlist={setlist} />
            ))}
        </div>
    );
}
