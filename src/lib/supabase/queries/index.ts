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
