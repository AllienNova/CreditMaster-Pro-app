/**
 * @jest-environment node
 *
 * AUTH-04 — Edge-safe feature-flag reader (`isFlagEnabledEdge`).
 */

import { isFlagEnabledEdge, __clearEdgeFlagCache } from "@/lib/flags/edge";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  __clearEdgeFlagCache();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  jest.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function mockFetch(impl: () => Promise<Response>) {
  global.fetch = jest.fn(impl) as unknown as typeof fetch;
}

describe("isFlagEnabledEdge", () => {
  it("returns true when the flag row is enabled", async () => {
    mockFetch(async () =>
      new Response(JSON.stringify([{ enabled: true }]), { status: 200 }),
    );
    expect(await isFlagEnabledEdge("auth.deny_by_default")).toBe(true);
  });

  it("returns false when the flag row is disabled", async () => {
    mockFetch(async () =>
      new Response(JSON.stringify([{ enabled: false }]), { status: 200 }),
    );
    expect(await isFlagEnabledEdge("auth.deny_by_default")).toBe(false);
  });

  it("returns false when no flag row exists", async () => {
    mockFetch(async () => new Response(JSON.stringify([]), { status: 200 }));
    expect(await isFlagEnabledEdge("auth.deny_by_default")).toBe(false);
  });

  it("fails safe (false) when env is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(await isFlagEnabledEdge("auth.deny_by_default")).toBe(false);
  });

  it("fails safe (false) on a non-OK HTTP response", async () => {
    mockFetch(async () => new Response("err", { status: 500 }));
    expect(await isFlagEnabledEdge("auth.deny_by_default")).toBe(false);
  });

  it("fails safe (false) on a network error", async () => {
    mockFetch(async () => {
      throw new Error("network down");
    });
    expect(await isFlagEnabledEdge("auth.deny_by_default")).toBe(false);
  });

  it("fails safe (false) when the row shape is malformed", async () => {
    mockFetch(async () =>
      new Response(JSON.stringify([{ enabled: "yes" }]), { status: 200 }),
    );
    expect(await isFlagEnabledEdge("auth.deny_by_default")).toBe(false);
  });

  it("sends the service-role key as apikey and bearer auth", async () => {
    const fetchSpy = jest.fn(async () =>
      new Response(JSON.stringify([{ enabled: true }]), { status: 200 }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    await isFlagEnabledEdge("auth.deny_by_default");

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/rest/v1/feature_flags?key=eq.");
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe("service-role-key");
    expect(headers.Authorization).toBe("Bearer service-role-key");
  });

  it("caches within the TTL window (single fetch for repeated reads)", async () => {
    const fetchSpy = jest.fn(async () =>
      new Response(JSON.stringify([{ enabled: true }]), { status: 200 }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    await isFlagEnabledEdge("auth.deny_by_default");
    await isFlagEnabledEdge("auth.deny_by_default");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
