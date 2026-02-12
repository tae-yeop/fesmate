export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          created_at: string | null
          fanchant: string | null
          genre: string | null
          id: string
          image_url: string | null
          lightstick_color: string | null
          name: string
          popular_songs: string[] | null
          social_links: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fanchant?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          lightstick_color?: string | null
          name: string
          popular_songs?: string[] | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fanchant?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          lightstick_color?: string | null
          name?: string
          popular_songs?: string[] | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_guide_entries: {
        Row: {
          call_guide_id: string
          created_at: string | null
          created_by: string | null
          display_order: number | null
          end_time: number | null
          helpful_count: number | null
          id: string
          instruction: string | null
          intensity: number | null
          start_time: number
          text: string
          text_original: string | null
          text_romanized: string | null
          type: string
        }
        Insert: {
          call_guide_id: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          end_time?: number | null
          helpful_count?: number | null
          id?: string
          instruction?: string | null
          intensity?: number | null
          start_time: number
          text: string
          text_original?: string | null
          text_romanized?: string | null
          type: string
        }
        Update: {
          call_guide_id?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          end_time?: number | null
          helpful_count?: number | null
          id?: string
          instruction?: string | null
          intensity?: number | null
          start_time?: number
          text?: string
          text_original?: string | null
          text_romanized?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_guide_entries_call_guide_id_fkey"
            columns: ["call_guide_id"]
            isOneToOne: false
            referencedRelation: "call_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_guide_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_guide_entry_reactions: {
        Row: {
          created_at: string | null
          entry_id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_id: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_guide_entry_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "call_guide_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_guide_entry_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_guide_reactions: {
        Row: {
          call_guide_id: string
          created_at: string | null
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          call_guide_id: string
          created_at?: string | null
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          call_guide_id?: string
          created_at?: string | null
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_guide_reactions_call_guide_id_fkey"
            columns: ["call_guide_id"]
            isOneToOne: false
            referencedRelation: "call_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_guide_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_guide_versions: {
        Row: {
          call_guide_id: string
          change_description: string | null
          created_at: string | null
          edited_by: string
          entries: Json
          id: string
          version: number
        }
        Insert: {
          call_guide_id: string
          change_description?: string | null
          created_at?: string | null
          edited_by: string
          entries: Json
          id?: string
          version: number
        }
        Update: {
          call_guide_id?: string
          change_description?: string | null
          created_at?: string | null
          edited_by?: string
          entries?: Json
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "call_guide_versions_call_guide_id_fkey"
            columns: ["call_guide_id"]
            isOneToOne: false
            referencedRelation: "call_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_guide_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_guides: {
        Row: {
          contributors: string[] | null
          created_at: string | null
          created_by: string
          helpful_count: number | null
          id: string
          song_id: string
          status: string | null
          updated_at: string | null
          verified_by: string | null
          version: number | null
        }
        Insert: {
          contributors?: string[] | null
          created_at?: string | null
          created_by: string
          helpful_count?: number | null
          id?: string
          song_id: string
          status?: string | null
          updated_at?: string | null
          verified_by?: string | null
          version?: number | null
        }
        Update: {
          contributors?: string[] | null
          created_at?: string | null
          created_by?: string
          helpful_count?: number | null
          id?: string
          song_id?: string
          status?: string | null
          updated_at?: string | null
          verified_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_guides_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: true
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_guides_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      change_suggestions: {
        Row: {
          applied_at: string | null
          applied_event_id: string | null
          confidence: string
          confidence_reasons: string[] | null
          created_at: string | null
          diff_detail: Json | null
          diff_fields: string[] | null
          extraction_method: string | null
          id: string
          raw_item_id: string | null
          requires_review: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_site: string
          source_url: string
          status: string
          suggested_data: Json
          suggestion_type: string
          target_event_id: string | null
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_event_id?: string | null
          confidence: string
          confidence_reasons?: string[] | null
          created_at?: string | null
          diff_detail?: Json | null
          diff_fields?: string[] | null
          extraction_method?: string | null
          id?: string
          raw_item_id?: string | null
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_site: string
          source_url: string
          status?: string
          suggested_data: Json
          suggestion_type: string
          target_event_id?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_event_id?: string | null
          confidence?: string
          confidence_reasons?: string[] | null
          created_at?: string | null
          diff_detail?: Json | null
          diff_fields?: string[] | null
          extraction_method?: string | null
          id?: string
          raw_item_id?: string | null
          requires_review?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_site?: string
          source_url?: string
          status?: string
          suggested_data?: Json
          suggestion_type?: string
          target_event_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_suggestions_applied_event_id_fkey"
            columns: ["applied_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_suggestions_raw_item_id_fkey"
            columns: ["raw_item_id"]
            isOneToOne: false
            referencedRelation: "raw_source_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_suggestions_target_event_id_fkey"
            columns: ["target_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          parent_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_requests: {
        Row: {
          created_at: string | null
          event_id: string
          from_user_id: string
          id: string
          message: string | null
          responded_at: string | null
          slot_ids: string[] | null
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          from_user_id: string
          id?: string
          message?: string | null
          responded_at?: string | null
          slot_ids?: string[] | null
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          from_user_id?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          slot_ids?: string[] | null
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companion_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_runs: {
        Row: {
          auto_approved: number | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          errors: number | null
          id: string
          new_events: number | null
          pending_review: number | null
          run_type: string
          skipped: number | null
          source_id: string | null
          started_at: string
          status: string
          updated_events: number | null
          urls_discovered: number | null
          urls_processed: number | null
        }
        Insert: {
          auto_approved?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          errors?: number | null
          id?: string
          new_events?: number | null
          pending_review?: number | null
          run_type: string
          skipped?: number | null
          source_id?: string | null
          started_at?: string
          status?: string
          updated_events?: number | null
          urls_discovered?: number | null
          urls_processed?: number | null
        }
        Update: {
          auto_approved?: number | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          errors?: number | null
          id?: string
          new_events?: number | null
          pending_review?: number | null
          run_type?: string
          skipped?: number | null
          source_id?: string | null
          started_at?: string
          status?: string
          updated_events?: number | null
          urls_discovered?: number | null
          urls_processed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crawl_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "crawl_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_sources: {
        Row: {
          consecutive_failures: number | null
          crawl_interval_hours: number | null
          created_at: string | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_crawled_at: string | null
          last_error: string | null
          last_error_at: string | null
          list_config: Json | null
          name: string | null
          next_crawl_at: string | null
          notes: string | null
          priority: number | null
          source_site: string
          source_type: string
          success_count: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          consecutive_failures?: number | null
          crawl_interval_hours?: number | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_crawled_at?: string | null
          last_error?: string | null
          last_error_at?: string | null
          list_config?: Json | null
          name?: string | null
          next_crawl_at?: string | null
          notes?: string | null
          priority?: number | null
          source_site: string
          source_type: string
          success_count?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          consecutive_failures?: number | null
          crawl_interval_hours?: number | null
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_crawled_at?: string | null
          last_error?: string | null
          last_error_at?: string | null
          list_config?: Json | null
          name?: string | null
          next_crawl_at?: string | null
          notes?: string | null
          priority?: number | null
          source_site?: string
          source_type?: string
          success_count?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      crew_announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          crew_id: string
          id: string
          is_pinned: boolean | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          crew_id: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          crew_id?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_announcements_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_events: {
        Row: {
          added_at: string | null
          added_by: string
          crew_id: string
          event_id: string
        }
        Insert: {
          added_at?: string | null
          added_by: string
          crew_id: string
          event_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string
          crew_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_events_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_events_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_join_requests: {
        Row: {
          crew_id: string
          id: string
          message: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          crew_id: string
          id?: string
          message?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          crew_id?: string
          id?: string
          message?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_join_requests_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_join_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          crew_id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          crew_id: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          crew_id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crews: {
        Row: {
          banner_url: string | null
          created_at: string | null
          created_by: string
          description: string | null
          event_count: number | null
          genre: string
          id: string
          is_public: boolean | null
          join_type: string | null
          logo_emoji: string | null
          logo_url: string | null
          max_members: number | null
          member_count: number | null
          name: string
          region: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          event_count?: number | null
          genre: string
          id?: string
          is_public?: boolean | null
          join_type?: string | null
          logo_emoji?: string | null
          logo_url?: string | null
          max_members?: number | null
          member_count?: number | null
          name: string
          region: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          event_count?: number | null
          genre?: string
          id?: string
          is_public?: boolean | null
          join_type?: string | null
          logo_emoji?: string | null
          logo_url?: string | null
          max_members?: number | null
          member_count?: number | null
          name?: string
          region?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_events: {
        Row: {
          created_at: string | null
          end_at: string
          event_id: string
          id: string
          memo: string | null
          start_at: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_at: string
          event_id: string
          id?: string
          memo?: string | null
          start_at: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_at?: string
          event_id?: string
          id?: string
          memo?: string | null
          start_at?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_artists: {
        Row: {
          artist_id: string
          display_order: number | null
          event_id: string
        }
        Insert: {
          artist_id: string
          display_order?: number | null
          event_id: string
        }
        Update: {
          artist_id?: string
          display_order?: number | null
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          age_restriction: string | null
          attended_count: number | null
          badges: string[] | null
          created_at: string | null
          description: string | null
          end_at: string | null
          id: string
          override_mode: string | null
          poster_url: string | null
          price: string | null
          report_count: number | null
          review_count: number | null
          start_at: string
          status: string
          ticket_links: Json | null
          timetable_type: string | null
          timezone: string | null
          title: string
          type: string
          updated_at: string | null
          venue_id: string | null
          wishlist_count: number | null
        }
        Insert: {
          age_restriction?: string | null
          attended_count?: number | null
          badges?: string[] | null
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          override_mode?: string | null
          poster_url?: string | null
          price?: string | null
          report_count?: number | null
          review_count?: number | null
          start_at: string
          status?: string
          ticket_links?: Json | null
          timetable_type?: string | null
          timezone?: string | null
          title: string
          type: string
          updated_at?: string | null
          venue_id?: string | null
          wishlist_count?: number | null
        }
        Update: {
          age_restriction?: string | null
          attended_count?: number | null
          badges?: string[] | null
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          override_mode?: string | null
          poster_url?: string | null
          price?: string | null
          report_count?: number | null
          review_count?: number | null
          start_at?: string
          status?: string
          ticket_links?: Json | null
          timetable_type?: string | null
          timezone?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          venue_id?: string | null
          wishlist_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          dedupe_key: string | null
          deep_link: string | null
          event_id: string | null
          id: string
          image_url: string | null
          is_read: boolean | null
          post_id: string | null
          priority: string | null
          slot_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          dedupe_key?: string | null
          deep_link?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          post_id?: string | null
          priority?: string | null
          slot_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          dedupe_key?: string | null
          deep_link?: string | null
          event_id?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          post_id?: string | null
          priority?: string | null
          slot_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_slots: {
        Row: {
          created_at: string | null
          description: string | null
          end_at: string | null
          event_id: string
          id: string
          is_highlight: boolean | null
          location: string | null
          start_at: string
          title: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          event_id: string
          id?: string
          is_highlight?: boolean | null
          location?: string | null
          start_at: string
          title?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          event_id?: string
          id?: string
          is_highlight?: boolean | null
          location?: string | null
          start_at?: string
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      participation_requests: {
        Row: {
          activity_location: string | null
          applicant_id: string
          created_at: string | null
          id: string
          message: string | null
          post_author_id: string
          post_id: string
          responded_at: string | null
          scheduled_at: string | null
          status: string
        }
        Insert: {
          activity_location?: string | null
          applicant_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          post_author_id: string
          post_id: string
          responded_at?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          activity_location?: string | null
          applicant_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          post_author_id?: string
          post_id?: string
          responded_at?: string | null
          scheduled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "participation_requests_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_requests_post_author_id_fkey"
            columns: ["post_author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_requests_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          post_id: string
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          post_id: string
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          post_id?: string
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          post_id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          budget: string | null
          checkin_at: string | null
          comment_count: number | null
          contact_method: string | null
          content: string
          created_at: string | null
          current_people: number | null
          depart_at: string | null
          event_id: string
          expires_at: string | null
          helpful_count: number | null
          id: string
          is_pinned: boolean | null
          is_urgent: boolean | null
          last_bumped_at: string | null
          max_people: number | null
          meet_at: string | null
          place_hint: string | null
          place_text: string | null
          price: string | null
          rating: number | null
          rules: string | null
          slot_id: string | null
          status: string
          trust_level: string | null
          type: string
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          budget?: string | null
          checkin_at?: string | null
          comment_count?: number | null
          contact_method?: string | null
          content: string
          created_at?: string | null
          current_people?: number | null
          depart_at?: string | null
          event_id: string
          expires_at?: string | null
          helpful_count?: number | null
          id?: string
          is_pinned?: boolean | null
          is_urgent?: boolean | null
          last_bumped_at?: string | null
          max_people?: number | null
          meet_at?: string | null
          place_hint?: string | null
          place_text?: string | null
          price?: string | null
          rating?: number | null
          rules?: string | null
          slot_id?: string | null
          status?: string
          trust_level?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          budget?: string | null
          checkin_at?: string | null
          comment_count?: number | null
          contact_method?: string | null
          content?: string
          created_at?: string | null
          current_people?: number | null
          depart_at?: string | null
          event_id?: string
          expires_at?: string | null
          helpful_count?: number | null
          id?: string
          is_pinned?: boolean | null
          is_urgent?: boolean | null
          last_bumped_at?: string | null
          max_people?: number | null
          meet_at?: string | null
          place_hint?: string | null
          place_text?: string | null
          price?: string | null
          rating?: number | null
          rules?: string | null
          slot_id?: string | null
          status?: string
          trust_level?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_source_items: {
        Row: {
          confidence: string | null
          content_hash: string | null
          content_type: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          extraction_method: string | null
          fetched_at: string
          http_status: number | null
          id: string
          matched_event_id: string | null
          normalized_data: Json | null
          raw_event: Json | null
          similarity_score: number | null
          source_id: string | null
          source_site: string
          source_url: string
          status: string
          warnings: string[] | null
        }
        Insert: {
          confidence?: string | null
          content_hash?: string | null
          content_type?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          extraction_method?: string | null
          fetched_at?: string
          http_status?: number | null
          id?: string
          matched_event_id?: string | null
          normalized_data?: Json | null
          raw_event?: Json | null
          similarity_score?: number | null
          source_id?: string | null
          source_site: string
          source_url: string
          status?: string
          warnings?: string[] | null
        }
        Update: {
          confidence?: string | null
          content_hash?: string | null
          content_type?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          extraction_method?: string | null
          fetched_at?: string
          http_status?: number | null
          id?: string
          matched_event_id?: string | null
          normalized_data?: Json | null
          raw_event?: Json | null
          similarity_score?: number | null
          source_id?: string | null
          source_site?: string
          source_url?: string
          status?: string
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_source_items_matched_event_id_fkey"
            columns: ["matched_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_source_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "crawl_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          detail: string | null
          id: string
          reason: string
          reporter_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          target_user_id: string
        }
        Insert: {
          created_at?: string | null
          detail?: string | null
          id?: string
          reason: string
          reporter_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          target_user_id: string
        }
        Update: {
          created_at?: string | null
          detail?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          artist_id: string | null
          created_at: string | null
          day: number | null
          end_at: string
          event_id: string
          id: string
          stage_id: string | null
          start_at: string
          title: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          day?: number | null
          end_at: string
          event_id: string
          id?: string
          stage_id?: string | null
          start_at: string
          title?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          day?: number | null
          end_at?: string
          event_id?: string
          id?: string
          stage_id?: string | null
          start_at?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slots_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          album: string | null
          artist_id: string
          artist_name: string
          created_at: string | null
          duration: number
          has_call_guide: boolean | null
          id: string
          release_year: number | null
          thumbnail_url: string | null
          title: string
          youtube_id: string
        }
        Insert: {
          album?: string | null
          artist_id: string
          artist_name: string
          created_at?: string | null
          duration: number
          has_call_guide?: boolean | null
          id?: string
          release_year?: number | null
          thumbnail_url?: string | null
          title: string
          youtube_id: string
        }
        Update: {
          album?: string | null
          artist_id?: string
          artist_name?: string
          created_at?: string | null
          duration?: number
          has_call_guide?: boolean | null
          id?: string
          release_year?: number | null
          thumbnail_url?: string | null
          title?: string
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number | null
          event_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          back_height: number | null
          back_image_url: string | null
          back_thumbnail_url: string | null
          back_width: number | null
          companion: string | null
          created_at: string | null
          event_date: string
          event_id: string | null
          event_title: string
          front_height: number | null
          front_image_url: string
          front_thumbnail_url: string | null
          front_width: number | null
          id: string
          memo: string | null
          seat: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back_height?: number | null
          back_image_url?: string | null
          back_thumbnail_url?: string | null
          back_width?: number | null
          companion?: string | null
          created_at?: string | null
          event_date: string
          event_id?: string | null
          event_title: string
          front_height?: number | null
          front_image_url: string
          front_thumbnail_url?: string | null
          front_width?: number | null
          id?: string
          memo?: string | null
          seat?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back_height?: number | null
          back_image_url?: string | null
          back_thumbnail_url?: string | null
          back_width?: number | null
          companion?: string | null
          created_at?: string | null
          event_date?: string
          event_id?: string | null
          event_title?: string
          front_height?: number | null
          front_image_url?: string
          front_thumbnail_url?: string | null
          front_width?: number | null
          id?: string
          memo?: string | null
          seat?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          trigger_event_id: string | null
          trigger_event_title: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          trigger_event_id?: string | null
          trigger_event_title?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          trigger_event_id?: string | null
          trigger_event_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_trigger_event_id_fkey"
            columns: ["trigger_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_events: {
        Row: {
          created_at: string | null
          event_id: string
          is_attended: boolean | null
          is_wishlist: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          is_attended?: boolean | null
          is_wishlist?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          is_attended?: boolean | null
          is_wishlist?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_slot_marks: {
        Row: {
          created_at: string | null
          mark_type: string
          memo: string | null
          slot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          mark_type: string
          memo?: string | null
          slot_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          mark_type?: string
          memo?: string | null
          slot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_slot_marks_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_slot_marks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          attended_count: number | null
          bio: string | null
          created_at: string | null
          email: string | null
          featured_badges: string[] | null
          follower_count: number | null
          following_count: number | null
          id: string
          nickname: string
          privacy_settings: Json | null
          profile_image: string | null
          provider: string | null
          role: string | null
          suspended_at: string | null
          suspended_until: string | null
          suspension_reason: string | null
          updated_at: string | null
          warning_count: number | null
        }
        Insert: {
          attended_count?: number | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          featured_badges?: string[] | null
          follower_count?: number | null
          following_count?: number | null
          id: string
          nickname: string
          privacy_settings?: Json | null
          profile_image?: string | null
          provider?: string | null
          role?: string | null
          suspended_at?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          warning_count?: number | null
        }
        Update: {
          attended_count?: number | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          featured_badges?: string[] | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          nickname?: string
          privacy_settings?: Json | null
          profile_image?: string | null
          provider?: string | null
          role?: string | null
          suspended_at?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          warning_count?: number | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string
          capacity: number | null
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address: string
          capacity?: number | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          capacity?: number | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_blocked: { Args: { target_user_id: string }; Returns: boolean }
      is_crew_leader: { Args: { target_crew_id: string }; Returns: boolean }
      is_crew_member: { Args: { target_crew_id: string }; Returns: boolean }
      is_user_suspended: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
