/**
 * 친구/팔로우 시스템 타입 정의 (PRD 6.14)
 * - 팔로우: 일방향 관계
 * - 친구: 맞팔 상태
 */

/** 팔로우 관계 */
export interface Follow {
    /** 팔로우하는 사람 ID */
    followerId: string;
    /** 팔로우 받는 사람 ID */
    followingId: string;
    /** 팔로우 시작일 */
    createdAt: Date;
}

/** 사용자 프로필 (확장) */
export interface UserProfile {
    id: string;
    nickname: string;
    avatar?: string;
    bio?: string;
    /** 팔로워 수 */
    followerCount: number;
    /** 팔로잉 수 */
    followingCount: number;
    /** 다녀온 공연 수 */
    attendedCount: number;
    /** 가입일 */
    joinedAt: Date;
    /** 배지 목록 (대표 배지) */
    featuredBadges?: string[];
}

/** 친구 활동 타입 */
export type FriendActivityType =
    | "wishlist"      // 찜함
    | "attended"      // 다녀옴
    | "review"        // 후기 작성
    | "post"          // 글 작성
    | "joined_crew";  // 크루 가입

/** 친구 활동 피드 아이템 */
export interface FriendActivity {
    id: string;
    /** 활동한 사용자 ID */
    userId: string;
    /** 사용자 닉네임 */
    userNickname: string;
    /** 사용자 아바타 */
    userAvatar?: string;
    /** 활동 타입 */
    type: FriendActivityType;
    /** 관련 행사 ID */
    eventId?: string;
    /** 관련 행사 제목 */
    eventTitle?: string;
    /** 관련 행사 포스터 */
    eventPosterUrl?: string;
    /** 관련 크루 ID */
    crewId?: string;
    /** 관련 크루 이름 */
    crewName?: string;
    /** 활동 일시 */
    createdAt: Date;
    /** 추가 내용 (후기 미리보기 등) */
    content?: string;
}

/** 팔로우 관계 상태 */
export type FollowStatus =
    | "none"          // 관계 없음
    | "following"     // 내가 팔로우 중
    | "follower"      // 상대가 나를 팔로우
    | "mutual";       // 맞팔 (친구)

/** 활동 타입별 설정 */
export const ACTIVITY_TYPE_CONFIG: Record<FriendActivityType, { label: string; emoji: string }> = {
    wishlist: { label: "찜했어요", emoji: "⭐" },
    attended: { label: "다녀왔어요", emoji: "✅" },
    review: { label: "후기를 남겼어요", emoji: "✍️" },
    post: { label: "글을 작성했어요", emoji: "💬" },
    joined_crew: { label: "크루에 가입했어요", emoji: "👥" },
};
