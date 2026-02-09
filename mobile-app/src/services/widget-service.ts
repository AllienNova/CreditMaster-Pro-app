/**
 * Widget Service for iOS and Android Home Screen Widgets
 *
 * Provides data for home screen widgets including:
 * - Credit Score Widget
 * - Budget Overview Widget
 * - Upcoming Bills Widget
 * - Net Worth Widget
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES
// ============================================================================

export type WidgetType =
  | 'credit_score'
  | 'budget_overview'
  | 'upcoming_bills'
  | 'net_worth'
  | 'quick_actions';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetData {
  type: WidgetType;
  lastUpdated: string;
  data: Record<string, unknown>;
}

export interface CreditScoreWidgetData {
  score: number;
  change: number;
  changeDirection: 'up' | 'down' | 'stable';
  rating: 'poor' | 'fair' | 'good' | 'very_good' | 'excellent';
  lastUpdated: string;
}

export interface BudgetWidgetData {
  totalBudget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  daysRemaining: number;
  topCategories: {
    name: string;
    spent: number;
    budget: number;
    percentUsed: number;
  }[];
}

export interface BillsWidgetData {
  upcomingCount: number;
  totalDueThisWeek: number;
  nextBill: {
    name: string;
    amount: number;
    dueDate: string;
    daysUntilDue: number;
  } | null;
  overdueCount: number;
  overdueAmount: number;
}

export interface NetWorthWidgetData {
  totalNetWorth: number;
  change: number;
  changePercent: number;
  assets: number;
  liabilities: number;
  lastUpdated: string;
}

export interface WidgetConfig {
  widgetId: string;
  type: WidgetType;
  size: WidgetSize;
  refreshInterval: number; // in minutes
  isEnabled: boolean;
  position?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WIDGET_STORAGE_KEY = '@fynvita_widget_data';
const WIDGET_CONFIG_KEY = '@fynvita_widget_config';

const DEFAULT_REFRESH_INTERVALS: Record<WidgetType, number> = {
  credit_score: 60, // 1 hour
  budget_overview: 15, // 15 minutes
  upcoming_bills: 30, // 30 minutes
  net_worth: 60, // 1 hour
  quick_actions: 0, // No refresh needed
};

// ============================================================================
// WIDGET SERVICE CLASS
// ============================================================================

class WidgetService {
  private cachedData: Map<WidgetType, WidgetData> = new Map();

  /**
   * Initialize widget service and load cached data
   */
  async initialize(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        for (const [type, data] of Object.entries(parsed)) {
          this.cachedData.set(type as WidgetType, data as WidgetData);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to initialize widget service:', error);
    }
  }

  /**
   * Get widget data by type
   */
  async getWidgetData<T>(type: WidgetType): Promise<T | null> {
    const cached = this.cachedData.get(type);
    if (cached) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Update credit score widget data
   */
  async updateCreditScoreWidget(data: CreditScoreWidgetData): Promise<void> {
    const widgetData: WidgetData = {
      type: 'credit_score',
      lastUpdated: new Date().toISOString(),
      data,
    };

    await this.saveWidgetData('credit_score', widgetData);
    await this.notifyWidgetUpdate('credit_score');
  }

  /**
   * Update budget overview widget data
   */
  async updateBudgetWidget(data: BudgetWidgetData): Promise<void> {
    const widgetData: WidgetData = {
      type: 'budget_overview',
      lastUpdated: new Date().toISOString(),
      data,
    };

    await this.saveWidgetData('budget_overview', widgetData);
    await this.notifyWidgetUpdate('budget_overview');
  }

  /**
   * Update upcoming bills widget data
   */
  async updateBillsWidget(data: BillsWidgetData): Promise<void> {
    const widgetData: WidgetData = {
      type: 'upcoming_bills',
      lastUpdated: new Date().toISOString(),
      data,
    };

    await this.saveWidgetData('upcoming_bills', widgetData);
    await this.notifyWidgetUpdate('upcoming_bills');
  }

  /**
   * Update net worth widget data
   */
  async updateNetWorthWidget(data: NetWorthWidgetData): Promise<void> {
    const widgetData: WidgetData = {
      type: 'net_worth',
      lastUpdated: new Date().toISOString(),
      data,
    };

    await this.saveWidgetData('net_worth', widgetData);
    await this.notifyWidgetUpdate('net_worth');
  }

  /**
   * Refresh all widget data from API
   */
  async refreshAllWidgets(
    userId: string,
    apiClient: WidgetApiClient
  ): Promise<void> {
    try {
      // Fetch all data in parallel
      const [creditScore, budget, bills, netWorth] = await Promise.all([
        apiClient.fetchCreditScore(userId).catch(() => null),
        apiClient.fetchBudgetSummary(userId).catch(() => null),
        apiClient.fetchUpcomingBills(userId).catch(() => null),
        apiClient.fetchNetWorth(userId).catch(() => null),
      ]);

      if (creditScore) await this.updateCreditScoreWidget(creditScore);
      if (budget) await this.updateBudgetWidget(budget);
      if (bills) await this.updateBillsWidget(bills);
      if (netWorth) await this.updateNetWorthWidget(netWorth);
    } catch (error) {
      if (__DEV__) console.error('Failed to refresh widgets:', error);
    }
  }

  /**
   * Get widget configuration
   */
  async getWidgetConfigs(): Promise<WidgetConfig[]> {
    try {
      const stored = await AsyncStorage.getItem(WIDGET_CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to get widget configs:', error);
    }
    return this.getDefaultConfigs();
  }

  /**
   * Update widget configuration
   */
  async updateWidgetConfig(config: WidgetConfig): Promise<void> {
    try {
      const configs = await this.getWidgetConfigs();
      const index = configs.findIndex((c) => c.widgetId === config.widgetId);

      if (index >= 0) {
        configs[index] = config;
      } else {
        configs.push(config);
      }

      await AsyncStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(configs));
    } catch (error) {
      if (__DEV__) console.error('Failed to update widget config:', error);
    }
  }

  /**
   * Get default widget configurations
   */
  private getDefaultConfigs(): WidgetConfig[] {
    return [
      {
        widgetId: 'credit_score_small',
        type: 'credit_score',
        size: 'small',
        refreshInterval: DEFAULT_REFRESH_INTERVALS.credit_score,
        isEnabled: true,
        position: 0,
      },
      {
        widgetId: 'budget_medium',
        type: 'budget_overview',
        size: 'medium',
        refreshInterval: DEFAULT_REFRESH_INTERVALS.budget_overview,
        isEnabled: true,
        position: 1,
      },
      {
        widgetId: 'bills_small',
        type: 'upcoming_bills',
        size: 'small',
        refreshInterval: DEFAULT_REFRESH_INTERVALS.upcoming_bills,
        isEnabled: true,
        position: 2,
      },
      {
        widgetId: 'net_worth_small',
        type: 'net_worth',
        size: 'small',
        refreshInterval: DEFAULT_REFRESH_INTERVALS.net_worth,
        isEnabled: false,
        position: 3,
      },
    ];
  }

  /**
   * Save widget data to storage
   */
  private async saveWidgetData(
    type: WidgetType,
    data: WidgetData
  ): Promise<void> {
    this.cachedData.set(type, data);

    try {
      const allData: Record<string, WidgetData> = {};
      for (const [key, value] of this.cachedData) {
        allData[key] = value;
      }
      await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      if (__DEV__) console.error('Failed to save widget data:', error);
    }
  }

  /**
   * Notify native widget of data update
   * This would use a native module in a real implementation
   */
  private async notifyWidgetUpdate(type: WidgetType): Promise<void> {
    // In a real implementation, this would call native code to refresh widgets
    // For iOS: WidgetCenter.shared.reloadTimelines(ofKind: type)
    // For Android: AppWidgetManager.notifyAppWidgetViewDataChanged()
    if (__DEV__) {
      console.log(`Widget update notification sent for: ${type}`);
    }
  }

  /**
   * Format credit score for display
   */
  formatCreditScore(score: number): {
    display: string;
    rating: string;
    color: string;
  } {
    let rating: string;
    let color: string;

    if (score >= 800) {
      rating = 'Excellent';
      color = '#10B981'; // green
    } else if (score >= 740) {
      rating = 'Very Good';
      color = '#22C55E'; // light green
    } else if (score >= 670) {
      rating = 'Good';
      color = '#84CC16'; // lime
    } else if (score >= 580) {
      rating = 'Fair';
      color = '#EAB308'; // yellow
    } else {
      rating = 'Poor';
      color = '#EF4444'; // red
    }

    return {
      display: score.toString(),
      rating,
      color,
    };
  }

  /**
   * Format currency for widget display
   */
  formatCurrency(amount: number, compact: boolean = false): string {
    if (compact && Math.abs(amount) >= 1000) {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      });
      return formatter.format(amount);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Get time until next refresh
   */
  getTimeUntilRefresh(lastUpdated: string, refreshInterval: number): number {
    const lastUpdate = new Date(lastUpdated).getTime();
    const now = Date.now();
    const nextRefresh = lastUpdate + refreshInterval * 60 * 1000;
    return Math.max(0, nextRefresh - now);
  }
}

// ============================================================================
// API CLIENT INTERFACE
// ============================================================================

export interface WidgetApiClient {
  fetchCreditScore(userId: string): Promise<CreditScoreWidgetData>;
  fetchBudgetSummary(userId: string): Promise<BudgetWidgetData>;
  fetchUpcomingBills(userId: string): Promise<BillsWidgetData>;
  fetchNetWorth(userId: string): Promise<NetWorthWidgetData>;
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const widgetService = new WidgetService();
export default widgetService;
