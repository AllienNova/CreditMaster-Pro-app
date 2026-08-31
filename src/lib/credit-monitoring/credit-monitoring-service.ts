/**
 * Credit Monitoring Service
 *
 * Comprehensive credit monitoring system with:
 * - Real-time score tracking across all 3 bureaus
 * - Automated alerts for score changes
 * - Credit report change detection
 * - New account monitoring
 * - Inquiry tracking
 * - Fraud alert detection
 */

import { getServiceRoleClient } from "@/lib/supabase/service-role";

const supabase = getServiceRoleClient();

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

export type Bureau = "experian" | "equifax" | "transunion";

export interface CreditScore {
  id: string;
  userId: string;
  bureau: Bureau;
  score: number;
  scoreDate: Date;
  factors: ScoreFactor[];
  createdAt: Date;
}

export interface ScoreFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

export interface CreditAlert {
  id: string;
  userId: string;
  type: AlertType;
  bureau?: Bureau;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  read: boolean;
  createdAt: Date;
  data?: JsonRecord;
}

export type AlertType =
  | "score_increase"
  | "score_decrease"
  | "new_account"
  | "new_inquiry"
  | "account_closed"
  | "payment_missed"
  | "credit_limit_change"
  | "address_change"
  | "fraud_alert"
  | "identity_theft";

export interface MonitoringSettings {
  userId: string;
  experianEnabled: boolean;
  equifaxEnabled: boolean;
  transunionEnabled: boolean;
  alertPreferences: {
    scoreChanges: boolean;
    newAccounts: boolean;
    inquiries: boolean;
    addressChanges: boolean;
    fraudAlerts: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
  scoreChangeThreshold: number; // Minimum points to trigger alert
}

export interface CreditScoreHistory {
  bureau: Bureau;
  scores: Array<{
    date: Date;
    score: number;
  }>;
}

export interface CreditMonitoringDashboard {
  currentScores: {
    experian?: number;
    equifax?: number;
    transunion?: number;
  };
  averageScore: number;
  scoreChange30Days: number;
  scoreChange90Days: number;
  alerts: CreditAlert[];
  recentChanges: Array<{
    type: string;
    description: string;
    date: Date;
    bureau: Bureau;
  }>;
  history: CreditScoreHistory[];
}

class CreditMonitoringService {
  /**
   * Get current credit scores for all bureaus
   */
  async getCurrentScores(userId: string): Promise<{
    experian?: CreditScore;
    equifax?: CreditScore;
    transunion?: CreditScore;
  }> {
    try {
      const { data, error } = await supabase
        .from("credit_scores")
        .select("*")
        .eq("user_id", userId)
        .order("score_date", { ascending: false })
        .limit(3);

      if (error) throw error;

      const scores: Partial<Record<Bureau, CreditScore>> = {};
      const rows = (data ?? []) as CreditScoreRow[];
      rows.forEach((row) => {
        if (!scores[row.bureau]) {
          scores[row.bureau] = this.mapScoreRow(row);
        }
      });

      return scores;
    } catch (error) {
      // Credit monitoring error: fetching current scores
      return {};
    }
  }

  /**
   * Get credit score history for a specific bureau
   */
  async getScoreHistory(
    userId: string,
    bureau: Bureau,
    days: number = 365,
  ): Promise<CreditScoreHistory> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("credit_scores")
        .select("score, score_date")
        .eq("user_id", userId)
        .eq("bureau", bureau)
        .gte("score_date", startDate.toISOString())
        .order("score_date", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as Pick<
        CreditScoreRow,
        "score" | "score_date"
      >[];

      return {
        bureau,
        scores: rows.map((item) => ({
          date: new Date(item.score_date),
          score: item.score,
        })),
      };
    } catch (error) {
      // Credit monitoring error: fetching score history
      return { bureau, scores: [] };
    }
  }

