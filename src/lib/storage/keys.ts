/**
 * Storage Key Builder
 *
 * 모든 localStorage 키를 일관된 형식으로 생성
 * 형식: fesmate:v1:{scope}:{domain}
 *
 * Scopes:
 * - guest: 비로그인 사용자 데이터
 * - user:{userId}: 로그인 사용자 데이터
 * - shared: 전역 공유 데이터
 * - device: 기기별 설정
 */

export type StorageScope = "guest" | "user" | "shared" | "device";

export interface BuildKeyOptions {
  version?: "v1";
  scope: StorageScope;
  userId?: string;
  domain: string;
}

/**
 * Storage 키 생성
 *
 * @example
 * buildKey({ scope: 'guest', domain: 'wishlist' })
 * // => 'fesmate:v1:guest:wishlist'
 *
 * buildKey({ scope: 'user', userId: 'user1', domain: 'wishlist' })
 * // => 'fesmate:v1:user:user1:wishlist'
 *
 * buildKey({ scope: 'shared', domain: 'crews' })
 * // => 'fesmate:v1:shared:crews'
 *
 * buildKey({ scope: 'device', domain: 'map-app' })
 * // => 'fesmate:v1:device:map-app'
 */
export function buildKey(options: BuildKeyOptions): string {
  const { version = "v1", scope, userId, domain } = options;

  if (scope === "user") {
    if (!userId) {
      throw new Error("userId is required for user scope");
    }
    return `fesmate:${version}:user:${userId}:${domain}`;
  }

  return `fesmate:${version}:${scope}:${domain}`;
}

/**
 * 사용자 스코프 키 생성 헬퍼
 * userId가 없으면 guest, 있으면 user 스코프 사용
 */
export function buildUserKey(domain: string, userId?: string): string {
  if (userId) {
    return buildKey({ scope: "user", userId, domain });
  }
  return buildKey({ scope: "guest", domain });
}

/**
 * 공유 데이터 키 생성 헬퍼
 */
export function buildSharedKey(domain: string): string {
  return buildKey({ scope: "shared", domain });
}

/**
 * 기기 설정 키 생성 헬퍼
 */
export function buildDeviceKey(domain: string): string {
  return buildKey({ scope: "device", domain });
}

// ===== Domain 상수 =====
// 모든 도메인 이름을 상수로 관리하여 오타 방지

export const DOMAINS = {
  // User-scoped (guest 또는 user)
  WISHLIST: "wishlist",
  ATTENDED: "attended",
  BADGES: "badges",
  BLOCKS: "blocks",
  JOIN_REQUESTS: "join-requests",
  TIMETABLES: "timetables",
  SHARED_TIMETABLES: "shared-timetables",
  OVERLAY_FRIENDS: "overlay-friends",
  TICKETBOOK: "ticketbook",
  HELPFUL: "helpful",
  CALLGUIDE_HELPFUL: "callguide-helpful",
  NOTIFICATIONS: "notifications",
  RATE_LIMITS: "rate-limits",
  USER_TRUST: "user-trust",
  USER_SANCTIONS: "user-sanctions",
  TRUST_HISTORY: "trust-history",

  // Shared (전역)
  COMMENTS: "comments",
  CALLGUIDE_REPORTS: "callguide-reports",
  COMPANION_REQUESTS: "companion-requests",
  PARTICIPATION_REQUESTS: "participation-requests",
  CREWS: "crews",
  CREW_MEMBERS: "crew-members",
  CREW_ACTIVITIES: "crew-activities",
  CREW_EVENTS: "crew-events",
  CREW_JOIN_REQUESTS: "crew-join-requests",
  CREW_ANNOUNCEMENTS: "crew-announcements",
  FOLLOWS: "follows",
  SONGS: "songs",
  CALL_GUIDES: "call-guides",
  CALLGUIDE_VERSIONS: "callguide-versions",
  USER_PROFILES: "user-profiles",
  IMAGES: "images",
  USER_EVENTS: "user-events",
  TIMETABLE_SUGGESTIONS: "timetable-suggestions",
  GALLERIES: "galleries",
  SLOT_CONTENTS: "slot-contents",
  SLOT_CONTENT_HELPFUL: "slot-content-helpful",
  USER_POSTS: "user-posts", // Mock 모드에서 사용자가 작성한 글

  // Device (기기별 설정)
  TICKETBOOK_VIEW: "ticketbook-view",
  MAP_APP: "map-app",
} as const;

export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];

// ===== 레거시 키 매핑 =====
// 마이그레이션용 old key -> new key 매핑

export interface LegacyKeyMapping {
  /** 레거시 키 (또는 userId를 받아 키를 반환하는 함수) */
  oldKey: string | ((userId: string) => string);
  /** 도메인 이름 */
  domain: Domain;
  /** 스코프 타입 */
  scopeType: "user" | "shared" | "device";
  /** Date 필드 목록 (복원용) */
  dateFields?: string[];
}

