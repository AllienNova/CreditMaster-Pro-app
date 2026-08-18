/**
 * admin/audit and admin/logs — real-data wiring.
 *
 * Both screens rendered a fixture behind a FAKE loading spinner:
 *
 *   useEffect(() => { setTimeout(() => setLoading(false), 800); }, []);
 *
 * They simulated fetching and then showed a constant. For an audit trail that
 * is the worst possible failure mode — it is the record an operator consults
 * to establish what actually happened, and it would have answered confidently
 * and wrongly.
 *
 * The logs screen is the sharper case. GET /api/admin/logs has always
 * answered `dataAvailable: false` with a message explaining that a system_logs
 * table and writer do not exist. Somebody made the honest call at the route
 * and wrote down why; the screen rendered seven plausible log lines on top of
 * it under the subtitle "Real-time log viewer".
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type {
  AdminAuditEvent,
  AdminSystemLogs,
} from "../../services/api/admin";

const mockGetAuditLog = jest.fn();
const mockGetSystemLogs = jest.fn();

jest.mock("../../services/api/admin", () => ({
  adminAuditApi: { getAuditLog: (...a: unknown[]) => mockGetAuditLog(...a) },
  adminLogsApi: { getSystemLogs: (...a: unknown[]) => mockGetSystemLogs(...a) },
}));

// expo-router is mocked globally in jest.setup.js.

import AdminAuditScreen from "../../../app/admin/audit";
import AdminLogsScreen from "../../../app/admin/logs";

function event(over: Partial<AdminAuditEvent> = {}): AdminAuditEvent {
  return {
    id: "e1",
    action: "dispute.created",
    user: "operator@fynvita.test",
    resourceType: "dispute",
    resourceId: "d-1",
    ipAddress: "203.0.113.7",
    timestamp: "2026-08-17T14:32:15.000Z",
    ...over,
  };
}

function auditOk(events: AdminAuditEvent[]) {
  return {
    success: true,
    data: { events, total: events.length, page: 1, totalPages: 1 },
  };
}

const UNAVAILABLE: AdminSystemLogs = {
  dataAvailable: false,
  message:
    "System logs are not yet available. A system_logs table and writer are needed to populate this view.",
  total: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuditLog.mockResolvedValue(auditOk([event()]));
  mockGetSystemLogs.mockResolvedValue({ success: true, data: UNAVAILABLE });
});

describe("admin/audit", () => {
  it("fetches on mount instead of faking a spinner over a fixture", async () => {
    render(<AdminAuditScreen />);
    await waitFor(() => expect(mockGetAuditLog).toHaveBeenCalledTimes(1));
  });

  it("never shows the invented events again", async () => {
    render(<AdminAuditScreen />);
    await waitFor(() => expect(mockGetAuditLog).toHaveBeenCalled());
    expect(screen.queryByText("john@example.com")).toBeNull();
    expect(
      screen.queryByText(/Successful login from 192\.168\.1\.1/),
    ).toBeNull();
  });

  it("renders the real action and actor", async () => {
    render(<AdminAuditScreen />);
    expect(await screen.findByText("dispute.created")).toBeTruthy();
    expect(screen.getByText("operator@fynvita.test")).toBeTruthy();
  });

  it("builds the filter chips from real resource types", async () => {
    // login | data | admin | security was not a column; no audit_logs row
    // could ever have matched a chip.
    mockGetAuditLog.mockResolvedValue(
      auditOk([
        event({ id: "a", resourceType: "dispute" }),
        event({ id: "b", resourceType: "credit_report" }),
      ]),
    );
    render(<AdminAuditScreen />);

    expect(await screen.findByText("Dispute")).toBeTruthy();
    expect(screen.getByText("Credit report")).toBeTruthy();
    for (const invented of ["Login", "Security", "Data"]) {
      expect(screen.queryByText(invented)).toBeNull();
    }
  });

  it("omits the actor when audit_logs has no profile for them", async () => {
    // A raw user_id helps nobody and a synthesised address would misstate who
    // acted.
    mockGetAuditLog.mockResolvedValue(auditOk([event({ user: "" })]));
    render(<AdminAuditScreen />);
    await waitFor(() => expect(mockGetAuditLog).toHaveBeenCalled());
    expect(screen.queryByText("operator@fynvita.test")).toBeNull();
    expect(screen.getByText("dispute.created")).toBeTruthy();
  });

  describe("honest states", () => {
    it("distinguishes a failed read from an empty trail, and retries", async () => {
      // "No events recorded" and "we could not read the log" are opposite
      // claims, and an operator would act on the first one.
      mockGetAuditLog.mockResolvedValue({
        success: false,
        error: { message: "boom" },
      });
      render(<AdminAuditScreen />);

      expect(
        await screen.findByText(/could not load the audit trail/i),
      ).toBeTruthy();
      expect(
        screen.queryByText(/No audit events have been recorded/i),
      ).toBeNull();

      mockGetAuditLog.mockResolvedValue(auditOk([event()]));
      fireEvent.press(screen.getByText("Try again"));
      await waitFor(() => expect(mockGetAuditLog).toHaveBeenCalledTimes(2));
    });

    it("says so when the trail is genuinely empty", async () => {
      mockGetAuditLog.mockResolvedValue(auditOk([]));
      render(<AdminAuditScreen />);
      expect(
        await screen.findByText(/No audit events have been recorded/i),
      ).toBeTruthy();
    });
  });
});

describe("admin/logs", () => {
  it("fetches on mount", async () => {
    render(<AdminLogsScreen />);
    await waitFor(() => expect(mockGetSystemLogs).toHaveBeenCalledTimes(1));
  });

  it("shows the route's own explanation, verbatim", async () => {
    // Paraphrasing would let this copy drift from what the server reports.
    render(<AdminLogsScreen />);
    expect(await screen.findByText(UNAVAILABLE.message)).toBeTruthy();
  });

  it("never shows the invented log lines again", async () => {
    render(<AdminLogsScreen />);
    await waitFor(() => expect(mockGetSystemLogs).toHaveBeenCalled());
    expect(
      screen.queryByText(/logged in successfully/i),
    ).toBeNull();
  });

  it("stops calling itself a real-time viewer", async () => {
    // There is no log stream behind this screen and there never was.
    render(<AdminLogsScreen />);
    await waitFor(() => expect(mockGetSystemLogs).toHaveBeenCalled());
    expect(screen.queryByText("Real-time log viewer")).toBeNull();
  });

  it("drops the level filter, which would have filtered nothing", async () => {
    render(<AdminLogsScreen />);
    await waitFor(() => expect(mockGetSystemLogs).toHaveBeenCalled());
    for (const level of ["INFO", "WARN", "ERROR", "DEBUG"]) {
      expect(screen.queryByText(level)).toBeNull();
    }
  });

  it("re-reads when refreshed, rather than doing nothing", async () => {
    // The refresh button had no handler at all. It will honestly report
    // "still unavailable" until a system_logs table and writer exist, which
    // is the point: the operator can check rather than assume.
    render(<AdminLogsScreen />);
    await waitFor(() => expect(mockGetSystemLogs).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByTestId("admin-logs-refresh"));
    await waitFor(() => expect(mockGetSystemLogs).toHaveBeenCalledTimes(2));
  });

  it("reports a transport failure as such, not as unavailability", async () => {
    // "The feature is not built" and "we could not reach the service" are
    // different facts and lead an operator to different places.
    mockGetSystemLogs.mockResolvedValue({
      success: false,
      error: { message: "boom" },
    });
    render(<AdminLogsScreen />);

    expect(
      await screen.findByText(/could not reach the log service/i),
    ).toBeTruthy();
    expect(screen.queryByText(UNAVAILABLE.message)).toBeNull();
  });
});
