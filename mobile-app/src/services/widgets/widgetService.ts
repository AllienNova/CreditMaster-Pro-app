/**
 * Fynvita Widget Service
 * Provides data for iOS and Android home screen widgets
 * Updates widget data when app state changes
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, NativeModules } from "react-native";

// Storage key for widget data
const WIDGET_DATA_KEY = "@fynvita_widget_data";

// Widget data interface
export interface WidgetData {
  // Credit Score Widget
  creditScore: {
    score: number;
    trend: "up" | "down" | "stable";
    change: number;
    lastUpdated: string;
  };

  // Financial Summary Widget
  financialSummary: {
    netWorth: number;
    monthlySpending: number;
    savingsRate: number;
    lastUpdated: string;
  };

  // Investment Widget
  investments: {
    portfolioValue: number;
    dayChange: number;
    dayChangePercent: number;
    lastUpdated: string;
  };

  // Quick Actions Widget
  quickActions: {
    pendingDisputes: number;
    unreadNotifications: number;
    upcomingBills: number;
  };

  // Goals Progress Widget
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
  }>;
}

// Default widget data
const DEFAULT_WIDGET_DATA: WidgetData = {
  creditScore: {
    score: 0,
    trend: "stable",
    change: 0,
    lastUpdated: new Date().toISOString(),
  },
  financialSummary: {
    netWorth: 0,
    monthlySpending: 0,
    savingsRate: 0,
    lastUpdated: new Date().toISOString(),
  },
  investments: {
    portfolioValue: 0,
    dayChange: 0,
    dayChangePercent: 0,
    lastUpdated: new Date().toISOString(),
  },
  quickActions: {
    pendingDisputes: 0,
    unreadNotifications: 0,
    upcomingBills: 0,
  },
  goals: [],
};

/**
 * Widget Service
 * Manages data for home screen widgets on both iOS and Android
 */
class WidgetService {
  private widgetData: WidgetData = DEFAULT_WIDGET_DATA;
  private isInitialized = false;

  /**
   * Initialize the widget service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const storedData = await AsyncStorage.getItem(WIDGET_DATA_KEY);
      if (storedData) {
        this.widgetData = JSON.parse(storedData);
      }
      this.isInitialized = true;
    } catch (error) {
      if (__DEV__) console.error("Failed to initialize widget service:", error);
    }
  }

  /**
   * Get current widget data
   */
  async getWidgetData(): Promise<WidgetData> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.widgetData;
  }

  /**
   * Update credit score widget data
   */
  async updateCreditScore(
    data: Partial<WidgetData["creditScore"]>,
  ): Promise<void> {
    this.widgetData.creditScore = {
      ...this.widgetData.creditScore,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    await this.saveAndNotify();
  }

  /**
   * Update financial summary widget data
   */
  async updateFinancialSummary(
    data: Partial<WidgetData["financialSummary"]>,
  ): Promise<void> {
    this.widgetData.financialSummary = {
      ...this.widgetData.financialSummary,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    await this.saveAndNotify();
  }

  /**
   * Update investments widget data
   */
  async updateInvestments(
    data: Partial<WidgetData["investments"]>,
  ): Promise<void> {
    this.widgetData.investments = {
      ...this.widgetData.investments,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    await this.saveAndNotify();
  }

  /**
   * Update quick actions widget data
   */
  async updateQuickActions(
    data: Partial<WidgetData["quickActions"]>,
  ): Promise<void> {
    this.widgetData.quickActions = {
      ...this.widgetData.quickActions,
      ...data,
    };
    await this.saveAndNotify();
  }

  /**
   * Update goals widget data
   */
  async updateGoals(goals: WidgetData["goals"]): Promise<void> {
    this.widgetData.goals = goals.map((goal) => ({
      ...goal,
      progress: Math.min(
        100,
        Math.round((goal.currentAmount / goal.targetAmount) * 100),
      ),
    }));
    await this.saveAndNotify();
  }

  /**
   * Save data and notify native widget to refresh
   */
  private async saveAndNotify(): Promise<void> {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(
        WIDGET_DATA_KEY,
        JSON.stringify(this.widgetData),
      );

      // Notify native widget to refresh
      await this.refreshNativeWidget();
    } catch (error) {
      if (__DEV__) console.error("Failed to save widget data:", error);
    }
  }

  /**
   * Refresh native widget
   * This triggers widget refresh on iOS/Android
   */
  private async refreshNativeWidget(): Promise<void> {
    try {
      if (Platform.OS === "ios") {
        // iOS WidgetKit refresh
        // Requires native module integration
        if (NativeModules.WidgetKit) {
          NativeModules.WidgetKit.reloadAllTimelines();
        }
      } else if (Platform.OS === "android") {
        // Android AppWidget refresh
        // Requires native module integration
        if (NativeModules.AppWidgetModule) {
          NativeModules.AppWidgetModule.requestUpdate();
        }
      }
    } catch (error) {
      // Widget refresh is optional, don't throw
      if (__DEV__) {
        console.log("Widget refresh not available:", error);
      }
    }
  }

  /**
   * Format currency for widget display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format percentage for widget display
   */
  formatPercent(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  /**
   * Get score color based on value
   */
  getScoreColor(score: number): string {
    if (score >= 750) return "#22C55E"; // Excellent - Green
    if (score >= 700) return "#84CC16"; // Good - Lime
    if (score >= 650) return "#EAB308"; // Fair - Yellow
    if (score >= 600) return "#F97316"; // Poor - Orange
    return "#EF4444"; // Very Poor - Red
  }

  /**
   * Get score label based on value
   */
  getScoreLabel(score: number): string {
    if (score >= 750) return "Excellent";
    if (score >= 700) return "Good";
    if (score >= 650) return "Fair";
    if (score >= 600) return "Poor";
    return "Very Poor";
  }

  /**
   * Clear all widget data
   */
  async clearWidgetData(): Promise<void> {
    this.widgetData = DEFAULT_WIDGET_DATA;
    await AsyncStorage.removeItem(WIDGET_DATA_KEY);
    await this.refreshNativeWidget();
  }

  /**
   * Get data formatted for a specific widget type
   */
  async getFormattedWidgetData(widgetType: keyof WidgetData): Promise<unknown> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    switch (widgetType) {
      case "creditScore":
        return {
          ...this.widgetData.creditScore,
          formattedScore: this.widgetData.creditScore.score.toString(),
          scoreColor: this.getScoreColor(this.widgetData.creditScore.score),
          scoreLabel: this.getScoreLabel(this.widgetData.creditScore.score),
        };

      case "financialSummary":
        return {
          ...this.widgetData.financialSummary,
          formattedNetWorth: this.formatCurrency(
            this.widgetData.financialSummary.netWorth,
          ),
          formattedSpending: this.formatCurrency(
            this.widgetData.financialSummary.monthlySpending,
          ),
          formattedSavingsRate: `${this.widgetData.financialSummary.savingsRate}%`,
        };

      case "investments":
        return {
          ...this.widgetData.investments,
          formattedValue: this.formatCurrency(
            this.widgetData.investments.portfolioValue,
          ),
          formattedChange: this.formatCurrency(
            this.widgetData.investments.dayChange,
          ),
          formattedPercent: this.formatPercent(
            this.widgetData.investments.dayChangePercent,
          ),
          isPositive: this.widgetData.investments.dayChange >= 0,
        };

      default:
        return this.widgetData[widgetType];
    }
  }
}

export const widgetService = new WidgetService();
export default widgetService;
