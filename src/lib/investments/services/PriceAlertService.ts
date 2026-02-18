/**
 * Price Alert Service
 *
 * Comprehensive alert system for investment monitoring:
 * - Price level alerts (above/below)
 * - Percentage change alerts
 * - Volume spike detection
 * - Technical indicator crossover alerts
 * - Browser notifications support
 */

// ============================================================================
// TYPES
// ============================================================================

export type AlertType =
  | "price_above"
  | "price_below"
  | "percent_change"
  | "volume_spike"
  | "indicator_crossover"
  | "pattern_detected";

export type AlertStatus = "active" | "triggered" | "expired" | "disabled";
export type AlertPriority = "low" | "medium" | "high" | "critical";

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  type: AlertType;
  status: AlertStatus;
  priority: AlertPriority;
  condition: AlertCondition;
  message?: string;
  notificationSent: boolean;
  triggeredAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
  repeatEnabled: boolean;
  cooldownMinutes: number;
  lastNotifiedAt?: Date;
}

export interface AlertCondition {
  // Price alerts
  targetPrice?: number;
  direction?: "above" | "below";

  // Percentage change
  percentChange?: number;
  timeframeMins?: number;

  // Volume alerts
  volumeMultiplier?: number;
  avgVolumePeriod?: number;

  // Indicator crossover
  indicatorType?: string;
  indicatorPeriod?: number;
  crossoverType?: "bullish" | "bearish";

  // Pattern alerts
  patternType?: string;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  symbol: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: AlertPriority;
  data?: Record<string, any>;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  triggeredToday: number;
  bySymbol: Record<string, number>;
  byType: Record<AlertType, number>;
}

// ============================================================================
// ALERT SERVICE CLASS
// ============================================================================

export class PriceAlertService {
  private alerts: Map<string, PriceAlert> = new Map();
  private notifications: AlertNotification[] = [];
  private subscribers: Map<string, Set<(alert: PriceAlert) => void>> =
    new Map();
  private checkIntervalId?: NodeJS.Timeout;
  private notificationPermission: NotificationPermission = "default";

  constructor() {
    this.requestNotificationPermission();
  }

