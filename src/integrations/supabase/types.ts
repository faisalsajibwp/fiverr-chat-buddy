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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          bot_response: string
          client_message: string
          created_at: string
          id: string
          message_type: string | null
          screenshot_url: string | null
          user_id: string
        }
        Insert: {
          bot_response: string
          client_message: string
          created_at?: string
          id?: string
          message_type?: string | null
          screenshot_url?: string | null
          user_id: string
        }
        Update: {
          bot_response?: string
          client_message?: string
          created_at?: string
          id?: string
          message_type?: string | null
          screenshot_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      curated_templates: {
        Row: {
          category: string
          client_type: string | null
          created_at: string
          created_by: string | null
          id: string
          industry_tags: string[] | null
          is_active: boolean | null
          matching_keywords: string[] | null
          project_complexity: string | null
          template_content: string
          template_variables: Json | null
          title: string
          tone_style: string
          usage_description: string | null
        }
        Insert: {
          category: string
          client_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean | null
          matching_keywords?: string[] | null
          project_complexity?: string | null
          template_content: string
          template_variables?: Json | null
          title: string
          tone_style: string
          usage_description?: string | null
        }
        Update: {
          category?: string
          client_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry_tags?: string[] | null
          is_active?: boolean | null
          matching_keywords?: string[] | null
          project_complexity?: string | null
          template_content?: string
          template_variables?: Json | null
          title?: string
          tone_style?: string
          usage_description?: string | null
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string | null
          client_type: string | null
          created_at: string
          id: string
          industry_tags: string[] | null
          is_ai_generated: boolean | null
          last_used_at: string | null
          matching_keywords: string[] | null
          project_complexity: string | null
          success_rating: number | null
          template_content: string
          template_variables: Json | null
          title: string
          tone_style: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          client_type?: string | null
          created_at?: string
          id?: string
          industry_tags?: string[] | null
          is_ai_generated?: boolean | null
          last_used_at?: string | null
          matching_keywords?: string[] | null
          project_complexity?: string | null
          success_rating?: number | null
          template_content: string
          template_variables?: Json | null
          title: string
          tone_style?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          client_type?: string | null
          created_at?: string
          id?: string
          industry_tags?: string[] | null
          is_ai_generated?: boolean | null
          last_used_at?: string | null
          matching_keywords?: string[] | null
          project_complexity?: string | null
          success_rating?: number | null
          template_content?: string
          template_variables?: Json | null
          title?: string
          tone_style?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          fiverr_username: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          fiverr_username?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          fiverr_username?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_analytics: {
        Row: {
          client_message_context: string | null
          client_response_time: unknown | null
          conversion_outcome: string | null
          created_at: string
          id: string
          response_effectiveness: number | null
          template_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          client_message_context?: string | null
          client_response_time?: unknown | null
          conversion_outcome?: string | null
          created_at?: string
          id?: string
          response_effectiveness?: number | null
          template_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          client_message_context?: string | null
          client_response_time?: unknown | null
          conversion_outcome?: string | null
          created_at?: string
          id?: string
          response_effectiveness?: number | null
          template_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_upload_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: Json | null
          failed_templates: number | null
          id: string
          original_filename: string | null
          processed_templates: number | null
          status: string | null
          total_templates: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_templates?: number | null
          id?: string
          original_filename?: string | null
          processed_templates?: number | null
          status?: string | null
          total_templates?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_templates?: number | null
          id?: string
          original_filename?: string | null
          processed_templates?: number | null
          status?: string | null
          total_templates?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_template_match_score: {
        Args: {
          client_message: string
          message_context?: Json
          template_id: string
        }
        Returns: number
      }
      update_template_usage: {
        Args: { template_id: string }
        Returns: undefined
      }
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
