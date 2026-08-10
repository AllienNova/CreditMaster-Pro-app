/**
 * Tests for RedisCacheService.ping().
 *
 * The distinction this method exists to preserve is "not configured" vs
 * "configured and failing". The pre-existing `redisRequest()` helper collapses
 * both into `null`, and a health check built on that would report a broken
 * Redis identically to an absent one — the fabricated-status pattern this
 * codebase keeps producing (gap-analysis.md G-012).
 */

const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

describe("RedisCacheService.ping", () => {
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  const load = async () => {
    jest.resetModules();
    return import("../redis-cache-service");
  };

  it("reports configured:false when credentials are absent — not an error", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { RedisCacheService } = await load();
    const result = await new RedisCacheService().ping();

    expect(result).toEqual({ configured: false, ok: false });
  });

  it("does not attempt a network call when unconfigured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const fetchSpy = jest.spyOn(global, "fetch");

    const { RedisCacheService } = await load();
    await new RedisCacheService().ping();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports ok when Redis answers PONG", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result: "PONG" }),
    } as Response);

    const { RedisCacheService } = await load();

    await expect(new RedisCacheService().ping()).resolves.toEqual({
      configured: true,
      ok: true,
    });
  });

  it("is configured-but-not-ok on a non-2xx response", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: false, status: 500 } as Response);

    const { RedisCacheService } = await load();
    const result = await new RedisCacheService().ping();

    // The pair (configured, ok) is the whole point: an operator can tell a
    // missing Redis from a broken one.
    expect(result.configured).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("500");
  });

  it("is configured-but-not-ok when the request rejects", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("ETIMEDOUT"));

    const { RedisCacheService } = await load();
    const result = await new RedisCacheService().ping();

    expect(result).toEqual({
      configured: true,
      ok: false,
      error: "ETIMEDOUT",
    });
  });

  it("is not ok when the body is not PONG", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result: "something else" }),
    } as Response);

    const { RedisCacheService } = await load();

    await expect(new RedisCacheService().ping()).resolves.toMatchObject({
      configured: true,
      ok: false,
    });
  });
});