  /**
   * Add new credit score
   */
  async addCreditScore(
    userId: string,
    bureau: Bureau,
    score: number,
    factors: ScoreFactor[],
  ): Promise<CreditScore | null> {
    try {
      // Get previous score to detect changes
      const previousScores = await this.getCurrentScores(userId);
      const previousScore = previousScores[bureau]?.score;

      // Insert new score
      const { data, error } = await supabase
        // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
        .from("credit_scores")
        .insert({
          user_id: userId,
          bureau,
          score,
          score_date: new Date().toISOString(),
          factors,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Create alert if score changed significantly.
      //
      // The score row above is already saved — a failure anywhere in this
      // block (reading settings to decide whether to alert, or creating the
      // alert itself) is a secondary side effect and must not null out that
      // already-successful result (same shape as the submitDispute fix: a
      // committed primary action must not be masked by a downstream
      // failure). getMonitoringSettings() now throws on a real fetch error
      // (see its own doc comment) rather than always degrading to defaults,
      // so it has to sit inside this same try/catch as createAlert — both
      // are best-effort steps of "attempt to raise a change alert," and
      // neither may propagate out to the outer catch below.
      if (previousScore) {
        const change = score - previousScore;
        try {
          const settings = await this.getMonitoringSettings(userId);

          if (Math.abs(change) >= settings.scoreChangeThreshold) {
            await this.createAlert(userId, {
              type: change > 0 ? "score_increase" : "score_decrease",
              bureau,
              title: `${bureau.charAt(0).toUpperCase() + bureau.slice(1)} Score ${change > 0 ? "Increased" : "Decreased"}`,
              message: `Your ${bureau} credit score ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change)} points (${previousScore} → ${score})`,
              severity: Math.abs(change) >= 20 ? "high" : "medium",
              data: { previousScore, newScore: score, change },
            });
          }
        } catch (alertError) {
          // Credit monitoring error: fetching settings or creating the
          // score-change alert (non-fatal)
        }
      }

      return {
        id: data.id,
        userId: data.user_id,
        bureau: data.bureau,
        score: data.score,
        scoreDate: new Date(data.score_date),
        factors: data.factors,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      // Credit monitoring error: adding credit score
      return null;
    }
  }

  /**
   * Get monitoring settings.
   *
   * PGRST116 ("no rows") means this user has never saved settings yet — a
   * legitimate first-visit state, not a failure, so it degrades to defaults.
   * Any other error code (RLS denial, network failure, etc.) THROWS instead
   * of silently returning the same defaults: collapsing both cases together
   * would mask a real read failure as "this user just hasn't configured
   * monitoring," the same false-all-clear shape as the getAlerts fix above.
   */
  async getMonitoringSettings(userId: string): Promise<MonitoringSettings> {
    const { data, error } = await supabase
      .from("credit_monitoring_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          userId,
          experianEnabled: true,
          equifaxEnabled: true,
          transunionEnabled: true,
          alertPreferences: {
            scoreChanges: true,
            newAccounts: true,
            inquiries: true,
            addressChanges: true,
            fraudAlerts: true,
            emailNotifications: true,
            smsNotifications: false,
          },
          scoreChangeThreshold: 10,
        };
      }
      throw new Error(`Failed to fetch monitoring settings: ${error.message}`);
    }

    return {
      userId: data.user_id,
      experianEnabled: data.experian_enabled,
      equifaxEnabled: data.equifax_enabled,
      transunionEnabled: data.transunion_enabled,
      alertPreferences: data.alert_preferences,
      scoreChangeThreshold: data.score_change_threshold || 10,
    };
  }

  /**
   * Update monitoring settings
   */
  async updateMonitoringSettings(
    userId: string,
    settings: Partial<MonitoringSettings>,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
        .from("credit_monitoring_settings")
        .upsert({
          user_id: userId,
          experian_enabled: settings.experianEnabled,
          equifax_enabled: settings.equifaxEnabled,
          transunion_enabled: settings.transunionEnabled,
          alert_preferences: settings.alertPreferences,
          score_change_threshold: settings.scoreChangeThreshold,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      // Credit monitoring error: updating monitoring settings
      return false;
    }
  }

  /**
   * Get all alerts for user.
   *
   * An empty array means "no alerts matched" — a genuine, successful result.
   * A query failure THROWS instead of returning `[]`, so callers (and their
   * HTTP layer) can tell "no alerts" apart from "could not load alerts"
   * rather than the two rendering identically as an empty list, which reads
   * as a false all-clear (every fraud/new-account/score-change alert would
   * be silently invisible to the user on a DB error).
   */
  async getAlerts(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      severity?: "low" | "medium" | "high" | "critical";
    },
  ): Promise<CreditAlert[]> {
    let query = supabase
      .from("credit_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq("read", false);
    }

    if (options?.severity) {
      query = query.eq("severity", options.severity);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch credit alerts: ${error.message}`);
    }

    const rows = (data ?? []) as CreditAlertRow[];
    return rows.map((alert) => this.mapAlertRow(alert));
  }

  /**
   * Create new alert.
   *
   * Throws on failure instead of returning `null` — a silent `null` here is
   * how fraud/new-account/score-change alerts get discarded with no trace.
   * Callers that treat alert creation as a best-effort side effect of a
   * primary action that already succeeded (e.g. `addCreditScore` after the
   * score row is saved) must catch this locally rather than let it null out
   * an unrelated, already-successful result — see `addCreditScore` below.
   */
  async createAlert(
    userId: string,
    alert: {
      type: AlertType;
      bureau?: Bureau;
      title: string;
      message: string;
      severity: "low" | "medium" | "high" | "critical";
      data?: JsonRecord;
    },
  ): Promise<CreditAlert> {
    const { data, error } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("credit_alerts")
      .insert({
        user_id: userId,
        type: alert.type,
        bureau: alert.bureau,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        read: false,
        data: alert.data,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create credit alert: ${error.message}`);
    }
    if (!data) {
      throw new Error("Failed to create credit alert: no data returned");
    }

    return this.mapAlertRow(data as CreditAlertRow);
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string, userId: string): Promise<boolean> {
    try {
      // The user_id filter is load-bearing: this runs on the service role,
      // which bypasses RLS, and alertId arrives straight off the request body.
      // Without it any authenticated caller could mark another user's credit
      // alert as read. markAllAlertsAsRead below already scopes this way.
      const { error } = await supabase
        .from("credit_alerts")
        .update({ read: true })
        .eq("id", alertId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error) {
      // Credit monitoring error: marking alert as read
      return false;
    }
  }

  /**
   * Mark all alerts as read
   */
  async markAllAlertsAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("credit_alerts")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;
      return true;
    } catch (error) {
      // Credit monitoring error: marking all alerts as read
      return false;
    }
  }

  /**
   * Get monitoring dashboard data
   */
  async getMonitoringDashboard(
    userId: string,
  ): Promise<CreditMonitoringDashboard> {
    try {
      // Get current scores
      const currentScores = await this.getCurrentScores(userId);

      // Calculate average score
      const scores = Object.values(currentScores)
        .filter((s): s is CreditScore => s !== undefined)
        .map((s) => s.score);
      const averageScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

      // Get score history for all bureaus
      const history = await Promise.all([
        this.getScoreHistory(userId, "experian", 365),
        this.getScoreHistory(userId, "equifax", 365),
        this.getScoreHistory(userId, "transunion", 365),
      ]);

      // Calculate score changes
      const scoreChange30Days = this.calculateScoreChange(history, 30);
      const scoreChange90Days = this.calculateScoreChange(history, 90);

      // Get recent alerts
      const alerts = await this.getAlerts(userId, { limit: 10 });

      // Get recent changes (mock data - would come from credit report monitoring)
      const recentChanges: CreditMonitoringDashboard["recentChanges"] = [];

      return {
        currentScores: {
          experian: currentScores.experian?.score,
          equifax: currentScores.equifax?.score,
          transunion: currentScores.transunion?.score,
        },
        averageScore,
        scoreChange30Days,
        scoreChange90Days,
        alerts,
        recentChanges,
        history,
      };
    } catch (error) {
      // Credit monitoring error: fetching monitoring dashboard
      throw error;
    }
  }

  /**
   * Calculate score change over period
   */
  private calculateScoreChange(
    history: CreditScoreHistory[],
    days: number,
  ): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let totalChange = 0;
    let bureauCount = 0;

    history.forEach((bureauHistory) => {
      const scores = bureauHistory.scores.filter((s) => s.date >= cutoffDate);
      if (scores.length >= 2) {
        const oldScore = scores[0].score;
        const newScore = scores[scores.length - 1].score;
        totalChange += newScore - oldScore;
        bureauCount++;
      }
    });

    return bureauCount > 0 ? Math.round(totalChange / bureauCount) : 0;
  }

  private mapScoreRow(row: CreditScoreRow): CreditScore {
    return {
      id: row.id,
      userId: row.user_id,
      bureau: row.bureau,
      score: row.score,
      scoreDate: new Date(row.score_date),
      factors: row.factors ?? [],
      createdAt: new Date(row.created_at),
    };
  }

  private mapAlertRow(row: CreditAlertRow): CreditAlert {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      bureau: row.bureau ?? undefined,
      title: row.title,
      message: row.message,
      severity: row.severity,
      read: row.read,
      createdAt: new Date(row.created_at),
      data: row.data ?? undefined,
    };
  }
}

export const creditMonitoringService = new CreditMonitoringService();
export default creditMonitoringService;

interface CreditScoreRow {
  id: string;
  user_id: string;
  bureau: Bureau;
  score: number;
  score_date: string;
  factors?: ScoreFactor[] | null;
  created_at: string;
}

interface CreditAlertRow {
  id: string;
  user_id: string;
  type: AlertType;
  bureau?: Bureau | null;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  read: boolean;
  created_at: string;
  data?: JsonRecord | null;
}
