/**
 * 크루(Crew) 시스템 타입 정의 (PRD 6.13)
 * - 크루: 같이 공연을 다니는 지속적인 모임
 * - 번개 모집(일회성)과 구분되는 개념
 */

/** 크루 가입 방식 */
export type CrewJoinType = "open" | "approval";

/** 크루 멤버 역할 */
export type CrewMemberRole = "leader" | "member";

/** 크루 활동 타입 */
export type CrewActivityType = "wishlist" | "attended" | "review" | "join" | "leave";

/** 크루 장르 */
export type CrewGenre =
    | "rock"
    | "hiphop"
    | "indie"
    | "kpop"
    | "edm"
    | "jazz"
    | "classical"
    | "musical"
    | "all";

/** 크루 지역 */
export type CrewRegion =
    | "서울"
    | "경기"
    | "인천"
    | "부산"
    | "대구"
    | "대전"
    | "광주"
    | "울산"
    | "강원"
    | "충북"
    | "충남"
    | "전북"
    | "전남"
    | "경북"
    | "경남"
    | "제주"
    | "전국";

/** 크루 정의 */
export interface Crew {
    id: string;
    name: string;
    description: string;
    /** 지역 */
    region: CrewRegion;
    /** 주요 장르 */
    genre: CrewGenre;
    /** 공개 여부 */
    isPublic: boolean;
    /** 가입 방식 */
    joinType: CrewJoinType;
    /** 최대 인원 */
    maxMembers: number;
    /** 생성자 ID */
    createdBy: string;
    /** 생성일 */
    createdAt: Date;
    /** 로고 URL (이모지 or 이미지) */
    logoEmoji?: string;
    logoUrl?: string;
    /** 배너 이미지 */
    bannerUrl?: string;
}

/** 크루 멤버 */
export interface CrewMember {
    crewId: string;
    userId: string;
    /** 유저 닉네임 (표시용) */
    userNickname: string;
    /** 유저 아바타 */
    userAvatar?: string;
    /** 역할 */
    role: CrewMemberRole;
    /** 가입일 */
    joinedAt: Date;
}

/** 크루 공동 관심 행사 */
export interface CrewEvent {
    crewId: string;
    eventId: string;
    /** 추가한 멤버 */
    addedBy: string;
    /** 추가일 */
    addedAt: Date;
}

/** 크루 활동 (피드용) */
export interface CrewActivity {
    id: string;
    crewId: string;
    userId: string;
    userNickname: string;
    userAvatar?: string;
    /** 활동 타입 */
    type: CrewActivityType;
    /** 관련 행사 ID */
    eventId?: string;
    /** 관련 행사 제목 */
    eventTitle?: string;
    /** 활동 일시 */
    createdAt: Date;
    /** 추가 내용 (후기 제목 등) */
    content?: string;
}

/** 가입 신청 */
export interface CrewJoinRequest {
    id: string;
    crewId: string;
    userId: string;
    userNickname: string;
    userAvatar?: string;
    /** 가입 메시지 */
    message?: string;
    /** 신청일 */
    requestedAt: Date;
    /** 처리 상태 */
    status: "pending" | "approved" | "rejected";
    /** 처리일 */
    processedAt?: Date;
    /** 처리자 ID */
    processedBy?: string;
}

/** 크루 공지 */
export interface CrewAnnouncement {
    id: string;
    crewId: string;
    /** 작성자 ID */
    authorId: string;
    /** 작성자 닉네임 */
    authorNickname: string;
    /** 공지 내용 */
    content: string;
    /** 고정 여부 */
    isPinned: boolean;
    /** 작성일 */
    createdAt: Date;
    /** 수정일 */
    updatedAt?: Date;
}

/** 크루 장르 라벨 */
export const CREW_GENRE_LABELS: Record<CrewGenre, string> = {
    rock: "록/메탈",
    hiphop: "힙합/R&B",
    indie: "인디",
    kpop: "K-POP",
    edm: "EDM",
    jazz: "재즈",
    classical: "클래식",
    musical: "뮤지컬",
    all: "장르 무관",
};

/** 크루 지역 목록 */
export const CREW_REGIONS: CrewRegion[] = [
    "전국",
    "서울",
    "경기",
    "인천",
    "부산",
    "대구",
    "대전",
    "광주",
    "울산",
    "강원",
    "충북",
    "충남",
    "전북",
    "전남",
    "경북",
    "경남",
    "제주",
];

/** 크루 생성 입력 */
export interface CreateCrewInput {
    name: string;
    description: string;
    region: CrewRegion;
    genre: CrewGenre;
    isPublic: boolean;
    joinType: CrewJoinType;
    maxMembers: number;
    logoEmoji?: string;
}

/** 크루 통계 */
export interface CrewStats {
    memberCount: number;
    eventCount: number;
    totalAttendance: number;
}
