/**
 * Supabase Database Type Definitions
 *
 * 이 파일은 `supabase gen types typescript` 명령으로 생성되는 타입의 구조를 미리 정의합니다.
 * 실제 Supabase 연동 시 자동 생성된 타입으로 교체됩니다.
 *
 * @see /supabase/migrations/ - SQL 스키마 정의
 * @see /docs/tech/database-schema.md - 스키마 설계 문서
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            // =============================================
            // CORE TABLES
            // =============================================

            venues: {
                Row: {
                    id: string;
                    name: string;
                    address: string;
                    lat: number | null;
                    lng: number | null;
                    capacity: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    address: string;
                    lat?: number | null;
                    lng?: number | null;
                    capacity?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    address?: string;
                    lat?: number | null;
                    lng?: number | null;
                    capacity?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            artists: {
                Row: {
                    id: string;
                    name: string;
                    image_url: string | null;
                    genre: string | null;
                    fanchant: string | null;
                    lightstick_color: string | null;
                    popular_songs: string[] | null;
                    social_links: Json | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    image_url?: string | null;
                    genre?: string | null;
                    fanchant?: string | null;
                    lightstick_color?: string | null;
                    popular_songs?: string[] | null;
                    social_links?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    image_url?: string | null;
                    genre?: string | null;
                    fanchant?: string | null;
                    lightstick_color?: string | null;
                    popular_songs?: string[] | null;
                    social_links?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            events: {
                Row: {
                    id: string;
                    title: string;
                    start_at: string;
                    end_at: string | null;
                    timezone: string;
                    venue_id: string | null;
                    type: "concert" | "festival" | "musical" | "exhibition";
                    status: "SCHEDULED" | "CHANGED" | "POSTPONED" | "CANCELED";
                    override_mode: "AUTO" | "LIVE" | "RECAP";
                    poster_url: string | null;
                    price: string | null;
                    description: string | null;
                    age_restriction: string | null;
                    ticket_links: Json | null;
                    timetable_type: "linear" | "grid" | null;
                    badges: string[] | null;
                    wishlist_count: number;
                    attended_count: number;
                    report_count: number;
                    review_count: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    start_at: string;
                    end_at?: string | null;
                    timezone?: string;
                    venue_id?: string | null;
                    type: "concert" | "festival" | "musical" | "exhibition";
                    status?: "SCHEDULED" | "CHANGED" | "POSTPONED" | "CANCELED";
                    override_mode?: "AUTO" | "LIVE" | "RECAP";
                    poster_url?: string | null;
                    price?: string | null;
                    description?: string | null;
                    age_restriction?: string | null;
                    ticket_links?: Json | null;
                    timetable_type?: "linear" | "grid" | null;
                    badges?: string[] | null;
                    wishlist_count?: number;
                    attended_count?: number;
                    report_count?: number;
                    review_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    start_at?: string;
                    end_at?: string | null;
                    timezone?: string;
                    venue_id?: string | null;
                    type?: "concert" | "festival" | "musical" | "exhibition";
                    status?: "SCHEDULED" | "CHANGED" | "POSTPONED" | "CANCELED";
                    override_mode?: "AUTO" | "LIVE" | "RECAP";
                    poster_url?: string | null;
                    price?: string | null;
                    description?: string | null;
                    age_restriction?: string | null;
                    ticket_links?: Json | null;
                    timetable_type?: "linear" | "grid" | null;
                    badges?: string[] | null;
                    wishlist_count?: number;
                    attended_count?: number;
                    report_count?: number;
                    review_count?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            stages: {
                Row: {
                    id: string;
                    event_id: string;
                    name: string;
                    display_order: number;
                    color: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    event_id: string;
                    name: string;
                    display_order?: number;
                    color?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    event_id?: string;
                    name?: string;
                    display_order?: number;
                    color?: string | null;
                    created_at?: string;
                };
            };

            event_artists: {
                Row: {
                    event_id: string;
                    artist_id: string;
                    display_order: number;
                };
                Insert: {
                    event_id: string;
                    artist_id: string;
                    display_order?: number;
                };
                Update: {
                    event_id?: string;
                    artist_id?: string;
                    display_order?: number;
                };
            };

            slots: {
                Row: {
                    id: string;
                    event_id: string;
                    artist_id: string | null;
                    stage_id: string | null;
                    title: string | null;
                    day: number | null;
                    start_at: string;
                    end_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    event_id: string;
                    artist_id?: string | null;
                    stage_id?: string | null;
                    title?: string | null;
                    day?: number | null;
                    start_at: string;
                    end_at: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    event_id?: string;
                    artist_id?: string | null;
                    stage_id?: string | null;
                    title?: string | null;
                    day?: number | null;
                    start_at?: string;
                    end_at?: string;
                    created_at?: string;
                };
            };

            operational_slots: {
                Row: {
                    id: string;
                    event_id: string;
                    type:
                        | "md_sale"
                        | "ticket_pickup"
                        | "locker_open"
                        | "queue_start"
                        | "standing_entry"
                        | "seated_entry"
                        | "show_start"
                        | "show_end"
                        | "intermission"
                        | "shuttle"
                        | "photo_time"
                        | "encore"
                        | "custom";
                    title: string | null;
                    start_at: string;
                    end_at: string | null;
                    location: string | null;
                    description: string | null;
                    is_highlight: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    event_id: string;
                    type:
                        | "md_sale"
                        | "ticket_pickup"
                        | "locker_open"
                        | "queue_start"
                        | "standing_entry"
                        | "seated_entry"
                        | "show_start"
                        | "show_end"
                        | "intermission"
                        | "shuttle"
                        | "photo_time"
                        | "encore"
                        | "custom";
                    title?: string | null;
                    start_at: string;
                    end_at?: string | null;
                    location?: string | null;
                    description?: string | null;
                    is_highlight?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    event_id?: string;
                    type?:
                        | "md_sale"
                        | "ticket_pickup"
                        | "locker_open"
                        | "queue_start"
                        | "standing_entry"
                        | "seated_entry"
                        | "show_start"
                        | "show_end"
                        | "intermission"
                        | "shuttle"
                        | "photo_time"
                        | "encore"
                        | "custom";
                    title?: string | null;
                    start_at?: string;
                    end_at?: string | null;
                    location?: string | null;
                    description?: string | null;
                    is_highlight?: boolean;
                    created_at?: string;
                };
            };

            // =============================================
            // USER TABLES
            // =============================================

            users: {
                Row: {
                    id: string;
                    nickname: string;
                    profile_image: string | null;
                    bio: string | null;
                    role: "USER" | "ADMIN";
                    provider: string | null;
                    email: string | null;
                    follower_count: number;
                    following_count: number;
                    attended_count: number;
                    featured_badges: string[] | null;
                    privacy_settings: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    nickname: string;
                    profile_image?: string | null;
                    bio?: string | null;
                    role?: "USER" | "ADMIN";
                    provider?: string | null;
                    email?: string | null;
                    follower_count?: number;
                    following_count?: number;
                    attended_count?: number;
                    featured_badges?: string[] | null;
                    privacy_settings?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    nickname?: string;
                    profile_image?: string | null;
                    bio?: string | null;
                    role?: "USER" | "ADMIN";
                    provider?: string | null;
                    email?: string | null;
                    follower_count?: number;
                    following_count?: number;
                    attended_count?: number;
                    featured_badges?: string[] | null;
                    privacy_settings?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            user_events: {
                Row: {
                    user_id: string;
                    event_id: string;
                    is_wishlist: boolean;
                    is_attended: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    event_id: string;
                    is_wishlist?: boolean;
                    is_attended?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    user_id?: string;
                    event_id?: string;
                    is_wishlist?: boolean;
                    is_attended?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            user_slot_marks: {
                Row: {
                    user_id: string;
                    slot_id: string;
                    mark_type: "watch" | "meal" | "rest" | "move" | "skip";
                    memo: string | null;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    slot_id: string;
                    mark_type: "watch" | "meal" | "rest" | "move" | "skip";
                    memo?: string | null;
                    created_at?: string;
                };
                Update: {
                    user_id?: string;
                    slot_id?: string;
                    mark_type?: "watch" | "meal" | "rest" | "move" | "skip";
                    memo?: string | null;
                    created_at?: string;
                };
            };

            custom_events: {
                Row: {
                    id: string;
                    user_id: string;
                    event_id: string;
                    type: "meal" | "rest" | "move" | "meet" | "other";
                    title: string;
                    start_at: string;
                    end_at: string;
                    memo: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    event_id: string;
                    type: "meal" | "rest" | "move" | "meet" | "other";
                    title: string;
                    start_at: string;
                    end_at: string;
                    memo?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    event_id?: string;
                    type?: "meal" | "rest" | "move" | "meet" | "other";
                    title?: string;
                    start_at?: string;
                    end_at?: string;
                    memo?: string | null;
                    created_at?: string;
                };
            };

            follows: {
                Row: {
                    follower_id: string;
                    following_id: string;
                    created_at: string;
                };
                Insert: {
                    follower_id: string;
                    following_id: string;
                    created_at?: string;
                };
                Update: {
                    follower_id?: string;
                    following_id?: string;
                    created_at?: string;
                };
            };

            blocks: {
                Row: {
                    blocker_id: string;
                    blocked_id: string;
                    created_at: string;
                };
                Insert: {
                    blocker_id: string;
                    blocked_id: string;
                    created_at?: string;
                };
                Update: {
                    blocker_id?: string;
                    blocked_id?: string;
                    created_at?: string;
                };
            };

            user_badges: {
                Row: {
                    id: string;
                    user_id: string;
                    badge_id: string;
                    earned_at: string;
                    trigger_event_id: string | null;
                    trigger_event_title: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    badge_id: string;
                    earned_at?: string;
                    trigger_event_id?: string | null;
                    trigger_event_title?: string | null;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    badge_id?: string;
                    earned_at?: string;
                    trigger_event_id?: string | null;
                    trigger_event_title?: string | null;
                };
            };

            // =============================================
            // CONTENT TABLES
            // =============================================

            posts: {
                Row: {
                    id: string;
                    event_id: string;
                    user_id: string;
                    type:
                        | "gate"
                        | "md"
                        | "facility"
                        | "safety"
                        | "official"
                        | "companion"
                        | "taxi"
                        | "meal"
                        | "lodge"
                        | "transfer"
                        | "tip"
                        | "question"
                        | "fanevent"
                        | "afterparty"
                        | "review"
                        | "video";
                    status: "ACTIVE" | "EXPIRING" | "EXPIRED" | "CLOSED";
                    content: string;
                    helpful_count: number;
                    comment_count: number;
                    trust_level: "A" | "B" | "C" | null;
                    rating: number | null;
                    slot_id: string | null;
                    video_url: string | null;
                    meet_at: string | null;
                    depart_at: string | null;
                    checkin_at: string | null;
                    max_people: number | null;
                    current_people: number;
                    budget: string | null;
                    price: string | null;
                    rules: string | null;
                    contact_method: string | null;
                    place_text: string | null;
                    place_hint: string | null;
                    expires_at: string | null;
                    last_bumped_at: string | null;
                    is_pinned: boolean;
                    is_urgent: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    event_id: string;
                    user_id: string;
                    type:
                        | "gate"
                        | "md"
                        | "facility"
                        | "safety"
                        | "official"
                        | "companion"
                        | "taxi"
                        | "meal"
                        | "lodge"
                        | "transfer"
                        | "tip"
                        | "question"
                        | "fanevent"
                        | "afterparty"
                        | "review"
                        | "video";
                    status?: "ACTIVE" | "EXPIRING" | "EXPIRED" | "CLOSED";
                    content: string;
                    helpful_count?: number;
                    comment_count?: number;
                    trust_level?: "A" | "B" | "C" | null;
                    rating?: number | null;
                    slot_id?: string | null;
                    video_url?: string | null;
                    meet_at?: string | null;
                    depart_at?: string | null;
                    checkin_at?: string | null;
                    max_people?: number | null;
                    current_people?: number;
                    budget?: string | null;
                    price?: string | null;
                    rules?: string | null;
                    contact_method?: string | null;
                    place_text?: string | null;
                    place_hint?: string | null;
                    expires_at?: string | null;
                    last_bumped_at?: string | null;
                    is_pinned?: boolean;
                    is_urgent?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    event_id?: string;
                    user_id?: string;
                    type?:
                        | "gate"
                        | "md"
                        | "facility"
                        | "safety"
                        | "official"
                        | "companion"
                        | "taxi"
                        | "meal"
                        | "lodge"
                        | "transfer"
                        | "tip"
                        | "question"
                        | "fanevent"
                        | "afterparty"
                        | "review"
                        | "video";
                    status?: "ACTIVE" | "EXPIRING" | "EXPIRED" | "CLOSED";
                    content?: string;
                    helpful_count?: number;
                    comment_count?: number;
                    trust_level?: "A" | "B" | "C" | null;
                    rating?: number | null;
                    slot_id?: string | null;
                    video_url?: string | null;
                    meet_at?: string | null;
                    depart_at?: string | null;
                    checkin_at?: string | null;
                    max_people?: number | null;
                    current_people?: number;
                    budget?: string | null;
                    price?: string | null;
                    rules?: string | null;
                    contact_method?: string | null;
                    place_text?: string | null;
                    place_hint?: string | null;
                    expires_at?: string | null;
                    last_bumped_at?: string | null;
                    is_pinned?: boolean;
                    is_urgent?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            post_images: {
                Row: {
                    id: string;
                    post_id: string;
                    url: string;
                    display_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    post_id: string;
                    url: string;
                    display_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    post_id?: string;
                    url?: string;
                    display_order?: number;
                    created_at?: string;
                };
            };

            post_reactions: {
                Row: {
                    user_id: string;
                    post_id: string;
                    reaction_type: "helpful";
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    post_id: string;
                    reaction_type?: "helpful";
                    created_at?: string;
                };
                Update: {
                    user_id?: string;
                    post_id?: string;
                    reaction_type?: "helpful";
                    created_at?: string;
                };
            };

            comments: {
                Row: {
                    id: string;
                    post_id: string;
                    user_id: string;
                    parent_id: string | null;
                    content: string;
                    is_deleted: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    post_id: string;
                    user_id: string;
                    parent_id?: string | null;
                    content: string;
                    is_deleted?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    post_id?: string;
                    user_id?: string;
                    parent_id?: string | null;
                    content?: string;
                    is_deleted?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            notifications: {
                Row: {
                    id: string;
                    user_id: string;
                    type:
                        | "ticket_open_reminder"
                        | "event_start_reminder"
                        | "slot_start_reminder"
                        | "official_notice_published"
                        | "live_report_trending"
                        | "hub_post_replied"
                        | "community_post_replied"
                        | "community_post_matched"
                        | "post_expiring_soon"
                        | "post_expired"
                        | "report_result"
                        | "event_time_changed"
                        | "event_cancelled"
                        | "participation_reminder_1d"
                        | "participation_reminder_1h"
                        | "participation_accepted"
                        | "participation_declined"
                        | "participation_canceled"
                        | "participation_changed";
                    event_id: string | null;
                    post_id: string | null;
                    slot_id: string | null;
                    title: string;
                    body: string;
                    image_url: string | null;
                    deep_link: string | null;
                    is_read: boolean;
                    dedupe_key: string | null;
                    priority: "normal" | "high";
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    type:
                        | "ticket_open_reminder"
                        | "event_start_reminder"
                        | "slot_start_reminder"
                        | "official_notice_published"
                        | "live_report_trending"
                        | "hub_post_replied"
                        | "community_post_replied"
                        | "community_post_matched"
                        | "post_expiring_soon"
                        | "post_expired"
                        | "report_result"
                        | "event_time_changed"
                        | "event_cancelled"
                        | "participation_reminder_1d"
                        | "participation_reminder_1h"
                        | "participation_accepted"
                        | "participation_declined"
                        | "participation_canceled"
                        | "participation_changed";
                    event_id?: string | null;
                    post_id?: string | null;
                    slot_id?: string | null;
                    title: string;
                    body: string;
                    image_url?: string | null;
                    deep_link?: string | null;
                    is_read?: boolean;
                    dedupe_key?: string | null;
                    priority?: "normal" | "high";
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    type?:
                        | "ticket_open_reminder"
                        | "event_start_reminder"
                        | "slot_start_reminder"
                        | "official_notice_published"
                        | "live_report_trending"
                        | "hub_post_replied"
                        | "community_post_replied"
                        | "community_post_matched"
                        | "post_expiring_soon"
                        | "post_expired"
                        | "report_result"
                        | "event_time_changed"
                        | "event_cancelled"
                        | "participation_reminder_1d"
                        | "participation_reminder_1h"
                        | "participation_accepted"
                        | "participation_declined"
                        | "participation_canceled"
                        | "participation_changed";
                    event_id?: string | null;
                    post_id?: string | null;
                    slot_id?: string | null;
                    title?: string;
                    body?: string;
                    image_url?: string | null;
                    deep_link?: string | null;
                    is_read?: boolean;
                    dedupe_key?: string | null;
                    priority?: "normal" | "high";
                    created_at?: string;
                };
            };

            reports: {
                Row: {
                    id: string;
                    reporter_id: string;
                    target_type: "post" | "comment" | "user";
                    target_id: string;
                    target_user_id: string;
                    reason:
                        | "spam"
                        | "scam"
                        | "abuse"
                        | "hate"
                        | "harassment"
                        | "privacy"
                        | "illegal"
                        | "other";
                    detail: string | null;
                    status: "received" | "in_review" | "action_taken" | "no_action";
                    reviewed_at: string | null;
                    review_note: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    reporter_id: string;
                    target_type: "post" | "comment" | "user";
                    target_id: string;
                    target_user_id: string;
                    reason:
                        | "spam"
                        | "scam"
                        | "abuse"
                        | "hate"
                        | "harassment"
                        | "privacy"
                        | "illegal"
                        | "other";
                    detail?: string | null;
                    status?: "received" | "in_review" | "action_taken" | "no_action";
                    reviewed_at?: string | null;
                    review_note?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    reporter_id?: string;
                    target_type?: "post" | "comment" | "user";
                    target_id?: string;
                    target_user_id?: string;
                    reason?:
                        | "spam"
                        | "scam"
                        | "abuse"
                        | "hate"
                        | "harassment"
                        | "privacy"
                        | "illegal"
                        | "other";
                    detail?: string | null;
                    status?: "received" | "in_review" | "action_taken" | "no_action";
                    reviewed_at?: string | null;
                    review_note?: string | null;
                    created_at?: string;
                };
            };

            // =============================================
            // SOCIAL TABLES (CREWS)
            // =============================================

            crews: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    region: string;
                    genre: string;
                    is_public: boolean;
                    join_type: "open" | "approval";
                    max_members: number;
                    logo_emoji: string | null;
                    logo_url: string | null;
                    banner_url: string | null;
                    member_count: number;
                    event_count: number;
                    created_by: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    region: string;
                    genre: string;
                    is_public?: boolean;
                    join_type?: "open" | "approval";
                    max_members?: number;
                    logo_emoji?: string | null;
                    logo_url?: string | null;
                    banner_url?: string | null;
                    member_count?: number;
                    event_count?: number;
                    created_by: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    region?: string;
                    genre?: string;
                    is_public?: boolean;
                    join_type?: "open" | "approval";
                    max_members?: number;
                    logo_emoji?: string | null;
                    logo_url?: string | null;
                    banner_url?: string | null;
                    member_count?: number;
                    event_count?: number;
                    created_by?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            crew_members: {
                Row: {
                    crew_id: string;
                    user_id: string;
                    role: "leader" | "member";
                    joined_at: string;
                };
                Insert: {
                    crew_id: string;
                    user_id: string;
                    role?: "leader" | "member";
                    joined_at?: string;
                };
                Update: {
                    crew_id?: string;
                    user_id?: string;
                    role?: "leader" | "member";
                    joined_at?: string;
                };
            };

            crew_events: {
                Row: {
                    crew_id: string;
                    event_id: string;
                    added_by: string;
                    added_at: string;
                };
                Insert: {
                    crew_id: string;
                    event_id: string;
                    added_by: string;
                    added_at?: string;
                };
                Update: {
                    crew_id?: string;
                    event_id?: string;
                    added_by?: string;
                    added_at?: string;
                };
            };

            crew_join_requests: {
                Row: {
                    id: string;
                    crew_id: string;
                    user_id: string;
                    message: string | null;
                    status: "pending" | "approved" | "rejected";
                    requested_at: string;
                    processed_at: string | null;
                    processed_by: string | null;
                };
                Insert: {
                    id?: string;
                    crew_id: string;
                    user_id: string;
                    message?: string | null;
                    status?: "pending" | "approved" | "rejected";
                    requested_at?: string;
                    processed_at?: string | null;
                    processed_by?: string | null;
                };
                Update: {
                    id?: string;
                    crew_id?: string;
                    user_id?: string;
                    message?: string | null;
                    status?: "pending" | "approved" | "rejected";
                    requested_at?: string;
                    processed_at?: string | null;
                    processed_by?: string | null;
                };
            };

            crew_announcements: {
                Row: {
                    id: string;
                    crew_id: string;
                    author_id: string;
                    content: string;
                    is_pinned: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    crew_id: string;
                    author_id: string;
                    content: string;
                    is_pinned?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    crew_id?: string;
                    author_id?: string;
                    content?: string;
                    is_pinned?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            participation_requests: {
                Row: {
                    id: string;
                    applicant_id: string;
                    post_id: string;
                    post_author_id: string;
                    message: string | null;
                    status: "pending" | "accepted" | "declined" | "canceled";
                    scheduled_at: string | null;
                    activity_location: string | null;
                    created_at: string;
                    responded_at: string | null;
                };
                Insert: {
                    id?: string;
                    applicant_id: string;
                    post_id: string;
                    post_author_id: string;
                    message?: string | null;
                    status?: "pending" | "accepted" | "declined" | "canceled";
                    scheduled_at?: string | null;
                    activity_location?: string | null;
                    created_at?: string;
                    responded_at?: string | null;
                };
                Update: {
                    id?: string;
                    applicant_id?: string;
                    post_id?: string;
                    post_author_id?: string;
                    message?: string | null;
                    status?: "pending" | "accepted" | "declined" | "canceled";
                    scheduled_at?: string | null;
                    activity_location?: string | null;
                    created_at?: string;
                    responded_at?: string | null;
                };
            };

            // =============================================
            // GUIDE TABLES (CALL GUIDES)
            // =============================================

            songs: {
                Row: {
                    id: string;
                    title: string;
                    artist_id: string;
                    artist_name: string;
                    youtube_id: string;
                    duration: number;
                    thumbnail_url: string | null;
                    release_year: number | null;
                    album: string | null;
                    has_call_guide: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    title: string;
                    artist_id: string;
                    artist_name: string;
                    youtube_id: string;
                    duration: number;
                    thumbnail_url?: string | null;
                    release_year?: number | null;
                    album?: string | null;
                    has_call_guide?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    artist_id?: string;
                    artist_name?: string;
                    youtube_id?: string;
                    duration?: number;
                    thumbnail_url?: string | null;
                    release_year?: number | null;
                    album?: string | null;
                    has_call_guide?: boolean;
                    created_at?: string;
                };
            };

            call_guides: {
                Row: {
                    id: string;
                    song_id: string;
                    version: number;
                    status: "draft" | "published" | "verified";
                    helpful_count: number;
                    created_by: string;
                    verified_by: string | null;
                    contributors: string[] | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    song_id: string;
                    version?: number;
                    status?: "draft" | "published" | "verified";
                    helpful_count?: number;
                    created_by: string;
                    verified_by?: string | null;
                    contributors?: string[] | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    song_id?: string;
                    version?: number;
                    status?: "draft" | "published" | "verified";
                    helpful_count?: number;
                    created_by?: string;
                    verified_by?: string | null;
                    contributors?: string[] | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };

            call_guide_entries: {
                Row: {
                    id: string;
                    call_guide_id: string;
                    start_time: number;
                    end_time: number | null;
                    type:
                        | "lyrics"
                        | "sing"
                        | "action"
                        | "jump"
                        | "clap"
                        | "light"
                        | "etc";
                    text: string;
                    text_romanized: string | null;
                    text_original: string | null;
                    instruction: string | null;
                    intensity: number | null;
                    display_order: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    call_guide_id: string;
                    start_time: number;
                    end_time?: number | null;
                    type:
                        | "lyrics"
                        | "sing"
                        | "action"
                        | "jump"
                        | "clap"
                        | "light"
                        | "etc";
                    text: string;
                    text_romanized?: string | null;
                    text_original?: string | null;
                    instruction?: string | null;
                    intensity?: number | null;
                    display_order?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    call_guide_id?: string;
                    start_time?: number;
                    end_time?: number | null;
                    type?:
                        | "lyrics"
                        | "sing"
                        | "action"
                        | "jump"
                        | "clap"
                        | "light"
                        | "etc";
                    text?: string;
                    text_romanized?: string | null;
                    text_original?: string | null;
                    instruction?: string | null;
                    intensity?: number | null;
                    display_order?: number;
                    created_at?: string;
                };
            };

            call_guide_versions: {
                Row: {
                    id: string;
                    call_guide_id: string;
                    version: number;
                    entries: Json;
                    edited_by: string;
                    change_description: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    call_guide_id: string;
                    version: number;
                    entries: Json;
                    edited_by: string;
                    change_description?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    call_guide_id?: string;
                    version?: number;
                    entries?: Json;
                    edited_by?: string;
                    change_description?: string | null;
                    created_at?: string;
                };
            };

            call_guide_reactions: {
                Row: {
                    user_id: string;
                    call_guide_id: string;
                    reaction_type: "helpful";
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    call_guide_id: string;
                    reaction_type?: "helpful";
                    created_at?: string;
                };
                Update: {
                    user_id?: string;
                    call_guide_id?: string;
                    reaction_type?: "helpful";
                    created_at?: string;
                };
            };
        };

        Views: {
            [_ in never]: never;
        };

        Functions: {
            is_admin: {
                Args: Record<PropertyKey, never>;
                Returns: boolean;
            };
            is_blocked: {
                Args: { target_user_id: string };
                Returns: boolean;
            };
            is_crew_member: {
                Args: { target_crew_id: string };
                Returns: boolean;
            };
            is_crew_leader: {
                Args: { target_crew_id: string };
                Returns: boolean;
            };
        };

        Enums: {
            [_ in never]: never;
        };
    };
}

// =============================================
// UTILITY TYPES
// =============================================

/**
 * 테이블 Row 타입 추출 헬퍼
 * @example type Event = Tables<"events">
 */
