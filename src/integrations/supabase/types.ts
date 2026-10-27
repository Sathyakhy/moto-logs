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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          bike_id: string | null
          created_at: string
          file_name: string
          file_path: string
          id: string
          kind: string
          maintenance_id: string | null
          user_id: string
        }
        Insert: {
          bike_id?: string | null
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          kind?: string
          maintenance_id?: string | null
          user_id: string
        }
        Update: {
          bike_id?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          kind?: string
          maintenance_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      bikes: {
        Row: {
          created_at: string
          current_odometer: number
          id: string
          is_default: boolean | null
          model: string | null
          name: string
          photo_path: string | null
          photos_paths: string[] | null
          plate_number: string | null
          purchase_currency: string
          purchase_date: string | null
          purchase_price: number
          updated_at: string
          user_id: string
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          current_odometer?: number
          id?: string
          is_default?: boolean | null
          model?: string | null
          name: string
          photo_path?: string | null
          photos_paths?: string[] | null
          plate_number?: string | null
          purchase_currency?: string
          purchase_date?: string | null
          purchase_price?: number
          updated_at?: string
          user_id: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          current_odometer?: number
          id?: string
          is_default?: boolean | null
          model?: string | null
          name?: string
          photo_path?: string | null
          photos_paths?: string[] | null
          plate_number?: string | null
          purchase_currency?: string
          purchase_date?: string | null
          purchase_price?: number
          updated_at?: string
          user_id?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          bike_id: string
          category: string
          created_at: string
          currency: string
          description: string | null
          expense_date: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          bike_id: string
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          bike_id?: string
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          amount: number
          bike_id: string
          created_at: string
          currency: string
          fill_date: string
          fuel_type: string | null
          full_tank: boolean
          gas_station: string | null
          id: string
          liters: number
          odometer: number
          price_per_liter: number | null
          user_id: string
        }
        Insert: {
          amount?: number
          bike_id: string
          created_at?: string
          currency?: string
          fill_date?: string
          fuel_type?: string | null
          full_tank?: boolean
          gas_station?: string | null
          id?: string
          liters?: number
          odometer?: number
          price_per_liter?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          bike_id?: string
          created_at?: string
          currency?: string
          fill_date?: string
          fuel_type?: string | null
          full_tank?: boolean
          gas_station?: string | null
          id?: string
          liters?: number
          odometer?: number
          price_per_liter?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          bike_id: string
          categories: string[]
          created_at: string
          currency: string
          id: string
          labor_cost: number
          notes: string | null
          odometer: number
          parts_cost: number
          service_date: string
          total_cost: number | null
          updated_at: string
          user_id: string
          workshop: string | null
        }
        Insert: {
          bike_id: string
          categories?: string[]
          created_at?: string
          currency?: string
          id?: string
          labor_cost?: number
          notes?: string | null
          odometer?: number
          parts_cost?: number
          service_date?: string
          total_cost?: number | null
          updated_at?: string
          user_id: string
          workshop?: string | null
        }
        Update: {
          bike_id?: string
          categories?: string[]
          created_at?: string
          currency?: string
          id?: string
          labor_cost?: number
          notes?: string | null
          odometer?: number
          parts_cost?: number
          service_date?: string
          total_cost?: number | null
          updated_at?: string
          user_id?: string
          workshop?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          app_logo_path: string | null
          app_name: string | null
          created_at: string
          default_maintenance_schedule: Json | null
          display_currency: string
          display_name: string | null
          id: string
          khr_per_usd: number
          updated_at: string
        }
        Insert: {
          app_logo_path?: string | null
          app_name?: string | null
          created_at?: string
          default_maintenance_schedule?: Json | null
          display_currency?: string
          display_name?: string | null
          id: string
          khr_per_usd?: number
          updated_at?: string
        }
        Update: {
          app_logo_path?: string | null
          app_name?: string | null
          created_at?: string
          default_maintenance_schedule?: Json | null
          display_currency?: string
          display_name?: string | null
          id?: string
          khr_per_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          bike_id: string
          created_at: string
          due_date: string | null
          due_odometer: number | null
          id: string
          notes: string | null
          service_type: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bike_id: string
          created_at?: string
          due_date?: string | null
          due_odometer?: number | null
          id?: string
          notes?: string | null
          service_type?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bike_id?: string
          created_at?: string
          due_date?: string | null
          due_odometer?: number | null
          id?: string
          notes?: string | null
          service_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_schedules: {
        Row: {
          bike_id: string
          created_at: string
          id: string
          interval_days: number | null
          interval_km: number
          item: string
          last_service_date: string | null
          last_service_odometer: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bike_id: string
          created_at?: string
          id?: string
          interval_days?: number | null
          interval_km?: number
          item: string
          last_service_date?: string | null
          last_service_odometer?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bike_id?: string
          created_at?: string
          id?: string
          interval_days?: number | null
          interval_km?: number
          item?: string
          last_service_date?: string | null
          last_service_odometer?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_schedules_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
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
