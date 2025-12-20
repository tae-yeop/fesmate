/**
 * 연락처 마스킹 유틸리티
 * - 전화번호, 카카오톡 ID 등 개인정보를 부분적으로 가림
 */

/**
 * 전화번호 마스킹
 * 예: 010-1234-5678 → 010-****-5678
 *     01012345678 → 010****5678
 */
export function maskPhoneNumber(text: string): string {
    // 다양한 전화번호 패턴 처리
    return text
        // 010-1234-5678 형식
        .replace(/(\d{3})-(\d{4})-(\d{4})/g, "$1-****-$3")
        // 010.1234.5678 형식
        .replace(/(\d{3})\.(\d{4})\.(\d{4})/g, "$1.****.$3")
        // 01012345678 형식 (11자리 연속 숫자)
        .replace(/(\d{3})(\d{4})(\d{4})/g, "$1****$3");
}

/**
 * 카카오톡 ID 마스킹
 * 예: 카톡: myid123 → 카톡: my***23
 *     @myid123 → @my***23
 */
export function maskKakaoId(text: string): string {
    // 카톡: ID, 카톡 ID, 카카오톡: ID 패턴
    const kakaoPattern = /(카톡\s*:?\s*|카카오톡\s*:?\s*)([a-zA-Z0-9_]{3,})/gi;
    text = text.replace(kakaoPattern, (match, prefix, id) => {
        return `${prefix}${maskId(id)}`;
    });

    // @ID 패턴 (카톡 ID로 추정)
    const atPattern = /@([a-zA-Z0-9_]{3,})/g;
    text = text.replace(atPattern, (match, id) => {
        return `@${maskId(id)}`;
    });

    return text;
}

/**
 * ID 마스킹 헬퍼
 * 앞 2글자와 뒤 2글자만 표시, 나머지는 ***
 */
function maskId(id: string): string {
    if (id.length <= 4) {
        // 4글자 이하면 중간만 가림
        return id[0] + "*".repeat(id.length - 2) + id[id.length - 1];
    }
    return id.slice(0, 2) + "***" + id.slice(-2);
}

/**
 * 이메일 마스킹
 * 예: test@example.com → te***@example.com
 */
export function maskEmail(text: string): string {
    const emailPattern = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    return text.replace(emailPattern, (match, localPart, domain) => {
        const masked = localPart.length <= 4
            ? localPart[0] + "***"
            : localPart.slice(0, 2) + "***";
        return `${masked}@${domain}`;
    });
}

/**
 * 모든 연락처 정보 마스킹
 */
export function maskContactInfo(text: string): string {
    let masked = text;
    masked = maskPhoneNumber(masked);
    masked = maskKakaoId(masked);
    masked = maskEmail(masked);
    return masked;
}

/**
 * 마스킹 해제를 위한 원본 텍스트 보기 여부 체크
 * (추후 로그인 사용자에게만 원본 표시 시 사용)
 */
export function shouldShowOriginal(isLoggedIn: boolean): boolean {
    return isLoggedIn;
}
