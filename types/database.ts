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
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string | null
          plan_limits: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
          plan_limits?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
          plan_limits?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contract_status_history: {
        Row: {
          changed_by: string | null
          contract_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          status: string
        }
        Insert: {
          changed_by?: string | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status: string
        }
        Update: {
          changed_by?: string | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_status_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          ai_clauses: Json | null
          buyer_email: string
          buyer_name: string
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: Json | null
          documenso_document_id: string | null
          id: string
          price: number
          property_id: string | null
          seller_email: string
          seller_name: string
          sent_at: string | null
          signed_pdf_url: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          ai_clauses?: Json | null
          buyer_email: string
          buyer_name: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          documenso_document_id?: string | null
          id?: string
          price: number
          property_id?: string | null
          seller_email: string
          seller_name: string
          sent_at?: string | null
          signed_pdf_url?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          ai_clauses?: Json | null
          buyer_email?: string
          buyer_name?: string
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: Json | null
          documenso_document_id?: string | null
          id?: string
          price?: number
          property_id?: string | null
          seller_email?: string
          seller_name?: string
          sent_at?: string | null
          signed_pdf_url?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          address_normalized: string | null
          city: string | null
          company_id: string | null
          created_at: string | null
          id: string
          state: string | null
          zip: string | null
        }
        Insert: {
          address: string
          address_normalized?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string
          address_normalized?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      state_templates: {
        Row: {
          assignment_contract_file_name: string | null
          assignment_contract_html: string | null
          assignment_contract_template_id: string | null
          created_at: string | null
          id: string
          is_assignment_customized: boolean | null
          is_general: boolean | null
          is_purchase_customized: boolean | null
          purchase_agreement_file_name: string | null
          purchase_agreement_html: string | null
          purchase_agreement_template_id: string | null
          state_code: string
          state_name: string
          updated_at: string | null
          use_general_template: boolean | null
        }
        Insert: {
          assignment_contract_file_name?: string | null
          assignment_contract_html?: string | null
          assignment_contract_template_id?: string | null
          created_at?: string | null
          id?: string
          is_assignment_customized?: boolean | null
          is_general?: boolean | null
          is_purchase_customized?: boolean | null
          purchase_agreement_file_name?: string | null
          purchase_agreement_html?: string | null
          purchase_agreement_template_id?: string | null
          state_code: string
          state_name: string
          updated_at?: string | null
          use_general_template?: boolean | null
        }
        Update: {
          assignment_contract_file_name?: string | null
          assignment_contract_html?: string | null
          assignment_contract_template_id?: string | null
          created_at?: string | null
          id?: string
          is_assignment_customized?: boolean | null
          is_general?: boolean | null
          is_purchase_customized?: boolean | null
          purchase_agreement_file_name?: string | null
          purchase_agreement_html?: string | null
          purchase_agreement_template_id?: string | null
          state_code?: string
          state_name?: string
          updated_at?: string | null
          use_general_template?: boolean | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          ai_clause_config: Json | null
          assignment_contract_file_name: string | null
          created_at: string | null
          description: string | null
          documenso_assignment_template_id: string | null
          documenso_template_id: string | null
          id: string
          is_active: boolean | null
          name: string
          purchase_agreement_file_name: string | null
          state: string
          updated_at: string | null
          use_general_template: boolean | null
        }
        Insert: {
          ai_clause_config?: Json | null
          assignment_contract_file_name?: string | null
          created_at?: string | null
          description?: string | null
          documenso_assignment_template_id?: string | null
          documenso_template_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          purchase_agreement_file_name?: string | null
          state: string
          updated_at?: string | null
          use_general_template?: boolean | null
        }
        Update: {
          ai_clause_config?: Json | null
          assignment_contract_file_name?: string | null
          created_at?: string | null
          description?: string | null
          documenso_assignment_template_id?: string | null
          documenso_template_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          purchase_agreement_file_name?: string | null
          state?: string
          updated_at?: string | null
          use_general_template?: boolean | null
        }
        Relationships: []
      }
      users: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      normalize_address: { Args: { addr: string }; Returns: string }
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

// Convenience types
export type Company = Database['public']['Tables']['companies']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Invite = Database['public']['Tables']['invites']['Row']
export type Template = Database['public']['Tables']['templates']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type Contract = Database['public']['Tables']['contracts']['Row']
export type ContractStatusHistory = Database['public']['Tables']['contract_status_history']['Row']
export type StateTemplate = Database['public']['Tables']['state_templates']['Row']

// Company Templates (user-created)
export interface CustomField {
  key: string
  label: string
  fieldType: 'text' | 'number' | 'date' | 'email' | 'phone' | 'textarea'
  required: boolean
}

export interface CompanyTemplate {
  id: string
  company_id: string
  created_by: string | null
  name: string
  description: string | null
  tags: string[]
  html_content: string
  signature_layout: 'two-column' | 'seller-only' | 'three-party'
  custom_fields: CustomField[]
  used_placeholders: string[]
  is_example: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
