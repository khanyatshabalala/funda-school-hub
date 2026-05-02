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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          date: string
          id: string
          learner_id: string
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          date: string
          id?: string
          learner_id: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          date?: string
          id?: string
          learner_id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          school_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string | null
          id: string
          school_id: string | null
          title: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          school_id?: string | null
          title: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          school_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          id: string
          learner_id: string
        }
        Insert: {
          class_id: string
          id?: string
          learner_id: string
        }
        Update: {
          class_id?: string
          id?: string
          learner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: number
          created_at: string
          grade_id: number
          id: string
          name: string
          school_id: string
          teacher_user_id: string | null
        }
        Insert: {
          academic_year?: number
          created_at?: string
          grade_id: number
          id?: string
          name: string
          school_id: string
          teacher_user_id?: string | null
        }
        Update: {
          academic_year?: number
          created_at?: string
          grade_id?: number
          id?: string
          name?: string
          school_id?: string
          teacher_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_records: {
        Row: {
          date: string
          description: string | null
          id: string
          learner_id: string
          points: number | null
          recorded_at: string
          recorded_by: string | null
          title: string
          type: Database["public"]["Enums"]["discipline_type"]
        }
        Insert: {
          date?: string
          description?: string | null
          id?: string
          learner_id: string
          points?: number | null
          recorded_at?: string
          recorded_by?: string | null
          title: string
          type: Database["public"]["Enums"]["discipline_type"]
        }
        Update: {
          date?: string
          description?: string | null
          id?: string
          learner_id?: string
          points?: number | null
          recorded_at?: string
          recorded_by?: string | null
          title?: string
          type?: Database["public"]["Enums"]["discipline_type"]
        }
        Relationships: [
          {
            foreignKeyName: "discipline_records_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          province: Database["public"]["Enums"]["sa_province"]
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          province: Database["public"]["Enums"]["sa_province"]
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          province?: Database["public"]["Enums"]["sa_province"]
          updated_at?: string
        }
        Relationships: []
      }
      grades: {
        Row: {
          id: number
          label: string
          phase: Database["public"]["Enums"]["school_phase"]
        }
        Insert: {
          id: number
          label: string
          phase: Database["public"]["Enums"]["school_phase"]
        }
        Update: {
          id?: number
          label?: string
          phase?: Database["public"]["Enums"]["school_phase"]
        }
        Relationships: []
      }
      learners: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          gender: string | null
          grade_id: number
          id: string
          last_name: string
          learner_number: string | null
          school_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          gender?: string | null
          grade_id: number
          id?: string
          last_name: string
          learner_number?: string | null
          school_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          grade_id?: number
          id?: string
          last_name?: string
          learner_number?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learners_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learners_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          assessment_name: string
          class_average: number | null
          id: string
          learner_id: string
          max_score: number
          recorded_at: string
          recorded_by: string | null
          score: number
          subject_id: string
          term: number
        }
        Insert: {
          assessment_name: string
          class_average?: number | null
          id?: string
          learner_id: string
          max_score?: number
          recorded_at?: string
          recorded_by?: string | null
          score: number
          subject_id: string
          term: number
        }
        Update: {
          assessment_name?: string
          class_average?: number | null
          id?: string
          learner_id?: string
          max_score?: number
          recorded_at?: string
          recorded_by?: string | null
          score?: number
          subject_id?: string
          term?: number
        }
        Relationships: [
          {
            foreignKeyName: "marks_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      national_calendar: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          title: string
          year: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type: string
          id?: string
          title: string
          year: number
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          title?: string
          year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_link_requests: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          learner_number: string
          parent_user_id: string
          rejection_reason: string | null
          relationship: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["link_request_status"]
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          learner_number: string
          parent_user_id: string
          rejection_reason?: string | null
          relationship?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["link_request_status"]
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          learner_number?: string
          parent_user_id?: string
          rejection_reason?: string | null
          relationship?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["link_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "parent_link_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_links: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          learner_id: string
          parent_user_id: string
          relationship: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          learner_id: string
          parent_user_id: string
          relationship?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          learner_id?: string
          parent_user_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          id_number: string | null
          phone: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          supports_school_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          id_number?: string | null
          phone?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          supports_school_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          id_number?: string | null
          phone?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          supports_school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_supports_school_id_fkey"
            columns: ["supports_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cards: {
        Row: {
          academic_year: number
          file_name: string
          file_path: string
          id: string
          learner_id: string
          notes: string | null
          school_id: string
          term: number
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          academic_year?: number
          file_name: string
          file_path: string
          id?: string
          learner_id: string
          notes?: string | null
          school_id: string
          term: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          academic_year?: number
          file_name?: string
          file_path?: string
          id?: string
          learner_id?: string
          notes?: string | null
          school_id?: string
          term?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          admission_requirements: string | null
          application_close: string | null
          application_contact: string | null
          application_open: string | null
          city: string | null
          created_at: string
          description: string | null
          district: string
          district_id: string | null
          email: string | null
          emis_number: string
          established_year: number | null
          fees_annual: number | null
          grade_from: number | null
          grade_to: number | null
          id: string
          language_of_instruction: string[] | null
          learner_count: number | null
          logo_url: string | null
          motto: string | null
          name: string
          performance_avg: number | null
          performance_rank_district: number | null
          performance_rank_national: number | null
          performance_rank_province: number | null
          phase: Database["public"]["Enums"]["school_phase"]
          phone: string | null
          postal_code: string | null
          principal_name: string | null
          province: Database["public"]["Enums"]["sa_province"]
          school_type: Database["public"]["Enums"]["school_type"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          admission_requirements?: string | null
          application_close?: string | null
          application_contact?: string | null
          application_open?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          district: string
          district_id?: string | null
          email?: string | null
          emis_number: string
          established_year?: number | null
          fees_annual?: number | null
          grade_from?: number | null
          grade_to?: number | null
          id?: string
          language_of_instruction?: string[] | null
          learner_count?: number | null
          logo_url?: string | null
          motto?: string | null
          name: string
          performance_avg?: number | null
          performance_rank_district?: number | null
          performance_rank_national?: number | null
          performance_rank_province?: number | null
          phase: Database["public"]["Enums"]["school_phase"]
          phone?: string | null
          postal_code?: string | null
          principal_name?: string | null
          province: Database["public"]["Enums"]["sa_province"]
          school_type?: Database["public"]["Enums"]["school_type"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          admission_requirements?: string | null
          application_close?: string | null
          application_contact?: string | null
          application_open?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          district?: string
          district_id?: string | null
          email?: string | null
          emis_number?: string
          established_year?: number | null
          fees_annual?: number | null
          grade_from?: number | null
          grade_to?: number | null
          id?: string
          language_of_instruction?: string[] | null
          learner_count?: number | null
          logo_url?: string | null
          motto?: string | null
          name?: string
          performance_avg?: number | null
          performance_rank_district?: number | null
          performance_rank_national?: number | null
          performance_rank_province?: number | null
          phase?: Database["public"]["Enums"]["school_phase"]
          phone?: string | null
          postal_code?: string | null
          principal_name?: string | null
          province?: Database["public"]["Enums"]["sa_province"]
          school_type?: Database["public"]["Enums"]["school_type"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          id: string
          position: string | null
          school_id: string
          staff_number: string | null
          subjects_taught: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: string | null
          school_id: string
          staff_number?: string | null
          subjects_taught?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: string | null
          school_id?: string
          staff_number?: string | null
          subjects_taught?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          id: string
          name: string
          phase: Database["public"]["Enums"]["school_phase"]
        }
        Insert: {
          code: string
          id?: string
          name: string
          phase: Database["public"]["Enums"]["school_phase"]
        }
        Update: {
          code?: string
          id?: string
          name?: string
          phase?: Database["public"]["Enums"]["school_phase"]
        }
        Relationships: []
      }
      transfers: {
        Row: {
          approved_by: string | null
          from_school_id: string
          id: string
          learner_id: string
          reason: string | null
          requested_at: string
          requested_by: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_school_id: string
        }
        Insert: {
          approved_by?: string | null
          from_school_id: string
          id?: string
          learner_id: string
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_school_id: string
        }
        Update: {
          approved_by?: string | null
          from_school_id?: string
          id?: string
          learner_id?: string
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_school_id_fkey"
            columns: ["from_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_school_id_fkey"
            columns: ["to_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_link_request: {
        Args: { _request_id: string; _reviewer_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_school_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _school_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_parent_of: {
        Args: { _learner_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      learner_school_id: { Args: { _learner_id: string }; Returns: string }
      notify_class_parents: {
        Args: {
          _body: string
          _category: string
          _class_id: string
          _link?: string
          _title: string
        }
        Returns: undefined
      }
      notify_school_parents: {
        Args: {
          _body: string
          _category: string
          _link?: string
          _school_id: string
          _title: string
        }
        Returns: undefined
      }
      recalculate_school_performance: {
        Args: { _school_id: string }
        Returns: undefined
      }
      reject_link_request: {
        Args: { _reason?: string; _request_id: string; _reviewer_id: string }
        Returns: Json
      }
      user_school_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "parent"
        | "teacher"
        | "principal"
        | "school_admin"
        | "super_admin"
      attendance_status: "present" | "absent" | "late" | "excused"
      discipline_type:
        | "merit"
        | "warning"
        | "detention"
        | "suspension"
        | "incident"
      link_request_status: "pending" | "approved" | "rejected"
      sa_province:
        | "Western Cape"
        | "Gauteng"
        | "KwaZulu-Natal"
        | "Eastern Cape"
        | "Free State"
        | "Limpopo"
        | "Mpumalanga"
        | "Northern Cape"
        | "North West"
      school_phase: "primary" | "secondary" | "combined" | "ecd"
      school_type: "public" | "independent" | "private" | "special"
      subscription_tier: "free" | "premium"
      transfer_status: "pending" | "approved" | "rejected" | "completed"
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
    Enums: {
      app_role: [
        "parent",
        "teacher",
        "principal",
        "school_admin",
        "super_admin",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      discipline_type: [
        "merit",
        "warning",
        "detention",
        "suspension",
        "incident",
      ],
      link_request_status: ["pending", "approved", "rejected"],
      sa_province: [
        "Western Cape",
        "Gauteng",
        "KwaZulu-Natal",
        "Eastern Cape",
        "Free State",
        "Limpopo",
        "Mpumalanga",
        "Northern Cape",
        "North West",
      ],
      school_phase: ["primary", "secondary", "combined", "ecd"],
      school_type: ["public", "independent", "private", "special"],
      subscription_tier: ["free", "premium"],
      transfer_status: ["pending", "approved", "rejected", "completed"],
    },
  },
} as const
