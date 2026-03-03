/**
 * Incident Response Service
 *
 * Provides structured security incident reporting, tracking,
 * escalation, and reporting for the Fynvita platform.
 *
 * Incident lifecycle:
 *   OPEN -> INVESTIGATING -> ESCALATED -> RESOLVED / CLOSED
 *
 * Integrates with the existing audit logging service for persistence.
 */

import { logSecurityEvent } from "@/lib/security/audit-logging";

// ── Types ────────────────────────────────────────────────────────────────────

export const INCIDENT_TYPES = [
  "AUTH_FAILURE",
  "RATE_LIMIT_BREACH",
  "INPUT_VALIDATION_FAILURE",
  "CSRF_ATTEMPT",
  "PRIVILEGE_ESCALATION",
  "DATA_BREACH_ATTEMPT",
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const INCIDENT_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface IncidentDetails {
  /** IP address of the requester, if available */
  ipAddress?: string;
  /** User ID associated with the incident, if available */
  userId?: string;
  /** The API route or resource involved */
  route?: string;
  /** HTTP method */
  method?: string;
  /** Free-form description of what happened */
  description: string;
  /** Additional context or evidence */
  evidence?: Record<string, unknown>;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: SeverityLevel;
  status: IncidentStatus;
  details: IncidentDetails;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  escalatedAt?: Date;
  escalationLevel: number;
  timeline: IncidentTimelineEntry[];
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  details: string;
  actor?: string;
}

export interface IncidentReport {
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  totalIncidents: number;
  byType: Record<IncidentType, number>;
  bySeverity: Record<SeverityLevel, number>;
  byStatus: Record<IncidentStatus, number>;
  openIncidents: number;
  resolvedIncidents: number;
  averageResolutionTimeMs: number | null;
  incidents: Incident[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `INC-${timestamp}-${random}`.toUpperCase();
}

function mapSeverityToAuditLevel(
  severity: SeverityLevel,
): "low" | "medium" | "high" | "critical" {
  switch (severity) {
    case "LOW":
      return "low";
    case "MEDIUM":
      return "medium";
    case "HIGH":
      return "high";
    case "CRITICAL":
      return "critical";
  }
}

function mapIncidentTypeToEventType(type: IncidentType): string {
  switch (type) {
    case "AUTH_FAILURE":
      return "auth_failure";
    case "RATE_LIMIT_BREACH":
      return "rate_limit_exceeded";
    case "INPUT_VALIDATION_FAILURE":
      return "input_validation_failed";
    case "CSRF_ATTEMPT":
      return "input_validation_failed";
    case "PRIVILEGE_ESCALATION":
      return "permission_denied";
    case "DATA_BREACH_ATTEMPT":
      return "harmful_content_detected";
  }
}

// ── Auto-escalation rules ────────────────────────────────────────────────────

/**
 * Determines the auto-escalation level based on severity.
 *
 * - LOW: no auto-escalation (level 0)
 * - MEDIUM: escalate to level 1 (team lead)
 * - HIGH: escalate to level 2 (security team)
 * - CRITICAL: escalate to level 3 (CISO / exec)
 */
export function getAutoEscalationLevel(severity: SeverityLevel): number {
  switch (severity) {
    case "LOW":
      return 0;
    case "MEDIUM":
      return 1;
    case "HIGH":
      return 2;
    case "CRITICAL":
      return 3;
  }
}

// ── Incident Response Class ──────────────────────────────────────────────────

export class IncidentResponse {
  private incidents: Map<string, Incident> = new Map();

  /**
   * Report a new security incident.
   *
   * Creates the incident record, logs it to the audit system,
   * and auto-escalates if severity warrants it.
   */
  reportIncident(
    type: IncidentType,
    severity: SeverityLevel,
    details: IncidentDetails,
  ): Incident {
    const now = new Date();
    const id = generateIncidentId();

    const incident: Incident = {
      id,
      type,
      severity,
      status: "OPEN",
      details,
      createdAt: now,
      updatedAt: now,
      escalationLevel: 0,
      timeline: [
        {
          timestamp: now,
          action: "CREATED",
          details: `Incident reported: ${type} (${severity})`,
        },
      ],
    };

    this.incidents.set(id, incident);

    // Log to audit system
    logSecurityEvent({
      eventType: mapIncidentTypeToEventType(type) as
        | "auth_failure"
        | "rate_limit_exceeded"
        | "input_validation_failed"
        | "permission_denied"
        | "harmful_content_detected",
      message: `Security incident ${id}: ${type} — ${details.description}`,
      severity: mapSeverityToAuditLevel(severity),
      action: "flagged",
      userId: details.userId,
      ipAddress: details.ipAddress,
      metadata: {
        incidentId: id,
        route: details.route,
        method: details.method,
        evidence: details.evidence,
      },
    });

    // Auto-escalate if severity warrants it
    const autoLevel = getAutoEscalationLevel(severity);
    if (autoLevel > 0) {
      this.escalateIncident(id, autoLevel);
    }

    return incident;
  }

  /**
   * Escalate an incident to a higher level.
   *
   * @param incidentId - The incident to escalate
   * @param targetLevel - Optional target level. If omitted, increments by 1.
   * @returns The updated incident, or null if not found.
   */
  escalateIncident(
    incidentId: string,
    targetLevel?: number,
  ): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return null;
    }

    const newLevel =
      targetLevel !== undefined ? targetLevel : incident.escalationLevel + 1;

    // Cap at level 3
    incident.escalationLevel = Math.min(newLevel, 3);
    incident.status = "ESCALATED";
    incident.escalatedAt = new Date();
    incident.updatedAt = new Date();

    incident.timeline.push({
      timestamp: new Date(),
      action: "ESCALATED",
      details: `Escalated to level ${incident.escalationLevel}`,
    });

    return incident;
  }

  /**
   * Get the current status and details of an incident.
   */
  getIncidentStatus(incidentId: string): Incident | null {
    return this.incidents.get(incidentId) ?? null;
  }

  /**
   * Update the status of an incident.
   */
  updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    note?: string,
  ): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return null;
    }

    incident.status = status;
    incident.updatedAt = new Date();

    if (status === "RESOLVED" || status === "CLOSED") {
      incident.resolvedAt = new Date();
    }

    incident.timeline.push({
      timestamp: new Date(),
      action: `STATUS_CHANGED_TO_${status}`,
      details: note ?? `Status changed to ${status}`,
    });

    return incident;
  }

  /**
   * Generate a report of all incidents within a time range.
   */
  generateReport(timeRange: { start: Date; end: Date }): IncidentReport {
    const allIncidents = Array.from(this.incidents.values());
    const inRange = allIncidents.filter(
      (i) => i.createdAt >= timeRange.start && i.createdAt <= timeRange.end,
    );

    // Initialize counters
    const byType = {} as Record<IncidentType, number>;
    for (const t of INCIDENT_TYPES) {
      byType[t] = 0;
    }

    const bySeverity = {} as Record<SeverityLevel, number>;
    for (const s of SEVERITY_LEVELS) {
      bySeverity[s] = 0;
    }

    const byStatus = {} as Record<IncidentStatus, number>;
    for (const s of INCIDENT_STATUSES) {
      byStatus[s] = 0;
    }

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const incident of inRange) {
      byType[incident.type]++;
      bySeverity[incident.severity]++;
      byStatus[incident.status]++;

      if (
        incident.resolvedAt &&
        (incident.status === "RESOLVED" || incident.status === "CLOSED")
      ) {
        totalResolutionTime +=
          incident.resolvedAt.getTime() - incident.createdAt.getTime();
        resolvedCount++;
      }
    }

    const openIncidents = inRange.filter(
      (i) =>
        i.status === "OPEN" ||
        i.status === "INVESTIGATING" ||
        i.status === "ESCALATED",
    ).length;

    return {
      generatedAt: new Date(),
      timeRange,
      totalIncidents: inRange.length,
      byType,
      bySeverity,
      byStatus,
      openIncidents,
      resolvedIncidents: resolvedCount,
      averageResolutionTimeMs:
        resolvedCount > 0 ? totalResolutionTime / resolvedCount : null,
      incidents: inRange,
    };
  }

  /**
   * Get all open (non-resolved, non-closed) incidents.
   */
  getOpenIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      (i) =>
        i.status === "OPEN" ||
        i.status === "INVESTIGATING" ||
        i.status === "ESCALATED",
    );
  }

  /**
   * Get incidents by type.
   */
  getIncidentsByType(type: IncidentType): Incident[] {
    return Array.from(this.incidents.values()).filter((i) => i.type === type);
  }

  /**
   * Get incidents by severity.
   */
  getIncidentsBySeverity(severity: SeverityLevel): Incident[] {
    return Array.from(this.incidents.values()).filter(
      (i) => i.severity === severity,
    );
  }

  /**
   * Clear all incidents (for testing or reset).
   */
  clearAll(): void {
    this.incidents.clear();
  }

  /**
   * Get total incident count.
   */
  getCount(): number {
    return this.incidents.size;
  }
}

/** Singleton instance for application-wide use */
export const incidentResponse = new IncidentResponse();

export default incidentResponse;
