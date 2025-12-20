"use client";

import { Calendar, MapPin, ExternalLink } from "lucide-react";
import { Event } from "@/types/event";
import { formatDateTime } from "@/lib/utils/date-format";

interface OverviewTabProps {
    event: Event;
}

export function OverviewTab({ event }: OverviewTabProps) {
    return (
        <div className="space-y-6">
            {/* 기본 정보 */}
            <section>
                <h3 className="text-lg font-bold mb-3">행사 정보</h3>
                <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium">일시</p>
                            <p className="text-muted-foreground">{formatDateTime(event.startAt)}</p>
                            {event.endAt ? (
                                event.startAt.getTime() !== event.endAt.getTime() && (
                                    <p className="text-muted-foreground">~ {formatDateTime(event.endAt)}</p>
                                )
                            ) : (
                                <p className="text-muted-foreground text-orange-600">종료 시간 미정</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium">장소</p>
                            <p className="text-muted-foreground">{event.venue.name}</p>
                            <p className="text-xs text-muted-foreground">{event.venue.address}</p>
                        </div>
                    </div>
                    {event.price && (
                        <div className="flex items-start gap-3">
                            <span className="h-5 w-5 text-muted-foreground mt-0.5 text-center">₩</span>
                            <div>
                                <p className="font-medium">가격</p>
                                <p className="text-muted-foreground">{event.price}</p>
                            </div>
                        </div>
                    )}
                    {event.ageRestriction && (
                        <div className="flex items-start gap-3">
                            <span className="h-5 w-5 text-muted-foreground mt-0.5 text-center">🔞</span>
                            <div>
                                <p className="font-medium">관람 연령</p>
                                <p className="text-muted-foreground">{event.ageRestriction}</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 설명 */}
            {event.description && (
                <section>
                    <h3 className="text-lg font-bold mb-3">소개</h3>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                </section>
            )}

            {/* 예매 링크 */}
            {event.ticketLinks && event.ticketLinks.length > 0 && (
                <section>
                    <h3 className="text-lg font-bold mb-3">예매</h3>
                    <div className="space-y-2">
                        {event.ticketLinks.map((link, index) => (
                            <a
                                key={index}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-between rounded-lg border bg-card p-4 text-sm hover:bg-accent transition-colors"
                            >
                                <span>{link.name}</span>
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* 통계 */}
            {event.stats && (
                <section>
                    <h3 className="text-lg font-bold mb-3">통계</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-2xl font-bold text-primary">{event.stats.wishlistCount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">찜</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{event.stats.attendedCount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">다녀옴</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-2xl font-bold">{event.stats.companionCount}</p>
                            <p className="text-xs text-muted-foreground">동행 모집</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3 text-center">
                            <p className="text-2xl font-bold">{event.stats.reviewCount}</p>
                            <p className="text-xs text-muted-foreground">후기</p>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