export const LEGACY_KEY_MAPPINGS: LegacyKeyMapping[] = [
  // User-scoped (기존 keyPrefix 패턴)
  {
    oldKey: (userId) => `fesmate_wishlist_${userId}`,
    domain: DOMAINS.WISHLIST,
    scopeType: "user",
  },
  {
    oldKey: (userId) => `fesmate_attended_${userId}`,
    domain: DOMAINS.ATTENDED,
    scopeType: "user",
  },
  {
    oldKey: (userId) => `fesmate_badges_${userId}`,
    domain: DOMAINS.BADGES,
    scopeType: "user",
    dateFields: ["earnedAt"],
  },
  {
    oldKey: (userId) => `fesmate_blocked_users_${userId}`,
    domain: DOMAINS.BLOCKS,
    scopeType: "user",
    dateFields: ["createdAt"],
  },
  {
    oldKey: (userId) => `fesmate_join_requests_${userId}`,
    domain: DOMAINS.JOIN_REQUESTS,
    scopeType: "user",
    dateFields: ["createdAt"],
  },
  {
    oldKey: (userId) => `fesmate_my_timetables_${userId}`,
    domain: DOMAINS.TIMETABLES,
    scopeType: "user",
  },
  {
    oldKey: (userId) => `fesmate_shared_timetables_${userId}`,
    domain: DOMAINS.SHARED_TIMETABLES,
    scopeType: "user",
  },
  {
    oldKey: (userId) => `fesmate_overlay_friends_${userId}`,
    domain: DOMAINS.OVERLAY_FRIENDS,
    scopeType: "user",
  },
  {
    oldKey: (userId) => `fesmate_ticketbook_${userId}`,
    domain: DOMAINS.TICKETBOOK,
    scopeType: "user",
  },

  // 전역 키 -> User-scoped로 변환 (개인 데이터)
  {
    oldKey: "fesmate_helpful_posts",
    domain: DOMAINS.HELPFUL,
    scopeType: "user",
  },
  {
    oldKey: "fesmate_call_guide_helpful",
    domain: DOMAINS.CALLGUIDE_HELPFUL,
    scopeType: "user",
  },
  {
    oldKey: "fesmate_notifications",
    domain: DOMAINS.NOTIFICATIONS,
    scopeType: "user",
    dateFields: ["createdAt"],
  },

  // Shared (전역 유지)
  {
    oldKey: "fesmate_comments",
    domain: DOMAINS.COMMENTS,
    scopeType: "shared",
    dateFields: ["createdAt", "updatedAt"],
  },
  {
    oldKey: "fesmate_companion_requests",
    domain: DOMAINS.COMPANION_REQUESTS,
    scopeType: "shared",
    dateFields: ["createdAt", "respondedAt"],
  },
  {
    oldKey: "fesmate_participation_requests",
    domain: DOMAINS.PARTICIPATION_REQUESTS,
    scopeType: "shared",
    dateFields: ["createdAt", "respondedAt", "scheduledAt"],
  },
  {
    oldKey: "fesmate_crews",
    domain: DOMAINS.CREWS,
    scopeType: "shared",
    dateFields: ["createdAt"],
  },
  {
    oldKey: "fesmate_crew_members",
    domain: DOMAINS.CREW_MEMBERS,
    scopeType: "shared",
    dateFields: ["joinedAt"],
  },
  {
    oldKey: "fesmate_crew_activities",
    domain: DOMAINS.CREW_ACTIVITIES,
    scopeType: "shared",
    dateFields: ["createdAt"],
  },
  {
    oldKey: "fesmate_crew_events",
    domain: DOMAINS.CREW_EVENTS,
    scopeType: "shared",
    dateFields: ["addedAt"],
  },
  {
    oldKey: "fesmate_crew_join_requests",
    domain: DOMAINS.CREW_JOIN_REQUESTS,
    scopeType: "shared",
    dateFields: ["requestedAt", "processedAt"],
  },
  {
    oldKey: "fesmate_crew_announcements",
    domain: DOMAINS.CREW_ANNOUNCEMENTS,
    scopeType: "shared",
    dateFields: ["createdAt", "updatedAt"],
  },
  {
    oldKey: "fesmate_follows",
    domain: DOMAINS.FOLLOWS,
    scopeType: "shared",
    dateFields: ["createdAt"],
  },
  {
    oldKey: "fesmate_songs",
    domain: DOMAINS.SONGS,
    scopeType: "shared",
  },
  {
    oldKey: "fesmate_call_guides",
    domain: DOMAINS.CALL_GUIDES,
    scopeType: "shared",
    dateFields: ["createdAt", "updatedAt"],
  },
  {
    oldKey: "fesmate_call_guide_versions",
    domain: DOMAINS.CALLGUIDE_VERSIONS,
    scopeType: "shared",
    dateFields: ["editedAt"],
  },
  {
    oldKey: "fesmate_user_profiles",
    domain: DOMAINS.USER_PROFILES,
    scopeType: "shared",
  },
  {
    oldKey: "fesmate_images",
    domain: DOMAINS.IMAGES,
    scopeType: "shared",
  },

  // Device (기기 설정)
  {
    oldKey: "fesmate_ticketbook_view",
    domain: DOMAINS.TICKETBOOK_VIEW,
    scopeType: "device",
  },
  {
    oldKey: "fesmate_default_map_app",
    domain: DOMAINS.MAP_APP,
    scopeType: "device",
  },
];
