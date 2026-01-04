/**
 * Cron API: 자동 승인 제안 처리
 *
 * 자동 승인된 change_suggestions를 events 테이블에 반영
 *
 * Vercel Cron Schedule: *\/30 * * * * (30분마다)
 *
 * @see vercel.json
 */

import { NextRequest, NextResponse } from "next/server";
import { processPendingApprovals } from "@/lib/crawl/scheduler";

// Vercel Cron 최대 실행 시간: 1분
export const maxDuration = 60;

export const runtime = "nodejs";

/**
 * GET /api/cron/process-suggestions
 *
 * Vercel Cron에서 호출되는 엔드포인트
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    // 1. Cron 인증 확인
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production") {
        if (!cronSecret) {
            console.error("[cron/process-suggestions] CRON_SECRET not configured");
            return NextResponse.json(
                { success: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.warn("[cron/process-suggestions] Unauthorized request");
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }
    }

    console.log("[cron/process-suggestions] Processing pending approvals...");
    const startTime = Date.now();

    try {
        // 2. 자동 승인 제안 처리
        const result = await processPendingApprovals();

        const duration = Date.now() - startTime;
        console.log(
            `[cron/process-suggestions] Completed in ${duration}ms:`,
            `processed=${result.processed}`,
            `approved=${result.approved}`,
            `errors=${result.errors}`
        );

        return NextResponse.json({
            success: true,
            data: {
                processed: result.processed,
                approved: result.approved,
                errors: result.errors,
                durationMs: duration,
            },
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(
            `[cron/process-suggestions] Failed after ${duration}ms:`,
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
