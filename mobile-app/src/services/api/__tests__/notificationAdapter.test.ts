/**
 * mapWebNotification — web -> mobile notification adapter (PARITY-P1).
 *
 * The real web route returns notifications with `message` and a broader type
 * enum than the mobile Notification type (`body` + a smaller enum). This adapter
 * bridges them; getting the enum map wrong ships blank/mis-iconed notifications.
 */

// Stub the module's side-effecting imports so user.ts loads in isolation.
jest.mock("../client", () => ({ api: {} }));
jest.mock("../../offline-sync", () => ({ offlineSyncService: {} }));

import { mapWebNotification } from "../user";

const base = {
  id: "n1",
  title: "Title",
  message: "hello world",
  read: false,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("mapWebNotification", () => {
  it("maps message -> body and preserves the core fields", () => {
    const m = mapWebNotification({ ...base, type: "system" });
    expect(m.body).toBe("hello world");
    expect(m.id).toBe("n1");
    expect(m.title).toBe("Title");
    expect(m.read).toBe(false);
    expect(m.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("collapses the web type enum onto the mobile enum", () => {
    const t = (type: string) => mapWebNotification({ ...base, type }).type;
    expect(t("dispute_update")).toBe("dispute_update");
    expect(t("dispute_overdue")).toBe("dispute_update");
    expect(t("dispute_reminder")).toBe("dispute_update");
    expect(t("draft_reminder")).toBe("dispute_update");
    expect(t("payment_success")).toBe("payment");
    expect(t("subscription_expiring")).toBe("payment");
    expect(t("score_reminder")).toBe("score_change");
    expect(t("tip")).toBe("recommendation");
    expect(t("document_uploaded")).toBe("alert");
    expect(t("welcome")).toBe("system");
    expect(t("system")).toBe("system");
  });

  it("falls back to 'system' for an unknown/new web type", () => {
    expect(mapWebNotification({ ...base, type: "brand_new_type" }).type).toBe(
      "system",
    );
  });

  it("defaults userId to an empty string when the web payload omits it", () => {
    expect(mapWebNotification({ ...base, type: "system" }).userId).toBe("");
    expect(
      mapWebNotification({ ...base, type: "system", userId: "u9" }).userId,
    ).toBe("u9");
  });
});
