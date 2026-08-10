/**
 * Regression tests for the logger.
 *
 * These exist because of a specific defect: `log()` built the entry, filtered
 * it by level, serialized the error, formatted it — and then did
 * `void formatted;`. Every message was discarded, in every environment, while
 * ten modules called it and eight had no other output path. Payments and auth
 * produced no diagnostic output at all on failure.
 *
 * So the assertions below are deliberately about EMISSION, not formatting. A
 * test that only checked the shape of a formatted string would have passed
 * against the broken version, since the string was built correctly right up to
 * the point it was thrown away.
 */

describe("logger", () => {
  const spies: jest.SpyInstance[] = [];

  const capture = () => {
    const s = {
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
      warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
      info: jest.spyOn(console, "info").mockImplementation(() => {}),
      debug: jest.spyOn(console, "debug").mockImplementation(() => {}),
    };
    spies.push(s.error, s.warn, s.info, s.debug);
    return s;
  };

  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    spies.length = 0;
    jest.resetModules();
  });

  it("actually emits an error — the whole point of the regression", async () => {
    const c = capture();
    const { logger } = await import("../logger");

    logger.error("payment capture failed", new Error("card_declined"));

    expect(c.error).toHaveBeenCalledTimes(1);
    expect(String(c.error.mock.calls[0][0])).toContain("payment capture failed");
  });

  it("carries the error's name and message into the output", async () => {
    const c = capture();
    const { logger } = await import("../logger");

    logger.error("charge failed", new Error("card_declined"));

    const out = String(c.error.mock.calls[0][0]);
    expect(out).toContain("card_declined");
  });

  it("includes structured context", async () => {
    const c = capture();
    const { logger } = await import("../logger");

    logger.error("charge failed", new Error("boom"), { orderId: "ord_123" });

    expect(String(c.error.mock.calls[0][0])).toContain("ord_123");
  });

  it("routes each level to its own console method", async () => {
    const c = capture();
    const { logger } = await import("../logger");

    logger.error("e", new Error("x"));
    logger.warn("w");
    logger.info("i");

    expect(c.error).toHaveBeenCalledTimes(1);
    expect(c.warn).toHaveBeenCalledTimes(1);
    expect(c.info).toHaveBeenCalledTimes(1);
    // A single console.log for everything would defeat platform log levels.
    expect(c.warn.mock.calls[0][0]).not.toEqual(c.error.mock.calls[0][0]);
  });

  it("routes fatal to console.error", async () => {
    const c = capture();
    const { logger } = await import("../logger");

    logger.fatal("process dying", new Error("oom"));

    expect(c.error).toHaveBeenCalledTimes(1);
    expect(String(c.error.mock.calls[0][0])).toContain("process dying");
  });

  it("emits a single line of parseable JSON in production", async () => {
    const prev = process.env.NODE_ENV;
    // NODE_ENV is readonly in the Next.js type defs; the runtime value is what
    // the logger reads, and this is the only way to exercise that branch.
    (process.env as Record<string, string>).NODE_ENV = "production";
    jest.resetModules();

    const c = capture();
    const { logger } = await import("../logger");

    logger.error("prod line", new Error("card_declined"), { orderId: "o1" });

    const raw = String(c.error.mock.calls[0][0]);
    expect(raw).not.toContain("\n"); // aggregators split on newlines
    const parsed = JSON.parse(raw);
    expect(parsed).toMatchObject({
      level: "error",
      message: "prod line",
      context: { orderId: "o1" },
      error: { name: "Error", message: "card_declined" },
    });

    (process.env as Record<string, string>).NODE_ENV = prev as string;
  });

  it("routes debug to console.debug when LOG_LEVEL permits it", async () => {
    const prev = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "debug";
    jest.resetModules();

    const c = capture();
    const { logger } = await import("../logger");

    logger.debug("cache miss", { key: "user:1" });

    expect(c.debug).toHaveBeenCalledTimes(1);
    expect(String(c.debug.mock.calls[0][0])).toContain("cache miss");

    if (prev === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = prev;
  });

  it("suppresses debug when the level floor is higher", async () => {
    const prev = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "warn";
    jest.resetModules();

    const c = capture();
    const { logger } = await import("../logger");

    logger.debug("should not appear");
    logger.warn("should appear");

    expect(c.debug).not.toHaveBeenCalled();
    expect(c.warn).toHaveBeenCalledTimes(1);

    if (prev === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = prev;
  });

  it("does not throw when no Error is supplied", async () => {
    const c = capture();
    const { logger } = await import("../logger");

    expect(() => logger.error("no error object")).not.toThrow();
    expect(c.error).toHaveBeenCalledTimes(1);
  });
});