export type Tables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Row"];

/**
 * 테이블 Insert 타입 추출 헬퍼
 * @example type InsertEvent = TablesInsert<"events">
 */
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Insert"];

/**
 * 테이블 Update 타입 추출 헬퍼
 * @example type UpdateEvent = TablesUpdate<"events">
 */
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Update"];

// =============================================
// CONVENIENCE TYPE ALIASES
// =============================================

// Core
export type DbVenue = Tables<"venues">;
export type DbArtist = Tables<"artists">;
export type DbEvent = Tables<"events">;
export type DbStage = Tables<"stages">;
export type DbSlot = Tables<"slots">;
export type DbOperationalSlot = Tables<"operational_slots">;

// User
export type DbUser = Tables<"users">;
export type DbUserEvent = Tables<"user_events">;
export type DbUserSlotMark = Tables<"user_slot_marks">;
export type DbCustomEvent = Tables<"custom_events">;
export type DbFollow = Tables<"follows">;
export type DbBlock = Tables<"blocks">;
export type DbUserBadge = Tables<"user_badges">;

// Content
export type DbPost = Tables<"posts">;
export type DbPostImage = Tables<"post_images">;
export type DbPostReaction = Tables<"post_reactions">;
export type DbComment = Tables<"comments">;
export type DbNotification = Tables<"notifications">;
export type DbReport = Tables<"reports">;

// Social
export type DbCrew = Tables<"crews">;
export type DbCrewMember = Tables<"crew_members">;
export type DbCrewEvent = Tables<"crew_events">;
export type DbCrewJoinRequest = Tables<"crew_join_requests">;
export type DbCrewAnnouncement = Tables<"crew_announcements">;
export type DbParticipationRequest = Tables<"participation_requests">;

// Guide
export type DbSong = Tables<"songs">;
export type DbCallGuide = Tables<"call_guides">;
export type DbCallGuideEntry = Tables<"call_guide_entries">;
export type DbCallGuideVersion = Tables<"call_guide_versions">;
export type DbCallGuideReaction = Tables<"call_guide_reactions">;
