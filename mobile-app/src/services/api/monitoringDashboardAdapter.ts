/**
 * Monitoring Dashboard Adapter (PARITY)
 *
 * Pure, presentation-only mappers that normalize the real credit store types
 * (CreditScore, CreditMonitoringAlert, CreditScoreHistory) into the flat view
 * shapes the /dashboard/monitoring screen renders. Nothing is fabricated: every
 * field is copied or derived from the source (bureau title-casing, `change`
 * defaulting to 0, `lastUpdated` falling back to `date`, `createdAt` -> `date`,
 * `acknowledged` -> `read`, score history -> {value,label} chart points).
 *
 * Kept free of React Native / theme / icon dependencies so the mapping can be
 * unit-tested directly, matching the codebase's `*Adapter` convention.
 */

import type {
  AlertType,
  CreditMonitoringAlert,
  CreditScore,
  CreditScoreHistory,
} from "./types";

/** Bureau score card, flattened for the monitoring screen. */
export interface BureauScoreView {
  id: string;
  bureau: string; // display name, title-cased (e.g. "Experian")
  score: number;
  change: number; // point delta since previous pull (0 when unknown)
  lastUpdated: string; // ISO timestamp (lastUpdated, else the score date)
}

/** Monitoring alert, flattened for the monitoring screen. */
export interface MonitoringAlertView {
  id: string;
  type: AlertType;
  severity: CreditMonitoringAlert["severity"]; // low | medium | high | critical
  title: string;
  description: string;
  date: string; // ISO timestamp (source createdAt)
  read: boolean; // source acknowledged
}

/** Single point on the score-trend line chart. */
export interface ScoreTrendPoint {
  value: number;
  label: string; // short month, e.g. "Jul"
}

/** Title-case a bureau slug ("experian" -> "Experian"); "" stays "". */
function titleCaseBureau(bureau: string): string {
  if (!bureau) return "";
  return bureau.charAt(0).toUpperCase() + bureau.slice(1);
}

/** Short month label for a chart point; "" for a missing/invalid timestamp. */
function shortMonth(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", { month: "short" });
}

/** Map a real credit score into the bureau card view. */
export function mapBureauScore(score: CreditScore): BureauScoreView {
  return {
    id: score.id,
    bureau: titleCaseBureau(score.bureau),
    score: score.score,
    change: score.change ?? 0,
    lastUpdated: score.lastUpdated ?? score.date,
  };
}

/** Map a real monitoring alert into the alert row view. */
export function mapMonitoringAlert(
  alert: CreditMonitoringAlert,
): MonitoringAlertView {
  return {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    date: alert.createdAt,
    read: alert.acknowledged,
  };
}

/**
 * Map credit score history into line-chart points. Returns an empty array when
 * history is absent so the screen can render an honest empty state instead of
 * an invented trend.
 */
export function mapScoreHistoryToTrend(
  history: CreditScoreHistory | null,
): ScoreTrendPoint[] {
  if (!history) return [];
  return history.history.map((point) => ({
    value: point.score,
    label: shortMonth(point.date),
  }));
}
