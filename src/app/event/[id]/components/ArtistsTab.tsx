"use client";

import { Users } from "lucide-react";
import { Event } from "@/types/event";

interface ArtistsTabProps {
    event: Event;
}

export function ArtistsTab({ event }: ArtistsTabProps) {
    return (
        <div className="space-y-4">
            {event.artists && event.artists.length > 0 ? (
                event.artists.map((artist) => (
                    <div
                        key={artist.id}
                        className="flex items-center gap-4 rounded-lg border bg-card p-4"
                    >
                        <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
                            {artist.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={artist.image}
                                    alt={artist.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-2xl">
                                    🎤
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold">{artist.name}</p>
                            <p className="text-sm text-muted-foreground">{artist.genre}</p>
                        </div>
                        <button className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-accent">
                            팔로우
                        </button>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">아티스트 정보가 없습니다</p>
                </div>
            )}
        </div>
    );
}
