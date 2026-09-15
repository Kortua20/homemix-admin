export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      categories: {
        Row: {
          description: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          description?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      category_images: {
        Row: {
          category_id: string
          content_type: string
          created_at: string
          id: string
          object_key: string
          original_name: string
          size_bytes: number
          sort_order: number
        }
        Insert: {
          category_id: string
          content_type: string
          created_at?: string
          id?: string
          object_key: string
          original_name: string
          size_bytes: number
          sort_order?: number
        }
        Update: {
          category_id?: string
          content_type?: string
          created_at?: string
          id?: string
          object_key?: string
          original_name?: string
          size_bytes?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_images_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_aspects: {
        Row: {
          code: string
          description_ka: string
          label_en: string
          label_ka: string
          sort_order: number
        }
        Insert: {
          code: string
          description_ka?: string
          label_en: string
          label_ka: string
          sort_order: number
        }
        Update: {
          code?: string
          description_ka?: string
          label_en?: string
          label_ka?: string
          sort_order?: number
        }
        Relationships: []
      }
      condition_grades: {
        Row: {
          code: string
          description_ka: string
          label_en: string
          label_ka: string
          sort_order: number
        }
        Insert: {
          code: string
          description_ka?: string
          label_en: string
          label_ka: string
          sort_order: number
        }
        Update: {
          code?: string
          description_ka?: string
          label_en?: string
          label_ka?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_condition_aspects: {
        Row: {
          aspect_code: string
          created_at: string
          grade_code: string
          note: string | null
          product_id: string
        }
        Insert: {
          aspect_code: string
          created_at?: string
          grade_code: string
          note?: string | null
          product_id: string
        }
        Update: {
          aspect_code?: string
          created_at?: string
          grade_code?: string
          note?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_condition_aspects_aspect_code_fkey"
            columns: ["aspect_code"]
            isOneToOne: false
            referencedRelation: "condition_aspects"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "product_condition_aspects_grade_code_fkey"
            columns: ["grade_code"]
            isOneToOne: false
            referencedRelation: "condition_grades"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "product_condition_aspects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_flaws: {
        Row: {
          created_at: string
          flaw_type: string
          id: string
          image_id: string | null
          location_ka: string | null
          note_ka: string
          product_id: string
          severity: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          flaw_type: string
          id?: string
          image_id?: string | null
          location_ka?: string | null
          note_ka: string
          product_id: string
          severity: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          flaw_type?: string
          id?: string
          image_id?: string | null
          location_ka?: string | null
          note_ka?: string
          product_id?: string
          severity?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_flaws_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "product_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_flaws_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          content_type: string
          created_at: string
          id: string
          kind: string
          object_key: string
          original_name: string
          product_id: string
          size_bytes: number
          sort_order: number
        }
        Insert: {
          alt_text?: string | null
          content_type: string
          created_at?: string
          id?: string
          kind?: string
          object_key: string
          original_name: string
          product_id: string
          size_bytes: number
          sort_order?: number
        }
        Update: {
          alt_text?: string | null
          content_type?: string
          created_at?: string
          id?: string
          kind?: string
          object_key?: string
          original_name?: string
          product_id?: string
          size_bytes?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          condition_grade: string | null
          condition_summary: string | null
          created_at: string
          depth_cm: number | null
          description: string
          dimension_note: string | null
          height_cm: number | null
          id: string
          listing_kind: string
          name: string
          price: number
          seat_height_cm: number | null
          slug: string
          status: string
          stock_quantity: number | null
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          category_id: string
          condition_grade?: string | null
          condition_summary?: string | null
          created_at?: string
          depth_cm?: number | null
          description?: string
          dimension_note?: string | null
          height_cm?: number | null
          id?: string
          listing_kind?: string
          name: string
          price: number
          seat_height_cm?: number | null
          slug: string
          status?: string
          stock_quantity?: number | null
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          category_id?: string
          condition_grade?: string | null
          condition_summary?: string | null
          created_at?: string
          depth_cm?: number | null
          description?: string
          dimension_note?: string | null
          height_cm?: number | null
          id?: string
          listing_kind?: string
          name?: string
          price?: number
          seat_height_cm?: number | null
          slug?: string
          status?: string
          stock_quantity?: number | null
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_condition_grade_fkey"
            columns: ["condition_grade"]
            isOneToOne: false
            referencedRelation: "condition_grades"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      release_contact_email_quota: {
        Args: { p_client_id: string; p_secret: string }
        Returns: undefined
      }
      reserve_contact_email_quota: {
        Args: { p_client_id: string; p_secret: string }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
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
    Enums: {},
  },
} as const

