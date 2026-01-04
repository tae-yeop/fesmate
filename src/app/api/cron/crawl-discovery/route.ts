/**
 * Cron API: 크롤링 발견
 *
 * 주기적으로 예매처 목록 페이지를 크롤링하여 새 행사 URL을 발견하고
 * 상세 정보를 추출하여 change_suggestions에 저장
 *
 * Vercel Cron Schedule: 0 *\/6 * * * (6시간마다)
 *
 * @see vercel.json
 */

import { NextRequest, NextResponse } from "next/server";
import { processScheduledCrawls } from "@/lib/crawl/scheduler";

// Vercel Cron 최대 실행 시간: 5분
export const maxDuration = 300;

// Edge Runtime은 사용하지 않음 (서버 사이드 크롤링 필요)
export const runtime = "nodejs";

/**
 * GET /api/cron/crawl-discovery
 *
 * Vercel Cron에서 호출되는 엔드포인트
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    // 1. Cron 인증 확인
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // 개발 환경에서는 인증 스킵 가능
    if (process.env.NODE_ENV === "production") {
        if (!cronSecret) {
            console.error("[cron/crawl-discovery] CRON_SECRET not configured");
            return NextResponse.json(
                { success: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.warn("[cron/crawl-discovery] Unauthorized request");
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }
    }

    console.log("[cron/crawl-discovery] Starting scheduled crawl...");
    const startTime = Date.now();

    try {
        // 2. 스케줄된 크롤링 실행
        const result = await processScheduledCrawls();

        const duration = Date.now() - startTime;
        console.log(
            `[cron/crawl-discovery] Completed in ${duration}ms:`,
            `processed=${result.processed}`,
            `newEvents=${result.newEvents}`,
            `errors=${result.errors}`
        );

        return NextResponse.json({
            success: true,
            data: {
                processed: result.processed,
                newEvents: result.newEvents,
                errors: result.errors,
                runIds: result.runIds,
                durationMs: duration,
            },
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(
            `[cron/crawl-discovery] Failed after ${duration}ms:`,
            error
        );

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                durationMs: duration,
            },
            { status: 500 }
        );
    }
}
