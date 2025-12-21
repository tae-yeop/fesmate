"use client";

import Link from "next/link";
import { X, Instagram, Youtube, Music, ExternalLink, Mic2, Sparkles, NotebookPen, ChevronRight } from "lucide-react";
import { Artist, ArtistSocialLink } from "@/types/event";
import { cn } from "@/lib/utils";
import { findCallGuideArtistByName } from "@/lib/mock-call-guide";

interface ArtistDetailModalProps {
    artist: Artist;
    isOpen: boolean;
    onClose: () => void;
}

const SOCIAL_ICONS: Record<ArtistSocialLink["type"], React.ReactNode> = {
    instagram: <Instagram className="h-5 w-5" />,
    youtube: <Youtube className="h-5 w-5" />,
    spotify: <Music className="h-5 w-5" />,
    twitter: <ExternalLink className="h-5 w-5" />,
    website: <ExternalLink className="h-5 w-5" />,
};

const SOCIAL_LABELS: Record<ArtistSocialLink["type"], string> = {
    instagram: "Instagram",
    youtube: "YouTube",
    spotify: "Spotify",
    twitter: "Twitter",
    website: "Website",
};

const SOCIAL_COLORS: Record<ArtistSocialLink["type"], string> = {
    instagram: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    youtube: "bg-red-600 text-white",
    spotify: "bg-green-600 text-white",
    twitter: "bg-sky-500 text-white",
    website: "bg-gray-600 text-white",
};

export function ArtistDetailModal({ artist, isOpen, onClose }: ArtistDetailModalProps) {
    if (!isOpen) return null;

    // 콜가이드 아티스트 정보 확인
    const callGuideArtist = findCallGuideArtistByName(artist.name);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-50 w-full max-w-lg mx-0 sm:mx-4 bg-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="relative">
                    {/* Artist Image Background */}
                    <div className="h-40 bg-gradient-to-b from-primary/20 to-background overflow-hidden">
                        {artist.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={artist.image}
                                alt={artist.name}
                                className="w-full h-full object-cover opacity-50"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">
                                🎤
                            </div>
                        )}
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* Artist Profile */}
                    <div className="absolute -bottom-12 left-6">
                        <div
                            className="h-24 w-24 rounded-full border-4 border-card bg-muted overflow-hidden shadow-lg"
                            style={artist.lightstickColor ? { boxShadow: `0 0 20px ${artist.lightstickColor}40` } : undefined}
                        >
                            {artist.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={artist.image}
                                    alt={artist.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-3xl">
                                    🎤
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-14 px-6 pb-6 overflow-y-auto max-h-[calc(85vh-10rem)]">
                    {/* Name & Genre */}
                    <div className="mb-4">
                        <h2 className="text-xl font-bold">{artist.name}</h2>
                        <p className="text-sm text-muted-foreground">{artist.genre}</p>
                    </div>

                    {/* Lightstick Color */}
                    {artist.lightstickColor && (
                        <div className="mb-4 flex items-center gap-2">
                            <div
                                className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                                style={{ backgroundColor: artist.lightstickColor }}
                            />
                            <span className="text-sm text-muted-foreground">응원봉 색상</span>
                        </div>
                    )}

                    {/* Fanchant / 호응법 */}
                    {artist.fanchant && (
                        <div className="mb-4 rounded-lg border bg-muted/50 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <h3 className="font-bold text-sm">호응법</h3>
                            </div>
                            <p className="text-sm leading-relaxed">{artist.fanchant}</p>
                        </div>
                    )}

                    {/* FieldNote 링크 */}
                    {callGuideArtist && (
                        <Link
                            href={`/fieldnote/artist/${callGuideArtist.id}`}
                            className="flex items-center gap-3 mb-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 hover:from-purple-100 hover:to-purple-150 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                                <NotebookPen className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-purple-900">곡별 호응법 가이드</p>
                                <p className="text-xs text-purple-600">
                                    {callGuideArtist.songCount}곡 · {callGuideArtist.guideCount}개 가이드
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-purple-400 shrink-0" />
                        </Link>
                    )}

                    {/* Popular Songs */}
                    {artist.popularSongs && artist.popularSongs.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Mic2 className="h-4 w-4 text-primary" />
                                <h3 className="font-bold text-sm">대표곡</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {artist.popularSongs.map((song, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 rounded-full bg-muted text-sm"
                                    >
                                        {song}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Social Links */}
                    {artist.socialLinks && artist.socialLinks.length > 0 && (
                        <div className="mb-4">
                            <h3 className="font-bold text-sm mb-2">소셜 미디어</h3>
                            <div className="flex flex-wrap gap-2">
                                {artist.socialLinks.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80",
                                            SOCIAL_COLORS[link.type]
                                        )}
                                    >
                                        {SOCIAL_ICONS[link.type]}
                                        {SOCIAL_LABELS[link.type]}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No additional info message */}
                    {!artist.fanchant && !artist.popularSongs?.length && !artist.socialLinks?.length && (
                        <div className="text-center py-6 text-muted-foreground">
                            <p className="text-sm">아직 추가 정보가 없습니다.</p>
                            <p className="text-xs mt-1">곧 업데이트될 예정이에요!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
