/** @jest-environment node */
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
const mockFrom = jest.fn();
jest.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: mockFrom }) }));
import { assertFlagsReachable } from "../assert-reachable";

describe("assertFlagsReachable", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws a clear error when the Supabase call rejects", async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ single: () =>
      Promise.reject(new Error("invalid api key")) }) }) });
    await expect(assertFlagsReachable()).rejects.toThrow(/Feature-flag store unreachable/);
  });

  it("resolves when the flag store is reachable", async () => {
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ single: () =>
      Promise.resolve({ data: { key: "webhooks.enabled", enabled: true }, error: null }) }) }) });
    await expect(assertFlagsReachable()).resolves.toBeUndefined();
  });
});
