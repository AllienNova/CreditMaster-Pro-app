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
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          subscription_tier:
            | "free"
            | "standard"
            | "pro"
            | "family-duo"
            | "family"
            | "family-plus";
          subscription_status: "active" | "canceled" | "past_due" | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          subscription_tier?:
            | "free"
            | "standard"
            | "pro"
            | "family-duo"
            | "family"
            | "family-plus";
          subscription_status?: "active" | "canceled" | "past_due" | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          subscription_tier?:
            | "free"
            | "standard"
            | "pro"
            | "family-duo"
            | "family"
            | "family-plus";
          subscription_status?: "active" | "canceled" | "past_due" | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          user_id: string;
          bureau: "experian" | "equifax" | "transunion";
          status: "draft" | "sent" | "under_review" | "resolved" | "rejected";
          item_type: string;
          item_description: string;
          reason: string;
          letter_content: string;
          outcome: "removed" | "updated" | "verified" | null;
          created_at: string;
          sent_at: string | null;
          resolved_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          bureau: "experian" | "equifax" | "transunion";
          status?: "draft" | "sent" | "under_review" | "resolved" | "rejected";
          item_type: string;
          item_description: string;
          reason: string;
          letter_content: string;
          outcome?: "removed" | "updated" | "verified" | null;
          created_at?: string;
          sent_at?: string | null;
          resolved_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          bureau?: "experian" | "equifax" | "transunion";
          status?: "draft" | "sent" | "under_review" | "resolved" | "rejected";
          item_type?: string;
          item_description?: string;
          reason?: string;
          letter_content?: string;
          outcome?: "removed" | "updated" | "verified" | null;
          created_at?: string;
          sent_at?: string | null;
          resolved_at?: string | null;
          notes?: string | null;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          type: "credit_report" | "id" | "proof_of_address" | "supporting_doc";
          name: string;
          original_name: string;
          size: number;
          mime_type: string;
          s3_key: string;
          s3_url: string | null;
          uploaded_at: string;
          metadata: Json | null;
          tags: string[] | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "credit_report" | "id" | "proof_of_address" | "supporting_doc";
          name: string;
          original_name: string;
          size: number;
          mime_type: string;
          s3_key: string;
          s3_url?: string | null;
          uploaded_at?: string;
          metadata?: Json | null;
          tags?: string[] | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "credit_report" | "id" | "proof_of_address" | "supporting_doc";
          name?: string;
          original_name?: string;
          size?: number;
          mime_type?: string;
          s3_key?: string;
          s3_url?: string | null;
          uploaded_at?: string;
          metadata?: Json | null;
          tags?: string[] | null;
        };
      };
      document_share_links: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          recipients: string[];
          permissions: "view" | "download";
          url: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          recipients?: string[];
          permissions?: "view" | "download";
          url: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string;
          recipients?: string[];
          permissions?: "view" | "download";
          url?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type:
            | "dispute_update"
            | "payment_success"
            | "document_uploaded"
            | "tip"
            | "dispute_overdue"
            | "dispute_reminder"
            | "draft_reminder"
            | "score_reminder"
            | "subscription_expiring"
            | "welcome"
            | "system";
          title: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type:
            | "dispute_update"
            | "payment_success"
            | "document_uploaded"
            | "tip"
            | "dispute_overdue"
            | "dispute_reminder"
            | "draft_reminder"
            | "score_reminder"
            | "subscription_expiring"
            | "welcome"
            | "system";
          title: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?:
            | "dispute_update"
            | "payment_success"
            | "document_uploaded"
            | "tip"
            | "dispute_overdue"
            | "dispute_reminder"
            | "draft_reminder"
            | "score_reminder"
            | "subscription_expiring"
            | "welcome"
            | "system";
          title?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id: string;
          stripe_price_id: string;
          status: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string;
          stripe_price_id?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Marketplace tables
      marketplace_providers: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          website: string | null;
          logo_url: string | null;
          rating: number;
          review_count: number;
          bbb_rating: string | null;
          years_in_business: number | null;
          verified: boolean;
          category:
            | "tradeline"
            | "credit_repair"
            | "monitoring"
            | "education"
            | "legal"
            | "coaching";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          website?: string | null;
          logo_url?: string | null;
          rating?: number;
          review_count?: number;
          bbb_rating?: string | null;
          years_in_business?: number | null;
          verified?: boolean;
          category:
            | "tradeline"
            | "credit_repair"
            | "monitoring"
            | "education"
            | "legal"
            | "coaching";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          website?: string | null;
          logo_url?: string | null;
          rating?: number;
          review_count?: number;
          bbb_rating?: string | null;
          years_in_business?: number | null;
          verified?: boolean;
          category?:
            | "tradeline"
            | "credit_repair"
            | "monitoring"
            | "education"
            | "legal"
            | "coaching";
          created_at?: string;
          updated_at?: string;
        };
      };
      marketplace_products: {
        Row: {
          id: string;
          provider_id: string;
          name: string;
          description: string | null;
          category: string;
          price: number;
          price_type: "one_time" | "monthly" | "yearly";
          rating: number;
          review_count: number;
          features: Json;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          name: string;
          description?: string | null;
          category: string;
          price: number;
          price_type?: "one_time" | "monthly" | "yearly";
          rating?: number;
          review_count?: number;
          features?: Json;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          price?: number;
          price_type?: "one_time" | "monthly" | "yearly";
          rating?: number;
          review_count?: number;
          features?: Json;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      marketplace_reviews: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          provider_id: string | null;
          rating: number;
          title: string | null;
          content: string;
          verified_purchase: boolean;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          provider_id?: string | null;
          rating: number;
          title?: string | null;
          content: string;
          verified_purchase?: boolean;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          provider_id?: string | null;
          rating?: number;
          title?: string | null;
          content?: string;
          verified_purchase?: boolean;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tradelines: {
        Row: {
          id: string;
          provider_id: string;
          credit_limit: number;
          age_months: number;
          utilization: number;
          price: number;
          estimated_score_impact: number;
          bureaus_reporting: string[];
          available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          credit_limit: number;
          age_months: number;
          utilization?: number;
          price: number;
          estimated_score_impact?: number;
          bureaus_reporting?: string[];
          available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          credit_limit?: number;
          age_months?: number;
          utilization?: number;
          price?: number;
          estimated_score_impact?: number;
          bureaus_reporting?: string[];
          available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_reports: {
        Row: {
          id: string;
          user_id: string;
          bureau: "experian" | "equifax" | "transunion";
          report_date: string;
          score: number;
          report_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bureau: "experian" | "equifax" | "transunion";
          report_date: string;
          score: number;
          report_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bureau?: "experian" | "equifax" | "transunion";
          report_date?: string;
          score?: number;
          report_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      student_loans: {
        Row: {
          id: string;
          user_id: string;
          servicer: string;
          loan_type: string;
          balance: number;
          interest_rate: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          servicer: string;
          loan_type: string;
          balance: number;
          interest_rate: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          servicer?: string;
          loan_type?: string;
          balance?: number;
          interest_rate?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          benchmark: string | null;
          is_default: boolean;
          total_value: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          benchmark?: string | null;
          is_default?: boolean;
          total_value?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          benchmark?: string | null;
          is_default?: boolean;
          total_value?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      portfolio_holdings: {
        Row: {
          id: string;
          portfolio_id: string;
          symbol: string;
          shares: number;
          cost_basis: number;
          current_price: number;
          current_value: number;
          sector: string | null;
          asset_class: string | null;
          purchase_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          symbol: string;
          shares: number;
          cost_basis: number;
          current_price?: number;
          current_value?: number;
          sector?: string | null;
          asset_class?: string | null;
          purchase_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          symbol?: string;
          shares?: number;
          cost_basis?: number;
          current_price?: number;
          current_value?: number;
          sector?: string | null;
          asset_class?: string | null;
          purchase_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Financial Vitality Score Tables
      income_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          frequency: "weekly" | "biweekly" | "semimonthly" | "monthly";
          next_pay_date: string;
          last_pay_date: string | null;
          account_id: string | null;
          is_auto_detected: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          frequency: "weekly" | "biweekly" | "semimonthly" | "monthly";
          next_pay_date: string;
          last_pay_date?: string | null;
          account_id?: string | null;
          is_auto_detected?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          amount?: number;
          frequency?: "weekly" | "biweekly" | "semimonthly" | "monthly";
          next_pay_date?: string;
          last_pay_date?: string | null;
          account_id?: string | null;
          is_auto_detected?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          merchant_name: string;
          amount: number;
          frequency: "weekly" | "monthly" | "quarterly" | "yearly";
          category: string;
          status: "active" | "pending_cancellation" | "cancelled" | "paused";
          next_billing_date: string | null;
          detected_from_bill_id: string | null;
          cancellation_status: string | null;
          cancelled_at: string | null;
          annual_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          merchant_name: string;
          amount: number;
          frequency: "weekly" | "monthly" | "quarterly" | "yearly";
          category: string;
          status?: "active" | "pending_cancellation" | "cancelled" | "paused";
          next_billing_date?: string | null;
          detected_from_bill_id?: string | null;
          cancellation_status?: string | null;
          cancelled_at?: string | null;
          annual_cost: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          merchant_name?: string;
          amount?: number;
          frequency?: "weekly" | "monthly" | "quarterly" | "yearly";
          category?: string;
          status?: "active" | "pending_cancellation" | "cancelled" | "paused";
          next_billing_date?: string | null;
          detected_from_bill_id?: string | null;
          cancellation_status?: string | null;
          cancelled_at?: string | null;
          annual_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      cancellation_requests: {
        Row: {
          id: string;
          subscription_id: string;
          user_id: string;
          status: "initiated" | "in_progress" | "completed" | "failed";
          method: "ai_assist" | "self_service" | "contact_info";
          ai_script: string | null;
          instructions: Json | null;
          contact_info: Json | null;
          outcome: "cancelled" | "retained" | "pending" | null;
          notes: string | null;
          savings_amount: number;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          user_id: string;
          status?: "initiated" | "in_progress" | "completed" | "failed";
          method: "ai_assist" | "self_service" | "contact_info";
          ai_script?: string | null;
          instructions?: Json | null;
          contact_info?: Json | null;
          outcome?: "cancelled" | "retained" | "pending" | null;
          notes?: string | null;
          savings_amount: number;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          user_id?: string;
          status?: "initiated" | "in_progress" | "completed" | "failed";
          method?: "ai_assist" | "self_service" | "contact_info";
          ai_script?: string | null;
          instructions?: Json | null;
          contact_info?: Json | null;
          outcome?: "cancelled" | "retained" | "pending" | null;
          notes?: string | null;
          savings_amount?: number;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      transaction_rules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          conditions: Json;
          condition_logic: "AND" | "OR";
          actions: Json;
          is_active: boolean;
          priority: number;
          match_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          conditions: Json;
          condition_logic?: "AND" | "OR";
          actions: Json;
          is_active?: boolean;
          priority?: number;
          match_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          conditions?: Json;
          condition_logic?: "AND" | "OR";
          actions?: Json;
          is_active?: boolean;
          priority?: number;
          match_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      vitality_scores: {
        Row: {
          id: string;
          user_id: string;
          overall: number;
          grade: string;
          percentile: number;
          components: Json;
          trend: string;
          trend_percentage: number;
          quick_wins: Json | null;
          next_milestone: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          overall: number;
          grade: string;
          percentile: number;
          components: Json;
          trend?: string;
          trend_percentage?: number;
          quick_wins?: Json | null;
          next_milestone?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          overall?: number;
          grade?: string;
          percentile?: number;
          components?: Json;
          trend?: string;
          trend_percentage?: number;
          quick_wins?: Json | null;
          next_milestone?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vitality_score_history: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          overall: number;
          credit: number;
          spending: number;
          savings: number;
          debt: number;
          investments: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          overall: number;
          credit: number;
          spending: number;
          savings: number;
          debt: number;
          investments: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          overall?: number;
          credit?: number;
          spending?: number;
          savings?: number;
          debt?: number;
          investments?: number;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          date: string;
          amount: number;
          merchant_name: string | null;
          category: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          date: string;
          amount: number;
          merchant_name?: string | null;
          category?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          date?: string;
          amount?: number;
          merchant_name?: string | null;
          category?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Web Push Subscriptions
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          keys_p256dh: string;
          keys_auth: string;
          user_agent: string | null;
          is_active: boolean;
          last_used: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          keys_p256dh: string;
          keys_auth: string;
          user_agent?: string | null;
          is_active?: boolean;
          last_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          keys_p256dh?: string;
          keys_auth?: string;
          user_agent?: string | null;
          is_active?: boolean;
          last_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_risk_settings: {
        Row: {
          id: string;
          user_id: string;
          settings: Json;
          kill_switch: Json;
          equity: number;
          peak_equity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          settings?: Json;
          kill_switch?: Json;
          equity?: number;
          peak_equity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          settings?: Json;
          kill_switch?: Json;
          equity?: number;
          peak_equity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      kill_switch_events: {
        Row: {
          id: string;
          level: string;
          previous_level: string;
          reason: string;
          actor_id: string;
          dual_control_request_id: string | null;
          canonical_package_version: string;
          canonical_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          level: string;
          previous_level: string;
          reason: string;
          actor_id: string;
          dual_control_request_id?: string | null;
          canonical_package_version: string;
          canonical_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          level?: string;
          previous_level?: string;
          reason?: string;
          actor_id?: string;
          dual_control_request_id?: string | null;
          canonical_package_version?: string;
          canonical_hash?: string;
          created_at?: string;
        };
      };
      dual_control_requests: {
        Row: {
          id: string;
          target_level: string;
          requestor_id: string;
          approver_id: string | null;
          denier_id: string | null;
          reason: string;
          denial_reason: string | null;
          status: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          target_level: string;
          requestor_id: string;
          approver_id?: string | null;
          denier_id?: string | null;
          reason: string;
          denial_reason?: string | null;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          target_level?: string;
          requestor_id?: string;
          approver_id?: string | null;
          denier_id?: string | null;
          reason?: string;
          denial_reason?: string | null;
          status?: string;
          created_at?: string;
          resolved_at?: string | null;
        };
      };
      incidents: {
        Row: {
          id: string;
          code: string;
          category: string;
          severity: string;
          default_action: string;
          auto_recoverable: boolean;
          status: string;
          raised_by: string;
          resolved_by: string | null;
          resolution_note: string | null;
          details: Json;
          canonical_package_version: string;
          canonical_hash: string;
          raised_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          category: string;
          severity: string;
          default_action: string;
          auto_recoverable?: boolean;
          status?: string;
          raised_by: string;
          resolved_by?: string | null;
          resolution_note?: string | null;
          details?: Json;
          canonical_package_version: string;
          canonical_hash: string;
          raised_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          category?: string;
          severity?: string;
          default_action?: string;
          auto_recoverable?: boolean;
          status?: string;
          raised_by?: string;
          resolved_by?: string | null;
          resolution_note?: string | null;
          details?: Json;
          canonical_package_version?: string;
          canonical_hash?: string;
          raised_at?: string;
          resolved_at?: string | null;
        };
      };
      trading_audit_trail: {
        Row: {
          id: string;
          actor: string;
          action: string;
          resource_type: string;
          resource_id: string | null;
          reason: string;
          success: boolean;
          details: Json;
          canonical_package_version: string;
          canonical_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor: string;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          reason: string;
          success: boolean;
          details?: Json;
          canonical_package_version?: string;
          canonical_hash?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          reason?: string;
          success?: boolean;
          details?: Json;
          canonical_package_version?: string;
          canonical_hash?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
