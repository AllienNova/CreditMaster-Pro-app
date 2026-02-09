/**
 * Proactive Alert Engine
 *
 * AI-powered system that monitors user financial data and generates
 * proactive alerts for:
 * - Unusual spending patterns
 * - Bill payment reminders
 * - Subscription price increases
 * - Low balance warnings
 * - Large transaction alerts
 * - Savings opportunities
 * - Credit score changes
 * - Investment opportunities
 *
 * Security: All alerts respect user privacy preferences and data handling policies.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type AlertType =
  | 'unusual_spending'
  | 'low_balance'
  | 'large_transaction'
  | 'bill_due'
  | 'subscription_change'
  | 'savings_opportunity'
  | 'credit_change'
  | 'investment_opportunity'
  | 'budget_exceeded'
  | 'goal_milestone'
  | 'fraud_suspected'
  | 'rate_opportunity';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus =
  | 'pending'
  | 'sent'
  | 'read'
  | 'dismissed'
  | 'acted_upon';

export interface ProactiveAlert {
  id: string;
  userId: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  data: Record<string, unknown>;
  status: AlertStatus;
  expiresAt?: Date;
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

export interface AlertRule {
  id: string;
  type: AlertType;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  priority: AlertPriority;
  cooldownMinutes: number;
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
}

export interface AlertCondition {
  field: string;
  operator:
    | 'gt'
    | 'lt'
    | 'eq'
    | 'ne'
    | 'gte'
    | 'lte'
    | 'contains'
    | 'percent_change';
  value: number | string;
  timeframeDays?: number;
}

export interface UserAlertPreferences {
  userId: string;
  enabledTypes: AlertType[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  dailyDigest: boolean;
  weeklyDigest: boolean;
}

export interface SpendingPattern {
  category: string;
  avgDaily: number;
  avgWeekly: number;
  avgMonthly: number;
  stdDev: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface AlertAnalysis {
  shouldAlert: boolean;
  confidence: number;
  reason: string;
  suggestedPriority: AlertPriority;
  relatedData: Record<string, unknown>;
}

// ============================================================================
// DEFAULT ALERT RULES
// ============================================================================

const DEFAULT_ALERT_RULES: Omit<AlertRule, 'id'>[] = [
  {
    type: 'unusual_spending',
    name: 'Unusual Spending Detection',
    description:
      'Alert when spending in a category exceeds 2x the monthly average',
    enabled: true,
    conditions: [
      {
        field: 'category_spending',
        operator: 'percent_change',
        value: 100,
        timeframeDays: 30,
      },
    ],
    priority: 'medium',
    cooldownMinutes: 1440, // 24 hours
    channels: ['push', 'in_app'],
  },
  {
    type: 'low_balance',
    name: 'Low Balance Warning',
    description: 'Alert when checking account balance falls below threshold',
    enabled: true,
    conditions: [{ field: 'balance', operator: 'lt', value: 500 }],
    priority: 'high',
    cooldownMinutes: 720, // 12 hours
    channels: ['push', 'email', 'in_app'],
  },
  {
    type: 'large_transaction',
    name: 'Large Transaction Alert',
    description: 'Alert for transactions over $500',
    enabled: true,
    conditions: [{ field: 'amount', operator: 'gt', value: 500 }],
    priority: 'medium',
    cooldownMinutes: 0, // No cooldown
    channels: ['push', 'in_app'],
  },
  {
    type: 'bill_due',
    name: 'Bill Due Reminder',
    description: 'Remind about upcoming bills 3 days before due date',
    enabled: true,
    conditions: [{ field: 'days_until_due', operator: 'lte', value: 3 }],
    priority: 'medium',
    cooldownMinutes: 1440,
    channels: ['push', 'email', 'in_app'],
  },
  {
    type: 'subscription_change',
    name: 'Subscription Price Change',
    description: 'Alert when a subscription price increases',
    enabled: true,
    conditions: [{ field: 'price_change_percent', operator: 'gt', value: 0 }],
    priority: 'medium',
    cooldownMinutes: 10080, // 7 days
    channels: ['email', 'in_app'],
  },
  {
    type: 'budget_exceeded',
    name: 'Budget Exceeded',
    description: 'Alert when spending exceeds budget category limit',
    enabled: true,
    conditions: [{ field: 'budget_percent', operator: 'gt', value: 100 }],
    priority: 'high',
    cooldownMinutes: 1440,
    channels: ['push', 'in_app'],
  },
  {
    type: 'savings_opportunity',
    name: 'Savings Opportunity',
    description: 'Suggest savings opportunities based on spending patterns',
    enabled: true,
    conditions: [{ field: 'potential_savings', operator: 'gt', value: 50 }],
    priority: 'low',
    cooldownMinutes: 10080,
    channels: ['email', 'in_app'],
  },
  {
    type: 'credit_change',
    name: 'Credit Score Change',
    description: 'Alert on significant credit score changes',
    enabled: true,
    conditions: [{ field: 'score_change', operator: 'gte', value: 10 }],
    priority: 'medium',
    cooldownMinutes: 1440,
    channels: ['push', 'email', 'in_app'],
  },
  {
    type: 'fraud_suspected',
    name: 'Suspected Fraud',
    description: 'Alert on potentially fraudulent transactions',
    enabled: true,
    conditions: [{ field: 'fraud_score', operator: 'gt', value: 0.7 }],
    priority: 'critical',
    cooldownMinutes: 0,
    channels: ['push', 'sms', 'email', 'in_app'],
  },
];

// ============================================================================
// PROACTIVE ALERT ENGINE
// ============================================================================

export class ProactiveAlertEngine {
  private supabase: SupabaseClient;
  private alertRules: Map<AlertType, AlertRule> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeRules();
  }

  private initializeRules(): void {
    DEFAULT_ALERT_RULES.forEach((rule, index) => {
      this.alertRules.set(rule.type, {
        ...rule,
        id: `default-${index}`,
      });
    });
  }

  // ==========================================================================
  // ALERT GENERATION
  // ==========================================================================

  async analyzeAndGenerateAlerts(userId: string): Promise<ProactiveAlert[]> {
    const preferences = await this.getUserPreferences(userId);
    const alerts: ProactiveAlert[] = [];

    // Run all enabled alert checks
    for (const alertType of preferences.enabledTypes) {
      const rule = this.alertRules.get(alertType);
      if (!rule || !rule.enabled) continue;

      // Check cooldown
      const lastAlert = await this.getLastAlert(userId, alertType);
      if (lastAlert && this.isInCooldown(lastAlert, rule.cooldownMinutes)) {
        continue;
      }

      // Run specific analysis based on alert type
      const analysis = await this.analyzeForAlertType(userId, alertType);

      if (analysis.shouldAlert) {
        const alert = await this.createAlert(userId, alertType, analysis, rule);
        alerts.push(alert);
      }
    }

    return alerts;
  }

  private async analyzeForAlertType(
    userId: string,
    alertType: AlertType
  ): Promise<AlertAnalysis> {
    switch (alertType) {
      case 'unusual_spending':
        return this.analyzeUnusualSpending(userId);
      case 'low_balance':
        return this.analyzeLowBalance(userId);
      case 'large_transaction':
        return this.analyzeLargeTransactions(userId);
      case 'bill_due':
        return this.analyzeUpcomingBills(userId);
      case 'subscription_change':
        return this.analyzeSubscriptionChanges(userId);
      case 'budget_exceeded':
        return this.analyzeBudgetStatus(userId);
      case 'savings_opportunity':
        return this.analyzeSavingsOpportunities(userId);
      case 'credit_change':
        return this.analyzeCreditChanges(userId);
      case 'fraud_suspected':
        return this.analyzeFraudRisk(userId);
      default:
        return {
          shouldAlert: false,
          confidence: 0,
          reason: '',
          suggestedPriority: 'low',
          relatedData: {},
        };
    }
  }

  // ==========================================================================
  // SPECIFIC ALERT ANALYZERS
  // ==========================================================================

  private async analyzeUnusualSpending(userId: string): Promise<AlertAnalysis> {
    // Get recent transactions
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false });

    if (!transactions || transactions.length === 0) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    // Get spending patterns
    const patterns = await this.getSpendingPatterns(userId);

    // Check each category for anomalies
    const categorySpending = new Map<string, number>();
    transactions.forEach((t) => {
      const current = categorySpending.get(t.category) || 0;
      categorySpending.set(t.category, current + Math.abs(t.amount));
    });

    for (const [category, spending] of categorySpending) {
      const pattern = patterns.find((p) => p.category === category);
      if (pattern && spending > pattern.avgWeekly * 2) {
        return {
          shouldAlert: true,
          confidence: 0.85,
          reason: `Spending in ${category} is ${Math.round((spending / pattern.avgWeekly - 1) * 100)}% higher than usual`,
          suggestedPriority: 'medium',
          relatedData: {
            category,
            currentSpending: spending,
            averageSpending: pattern.avgWeekly,
            percentIncrease: Math.round(
              (spending / pattern.avgWeekly - 1) * 100
            ),
          },
        };
      }
    }

    return {
      shouldAlert: false,
      confidence: 0,
      reason: '',
      suggestedPriority: 'low',
      relatedData: {},
    };
  }

  private async analyzeLowBalance(userId: string): Promise<AlertAnalysis> {
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'checking');

    if (!accounts) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    for (const account of accounts) {
      if (account.balance < 500) {
        return {
          shouldAlert: true,
          confidence: 1.0,
          reason: `Your ${account.name} balance is low`,
          suggestedPriority: account.balance < 100 ? 'critical' : 'high',
          relatedData: {
            accountId: account.id,
            accountName: account.name,
            balance: account.balance,
            threshold: 500,
          },
        };
      }
    }

    return {
      shouldAlert: false,
      confidence: 0,
      reason: '',
      suggestedPriority: 'low',
      relatedData: {},
    };
  }

  private async analyzeLargeTransactions(
    userId: string
  ): Promise<AlertAnalysis> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', oneDayAgo)
      .order('amount', { ascending: false })
      .limit(1);

    if (!transactions || transactions.length === 0) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    const largestTx = transactions[0];
    if (Math.abs(largestTx.amount) > 500) {
      return {
        shouldAlert: true,
        confidence: 1.0,
        reason: `Large transaction detected: ${largestTx.merchant_name || 'Unknown'}`,
        suggestedPriority:
          Math.abs(largestTx.amount) > 1000 ? 'high' : 'medium',
        relatedData: {
          transactionId: largestTx.id,
          amount: largestTx.amount,
          merchant: largestTx.merchant_name,
          category: largestTx.category,
          date: largestTx.date,
        },
      };
    }

    return {
      shouldAlert: false,
      confidence: 0,
      reason: '',
      suggestedPriority: 'low',
      relatedData: {},
    };
  }

  private async analyzeUpcomingBills(userId: string): Promise<AlertAnalysis> {
    const threeDaysFromNow = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    const today = new Date().toISOString();

    const { data: bills } = await this.supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('due_date', today)
      .lte('due_date', threeDaysFromNow)
      .order('due_date', { ascending: true });

    if (!bills || bills.length === 0) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    const totalDue = bills.reduce((sum, b) => sum + b.amount, 0);
    const nextBill = bills[0];
    const daysUntilDue = Math.ceil(
      (new Date(nextBill.due_date).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000)
    );

    return {
      shouldAlert: true,
      confidence: 1.0,
      reason: `${bills.length} bill${bills.length > 1 ? 's' : ''} due within 3 days`,
      suggestedPriority: daysUntilDue <= 1 ? 'high' : 'medium',
      relatedData: {
        billCount: bills.length,
        totalAmount: totalDue,
        nextBill: {
          name: nextBill.name,
          amount: nextBill.amount,
          dueDate: nextBill.due_date,
          daysUntilDue,
        },
        bills: bills.map((b) => ({
          id: b.id,
          name: b.name,
          amount: b.amount,
          dueDate: b.due_date,
        })),
      },
    };
  }

  private async analyzeSubscriptionChanges(
    userId: string
  ): Promise<AlertAnalysis> {
    const { data: subscriptions } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    // Check for price increases (compare with historical data)
    for (const sub of subscriptions) {
      if (sub.previous_amount && sub.amount > sub.previous_amount) {
        const increase = sub.amount - sub.previous_amount;
        const percentIncrease = (increase / sub.previous_amount) * 100;

        return {
          shouldAlert: true,
          confidence: 0.95,
          reason: `${sub.name} subscription price increased`,
          suggestedPriority: percentIncrease > 20 ? 'high' : 'medium',
          relatedData: {
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            previousAmount: sub.previous_amount,
            newAmount: sub.amount,
            increase,
            percentIncrease: Math.round(percentIncrease),
          },
        };
      }
    }

    return {
      shouldAlert: false,
      confidence: 0,
      reason: '',
      suggestedPriority: 'low',
      relatedData: {},
    };
  }

  private async analyzeBudgetStatus(userId: string): Promise<AlertAnalysis> {
    const { data: budgets } = await this.supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!budgets) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    for (const budget of budgets) {
      const percentUsed = (budget.spent / budget.amount) * 100;

      if (percentUsed >= 100) {
        return {
          shouldAlert: true,
          confidence: 1.0,
          reason: `Budget exceeded for ${budget.category}`,
          suggestedPriority: percentUsed > 120 ? 'high' : 'medium',
          relatedData: {
            budgetId: budget.id,
            category: budget.category,
            budgetAmount: budget.amount,
            spent: budget.spent,
            percentUsed: Math.round(percentUsed),
            overage: budget.spent - budget.amount,
          },
        };
      } else if (percentUsed >= 90) {
        return {
          shouldAlert: true,
          confidence: 0.9,
          reason: `Approaching budget limit for ${budget.category}`,
          suggestedPriority: 'low',
          relatedData: {
            budgetId: budget.id,
            category: budget.category,
            budgetAmount: budget.amount,
            spent: budget.spent,
            percentUsed: Math.round(percentUsed),
            remaining: budget.amount - budget.spent,
          },
        };
      }
    }

    return {
      shouldAlert: false,
      confidence: 0,
      reason: '',
      suggestedPriority: 'low',
      relatedData: {},
    };
  }

  private async analyzeSavingsOpportunities(
    userId: string
  ): Promise<AlertAnalysis> {
    // Analyze recurring charges for potential savings
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte(
        'date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (!transactions || transactions.length < 10) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    // Find duplicate subscriptions or high-fee services
    const merchantCounts = new Map<string, { count: number; total: number }>();
    transactions.forEach((t) => {
      if (t.merchant_name) {
        const existing = merchantCounts.get(t.merchant_name) || {
          count: 0,
          total: 0,
        };
        merchantCounts.set(t.merchant_name, {
          count: existing.count + 1,
          total: existing.total + Math.abs(t.amount),
        });
      }
    });

    // Look for potential savings (simplified analysis)
    const potentialSavings: {
      merchant: string;
      monthlyAmount: number;
      suggestion: string;
    }[] = [];

    for (const [merchant, data] of merchantCounts) {
      const monthlyAvg = data.total / 3;
      if (monthlyAvg > 50 && data.count > 2) {
        potentialSavings.push({
          merchant,
          monthlyAmount: monthlyAvg,
          suggestion: `Consider reviewing your ${merchant} spending`,
        });
      }
    }

    if (potentialSavings.length > 0) {
      const totalPotential = potentialSavings.reduce(
        (sum, s) => sum + s.monthlyAmount * 0.2,
        0
      );

      return {
        shouldAlert: true,
        confidence: 0.7,
        reason: `Found ${potentialSavings.length} potential savings opportunities`,
        suggestedPriority: 'low',
        relatedData: {
          opportunities: potentialSavings.slice(0, 5),
          estimatedMonthlySavings: Math.round(totalPotential),
        },
      };
    }

    return {
      shouldAlert: false,
      confidence: 0,
      reason: '',
      suggestedPriority: 'low',
      relatedData: {},
    };
  }

  private async analyzeCreditChanges(userId: string): Promise<AlertAnalysis> {
    const { data: creditHistory } = await this.supabase
      .from('credit_scores')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(2);

    if (!creditHistory || creditHistory.length < 2) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    const [current, previous] = creditHistory;
    const change = current.score - previous.score;

    if (Math.abs(change) >= 10) {
      return {
        shouldAlert: true,
        confidence: 1.0,
        reason: `Your credit score ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} points`,
        suggestedPriority: Math.abs(change) >= 30 ? 'high' : 'medium',
        relatedData: {
          currentScore: current.score,
          previousScore: previous.score,
          change,
          direction: change > 0 ? 'up' : 'down',
          recordedAt: current.recorded_at,
        },
      };
    }

    return {
      shouldAlert: false,
      confidence: 0,
      reason: '',
      suggestedPriority: 'low',
      relatedData: {},
    };
  }

  private async analyzeFraudRisk(userId: string): Promise<AlertAnalysis> {
    // Get recent transactions
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false });

    if (!transactions || transactions.length === 0) {
      return {
        shouldAlert: false,
        confidence: 0,
        reason: '',
        suggestedPriority: 'low',
        relatedData: {},
      };
    }

    // Simple fraud indicators (in production, use ML model)
    for (const tx of transactions) {
      const fraudIndicators: string[] = [];

      // Unusual amount for merchant
      if (Math.abs(tx.amount) > 1000) fraudIndicators.push('large_amount');

      // Foreign transaction
      if (tx.location && tx.location !== 'US')
        fraudIndicators.push('foreign_location');

      // Multiple transactions in short time
      const recentCount = transactions.filter(
        (t) =>
          t.merchant_name === tx.merchant_name &&
          Math.abs(new Date(t.date).getTime() - new Date(tx.date).getTime()) <
            3600000
      ).length;
      if (recentCount > 3) fraudIndicators.push('rapid_transactions');

      // Unusual category for user
      if (tx.category === 'gambling' || tx.category === 'wire_transfer') {
        fraudIndicators.push('high_risk_category');
      }

      if (fraudIndicators.length >= 2) {
        return {
          shouldAlert: true,
          confidence: 0.8,
          reason: 'Potentially suspicious transaction detected',
          suggestedPriority: 'critical',
          relatedData: {
            transactionId: tx.id,
            amount: tx.amount,
            merchant: tx.merchant_name,
            indicators: fraudIndicators,
            date: tx.date,
          },
        };
      }
    }

    return {
      shouldAlert: false,
      confidence: 0,
      reason: '',
      suggestedPriority: 'low',
      relatedData: {},
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async getSpendingPatterns(
    userId: string
  ): Promise<SpendingPattern[]> {
    // Get last 90 days of transactions
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('category, amount, date')
      .eq('user_id', userId)
      .gte(
        'date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      );

    if (!transactions) return [];

    // Group by category
    const categoryData = new Map<string, number[]>();
    transactions.forEach((t) => {
      const amounts = categoryData.get(t.category) || [];
      amounts.push(Math.abs(t.amount));
      categoryData.set(t.category, amounts);
    });

    // Calculate patterns
    const patterns: SpendingPattern[] = [];
    for (const [category, amounts] of categoryData) {
      const total = amounts.reduce((sum, a) => sum + a, 0);
      const mean = total / amounts.length;
      const variance =
        amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) /
        amounts.length;
      const stdDev = Math.sqrt(variance);

      patterns.push({
        category,
        avgDaily: total / 90,
        avgWeekly: total / 13,
        avgMonthly: total / 3,
        stdDev,
        trend: 'stable', // Simplified - would calculate actual trend
      });
    }

    return patterns;
  }

  private async getUserPreferences(
    userId: string
  ): Promise<UserAlertPreferences> {
    const { data } = await this.supabase
      .from('alert_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) return data;

    // Return defaults
    return {
      userId,
      enabledTypes: [
        'unusual_spending',
        'low_balance',
        'large_transaction',
        'bill_due',
        'budget_exceeded',
        'credit_change',
        'fraud_suspected',
      ],
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      dailyDigest: false,
      weeklyDigest: true,
    };
  }

  private async getLastAlert(
    userId: string,
    alertType: AlertType
  ): Promise<ProactiveAlert | null> {
    const { data } = await this.supabase
      .from('proactive_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('type', alertType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  private isInCooldown(
    lastAlert: ProactiveAlert,
    cooldownMinutes: number
  ): boolean {
    if (cooldownMinutes === 0) return false;
    const cooldownEnd =
      new Date(lastAlert.createdAt).getTime() + cooldownMinutes * 60 * 1000;
    return Date.now() < cooldownEnd;
  }

  private async createAlert(
    userId: string,
    alertType: AlertType,
    analysis: AlertAnalysis,
    rule: AlertRule
  ): Promise<ProactiveAlert> {
    const alert: Omit<ProactiveAlert, 'id'> = {
      userId,
      type: alertType,
      priority: analysis.suggestedPriority,
      title: this.generateAlertTitle(alertType, analysis),
      message: analysis.reason,
      actionUrl: this.getActionUrl(alertType),
      actionLabel: this.getActionLabel(alertType),
      data: analysis.relatedData,
      status: 'pending',
      createdAt: new Date(),
    };

    const { data, error } = await this.supabase
      .from('proactive_alerts')
      .insert(alert)
      .select()
      .single();

    if (error) throw new Error(`Failed to create alert: ${error.message}`);
    return data;
  }

  private generateAlertTitle(
    alertType: AlertType,
    analysis: AlertAnalysis
  ): string {
    const titles: Record<AlertType, string> = {
      unusual_spending: 'Unusual Spending Detected',
      low_balance: 'Low Balance Warning',
      large_transaction: 'Large Transaction',
      bill_due: 'Bill Due Soon',
      subscription_change: 'Subscription Price Change',
      savings_opportunity: 'Savings Opportunity',
      credit_change: 'Credit Score Update',
      investment_opportunity: 'Investment Opportunity',
      budget_exceeded: 'Budget Exceeded',
      goal_milestone: 'Goal Milestone',
      fraud_suspected: 'Suspicious Activity',
      rate_opportunity: 'Better Rate Available',
    };

    return titles[alertType] || 'Financial Alert';
  }

  private getActionUrl(alertType: AlertType): string {
    const urls: Record<AlertType, string> = {
      unusual_spending: '/insights/spending',
      low_balance: '/financial/accounts',
      large_transaction: '/financial/transactions',
      bill_due: '/budgeting/bills',
      subscription_change: '/budgeting/subscriptions',
      savings_opportunity: '/insights/savings',
      credit_change: '/credit',
      investment_opportunity: '/investments',
      budget_exceeded: '/budgeting',
      goal_milestone: '/financial/goals',
      fraud_suspected: '/settings/security',
      rate_opportunity: '/financial/accounts',
    };

    return urls[alertType] || '/dashboard';
  }

  private getActionLabel(alertType: AlertType): string {
    const labels: Record<AlertType, string> = {
      unusual_spending: 'View Spending',
      low_balance: 'View Account',
      large_transaction: 'View Transaction',
      bill_due: 'Pay Bill',
      subscription_change: 'Review Subscription',
      savings_opportunity: 'See Opportunities',
      credit_change: 'View Score',
      investment_opportunity: 'View Opportunity',
      budget_exceeded: 'Adjust Budget',
      goal_milestone: 'View Progress',
      fraud_suspected: 'Review Activity',
      rate_opportunity: 'Compare Rates',
    };

    return labels[alertType] || 'View Details';
  }

  // ==========================================================================
  // PUBLIC ALERT MANAGEMENT
  // ==========================================================================

  async getAlerts(
    userId: string,
    options: { status?: AlertStatus; limit?: number; offset?: number } = {}
  ): Promise<ProactiveAlert[]> {
    let query = this.supabase
      .from('proactive_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 20) - 1
      );
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get alerts: ${error.message}`);
    return data || [];
  }

  async markAsRead(alertId: string): Promise<void> {
    await this.supabase
      .from('proactive_alerts')
      .update({ status: 'read', readAt: new Date() })
      .eq('id', alertId);
  }

  async dismissAlert(alertId: string): Promise<void> {
    await this.supabase
      .from('proactive_alerts')
      .update({ status: 'dismissed' })
      .eq('id', alertId);
  }

  async markAsActedUpon(alertId: string): Promise<void> {
    await this.supabase
      .from('proactive_alerts')
      .update({ status: 'acted_upon' })
      .eq('id', alertId);
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<UserAlertPreferences>
  ): Promise<void> {
    await this.supabase
      .from('alert_preferences')
      .upsert({ user_id: userId, ...preferences })
      .eq('user_id', userId);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let proactiveAlertEngineInstance: ProactiveAlertEngine | null = null;

export function getProactiveAlertEngine(): ProactiveAlertEngine {
  if (!proactiveAlertEngineInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    proactiveAlertEngineInstance = new ProactiveAlertEngine(
      supabaseUrl,
      supabaseKey
    );
  }
  return proactiveAlertEngineInstance;
}
