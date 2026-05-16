/** @jest-environment node */
const mockFrom = jest.fn();
jest.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: mockFrom }) }));
import { resolveRoleFromDb, __clearRoleCache, __setNow } from "../resolve-role";

const profile = (role: string | null) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { role }, error: null }) }) }),
});

describe("resolveRoleFromDb", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearRoleCache();
    __setNow(() => 1_000);
  });

  it("returns the role from the profiles table", async () => {
    mockFrom.mockReturnValue(profile("admin"));
    expect(await resolveRoleFromDb("u1")).toBe("admin");
  });
  it("defaults to 'user' when the profile has no role", async () => {
    mockFrom.mockReturnValue(profile(null));
    expect(await resolveRoleFromDb("u1")).toBe("user");
  });
  it("defaults to 'user' on an unknown role value (never trusts arbitrary strings)", async () => {
    mockFrom.mockReturnValue(profile("hacker"));
    expect(await resolveRoleFromDb("u1")).toBe("user");
  });
  it("caches per userId within the TTL (one DB call for repeated lookups)", async () => {
    mockFrom.mockReturnValue(profile("admin"));
    await resolveRoleFromDb("u1");
    __setNow(() => 6_000); // +5s, within 15s TTL
    await resolveRoleFromDb("u1");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
  it("re-reads after the TTL expires (bounds demotion staleness)", async () => {
    mockFrom.mockReturnValue(profile("admin"));
    await resolveRoleFromDb("u1");
    __setNow(() => 20_000); // +19s, past 15s TTL
    await resolveRoleFromDb("u1");
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });
});
