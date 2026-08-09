/**
 * Fynvita Mobile Activity API Service Tests
 *
 * activityApi.getActivity hits the real authed route (GET /api/activity) and
 * adapts each notifications-backed item onto the mobile ActivityItem shape. These
 * tests pin the endpoint, prove every pinned field maps, an unrecognized `type`
 * degrades to the neutral `other` bucket (never a fabricated category), missing
 * fields fall back to an empty/false floor (never invented), `read` is honored only
 * when the payload literally says so, and a failed request passes straight through
 * without fabricating a feed.
 */

import { activityApi, mapWebActivity, ACTIVITY_TYPES } from "../activity";
import type { WebActivity } from "../activity";
import { api } from "../client";

jest.mock("../client", () => ({
  api: {
    get: jest.fn(),
  },
}));

const raw: WebActivity = {
  id: "act-1",
  type: "dispute_update",
  title: "Dispute updated",
  message: "Your Equifax dispute moved to under review",
  createdAt: "2026-07-01T09:15:00.000Z",
  read: false,
};

describe("mapWebActivity", () => {
  it("maps every pinned field onto the mobile shape", () => {
    expect(mapWebActivity(raw)).toEqual({
      id: "act-1",
      type: "dispute_update",
      title: "Dispute updated",
      message: "Your Equifax dispute moved to under review",
      createdAt: "2026-07-01T09:15:00.000Z",
      read: false,
    });
  });

  it("passes every real type straight through", () => {
    for (const t of ACTIVITY_TYPES) {
      expect(mapWebActivity({ ...raw, type: t }).type).toBe(t);
    }
  });

  it("degrades an unrecognized or missing type to `other`, never fabricating a category", () => {
    // Values the notifications table might carry that are NOT in the contract.
    expect(mapWebActivity({ ...raw, type: "score_change" }).type).toBe("other");
    expect(mapWebActivity({ ...raw, type: "system" }).type).toBe("other");
    expect(mapWebActivity({ ...raw, type: undefined }).type).toBe("other");
    // A poisoned prototype key must never resolve to a truthy type.
    expect(mapWebActivity({ ...raw, type: "constructor" }).type).toBe("other");
  });

  it("substitutes empty strings for missing title/message/createdAt, never fabricating", () => {
    const m = mapWebActivity({ id: "act-2" });
    expect(m.id).toBe("act-2");
    expect(m.type).toBe("other");
    expect(m.title).toBe("");
    expect(m.message).toBe("");
    expect(m.createdAt).toBe("");
    expect(m.read).toBe(false);
  });

  it("marks an item read only when the payload literally says so", () => {
    expect(mapWebActivity({ ...raw, read: true }).read).toBe(true);
    expect(mapWebActivity({ ...raw, read: false }).read).toBe(false);
    expect(mapWebActivity({ ...raw, read: undefined }).read).toBe(false);
  });
});

describe("activityApi.getActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests the real /activity route and adapts each item", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        activities: [
          raw,
          {
            id: "act-3",
            type: "tip",
            title: "Boost your score",
            message: "Keep utilization under 30%",
            createdAt: "2026-07-02T12:00:00.000Z",
            read: true,
          },
        ],
      },
    });

    const res = await activityApi.getActivity();

    expect(api.get).toHaveBeenCalledWith("/activity");
    expect(res.success).toBe(true);
    expect(res.data?.activities).toHaveLength(2);
    expect(res.data?.activities[0].type).toBe("dispute_update");
    expect(res.data?.activities[1]).toEqual({
      id: "act-3",
      type: "tip",
      title: "Boost your score",
      message: "Keep utilization under 30%",
      createdAt: "2026-07-02T12:00:00.000Z",
      read: true,
    });
  });

  it("returns an empty list when activities is not an array", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {},
    });

    const res = await activityApi.getActivity();

    expect(res.success).toBe(true);
    expect(res.data?.activities).toEqual([]);
  });

  it("returns an empty list for an honest empty feed", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { activities: [] },
    });

    const res = await activityApi.getActivity();

    expect(res.success).toBe(true);
    expect(res.data?.activities).toEqual([]);
  });

  it("passes a failed request through without fabricating a feed", async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { code: "HTTP_401", message: "Unauthorized" },
    });

    const res = await activityApi.getActivity();

    expect(res.success).toBe(false);
    expect(res.data).toBeUndefined();
    expect(res.error?.message).toBe("Unauthorized");
  });
});