  // ============================================================================
  // NOTIFICATION PERMISSION
  // ============================================================================

  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      this.notificationPermission = "granted";
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission === "granted";
    }

    return false;
  }

  // ============================================================================
  // ALERT CRUD OPERATIONS
  // ============================================================================

  createAlert(
    params: Omit<
      PriceAlert,
      "id" | "createdAt" | "status" | "notificationSent"
    >,
  ): PriceAlert {
    const alert: PriceAlert = {
      ...params,
      id: this.generateId(),
      status: "active",
      notificationSent: false,
      createdAt: new Date(),
    };

    this.alerts.set(alert.id, alert);
    this.persistAlerts();
    return alert;
  }

  getAlert(id: string): PriceAlert | undefined {
    return this.alerts.get(id);
  }

  getAlertsBySymbol(symbol: string): PriceAlert[] {
    return Array.from(this.alerts.values()).filter((a) => a.symbol === symbol);
  }

  getAlertsByUser(userId: string): PriceAlert[] {
    return Array.from(this.alerts.values()).filter((a) => a.userId === userId);
  }

  getActiveAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(
      (a) => a.status === "active",
    );
  }

  updateAlert(id: string, updates: Partial<PriceAlert>): PriceAlert | null {
    const alert = this.alerts.get(id);
    if (!alert) return null;

    const updated = { ...alert, ...updates };
    this.alerts.set(id, updated);
    this.persistAlerts();
    return updated;
  }

  deleteAlert(id: string): boolean {
    const result = this.alerts.delete(id);
    if (result) this.persistAlerts();
    return result;
  }

  // ============================================================================
  // ALERT CHECKING
  // ============================================================================

  checkPriceAlert(
    alert: PriceAlert,
    currentPrice: number,
    previousPrice?: number,
  ): boolean {
    if (alert.status !== "active") return false;
    if (alert.expiresAt && new Date() > alert.expiresAt) {
      this.updateAlert(alert.id, { status: "expired" });
      return false;
    }

    // Check cooldown
    if (alert.lastNotifiedAt && alert.cooldownMinutes > 0) {
      const cooldownEnd = new Date(
        alert.lastNotifiedAt.getTime() + alert.cooldownMinutes * 60000,
      );
      if (new Date() < cooldownEnd) return false;
    }

    const { condition } = alert;
    let triggered = false;

    switch (alert.type) {
      case "price_above":
        triggered =
          condition.targetPrice !== undefined &&
          currentPrice >= condition.targetPrice;
        break;

      case "price_below":
        triggered =
          condition.targetPrice !== undefined &&
          currentPrice <= condition.targetPrice;
        break;

      case "percent_change":
        if (previousPrice && condition.percentChange !== undefined) {
          const change = ((currentPrice - previousPrice) / previousPrice) * 100;
          triggered = Math.abs(change) >= Math.abs(condition.percentChange);
        }
        break;
    }

    if (triggered) {
      this.triggerAlert(alert, currentPrice);
    }

    return triggered;
  }

  checkVolumeAlert(
    alert: PriceAlert,
    currentVolume: number,
    avgVolume: number,
  ): boolean {
    if (alert.type !== "volume_spike" || alert.status !== "active")
      return false;

    const { condition } = alert;
    const multiplier = condition.volumeMultiplier || 2;
    const triggered = currentVolume >= avgVolume * multiplier;

    if (triggered) {
      this.triggerAlert(alert, currentVolume, {
        avgVolume,
        multiplier: currentVolume / avgVolume,
      });
    }

    return triggered;
  }

  checkIndicatorCrossover(
    alert: PriceAlert,
    currentValue: number,
    signalValue: number,
    previousValue: number,
    previousSignal: number,
  ): boolean {
    if (alert.type !== "indicator_crossover" || alert.status !== "active")
      return false;

    const { condition } = alert;
    let triggered = false;

    if (condition.crossoverType === "bullish") {
      // Bullish crossover: value crosses above signal
      triggered = previousValue <= previousSignal && currentValue > signalValue;
    } else if (condition.crossoverType === "bearish") {
      // Bearish crossover: value crosses below signal
      triggered = previousValue >= previousSignal && currentValue < signalValue;
    }

    if (triggered) {
      this.triggerAlert(alert, currentValue, {
        signalValue,
        crossoverType: condition.crossoverType,
      });
    }

    return triggered;
  }

  // ============================================================================
  // ALERT TRIGGERING & NOTIFICATIONS
  // ============================================================================

  private triggerAlert(
    alert: PriceAlert,
    value: number,
    extraData?: Record<string, any>,
  ): void {
    const now = new Date();

    // Update alert status
    const updates: Partial<PriceAlert> = {
      triggeredAt: now,
      notificationSent: true,
      lastNotifiedAt: now,
    };

    if (!alert.repeatEnabled) {
      updates.status = "triggered";
    }

    this.updateAlert(alert.id, updates);

    // Create notification
    const notification = this.createNotification(alert, value, extraData);

    // Send browser notification
    this.sendBrowserNotification(notification);

    // Notify subscribers
    this.notifySubscribers(alert);
  }

  private createNotification(
    alert: PriceAlert,
    value: number,
    extraData?: Record<string, any>,
  ): AlertNotification {
    const notification: AlertNotification = {
      id: this.generateId(),
      alertId: alert.id,
      symbol: alert.symbol,
      title: this.getNotificationTitle(alert),
      message: this.getNotificationMessage(alert, value, extraData),
      timestamp: new Date(),
      read: false,
      priority: alert.priority,
      data: { value, ...extraData },
    };

    this.notifications.unshift(notification);
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    return notification;
  }

  private getNotificationTitle(alert: PriceAlert): string {
    const titles: Record<AlertType, string> = {
      price_above: `${alert.symbol} Price Alert ⬆️`,
      price_below: `${alert.symbol} Price Alert ⬇️`,
      percent_change: `${alert.symbol} Price Change `,
      volume_spike: `${alert.symbol} Volume Spike `,
      indicator_crossover: `${alert.symbol} Signal Alert `,
      pattern_detected: `${alert.symbol} Pattern Detected `,
    };
    return titles[alert.type];
  }

  private getNotificationMessage(
    alert: PriceAlert,
    value: number,
    extraData?: Record<string, any>,
  ): string {
    const { condition } = alert;

    switch (alert.type) {
      case "price_above":
        return `Price crossed above $${condition.targetPrice?.toFixed(2)} (Current: $${value.toFixed(2)})`;
      case "price_below":
        return `Price dropped below $${condition.targetPrice?.toFixed(2)} (Current: $${value.toFixed(2)})`;
      case "percent_change":
        return `Price changed by ${value.toFixed(2)}% in ${condition.timeframeMins} minutes`;
      case "volume_spike":
        return `Volume spike: ${extraData?.multiplier?.toFixed(1)}x average volume`;
      case "indicator_crossover":
        return `${condition.indicatorType} ${condition.crossoverType} crossover detected`;
      case "pattern_detected":
        return `${condition.patternType} pattern detected on chart`;
      default:
        return alert.message || "Alert triggered";
    }
  }

  private sendBrowserNotification(notification: AlertNotification): void {
    if (this.notificationPermission !== "granted") return;
    if (typeof window === "undefined") return;

    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/icons/alert-icon.png",
        tag: notification.id,
        requireInteraction: notification.priority === "critical",
      });
    } catch (_error) {
      // PriceAlertService error: Failed to send browser notification
      void _error;
    }
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  subscribe(symbol: string, callback: (alert: PriceAlert) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);

    return () => {
      this.subscribers.get(symbol)?.delete(callback);
    };
  }

  private notifySubscribers(alert: PriceAlert): void {
    const callbacks = this.subscribers.get(alert.symbol);
    callbacks?.forEach((cb) => {
      try {
        cb(alert);
      } catch (_error) {
        // PriceAlertService error: Alert subscriber callback error
        void _error;
      }
    });
  }

  // ============================================================================
  // NOTIFICATIONS MANAGEMENT
  // ============================================================================

  getNotifications(limit: number = 50): AlertNotification[] {
    return this.notifications.slice(0, limit);
  }

  getUnreadNotifications(): AlertNotification[] {
    return this.notifications.filter((n) => !n.read);
  }

  markNotificationRead(id: string): void {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) notification.read = true;
  }

  markAllNotificationsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
  }

  clearNotifications(): void {
    this.notifications = [];
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getAlertStats(userId: string): AlertStats {
    const userAlerts = this.getAlertsByUser(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: AlertStats = {
      totalAlerts: userAlerts.length,
      activeAlerts: userAlerts.filter((a) => a.status === "active").length,
      triggeredToday: userAlerts.filter(
        (a) => a.triggeredAt && a.triggeredAt >= today,
      ).length,
      bySymbol: {},
      byType: {} as Record<AlertType, number>,
    };

    userAlerts.forEach((alert) => {
      stats.bySymbol[alert.symbol] = (stats.bySymbol[alert.symbol] || 0) + 1;
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    });

    return stats;
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private persistAlerts(): void {
    if (typeof window === "undefined") return;
    try {
      const data = Array.from(this.alerts.values());
      localStorage.setItem("investment_alerts", JSON.stringify(data));
    } catch (_error) {
      // PriceAlertService error: Failed to persist alerts
      void _error;
    }
  }

  loadAlerts(): void {
    if (typeof window === "undefined") return;
    try {
      const data = localStorage.getItem("investment_alerts");
      if (data) {
        const alerts: PriceAlert[] = JSON.parse(data);
        alerts.forEach((alert) => {
          alert.createdAt = new Date(alert.createdAt);
          if (alert.triggeredAt)
            alert.triggeredAt = new Date(alert.triggeredAt);
          if (alert.expiresAt) alert.expiresAt = new Date(alert.expiresAt);
          if (alert.lastNotifiedAt)
            alert.lastNotifiedAt = new Date(alert.lastNotifiedAt);
          this.alerts.set(alert.id, alert);
        });
      }
    } catch (_error) {
      // PriceAlertService error: Failed to load alerts
      void _error;
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let alertServiceInstance: PriceAlertService | null = null;

export function getPriceAlertService(): PriceAlertService {
  if (!alertServiceInstance) {
    alertServiceInstance = new PriceAlertService();
    alertServiceInstance.loadAlerts();
  }
  return alertServiceInstance;
}
