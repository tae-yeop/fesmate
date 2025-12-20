"use client";

import { useState } from "react";
import { Users, ChevronRight, Sparkles } from "lucide-react";
import { Event, Artist } from "@/types/event";
import { ArtistDetailModal } from "@/components/artists/ArtistDetailModal";

interface ArtistsTabProps {
    event: Event;
}

export function ArtistsTab({ event }: ArtistsTabProps) {
    const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

    return (
        <div className="space-y-4">
            {event.artists && event.artists.length > 0 ? (
                event.artists.map((artist) => (
                    <button
                        key={artist.id}
                        onClick={() => setSelectedArtist(artist)}
                        className="w-full flex items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors text-left"
                    >
                        <div
                            className="h-16 w-16 rounded-full bg-muted overflow-hidden flex-shrink-0"
                            style={artist.lightstickColor ? { boxShadow: `0 0 12px ${artist.lightstickColor}50` } : undefined}
                        >
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
                        <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{artist.name}</p>
                            <p className="text-sm text-muted-foreground">{artist.genre}</p>
                            {(artist.fanchant || artist.popularSongs?.length) && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                                    <Sparkles className="h-3 w-3" />
                                    <span>호응법/대표곡 보기</span>
                                </div>
                            )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </button>
                ))
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">아티스트 정보가 없습니다</p>
                </div>
            )}

            {/* Artist Detail Modal */}
            {selectedArtist && (
                <ArtistDetailModal
                    artist={selectedArtist}
                    isOpen={!!selectedArtist}
                    onClose={() => setSelectedArtist(null)}
                />
            )}
        </div>
    );
}
