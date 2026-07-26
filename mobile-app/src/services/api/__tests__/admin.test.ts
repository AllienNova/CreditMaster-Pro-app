/**
 * Fynvita Admin Analytics API Service Tests
 *
 * adminAnalyticsApi.getAnalytics hits the real admin-guarded route
 * (GET /api/admin/analytics?range=). These tests pin the endpoint + range query for
 * every supported range and prove a failed request is passed straight through
 * without fabricating analytics.
 */

import {
  adminAnalyticsApi,
  ANALYTICS_RANGES,
  adminDisputesApi,
  mapAdminDispute,
  ADMIN_DISPUTE_STATUSES,
  adminHealthApi,
  mapWebServiceHealth,
  mapWebSystemHealth,
  SERVICE_HEALTH_STATUSES,
} from "../admin";
import type {
  AdminAnalytics,
  AdminDisputeRow,
  WebSystemHealth,
} from "../admin";
import { api } from "../client";

jest.mock("../client", () => ({
  api: {
    get: jest.fn(),
  },
}));

const realAnalytics: AdminAnalytics = {
  userGrowth: [{ date: "Jul 1", count: 12 }],
  revenueByMonth: [{ month: "Jul", revenue: 7000 }],
  disputesByStatus: [{ status: "resolved", count: 8 }],
  subscriptionsByTier: [{ tier: "pro", count: 5 }],
  topFeatures: [{ feature: "Dispute Letters", usage: 11 }],
  timeRange: "30d",
};

describe("adminAnalyticsApi.getAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the real admin route with the given range", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: realAnalytics,
    });

    const res = await adminAnalyticsApi.getAnalytics("30d");

    expect(api.get).toHaveBeenCalledWith("/admin/analytics?range=30d");
    expect(res.data).toEqual(realAnalytics);
  });

  it("puts each supported range in the query string", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      success: true,
      data: realAnalytics,
    });

    for (const r of ANALYTICS_RANGES) {
      await adminAnalyticsApi.getAnalytics(r);
      expect(api.get).toHaveBeenCalledWith(`/admin/analytics?range=${r}`);
    }
    expect(api.get).toHaveBeenCalledTimes(ANALYTICS_RANGES.length);
  });

  it("passes a failed request through without fabricating analytics", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    const res = await adminAnalyticsApi.getAnalytics("30d");

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Forbidden");
  });
});

describe("mapAdminDispute", () => {
  const row: AdminDisputeRow = {
    id: "dsp-1",
    user_email: "owner@fynvita.test",
    bureau: "transunion",
    status: "under_review",
    item_type: "collection",
    created_at: "2026-07-01T09:15:00.000Z",
  };

  it("maps every real column/enrichment onto the display model", () => {
    const m = mapAdminDispute(row);
    expect(m.id).toBe("dsp-1");
    expect(m.user).toBe("owner@fynvita.test");
    expect(m.type).toBe("collection");
  });

  it("prettifies the bureau CHECK value to its brand label", () => {
    expect(mapAdminDispute({ ...row, bureau: "experian" }).bureau).toBe(
      "Experian",
    );
    expect(mapAdminDispute({ ...row, bureau: "equifax" }).bureau).toBe(
      "Equifax",
    );
    expect(mapAdminDispute({ ...row, bureau: "transunion" }).bureau).toBe(
      "TransUnion",
    );
  });

  it("capitalizes an unrecognized bureau instead of dropping it", () => {
    expect(mapAdminDispute({ ...row, bureau: "innovis" }).bureau).toBe(
      "Innovis",
    );
  });

  it("passes the real status enum straight through (no remapping)", () => {
    for (const s of ADMIN_DISPUTE_STATUSES) {
      expect(mapAdminDispute({ ...row, status: s }).status).toBe(s);
    }
  });

  it("trims the created_at timestamp to a plain date", () => {
    expect(mapAdminDispute(row).created).toBe("2026-07-01");
    // A date-only value (no 'T') is returned unchanged.
    expect(mapAdminDispute({ ...row, created_at: "2026-07-01" }).created).toBe(
      "2026-07-01",
    );
  });

  it("substitutes empty values for missing fields, never fabricating", () => {
    const m = mapAdminDispute({ id: "dsp-2" });
    expect(m.id).toBe("dsp-2");
    expect(m.user).toBe("Unknown");
    expect(m.bureau).toBe("");
    expect(m.status).toBe("");
    expect(m.type).toBe("");
    expect(m.created).toBe("");
  });
});

