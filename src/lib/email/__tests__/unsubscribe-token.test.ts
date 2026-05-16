/**
 * @jest-environment node
 */

import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../unsubscribe-token";

describe("unsubscribe-token (FND-011 timing-safe verification)", () => {
  it("verifies a token it generated for the same user", () => {
    const token = generateUnsubscribeToken("user-123");
    expect(verifyUnsubscribeToken(token, "user-123")).toBe(true);
  });

  it("rejects a token for a different user", () => {
    const token = generateUnsubscribeToken("user-123");
    expect(verifyUnsubscribeToken(token, "user-456")).toBe(false);
  });

  it("rejects a tampered token without throwing", () => {
    const token = generateUnsubscribeToken("user-123");
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(() => verifyUnsubscribeToken(tampered, "user-123")).not.toThrow();
    expect(verifyUnsubscribeToken(tampered, "user-123")).toBe(false);
  });

  it("rejects a token of a different length without throwing", () => {
    const token = generateUnsubscribeToken("user-123");
    expect(() => verifyUnsubscribeToken(token + "extra", "user-123")).not.toThrow();
    expect(verifyUnsubscribeToken(token + "extra", "user-123")).toBe(false);
  });
});
