"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types/ticketbook";
import { formatKoreanDate } from "@/lib/utils/date-format";

interface InstaStoryTemplateProps {
    ticket: Ticket;
    className?: string;
}

/**
 * 인스타그램 스토리용 이미지 템플릿
 * - 1080x1920 (9:16 비율)
 * - 티켓 이미지 + 행사 정보 + FesMate 로고
 */
export const InstaStoryTemplate = forwardRef<HTMLDivElement, InstaStoryTemplateProps>(
    function InstaStoryTemplate({ ticket, className }, ref) {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative flex flex-col items-center justify-center",
                    "bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900",
                    className
                )}
                style={{
                    width: 1080,
                    height: 1920,
                    fontFamily: "'Noto Sans KR', sans-serif",
                }}
            >
                {/* 배경 장식 */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* 그라데이션 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

                    {/* 빛나는 원형 효과 */}
                    <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-pink-500/20 blur-[100px]" />
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/20 blur-[100px]" />

                    {/* 별 효과 */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-white"
                            style={{
                                width: Math.random() * 4 + 2,
                                height: Math.random() * 4 + 2,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                opacity: Math.random() * 0.5 + 0.3,
                            }}
                        />
                    ))}
                </div>

                {/* 콘텐츠 */}
                <div className="relative z-10 flex flex-col items-center px-16 py-24">
                    {/* 상단 FesMate 로고 */}
                    <div className="mb-16">
                        <span
                            className="text-5xl font-bold bg-gradient-to-r from-white via-pink-200 to-purple-200 bg-clip-text text-transparent"
                            style={{ letterSpacing: "0.05em" }}
                        >
                            FesMate
                        </span>
                    </div>

                    {/* 티켓 이미지 */}
                    <div className="relative mb-16">
                        {/* 그림자 효과 */}
                        <div className="absolute inset-0 bg-black/30 blur-3xl transform translate-y-8 scale-95" />

                        {/* 티켓 프레임 */}
                        <div className="relative rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={ticket.frontImage.url}
                                alt={ticket.eventTitle}
                                className="max-w-[700px] max-h-[900px] object-contain"
                                crossOrigin="anonymous"
                            />
                        </div>

                        {/* 빛나는 효과 */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-xl -z-10" />
                    </div>

                    {/* 행사 정보 */}
                    <div className="text-center text-white space-y-4">
                        {/* 행사 제목 */}
                        <h2
                            className="text-5xl font-bold leading-tight"
                            style={{
                                textShadow: "0 4px 20px rgba(0,0,0,0.5)",
                                maxWidth: 900,
                            }}
                        >
                            {ticket.eventTitle}
                        </h2>

                        {/* 날짜 */}
                        <p
                            className="text-3xl font-medium text-white/80"
                            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
                        >
                            {formatKoreanDate(ticket.eventDate, "YYYY년 M월 D일")}
                        </p>

                        {/* 좌석/동행 정보 */}
                        {(ticket.seat || ticket.companion) && (
                            <div className="flex items-center justify-center gap-6 text-2xl text-white/70 mt-4">
                                {ticket.seat && <span>{ticket.seat}</span>}
                                {ticket.seat && ticket.companion && (
                                    <span className="text-white/40">|</span>
                                )}
                                {ticket.companion && (
                                    <span>with {ticket.companion}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 하단 워터마크 */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-3 text-white/50 text-2xl">
                        <span>fesmate.app에서 기록하세요</span>
                    </div>
                </div>
            </div>
        );
    }
);
