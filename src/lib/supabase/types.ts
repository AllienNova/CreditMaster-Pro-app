/**
 * Supabase Database Types
 *
 * Generated types for type-safe database access
 */

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
          full_name: string | null
          subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise'
          subscription_status: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise'
          subscription_status?: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise'
          subscription_status?: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      disputes: {
        Row: {
          id: string
          user_id: string
          bureau: 'experian' | 'equifax' | 'transunion'
          status: 'draft' | 'sent' | 'under_review' | 'resolved' | 'rejected'
          item_type: string
          item_description: string
          reason: string
          letter_content: string
          outcome: 'removed' | 'updated' | 'verified' | null
          created_at: string
          sent_at: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          bureau: 'experian' | 'equifax' | 'transunion'
          status?: 'draft' | 'sent' | 'under_review' | 'resolved' | 'rejected'
          item_type: string
          item_description: string
          reason: string
          letter_content: string
          outcome?: 'removed' | 'updated' | 'verified' | null
          created_at?: string
          sent_at?: string | null
          resolved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          bureau?: 'experian' | 'equifax' | 'transunion'
          status?: 'draft' | 'sent' | 'under_review' | 'resolved' | 'rejected'
          item_type?: string
          item_description?: string
          reason?: string
          letter_content?: string
          outcome?: 'removed' | 'updated' | 'verified' | null
          created_at?: string
          sent_at?: string | null
          resolved_at?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          type: 'credit_report' | 'id' | 'proof_of_address' | 'supporting_doc'
          name: string
          original_name: string
          size: number
          mime_type: string
          s3_key: string
          s3_url: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'credit_report' | 'id' | 'proof_of_address' | 'supporting_doc'
          name: string
          original_name: string
          size: number
          mime_type: string
          s3_key: string
          s3_url?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'credit_report' | 'id' | 'proof_of_address' | 'supporting_doc'
          name?: string
          original_name?: string
          size?: number
          mime_type?: string
          s3_key?: string
          s3_url?: string | null
          uploaded_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'dispute_update' | 'payment_success' | 'document_uploaded' | 'tip'
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'dispute_update' | 'payment_success' | 'document_uploaded' | 'tip'
          title: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'dispute_update' | 'payment_success' | 'document_uploaded' | 'tip'
          title?: string
          message?: string
          read?: boolean
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          status: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_subscription_id?: string
          stripe_price_id?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // Marketplace tables
      marketplace_providers: {
        Row: {
          id: string
          name: string
          description: string | null
          website: string | null
          logo_url: string | null
          rating: number
          review_count: number
          bbb_rating: string | null
          years_in_business: number | null
          verified: boolean
          category: 'tradeline' | 'credit_repair' | 'monitoring' | 'education' | 'legal' | 'coaching'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          website?: string | null
          logo_url?: string | null
          rating?: number
          review_count?: number
          bbb_rating?: string | null
          years_in_business?: number | null
          verified?: boolean
          category: 'tradeline' | 'credit_repair' | 'monitoring' | 'education' | 'legal' | 'coaching'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          website?: string | null
          logo_url?: string | null
          rating?: number
          review_count?: number
          bbb_rating?: string | null
          years_in_business?: number | null
          verified?: boolean
          category?: 'tradeline' | 'credit_repair' | 'monitoring' | 'education' | 'legal' | 'coaching'
          created_at?: string
          updated_at?: string
        }
      }
      marketplace_products: {
        Row: {
          id: string
          provider_id: string
          name: string
          description: string | null
          category: string
          price: number
          price_type: 'one_time' | 'monthly' | 'yearly'
          rating: number
          review_count: number
          features: Json
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          name: string
          description?: string | null
          category: string
          price: number
          price_type?: 'one_time' | 'monthly' | 'yearly'
          rating?: number
          review_count?: number
          features?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          name?: string
          description?: string | null
          category?: string
          price?: number
          price_type?: 'one_time' | 'monthly' | 'yearly'
          rating?: number
          review_count?: number
          features?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      marketplace_reviews: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          provider_id: string | null
          rating: number
          title: string | null
          content: string
          verified_purchase: boolean
          helpful_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          provider_id?: string | null
          rating: number
          title?: string | null
          content: string
          verified_purchase?: boolean
          helpful_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          provider_id?: string | null
          rating?: number
          title?: string | null
          content?: string
          verified_purchase?: boolean
          helpful_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      tradelines: {
        Row: {
          id: string
          provider_id: string
          credit_limit: number
          age_months: number
          utilization: number
          price: number
          estimated_score_impact: number
          bureaus_reporting: string[]
          available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          credit_limit: number
          age_months: number
          utilization?: number
          price: number
          estimated_score_impact?: number
          bureaus_reporting?: string[]
          available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          credit_limit?: number
          age_months?: number
          utilization?: number
          price?: number
          estimated_score_impact?: number
          bureaus_reporting?: string[]
          available?: boolean
          created_at?: string
          updated_at?: string
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
  }
}
