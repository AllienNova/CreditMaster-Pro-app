/**
 * Smart Alert Service
 *
 * Provides intelligent notification delivery with:
 * - Quiet hours configuration per user
 * - Notification batching (group similar alerts)
 * - Priority-based delivery (urgent bypasses quiet hours)
 * - Weekly digest email generation
 * - Smart grouping by category
 *
 * @module SmartAlertService
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertPriority = "urgent" | "high" | "normal" | "low";

export type AlertCategory =
  | "credit_score"
  | "dispute"
  | "payment"
  | "security"
  | "trading"
  | "savings"
  | "budget"
  | "goal"
  | "bill"
  | "system";

export interface QuietHoursConfig {
  enabled: boolean;
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number; // 0-23
  endMinute: number; // 0-59
  timezone: string; // IANA timezone
}

export interface SmartAlertPreferences {
  userId: string;
  quietHours: QuietHoursConfig;
  batchingEnabled: boolean;
  batchIntervalMinutes: number;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: number; // 0=Sunday, 6=Saturday
  weeklyDigestHour: number; // 0-23
  priorityOverrides: Record<AlertCategory, AlertPriority>;
}

export interface SmartAlert {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: AlertCategory;
  priority: AlertPriority;
  data?: Record<string, unknown>;
  createdAt: Date;
  scheduledAt?: Date;
  deliveredAt?: Date;
  batchId?: string;
  status: AlertStatus;
}

export type AlertStatus =
  | "pending"
  | "queued"
  | "batched"
  | "delivered"
  | "deferred"
  | "failed";

export interface AlertBatch {
  id: string;
  userId: string;
  alerts: SmartAlert[];
  category: AlertCategory;
  createdAt: Date;
  deliveredAt?: Date;
}

export interface WeeklyDigest {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  sections: DigestSection[];
  generatedAt: Date;
}

export interface DigestSection {
  category: AlertCategory;
  title: string;
  items: DigestItem[];
  summary: string;
}

export interface DigestItem {
  title: string;
  message: string;
  timestamp: Date;
  actionUrl?: string;
}

export interface DeliveryResult {
  alertId: string;
  delivered: boolean;
  deferred: boolean;
  batchId?: string;
  reason?: string;
}

// ── Default Preferences ──────────────────────────────────────────────────────

const DEFAULT_QUIET_HOURS: QuietHoursConfig = {
  enabled: false,
  startHour: 22,
  startMinute: 0,
  endHour: 8,
  endMinute: 0,
  timezone: "America/New_York",
};

const DEFAULT_PREFERENCES: Omit<SmartAlertPreferences, "userId"> = {
  quietHours: DEFAULT_QUIET_HOURS,
  batchingEnabled: true,
  batchIntervalMinutes: 15,
  weeklyDigestEnabled: true,
  weeklyDigestDay: 1, // Monday
  weeklyDigestHour: 9, // 9 AM
  priorityOverrides: {
    credit_score: "high",
    dispute: "high",
    payment: "high",
    security: "urgent",
    trading: "normal",
    savings: "normal",
    budget: "normal",
    goal: "low",
    bill: "high",
    system: "normal",
  },
};

// ── Helper Functions ─────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Check if the current time falls within quiet hours.
 * Supports cross-midnight ranges (e.g. 22:00 – 08:00).
 */
