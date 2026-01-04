// 글(Post) 관련 타입 정의 - PRD v0.5 기준

/** 글 타입 - 실시간 제보 */
export type RealtimePostType = "gate" | "md" | "facility" | "safety";

/** 글 타입 - 공식 */
export type OfficialPostType = "official";

/** 글 타입 - 커뮤니티 */
export type CommunityPostType =
    | "companion"   // 동행(일반)
    | "taxi"        // 택시팟
    | "meal"        // 밥
    | "lodge"       // 숙소
    | "transfer"    // 직거래양도
    | "tip"         // 팁/꿀팁
    | "question"    // 질문
    | "fanevent"    // 팬이벤트 (생일카페, 포토존, 서포트)
    | "afterparty"; // 뒷풀이 (공연 후 모임)

/** 글 타입 - 기록 */
export type RecordPostType = "review" | "video";

/** 모든 글 타입 */
export type PostType =
    | RealtimePostType
    | OfficialPostType
    | CommunityPostType
    | RecordPostType;

/** 글 상태 (커뮤니티 자동 만료) */
export type PostStatus =
    | "ACTIVE"      // 활성
    | "EXPIRING"    // 만료 임박
    | "EXPIRED"     // 만료됨
    | "CLOSED";     // 모집완료 (작성자 수동)

/** 신뢰도 등급 (실시간 제보) */
export type TrustLevel = "A" | "B" | "C";

/** 글(Post) 기본 인터페이스 */
export interface Post {
    id: string;
    eventId: string;
    userId: string;

    type: PostType;
    status: PostStatus;

    // 신고 누적으로 인한 숨김 처리
    isHidden?: boolean;       // 숨김 여부
    reportCount?: number;     // 누적 신고 수
    hiddenAt?: Date;          // 숨김 처리 시각

    // 내용
    content: string;
    images?: string[];

    // 반응
    helpfulCount: number;

    // 실시간 제보용
    trustLevel?: TrustLevel;

    // 리뷰용
    rating?: number; // 1-5
    slotId?: string; // 슬롯 리뷰인 경우

    // 영상용
    videoUrl?: string;

    // 커뮤니티용 (동행/택시/밥/숙소/양도)
    meetAt?: Date;      // 만남 시각
    departAt?: Date;    // 출발 시각 (택시)
    checkinAt?: Date;   // 체크인 시각 (숙소)
    maxPeople?: number; // 최대 인원
    currentPeople?: number; // 현재 인원
    location?: string;  // 장소 (deprecated, use placeText)
    budget?: string;    // 예산
    price?: string;     // 가격 (양도용)
    rules?: string;     // 규칙
    contactMethod?: string; // 연락 방식

    // 장소 필드 (PRD 6.4.1)
    placeText?: string;  // 장소명 (예: "올림픽공원 정문")
    placeHint?: string;  // 보조 힌트 (예: "5호선 올림픽공원역 3번 출구")

    // 만료
    expiresAt?: Date;

    // 끌어올리기 (Bump)
    lastBumpedAt?: Date;  // 마지막 끌어올리기 시간 (24시간 쿨다운)

    // 공식 공지용
    isPinned?: boolean;
    isUrgent?: boolean;

    // 메타
    createdAt: Date;
    updatedAt: Date;
}

/**
 * 카테고리별 만료 시각 계산
 * PRD v0.5 UX/IA 문서 기준
 */
