export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blockchain_networks: {
        Row: {
          created_at: string
          deposit_address: string
          id: string
          is_enabled: boolean
          name: string
          network_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_address: string
          id?: string
          is_enabled?: boolean
          name: string
          network_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_address?: string
          id?: string
          is_enabled?: boolean
          name?: string
          network_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          blockchain: string
          created_at: string
          deposit_address: string
          id: string
          status: string
          transaction_screenshot: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          blockchain: string
          created_at?: string
          deposit_address: string
          id?: string
          status?: string
          transaction_screenshot?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          blockchain?: string
          created_at?: string
          deposit_address?: string
          id?: string
          status?: string
          transaction_screenshot?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      logs: {
        Row: {
          id: number
          message: string | null
          operation: string
          timestamp: string | null
        }
        Insert: {
          id?: number
          message?: string | null
          operation: string
          timestamp?: string | null
        }
        Update: {
          id?: number
          message?: string | null
          operation?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      mining_sessions: {
        Row: {
          created_at: string
          id: string
          last_claim_time: string
          next_available_time: string
          points_earned: number
          session_count: number
          session_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_claim_time?: string
          next_available_time?: string
          points_earned?: number
          session_count?: number
          session_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_claim_time?: string
          next_available_time?: string
          points_earned?: number
          session_count?: number
          session_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mining_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      mining_token_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      mining_wallets: {
        Row: {
          created_at: string
          id: string
          last_reset_date: string
          today_claims: number
          today_points: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reset_date?: string
          today_claims?: number
          today_points?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reset_date?: string
          today_claims?: number
          today_points?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nft_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          created_at: string
          email: string | null
          id: string
          is_blocked: boolean | null
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean | null
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_blocked?: boolean | null
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          qualification_amount: number | null
          qualification_date: string | null
          referral_code: string
          referred_id: string | null
          referrer_id: string
          reward_amount: number | null
          reward_paid: boolean | null
          signup_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          qualification_amount?: number | null
          qualification_date?: string | null
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          reward_amount?: number | null
          reward_paid?: boolean | null
          signup_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          qualification_amount?: number | null
          qualification_date?: string | null
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          reward_amount?: number | null
          reward_paid?: boolean | null
          signup_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          description: string | null
          external_url: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_recurring: boolean
          platform: string
          reward_points: number
          task_type: string
          title: string
          updated_at: string
          verification_type: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          platform: string
          reward_points?: number
          task_type: string
          title: string
          updated_at?: string
          verification_type?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          platform?: string
          reward_points?: number
          task_type?: string
          title?: string
          updated_at?: string
          verification_type?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          admin_notes: string | null
          completion_date: string | null
          created_at: string
          id: string
          points_earned: number
          status: string
          task_id: string
          updated_at: string
          user_id: string
          verification_screenshot: string | null
        }
        Insert: {
          admin_notes?: string | null
          completion_date?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
          verification_screenshot?: string | null
        }
        Update: {
          admin_notes?: string | null
          completion_date?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
          verification_screenshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          created_at: string
          daily_earnings: number | null
          id: string
          is_active: boolean | null
          last_earnings_update: string | null
          nft_maturity_date: string | null
          total_deposit: number | null
          total_profit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_earnings?: number | null
          id?: string
          is_active?: boolean | null
          last_earnings_update?: string | null
          nft_maturity_date?: string | null
          total_deposit?: number | null
          total_profit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_earnings?: number | null
          id?: string
          is_active?: boolean | null
          last_earnings_update?: string | null
          nft_maturity_date?: string | null
          total_deposit?: number | null
          total_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          admin_notes: string | null
          amount: number
          blockchain: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          blockchain: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          blockchain?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin_by_email: {
        Args: { admin_email: string }
        Returns: Json
      }
      complete_task: {
        Args: { user_id_param: string; task_id_param: string }
        Returns: Json
      }
      create_user_referral_code: {
        Args: { user_id_param: string }
        Returns: string
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      process_mining_claim: {
        Args: { user_id_param: string }
        Returns: Json
      }
      reset_daily_mining_stats: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      transfer_daily_earnings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_daily_earnings: {
        Args: Record<PropertyKey, never>
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
