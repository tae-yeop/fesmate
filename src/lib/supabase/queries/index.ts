/**
 * Supabase Query Functions
 *
 * 이 모듈은 Supabase 데이터베이스와 상호작용하는 모든 쿼리 함수를 제공합니다.
 * Phase별로 구현되며, 각 Phase의 쿼리는 해당 파일에서 export됩니다.
 *
 * Phase 1: Core (읽기 전용) - events.ts
 * Phase 2: User - user-events.ts, follows.ts, blocks.ts
 * Phase 3: Content - posts.ts, comments.ts, reactions.ts
 * Phase 4: Social - crews.ts, participation.ts
 * Phase 5: Guide - call-guides.ts
 */

// Phase 1: Core (읽기 전용)
export {
    // Query functions
    getEvents,
    getEventById,
    getEventsByIds,
    searchEvents,
    // Transformers
    transformDbEventToEvent,
    // Types
    type EventQueryOptions,
} from "./events";

// Phase 2: User
export {
    getUserEvents,
    getWishlistEventIds,
    getAttendedEventIds,
    toggleUserWishlist,
    toggleUserAttended,
    setWishlist,
    setAttended,
    type UserEvent,
} from "./user-events";

export {
    getFollowers,
    getFollowing,
    getAllFollows,
    isFollowing,
    followUser,
    unfollowUser,
    isMutualFollow,
    getFollowCounts,
    type Follow,
} from "./follows";

export {
    getBlockedUsers,
    getBlockedByUsers,
    getBlockList,
    isUserBlocked,
    blockUser,
    unblockUser,
    type Block,
} from "./blocks";

export {
    getUserProfile,
    getUserProfiles,
    ensureUserExists,
    updateUserProfile,
    updatePrivacySettings,
    searchUsers,
    type UserProfile,
    type PrivacySettings,
} from "./users";

// Phase 3: Content
export {
    // Posts Query
    getPostsByEvent,
    getPostsByUser,
    getCommunityPosts,
    getAllCommunityPosts,
    getPost,
    getHubFeed,
    getPostImages,
    getPostCountByUser,
    // Posts Mutation
    createPost,
    updatePost,
    deletePost,
    updatePostStatus,
    bumpPost,
    incrementCurrentPeople,
    decrementCurrentPeople,
    addPostImage,
    deletePostImages,
    // Types
    type CreatePostInput,
    type UpdatePostInput,
    type PostCountStats,
} from "./posts";

export {
    getUserReactions,
    hasReaction,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionCount,
    type PostReaction,
} from "./reactions";

export {
    getCommentsByPostId,
    getAllCommentsByPostId,
    createComment,
    updateComment,
    deleteComment,
    hardDeleteComment,
    getCommentCount,
    getCommentsByUserId,
    type Comment,
    type CreateCommentInput,
} from "./comments";

export {
    getUserNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications,
    createNotification,
    type Notification,
} from "./notifications";

// Phase 4: Social
export {
    // Crew CRUD
    getPublicCrews,
    getCrewById,
    getUserCrews,
    createCrew,
    updateCrew,
    deleteCrew,
    // Crew Members
    getCrewMembers,
    isCrewMember,
    isCrewLeader,
    joinCrew,
    leaveCrew,
    kickMember,
    // Join Requests
    getJoinRequests,
    getPendingRequestCount,
    hasJoinRequest,
    requestJoinCrew,
    approveJoinRequest,
    rejectJoinRequest,
    // Announcements
    getCrewAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementPin,
    // Crew Events
    getCrewEvents,
    addCrewEvent,
    removeCrewEvent,
    // Types
    type Crew,
    type CrewMember,
    type CrewJoinRequest,
    type CrewAnnouncement,
    type CrewEvent,
    type CreateCrewInput,
} from "./crews";

export {
    // Query functions
    getReceivedRequests,
    getSentRequests,
    getRequestsForPost,
    getMyRequest,
    getReceivedPendingCount,
    getSentPendingCount,
    getAcceptedActivities,
    // Mutation functions
    sendParticipationRequest,
    acceptParticipationRequest,
    declineParticipationRequest,
    cancelParticipationRequest,
    updateActivityInfo,
    // Types
    type ParticipationRequest,
    type ParticipationStatus,
    type CreateParticipationInput,
} from "./participation";

