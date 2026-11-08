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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string | null
          company_id: string | null
          created_at: string
          id: string
          job_id: string | null
          metadata: Json
          next_action_at: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          metadata?: Json
          next_action_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          metadata?: Json
          next_action_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      career_preferences: {
        Row: {
          employment_types: Json
          excluded_brands: Json
          excluded_role_families: Json
          industries: Json
          preferences: Json
          preferred_brands: Json
          preferred_locations: Json
          primary_role_families: Json
          relocation_locations: Json
          secondary_role_families: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          employment_types?: Json
          excluded_brands?: Json
          excluded_role_families?: Json
          industries?: Json
          preferences?: Json
          preferred_brands?: Json
          preferred_locations?: Json
          primary_role_families?: Json
          relocation_locations?: Json
          secondary_role_families?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          employment_types?: Json
          excluded_brands?: Json
          excluded_role_families?: Json
          industries?: Json
          preferences?: Json
          preferred_brands?: Json
          preferred_locations?: Json
          primary_role_families?: Json
          relocation_locations?: Json
          secondary_role_families?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          careers_structure: string | null
          careers_url: string | null
          city: string | null
          country_code: string | null
          created_at: string
          discovery_source: string | null
          id: string
          is_independent: boolean | null
          metadata: Json
          monitored: boolean
          name: string
          sector: string
          size_band: string | null
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          careers_structure?: string | null
          careers_url?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          discovery_source?: string | null
          id?: string
          is_independent?: boolean | null
          metadata?: Json
          monitored?: boolean
          name: string
          sector?: string
          size_band?: string | null
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          careers_structure?: string | null
          careers_url?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          discovery_source?: string | null
          id?: string
          is_independent?: boolean | null
          metadata?: Json
          monitored?: boolean
          name?: string
          sector?: string
          size_band?: string | null
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      company_signals: {
        Row: {
          company_id: string
          detected_at: string
          evidence: Json
          id: string
          published_at: string | null
          relevance_score: number | null
          signal_type: string
          source_name: string
          source_url: string
          summary: string | null
          title: string
        }
        Insert: {
          company_id: string
          detected_at?: string
          evidence?: Json
          id?: string
          published_at?: string | null
          relevance_score?: number | null
          signal_type: string
          source_name: string
          source_url: string
          summary?: string | null
          title: string
        }
        Update: {
          company_id?: string
          detected_at?: string
          evidence?: Json
          id?: string
          published_at?: string | null
          relevance_score?: number | null
          signal_type?: string
          source_name?: string
          source_url?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_signals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_observations: {
        Row: {
          apply_works: boolean | null
          content_hash: string | null
          http_status: number | null
          id: number
          job_id: string
          job_source_id: string | null
          listing_present: boolean | null
          location: string | null
          observed_at: string
          raw: Json
          title: string | null
        }
        Insert: {
          apply_works?: boolean | null
          content_hash?: string | null
          http_status?: number | null
          id?: number
          job_id: string
          job_source_id?: string | null
          listing_present?: boolean | null
          location?: string | null
          observed_at?: string
          raw?: Json
          title?: string | null
        }
        Update: {
          apply_works?: boolean | null
          content_hash?: string | null
          http_status?: number | null
          id?: number
          job_id?: string
          job_source_id?: string | null
          listing_present?: boolean | null
          location?: string | null
          observed_at?: string
          raw?: Json
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_observations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_observations_job_source_id_fkey"
            columns: ["job_source_id"]
            isOneToOne: false
            referencedRelation: "job_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      job_sources: {
        Row: {
          active: boolean | null
          apply_url: string | null
          content_hash: string | null
          external_job_id: string | null
          first_seen_at: string
          id: string
          job_id: string
          last_seen_at: string
          last_verified_at: string | null
          listing_url: string
          metadata: Json
          published_at: string | null
          raw_description: string | null
          raw_location: string | null
          raw_title: string | null
          requisition_id: string | null
          source_id: string
        }
        Insert: {
          active?: boolean | null
          apply_url?: string | null
          content_hash?: string | null
          external_job_id?: string | null
          first_seen_at?: string
          id?: string
          job_id: string
          last_seen_at?: string
          last_verified_at?: string | null
          listing_url: string
          metadata?: Json
          published_at?: string | null
          raw_description?: string | null
          raw_location?: string | null
          raw_title?: string | null
          requisition_id?: string | null
          source_id: string
        }
        Update: {
          active?: boolean | null
          apply_url?: string | null
          content_hash?: string | null
          external_job_id?: string | null
          first_seen_at?: string
          id?: string
          job_id?: string
          last_seen_at?: string
          last_verified_at?: string | null
          listing_url?: string
          metadata?: Json
          published_at?: string | null
          raw_description?: string | null
          raw_location?: string | null
          raw_title?: string | null
          requisition_id?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_sources_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          canonical_title: string
          city: string | null
          closed_at: string | null
          company_id: string
          confidence_label: string | null
          country_code: string | null
          created_at: string
          description: string | null
          description_fingerprint: string | null
          employment_type: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          last_verified_at: string | null
          metadata: Json
          normalized_title: string
          primary_apply_url: string | null
          published_at: string | null
          region: string | null
          remote_mode: string | null
          requisition_id: string | null
          role_family: string | null
          seniority: string | null
          state: string
          updated_at: string
          vacancy_confidence: number | null
        }
        Insert: {
          canonical_title: string
          city?: string | null
          closed_at?: string | null
          company_id: string
          confidence_label?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          description_fingerprint?: string | null
          employment_type?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          last_verified_at?: string | null
          metadata?: Json
          normalized_title: string
          primary_apply_url?: string | null
          published_at?: string | null
          region?: string | null
          remote_mode?: string | null
          requisition_id?: string | null
          role_family?: string | null
          seniority?: string | null
          state?: string
          updated_at?: string
          vacancy_confidence?: number | null
        }
        Update: {
          canonical_title?: string
          city?: string | null
          closed_at?: string | null
          company_id?: string
          confidence_label?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          description_fingerprint?: string | null
          employment_type?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          last_verified_at?: string | null
          metadata?: Json
          normalized_title?: string
          primary_apply_url?: string | null
          published_at?: string | null
          region?: string | null
          remote_mode?: string | null
          requisition_id?: string | null
          role_family?: string | null
          seniority?: string | null
          state?: string
          updated_at?: string
          vacancy_confidence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_devices: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_seen_at: string
          provider: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_seen_at?: string
          provider?: string
          subscription_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_seen_at?: string
          provider?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_candidates: {
        Row: {
          company_id: string
          contact_route: Json
          id: string
          reasons: Json
          recommended_area: string | null
          score: number | null
          status: string
          updated_at: string
          user_id: string
          why_now: string | null
        }
        Insert: {
          company_id: string
          contact_route?: Json
          id?: string
          reasons?: Json
          recommended_area?: string | null
          score?: number | null
          status?: string
          updated_at?: string
          user_id: string
          why_now?: string | null
        }
        Update: {
          company_id?: string
          contact_route?: Json
          id?: string
          reasons?: Json
          recommended_area?: string | null
          score?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_title: string | null
          display_name: string | null
          education: Json
          experience: Json
          languages: Json
          onboarding_completed: boolean
          profile_summary: string | null
          seniority: string | null
          skills: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_title?: string | null
          display_name?: string | null
          education?: Json
          experience?: Json
          languages?: Json
          onboarding_completed?: boolean
          profile_summary?: string | null
          seniority?: string | null
          skills?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_title?: string | null
          display_name?: string | null
          education?: Json
          experience?: Json
          languages?: Json
          onboarding_completed?: boolean
          profile_summary?: string | null
          seniority?: string | null
          skills?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      repost_events: {
        Row: {
          description_similarity: number | null
          detected_at: string
          evidence: Json
          id: number
          job_id: string
          new_job_source_id: string | null
          prior_job_source_id: string | null
          reason: string
          requisition_id_changed: boolean | null
        }
        Insert: {
          description_similarity?: number | null
          detected_at?: string
          evidence?: Json
          id?: number
          job_id: string
          new_job_source_id?: string | null
          prior_job_source_id?: string | null
          reason: string
          requisition_id_changed?: boolean | null
        }
        Update: {
          description_similarity?: number | null
          detected_at?: string
          evidence?: Json
          id?: number
          job_id?: string
          new_job_source_id?: string | null
          prior_job_source_id?: string | null
          reason?: string
          requisition_id_changed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "repost_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repost_events_new_job_source_id_fkey"
            columns: ["new_job_source_id"]
            isOneToOne: false
            referencedRelation: "job_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repost_events_prior_job_source_id_fkey"
            columns: ["prior_job_source_id"]
            isOneToOne: false
            referencedRelation: "job_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_candidates: {
        Row: {
          company_name_hint: string | null
          confidence: number | null
          discovered_from: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          metadata: Json
          reason: string | null
          source_family: string | null
          source_url: string
          status: string
        }
        Insert: {
          company_name_hint?: string | null
          confidence?: number | null
          discovered_from?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          reason?: string | null
          source_family?: string | null
          source_url: string
          status?: string
        }
        Update: {
          company_name_hint?: string | null
          confidence?: number | null
          discovered_from?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          reason?: string | null
          source_family?: string | null
          source_url?: string
          status?: string
        }
        Relationships: []
      }
      source_scan_runs: {
        Row: {
          allow_mass_close: boolean
          error_code: string | null
          extracted_jobs: number | null
          finished_at: string | null
          health_status: string | null
          id: number
          metadata: Json
          parser_ok: boolean | null
          prior_extracted_jobs: number | null
          request_ok: boolean | null
          source_id: string | null
          started_at: string
        }
        Insert: {
          allow_mass_close?: boolean
          error_code?: string | null
          extracted_jobs?: number | null
          finished_at?: string | null
          health_status?: string | null
          id?: number
          metadata?: Json
          parser_ok?: boolean | null
          prior_extracted_jobs?: number | null
          request_ok?: boolean | null
          source_id?: string | null
          started_at?: string
        }
        Update: {
          allow_mass_close?: boolean
          error_code?: string | null
          extracted_jobs?: number | null
          finished_at?: string | null
          health_status?: string | null
          id?: number
          metadata?: Json
          parser_ok?: boolean | null
          prior_extracted_jobs?: number | null
          request_ok?: boolean | null
          source_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_scan_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          active: boolean
          base_url: string | null
          company_id: string | null
          config: Json
          consecutive_failures: number
          created_at: string
          health_status: string
          id: string
          last_scan_at: string | null
          last_success_at: string | null
          metadata: Json
          name: string
          official: boolean
          source_family: string | null
          source_type: string
          trust_level: number
        }
        Insert: {
          active?: boolean
          base_url?: string | null
          company_id?: string | null
          config?: Json
          consecutive_failures?: number
          created_at?: string
          health_status?: string
          id?: string
          last_scan_at?: string | null
          last_success_at?: string | null
          metadata?: Json
          name: string
          official?: boolean
          source_family?: string | null
          source_type: string
          trust_level?: number
        }
        Update: {
          active?: boolean
          base_url?: string | null
          company_id?: string | null
          config?: Json
          consecutive_failures?: number
          created_at?: string
          health_status?: string
          id?: string
          last_scan_at?: string | null
          last_success_at?: string | null
          metadata?: Json
          name?: string
          official?: boolean
          source_family?: string | null
          source_type?: string
          trust_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cvs: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_default: boolean
          name: string
          parsed_profile: Json
          storage_path: string
          target_role_families: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          parsed_profile?: Json
          storage_path: string
          target_role_families?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          parsed_profile?: Json
          storage_path?: string
          target_role_families?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_job_dossiers: {
        Row: {
          contact_route: Json
          cv_reason: string | null
          gaps: Json
          generated_from: Json
          job_id: string
          model_version: string | null
          positioning_angle: string | null
          ready_to_send_message: string | null
          ready_to_send_subject: string | null
          recommended_cv_id: string | null
          updated_at: string
          user_id: string
          what_to_emphasize: Json
          why_now: string | null
          why_you: string | null
        }
        Insert: {
          contact_route?: Json
          cv_reason?: string | null
          gaps?: Json
          generated_from?: Json
          job_id: string
          model_version?: string | null
          positioning_angle?: string | null
          ready_to_send_message?: string | null
          ready_to_send_subject?: string | null
          recommended_cv_id?: string | null
          updated_at?: string
          user_id: string
          what_to_emphasize?: Json
          why_now?: string | null
          why_you?: string | null
        }
        Update: {
          contact_route?: Json
          cv_reason?: string | null
          gaps?: Json
          generated_from?: Json
          job_id?: string
          model_version?: string | null
          positioning_angle?: string | null
          ready_to_send_message?: string | null
          ready_to_send_subject?: string | null
          recommended_cv_id?: string | null
          updated_at?: string
          user_id?: string
          what_to_emphasize?: Json
          why_now?: string | null
          why_you?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_job_dossiers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_job_dossiers_recommended_cv_id_fkey"
            columns: ["recommended_cv_id"]
            isOneToOne: false
            referencedRelation: "user_cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_job_feedback: {
        Row: {
          created_at: string
          details: Json
          feedback_type: string
          id: number
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          feedback_type: string
          id?: number
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          feedback_type?: string
          id?: number
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_job_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_job_matches: {
        Row: {
          calculated_at: string
          gaps: Json
          job_id: string
          match_score: number
          model_version: string
          priority_score: number
          reasons: Json
          user_id: string
        }
        Insert: {
          calculated_at?: string
          gaps?: Json
          job_id: string
          match_score: number
          model_version: string
          priority_score: number
          reasons?: Json
          user_id: string
        }
        Update: {
          calculated_at?: string
          gaps?: Json
          job_id?: string
          match_score?: number
          model_version?: string
          priority_score?: number
          reasons?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_job_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
