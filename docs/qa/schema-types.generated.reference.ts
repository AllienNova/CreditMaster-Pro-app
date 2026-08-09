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
      addon_subscriptions: {
        Row: {
          bundle_type: string
          created_at: string | null
          credits_per_period: number
          id: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bundle_type: string
          created_at?: string | null
          credits_per_period?: number
          id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bundle_type?: string
          created_at?: string | null
          credits_per_period?: number
          id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      adverse_action_notices: {
        Row: {
          action: string
          bureau_used: string
          created_at: string
          credit_score_range: Json | null
          credit_score_used: number | null
          delivered_at: string | null
          free_report_deadline: string
          id: string
          notice_date: string
          reasons: Json
          user_id: string
        }
        Insert: {
          action: string
          bureau_used: string
          created_at?: string
          credit_score_range?: Json | null
          credit_score_used?: number | null
          delivered_at?: string | null
          free_report_deadline: string
          id: string
          notice_date?: string
          reasons?: Json
          user_id: string
        }
        Update: {
          action?: string
          bureau_used?: string
          created_at?: string
          credit_score_range?: Json | null
          credit_score_used?: number | null
          delivered_at?: string | null
          free_report_deadline?: string
          id?: string
          notice_date?: string
          reasons?: Json
          user_id?: string
        }
        Relationships: []
      }
      ai_coaching_sessions: {
        Row: {
          completed_at: string | null
          content: Json
          created_at: string | null
          id: string
          sentiment_score: number | null
          session_type: string
          topic: string
          user_id: string
          user_response: Json | null
        }
        Insert: {
          completed_at?: string | null
          content: Json
          created_at?: string | null
          id?: string
          sentiment_score?: number | null
          session_type: string
          topic: string
          user_id: string
          user_response?: Json | null
        }
        Update: {
          completed_at?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          sentiment_score?: number | null
          session_type?: string
          topic?: string
          user_id?: string
          user_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_coaching_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: string | null
          category: string | null
          cost: number | null
          created_at: string | null
          details: Json | null
          duration: number | null
          error: Json | null
          error_message: string | null
          event_type: string | null
          id: string
          ip_address: unknown
          level: string | null
          message: string | null
          metadata: Json | null
          model: string | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          severity: string | null
          success: boolean | null
          target_type: string | null
          tokens: number | null
          type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string | null
          category?: string | null
          cost?: number | null
          created_at?: string | null
          details?: Json | null
          duration?: number | null
          error?: Json | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          ip_address?: unknown
          level?: string | null
          message?: string | null
          metadata?: Json | null
          model?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          severity?: string | null
          success?: boolean | null
          target_type?: string | null
          tokens?: number | null
          type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string | null
          category?: string | null
          cost?: number | null
          created_at?: string | null
          details?: Json | null
          duration?: number | null
          error?: Json | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          ip_address?: unknown
          level?: string | null
          message?: string | null
          metadata?: Json | null
          model?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          severity?: string | null
          success?: boolean | null
          target_type?: string | null
          tokens?: number | null
          type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backtest_results: {
        Row: {
          annualized_return: number | null
          created_at: string
          end_date: string
          equity_curve: Json | null
          id: string
          initial_capital: number
          max_drawdown: number | null
          monthly_returns: Json | null
          profit_factor: number | null
          sharpe_ratio: number | null
          sortino_ratio: number | null
          start_date: string
          strategy_config: Json
          strategy_name: string
          symbols: Json
          total_return: number | null
          total_trades: number | null
          trades: Json | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          annualized_return?: number | null
          created_at?: string
          end_date: string
          equity_curve?: Json | null
          id?: string
          initial_capital: number
          max_drawdown?: number | null
          monthly_returns?: Json | null
          profit_factor?: number | null
          sharpe_ratio?: number | null
          sortino_ratio?: number | null
          start_date: string
          strategy_config: Json
          strategy_name: string
          symbols: Json
          total_return?: number | null
          total_trades?: number | null
          trades?: Json | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          annualized_return?: number | null
          created_at?: string
          end_date?: string
          equity_curve?: Json | null
          id?: string
          initial_capital?: number
          max_drawdown?: number | null
          monthly_returns?: Json | null
          profit_factor?: number | null
          sharpe_ratio?: number | null
          sortino_ratio?: number | null
          start_date?: string
          strategy_config?: Json
          strategy_name?: string
          symbols?: Json
          total_return?: number | null
          total_trades?: number | null
          trades?: Json | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      backup_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          category: string
          code: string
          created_at: string | null
          criteria: Json
          description: string
          icon: string
          id: string
          is_active: boolean | null
          name: string
          rarity: string
          sort_order: number | null
          xp_reward: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          criteria: Json
          description: string
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          rarity: string
          sort_order?: number | null
          xp_reward?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rarity?: string
          sort_order?: number | null
          xp_reward?: number
        }
        Relationships: []
      }
      badge_progress: {
        Row: {
          badge_id: string
          current_value: number | null
          id: string
          last_updated: string | null
          progress_percent: number | null
          target_value: number
          user_id: string
        }
        Insert: {
          badge_id: string
          current_value?: number | null
          id?: string
          last_updated?: string | null
          progress_percent?: number | null
          target_value: number
          user_id: string
        }
        Update: {
          badge_id?: string
          current_value?: number | null
          id?: string
          last_updated?: string | null
          progress_percent?: number | null
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_progress_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_alerts: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          severity: string
          type: string
          user_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          severity: string
          type: string
          user_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          severity?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_alerts_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          due_date: string
          id: string
          is_late: boolean
          paid_date: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          bill_id: string
          created_at?: string
          due_date: string
          id?: string
          is_late?: boolean
          paid_date: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          due_date?: string
          id?: string
          is_late?: boolean
          paid_date?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          account_id: string | null
          amount: number
          category: Database["public"]["Enums"]["bill_category"]
          created_at: string
          frequency: Database["public"]["Enums"]["bill_frequency"]
          id: string
          is_auto_pay: boolean
          last_paid_amount: number | null
          last_paid_date: string | null
          merchant_name: string
          next_due_date: string
          notes: string | null
          status: Database["public"]["Enums"]["bill_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: Database["public"]["Enums"]["bill_category"]
          created_at?: string
          frequency: Database["public"]["Enums"]["bill_frequency"]
          id?: string
          is_auto_pay?: boolean
          last_paid_amount?: number | null
          last_paid_date?: string | null
          merchant_name: string
          next_due_date: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: Database["public"]["Enums"]["bill_category"]
          created_at?: string
          frequency?: Database["public"]["Enums"]["bill_frequency"]
          id?: string
          is_auto_pay?: boolean
          last_paid_amount?: number | null
          last_paid_date?: string | null
          merchant_name?: string
          next_due_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      breach_notifications: {
        Row: {
          breach_id: string
          channel: string
          created_at: string
          error: string | null
          id: string
          notified_at: string
          status: string
          user_id: string
        }
        Insert: {
          breach_id: string
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          notified_at?: string
          status: string
          user_id: string
        }
        Update: {
          breach_id?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          notified_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      broker_connections: {
        Row: {
          account_id: string | null
          broker: string
          created_at: string
          credentials_encrypted: string
          id: string
          last_sync_at: string | null
          paper_trading: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          broker: string
          created_at?: string
          credentials_encrypted: string
          id?: string
          last_sync_at?: string | null
          paper_trading?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          broker?: string
          created_at?: string
          credentials_encrypted?: string
          id?: string
          last_sync_at?: string | null
          paper_trading?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          alert_sent: boolean | null
          alert_threshold: number | null
          amount: number
          category: string
          created_at: string | null
          end_date: string
          id: string
          notes: string | null
          period: string
          rollover_amount: number | null
          rollover_enabled: boolean | null
          spent: number | null
          start_date: string
          status: string | null
          subcategory: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_sent?: boolean | null
          alert_threshold?: number | null
          amount: number
          category: string
          created_at?: string | null
          end_date: string
          id?: string
          notes?: string | null
          period: string
          rollover_amount?: number | null
          rollover_enabled?: boolean | null
          spent?: number | null
          start_date: string
          status?: string | null
          subcategory?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_sent?: boolean | null
          alert_threshold?: number | null
          amount?: number
          category?: string
          created_at?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          period?: string
          rollover_amount?: number | null
          rollover_enabled?: boolean | null
          spent?: number | null
          start_date?: string
          status?: string | null
          subcategory?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_connections: {
        Row: {
          bureau: string
          connected: boolean
          created_at: string | null
          id: string
          last_pull_date: string | null
          last_score: number | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          bureau: string
          connected?: boolean
          created_at?: string | null
          id?: string
          last_pull_date?: string | null
          last_score?: number | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          bureau?: string
          connected?: boolean
          created_at?: string | null
          id?: string
          last_pull_date?: string | null
          last_score?: number | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      cancellation_requests: {
        Row: {
          ai_script: string | null
          completed_at: string | null
          contact_info: Json | null
          created_at: string | null
          id: string
          instructions: Json | null
          method: string | null
          notes: string | null
          outcome: string | null
          savings_amount: number | null
          status: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          ai_script?: string | null
          completed_at?: string | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          instructions?: Json | null
          method?: string | null
          notes?: string | null
          outcome?: string | null
          savings_amount?: number | null
          status?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          ai_script?: string | null
          completed_at?: string | null
          contact_info?: Json | null
          created_at?: string | null
          id?: string
          instructions?: Json | null
          method?: string | null
          notes?: string | null
          outcome?: string | null
          savings_amount?: number | null
          status?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          id: string
          intent_confidence: number | null
          intent_type: string | null
          metadata: Json | null
          role: string
          session_id: string
          timestamp: string
        }
        Insert: {
          content: string
          id?: string
          intent_confidence?: number | null
          intent_type?: string | null
          metadata?: Json | null
          role: string
          session_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          id?: string
          intent_confidence?: number | null
          intent_type?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_session_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          last_message_at: string | null
          message_count: number
          metadata: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      circuit_breaker_events: {
        Row: {
          action_taken: string
          breaker_type: string
          created_at: string
          details: Json
          id: string
          operating_mode: string | null
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          severity: string
          symbol: string | null
          threshold_value: number | null
          trigger_value: number | null
          user_id: string
        }
        Insert: {
          action_taken: string
          breaker_type: string
          created_at?: string
          details?: Json
          id?: string
          operating_mode?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          symbol?: string | null
          threshold_value?: number | null
          trigger_value?: number | null
          user_id: string
        }
        Update: {
          action_taken?: string
          breaker_type?: string
          created_at?: string
          details?: Json
          id?: string
          operating_mode?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          symbol?: string | null
          threshold_value?: number | null
          trigger_value?: number | null
          user_id?: string
        }
        Relationships: []
      }
      community_challenges: {
        Row: {
          badge_reward_id: string | null
          challenge_type: string
          created_at: string | null
          description: string
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          target_value: number
          xp_reward: number | null
        }
        Insert: {
          badge_reward_id?: string | null
          challenge_type: string
          created_at?: string | null
          description: string
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          target_value: number
          xp_reward?: number | null
        }
        Update: {
          badge_reward_id?: string | null
          challenge_type?: string
          created_at?: string | null
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          target_value?: number
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_challenges_badge_reward_id_fkey"
            columns: ["badge_reward_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_scores: {
        Row: {
          applicable_laws: number
          composite_score: number
          created_at: string
          failing_laws: number
          has_critical_violation: boolean
          id: string
          law_scores: Json
          operating_mode: string | null
          passing_laws: number
          signal_id: string | null
          signal_type: string | null
          symbol: string | null
          user_id: string
          violations: Json
        }
        Insert: {
          applicable_laws?: number
          composite_score: number
          created_at?: string
          failing_laws?: number
          has_critical_violation?: boolean
          id?: string
          law_scores?: Json
          operating_mode?: string | null
          passing_laws?: number
          signal_id?: string | null
          signal_type?: string | null
          symbol?: string | null
          user_id: string
          violations?: Json
        }
        Update: {
          applicable_laws?: number
          composite_score?: number
          created_at?: string
          failing_laws?: number
          has_critical_violation?: boolean
          id?: string
          law_scores?: Json
          operating_mode?: string | null
          passing_laws?: number
          signal_id?: string | null
          signal_type?: string | null
          symbol?: string | null
          user_id?: string
          violations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "compliance_scores_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: string
          granted: boolean
          id: string
          ip_address: string | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          granted?: boolean
          id?: string
          ip_address?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          granted?: boolean
          id?: string
          ip_address?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          balance: number | null
          closed_date: string | null
          created_at: string | null
          credit_limit: number | null
          creditor_name: string
          dispute_id: string | null
          id: string
          is_disputed: boolean | null
          last_payment_date: string | null
          opened_date: string | null
          payment_history: Json | null
          payment_status: string | null
          report_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          account_type: string
          balance?: number | null
          closed_date?: string | null
          created_at?: string | null
          credit_limit?: number | null
          creditor_name: string
          dispute_id?: string | null
          id?: string
          is_disputed?: boolean | null
          last_payment_date?: string | null
          opened_date?: string | null
          payment_history?: Json | null
          payment_status?: string | null
          report_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          balance?: number | null
          closed_date?: string | null
          created_at?: string | null
          credit_limit?: number | null
          creditor_name?: string
          dispute_id?: string | null
          id?: string
          is_disputed?: boolean | null
          last_payment_date?: string | null
          opened_date?: string | null
          payment_history?: Json | null
          payment_status?: string | null
          report_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "credit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          card_name: string
          created_at: string | null
          credit_limit: number
          current_balance: number
          due_date: number | null
          id: string
          last_payment_amount: number | null
          last_payment_date: string | null
          statement_date: number | null
          updated_at: string | null
          user_id: string
          utilization: number | null
        }
        Insert: {
          card_name: string
          created_at?: string | null
          credit_limit: number
          current_balance?: number
          due_date?: number | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          statement_date?: number | null
          updated_at?: string | null
          user_id: string
          utilization?: number | null
        }
        Update: {
          card_name?: string
          created_at?: string | null
          credit_limit?: number
          current_balance?: number
          due_date?: number | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          statement_date?: number | null
          updated_at?: string | null
          user_id?: string
          utilization?: number | null
        }
        Relationships: []
      }
      credit_inquiries: {
        Row: {
          created_at: string | null
          creditor_name: string
          dispute_id: string | null
          id: string
          inquiry_date: string
          inquiry_type: string
          is_disputed: boolean | null
          report_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          creditor_name: string
          dispute_id?: string | null
          id?: string
          inquiry_date: string
          inquiry_type: string
          is_disputed?: boolean | null
          report_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          creditor_name?: string
          dispute_id?: string | null
          id?: string
          inquiry_date?: string
          inquiry_type?: string
          is_disputed?: boolean | null
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_inquiries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "credit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_purchases: {
        Row: {
          amount_paid_cents: number
          created_at: string | null
          credits_purchased: number
          id: string
          pack_type: string
          stripe_payment_intent_id: string
          user_id: string
        }
        Insert: {
          amount_paid_cents: number
          created_at?: string | null
          credits_purchased: number
          id?: string
          pack_type: string
          stripe_payment_intent_id: string
          user_id: string
        }
        Update: {
          amount_paid_cents?: number
          created_at?: string | null
          credits_purchased?: number
          id?: string
          pack_type?: string
          stripe_payment_intent_id?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_repair_actions: {
        Row: {
          action_data: Json
          action_type: string
          completed_at: string | null
          created_at: string | null
          id: string
          impact: number | null
          started_at: string | null
          status: string
          success_rate: number | null
          timeline: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json
          action_type: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          impact?: number | null
          started_at?: string | null
          status?: string
          success_rate?: number | null
          timeline?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          impact?: number | null
          started_at?: string | null
          status?: string
          success_rate?: number | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_repair_progress: {
        Row: {
          achieved_at: string | null
          created_at: string | null
          id: string
          impact: number | null
          milestone_data: Json
          milestone_type: string
          score_after: number | null
          score_before: number | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string | null
          id?: string
          impact?: number | null
          milestone_data?: Json
          milestone_type: string
          score_after?: number | null
          score_before?: number | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string | null
          id?: string
          impact?: number | null
          milestone_data?: Json
          milestone_type?: string
          score_after?: number | null
          score_before?: number | null
          user_id?: string
        }
        Relationships: []
      }
      credit_repair_scores: {
        Row: {
          created_at: string | null
          estimated_impact: number | null
          factors: Json
          id: string
          opportunities: Json
          score: number
          timeline: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estimated_impact?: number | null
          factors?: Json
          id?: string
          opportunities?: Json
          score: number
          timeline?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estimated_impact?: number | null
          factors?: Json
          id?: string
          opportunities?: Json
          score?: number
          timeline?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_report_monitoring: {
        Row: {
          account_status: string | null
          balance_reported: number | null
          bureau: string
          created_at: string | null
          discrepancies: Json | null
          dispute_filed: boolean | null
          dispute_id: string | null
          id: string
          loan_id: string | null
          payment_status: string | null
          report_date: string
          user_id: string
        }
        Insert: {
          account_status?: string | null
          balance_reported?: number | null
          bureau: string
          created_at?: string | null
          discrepancies?: Json | null
          dispute_filed?: boolean | null
          dispute_id?: string | null
          id?: string
          loan_id?: string | null
          payment_status?: string | null
          report_date: string
          user_id: string
        }
        Update: {
          account_status?: string | null
          balance_reported?: number | null
          bureau?: string
          created_at?: string | null
          discrepancies?: Json | null
          dispute_filed?: boolean | null
          dispute_id?: string | null
          id?: string
          loan_id?: string | null
          payment_status?: string | null
          report_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_report_monitoring_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_reports: {
        Row: {
          accounts: Json
          bureau: string
          collections: Json
          created_at: string | null
          credit_score: number | null
          id: string
          imported_at: string | null
          inquiries: Json
          parsed_data: Json
          public_records: Json
          raw_data: Json
          report_data: Json
          report_date: string
          score: number | null
          score_factors: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accounts?: Json
          bureau: string
          collections?: Json
          created_at?: string | null
          credit_score?: number | null
          id?: string
          imported_at?: string | null
          inquiries?: Json
          parsed_data: Json
          public_records?: Json
          raw_data: Json
          report_data?: Json
          report_date: string
          score?: number | null
          score_factors?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accounts?: Json
          bureau?: string
          collections?: Json
          created_at?: string | null
          credit_score?: number | null
          id?: string
          imported_at?: string | null
          inquiries?: Json
          parsed_data?: Json
          public_records?: Json
          raw_data?: Json
          report_data?: Json
          report_date?: string
          score?: number | null
          score_factors?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_score_history: {
        Row: {
          bureau: string
          id: string
          recorded_at: string | null
          report_id: string
          score: number
          user_id: string
        }
        Insert: {
          bureau: string
          id?: string
          recorded_at?: string | null
          report_id: string
          score: number
          user_id: string
        }
        Update: {
          bureau?: string
          id?: string
          recorded_at?: string | null
          report_id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      credit_scores: {
        Row: {
          bureau: string
          created_at: string | null
          id: string
          score: number | null
          score_date: string
          user_id: string
        }
        Insert: {
          bureau: string
          created_at?: string | null
          id?: string
          score?: number | null
          score_date: string
          user_id: string
        }
        Update: {
          bureau?: string
          created_at?: string | null
          id?: string
          score?: number | null
          score_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          action_type: string
          ai_model: string | null
          balance_after: number
          created_at: string | null
          credits_added: number | null
          credits_consumed: number | null
          id: string
          metadata: Json | null
          raw_cost_usd: number | null
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          action_type: string
          ai_model?: string | null
          balance_after: number
          created_at?: string | null
          credits_added?: number | null
          credits_consumed?: number | null
          id?: string
          metadata?: Json | null
          raw_cost_usd?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          action_type?: string
          ai_model?: string | null
          balance_after?: number
          created_at?: string | null
          credits_added?: number | null
          credits_consumed?: number | null
          id?: string
          metadata?: Json | null
          raw_cost_usd?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          bonus_reward: Json | null
          code: string
          created_at: string | null
          criteria: Json
          description: string
          id: string
          is_active: boolean | null
          name: string
          quest_type: string
          xp_reward: number
        }
        Insert: {
          bonus_reward?: Json | null
          code: string
          created_at?: string | null
          criteria: Json
          description: string
          id?: string
          is_active?: boolean | null
          name: string
          quest_type: string
          xp_reward: number
        }
        Update: {
          bonus_reward?: Json | null
          code?: string
          created_at?: string | null
          criteria?: Json
          description?: string
          id?: string
          is_active?: boolean | null
          name?: string
          quest_type?: string
          xp_reward?: number
        }
        Relationships: []
      }
      debt_accounts: {
        Row: {
          balance: number
          created_at: string
          creditor_name: string | null
          due_date: string | null
          id: string
          interest_rate: number
          is_active: boolean
          minimum_payment: number
          name: string
          original_balance: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance: number
          created_at?: string
          creditor_name?: string | null
          due_date?: string | null
          id?: string
          interest_rate: number
          is_active?: boolean
          minimum_payment: number
          name: string
          original_balance?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          creditor_name?: string | null
          due_date?: string | null
          id?: string
          interest_rate?: number
          is_active?: boolean
          minimum_payment?: number
          name?: string
          original_balance?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_template_usage: {
        Row: {
          created_at: string | null
          dispute_id: string | null
          id: string
          outcome: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dispute_id?: string | null
          id?: string
          outcome?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dispute_id?: string | null
          id?: string
          outcome?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_template_usage_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_template_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          account_number: string | null
          balance: number | null
          bureau: string
          created_at: string | null
          creditor_name: string | null
          id: string
          inaccuracy_type: string | null
          item_description: string
          item_type: string
          letter_content: string
          notes: string | null
          outcome: string | null
          reason: string
          resolved_at: string | null
          response_received_at: string | null
          sent_at: string | null
          status: string | null
          strategy: string | null
          strategy_id: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          balance?: number | null
          bureau: string
          created_at?: string | null
          creditor_name?: string | null
          id?: string
          inaccuracy_type?: string | null
          item_description: string
          item_type: string
          letter_content: string
          notes?: string | null
          outcome?: string | null
          reason: string
          resolved_at?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string | null
          strategy?: string | null
          strategy_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          balance?: number | null
          bureau?: string
          created_at?: string | null
          creditor_name?: string | null
          id?: string
          inaccuracy_type?: string | null
          item_description?: string
          item_type?: string
          letter_content?: string
          notes?: string | null
          outcome?: string | null
          reason?: string
          resolved_at?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string | null
          strategy?: string | null
          strategy_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_analyses: {
        Row: {
          analysis_results: Json
          analyzed_at: string | null
          confidence_score: number | null
          created_at: string | null
          document_type: string
          document_url: string
          errors_found: Json | null
          id: string
          loan_id: string | null
          opportunities_identified: Json | null
          user_id: string
        }
        Insert: {
          analysis_results: Json
          analyzed_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          document_type: string
          document_url: string
          errors_found?: Json | null
          id?: string
          loan_id?: string | null
          opportunities_identified?: Json | null
          user_id: string
        }
        Update: {
          analysis_results?: Json
          analyzed_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          document_type?: string
          document_url?: string
          errors_found?: Json | null
          id?: string
          loan_id?: string | null
          opportunities_identified?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_analyses_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      document_share_links: {
        Row: {
          created_at: string
          document_id: string
          expires_at: string
          id: string
          permissions: string
          recipients: string[]
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          expires_at: string
          id?: string
          permissions?: string
          recipients?: string[]
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          expires_at?: string
          id?: string
          permissions?: string
          recipients?: string[]
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_share_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_share_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          id: string
          metadata: Json | null
          mime_type: string
          name: string
          original_name: string
          s3_key: string
          s3_url: string | null
          size: number
          tags: string[] | null
          type: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          mime_type: string
          name: string
          original_name: string
          s3_key: string
          s3_url?: string | null
          size: number
          tags?: string[] | null
          type: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          mime_type?: string
          name?: string
          original_name?: string
          s3_key?: string
          s3_url?: string | null
          size?: number
          tags?: string[] | null
          type?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dual_control_requests: {
        Row: {
          approver_id: string | null
          created_at: string
          denial_reason: string | null
          denier_id: string | null
          id: string
          reason: string
          requestor_id: string
          resolved_at: string | null
          status: string
          target_level: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          denial_reason?: string | null
          denier_id?: string | null
          id?: string
          reason: string
          requestor_id: string
          resolved_at?: string | null
          status?: string
          target_level: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          denial_reason?: string | null
          denier_id?: string | null
          id?: string
          reason?: string
          requestor_id?: string
          resolved_at?: string | null
          status?: string
          target_level?: string
        }
        Relationships: []
      }
      emotional_spending_alerts: {
        Row: {
          created_at: string | null
          id: string
          intervention_type: string
          responded_at: string | null
          risk_factors: Json
          risk_score: number
          transaction_id: string | null
          user_id: string
          user_response: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          intervention_type: string
          responded_at?: string | null
          risk_factors: Json
          risk_score: number
          transaction_id?: string | null
          user_id: string
          user_response?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          intervention_type?: string
          responded_at?: string | null
          risk_factors?: Json
          risk_score?: number
          transaction_id?: string | null
          user_id?: string
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emotional_spending_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      federal_program_applications: {
        Row: {
          application_data: Json
          application_id: string | null
          approved_at: string | null
          created_at: string | null
          estimated_processing_time: string | null
          id: string
          loan_id: string | null
          processed_at: string | null
          program_type: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_data: Json
          application_id?: string | null
          approved_at?: string | null
          created_at?: string | null
          estimated_processing_time?: string | null
          id?: string
          loan_id?: string | null
          processed_at?: string | null
          program_type: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_data?: Json
          application_id?: string | null
          approved_at?: string | null
          created_at?: string | null
          estimated_processing_time?: string | null
          id?: string
          loan_id?: string | null
          processed_at?: string | null
          program_type?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "federal_program_applications_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_chat_messages: {
        Row: {
          action_taken: Json | null
          content: string
          created_at: string | null
          id: string
          intent: string | null
          model_used: string | null
          role: string
          session_id: string
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          action_taken?: Json | null
          content: string
          created_at?: string | null
          id?: string
          intent?: string | null
          model_used?: string | null
          role: string
          session_id: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          action_taken?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          intent?: string | null
          model_used?: string | null
          role?: string
          session_id?: string
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "financial_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_chat_sessions: {
        Row: {
          context: Json | null
          created_at: string | null
          financial_snapshot: Json | null
          id: string
          last_message_at: string | null
          message_count: number | null
          session_type: string | null
          status: string | null
          title: string | null
          total_tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          financial_snapshot?: Json | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          session_type?: string | null
          status?: string | null
          title?: string | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          financial_snapshot?: Json | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          session_type?: string | null
          status?: string | null
          title?: string | null
          total_tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          ai_recommendations: Json | null
          auto_save_amount: number | null
          auto_save_enabled: boolean | null
          auto_save_frequency: string | null
          created_at: string | null
          current_amount: number | null
          description: string | null
          id: string
          linked_account_id: string | null
          metadata: Json | null
          milestones: Json | null
          name: string
          priority: number | null
          status: string | null
          target_amount: number
          target_date: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_recommendations?: Json | null
          auto_save_amount?: number | null
          auto_save_enabled?: boolean | null
          auto_save_frequency?: string | null
          created_at?: string | null
          current_amount?: number | null
          description?: string | null
          id?: string
          linked_account_id?: string | null
          metadata?: Json | null
          milestones?: Json | null
          name: string
          priority?: number | null
          status?: string | null
          target_amount: number
          target_date?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_recommendations?: Json | null
          auto_save_amount?: number | null
          auto_save_enabled?: boolean | null
          auto_save_frequency?: string | null
          created_at?: string | null
          current_amount?: number | null
          description?: string | null
          id?: string
          linked_account_id?: string | null
          metadata?: Json | null
          milestones?: Json | null
          name?: string
          priority?: number | null
          status?: string | null
          target_amount?: number
          target_date?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_health_scores: {
        Row: {
          benchmark_comparison: Json | null
          breakdown: Json | null
          calculated_at: string | null
          credit_score_component: number | null
          data_quality_score: number | null
          debt_score: number | null
          id: string
          income_stability_score: number | null
          insurance_score: number | null
          overall_score: number
          recommendations: Json | null
          savings_score: number | null
          spending_score: number | null
          strengths: Json | null
          user_id: string
          weaknesses: Json | null
        }
        Insert: {
          benchmark_comparison?: Json | null
          breakdown?: Json | null
          calculated_at?: string | null
          credit_score_component?: number | null
          data_quality_score?: number | null
          debt_score?: number | null
          id?: string
          income_stability_score?: number | null
          insurance_score?: number | null
          overall_score: number
          recommendations?: Json | null
          savings_score?: number | null
          spending_score?: number | null
          strengths?: Json | null
          user_id: string
          weaknesses?: Json | null
        }
        Update: {
          benchmark_comparison?: Json | null
          breakdown?: Json | null
          calculated_at?: string | null
          credit_score_component?: number | null
          data_quality_score?: number | null
          debt_score?: number | null
          id?: string
          income_stability_score?: number | null
          insurance_score?: number | null
          overall_score?: number
          recommendations?: Json | null
          savings_score?: number | null
          spending_score?: number | null
          strengths?: Json | null
          user_id?: string
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_health_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_insights: {
        Row: {
          acted_upon: boolean | null
          action_data: Json | null
          action_type: string | null
          category: string | null
          confidence_score: number | null
          created_at: string | null
          dismissed: boolean | null
          expires_at: string | null
          id: string
          impact_amount: number | null
          impact_type: string | null
          message: string
          read: boolean | null
          severity: string | null
          source: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          acted_upon?: boolean | null
          action_data?: Json | null
          action_type?: string | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          dismissed?: boolean | null
          expires_at?: string | null
          id?: string
          impact_amount?: number | null
          impact_type?: string | null
          message: string
          read?: boolean | null
          severity?: string | null
          source?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          acted_upon?: boolean | null
          action_data?: Json | null
          action_type?: string | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          dismissed?: boolean | null
          expires_at?: string | null
          id?: string
          impact_amount?: number | null
          impact_type?: string | null
          message?: string
          read?: boolean | null
          severity?: string | null
          source?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_tracking: {
        Row: {
          ai_recommendations: Json | null
          created_at: string | null
          current_value: number | null
          goal_name: string
          goal_type: string
          id: string
          milestones: Json | null
          start_date: string | null
          status: string | null
          target_date: string | null
          target_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_recommendations?: Json | null
          created_at?: string | null
          current_value?: number | null
          goal_name: string
          goal_type: string
          id?: string
          milestones?: Json | null
          start_date?: string | null
          status?: string | null
          target_date?: string | null
          target_value: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_recommendations?: Json | null
          created_at?: string | null
          current_value?: number | null
          goal_name?: string
          goal_type?: string
          id?: string
          milestones?: Json | null
          start_date?: string | null
          status?: string | null
          target_date?: string | null
          target_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goodwill_letters: {
        Row: {
          account_number: string | null
          created_at: string | null
          creditor_name: string
          id: string
          late_payment_date: string | null
          letter_content: string
          notes: string | null
          outcome: string | null
          reason: string
          response_received_at: string | null
          sent_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          created_at?: string | null
          creditor_name: string
          id?: string
          late_payment_date?: string | null
          letter_content: string
          notes?: string | null
          outcome?: string | null
          reason: string
          response_received_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          created_at?: string | null
          creditor_name?: string
          id?: string
          late_payment_date?: string | null
          letter_content?: string
          notes?: string | null
          outcome?: string | null
          reason?: string
          response_received_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          auto_recoverable: boolean
          canonical_hash: string
          canonical_package_version: string
          category: string
          code: string
          default_action: string
          details: Json
          id: string
          raised_at: string
          raised_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
        }
        Insert: {
          auto_recoverable?: boolean
          canonical_hash: string
          canonical_package_version: string
          category: string
          code: string
          default_action: string
          details?: Json
          id?: string
          raised_at?: string
          raised_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
        }
        Update: {
          auto_recoverable?: boolean
          canonical_hash?: string
          canonical_package_version?: string
          category?: string
          code?: string
          default_action?: string
          details?: Json
          id?: string
          raised_at?: string
          raised_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
        }
        Relationships: []
      }
      income_sources: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          created_at: string | null
          frequency: string
          id: string
          is_auto_detected: boolean | null
          last_pay_date: string | null
          name: string
          next_pay_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          created_at?: string | null
          frequency: string
          id?: string
          is_auto_detected?: boolean | null
          last_pay_date?: string | null
          name: string
          next_pay_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string | null
          frequency?: string
          id?: string
          is_auto_detected?: boolean | null
          last_pay_date?: string | null
          name?: string
          next_pay_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      investment_holdings: {
        Row: {
          allocation_percent: number | null
          asset_type: string
          average_cost: number
          country: string | null
          created_at: string | null
          currency: string | null
          current_price: number | null
          current_value: number | null
          day_change: number | null
          day_change_percent: number | null
          gain_loss: number | null
          gain_loss_percent: number | null
          id: string
          industry: string | null
          last_price_update: string | null
          name: string
          portfolio_id: string
          quantity: number
          sector: string | null
          symbol: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allocation_percent?: number | null
          asset_type: string
          average_cost: number
          country?: string | null
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          current_value?: number | null
          day_change?: number | null
          day_change_percent?: number | null
          gain_loss?: number | null
          gain_loss_percent?: number | null
          id?: string
          industry?: string | null
          last_price_update?: string | null
          name: string
          portfolio_id: string
          quantity: number
          sector?: string | null
          symbol: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allocation_percent?: number | null
          asset_type?: string
          average_cost?: number
          country?: string | null
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          current_value?: number | null
          day_change?: number | null
          day_change_percent?: number | null
          gain_loss?: number | null
          gain_loss_percent?: number | null
          id?: string
          industry?: string | null
          last_price_update?: string | null
          name?: string
          portfolio_id?: string
          quantity?: number
          sector?: string | null
          symbol?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "investment_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_holdings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_portfolios: {
        Row: {
          created_at: string | null
          day_change: number | null
          day_change_percent: number | null
          description: string | null
          diversification_score: number | null
          id: string
          last_rebalance_at: string | null
          last_updated_at: string | null
          linked_account_id: string | null
          name: string
          portfolio_type: string | null
          rebalance_threshold: number | null
          risk_level: string | null
          risk_score: number | null
          target_allocation: Json | null
          total_cost_basis: number | null
          total_gain_loss: number | null
          total_gain_loss_percent: number | null
          total_value: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_change?: number | null
          day_change_percent?: number | null
          description?: string | null
          diversification_score?: number | null
          id?: string
          last_rebalance_at?: string | null
          last_updated_at?: string | null
          linked_account_id?: string | null
          name: string
          portfolio_type?: string | null
          rebalance_threshold?: number | null
          risk_level?: string | null
          risk_score?: number | null
          target_allocation?: Json | null
          total_cost_basis?: number | null
          total_gain_loss?: number | null
          total_gain_loss_percent?: number | null
          total_value?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_change?: number | null
          day_change_percent?: number | null
          description?: string | null
          diversification_score?: number | null
          id?: string
          last_rebalance_at?: string | null
          last_updated_at?: string | null
          linked_account_id?: string | null
          name?: string
          portfolio_type?: string | null
          rebalance_threshold?: number | null
          risk_level?: string | null
          risk_score?: number | null
          target_allocation?: Json | null
          total_cost_basis?: number | null
          total_gain_loss?: number | null
          total_gain_loss_percent?: number | null
          total_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_portfolios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_transactions: {
        Row: {
          created_at: string | null
          fees: number | null
          holding_id: string | null
          id: string
          notes: string | null
          portfolio_id: string
          price: number
          quantity: number
          symbol: string
          total_amount: number
          transaction_date: string
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fees?: number | null
          holding_id?: string | null
          id?: string
          notes?: string | null
          portfolio_id: string
          price: number
          quantity: number
          symbol: string
          total_amount: number
          transaction_date: string
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fees?: number | null
          holding_id?: string | null
          id?: string
          notes?: string | null
          portfolio_id?: string
          price?: number
          quantity?: number
          symbol?: string
          total_amount?: number
          transaction_date?: string
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "investment_holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_transactions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "investment_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kill_switch_events: {
        Row: {
          actor_id: string
          canonical_hash: string
          canonical_package_version: string
          created_at: string
          dual_control_request_id: string | null
          id: string
          level: string
          previous_level: string
          reason: string
        }
        Insert: {
          actor_id: string
          canonical_hash: string
          canonical_package_version: string
          created_at?: string
          dual_control_request_id?: string | null
          id?: string
          level: string
          previous_level: string
          reason: string
        }
        Update: {
          actor_id?: string
          canonical_hash?: string
          canonical_package_version?: string
          created_at?: string
          dual_control_request_id?: string | null
          id?: string
          level?: string
          previous_level?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "kill_switch_events_dual_control_fk"
            columns: ["dual_control_request_id"]
            isOneToOne: false
            referencedRelation: "dual_control_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          created_at: string | null
          id: string
          leaderboard_type: string
          period_end: string
          period_start: string
          rankings: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          leaderboard_type: string
          period_end: string
          period_start: string
          rankings: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          leaderboard_type?: string
          period_end?: string
          period_start?: string
          rankings?: Json
        }
        Relationships: []
      }
      level_definitions: {
        Row: {
          badge_id: string | null
          level: number
          perks: Json | null
          title: string
          xp_required: number
        }
        Insert: {
          badge_id?: string | null
          level: number
          perks?: Json | null
          title: string
          xp_required: number
        }
        Update: {
          badge_id?: string | null
          level?: number
          perks?: Json | null
          title?: string
          xp_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_definitions_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          name: string
          price: number
          price_type: string
          provider_id: string
          rating: number | null
          review_count: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name: string
          price: number
          price_type: string
          provider_id: string
          rating?: number | null
          review_count?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          price?: number
          price_type?: string
          provider_id?: string
          rating?: number | null
          review_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "marketplace_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_providers: {
        Row: {
          bbb_rating: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          rating: number | null
          review_count: number | null
          updated_at: string | null
          verified: boolean | null
          website: string | null
          years_in_business: number | null
        }
        Insert: {
          bbb_rating?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          rating?: number | null
          review_count?: number | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
          years_in_business?: number | null
        }
        Update: {
          bbb_rating?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          rating?: number | null
          review_count?: number | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      marketplace_reviews: {
        Row: {
          content: string
          created_at: string | null
          helpful_count: number | null
          id: string
          product_id: string | null
          provider_id: string | null
          rating: number
          title: string | null
          updated_at: string | null
          user_id: string
          verified_purchase: boolean | null
        }
        Insert: {
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          product_id?: string | null
          provider_id?: string | null
          rating: number
          title?: string | null
          updated_at?: string | null
          user_id: string
          verified_purchase?: boolean | null
        }
        Update: {
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          product_id?: string | null
          provider_id?: string | null
          rating?: number
          title?: string | null
          updated_at?: string | null
          user_id?: string
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "marketplace_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_detection_patterns: {
        Row: {
          confidence_boost: number | null
          created_at: string | null
          id: string
          merchant_id: string | null
          pattern_type: string
          pattern_value: string
        }
        Insert: {
          confidence_boost?: number | null
          created_at?: string | null
          id?: string
          merchant_id?: string | null
          pattern_type: string
          pattern_value: string
        }
        Update: {
          confidence_boost?: number | null
          created_at?: string | null
          id?: string
          merchant_id?: string | null
          pattern_type?: string
          pattern_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_detection_patterns_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          cancellation_methods: string[]
          category: string
          chat_url: string | null
          community_verified: boolean | null
          created_at: string | null
          difficulty: string
          domain: string | null
          email: string | null
          estimated_time_minutes: number | null
          id: string
          in_app_cancellation: boolean | null
          logo_url: string | null
          name: string
          phone_number: string | null
          retention_notes: string | null
          retention_offers_likely: boolean | null
          script_template: string | null
          tips: string[] | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          cancellation_methods?: string[]
          category: string
          chat_url?: string | null
          community_verified?: boolean | null
          created_at?: string | null
          difficulty?: string
          domain?: string | null
          email?: string | null
          estimated_time_minutes?: number | null
          id?: string
          in_app_cancellation?: boolean | null
          logo_url?: string | null
          name: string
          phone_number?: string | null
          retention_notes?: string | null
          retention_offers_likely?: boolean | null
          script_template?: string | null
          tips?: string[] | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          cancellation_methods?: string[]
          category?: string
          chat_url?: string | null
          community_verified?: boolean | null
          created_at?: string | null
          difficulty?: string
          domain?: string | null
          email?: string | null
          estimated_time_minutes?: number | null
          id?: string
          in_app_cancellation?: boolean | null
          logo_url?: string | null
          name?: string
          phone_number?: string | null
          retention_notes?: string | null
          retention_offers_likely?: boolean | null
          script_template?: string | null
          tips?: string[] | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      metrics_data: {
        Row: {
          id: number
          metric_type: string
          name: string
          recorded_at: string
          tags: Json | null
          value: number
        }
        Insert: {
          id?: number
          metric_type: string
          name: string
          recorded_at?: string
          tags?: Json | null
          value: number
        }
        Update: {
          id?: number
          metric_type?: string
          name?: string
          recorded_at?: string
          tags?: Json | null
          value?: number
        }
        Relationships: []
      }
      milestones_achieved: {
        Row: {
          achieved_at: string
          achieved_score: number
          description: string | null
          id: string
          milestone_id: string
          target_score: number
          title: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          achieved_score: number
          description?: string | null
          id?: string
          milestone_id: string
          target_score: number
          title: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          achieved_score?: number
          description?: string | null
          id?: string
          milestone_id?: string
          target_score?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ml_models: {
        Row: {
          architecture: string
          config: Json
          created_at: string
          description: string | null
          evaluation: Json | null
          feature_names: Json
          id: string
          model_path: string | null
          model_type: string
          name: string
          status: string
          trained_at: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          architecture: string
          config: Json
          created_at?: string
          description?: string | null
          evaluation?: Json | null
          feature_names: Json
          id?: string
          model_path?: string | null
          model_type: string
          name: string
          status?: string
          trained_at?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          architecture?: string
          config?: Json
          created_at?: string
          description?: string | null
          evaluation?: Json | null
          feature_names?: Json
          id?: string
          model_path?: string | null
          model_type?: string
          name?: string
          status?: string
          trained_at?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          confidence_score: number
          created_at: string | null
          id: string
          input_features: Json
          loan_id: string | null
          model_version: string
          prediction_result: Json
          prediction_type: string
          user_id: string
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          id?: string
          input_features: Json
          loan_id?: string | null
          model_version: string
          prediction_result: Json
          prediction_type: string
          user_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          id?: string
          input_features?: Json
          loan_id?: string | null
          model_version?: string
          prediction_result?: Json
          prediction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      mode_transitions: {
        Row: {
          created_at: string
          direction: string
          from_mode: string
          id: string
          initiated_by: string
          metrics_snapshot: Json
          reason: string | null
          to_mode: string
          trading_account_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          from_mode: string
          id?: string
          initiated_by?: string
          metrics_snapshot?: Json
          reason?: string | null
          to_mode: string
          trading_account_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          from_mode?: string
          id?: string
          initiated_by?: string
          metrics_snapshot?: Json
          reason?: string | null
          to_mode?: string
          trading_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mode_transitions_trading_account_id_fkey"
            columns: ["trading_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          loan_id: string | null
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          loan_id?: string | null
          severity: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          loan_id?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_events_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          account_number: string | null
          collection_agency: string
          created_at: string | null
          current_balance: number
          deleted_at: string | null
          id: string
          negotiated_at: string | null
          notes: string | null
          original_balance: number
          original_creditor: string | null
          paid_at: string | null
          scripts: Json
          settlement_amount: number | null
          settlement_percentage: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          collection_agency: string
          created_at?: string | null
          current_balance: number
          deleted_at?: string | null
          id?: string
          negotiated_at?: string | null
          notes?: string | null
          original_balance: number
          original_creditor?: string | null
          paid_at?: string | null
          scripts?: Json
          settlement_amount?: number | null
          settlement_percentage?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          collection_agency?: string
          created_at?: string | null
          current_balance?: number
          deleted_at?: string | null
          id?: string
          negotiated_at?: string | null
          notes?: string | null
          original_balance?: number
          original_creditor?: string | null
          paid_at?: string | null
          scripts?: Json
          settlement_amount?: number | null
          settlement_percentage?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channels: Json
          created_at: string
          email_enabled: boolean
          push_enabled: boolean
          quiet_hours: Json
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          email_enabled?: boolean
          push_enabled?: boolean
          quiet_hours?: Json
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: Json
          created_at?: string
          email_enabled?: boolean
          push_enabled?: boolean
          quiet_hours?: Json
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nudge_definitions: {
        Row: {
          channels: string[] | null
          code: string
          cooldown_hours: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          message_template: string
          nudge_type: string
          priority: number | null
          title_template: string
          trigger_conditions: Json
        }
        Insert: {
          channels?: string[] | null
          code: string
          cooldown_hours?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template: string
          nudge_type: string
          priority?: number | null
          title_template: string
          trigger_conditions: Json
        }
        Update: {
          channels?: string[] | null
          code?: string
          cooldown_hours?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          nudge_type?: string
          priority?: number | null
          title_template?: string
          trigger_conditions?: Json
        }
        Relationships: []
      }
      nudge_history: {
        Row: {
          ab_variant: string | null
          action_at: string | null
          action_taken: string | null
          channel: string
          context: Json | null
          id: string
          message: string
          nudge_id: string | null
          nudge_type: string
          opened_at: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          ab_variant?: string | null
          action_at?: string | null
          action_taken?: string | null
          channel: string
          context?: Json | null
          id?: string
          message: string
          nudge_id?: string | null
          nudge_type: string
          opened_at?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          ab_variant?: string | null
          action_at?: string | null
          action_taken?: string | null
          channel?: string
          context?: Json | null
          id?: string
          message?: string
          nudge_id?: string | null
          nudge_type?: string
          opened_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudge_history_nudge_id_fkey"
            columns: ["nudge_id"]
            isOneToOne: false
            referencedRelation: "nudge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nudge_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          completed_steps: number[] | null
          created_at: string | null
          current_step: number | null
          form_data: Json | null
          id: string
          last_updated: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number[] | null
          created_at?: string | null
          current_step?: number | null
          form_data?: Json | null
          id?: string
          last_updated?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number[] | null
          created_at?: string | null
          current_step?: number | null
          form_data?: Json | null
          id?: string
          last_updated?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_analytics: {
        Row: {
          created_at: string | null
          id: string
          metric_data: Json | null
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_data?: Json | null
          metric_type: string
          metric_value: number
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_data?: Json | null
          metric_type?: string
          metric_value?: number
          period_end?: string
          period_start?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          processed_at: string
          provider: string
        }
        Insert: {
          event_id: string
          processed_at?: string
          provider: string
        }
        Update: {
          event_id?: string
          processed_at?: string
          provider?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          bank_details: Json | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          notification_preferences: Json | null
          payout_method: string | null
          paypal_email: string | null
          phone: string | null
          push_notification_preferences: Json | null
          role: string | null
          state: string | null
          stripe_connect_id: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          bank_details?: Json | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          notification_preferences?: Json | null
          payout_method?: string | null
          paypal_email?: string | null
          phone?: string | null
          push_notification_preferences?: Json | null
          role?: string | null
          state?: string | null
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          bank_details?: Json | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          payout_method?: string | null
          paypal_email?: string | null
          phone?: string | null
          push_notification_preferences?: Json | null
          role?: string | null
          state?: string | null
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      public_records: {
        Row: {
          amount: number | null
          case_number: string | null
          court_name: string | null
          created_at: string | null
          dispute_id: string | null
          filing_date: string | null
          id: string
          is_disputed: boolean | null
          record_type: string
          report_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          case_number?: string | null
          court_name?: string | null
          created_at?: string | null
          dispute_id?: string | null
          filing_date?: string | null
          id?: string
          is_disputed?: boolean | null
          record_type: string
          report_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          case_number?: string | null
          court_name?: string | null
          created_at?: string | null
          dispute_id?: string | null
          filing_date?: string | null
          id?: string
          is_disputed?: boolean | null
          record_type?: string
          report_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_records_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "credit_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          keys_auth: string
          keys_p256dh: string
          last_used: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          keys_auth: string
          keys_p256dh: string
          last_used?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          keys_auth?: string
          keys_p256dh?: string
          last_used?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_wins_completed: {
        Row: {
          category: string
          completed_at: string
          id: string
          impact: number
          points_earned: number | null
          title: string
          user_id: string
          win_id: string
        }
        Insert: {
          category: string
          completed_at?: string
          id?: string
          impact: number
          points_earned?: number | null
          title: string
          user_id: string
          win_id: string
        }
        Update: {
          category?: string
          completed_at?: string
          id?: string
          impact?: number
          points_earned?: number | null
          title?: string
          user_id?: string
          win_id?: string
        }
        Relationships: []
      }
      rate_limit_usage: {
        Row: {
          cost: number
          key: string
          last_request: string
          requests: number
          tokens: number
        }
        Insert: {
          cost?: number
          key: string
          last_request?: string
          requests?: number
          tokens?: number
        }
        Update: {
          cost?: number
          key?: string
          last_request?: string
          requests?: number
          tokens?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          reset_at: string
          updated_at: string
        }
        Insert: {
          count?: number
          key: string
          reset_at: string
          updated_at?: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          amount: number
          auto_detected: boolean | null
          average_amount: number | null
          category: string
          created_at: string | null
          detection_confidence: number | null
          due_day: number | null
          frequency: string
          id: string
          is_variable: boolean | null
          last_paid_amount: number | null
          last_paid_at: string | null
          linked_account_id: string | null
          metadata: Json | null
          name: string
          negotiation_savings: number | null
          negotiation_status: string | null
          next_due_at: string | null
          provider: string | null
          status: string | null
          transaction_pattern: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          auto_detected?: boolean | null
          average_amount?: number | null
          category: string
          created_at?: string | null
          detection_confidence?: number | null
          due_day?: number | null
          frequency: string
          id?: string
          is_variable?: boolean | null
          last_paid_amount?: number | null
          last_paid_at?: string | null
          linked_account_id?: string | null
          metadata?: Json | null
          name: string
          negotiation_savings?: number | null
          negotiation_status?: string | null
          next_due_at?: string | null
          provider?: string | null
          status?: string | null
          transaction_pattern?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          auto_detected?: boolean | null
          average_amount?: number | null
          category?: string
          created_at?: string | null
          detection_confidence?: number | null
          due_day?: number | null
          frequency?: string
          id?: string
          is_variable?: boolean | null
          last_paid_amount?: number | null
          last_paid_at?: string | null
          linked_account_id?: string | null
          metadata?: Json | null
          name?: string
          negotiation_savings?: number | null
          negotiation_status?: string | null
          next_due_at?: string | null
          provider?: string | null
          status?: string | null
          transaction_pattern?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          campaign_id: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          partner_id: string | null
          user_id: string
          uses_count: number
        }
        Insert: {
          campaign_id?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          partner_id?: string | null
          user_id: string
          uses_count?: number
        }
        Update: {
          campaign_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          partner_id?: string | null
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      regulatory_complaints: {
        Row: {
          agency: string
          complaint_text: string
          complaint_type: string
          created_at: string | null
          evidence: Json | null
          id: string
          loan_id: string | null
          outcome: string | null
          response_received_at: string | null
          response_text: string | null
          servicer_name: string
          status: string
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agency: string
          complaint_text: string
          complaint_type: string
          created_at?: string | null
          evidence?: Json | null
          id?: string
          loan_id?: string | null
          outcome?: string | null
          response_received_at?: string | null
          response_text?: string | null
          servicer_name: string
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agency?: string
          complaint_text?: string
          complaint_type?: string
          created_at?: string | null
          evidence?: Json | null
          id?: string
          loan_id?: string | null
          outcome?: string | null
          response_received_at?: string | null
          response_text?: string | null
          servicer_name?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_complaints_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_events: {
        Row: {
          commission_amount_cents: number | null
          commission_currency: string | null
          created_at: string
          event_id: string
          event_type: string
          id: string
          metadata: Json | null
          partner_id: string
          product_id: string
          user_id: string
        }
        Insert: {
          commission_amount_cents?: number | null
          commission_currency?: string | null
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          partner_id: string
          product_id: string
          user_id: string
        }
        Update: {
          commission_amount_cents?: number | null
          commission_currency?: string | null
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          partner_id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_rules: {
        Row: {
          created_at: string
          id: string
          kill_switch_active: boolean
          kill_switch_reason: string | null
          kill_switch_triggered_at: string | null
          max_correlated_exposure: number
          max_daily_loss: number
          max_drawdown: number
          max_open_positions: number
          max_position_size: number
          max_sector_exposure: number
          min_cash_reserve: number
          min_confidence: number
          min_signal_consensus: number
          no_trades_around_fomc: boolean
          no_trades_before_earnings: number | null
          trading_hours_only: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kill_switch_active?: boolean
          kill_switch_reason?: string | null
          kill_switch_triggered_at?: string | null
          max_correlated_exposure?: number
          max_daily_loss?: number
          max_drawdown?: number
          max_open_positions?: number
          max_position_size?: number
          max_sector_exposure?: number
          min_cash_reserve?: number
          min_confidence?: number
          min_signal_consensus?: number
          no_trades_around_fomc?: boolean
          no_trades_before_earnings?: number | null
          trading_hours_only?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kill_switch_active?: boolean
          kill_switch_reason?: string | null
          kill_switch_triggered_at?: string | null
          max_correlated_exposure?: number
          max_daily_loss?: number
          max_drawdown?: number
          max_open_positions?: number
          max_position_size?: number
          max_sector_exposure?: number
          min_cash_reserve?: number
          min_confidence?: number
          min_signal_consensus?: number
          no_trades_around_fomc?: boolean
          no_trades_before_earnings?: number | null
          trading_hours_only?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      servicer_communications: {
        Row: {
          attachments: Json | null
          communication_type: string
          content: string | null
          created_at: string | null
          direction: string
          id: string
          loan_id: string | null
          metadata: Json | null
          received_at: string | null
          response_deadline: string | null
          response_required: boolean | null
          sent_at: string | null
          servicer_name: string
          subject: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          communication_type: string
          content?: string | null
          created_at?: string | null
          direction: string
          id?: string
          loan_id?: string | null
          metadata?: Json | null
          received_at?: string | null
          response_deadline?: string | null
          response_required?: boolean | null
          sent_at?: string | null
          servicer_name: string
          subject?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          communication_type?: string
          content?: string | null
          created_at?: string | null
          direction?: string
          id?: string
          loan_id?: string | null
          metadata?: Json | null
          received_at?: string | null
          response_deadline?: string | null
          response_required?: boolean | null
          sent_at?: string | null
          servicer_name?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicer_communications_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      servicer_errors: {
        Row: {
          created_at: string | null
          detected_date: string | null
          error_description: string
          error_type: string
          evidence: Json | null
          id: string
          loan_id: string | null
          resolution_status: string | null
          resolved_at: string | null
          servicer_name: string
          severity: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          detected_date?: string | null
          error_description: string
          error_type: string
          evidence?: Json | null
          id?: string
          loan_id?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          servicer_name: string
          severity: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          detected_date?: string | null
          error_description?: string
          error_type?: string
          evidence?: Json | null
          id?: string
          loan_id?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          servicer_name?: string
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicer_errors_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      servicer_profiles: {
        Row: {
          average_resolution_time: number
          compliance_score: number
          created_at: string | null
          customer_satisfaction: number
          data_quality_score: number | null
          documentation_quality: number
          error_rate: number
          federal_contractor: boolean | null
          historical_performance: Json | null
          id: string
          operational_characteristics: Json | null
          regulatory_actions: number
          response_quality_score: number
          servicer_name: string
          transfer_frequency: number
          updated_at: string | null
          vulnerability_indicators: Json | null
          vulnerability_score: number
        }
        Insert: {
          average_resolution_time: number
          compliance_score: number
          created_at?: string | null
          customer_satisfaction: number
          data_quality_score?: number | null
          documentation_quality: number
          error_rate: number
          federal_contractor?: boolean | null
          historical_performance?: Json | null
          id?: string
          operational_characteristics?: Json | null
          regulatory_actions: number
          response_quality_score: number
          servicer_name: string
          transfer_frequency: number
          updated_at?: string | null
          vulnerability_indicators?: Json | null
          vulnerability_score: number
        }
        Update: {
          average_resolution_time?: number
          compliance_score?: number
          created_at?: string | null
          customer_satisfaction?: number
          data_quality_score?: number | null
          documentation_quality?: number
          error_rate?: number
          federal_contractor?: boolean | null
          historical_performance?: Json | null
          id?: string
          operational_characteristics?: Json | null
          regulatory_actions?: number
          response_quality_score?: number
          servicer_name?: string
          transfer_frequency?: number
          updated_at?: string | null
          vulnerability_indicators?: Json | null
          vulnerability_score?: number
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          last_activity: string | null
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spending_patterns: {
        Row: {
          average_amount: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          pattern_key: string
          pattern_type: string
          period_end: string
          period_start: string
          risk_score: number | null
          transaction_count: number | null
          user_id: string
        }
        Insert: {
          average_amount?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          pattern_key: string
          pattern_type: string
          period_end: string
          period_start: string
          risk_score?: number | null
          transaction_count?: number | null
          user_id: string
        }
        Update: {
          average_amount?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          pattern_key?: string
          pattern_type?: string
          period_end?: string
          period_start?: string
          risk_score?: number | null
          transaction_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spending_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_library: {
        Row: {
          avg_rating: number | null
          backtest_results: Json | null
          category: string
          config: Json
          created_at: string
          degradation_factor: number
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          is_system: boolean
          name: string
          risk_params: Json
          slug: string
          updated_at: string
          usage_count: number
          user_id: string | null
        }
        Insert: {
          avg_rating?: number | null
          backtest_results?: Json | null
          category: string
          config: Json
          created_at?: string
          degradation_factor?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          is_system?: boolean
          name: string
          risk_params?: Json
          slug: string
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Update: {
          avg_rating?: number | null
          backtest_results?: Json | null
          category?: string
          config?: Json
          created_at?: string
          degradation_factor?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          is_system?: boolean
          name?: string
          risk_params?: Json
          slug?: string
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      strategy_lifecycle: {
        Row: {
          created_at: string | null
          demoted_at: string | null
          demotion_reason: string | null
          dwell_start: string
          gate_scores: Json | null
          id: string
          promoted_at: string | null
          stage: string
          strategy_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          demoted_at?: string | null
          demotion_reason?: string | null
          dwell_start?: string
          gate_scores?: Json | null
          id?: string
          promoted_at?: string | null
          stage?: string
          strategy_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          demoted_at?: string | null
          demotion_reason?: string | null
          dwell_start?: string
          gate_scores?: Json | null
          id?: string
          promoted_at?: string | null
          stage?: string
          strategy_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      strategy_usage: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          dispute_id: string | null
          id: string
          outcome: string | null
          strategy_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          dispute_id?: string | null
          id?: string
          outcome?: string | null
          strategy_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          dispute_id?: string | null
          id?: string
          outcome?: string | null
          strategy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_usage_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_loan_strategies: {
        Row: {
          ai_confidence: number | null
          completed_at: string | null
          created_at: string | null
          decision_factors: Json | null
          description: string | null
          estimated_cost: number | null
          estimated_timeline: string | null
          execution_steps: Json | null
          id: string
          loan_id: string | null
          potential_savings: number | null
          priority: number
          started_at: string | null
          status: string
          strategy_name: string
          strategy_type: string
          success_probability: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          completed_at?: string | null
          created_at?: string | null
          decision_factors?: Json | null
          description?: string | null
          estimated_cost?: number | null
          estimated_timeline?: string | null
          execution_steps?: Json | null
          id?: string
          loan_id?: string | null
          potential_savings?: number | null
          priority: number
          started_at?: string | null
          status?: string
          strategy_name: string
          strategy_type: string
          success_probability?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          completed_at?: string | null
          created_at?: string | null
          decision_factors?: Json | null
          description?: string | null
          estimated_cost?: number | null
          estimated_timeline?: string | null
          execution_steps?: Json | null
          id?: string
          loan_id?: string | null
          potential_savings?: number | null
          priority?: number
          started_at?: string | null
          status?: string
          strategy_name?: string
          strategy_type?: string
          success_probability?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_loan_strategies_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "student_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      student_loans: {
        Row: {
          account_number: string
          borrower_defense_eligible: boolean | null
          created_at: string | null
          current_balance: number
          default_date: string | null
          disbursement_date: string | null
          discharge_eligible: boolean | null
          error_flags: string[] | null
          fresh_start_eligible: boolean | null
          id: string
          interest_rate: number
          last_payment_date: string | null
          loan_id: string
          loan_status: string
          loan_type: string
          original_amount: number
          original_balance: number | null
          rehabilitation_eligible: boolean | null
          servicer: string
          servicer_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number: string
          borrower_defense_eligible?: boolean | null
          created_at?: string | null
          current_balance: number
          default_date?: string | null
          disbursement_date?: string | null
          discharge_eligible?: boolean | null
          error_flags?: string[] | null
          fresh_start_eligible?: boolean | null
          id?: string
          interest_rate: number
          last_payment_date?: string | null
          loan_id: string
          loan_status: string
          loan_type: string
          original_amount: number
          original_balance?: number | null
          rehabilitation_eligible?: boolean | null
          servicer: string
          servicer_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string
          borrower_defense_eligible?: boolean | null
          created_at?: string | null
          current_balance?: number
          default_date?: string | null
          disbursement_date?: string | null
          discharge_eligible?: boolean | null
          error_flags?: string[] | null
          fresh_start_eligible?: boolean | null
          id?: string
          interest_rate?: number
          last_payment_date?: string | null
          loan_id?: string
          loan_status?: string
          loan_type?: string
          original_amount?: number
          original_balance?: number | null
          rehabilitation_eligible?: boolean | null
          servicer?: string
          servicer_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          annual_cost: number | null
          cancel_at_period_end: boolean | null
          cancellation_status: string | null
          cancelled_at: string | null
          category: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          detected_from_bill_id: string | null
          frequency: string | null
          id: string
          logo_url: string | null
          merchant_name: string | null
          name: string | null
          next_billing_date: string | null
          status: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          annual_cost?: number | null
          cancel_at_period_end?: boolean | null
          cancellation_status?: string | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          detected_from_bill_id?: string | null
          frequency?: string | null
          id?: string
          logo_url?: string | null
          merchant_name?: string | null
          name?: string | null
          next_billing_date?: string | null
          status: string
          stripe_price_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          annual_cost?: number | null
          cancel_at_period_end?: boolean | null
          cancellation_status?: string | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          detected_from_bill_id?: string | null
          frequency?: string | null
          id?: string
          logo_url?: string | null
          merchant_name?: string | null
          name?: string | null
          next_billing_date?: string | null
          status?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_audit_log: {
        Row: {
          action_type: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      tax_contribution_limits: {
        Row: {
          account_type: string
          catch_up_age: number | null
          catch_up_amount: number | null
          created_at: string | null
          id: string
          limit_amount: number
          source_reference: string | null
          tax_year: number
        }
        Insert: {
          account_type: string
          catch_up_age?: number | null
          catch_up_amount?: number | null
          created_at?: string | null
          id?: string
          limit_amount: number
          source_reference?: string | null
          tax_year: number
        }
        Update: {
          account_type?: string
          catch_up_age?: number | null
          catch_up_amount?: number | null
          created_at?: string | null
          id?: string
          limit_amount?: number
          source_reference?: string | null
          tax_year?: number
        }
        Relationships: []
      }
      tax_document_processing_log: {
        Row: {
          confidence: number | null
          created_at: string | null
          document_id: string
          document_type_detected: string | null
          error_message: string | null
          fields_extracted: number | null
          id: string
          processing_time_ms: number | null
          provider: string
          raw_response: Json | null
          success: boolean
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          document_id: string
          document_type_detected?: string | null
          error_message?: string | null
          fields_extracted?: number | null
          id?: string
          processing_time_ms?: number | null
          provider: string
          raw_response?: Json | null
          success: boolean
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string
          document_type_detected?: string | null
          error_message?: string | null
          fields_extracted?: number | null
          id?: string
          processing_time_ms?: number | null
          provider?: string
          raw_response?: Json | null
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_document_processing_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "tax_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_documents: {
        Row: {
          correction_history: Json | null
          created_at: string | null
          document_name: string
          document_type: string
          extracted_data: Json | null
          extraction_confidence: number | null
          file_size: number
          id: string
          is_valid: boolean | null
          is_verified: boolean | null
          manual_corrections: Json | null
          mime_type: string
          processing_time_ms: number | null
          providers_used: string[] | null
          requires_review: boolean | null
          review_reasons: string[] | null
          status: string | null
          storage_path: string | null
          tax_year: number
          updated_at: string | null
          user_id: string
          validation_errors: Json | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          correction_history?: Json | null
          created_at?: string | null
          document_name: string
          document_type: string
          extracted_data?: Json | null
          extraction_confidence?: number | null
          file_size: number
          id?: string
          is_valid?: boolean | null
          is_verified?: boolean | null
          manual_corrections?: Json | null
          mime_type: string
          processing_time_ms?: number | null
          providers_used?: string[] | null
          requires_review?: boolean | null
          review_reasons?: string[] | null
          status?: string | null
          storage_path?: string | null
          tax_year: number
          updated_at?: string | null
          user_id: string
          validation_errors?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          correction_history?: Json | null
          created_at?: string | null
          document_name?: string
          document_type?: string
          extracted_data?: Json | null
          extraction_confidence?: number | null
          file_size?: number
          id?: string
          is_valid?: boolean | null
          is_verified?: boolean | null
          manual_corrections?: Json | null
          mime_type?: string
          processing_time_ms?: number | null
          providers_used?: string[] | null
          requires_review?: boolean | null
          review_reasons?: string[] | null
          status?: string | null
          storage_path?: string | null
          tax_year?: number
          updated_at?: string | null
          user_id?: string
          validation_errors?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      tax_federal_brackets: {
        Row: {
          bracket_max: number | null
          bracket_min: number
          created_at: string | null
          filing_status: string
          id: string
          rate: number
          source_reference: string | null
          tax_year: number
        }
        Insert: {
          bracket_max?: number | null
          bracket_min: number
          created_at?: string | null
          filing_status: string
          id?: string
          rate: number
          source_reference?: string | null
          tax_year: number
        }
        Update: {
          bracket_max?: number | null
          bracket_min?: number
          created_at?: string | null
          filing_status?: string
          id?: string
          rate?: number
          source_reference?: string | null
          tax_year?: number
        }
        Relationships: []
      }
      tax_profiles: {
        Row: {
          capital_gains_long_term: number | null
          capital_gains_short_term: number | null
          created_at: string | null
          dependents_count: number | null
          filing_status: string
          gross_income: number | null
          has_hdhp: boolean | null
          id: string
          investment_income: number | null
          is_self_employed: boolean | null
          optimization_goal: string | null
          self_employment_income: number | null
          state_of_residence: string | null
          tax_year: number
          updated_at: string | null
          user_id: string
          w2_income: number | null
          ytd_401k_contribution: number | null
          ytd_hsa_contribution: number | null
          ytd_ira_contribution: number | null
        }
        Insert: {
          capital_gains_long_term?: number | null
          capital_gains_short_term?: number | null
          created_at?: string | null
          dependents_count?: number | null
          filing_status?: string
          gross_income?: number | null
          has_hdhp?: boolean | null
          id?: string
          investment_income?: number | null
          is_self_employed?: boolean | null
          optimization_goal?: string | null
          self_employment_income?: number | null
          state_of_residence?: string | null
          tax_year?: number
          updated_at?: string | null
          user_id: string
          w2_income?: number | null
          ytd_401k_contribution?: number | null
          ytd_hsa_contribution?: number | null
          ytd_ira_contribution?: number | null
        }
        Update: {
          capital_gains_long_term?: number | null
          capital_gains_short_term?: number | null
          created_at?: string | null
          dependents_count?: number | null
          filing_status?: string
          gross_income?: number | null
          has_hdhp?: boolean | null
          id?: string
          investment_income?: number | null
          is_self_employed?: boolean | null
          optimization_goal?: string | null
          self_employment_income?: number | null
          state_of_residence?: string | null
          tax_year?: number
          updated_at?: string | null
          user_id?: string
          w2_income?: number | null
          ytd_401k_contribution?: number | null
          ytd_hsa_contribution?: number | null
          ytd_ira_contribution?: number | null
        }
        Relationships: []
      }
      tax_recommendations: {
        Row: {
          ai_reasoning: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          estimated_tax_savings: number | null
          id: string
          priority: string | null
          status: string | null
          strategy_id: string | null
          tax_year: number
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          estimated_tax_savings?: number | null
          id?: string
          priority?: string | null
          status?: string | null
          strategy_id?: string | null
          tax_year: number
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          estimated_tax_savings?: number | null
          id?: string
          priority?: string | null
          status?: string | null
          strategy_id?: string | null
          tax_year?: number
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_recommendations_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "tax_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_state_rules: {
        Row: {
          created_at: string | null
          flat_rate: number | null
          has_income_tax: boolean | null
          id: string
          is_flat_rate: boolean | null
          notes: string | null
          state_code: string
          tax_year: number
        }
        Insert: {
          created_at?: string | null
          flat_rate?: number | null
          has_income_tax?: boolean | null
          id?: string
          is_flat_rate?: boolean | null
          notes?: string | null
          state_code: string
          tax_year: number
        }
        Update: {
          created_at?: string | null
          flat_rate?: number | null
          has_income_tax?: boolean | null
          id?: string
          is_flat_rate?: boolean | null
          notes?: string | null
          state_code?: string
          tax_year?: number
        }
        Relationships: []
      }
      tax_strategies: {
        Row: {
          category: string
          complexity: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          requires_professional: boolean | null
          strategy_code: string
          strategy_name: string
        }
        Insert: {
          category: string
          complexity?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requires_professional?: boolean | null
          strategy_code: string
          strategy_name: string
        }
        Update: {
          category?: string
          complexity?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requires_professional?: boolean | null
          strategy_code?: string
          strategy_name?: string
        }
        Relationships: []
      }
      trade_history: {
        Row: {
          agent_consensus: Json | null
          broker_connection_id: string | null
          broker_order_id: string | null
          closed_at: string | null
          commission: number | null
          compliance_score: number | null
          created_at: string
          executed_at: string | null
          filled_price: number | null
          filled_quantity: number | null
          id: string
          operating_mode: string | null
          order_type: string
          quantity: number
          realized_pnl: number | null
          rule_id: string | null
          side: string
          signal_id: string | null
          status: string
          strategy_id: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          agent_consensus?: Json | null
          broker_connection_id?: string | null
          broker_order_id?: string | null
          closed_at?: string | null
          commission?: number | null
          compliance_score?: number | null
          created_at?: string
          executed_at?: string | null
          filled_price?: number | null
          filled_quantity?: number | null
          id?: string
          operating_mode?: string | null
          order_type: string
          quantity: number
          realized_pnl?: number | null
          rule_id?: string | null
          side: string
          signal_id?: string | null
          status: string
          strategy_id?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          agent_consensus?: Json | null
          broker_connection_id?: string | null
          broker_order_id?: string | null
          closed_at?: string | null
          commission?: number | null
          compliance_score?: number | null
          created_at?: string
          executed_at?: string | null
          filled_price?: number | null
          filled_quantity?: number | null
          id?: string
          operating_mode?: string | null
          order_type?: string
          quantity?: number
          realized_pnl?: number | null
          rule_id?: string | null
          side?: string
          signal_id?: string | null
          status?: string
          strategy_id?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_history_broker_connection_id_fkey"
            columns: ["broker_connection_id"]
            isOneToOne: false
            referencedRelation: "broker_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "trading_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategy_library"
            referencedColumns: ["id"]
          },
        ]
      }
      tradelines: {
        Row: {
          age_months: number
          available: boolean | null
          bureaus_reporting: string[] | null
          created_at: string | null
          credit_limit: number
          estimated_score_impact: number | null
          id: string
          price: number
          provider_id: string
          updated_at: string | null
          utilization: number | null
        }
        Insert: {
          age_months: number
          available?: boolean | null
          bureaus_reporting?: string[] | null
          created_at?: string | null
          credit_limit: number
          estimated_score_impact?: number | null
          id?: string
          price: number
          provider_id: string
          updated_at?: string | null
          utilization?: number | null
        }
        Update: {
          age_months?: number
          available?: boolean | null
          bureaus_reporting?: string[] | null
          created_at?: string | null
          credit_limit?: number
          estimated_score_impact?: number | null
          id?: string
          price?: number
          provider_id?: string
          updated_at?: string | null
          utilization?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tradelines_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "marketplace_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          autonomous_enabled: boolean
          created_at: string
          guided_graduation_date: string | null
          guided_live_days_active: number
          guided_live_profitable: boolean
          guided_live_trade_count: number
          guided_start_date: string | null
          id: string
          is_active: boolean
          max_daily_loss_pct: number
          max_daily_trades: number
          max_position_value: number
          operating_mode: string
          strategy_performance: Json
          updated_at: string
          user_id: string
          watch_graduation_date: string | null
          watch_paper_days_active: number
          watch_paper_profitable: boolean
          watch_paper_trade_count: number
          watch_start_date: string
        }
        Insert: {
          autonomous_enabled?: boolean
          created_at?: string
          guided_graduation_date?: string | null
          guided_live_days_active?: number
          guided_live_profitable?: boolean
          guided_live_trade_count?: number
          guided_start_date?: string | null
          id?: string
          is_active?: boolean
          max_daily_loss_pct?: number
          max_daily_trades?: number
          max_position_value?: number
          operating_mode?: string
          strategy_performance?: Json
          updated_at?: string
          user_id: string
          watch_graduation_date?: string | null
          watch_paper_days_active?: number
          watch_paper_profitable?: boolean
          watch_paper_trade_count?: number
          watch_start_date?: string
        }
        Update: {
          autonomous_enabled?: boolean
          created_at?: string
          guided_graduation_date?: string | null
          guided_live_days_active?: number
          guided_live_profitable?: boolean
          guided_live_trade_count?: number
          guided_start_date?: string | null
          id?: string
          is_active?: boolean
          max_daily_loss_pct?: number
          max_daily_trades?: number
          max_position_value?: number
          operating_mode?: string
          strategy_performance?: Json
          updated_at?: string
          user_id?: string
          watch_graduation_date?: string | null
          watch_paper_days_active?: number
          watch_paper_profitable?: boolean
          watch_paper_trade_count?: number
          watch_start_date?: string
        }
        Relationships: []
      }
      trading_agent_logs: {
        Row: {
          agent_type: string
          confidence: number
          cost_usd: number
          created_at: string
          decision: Json
          fallback_chain: Json | null
          fallback_used: boolean
          id: string
          latency_ms: number
          model: string
          operating_mode: string | null
          provider: string
          signal_id: string | null
          symbol: string | null
          token_count: number
          user_id: string
          validation_errors: Json | null
          validation_passed: boolean
        }
        Insert: {
          agent_type: string
          confidence?: number
          cost_usd?: number
          created_at?: string
          decision: Json
          fallback_chain?: Json | null
          fallback_used?: boolean
          id?: string
          latency_ms?: number
          model: string
          operating_mode?: string | null
          provider?: string
          signal_id?: string | null
          symbol?: string | null
          token_count?: number
          user_id: string
          validation_errors?: Json | null
          validation_passed?: boolean
        }
        Update: {
          agent_type?: string
          confidence?: number
          cost_usd?: number
          created_at?: string
          decision?: Json
          fallback_chain?: Json | null
          fallback_used?: boolean
          id?: string
          latency_ms?: number
          model?: string
          operating_mode?: string | null
          provider?: string
          signal_id?: string | null
          symbol?: string | null
          token_count?: number
          user_id?: string
          validation_errors?: Json | null
          validation_passed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trading_agent_logs_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trading_signals_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_audit_trail: {
        Row: {
          action: string
          actor: string
          canonical_hash: string
          canonical_package_version: string
          created_at: string
          details: Json
          id: string
          reason: string
          resource_id: string | null
          resource_type: string
          success: boolean
        }
        Insert: {
          action: string
          actor: string
          canonical_hash?: string
          canonical_package_version?: string
          created_at?: string
          details?: Json
          id?: string
          reason: string
          resource_id?: string | null
          resource_type: string
          success: boolean
        }
        Update: {
          action?: string
          actor?: string
          canonical_hash?: string
          canonical_package_version?: string
          created_at?: string
          details?: Json
          id?: string
          reason?: string
          resource_id?: string | null
          resource_type?: string
          success?: boolean
        }
        Relationships: []
      }
      trading_rules: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          entry_conditions: Json
          execution: Json
          exit_conditions: Json
          filters: Json
          id: string
          name: string
          performance: Json | null
          position_sizing: Json
          risk_management: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          entry_conditions?: Json
          execution?: Json
          exit_conditions?: Json
          filters?: Json
          id?: string
          name: string
          performance?: Json | null
          position_sizing: Json
          risk_management: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          entry_conditions?: Json
          execution?: Json
          exit_conditions?: Json
          filters?: Json
          id?: string
          name?: string
          performance?: Json | null
          position_sizing?: Json
          risk_management?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          analysis_data: Json | null
          analysis_type: string
          asset_type: string
          confidence: number | null
          created_at: string | null
          expires_at: string | null
          fundamental_metrics: Json | null
          id: string
          is_active: boolean | null
          outcome: string | null
          outcome_date: string | null
          outcome_price: number | null
          outcome_return_percent: number | null
          reasoning: string | null
          risk_reward_ratio: number | null
          sentiment_score: number | null
          signal_type: string
          stop_loss: number | null
          strength: string
          supporting_factors: Json | null
          symbol: string
          take_profit: number | null
          target_price: number | null
          technical_indicators: Json | null
          time_horizon: string | null
          user_id: string
          viewed: boolean | null
        }
        Insert: {
          analysis_data?: Json | null
          analysis_type: string
          asset_type: string
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          fundamental_metrics?: Json | null
          id?: string
          is_active?: boolean | null
          outcome?: string | null
          outcome_date?: string | null
          outcome_price?: number | null
          outcome_return_percent?: number | null
          reasoning?: string | null
          risk_reward_ratio?: number | null
          sentiment_score?: number | null
          signal_type: string
          stop_loss?: number | null
          strength: string
          supporting_factors?: Json | null
          symbol: string
          take_profit?: number | null
          target_price?: number | null
          technical_indicators?: Json | null
          time_horizon?: string | null
          user_id: string
          viewed?: boolean | null
        }
        Update: {
          analysis_data?: Json | null
          analysis_type?: string
          asset_type?: string
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          fundamental_metrics?: Json | null
          id?: string
          is_active?: boolean | null
          outcome?: string | null
          outcome_date?: string | null
          outcome_price?: number | null
          outcome_return_percent?: number | null
          reasoning?: string | null
          risk_reward_ratio?: number | null
          sentiment_score?: number | null
          signal_type?: string
          stop_loss?: number | null
          strength?: string
          supporting_factors?: Json | null
          symbol?: string
          take_profit?: number | null
          target_price?: number | null
          technical_indicators?: Json | null
          time_horizon?: string | null
          user_id?: string
          viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_signals_v2: {
        Row: {
          action: string
          agent_votes: Json | null
          compliance_score: number | null
          confidence: number
          created_at: string
          entry_price: number | null
          executed_at: string | null
          execution_price: number | null
          expires_at: string | null
          id: string
          operating_mode: string | null
          signal_type: string
          source: string
          source_details: Json | null
          status: string
          stop_loss: number | null
          symbol: string
          target_price: number | null
          user_id: string
        }
        Insert: {
          action: string
          agent_votes?: Json | null
          compliance_score?: number | null
          confidence: number
          created_at?: string
          entry_price?: number | null
          executed_at?: string | null
          execution_price?: number | null
          expires_at?: string | null
          id?: string
          operating_mode?: string | null
          signal_type: string
          source: string
          source_details?: Json | null
          status?: string
          stop_loss?: number | null
          symbol: string
          target_price?: number | null
          user_id: string
        }
        Update: {
          action?: string
          agent_votes?: Json | null
          compliance_score?: number | null
          confidence?: number
          created_at?: string
          entry_price?: number | null
          executed_at?: string | null
          execution_price?: number | null
          expires_at?: string | null
          id?: string
          operating_mode?: string | null
          signal_type?: string
          source?: string
          source_details?: Json | null
          status?: string
          stop_loss?: number | null
          symbol?: string
          target_price?: number | null
          user_id?: string
        }
        Relationships: []
      }
      trailing_stops: {
        Row: {
          activated: boolean
          config: Json
          created_at: string
          current_stop_price: number
          entry_price: number
          highest_price: number
          id: string
          lowest_price: number
          position_id: string
          side: string
          status: string
          symbol: string
          triggered_at: string | null
          triggered_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activated?: boolean
          config: Json
          created_at?: string
          current_stop_price: number
          entry_price: number
          highest_price?: number
          id?: string
          lowest_price?: number
          position_id: string
          side: string
          status?: string
          symbol: string
          triggered_at?: string | null
          triggered_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activated?: boolean
          config?: Json
          created_at?: string
          current_stop_price?: number
          entry_price?: number
          highest_price?: number
          id?: string
          lowest_price?: number
          position_id?: string
          side?: string
          status?: string
          symbol?: string
          triggered_at?: string | null
          triggered_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_rules: {
        Row: {
          actions: Json
          condition_logic: string
          conditions: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_matched_at: string | null
          match_count: number | null
          name: string
          priority: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions: Json
          condition_logic?: string
          conditions: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_matched_at?: string | null
          match_count?: number | null
          name: string
          priority?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions?: Json
          condition_logic?: string
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_matched_at?: string | null
          match_count?: number | null
          name?: string
          priority?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category: string[] | null
          created_at: string | null
          date: string
          id: string
          is_pending: boolean | null
          is_recurring: boolean | null
          location: Json | null
          merchant_name: string | null
          name: string | null
          payment_channel: string | null
          subcategory: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category?: string[] | null
          created_at?: string | null
          date: string
          id: string
          is_pending?: boolean | null
          is_recurring?: boolean | null
          location?: Json | null
          merchant_name?: string | null
          name?: string | null
          payment_channel?: string | null
          subcategory?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string[] | null
          created_at?: string | null
          date?: string
          id?: string
          is_pending?: boolean | null
          is_recurring?: boolean | null
          location?: Json | null
          merchant_name?: string | null
          name?: string | null
          payment_channel?: string | null
          subcategory?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          id: string
          is_temp: boolean | null
          mime_type: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          id?: string
          is_temp?: boolean | null
          mime_type: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          id?: string
          is_temp?: boolean | null
          mime_type?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          is_pinned: boolean | null
          progress: number | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          is_pinned?: boolean | null
          progress?: number | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          is_pinned?: boolean | null
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_participation: {
        Row: {
          challenge_id: string
          completed_at: string | null
          current_progress: number | null
          id: string
          is_completed: boolean | null
          joined_at: string | null
          rank: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string | null
          rank?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string | null
          rank?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_participation_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "community_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenge_participation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string | null
          credit_balance: number
          period_end: string
          period_start: string
          purchased_credits: number
          subscription_allowance: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credit_balance?: number
          period_end?: string
          period_start?: string
          purchased_credits?: number
          subscription_allowance?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credit_balance?: number
          period_end?: string
          period_start?: string
          purchased_credits?: number
          subscription_allowance?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_financial_profiles: {
        Row: {
          biases: Json | null
          communication_tone: string | null
          created_at: string | null
          financial_personality: string | null
          id: string
          last_assessment_at: string | null
          preferred_notification_days: string[] | null
          preferred_notification_time: string | null
          primary_goals: Json | null
          risk_tolerance_score: number | null
          spending_triggers: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          biases?: Json | null
          communication_tone?: string | null
          created_at?: string | null
          financial_personality?: string | null
          id?: string
          last_assessment_at?: string | null
          preferred_notification_days?: string[] | null
          preferred_notification_time?: string | null
          primary_goals?: Json | null
          risk_tolerance_score?: number | null
          spending_triggers?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          biases?: Json | null
          communication_tone?: string | null
          created_at?: string | null
          financial_personality?: string | null
          id?: string
          last_assessment_at?: string | null
          preferred_notification_days?: string[] | null
          preferred_notification_time?: string | null
          primary_goals?: Json | null
          risk_tolerance_score?: number | null
          spending_triggers?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_financial_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string | null
          current_level: number
          current_streak: number
          current_xp: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          streak_multiplier: number
          total_xp_earned: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_level?: number
          current_streak?: number
          current_xp?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_multiplier?: number
          total_xp_earned?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_level?: number
          current_streak?: number
          current_xp?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          streak_multiplier?: number
          total_xp_earned?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quest_progress: {
        Row: {
          completed_at: string | null
          id: string
          is_completed: boolean | null
          progress_value: number | null
          quest_date: string
          quest_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          progress_value?: number | null
          quest_date?: string
          quest_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          progress_value?: number | null
          quest_date?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "daily_quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quest_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quotas: {
        Row: {
          max_cost: number
          max_requests: number
          max_tokens: number
          reset_period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          max_cost: number
          max_requests: number
          max_tokens: number
          reset_period?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          max_cost?: number
          max_requests?: number
          max_tokens?: number
          reset_period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_risk_settings: {
        Row: {
          created_at: string | null
          equity: number
          id: string
          kill_switch: Json
          peak_equity: number
          settings: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          equity?: number
          id?: string
          kill_switch?: Json
          peak_equity?: number
          settings?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          equity?: number
          id?: string
          kill_switch?: Json
          peak_equity?: number
          settings?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          display: Json | null
          id: string
          notifications: Json | null
          privacy: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display?: Json | null
          id?: string
          notifications?: Json | null
          privacy?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display?: Json | null
          id?: string
          notifications?: Json | null
          privacy?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vitality_score_history: {
        Row: {
          created_at: string
          credit_score: number
          debt_score: number
          id: string
          investments_score: number
          overall_score: number
          period_end: string
          period_start: string
          period_type: string
          savings_score: number
          spending_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_score: number
          debt_score: number
          id?: string
          investments_score: number
          overall_score: number
          period_end: string
          period_start: string
          period_type: string
          savings_score: number
          spending_score: number
          user_id: string
        }
        Update: {
          created_at?: string
          credit_score?: number
          debt_score?: number
          id?: string
          investments_score?: number
          overall_score?: number
          period_end?: string
          period_start?: string
          period_type?: string
          savings_score?: number
          spending_score?: number
          user_id?: string
        }
        Relationships: []
      }
      vitality_scores: {
        Row: {
          calculated_at: string
          created_at: string
          credit_details: Json | null
          credit_score: number
          debt_details: Json | null
          debt_score: number
          grade: string
          id: string
          investments_details: Json | null
          investments_score: number
          next_milestone: Json | null
          overall_score: number
          percentile: number | null
          quick_wins: Json | null
          savings_details: Json | null
          savings_score: number
          spending_details: Json | null
          spending_score: number
          trend: string | null
          trend_percentage: number | null
          user_id: string
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          credit_details?: Json | null
          credit_score: number
          debt_details?: Json | null
          debt_score: number
          grade: string
          id?: string
          investments_details?: Json | null
          investments_score: number
          next_milestone?: Json | null
          overall_score: number
          percentile?: number | null
          quick_wins?: Json | null
          savings_details?: Json | null
          savings_score: number
          spending_details?: Json | null
          spending_score: number
          trend?: string | null
          trend_percentage?: number | null
          user_id: string
        }
        Update: {
          calculated_at?: string
          created_at?: string
          credit_details?: Json | null
          credit_score?: number
          debt_details?: Json | null
          debt_score?: number
          grade?: string
          id?: string
          investments_details?: Json | null
          investments_score?: number
          next_milestone?: Json | null
          overall_score?: number
          percentile?: number | null
          quick_wins?: Json | null
          savings_details?: Json | null
          savings_score?: number
          spending_details?: Json | null
          spending_score?: number
          trend?: string | null
          trend_percentage?: number | null
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          authenticator_type: string | null
          challenge: string
          created_at: string
          credential_name: string | null
          expires_at: string
          id: string
          is_anonymous: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          authenticator_type?: string | null
          challenge: string
          created_at?: string
          credential_name?: string | null
          expires_at: string
          id?: string
          is_anonymous?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          authenticator_type?: string | null
          challenge?: string
          created_at?: string
          credential_name?: string | null
          expires_at?: string
          id?: string
          is_anonymous?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number | null
          created_at: string
          credential_id: string
          id: string
          last_used_at: string | null
          name: string
          public_key: string
          transports: string[] | null
          type: string
          user_id: string
        }
        Insert: {
          counter?: number | null
          created_at?: string
          credential_id: string
          id?: string
          last_used_at?: string | null
          name?: string
          public_key: string
          transports?: string[] | null
          type: string
          user_id: string
        }
        Update: {
          counter?: number | null
          created_at?: string
          credential_id?: string
          id?: string
          last_used_at?: string | null
          name?: string
          public_key?: string
          transports?: string[] | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          multiplier: number | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          multiplier?: number | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          multiplier?: number | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_summary: {
        Row: {
          closed_accounts: number | null
          current_accounts: number | null
          late_accounts: number | null
          total_accounts: number | null
          total_balance: number | null
          total_credit_limit: number | null
          user_id: string | null
          utilization_rate: number | null
        }
        Relationships: []
      }
      active_goals_summary: {
        Row: {
          active_goals: number | null
          avg_progress_percent: number | null
          completed_goals: number | null
          total_current: number | null
          total_goals: number | null
          total_target: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_session_stats: {
        Row: {
          assistant_message_count: number | null
          avg_message_length: number | null
          first_message_at: string | null
          last_message_at: string | null
          message_count: number | null
          session_id: string | null
          system_message_count: number | null
          user_id: string | null
          user_message_count: number | null
        }
        Relationships: []
      }
      latest_credit_scores: {
        Row: {
          bureau: string | null
          credit_score: number | null
          imported_at: string | null
          report_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
      latest_health_scores: {
        Row: {
          breakdown: Json | null
          calculated_at: string | null
          credit_score_component: number | null
          debt_score: number | null
          id: string | null
          insurance_score: number | null
          overall_score: number | null
          recommendations: Json | null
          savings_score: number | null
          spending_score: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_health_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_bills_summary: {
        Row: {
          auto_detected_count: number | null
          estimated_monthly_total: number | null
          total_bills: number | null
          total_negotiation_savings: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_summary: {
        Row: {
          total_gain_loss: number | null
          total_holdings: number | null
          total_portfolio_value: number | null
          total_portfolios: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investment_portfolios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unread_insights_count: {
        Row: {
          critical_count: number | null
          info_count: number | null
          total_unread: number | null
          user_id: string | null
          warning_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vitality_summary: {
        Row: {
          calculated_at: string | null
          credit_score: number | null
          debt_score: number | null
          grade: string | null
          investments_score: number | null
          milestones_achieved: number | null
          overall_score: number | null
          percentile: number | null
          savings_score: number | null
          spending_score: number | null
          trend: string | null
          trend_percentage: number | null
          user_id: string | null
          wins_completed: number | null
        }
        Insert: {
          calculated_at?: string | null
          credit_score?: number | null
          debt_score?: number | null
          grade?: string | null
          investments_score?: number | null
          milestones_achieved?: never
          overall_score?: number | null
          percentile?: number | null
          savings_score?: number | null
          spending_score?: number | null
          trend?: string | null
          trend_percentage?: number | null
          user_id?: string | null
          wins_completed?: never
        }
        Update: {
          calculated_at?: string | null
          credit_score?: number | null
          debt_score?: number | null
          grade?: string | null
          investments_score?: number | null
          milestones_achieved?: never
          overall_score?: number | null
          percentile?: number | null
          savings_score?: number | null
          spending_score?: number | null
          trend?: string | null
          trend_percentage?: number | null
          user_id?: string | null
          wins_completed?: never
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits: {
        Args: {
          p_amount: number
          p_amount_paid_cents?: number
          p_metadata?: Json
          p_pack_type?: string
          p_payment_intent_id?: string
          p_source: string
          p_user_id: string
        }
        Returns: {
          already_fulfilled: boolean
          new_balance: number
        }[]
      }
      archive_old_sessions: { Args: { p_days_old?: number }; Returns: number }
      award_xp: {
        Args: {
          p_amount: number
          p_event_type: string
          p_metadata?: Json
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_vitality_trend: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          score_change: number
          trend: string
          trend_percentage: number
        }[]
      }
      check_badge_eligibility: {
        Args: { p_badge_code: string; p_user_id: string }
        Returns: Json
      }
      cleanup_expired_webauthn_challenges: { Args: never; Returns: undefined }
      cleanup_old_processing_logs: { Args: never; Returns: undefined }
      complete_onboarding: { Args: { p_user_id: string }; Returns: undefined }
      deduct_credits: {
        Args: {
          p_action: string
          p_amount: number
          p_metadata?: Json
          p_user_id: string
        }
        Returns: {
          remaining: number
          success: boolean
        }[]
      }
      delete_user_data_cascade: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      get_latest_vitality_score: {
        Args: { p_user_id: string }
        Returns: {
          calculated_at: string
          created_at: string
          credit_details: Json | null
          credit_score: number
          debt_details: Json | null
          debt_score: number
          grade: string
          id: string
          investments_details: Json | null
          investments_score: number
          next_milestone: Json | null
          overall_score: number
          percentile: number | null
          quick_wins: Json | null
          savings_details: Json | null
          savings_score: number
          spending_details: Json | null
          spending_score: number
          trend: string | null
          trend_percentage: number | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vitality_scores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_recent_sessions_with_preview: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          last_message_at: string
          last_message_content: string
          last_message_role: string
          message_count: number
          title: string
          updated_at: string
        }[]
      }
      get_session_messages_paginated: {
        Args: { p_limit?: number; p_offset?: number; p_session_id: string }
        Returns: {
          content: string
          id: string
          intent_confidence: number
          intent_type: string
          metadata: Json
          role: string
          timestamp: string
        }[]
      }
      get_session_with_stats: {
        Args: { p_session_id: string }
        Returns: {
          archived: boolean
          assistant_message_count: number
          created_at: string
          id: string
          last_message_at: string
          message_count: number
          metadata: Json
          title: string
          updated_at: string
          user_id: string
          user_message_count: number
        }[]
      }
      get_user_session_summary: {
        Args: { p_user_id: string }
        Returns: {
          active_sessions: number
          archived_sessions: number
          last_activity: string
          total_messages: number
          total_sessions: number
        }[]
      }
      increment_referral_use: {
        Args: { p_code: string; p_user_id: string }
        Returns: string
      }
      increment_rule_match_count: {
        Args: { p_rule_id: string; p_user_id: string }
        Returns: undefined
      }
      is_webhook_event_processed: {
        Args: { p_event_id: string; p_provider: string }
        Returns: boolean
      }
      mark_webhook_event_processed: {
        Args: { p_event_id: string; p_provider: string }
        Returns: undefined
      }
      redeem_backup_code: {
        Args: { p_code_hash: string; p_user_id: string }
        Returns: {
          redeemed: boolean
        }[]
      }
      refresh_chat_session_stats: { Args: never; Returns: undefined }
      update_user_streak: { Args: { p_user_id: string }; Returns: Json }
    }
    Enums: {
      bill_category:
        | "utilities"
        | "rent"
        | "mortgage"
        | "insurance"
        | "subscription"
        | "loan"
        | "credit_card"
        | "phone"
        | "internet"
        | "streaming"
        | "other"
      bill_frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
      bill_status: "active" | "paused" | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bill_category: [
        "utilities",
        "rent",
        "mortgage",
        "insurance",
        "subscription",
        "loan",
        "credit_card",
        "phone",
        "internet",
        "streaming",
        "other",
      ],
      bill_frequency: ["weekly", "biweekly", "monthly", "quarterly", "yearly"],
      bill_status: ["active", "paused", "cancelled"],
    },
  },
} as const

