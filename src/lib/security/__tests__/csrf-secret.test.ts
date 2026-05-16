/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({ set: jest.fn(), get: jest.fn() }),
}));

const ENV_BACKUP = { ...process.env };

describe("CSRF secret hard-fail (FND-008)", () => {
  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    jest.resetModules();
  });

  it("throws when CSRF_SECRET is missing in production", () => {
    jest.resetModules();
    process.env = { ...ENV_BACKUP, NODE_ENV: "production" };
    delete process.env.CSRF_SECRET;

    const { generateCSRFToken } = require("../csrf");
    expect(() => generateCSRFToken()).toThrow(/CSRF_SECRET/);
  });

  it("does not throw in development when CSRF_SECRET is missing", () => {
    jest.resetModules();
    process.env = { ...ENV_BACKUP, NODE_ENV: "development" };
    delete process.env.CSRF_SECRET;

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { generateCSRFToken } = require("../csrf");
    expect(() => generateCSRFToken()).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("does not throw in production when CSRF_SECRET is set", () => {
    jest.resetModules();
    process.env = {
      ...ENV_BACKUP,
      NODE_ENV: "production",
      CSRF_SECRET: "a-real-production-secret-value",
    };

    const { generateCSRFToken } = require("../csrf");
    expect(() => generateCSRFToken()).not.toThrow();
  });
});
