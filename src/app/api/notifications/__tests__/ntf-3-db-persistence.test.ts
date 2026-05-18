/**
 * @jest-environment node
 *
 * TASK-NTF-03 — DB persistence + NotificationType reconciliation (FND-047)
 *
 * Tests:
 * 1. Cold-start persistence: a notification written through the DB service is
 *    NOT lost when the in-memory Map would normally be discarded.  We verify
 *    this by asserting that `getUserNotifications` calls Supabase (not a Map).
 * 2. Every canonical NotificationType value is accepted by the route POST
 *    without a CHECK-constraint 500.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Supabase mock (chain-builder pattern from notification-service-db.test.ts)
// ---------------------------------------------------------------------------

let mockTerminalResult: any;

function createChain(): any {
  const chain: any = {};
  chain.then = (resolve: (v: any) => any, reject?: (e: any) => any) =>
    Promise.resolve(mockTerminalResult).then(resolve, reject);
  chain.insert = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.single = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  return chain;
}

let lastChain: any;

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: jest.fn(),
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({}) },
  })),
}));

jest.mock("@/lib/auth/api-guard", () => ({
  withAuth: (
    handler: (req: any, user: any) => Promise<any>,
  ) =>
    async (req: any) => {
      const user = { id: "user-ntf3", email: "test@example.com" };
      return handler(req, user);
    },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { notificationServiceDB } from "@/lib/notifications/notification-service-db";
import type { NotificationType } from "@/lib/notifications/notification-service-db";
import { getSupabase } from "@/lib/supabase/client";
import { GET, POST, PATCH, DELETE } from "@/app/api/notifications/route";
import { NextRequest } from "next/server";

const mockGetSupabase = getSupabase as jest.Mock;

function freshSupabase() {
  mockGetSupabase.mockImplementation(() => ({
    from: jest.fn(() => {
      lastChain = createChain();
      return lastChain;
    }),
  }));
}

// ---------------------------------------------------------------------------
// Canonical NotificationType values (must match the DB CHECK constraint)
// ---------------------------------------------------------------------------

const CANONICAL_TYPES: NotificationType[] = [
  "dispute_update",
  "payment_success",
  "document_uploaded",
  "tip",
  "dispute_overdue",
  "dispute_reminder",
  "draft_reminder",
  "score_reminder",
  "subscription_expiring",
  "welcome",
  "system",
];

const sampleRow = {
  id: "notif-ntf3",
  user_id: "user-ntf3",
  type: "dispute_update" as NotificationType,
  title: "Test",
  message: "Test message",
  read: false,
  created_at: "2026-05-18T10:00:00.000Z",
};

// Helper: build a NextRequest with a mocked json() for body delivery.
// NextRequest.json() does not reliably parse the body in the Jest/Node test
// environment — the reference pattern (notifications-crud.test.ts) overrides
// req.json with a jest.fn() that returns the intended payload.
function makePostRequest(url: string, payload: Record<string, unknown>): NextRequest {
  const req = new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  req.json = jest.fn().mockResolvedValue(payload);
  return req;
}

function makePatchRequest(url: string, payload: Record<string, unknown>): NextRequest {
  const req = new NextRequest(url, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  req.json = jest.fn().mockResolvedValue(payload);
  return req;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TASK-NTF-03: DB persistence (cold-start test)", () => {
  beforeEach(() => {
    mockTerminalResult = undefined;
    freshSupabase();
  });

  it("getUserNotifications queries Supabase — not an in-memory Map", async () => {
    // If this uses the Map, getSupabase would never be called.
    // After NTF-3, it must call Supabase.
    mockTerminalResult = { data: [sampleRow], error: null };

    await notificationServiceDB.getUserNotifications("user-ntf3");

    // Supabase was called (not a Map lookup)
    expect(mockGetSupabase).toHaveBeenCalled();
    expect(lastChain.select).toHaveBeenCalledWith("*");
    expect(lastChain.eq).toHaveBeenCalledWith("user_id", "user-ntf3");
  });

  it("createNotification persists via Supabase insert — not an in-memory push", async () => {
    mockTerminalResult = { data: sampleRow, error: null };

    await notificationServiceDB.createNotification(
      "user-ntf3",
      "dispute_update",
      "Title",
      "Message",
    );

    expect(lastChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-ntf3",
        type: "dispute_update",
      }),
    );
  });
});

describe("TASK-NTF-03: Route uses DB service (GET/POST/PATCH/DELETE are async-safe)", () => {
  beforeEach(() => {
    mockTerminalResult = undefined;
    freshSupabase();
  });

  it("GET /api/notifications calls Supabase getUserNotifications", async () => {
    mockTerminalResult = { data: [], error: null };
    // Second chain call for getUnreadCount
    mockGetSupabase.mockImplementation(() => ({
      from: jest.fn(() => {
        lastChain = createChain();
        return lastChain;
      }),
    }));

    const req = new NextRequest("http://localhost/api/notifications");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("notifications");
    expect(body).toHaveProperty("unreadCount");
    // Supabase must have been called (not a Map.get)
    expect(mockGetSupabase).toHaveBeenCalled();
  });

  it("POST /api/notifications with a canonical type calls Supabase insert", async () => {
    mockTerminalResult = { data: sampleRow, error: null };

    const req = makePostRequest("http://localhost/api/notifications", {
      type: "dispute_update",
      title: "Dispute",
      message: "Your dispute was updated",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("notification");
    expect(lastChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "dispute_update" }),
    );
  });

  it("POST /api/notifications rejects unknown type with 400 (genuine type-validation branch)", async () => {
    // "dispute_created" has valid title+message but is not in CANONICAL_TYPES —
    // this must hit the type-validation branch, not the missing-fields branch.
    const req = makePostRequest("http://localhost/api/notifications", {
      type: "dispute_created",    // old in-memory vocabulary — not canonical
      title: "Dispute",
      message: "Created",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid notification type");
  });

  it("PATCH mark_read calls Supabase update (not a Map mutation)", async () => {
    mockTerminalResult = { error: null };

    const req = makePatchRequest("http://localhost/api/notifications", {
      notificationId: "notif-1",
      action: "mark_read",
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(lastChain.update).toHaveBeenCalledWith({ read: true });
    expect(lastChain.eq).toHaveBeenCalledWith("user_id", "user-ntf3");
  });

  it("DELETE calls Supabase delete with ownership filter", async () => {
    mockTerminalResult = { error: null };

    const req = new NextRequest(
      "http://localhost/api/notifications?notificationId=notif-1",
      { method: "DELETE" },
    );

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(lastChain.delete).toHaveBeenCalled();
    expect(lastChain.eq).toHaveBeenCalledWith("user_id", "user-ntf3");
  });
});

describe("TASK-NTF-03: All canonical NotificationType values accepted", () => {
  beforeEach(() => {
    mockTerminalResult = undefined;
    freshSupabase();
  });

  it.each(CANONICAL_TYPES)(
    "canonical type '%s' is accepted by POST without a 400",
    async (type) => {
      const row = { ...sampleRow, type };
      mockTerminalResult = { data: row, error: null };

      const req = makePostRequest("http://localhost/api/notifications", {
        type,
        title: "Title",
        message: "Message",
      });

      const res = await POST(req);
      const body = await res.json();

      // Must not be a 400 (type rejected) or 500 (DB CHECK violation)
      expect(res.status).toBe(200);
      expect(body.notification).toBeDefined();
    },
  );
});