export function isInQuietHours(
  config: QuietHoursConfig,
  now?: Date,
): boolean {
  if (!config.enabled) return false;

  const currentTime = now ?? new Date();

  // Build minutes-from-midnight for current time in the user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(currentTime);
  const hour = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );
  const currentMinutes = hour * 60 + minute;

  const startMinutes = config.startHour * 60 + config.startMinute;
  const endMinutes = config.endHour * 60 + config.endMinute;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g. 08:00 – 18:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Cross-midnight range (e.g. 22:00 – 08:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/**
 * Calculate the next time outside quiet hours.
 * Returns null if quiet hours are disabled.
 */
export function getNextDeliveryTime(
  config: QuietHoursConfig,
  now?: Date,
): Date | null {
  if (!config.enabled) return null;
  if (!isInQuietHours(config, now)) return null;

  const currentTime = now ?? new Date();
  const result = new Date(currentTime);

  // Set to the end hour/minute on the same or next day
  result.setHours(config.endHour, config.endMinute, 0, 0);
  if (result <= currentTime) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

/**
 * Determine the effective priority for an alert based on user overrides.
 */
function getEffectivePriority(
  alert: Pick<SmartAlert, "priority" | "category">,
  prefs: SmartAlertPreferences,
): AlertPriority {
  const override = prefs.priorityOverrides[alert.category];
  if (!override) return alert.priority;

  // Use whichever is higher priority
  const levels: Record<AlertPriority, number> = {
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  };
  return levels[alert.priority] >= levels[override]
    ? alert.priority
    : override;
}

// ── Service ──────────────────────────────────────────────────────────────────

class SmartAlertService {
  private readonly preferences: Map<string, SmartAlertPreferences> = new Map();
  private readonly alerts: Map<string, SmartAlert[]> = new Map();
  private readonly batches: Map<string, AlertBatch> = new Map();
  private readonly pendingBatches: Map<string, Map<AlertCategory, SmartAlert[]>> =
    new Map();

  // ── Preferences Management ───────────────────────────────────────────────

  getPreferences(userId: string): SmartAlertPreferences {
    const existing = this.preferences.get(userId);
    if (existing) return existing;

    const defaults: SmartAlertPreferences = {
      userId,
      ...DEFAULT_PREFERENCES,
    };
    this.preferences.set(userId, defaults);
    return defaults;
  }

  updatePreferences(
    userId: string,
    updates: Partial<Omit<SmartAlertPreferences, "userId">>,
  ): SmartAlertPreferences {
    const current = this.getPreferences(userId);
    const updated: SmartAlertPreferences = {
      ...current,
      ...updates,
      quietHours: updates.quietHours
        ? { ...current.quietHours, ...updates.quietHours }
        : current.quietHours,
      priorityOverrides: updates.priorityOverrides
        ? { ...current.priorityOverrides, ...updates.priorityOverrides }
        : current.priorityOverrides,
    };
    this.preferences.set(userId, updated);
    return updated;
  }

  // ── Alert Delivery ─────────────────────────────────────────────────────

  /**
   * Process an incoming alert through the smart delivery pipeline:
   * 1. Determine effective priority
   * 2. Check quiet hours (urgent bypasses)
   * 3. Apply batching if enabled
   * 4. Deliver or defer
   */
  processAlert(
    userId: string,
    title: string,
    message: string,
    category: AlertCategory,
    priority: AlertPriority,
    data?: Record<string, unknown>,
  ): DeliveryResult {
    const prefs = this.getPreferences(userId);

    const alert: SmartAlert = {
      id: generateId("alert"),
      userId,
      title,
      message,
      category,
      priority,
      data,
      createdAt: new Date(),
      status: "pending",
    };

    // Store alert
    const userAlerts = this.alerts.get(userId) ?? [];
    userAlerts.push(alert);
    this.alerts.set(userId, userAlerts);

    const effectivePriority = getEffectivePriority(alert, prefs);

    // Urgent alerts always deliver immediately
    if (effectivePriority === "urgent") {
      alert.status = "delivered";
      alert.deliveredAt = new Date();
      return {
        alertId: alert.id,
        delivered: true,
        deferred: false,
      };
    }

    // Check quiet hours
    if (isInQuietHours(prefs.quietHours)) {
      const nextDelivery = getNextDeliveryTime(prefs.quietHours);
      alert.status = "deferred";
      alert.scheduledAt = nextDelivery ?? undefined;
      return {
        alertId: alert.id,
        delivered: false,
        deferred: true,
        reason: `Deferred until quiet hours end${nextDelivery ? ` at ${nextDelivery.toISOString()}` : ""}`,
      };
    }

    // Apply batching
    if (prefs.batchingEnabled && effectivePriority !== "high") {
      const batchId = this.addToBatch(userId, alert);
      alert.status = "batched";
      alert.batchId = batchId;
      return {
        alertId: alert.id,
        delivered: false,
        deferred: false,
        batchId,
        reason: `Batched for delivery in ${prefs.batchIntervalMinutes} minutes`,
      };
    }

    // Deliver immediately
    alert.status = "delivered";
    alert.deliveredAt = new Date();
    return {
      alertId: alert.id,
      delivered: true,
      deferred: false,
    };
  }

  // ── Batching ──────────────────────────────────────────────────────────

  private addToBatch(userId: string, alert: SmartAlert): string {
    let userBatches = this.pendingBatches.get(userId);
    if (!userBatches) {
      userBatches = new Map();
      this.pendingBatches.set(userId, userBatches);
    }

    let categoryAlerts = userBatches.get(alert.category);
    if (!categoryAlerts) {
      categoryAlerts = [];
      userBatches.set(alert.category, categoryAlerts);
    }

    categoryAlerts.push(alert);

    // Generate a batch ID based on user + category
    return `batch_${userId}_${alert.category}`;
  }

  /**
   * Flush all pending batches for a user, creating AlertBatch records.
   * Returns the number of batches delivered.
   */
  flushBatches(userId: string): AlertBatch[] {
    const userBatches = this.pendingBatches.get(userId);
    if (!userBatches || userBatches.size === 0) return [];

    const flushed: AlertBatch[] = [];

    for (const [category, alerts] of userBatches) {
      if (alerts.length === 0) continue;

      const batch: AlertBatch = {
        id: generateId("batch"),
        userId,
        alerts: [...alerts],
        category,
        createdAt: new Date(),
        deliveredAt: new Date(),
      };

      // Mark all alerts as delivered
      for (const alert of alerts) {
        alert.status = "delivered";
        alert.deliveredAt = new Date();
        alert.batchId = batch.id;
      }

      this.batches.set(batch.id, batch);
      flushed.push(batch);
    }

    // Clear pending batches
    this.pendingBatches.delete(userId);

    return flushed;
  }

  /**
   * Get pending batch count for a user.
   */
  getPendingBatchCount(userId: string): number {
    const userBatches = this.pendingBatches.get(userId);
    if (!userBatches) return 0;

    let count = 0;
    for (const alerts of userBatches.values()) {
      count += alerts.length;
    }
    return count;
  }

  // ── Weekly Digest ──────────────────────────────────────────────────────

  /**
   * Generate a weekly digest for a user.
   * Aggregates all alerts from the past 7 days into categorized sections.
   */
  generateWeeklyDigest(userId: string, now?: Date): WeeklyDigest | null {
    const prefs = this.getPreferences(userId);
    if (!prefs.weeklyDigestEnabled) return null;

    const currentTime = now ?? new Date();
    const weekStart = new Date(currentTime);
    weekStart.setDate(weekStart.getDate() - 7);

    const userAlerts = this.alerts.get(userId) ?? [];
    const weekAlerts = userAlerts.filter(
      (a) => a.createdAt >= weekStart && a.createdAt <= currentTime,
    );

    if (weekAlerts.length === 0) {
      return {
        userId,
        weekStart,
        weekEnd: currentTime,
        sections: [],
        generatedAt: currentTime,
      };
    }

    // Group by category
    const grouped = new Map<AlertCategory, SmartAlert[]>();
    for (const alert of weekAlerts) {
      const existing = grouped.get(alert.category) ?? [];
      existing.push(alert);
      grouped.set(alert.category, existing);
    }

    const sections: DigestSection[] = [];
    for (const [category, alerts] of grouped) {
      sections.push({
        category,
        title: formatCategoryTitle(category),
        items: alerts.map((a) => ({
          title: a.title,
          message: a.message,
          timestamp: a.createdAt,
          actionUrl: a.data?.actionUrl as string | undefined,
        })),
        summary: `${alerts.length} alert${alerts.length !== 1 ? "s" : ""} this week`,
      });
    }

    // Sort sections by number of alerts (highest first)
    sections.sort((a, b) => b.items.length - a.items.length);

    return {
      userId,
      weekStart,
      weekEnd: currentTime,
      sections,
      generatedAt: currentTime,
    };
  }

  // ── Query ─────────────────────────────────────────────────────────────

  getAlerts(userId: string, options?: {
    category?: AlertCategory;
    status?: AlertStatus;
    since?: Date;
    limit?: number;
  }): SmartAlert[] {
    let userAlerts = this.alerts.get(userId) ?? [];

    if (options?.category) {
      userAlerts = userAlerts.filter((a) => a.category === options.category);
    }
    if (options?.status) {
      userAlerts = userAlerts.filter((a) => a.status === options.status);
    }
    if (options?.since) {
      userAlerts = userAlerts.filter((a) => a.createdAt >= options.since!);
    }

    // Sort by created date, newest first
    userAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      userAlerts = userAlerts.slice(0, options.limit);
    }

    return userAlerts;
  }

  getAlertById(alertId: string): SmartAlert | null {
    for (const alerts of this.alerts.values()) {
      const found = alerts.find((a) => a.id === alertId);
      if (found) return found;
    }
    return null;
  }

  getBatch(batchId: string): AlertBatch | null {
    return this.batches.get(batchId) ?? null;
  }

  /**
   * Get deferred alerts that are ready for delivery.
   */
  getDeferredAlertsReady(userId: string, now?: Date): SmartAlert[] {
    const currentTime = now ?? new Date();
    const userAlerts = this.alerts.get(userId) ?? [];

    return userAlerts.filter(
      (a) =>
        a.status === "deferred" &&
        a.scheduledAt &&
        a.scheduledAt <= currentTime,
    );
  }

  /**
   * Deliver a deferred alert.
   */
  deliverDeferredAlert(alertId: string): boolean {
    const alert = this.getAlertById(alertId);
    if (!alert || alert.status !== "deferred") return false;

    alert.status = "delivered";
    alert.deliveredAt = new Date();
    return true;
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  getAlertStats(userId: string): {
    total: number;
    delivered: number;
    deferred: number;
    batched: number;
    pending: number;
    byCategory: Record<string, number>;
  } {
    const userAlerts = this.alerts.get(userId) ?? [];

    const byCategory: Record<string, number> = {};
    let delivered = 0;
    let deferred = 0;
    let batched = 0;
    let pending = 0;

    for (const alert of userAlerts) {
      byCategory[alert.category] = (byCategory[alert.category] ?? 0) + 1;
      if (alert.status === "delivered") delivered++;
      else if (alert.status === "deferred") deferred++;
      else if (alert.status === "batched") batched++;
      else if (alert.status === "pending") pending++;
    }

    return {
      total: userAlerts.length,
      delivered,
      deferred,
      batched,
      pending,
      byCategory,
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCategoryTitle(category: AlertCategory): string {
  const titles: Record<AlertCategory, string> = {
    credit_score: "Credit Score Updates",
    dispute: "Dispute Activity",
    payment: "Payment Alerts",
    security: "Security Notifications",
    trading: "Trading Activity",
    savings: "Savings Updates",
    budget: "Budget Alerts",
    goal: "Goal Progress",
    bill: "Bill Reminders",
    system: "System Notifications",
  };
  return titles[category];
}

// ── Export Singleton ─────────────────────────────────────────────────────────

export const smartAlertService = new SmartAlertService();
export default smartAlertService;
