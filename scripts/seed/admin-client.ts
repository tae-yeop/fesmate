/**
 * Supabase Admin Client for Seeding
 *
 * RLS 정책을 우회하여 데이터를 직접 삽입하기 위해
 * Service Role Key를 사용하는 관리자 클라이언트
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

// .env.local 로드
config({ path: ".env.local" });

// 환경변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!serviceRoleKey) {
    throw new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY environment variable.\n" +
        "This key is required for seeding data.\n" +
        "You can find it in the Supabase Dashboard > Settings > API > service_role"
    );
}

// Service Role 클라이언트 생성 (RLS 우회)
export const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// 헬퍼 함수: 테이블 비우기
export async function truncateTable(tableName: "events" | "venues" | "artists" | "stages" | "event_artists" | "operational_slots"): Promise<void> {
    const { error: deleteError } = await adminClient
        .from(tableName)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // 모든 행 삭제

    if (deleteError) {
        throw new Error(`Failed to truncate ${tableName}: ${deleteError.message}`);
    }
}

// 헬퍼 함수: UUID 생성 (deterministic for seeding)
export function generateSeedId(prefix: string, index: number): string {
    const paddedIndex = String(index).padStart(4, "0");
    const base = `${prefix}-seed-${paddedIndex}`;

    // UUID v5 스타일의 deterministic ID (실제로는 간단한 해시)
    return base.slice(0, 36);
}
