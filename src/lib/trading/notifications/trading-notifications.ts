/**
 * Trading Notifications Service
 *
 * Handles notifications for trading events:
 * - Signal alerts
 * - Order fills
 * - Position updates
 * - Risk warnings
 * - ISE rotation events
 */

// ============================================================================
// TYPES
// ============================================================================

export type TradingNotificationType =
  | 'signal_new'
  | 'signal_triggered'
  | 'order_filled'
  | 'order_partial'
  | 'order_rejected'
  | 'position_stop_hit'
  | 'position_target_hit'
  | 'risk_warning'
  | 'risk_critical'
  | 'ise_rotation'
  | 'kill_switch';

export interface TradingNotification {
  id: string;
  type: TradingNotificationType;
  title: string;
  message: string;
  symbol?: string;
  data?: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  enableSignalAlerts: boolean;
  enableOrderAlerts: boolean;
  enableRiskAlerts: boolean;
  enableISEAlerts: boolean;
  minSignalConfidence: number;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enableSignalAlerts: true,
  enableOrderAlerts: true,
  enableRiskAlerts: true,
  enableISEAlerts: true,
  minSignalConfidence: 0.7,
  pushEnabled: true,
  emailEnabled: false,
  soundEnabled: true,
};

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

const NOTIFICATION_TEMPLATES: Record<
  TradingNotificationType,
  {
    title: (data: Record<string, unknown>) => string;
    message: (data: Record<string, unknown>) => string;
    priority: TradingNotification['priority'];
  }
> = {
  signal_new: {
    title: (d) => `New Signal: ${d.symbol}`,
    message: (d) =>
      `${d.side === 'long' ? 'Long' : 'Short'} signal with ${((d.confidence as number) * 100).toFixed(0)}% confidence`,
    priority: 'medium',
  },
  signal_triggered: {
    title: (d) => `Signal Triggered: ${d.symbol}`,
    message: (d) =>
      `${d.side === 'long' ? 'Buy' : 'Sell'} signal executed at $${d.price}`,
    priority: 'high',
  },
  order_filled: {
    title: (d) => `Order Filled: ${d.symbol}`,
    message: (d) =>
      `${d.side} ${d.quantity} shares at $${(d.price as number).toFixed(2)}`,
    priority: 'high',
  },
  order_partial: {
    title: (d) => `Partial Fill: ${d.symbol}`,
    message: (d) =>
      `${d.filledQty}/${d.quantity} shares filled at $${(d.price as number).toFixed(2)}`,
    priority: 'medium',
  },
  order_rejected: {
    title: (d) => `Order Rejected: ${d.symbol}`,
    message: (d) => `Reason: ${d.reason || 'Unknown'}`,
    priority: 'high',
  },
  position_stop_hit: {
    title: (d) => `Stop Loss Hit: ${d.symbol}`,
    message: (d) =>
      `Position closed at $${d.price}. P&L: ${(d.pnl as number) >= 0 ? '+' : ''}$${(d.pnl as number).toFixed(2)}`,
    priority: 'high',
  },
  position_target_hit: {
    title: (d) => `Target Hit: ${d.symbol}`,
    message: (d) =>
      `Take profit triggered at $${d.price}. P&L: +$${(d.pnl as number).toFixed(2)}`,
    priority: 'high',
  },
  risk_warning: {
    title: () => 'Risk Warning',
    message: (d) => `${d.message || 'Portfolio risk elevated'}`,
    priority: 'high',
  },
  risk_critical: {
    title: () => 'Critical Risk Alert',
    message: (d) => `${d.message || 'Immediate attention required'}`,
    priority: 'critical',
  },
  ise_rotation: {
    title: () => 'Instrument Rotation',
    message: (d) =>
      `${d.added ? `Added: ${d.added}` : ''} ${d.removed ? `Removed: ${d.removed}` : ''}`,
    priority: 'low',
  },
  kill_switch: {
    title: () => 'Kill Switch Activated',
    message: (d) => `Trading halted: ${d.reason || 'Manual activation'}`,
    priority: 'critical',
  },
};

// ============================================================================
// TRADING NOTIFICATIONS SERVICE
// ============================================================================

export class TradingNotificationService {
  private preferences: NotificationPreferences;
  private notifications: TradingNotification[] = [];
  private listeners: Set<(notification: TradingNotification) => void> =
    new Set();
  private maxNotifications = 100;

