import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * UUID 형식 검증
 * PostgreSQL UUID 타입에 저장 가능한 형식인지 확인
 * Mock 데이터(post1, notif1 등)와 실제 UUID 구분용
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(id: string): boolean {
    return UUID_REGEX.test(id);
}
