/**
 * Credit Check Adapter (PARITY)
 *
 * Flattens GET /api/credit-monitoring's dashboard into the three fields the
 * background credit monitor needs: an average score, its 30-day change, and
 * the alerts worth a push notification.
 *
 * WHY THIS EXISTS. backgroundTaskService called `api.get("/api/credit/check")`.
 * The client's base URL already ends in /api, so the request went to
 * /api/api/credit/check and 404'd on every run. The client does not throw on a
 * non-2xx — it returns { success: false } (client.ts:354) — so the surrounding
 * catch never fired, `response.data` was undefined, and the task handler's
 * `result.alerts.length` threw a TypeError every time. The background credit
 * monitor has never completed a run.
 *
 * The dead catch held `return { score: 720, change: 0, alerts: [] }` under a
 * "Return mock data for development" comment. Had the client thrown, every user
 * would have been told their credit score was 720. It is gone: a monitor that
 * cannot read a score must report that it could not, never a number.
 *
 * Kept free of expo-task-manager and notification dependencies so the mapping
 * can be unit-tested directly, matching the codebase's `*Adapter` convention.
 */

/** An alert as the monitoring dashboard returns it. */
export interface ApiCreditAlert {
  alert_type?: string;
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

/** The dashboard payload from GET /api/credit-monitoring. */
export interface ApiMonitoringDashboard {
  averageScore?: number;
  scoreChange30Days?: number;
  alerts?: ApiCreditAlert[];
}

/** Severity as the notification layer understands it. */
export type NotificationSeverity = "info" | "warning" | "critical";

export interface CreditCheckAlert {
  type: string;
  message: string;
  severity: NotificationSeverity;
}

export interface CreditCheckResult {
  score: number;
  change: number;
  alerts: CreditCheckAlert[];
}

/**
 * Four bureau severities onto three notification severities.
 *
 * Only `critical` changes behaviour — it is the one that plays a sound — so
 * `high` is deliberately mapped to `warning` rather than promoted, and nothing
 * is demoted below the attention it was filed with.
 */
const SEVERITY: Record<string, NotificationSeverity> = {
  low: "info",
  medium: "warning",
  high: "warning",
  critical: "critical",
};

function toAlert(alert: ApiCreditAlert): CreditCheckAlert | null {
  const message = (alert?.description ?? "").trim();
  // An alert with no text would arrive as an empty push notification.
  if (!message) return null;

  return {
    type: alert.alert_type ?? "credit_alert",
    message,
    // An unrecognised severity is treated as warning, not dropped: an alert we
    // cannot classify is still an alert, and silence is the wrong default.
    severity: SEVERITY[alert.severity ?? ""] ?? "warning",
  };
}

/**
 * Map the dashboard, or return null when there is nothing real to report.
 *
 * Returning null rather than a zeroed result is the point: 0 is a credit score
 * the user could act on, and "we could not check" must not look like "your
 * score is 0" or like a clean run with no alerts.
 */
export function toCreditCheckResult(
  dashboard: ApiMonitoringDashboard | null | undefined,
): CreditCheckResult | null {
  if (!dashboard || typeof dashboard.averageScore !== "number") return null;

  // averageScore is 0 when the user has no scores on file yet — that is an
  // absence of data, not a score of zero.
  if (dashboard.averageScore <= 0) return null;

  const alerts = Array.isArray(dashboard.alerts)
    ? dashboard.alerts.map(toAlert).filter((a): a is CreditCheckAlert => a !== null)
    : [];

  return {
    score: dashboard.averageScore,
    change: dashboard.scoreChange30Days ?? 0,
    alerts,
  };
}
