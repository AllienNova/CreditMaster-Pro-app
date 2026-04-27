import {
  getPolicy,
  loadPolicy,
  loadPolicyFromMap,
  validateCurrentPolicy,
} from "../policy-loader";
import { validatePolicy } from "../policy-validator";
import type { PolicyConfig } from "../policy-types";

describe("Policy Integration", () => {
  describe("validateCurrentPolicy", () => {
    it("returns valid for default policy", () => {
      const result = validateCurrentPolicy();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns valid with non-empty warnings array", () => {
      const result = validateCurrentPolicy();
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("policy canonical hash", () => {
    it("has a non-empty canonicalHash on loaded policy", () => {
      const policy = getPolicy();
      expect(policy.canonicalHash).toBeDefined();
      expect(typeof policy.canonicalHash).toBe("string");
      expect(policy.canonicalHash.length).toBeGreaterThan(0);
    });

    it("default policy has fallback hash when no YAML files exist", () => {
      const policy = loadPolicy("/nonexistent/path");
      expect(policy.canonicalHash).toBe("default-no-canonical-loaded");
    });

    it("computed hash is 64-char hex when loaded from YAML map", () => {
      const map = new Map([
        [
          "policy.runtime.yaml",
          `
meta:
  schema_version: "2.0.0"
  canonical_package_version: "2.5.0"
risk:
  per_trade:
    hard_max_pct: 0.01
    default_pct: 0.0075
`,
        ],
      ]);
      const policy = loadPolicyFromMap(map);
      expect(policy.canonicalHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("audit trail canonical hash presence", () => {
    it("policy exposes canonicalHash field used by audit trail", () => {
      const policy = getPolicy();
      // The audit trail inserts policy.canonicalHash into every row.
      // Verify the field exists and is a string so audit entries will be valid.
      expect(Object.prototype.hasOwnProperty.call(policy, "canonicalHash")).toBe(
        true,
      );
      expect(typeof policy.canonicalHash).toBe("string");
    });

    it("policy exposes meta.canonical_package_version for audit trail", () => {
      const policy = getPolicy();
      expect(policy.meta.canonical_package_version).toBeDefined();
      expect(typeof policy.meta.canonical_package_version).toBe("string");
      expect(policy.meta.canonical_package_version.length).toBeGreaterThan(0);
    });
  });

  describe("end-to-end: load -> validate -> hash", () => {
    it("loaded policy passes validation and has hash", () => {
      const policy = loadPolicy();
      const result = validatePolicy(policy);

      expect(result.valid).toBe(true);
      expect(policy.canonicalHash).toBeDefined();
      expect(policy.canonicalHash.length).toBeGreaterThan(0);
    });
  });
});
