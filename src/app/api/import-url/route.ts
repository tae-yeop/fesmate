/**
 * URL Import API Route
 *
 * 예매처/공식 페이지 URL에서 행사 정보를 추출하여 반환
 *
 * POST /api/import-url
 * Body: { url: string }
 * Response: ImportUrlResponse
 */

import { NextRequest, NextResponse } from "next/server";
import { importUrl } from "@/lib/crawl";
import { ImportUrlResponse } from "@/types/crawl";

export async function POST(request: NextRequest): Promise<NextResponse<ImportUrlResponse>> {
    try {
        // Request body 파싱
        const body = await request.json();
        const { url } = body;

        // URL 필수 체크
        if (!url || typeof url !== "string") {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: "INVALID_URL",
                        message: "URL을 입력해주세요.",
                    },
                },
                { status: 400 }
            );
        }

        // URL Import 실행
        const result = await importUrl(url.trim());

        // 결과 반환
        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }
    } catch (error) {
        console.error("[import-url] Unexpected error:", error);

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "UNKNOWN_ERROR",
                    message: "예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                },
            },
            { status: 500 }
        );
    }
}

// GET 요청 처리 (지원하지 않음)
export async function GET(): Promise<NextResponse> {
    return NextResponse.json(
        {
            success: false,
            error: {
                code: "INVALID_URL",
                message: "POST 요청을 사용해주세요.",
            },
        },
        { status: 405 }
    );
}