  constructor(preferences: Partial<NotificationPreferences> = {}) {
    this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...preferences };
  }

  // Create notification
  createNotification(
    type: TradingNotificationType,
    data: Record<string, unknown> = {}
  ): TradingNotification | null {
    // Check preferences
    if (!this.shouldNotify(type, data)) {
      return null;
    }

    const template = NOTIFICATION_TEMPLATES[type];

    const notification: TradingNotification = {
      id: `TN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      title: template.title(data),
      message: template.message(data),
      symbol: data.symbol as string | undefined,
      data,
      priority: template.priority,
      timestamp: new Date(),
      read: false,
      actionUrl: this.getActionUrl(type, data),
    };

    // Add to list
    this.notifications.unshift(notification);

    // Trim if too many
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Notify listeners
    this.notifyListeners(notification);

    // Send push if enabled
    if (this.preferences.pushEnabled && notification.priority !== 'low') {
      this.sendPushNotification(notification);
    }

    return notification;
  }

  // Check if should notify based on preferences
  private shouldNotify(
    type: TradingNotificationType,
    data: Record<string, unknown>
  ): boolean {
    // Signal alerts
    if (type.startsWith('signal_')) {
      if (!this.preferences.enableSignalAlerts) return false;
      if (
        data.confidence &&
        (data.confidence as number) < this.preferences.minSignalConfidence
      ) {
        return false;
      }
    }

    // Order alerts
    if (type.startsWith('order_') && !this.preferences.enableOrderAlerts) {
      return false;
    }

    // Risk alerts
    if (type.startsWith('risk_') && !this.preferences.enableRiskAlerts) {
      return false;
    }

    // ISE alerts
    if (type === 'ise_rotation' && !this.preferences.enableISEAlerts) {
      return false;
    }

    return true;
  }

  // Get action URL for notification
  private getActionUrl(
    type: TradingNotificationType,
    data: Record<string, unknown>
  ): string | undefined {
    switch (type) {
      case 'signal_new':
      case 'signal_triggered':
        return data.symbol ? `/trading?symbol=${data.symbol}` : '/trading';
      case 'order_filled':
      case 'order_partial':
      case 'order_rejected':
        return '/trading?tab=orders';
      case 'position_stop_hit':
      case 'position_target_hit':
        return '/trading?tab=positions';
      case 'risk_warning':
      case 'risk_critical':
      case 'kill_switch':
        return '/trading?tab=risk';
      case 'ise_rotation':
        return '/trading/radar';
      default:
        return '/trading';
    }
  }

  // Send push notification
  private async sendPushNotification(
    notification: TradingNotification
  ): Promise<void> {
    if (!('Notification' in globalThis)) return;

    try {
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/trading-icon.png',
          tag: notification.id,
          requireInteraction: notification.priority === 'critical',
        });
      }
    } catch (_error) {
      // TradingNotifications error: Failed to send push notification
      void _error;
    }
  }

  // Subscribe to notifications
  subscribe(callback: (notification: TradingNotification) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  private notifyListeners(notification: TradingNotification): void {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (_error) {
        // TradingNotifications error: Notification listener error
        void _error;
      }
    });
  }

  // Get all notifications
  getNotifications(): TradingNotification[] {
    return [...this.notifications];
  }

  // Get unread notifications
  getUnreadNotifications(): TradingNotification[] {
    return this.notifications.filter((n) => !n.read);
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  // Mark as read
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(
      (n) => n.id === notificationId
    );
    if (notification) {
      notification.read = true;
    }
  }

  // Mark all as read
  markAllAsRead(): void {
    this.notifications.forEach((n) => {
      n.read = true;
    });
  }

  // Clear notifications
  clearNotifications(): void {
    this.notifications = [];
  }

  // Update preferences
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  // Get preferences
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Helper methods for common notifications
  notifyNewSignal(
    symbol: string,
    side: 'long' | 'short',
    confidence: number,
    entryPrice?: number
  ): TradingNotification | null {
    return this.createNotification('signal_new', {
      symbol,
      side,
      confidence,
      entryPrice,
    });
  }

  notifyOrderFilled(
    symbol: string,
    side: string,
    quantity: number,
    price: number
  ): TradingNotification | null {
    return this.createNotification('order_filled', {
      symbol,
      side,
      quantity,
      price,
    });
  }

  notifyStopHit(
    symbol: string,
    price: number,
    pnl: number
  ): TradingNotification | null {
    return this.createNotification('position_stop_hit', { symbol, price, pnl });
  }

  notifyTargetHit(
    symbol: string,
    price: number,
    pnl: number
  ): TradingNotification | null {
    return this.createNotification('position_target_hit', {
      symbol,
      price,
      pnl,
    });
  }

  notifyRiskWarning(
    message: string,
    metrics?: Record<string, number>
  ): TradingNotification | null {
    return this.createNotification('risk_warning', { message, ...metrics });
  }

  notifyKillSwitch(reason: string): TradingNotification | null {
    return this.createNotification('kill_switch', { reason });
  }

  notifyRotation(
    added?: string[],
    removed?: string[]
  ): TradingNotification | null {
    return this.createNotification('ise_rotation', {
      added: added?.join(', '),
      removed: removed?.join(', '),
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let tradingNotificationServiceInstance: TradingNotificationService | null =
  null;

export function getTradingNotificationService(
  preferences?: Partial<NotificationPreferences>
): TradingNotificationService {
  if (!tradingNotificationServiceInstance) {
    tradingNotificationServiceInstance = new TradingNotificationService(
      preferences
    );
  }
  return tradingNotificationServiceInstance;
}

export function createTradingNotificationService(
  preferences?: Partial<NotificationPreferences>
): TradingNotificationService {
  return new TradingNotificationService(preferences);
}