// My Timetable (슬롯 마크, 커스텀 이벤트)
export {
    // Slot Marks
    getUserSlotMarks,
    getAllUserSlotMarks,
    setSlotMark,
    deleteSlotMark,
    // Custom Events
    getCustomEvents,
    getAllCustomEvents,
    createCustomEvent,
    updateCustomEvent,
    deleteCustomEvent,
    // Types
    type SlotMark,
    type SlotMarkType,
    type CustomEvent,
    type CustomEventType,
} from "./my-timetable";

// Badges (배지)
export {
    getUserBadges as getUserBadgesDb,
    hasBadge as hasBadgeDb,
    awardBadge,
    awardBadges,
    updateFeaturedBadges,
    getFeaturedBadges,
    type UserBadge as DbUserBadge,
} from "./badges";

// Tickets (티켓북)
export {
    getUserTickets,
    getTicket as getTicketById,
    getTicketsByEvent as getTicketsByEventId,
    createTicket,
    updateTicket,
    deleteTicket,
    type Ticket as DbTicket,
    type TicketImage as DbTicketImage,
    type CreateTicketInput as DbCreateTicketInput,
    type UpdateTicketInput as DbUpdateTicketInput,
} from "./tickets";

// Companion Requests (사용자 간 1:1 동행 제안)
export {
    getReceivedCompanionRequests,
    getSentCompanionRequests,
    getAllCompanionRequests,
    getCompanionRequestStatus,
    getReceivedPendingCompanionCount,
    getCompanionsForEvent,
    sendCompanionRequest,
    acceptCompanionRequest,
    declineCompanionRequest,
    cancelCompanionRequest,
    type CompanionRequest as DbCompanionRequest,
    type CompanionRequestStatus as DbCompanionRequestStatus,
    type CreateCompanionRequestInput as DbCreateCompanionRequestInput,
} from "./companions";

// Phase 5: Guide
export {
    // Songs
    getSongs,
    getSong,
    getSongByYoutubeId,
    createSong,
    searchSongs,
    // CallGuides
    getCallGuides,
    getCallGuideBySongId,
    getCallGuide,
    createCallGuide,
    updateCallGuideStatus,
    deleteCallGuide,
    // CallGuide Entries
    addCallGuideEntry,
    updateCallGuideEntry,
    deleteCallGuideEntry,
    replaceCallGuideEntries,
    // Version History
    saveCallGuideVersion,
    getCallGuideVersions,
    // Reactions (콜가이드 전체)
    toggleCallGuideReaction,
    getUserCallGuideReactions,
    // Reactions (개별 엔트리)
    toggleEntryReaction,
    getUserEntryReactions,
    // Types
    type CreateSongInput,
    type CreateCallGuideEntryInput,
} from "./call-guides";

// Leaderboard (리더보드)
export {
    getLeaderboardStats,
    getLeaderboard as getLeaderboardDb,
    getUserRanking as getUserRankingDb,
    type UserActivityStats,
} from "./leaderboard";

// Admin: Reports (신고 관리)
export {
    submitReport,
    getReports,
    getReportById,
    updateReportStatus,
    getReportStats,
    getReportsAgainstUser,
    getReportsByUser,
    getPendingReportCount,
    type DbReport,
    type ReportWithDetails,
    type ReportQueryOptions,
    type ReportStats,
} from "./reports";

// Admin: Management (관리자 도구)
export {
    // Audit Logs
    logAdminAction,
    getAuditLogs,
    ACTION_TYPE_LABELS,
    // User Management
    suspendUser,
    unsuspendUser,
    warnUser,
    getUsers,
    getUserById,
    // Content Management
    adminDeletePost,
    adminDeleteComment,
    getPosts,
    getComments,
    // Event Management
    updateEventStatus,
    updateEvent,
    deleteEvent,
    // Dashboard
    getAdminDashboardStats,
    // Types
    type AdminActionType,
    type AuditLog,
    type AuditLogQueryOptions,
    type AdminDashboardStats,
    type UserWithSuspension,
} from "./admin";

// User Event Registration (사용자 행사 등록)
export {
    getUserRegisteredEvents,
    getAllUserEvents,
    getUserEventById,
    createUserEvent,
    updateUserEvent,
    deleteUserEvent,
    isEventOwner,
    type CreateUserEventInput,
    type UpdateUserEventInput,
    type UserEventWithRelations,
} from "./event-registration";