export function calculateExpiresAt(
    type: PostType,
    options: {
        departAt?: Date;
        meetAt?: Date;
        checkinAt?: Date;
        eventStartAt?: Date;
        createdAt?: Date;
    }
): Date | null {
    const { departAt, meetAt, checkinAt, eventStartAt, createdAt } = options;
    const now = createdAt || new Date();

    switch (type) {
        case "taxi":
            // 택시팟: depart_at + 2시간
            if (departAt) {
                return new Date(departAt.getTime() + 2 * 60 * 60 * 1000);
            }
            break;

        case "meal":
            // 밥: meet_at + 3시간
            if (meetAt) {
                return new Date(meetAt.getTime() + 3 * 60 * 60 * 1000);
            }
            break;

        case "lodge":
            // 숙소: checkin_at + 24시간
            if (checkinAt) {
                return new Date(checkinAt.getTime() + 24 * 60 * 60 * 1000);
            }
            if (eventStartAt) {
                return new Date(eventStartAt.getTime() + 24 * 60 * 60 * 1000);
            }
            break;

        case "companion":
        case "afterparty":
            // 동행/뒷풀이: meet_at + 6시간 또는 start_at + 6시간
            if (meetAt) {
                return new Date(meetAt.getTime() + 6 * 60 * 60 * 1000);
            }
            if (eventStartAt) {
                return new Date(eventStartAt.getTime() + 6 * 60 * 60 * 1000);
            }
            break;

        case "fanevent":
            // 팬이벤트: event_start_at + 6시간
            if (eventStartAt) {
                return new Date(eventStartAt.getTime() + 6 * 60 * 60 * 1000);
            }
            break;

        case "transfer":
            // 직거래양도: min(meet_at, start_at) + 1시간
            const baseTime = meetAt && eventStartAt
                ? Math.min(meetAt.getTime(), eventStartAt.getTime())
                : meetAt?.getTime() || eventStartAt?.getTime();
            if (baseTime) {
                return new Date(baseTime + 1 * 60 * 60 * 1000);
            }
            break;

        case "question":
            // 질문: created_at + 14일
            return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        case "tip":
        case "review":
        case "video":
            // 후기·팁, 리뷰, 영상: 만료 없음
            return null;

        default:
            // 실시간 제보, 공식: 만료 없음
            return null;
    }

    return null;
}

/** 글 타입별 한글 라벨 */
export const POST_TYPE_LABELS: Record<PostType, string> = {
    // 실시간
    gate: "게이트",
    md: "MD",
    facility: "시설",
    safety: "안전",

    // 공식
    official: "공식 공지",

    // 커뮤니티
    companion: "동행",
    taxi: "택시팟",
    meal: "밥",
    lodge: "숙소",
    transfer: "직거래양도",
    tip: "팁",
    question: "질문",
    fanevent: "팬이벤트",
    afterparty: "뒷풀이",

    // 기록
    review: "후기",
    video: "영상",
};

/** 글 타입 카테고리 */
export const POST_TYPE_CATEGORIES = {
    realtime: ["gate", "md", "facility", "safety"] as RealtimePostType[],
    official: ["official"] as OfficialPostType[],
    community: ["companion", "taxi", "meal", "lodge", "transfer", "tip", "question", "fanevent", "afterparty"] as CommunityPostType[],
    record: ["review", "video"] as RecordPostType[],
};

/** 끌어올리기 쿨다운 시간 (밀리초) - 24시간 */
export const BUMP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * 끌어올리기 가능 여부 확인
 * @returns { canBump: boolean, remainingMs: number }
 */
export function checkBumpAvailability(post: Post, now: Date = new Date()): {
    canBump: boolean;
    remainingMs: number;
    remainingText: string;
} {
    if (!post.lastBumpedAt) {
        return { canBump: true, remainingMs: 0, remainingText: "" };
    }

    const lastBumped = new Date(post.lastBumpedAt);
    const elapsed = now.getTime() - lastBumped.getTime();
    const remainingMs = Math.max(0, BUMP_COOLDOWN_MS - elapsed);

    if (remainingMs === 0) {
        return { canBump: true, remainingMs: 0, remainingText: "" };
    }

    // 남은 시간 텍스트 생성
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

    let remainingText = "";
    if (hours > 0) {
        remainingText = `${hours}시간 ${minutes}분 후 가능`;
    } else {
        remainingText = `${minutes}분 후 가능`;
    }

    return { canBump: false, remainingMs, remainingText };
}
