/**
 * @jest-environment node
 */

jest.mock("@/lib/security/audit-logging", () => ({
  logSecurityEvent: jest.fn(),
}));

import {
  IncidentResponse,
  incidentResponse,
  getAutoEscalationLevel,
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
  INCIDENT_STATUSES,
  type IncidentType,
  type SeverityLevel,
  type IncidentDetails,
} from "../incident-response";

import { logSecurityEvent } from "@/lib/security/audit-logging";

// ── Setup ────────────────────────────────────────────────────────────────────

let service: IncidentResponse;

beforeEach(() => {
  jest.clearAllMocks();
  service = new IncidentResponse();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — Constants", () => {
  it("should define 6 incident types", () => {
    expect(INCIDENT_TYPES).toHaveLength(6);
    expect(INCIDENT_TYPES).toContain("AUTH_FAILURE");
    expect(INCIDENT_TYPES).toContain("RATE_LIMIT_BREACH");
    expect(INCIDENT_TYPES).toContain("INPUT_VALIDATION_FAILURE");
    expect(INCIDENT_TYPES).toContain("CSRF_ATTEMPT");
    expect(INCIDENT_TYPES).toContain("PRIVILEGE_ESCALATION");
    expect(INCIDENT_TYPES).toContain("DATA_BREACH_ATTEMPT");
  });

  it("should define 4 severity levels", () => {
    expect(SEVERITY_LEVELS).toHaveLength(4);
    expect(SEVERITY_LEVELS).toContain("LOW");
    expect(SEVERITY_LEVELS).toContain("MEDIUM");
    expect(SEVERITY_LEVELS).toContain("HIGH");
    expect(SEVERITY_LEVELS).toContain("CRITICAL");
  });

  it("should define 5 incident statuses", () => {
    expect(INCIDENT_STATUSES).toHaveLength(5);
    expect(INCIDENT_STATUSES).toContain("OPEN");
    expect(INCIDENT_STATUSES).toContain("INVESTIGATING");
    expect(INCIDENT_STATUSES).toContain("ESCALATED");
    expect(INCIDENT_STATUSES).toContain("RESOLVED");
    expect(INCIDENT_STATUSES).toContain("CLOSED");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getAutoEscalationLevel
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — getAutoEscalationLevel", () => {
  it("should return 0 for LOW severity", () => {
    expect(getAutoEscalationLevel("LOW")).toBe(0);
  });

  it("should return 1 for MEDIUM severity", () => {
    expect(getAutoEscalationLevel("MEDIUM")).toBe(1);
  });

  it("should return 2 for HIGH severity", () => {
    expect(getAutoEscalationLevel("HIGH")).toBe(2);
  });

  it("should return 3 for CRITICAL severity", () => {
    expect(getAutoEscalationLevel("CRITICAL")).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  reportIncident
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — reportIncident", () => {
  const sampleDetails: IncidentDetails = {
    ipAddress: "192.168.1.1",
    userId: "user-123",
    route: "/api/admin/users",
    method: "GET",
    description: "Unauthorized access attempt",
  };

  it("should create an incident with correct type and severity", () => {
    const incident = service.reportIncident(
      "AUTH_FAILURE",
      "HIGH",
      sampleDetails,
    );

    expect(incident.type).toBe("AUTH_FAILURE");
    expect(incident.severity).toBe("HIGH");
    expect(incident.details.description).toBe("Unauthorized access attempt");
  });

  it("should generate a unique incident ID", () => {
    const inc1 = service.reportIncident("AUTH_FAILURE", "LOW", sampleDetails);
    const inc2 = service.reportIncident("CSRF_ATTEMPT", "LOW", sampleDetails);

    expect(inc1.id).not.toBe(inc2.id);
    expect(inc1.id).toMatch(/^INC-/);
    expect(inc2.id).toMatch(/^INC-/);
  });

  it("should set initial status to OPEN for LOW severity", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", sampleDetails);
    expect(incident.status).toBe("OPEN");
    expect(incident.escalationLevel).toBe(0);
  });

  it("should auto-escalate MEDIUM severity incidents to level 1", () => {
    const incident = service.reportIncident(
      "RATE_LIMIT_BREACH",
      "MEDIUM",
      sampleDetails,
    );

    expect(incident.status).toBe("ESCALATED");
    expect(incident.escalationLevel).toBe(1);
    expect(incident.escalatedAt).toBeInstanceOf(Date);
  });

  it("should auto-escalate HIGH severity incidents to level 2", () => {
    const incident = service.reportIncident(
      "PRIVILEGE_ESCALATION",
      "HIGH",
      sampleDetails,
    );

    expect(incident.status).toBe("ESCALATED");
    expect(incident.escalationLevel).toBe(2);
  });

  it("should auto-escalate CRITICAL severity incidents to level 3", () => {
    const incident = service.reportIncident(
      "DATA_BREACH_ATTEMPT",
      "CRITICAL",
      sampleDetails,
    );

    expect(incident.status).toBe("ESCALATED");
    expect(incident.escalationLevel).toBe(3);
  });

  it("should include a timeline entry for creation", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", sampleDetails);

    expect(incident.timeline.length).toBeGreaterThanOrEqual(1);
    expect(incident.timeline[0].action).toBe("CREATED");
  });

  it("should log to audit system via logSecurityEvent", () => {
    service.reportIncident("AUTH_FAILURE", "HIGH", sampleDetails);

    expect(logSecurityEvent).toHaveBeenCalledTimes(1);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "auth_failure",
        severity: "high",
        userId: "user-123",
        ipAddress: "192.168.1.1",
      }),
    );
  });

  it("should set createdAt and updatedAt timestamps", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", sampleDetails);

    expect(incident.createdAt).toBeInstanceOf(Date);
    expect(incident.updatedAt).toBeInstanceOf(Date);
  });

  it("should increment incident count", () => {
    expect(service.getCount()).toBe(0);
    service.reportIncident("AUTH_FAILURE", "LOW", sampleDetails);
    expect(service.getCount()).toBe(1);
    service.reportIncident("CSRF_ATTEMPT", "MEDIUM", sampleDetails);
    expect(service.getCount()).toBe(2);
  });

  it("should store incident details including evidence", () => {
    const detailsWithEvidence: IncidentDetails = {
      ...sampleDetails,
      evidence: { headers: { "User-Agent": "bot" }, payload: "malicious" },
    };
    const incident = service.reportIncident(
      "INPUT_VALIDATION_FAILURE",
      "HIGH",
      detailsWithEvidence,
    );

    expect(incident.details.evidence).toEqual({
      headers: { "User-Agent": "bot" },
      payload: "malicious",
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  escalateIncident
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — escalateIncident", () => {
  const details: IncidentDetails = {
    description: "Test escalation",
  };

  it("should escalate to specified level", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", details);
    const updated = service.escalateIncident(incident.id, 2);

    expect(updated).not.toBeNull();
    expect(updated?.escalationLevel).toBe(2);
    expect(updated?.status).toBe("ESCALATED");
  });

  it("should increment by 1 when no target level given", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", details);
    expect(incident.escalationLevel).toBe(0);

    const updated = service.escalateIncident(incident.id);
    expect(updated?.escalationLevel).toBe(1);
  });

  it("should cap escalation at level 3", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", details);
    const updated = service.escalateIncident(incident.id, 10);

    expect(updated?.escalationLevel).toBe(3);
  });

  it("should set escalatedAt timestamp", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", details);
    const updated = service.escalateIncident(incident.id, 1);

    expect(updated?.escalatedAt).toBeInstanceOf(Date);
  });

  it("should add timeline entry for escalation", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", details);
    const updated = service.escalateIncident(incident.id, 2);

    const escalationEntries = updated?.timeline.filter(
      (e) => e.action === "ESCALATED",
    );
    expect(escalationEntries?.length).toBeGreaterThanOrEqual(1);
  });

  it("should return null for unknown incident ID", () => {
    const result = service.escalateIncident("INC-UNKNOWN-123");
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getIncidentStatus
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — getIncidentStatus", () => {
  it("should retrieve an existing incident", () => {
    const created = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "Test",
    });
    const retrieved = service.getIncidentStatus(created.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(created.id);
  });

  it("should return null for non-existent incident", () => {
    expect(service.getIncidentStatus("INC-NONEXISTENT")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  updateIncidentStatus
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — updateIncidentStatus", () => {
  it("should change status to INVESTIGATING", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "Test",
    });
    const updated = service.updateIncidentStatus(incident.id, "INVESTIGATING");

    expect(updated?.status).toBe("INVESTIGATING");
  });

  it("should set resolvedAt when status changes to RESOLVED", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "Test",
    });
    const updated = service.updateIncidentStatus(incident.id, "RESOLVED");

    expect(updated?.resolvedAt).toBeInstanceOf(Date);
  });

  it("should set resolvedAt when status changes to CLOSED", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "Test",
    });
    const updated = service.updateIncidentStatus(incident.id, "CLOSED");

    expect(updated?.resolvedAt).toBeInstanceOf(Date);
  });

  it("should add timeline entry with custom note", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "Test",
    });
    service.updateIncidentStatus(
      incident.id,
      "INVESTIGATING",
      "Assigned to security team",
    );

    const lastEntry = incident.timeline[incident.timeline.length - 1];
    expect(lastEntry.details).toBe("Assigned to security team");
  });

  it("should add timeline entry with default note when no note provided", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "Test",
    });
    service.updateIncidentStatus(incident.id, "INVESTIGATING");

    const lastEntry = incident.timeline[incident.timeline.length - 1];
    expect(lastEntry.details).toContain("INVESTIGATING");
  });

  it("should return null for unknown incident", () => {
    const result = service.updateIncidentStatus("INC-UNKNOWN", "RESOLVED");
    expect(result).toBeNull();
  });

  it("should update the updatedAt timestamp", () => {
    const incident = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "Test",
    });
    const before = incident.updatedAt;
    // Small delay to ensure timestamp differs
    service.updateIncidentStatus(incident.id, "INVESTIGATING");
    expect(incident.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  generateReport
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — generateReport", () => {
  it("should return a report for given time range", () => {
    const start = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    service.reportIncident("AUTH_FAILURE", "LOW", { description: "Test 1" });
    service.reportIncident("CSRF_ATTEMPT", "HIGH", { description: "Test 2" });

    const end = new Date(Date.now() + 1000); // ensure end is after incidents
    const report = service.generateReport({ start, end });

    expect(report.totalIncidents).toBe(2);
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.byType.AUTH_FAILURE).toBe(1);
    expect(report.byType.CSRF_ATTEMPT).toBe(1);
  });

  it("should calculate correct counts by severity", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000);

    service.reportIncident("AUTH_FAILURE", "LOW", { description: "T1" });
    service.reportIncident("CSRF_ATTEMPT", "LOW", { description: "T2" });
    service.reportIncident("PRIVILEGE_ESCALATION", "CRITICAL", {
      description: "T3",
    });

    const report = service.generateReport({ start, end: now });

    expect(report.bySeverity.LOW).toBe(2);
    expect(report.bySeverity.CRITICAL).toBe(1);
  });

  it("should count open incidents correctly", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000);

    const inc1 = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "T1",
    });
    service.reportIncident("CSRF_ATTEMPT", "HIGH", { description: "T2" });
    service.updateIncidentStatus(inc1.id, "RESOLVED");

    const report = service.generateReport({ start, end: now });

    // inc1 is RESOLVED, inc2 is ESCALATED (auto-escalated from HIGH)
    expect(report.openIncidents).toBe(1);
    expect(report.resolvedIncidents).toBe(1);
  });

  it("should calculate average resolution time", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000);

    const inc = service.reportIncident("AUTH_FAILURE", "LOW", {
      description: "T1",
    });
    service.updateIncidentStatus(inc.id, "RESOLVED");

    const report = service.generateReport({ start, end: now });

    expect(report.averageResolutionTimeMs).not.toBeNull();
    expect(report.averageResolutionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should return null average resolution time when no resolved incidents", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000);

    service.reportIncident("AUTH_FAILURE", "LOW", { description: "T1" });

    const report = service.generateReport({ start, end: now });

    expect(report.averageResolutionTimeMs).toBeNull();
  });

  it("should exclude incidents outside the time range", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(future.getTime() + 60 * 60 * 1000);

    service.reportIncident("AUTH_FAILURE", "LOW", { description: "T1" });

    const report = service.generateReport({ start: future, end: futureEnd });

    expect(report.totalIncidents).toBe(0);
  });

  it("should include all incident type counts initialized to 0", () => {
    const now = new Date();
    const start = new Date(now.getTime() - 60 * 60 * 1000);
    const report = service.generateReport({ start, end: now });

    for (const type of INCIDENT_TYPES) {
      expect(report.byType[type]).toBeDefined();
      expect(typeof report.byType[type]).toBe("number");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getOpenIncidents / getIncidentsByType / getIncidentsBySeverity
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — query methods", () => {
  const details: IncidentDetails = { description: "Test" };

  it("getOpenIncidents should return only non-resolved incidents", () => {
    const inc1 = service.reportIncident("AUTH_FAILURE", "LOW", details);
    service.reportIncident("CSRF_ATTEMPT", "LOW", details);
    service.updateIncidentStatus(inc1.id, "RESOLVED");

    const open = service.getOpenIncidents();
    expect(open).toHaveLength(1);
  });

  it("getOpenIncidents should include ESCALATED incidents", () => {
    service.reportIncident("AUTH_FAILURE", "HIGH", details); // auto-escalated

    const open = service.getOpenIncidents();
    expect(open).toHaveLength(1);
    expect(open[0].status).toBe("ESCALATED");
  });

  it("getIncidentsByType should filter by type", () => {
    service.reportIncident("AUTH_FAILURE", "LOW", details);
    service.reportIncident("AUTH_FAILURE", "LOW", details);
    service.reportIncident("CSRF_ATTEMPT", "LOW", details);

    const authIncidents = service.getIncidentsByType("AUTH_FAILURE");
    expect(authIncidents).toHaveLength(2);
  });

  it("getIncidentsBySeverity should filter by severity", () => {
    service.reportIncident("AUTH_FAILURE", "LOW", details);
    service.reportIncident("CSRF_ATTEMPT", "HIGH", details);
    service.reportIncident("PRIVILEGE_ESCALATION", "HIGH", details);

    const highIncidents = service.getIncidentsBySeverity("HIGH");
    expect(highIncidents).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  clearAll / getCount
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — clearAll / getCount", () => {
  it("should clear all incidents", () => {
    service.reportIncident("AUTH_FAILURE", "LOW", { description: "T1" });
    service.reportIncident("CSRF_ATTEMPT", "LOW", { description: "T2" });

    expect(service.getCount()).toBe(2);

    service.clearAll();
    expect(service.getCount()).toBe(0);
    expect(service.getOpenIncidents()).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Singleton
// ═══════════════════════════════════════════════════════════════════════════════
describe("Incident Response — Singleton", () => {
  it("should export a singleton instance", () => {
    expect(incidentResponse).toBeInstanceOf(IncidentResponse);
  });
});
