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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      needs: {
        Row: {
          category: Database["public"]["Enums"]["need_category"]
          created_at: string
          created_by: string | null
          details: string | null
          dropoff_ends_at: string
          dropoff_starts_at: string
          id: string
          organization_id: string
          quantity_committed: number
          quantity_needed: number
          repeat_anchor: string | null
          repeat_ends_after: number | null
          repeat_interval: number
          repeat_month_mode:
            | Database["public"]["Enums"]["repeat_month_mode"]
            | null
          repeat_series: string | null
          repeat_unit: Database["public"]["Enums"]["repeat_unit"] | null
          repeat_until: string | null
          repeat_weekdays: number[] | null
          status: Database["public"]["Enums"]["need_status"]
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["need_category"]
          created_at?: string
          created_by?: string | null
          details?: string | null
          dropoff_ends_at: string
          dropoff_starts_at: string
          id?: string
          organization_id: string
          quantity_committed?: number
          quantity_needed: number
          repeat_anchor?: string | null
          repeat_ends_after?: number | null
          repeat_interval?: number
          repeat_month_mode?:
            | Database["public"]["Enums"]["repeat_month_mode"]
            | null
          repeat_series?: string | null
          repeat_unit?: Database["public"]["Enums"]["repeat_unit"] | null
          repeat_until?: string | null
          repeat_weekdays?: number[] | null
          status?: Database["public"]["Enums"]["need_status"]
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["need_category"]
          created_at?: string
          created_by?: string | null
          details?: string | null
          dropoff_ends_at?: string
          dropoff_starts_at?: string
          id?: string
          organization_id?: string
          quantity_committed?: number
          quantity_needed?: number
          repeat_anchor?: string | null
          repeat_ends_after?: number | null
          repeat_interval?: number
          repeat_month_mode?:
            | Database["public"]["Enums"]["repeat_month_mode"]
            | null
          repeat_series?: string | null
          repeat_unit?: Database["public"]["Enums"]["repeat_unit"] | null
          repeat_until?: string | null
          repeat_weekdays?: number[] | null
          status?: Database["public"]["Enums"]["need_status"]
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "needs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_follows: {
        Row: {
          created_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_follows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          organization_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          organization_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          organization_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accepts: string | null
          address: string
          created_at: string
          created_by: string | null
          description: string | null
          does_not_accept: string | null
          hours: string | null
          id: string
          kind: Database["public"]["Enums"]["organization_kind"]
          location: unknown
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["organization_status"]
          timezone: string
          website: string | null
        }
        Insert: {
          accepts?: string | null
          address: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          does_not_accept?: string | null
          hours?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["organization_kind"]
          location: unknown
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["organization_status"]
          timezone?: string
          website?: string | null
        }
        Update: {
          accepts?: string | null
          address?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          does_not_accept?: string | null
          hours?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["organization_kind"]
          location?: unknown
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["organization_status"]
          timezone?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pledges: {
        Row: {
          checkin_code: string
          created_at: string
          donor_id: string
          id: string
          need_id: string
          quantity: number
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["pledge_status"]
          updated_at: string
        }
        Insert: {
          checkin_code?: string
          created_at?: string
          donor_id?: string
          id?: string
          need_id: string
          quantity: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["pledge_status"]
          updated_at?: string
        }
        Update: {
          checkin_code?: string
          created_at?: string
          donor_id?: string
          id?: string
          need_id?: string
          quantity?: number
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["pledge_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pledges_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledges_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledges_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          hide_from_leaderboard: boolean
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          hide_from_leaderboard?: boolean
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          hide_from_leaderboard?: boolean
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_pledge: { Args: { pledge_id: string }; Returns: undefined }
      community_heat: {
        Args: { days?: number; lat: number; lng: number; radius_m?: number }
        Returns: {
          donors: number
          items_received: number
          org_lat: number
          org_lng: number
          organization_id: string
          organization_name: string
        }[]
      }
      create_staff_invite: {
        Args: { organization_id: string }
        Returns: string
      }
      delete_my_account: { Args: never; Returns: undefined }
      expire_stale_pledges: { Args: never; Returns: number }
      join_organization: { Args: { invite_code: string }; Returns: string }
      leaderboard_this_month: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          is_me: boolean
          items_given: number
          user_id: string
        }[]
      }
      needs_near: {
        Args: {
          lat: number
          lng: number
          only_category?: Database["public"]["Enums"]["need_category"]
          radius_m?: number
        }
        Returns: {
          address: string
          category: Database["public"]["Enums"]["need_category"]
          details: string
          distance_m: number
          dropoff_ends_at: string
          dropoff_starts_at: string
          need_id: string
          org_lat: number
          org_lng: number
          organization_id: string
          organization_name: string
          quantity_needed: number
          quantity_remaining: number
          title: string
          unit: string
        }[]
      }
      new_checkin_code: { Args: never; Returns: string }
      organization_stats: {
        Args: { days?: number; organization_id: string }
        Returns: Json
      }
      post_next_repeating_needs: { Args: never; Returns: number }
      resolve_pledge: {
        Args: {
          outcome: Database["public"]["Enums"]["pledge_status"]
          pledge_id: string
        }
        Returns: undefined
      }
      set_organization_status: {
        Args: {
          new_status: Database["public"]["Enums"]["organization_status"]
          organization_id: string
        }
        Returns: undefined
      }
      stop_repeating: { Args: { need_id: string }; Returns: undefined }
    }
    Enums: {
      member_role: "owner" | "staff"
      need_category: "food" | "water" | "clothing" | "hygiene" | "other"
      need_status: "open" | "closed" | "cancelled"
      organization_kind:
        | "shelter"
        | "food_pantry"
        | "community_fridge"
        | "other"
      organization_status: "pending" | "approved" | "suspended"
      pledge_status: "pledged" | "received" | "no_show" | "cancelled"
      repeat_month_mode: "date" | "weekday"
      repeat_unit: "day" | "week" | "month"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      member_role: ["owner", "staff"],
      need_category: ["food", "water", "clothing", "hygiene", "other"],
      need_status: ["open", "closed", "cancelled"],
      organization_kind: [
        "shelter",
        "food_pantry",
        "community_fridge",
        "other",
      ],
      organization_status: ["pending", "approved", "suspended"],
      pledge_status: ["pledged", "received", "no_show", "cancelled"],
      repeat_month_mode: ["date", "weekday"],
      repeat_unit: ["day", "week", "month"],
    },
  },
} as const