describe("adminDisputesApi.getDisputes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the real admin route and adapts each row", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        disputes: [
          {
            id: "dsp-1",
            user_email: "owner@fynvita.test",
            bureau: "equifax",
            status: "sent",
            item_type: "late_payment",
            created_at: "2026-06-15T00:00:00.000Z",
          },
        ],
        total: 1,
      },
    });

    const res = await adminDisputesApi.getDisputes();

    expect(api.get).toHaveBeenCalledWith("/admin/disputes");
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0]).toEqual({
      id: "dsp-1",
      user: "owner@fynvita.test",
      bureau: "Equifax",
      status: "sent",
      type: "late_payment",
      created: "2026-06-15",
    });
  });

  it("returns an empty list when disputes is not an array", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { total: 0 },
    });

    const res = await adminDisputesApi.getDisputes();

    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  it("passes a failed request through without fabricating disputes", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    const res = await adminDisputesApi.getDisputes();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Forbidden");
  });
});

describe("mapWebServiceHealth", () => {
  it("renames service -> name and forwards a real detail", () => {
    const m = mapWebServiceHealth({
      service: "Stripe",
      status: "down",
      detail: "Stripe API error",
    });
    expect(m).toEqual({
      name: "Stripe",
      status: "down",
      detail: "Stripe API error",
    });
  });

  it("preserves unknown and degraded — never coerces them to healthy", () => {
    // `unknown` = unconfigured / cannot assess; must stay amber-honest, not green.
    expect(mapWebServiceHealth({ service: "AIML", status: "unknown" }).status).toBe(
      "unknown",
    );
    expect(
      mapWebServiceHealth({ service: "Plaid", status: "degraded" }).status,
    ).toBe("degraded");
  });

  it("passes every real status enum straight through", () => {
    for (const s of SERVICE_HEALTH_STATUSES) {
      expect(mapWebServiceHealth({ service: "X", status: s }).status).toBe(s);
    }
  });

  it("degrades an unrecognized or missing status to unknown, never healthy", () => {
    expect(mapWebServiceHealth({ service: "X", status: "operational" }).status).toBe(
      "unknown",
    );
    expect(mapWebServiceHealth({ service: "X", status: "up" }).status).toBe(
      "unknown",
    );
    expect(mapWebServiceHealth({ service: "X" }).status).toBe("unknown");
    // A poisoned prototype key must never resolve to a truthy status.
    expect(
      mapWebServiceHealth({ service: "X", status: "constructor" }).status,
    ).toBe("unknown");
  });

  it("substitutes an empty name for a missing service, and omits an absent detail", () => {
    const m = mapWebServiceHealth({ status: "healthy" });
    expect(m.name).toBe("");
    expect(m.status).toBe("healthy");
    expect("detail" in m).toBe(false);
  });
});

describe("mapWebSystemHealth", () => {
  it("maps the overall status, checkedAt, and each service", () => {
    const raw: WebSystemHealth = {
      status: "down",
      checkedAt: "2026-07-25T10:00:00.000Z",
      services: [
        { service: "Supabase", status: "healthy" },
        { service: "Stripe", status: "down", detail: "probe timed out" },
        { service: "AIML", status: "unknown", detail: "not configured" },
      ],
    };
    const m = mapWebSystemHealth(raw);
    expect(m.status).toBe("down");
    expect(m.checkedAt).toBe("2026-07-25T10:00:00.000Z");
    expect(m.services).toEqual([
      { name: "Supabase", status: "healthy" },
      { name: "Stripe", status: "down", detail: "probe timed out" },
      { name: "AIML", status: "unknown", detail: "not configured" },
    ]);
  });

  it("degrades a missing overall status to unknown and absent checkedAt to empty", () => {
    const m = mapWebSystemHealth({ services: [] });
    expect(m.status).toBe("unknown");
    expect(m.checkedAt).toBe("");
    expect(m.services).toEqual([]);
  });

  it("returns an empty service list when services is not an array", () => {
    const m = mapWebSystemHealth({ status: "healthy" });
    expect(m.services).toEqual([]);
  });
});

describe("adminHealthApi.getSystemHealth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the real admin health route and adapts the payload", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        status: "down",
        checkedAt: "2026-07-25T10:00:00.000Z",
        services: [
          { service: "Supabase", status: "healthy" },
          { service: "Stripe", status: "down", detail: "Stripe API error" },
          { service: "AIML", status: "unknown", detail: "not configured" },
        ],
      },
    });

    const res = await adminHealthApi.getSystemHealth();

    expect(api.get).toHaveBeenCalledWith("/admin/health");
    expect(res.success).toBe(true);
    expect(res.data?.status).toBe("down");
    // Real statuses survive the round-trip — unknown/down never laundered green.
    expect(res.data?.services.map((s) => s.status)).toEqual([
      "healthy",
      "down",
      "unknown",
    ]);
    expect(res.data?.services[1]).toEqual({
      name: "Stripe",
      status: "down",
      detail: "Stripe API error",
    });
  });

  it("passes a failed request through without fabricating health", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_403", message: "Forbidden" },
    });

    const res = await adminHealthApi.getSystemHealth();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Forbidden");
  });
});
