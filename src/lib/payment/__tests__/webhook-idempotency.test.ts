/** @jest-environment node */
const mockRpc = jest.fn();
jest.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc: mockRpc }) }));

import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
} from "../webhook-idempotency";

describe("wbh-phase2: webhook idempotency helper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isWebhookEventProcessed", () => {
    it("returns true when the RPC reports the event was processed", async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      expect(await isWebhookEventProcessed("stripe", "evt_1")).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("is_webhook_event_processed", {
        p_provider: "stripe",
        p_event_id: "evt_1",
      });
    });

    it("returns false when the RPC reports the event was not processed", async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });
      expect(await isWebhookEventProcessed("stripe", "evt_2")).toBe(false);
    });

    it("throws when the check RPC errors (fail loud → route 400 → provider retries)", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "db down" } });
      await expect(isWebhookEventProcessed("stripe", "evt_3")).rejects.toThrow(
        "db down",
      );
    });

    it("throws on ambiguous null data with no error (never silently treats it as not-processed)", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      await expect(isWebhookEventProcessed("stripe", "evt_6")).rejects.toThrow(
        "returned null",
      );
    });
  });

  describe("markWebhookEventProcessed", () => {
    it("calls the mark RPC with the provider and event id", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      await markWebhookEventProcessed("stripe", "evt_4");
      expect(mockRpc).toHaveBeenCalledWith("mark_webhook_event_processed", {
        p_provider: "stripe",
        p_event_id: "evt_4",
      });
    });

    it("throws when the mark RPC errors (fail loud → route 400 → provider retries)", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "insert failed" } });
      await expect(markWebhookEventProcessed("stripe", "evt_5")).rejects.toThrow(
        "insert failed",
      );
    });
  });
});
