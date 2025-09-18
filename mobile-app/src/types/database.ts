export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          address: Json
          created_at: string
          updated_at: string
          subscription_tier: 'basic' | 'premium' | 'enterprise'
          onboarding_completed: boolean
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          address: Json
          created_at?: string
          updated_at?: string
          subscription_tier?: 'basic' | 'premium' | 'enterprise'
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          address?: Json
          created_at?: string
          updated_at?: string
          subscription_tier?: 'basic' | 'premium' | 'enterprise'
          onboarding_completed?: boolean
        }
      }
      credit_reports: {
        Row: {
          id: string
          user_id: string
          bureau: 'experian' | 'equifax' | 'transunion'
          report_date: string
          credit_score: number
          raw_data: Json
          parsed_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bureau: 'experian' | 'equifax' | 'transunion'
          report_date: string
          credit_score: number
          raw_data: Json
          parsed_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bureau?: 'experian' | 'equifax' | 'transunion'
          report_date?: string
          credit_score?: number
          raw_data?: Json
          parsed_data?: Json
          created_at?: string
        }
      }
      credit_items: {
        Row: {
          id: string
          user_id: string
          report_id: string
          item_type: 'account' | 'inquiry' | 'public_record' | 'collection'
          creditor: string
          furnisher: string | null
          account_number: string | null
          account_type: string | null
          balance: number | null
          original_balance: number | null
          credit_limit: number | null
          payment_status: string
          date_opened: string | null
          date_closed: string | null
          last_payment_date: string | null
          first_reported_date: string
          last_reported_date: string
          status: 'active' | 'closed' | 'disputed' | 'resolved'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          report_id: string
          item_type: 'account' | 'inquiry' | 'public_record' | 'collection'
          creditor: string
          furnisher?: string | null
          account_number?: string | null
          account_type?: string | null
          balance?: number | null
          original_balance?: number | null
          credit_limit?: number | null
          payment_status: string
          date_opened?: string | null
          date_closed?: string | null
          last_payment_date?: string | null
          first_reported_date: string
          last_reported_date: string
          status?: 'active' | 'closed' | 'disputed' | 'resolved'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          report_id?: string
          item_type?: 'account' | 'inquiry' | 'public_record' | 'collection'
          creditor?: string
          furnisher?: string | null
          account_number?: string | null
          account_type?: string | null
          balance?: number | null
          original_balance?: number | null
          credit_limit?: number | null
          payment_status?: string
          date_opened?: string | null
          date_closed?: string | null
          last_payment_date?: string | null
          first_reported_date?: string
          last_reported_date?: string
          status?: 'active' | 'closed' | 'disputed' | 'resolved'
          created_at?: string
          updated_at?: string
        }
      }
      strategies: {
        Row: {
          id: string
          strategy_name: string
          strategy_type: string
          legal_basis: string
          success_rate: number
          tier: number
          target_items: string[]
          key_tactics: string[]
          prerequisites: string[] | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          strategy_name: string
          strategy_type: string
          legal_basis: string
          success_rate: number
          tier: number
          target_items: string[]
          key_tactics: string[]
          prerequisites?: string[] | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          strategy_name?: string
          strategy_type?: string
          legal_basis?: string
          success_rate?: number
          tier?: number
          target_items?: string[]
          key_tactics?: string[]
          prerequisites?: string[] | null
          is_active?: boolean
          created_at?: string
        }
      }
      strategy_executions: {
        Row: {
          id: string
          user_id: string
          item_id: string
          strategy_id: string
          execution_status: 'pending' | 'executing' | 'completed' | 'failed'
          started_at: string
          completed_at: string | null
          success: boolean | null
          outcome_details: Json
          next_strategy_recommended: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          strategy_id: string
          execution_status?: 'pending' | 'executing' | 'completed' | 'failed'
          started_at?: string
          completed_at?: string | null
          success?: boolean | null
          outcome_details?: Json
          next_strategy_recommended?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          strategy_id?: string
          execution_status?: 'pending' | 'executing' | 'completed' | 'failed'
          started_at?: string
          completed_at?: string | null
          success?: boolean | null
          outcome_details?: Json
          next_strategy_recommended?: string | null
          created_at?: string
        }
      }
      dispute_history: {
        Row: {
          id: string
          item_id: string
          strategy_id: string
          dispute_date: string
          bureau: 'experian' | 'equifax' | 'transunion' | 'furnisher'
          dispute_reason: string
          status: 'pending' | 'investigating' | 'resolved' | 'verified' | 'deleted' | 'modified'
          response_date: string | null
          outcome: string | null
          next_action: string | null
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          strategy_id: string
          dispute_date: string
          bureau: 'experian' | 'equifax' | 'transunion' | 'furnisher'
          dispute_reason: string
          status?: 'pending' | 'investigating' | 'resolved' | 'verified' | 'deleted' | 'modified'
          response_date?: string | null
          outcome?: string | null
          next_action?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          strategy_id?: string
          dispute_date?: string
          bureau?: 'experian' | 'equifax' | 'transunion' | 'furnisher'
          dispute_reason?: string
          status?: 'pending' | 'investigating' | 'resolved' | 'verified' | 'deleted' | 'modified'
          response_date?: string | null
          outcome?: string | null
          next_action?: string | null
          created_at?: string
        }
      }
      ai_analysis: {
        Row: {
          id: string
          user_id: string
          item_id: string | null
          analysis_type: 'credit_item' | 'portfolio' | 'strategy_selection'
          analysis_data: Json
          confidence_score: number
          recommendations: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_id?: string | null
          analysis_type: 'credit_item' | 'portfolio' | 'strategy_selection'
          analysis_data: Json
          confidence_score: number
          recommendations: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string | null
          analysis_type?: 'credit_item' | 'portfolio' | 'strategy_selection'
          analysis_data?: Json
          confidence_score?: number
          recommendations?: string[]
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          document_type: 'credit_report' | 'dispute_letter' | 'response_letter' | 'legal_document'
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_type: 'credit_report' | 'dispute_letter' | 'response_letter' | 'legal_document'
          file_name: string
          file_path: string
          file_size: number
          mime_type: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: 'credit_report' | 'dispute_letter' | 'response_letter' | 'legal_document'
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          metadata?: Json
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'dispute_update' | 'strategy_recommendation' | 'credit_score_change' | 'system_alert'
          title: string
          message: string
          read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'dispute_update' | 'strategy_recommendation' | 'credit_score_change' | 'system_alert'
          title: string
          message: string
          read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'dispute_update' | 'strategy_recommendation' | 'credit_score_change' | 'system_alert'
          title?: string
          message?: string
          read?: boolean
          action_url?: string | null
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan: 'basic' | 'premium' | 'enterprise'
          status: 'active' | 'canceled' | 'past_due' | 'trialing'
          current_period_start: string
          current_period_end: string
          stripe_subscription_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan: 'basic' | 'premium' | 'enterprise'
          status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          current_period_start: string
          current_period_end: string
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan?: 'basic' | 'premium' | 'enterprise'
          status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          current_period_start?: string
          current_period_end?: string
          stripe_subscription_id?: string | null
          created_at?: string
        }
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

