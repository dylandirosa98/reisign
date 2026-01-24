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
          // New billing fields
          billing_plan: 'free' | 'individual' | 'team' | 'business' | 'admin'
          actual_plan: 'free' | 'individual' | 'team' | 'business' | 'admin'
          billing_period_start: string | null
          contracts_used_this_period: number
          subscription_status: string
          trial_ends_at: string | null
          billing_email: string | null
          overage_behavior: 'auto_charge' | 'warn_each'
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
          billing_plan?: 'free' | 'individual' | 'team' | 'business' | 'admin'
          actual_plan?: 'free' | 'individual' | 'team' | 'business' | 'admin'
          billing_period_start?: string | null
          contracts_used_this_period?: number
          subscription_status?: string
          trial_ends_at?: string | null
          billing_email?: string | null
          overage_behavior?: 'auto_charge' | 'warn_each'
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
          billing_plan?: 'free' | 'individual' | 'team' | 'business' | 'admin'
          actual_plan?: 'free' | 'individual' | 'team' | 'business' | 'admin'
          billing_period_start?: string | null
          contracts_used_this_period?: number
          subscription_status?: string
          trial_ends_at?: string | null
          billing_email?: string | null
          overage_behavior?: 'auto_charge' | 'warn_each'
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
      usage_logs: {
        Row: {
          id: string
          company_id: string | null
          user_id: string | null
          action_type: string
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_id?: string | null
          user_id?: string | null
          action_type: string
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          user_id?: string | null
          action_type?: string
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          is_system_admin: boolean
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
          is_system_admin?: boolean
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
          is_system_admin?: boolean
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

// Standard field configuration for templates
export interface StandardFieldConfig {
  visible: boolean
  required: boolean
}

// All available standard fields that can be configured
export type StandardFieldKey =
  // Property fields
  | 'property_address'
  | 'property_city'
  | 'property_state'
  | 'property_zip'
  | 'apn'
  // Seller fields
  | 'seller_name'
  | 'seller_email'
  | 'seller_phone'
  | 'seller_address'
  // Buyer/Assignee fields (for assignment contracts)
  | 'buyer_name'
  | 'buyer_email'
  | 'buyer_phone'
  // Financial fields
  | 'purchase_price'
  | 'earnest_money'
  | 'assignment_fee'
  // Escrow fields
  | 'escrow_agent_name'
  | 'escrow_agent_address'
  | 'escrow_officer'
  | 'escrow_agent_email'
  // Terms fields
  | 'close_of_escrow'
  | 'inspection_period'
  | 'personal_property'
  | 'additional_terms'
  // Closing amounts (Section 1.10)
  | 'escrow_fees_split'
  | 'title_policy_paid_by'
  | 'hoa_fees_split'

// Template field configuration
export interface TemplateFieldConfig {
  standardFields: Partial<Record<StandardFieldKey, StandardFieldConfig>>
  // customFields is already in the template as custom_fields array
}

// Default field configuration (all fields visible, core fields required)
export const DEFAULT_FIELD_CONFIG: TemplateFieldConfig = {
  standardFields: {
    // Property - always visible, address required
    property_address: { visible: true, required: true },
    property_city: { visible: true, required: true },
    property_state: { visible: true, required: true },
    property_zip: { visible: true, required: true },
    apn: { visible: true, required: false },
    // Seller - always visible, name/email required
    seller_name: { visible: true, required: true },
    seller_email: { visible: true, required: true },
    seller_phone: { visible: true, required: false },
    seller_address: { visible: true, required: false },
    // Buyer - visible by default for assignments
    buyer_name: { visible: true, required: false },
    buyer_email: { visible: true, required: false },
    buyer_phone: { visible: true, required: false },
    // Financial
    purchase_price: { visible: true, required: true },
    earnest_money: { visible: true, required: false },
    assignment_fee: { visible: true, required: false },
    // Escrow
    escrow_agent_name: { visible: true, required: false },
    escrow_agent_address: { visible: true, required: false },
    escrow_officer: { visible: true, required: false },
    escrow_agent_email: { visible: true, required: false },
    // Terms
    close_of_escrow: { visible: true, required: false },
    inspection_period: { visible: true, required: false },
    personal_property: { visible: true, required: false },
    additional_terms: { visible: true, required: false },
    // Closing amounts
    escrow_fees_split: { visible: true, required: false },
    title_policy_paid_by: { visible: true, required: false },
    hoa_fees_split: { visible: true, required: false },
  },
}

// Field metadata for UI display
export interface FieldMetadata {
  key: StandardFieldKey
  label: string
  group: 'property' | 'seller' | 'buyer' | 'financial' | 'escrow' | 'terms' | 'closing'
  fieldType: 'text' | 'number' | 'date' | 'email' | 'phone' | 'textarea' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
}

export const STANDARD_FIELDS_METADATA: FieldMetadata[] = [
  // Property
  { key: 'property_address', label: 'Property Address', group: 'property', fieldType: 'text', placeholder: '123 Main St' },
  { key: 'property_city', label: 'City', group: 'property', fieldType: 'text', placeholder: 'Phoenix' },
  { key: 'property_state', label: 'State', group: 'property', fieldType: 'text', placeholder: 'AZ' },
  { key: 'property_zip', label: 'ZIP Code', group: 'property', fieldType: 'text', placeholder: '85001' },
  { key: 'apn', label: 'APN (Parcel Number)', group: 'property', fieldType: 'text', placeholder: '123-45-678' },
  // Seller
  { key: 'seller_name', label: 'Seller Name', group: 'seller', fieldType: 'text', placeholder: 'John Smith' },
  { key: 'seller_email', label: 'Seller Email', group: 'seller', fieldType: 'email', placeholder: 'seller@email.com' },
  { key: 'seller_phone', label: 'Seller Phone', group: 'seller', fieldType: 'phone', placeholder: '(555) 123-4567' },
  { key: 'seller_address', label: 'Seller Address', group: 'seller', fieldType: 'text', placeholder: '456 Oak Ave, City, ST 12345' },
  // Buyer
  { key: 'buyer_name', label: 'End Buyer Name', group: 'buyer', fieldType: 'text', placeholder: 'Jane Doe' },
  { key: 'buyer_email', label: 'End Buyer Email', group: 'buyer', fieldType: 'email', placeholder: 'buyer@email.com' },
  { key: 'buyer_phone', label: 'End Buyer Phone', group: 'buyer', fieldType: 'phone', placeholder: '(555) 987-6543' },
  // Financial
  { key: 'purchase_price', label: 'Purchase Price', group: 'financial', fieldType: 'number', placeholder: '250,000' },
  { key: 'earnest_money', label: 'Earnest Money Deposit', group: 'financial', fieldType: 'number', placeholder: '5,000' },
  { key: 'assignment_fee', label: 'Assignment Fee', group: 'financial', fieldType: 'number', placeholder: '10,000' },
  // Escrow
  { key: 'escrow_agent_name', label: 'Escrow/Title Company', group: 'escrow', fieldType: 'text', placeholder: 'First American Title' },
  { key: 'escrow_agent_address', label: 'Escrow Company Address', group: 'escrow', fieldType: 'text', placeholder: '789 Title Blvd, Suite 100' },
  { key: 'escrow_officer', label: 'Escrow Officer', group: 'escrow', fieldType: 'text', placeholder: 'Sarah Johnson' },
  { key: 'escrow_agent_email', label: 'Escrow Email', group: 'escrow', fieldType: 'email', placeholder: 'escrow@title.com' },
  // Terms
  { key: 'close_of_escrow', label: 'Close of Escrow Date', group: 'terms', fieldType: 'date' },
  { key: 'inspection_period', label: 'Inspection Period (days)', group: 'terms', fieldType: 'text', placeholder: '10 days' },
  { key: 'personal_property', label: 'Personal Property Included', group: 'terms', fieldType: 'textarea', placeholder: 'Refrigerator, washer, dryer...' },
  { key: 'additional_terms', label: 'Additional Terms', group: 'terms', fieldType: 'textarea', placeholder: 'Any additional contract terms...' },
  // Closing
  { key: 'escrow_fees_split', label: 'Escrow Fees', group: 'closing', fieldType: 'select', options: [{ value: 'split', label: 'Split 50/50' }, { value: 'buyer', label: 'Buyer pays' }] },
  { key: 'title_policy_paid_by', label: 'Title Policy Paid By', group: 'closing', fieldType: 'select', options: [{ value: 'seller', label: 'Seller' }, { value: 'buyer', label: 'Buyer' }] },
  { key: 'hoa_fees_split', label: 'HOA Transfer Fees', group: 'closing', fieldType: 'select', options: [{ value: 'split', label: 'Split 50/50' }, { value: 'buyer', label: 'Buyer pays' }] },
]

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
  field_config: TemplateFieldConfig | null
  is_example: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
