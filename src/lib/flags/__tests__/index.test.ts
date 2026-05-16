/** @jest-environment node */
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
const mockFrom = jest.fn();
jest.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: mockFrom }) }));
import { isFlagEnabled, __clearFlagCache, __setNow } from "../index";

const ok = (enabled: boolean) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { key: "x", enabled }, error: null }) }) }),
});

describe("isFlagEnabled", () => {
  beforeEach(() => { jest.clearAllMocks(); __clearFlagCache(); __setNow(() => 1_000); });

  it("returns the flag value from the database", async () => {
    mockFrom.mockReturnValue(ok(true));
    expect(await isFlagEnabled("auth.deny_by_default")).toBe(true);
  });
  it("defaults to false when the flag row is missing", async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ single: () =>
      Promise.resolve({ data: null, error: { code: "PGRST116" } }) }) }) });
    expect(await isFlagEnabled("auth.deny_by_default")).toBe(false);
  });
  it("throws when the database returns a non-PGRST116 error", async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ single: () =>
      Promise.resolve({ data: null, error: { code: "42501", message: "permission denied" } }) }) }) });
    await expect(isFlagEnabled("auth.deny_by_default")).rejects.toMatchObject({ code: "42501" });
  });
  it("caches within the TTL (second call does not hit the database)", async () => {
    mockFrom.mockReturnValue(ok(true));
    await isFlagEnabled("webhooks.enabled");
    __setNow(() => 1_500);
    await isFlagEnabled("webhooks.enabled");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
  it("re-reads after the TTL expires", async () => {
    mockFrom.mockReturnValue(ok(true));
    await isFlagEnabled("payouts.enabled");
    __setNow(() => 2_500);
    await isFlagEnabled("payouts.enabled");
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
