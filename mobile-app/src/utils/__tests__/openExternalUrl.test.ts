/**
 * Tests for openExternalUrl — scheme allowlist enforcement (FND-070)
 *
 * Contract:
 *   - Allowed schemes: https:, mailto:, tel:
 *   - Rejected schemes: javascript:, file:, data:, and any unlisted scheme
 *   - Never throws on bad input; returns false and logs a warning
 *   - Returns true and calls Linking.openURL for allowed schemes
 */

import { Linking } from "react-native";
import { openExternalUrl } from "../openExternalUrl";

jest.mock("react-native/Libraries/Linking/Linking", () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

const mockOpenURL = Linking.openURL as jest.Mock;

describe("openExternalUrl", () => {
  beforeEach(() => {
    mockOpenURL.mockClear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("allowed schemes", () => {
    it("accepts https: URL and calls Linking.openURL", async () => {
      const result = await openExternalUrl("https://fynvita.pro/support");
      expect(result).toBe(true);
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
      expect(mockOpenURL).toHaveBeenCalledWith("https://fynvita.pro/support");
    });

    it("accepts mailto: URL and calls Linking.openURL", async () => {
      const result = await openExternalUrl("mailto:support@fynvita.pro");
      expect(result).toBe(true);
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
      expect(mockOpenURL).toHaveBeenCalledWith("mailto:support@fynvita.pro");
    });

    it("accepts tel: URL and calls Linking.openURL", async () => {
      const result = await openExternalUrl("tel:+18001234567");
      expect(result).toBe(true);
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
      expect(mockOpenURL).toHaveBeenCalledWith("tel:+18001234567");
    });

    it("is case-insensitive for scheme matching", async () => {
      const result = await openExternalUrl("HTTPS://fynvita.pro");
      expect(result).toBe(true);
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
    });

    it("handles leading whitespace in URL", async () => {
      const result = await openExternalUrl("  https://fynvita.pro  ");
      expect(result).toBe(true);
      expect(mockOpenURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("rejected schemes", () => {
    it("rejects javascript: scheme and returns false", async () => {
      const result = await openExternalUrl("javascript:alert(1)");
      expect(result).toBe(false);
      expect(mockOpenURL).not.toHaveBeenCalled();
    });

    it("rejects file: scheme and returns false", async () => {
      const result = await openExternalUrl("file:///etc/passwd");
      expect(result).toBe(false);
      expect(mockOpenURL).not.toHaveBeenCalled();
    });

    it("rejects data: scheme and returns false", async () => {
      const result = await openExternalUrl(
        "data:text/html,<script>alert(1)</script>",
      );
      expect(result).toBe(false);
      expect(mockOpenURL).not.toHaveBeenCalled();
    });

    it("rejects http: (non-https) scheme and returns false", async () => {
      const result = await openExternalUrl("http://example.com");
      expect(result).toBe(false);
      expect(mockOpenURL).not.toHaveBeenCalled();
    });

    it("rejects unknown custom scheme and returns false", async () => {
      const result = await openExternalUrl("myapp://deep-link");
      expect(result).toBe(false);
      expect(mockOpenURL).not.toHaveBeenCalled();
    });

    it("logs a console.warn when scheme is rejected", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      await openExternalUrl("javascript:void(0)");
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("edge cases — must not throw", () => {
    it("returns false for an empty string without throwing", async () => {
      const result = await openExternalUrl("");
      expect(result).toBe(false);
      expect(mockOpenURL).not.toHaveBeenCalled();
    });

    it("returns false for a non-URL string without throwing", async () => {
      const result = await openExternalUrl("not a url at all");
      expect(result).toBe(false);
      expect(mockOpenURL).not.toHaveBeenCalled();
    });

    it("returns false for null-like coercion without throwing", async () => {
      const result = await openExternalUrl("null");
      expect(result).toBe(false);
      expect(mockOpenURL).not.toHaveBeenCalled();
    });
  });
});
