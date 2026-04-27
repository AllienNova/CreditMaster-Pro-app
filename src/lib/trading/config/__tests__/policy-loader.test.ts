import {
  loadPolicy,
  loadPolicyFromMap,
  getPolicy,
  reloadPolicy,
} from "../policy-loader";
import { computeCanonicalHash } from "../canonical-hash";
import { validatePolicy } from "../policy-validator";
import type { PolicyConfig } from "../policy-types";

describe("PolicyLoader", () => {
  describe("loadPolicy", () => {
    it("loads from default canonical directory if it exists", () => {
      const policy = loadPolicy();
      expect(policy).toBeDefined();
      expect(policy.meta.canonical_package_version).toBeDefined();
      expect(policy.runtime.risk.per_trade.hard_max_pct).toBeGreaterThan(0);
      expect(policy.runtime.risk.per_trade.hard_max_pct).toBeLessThanOrEqual(1);
    });

    it("returns default policy if directory does not exist", () => {
      const policy = loadPolicy("/nonexistent/path");
      expect(policy.canonicalHash).toBe("default-no-canonical-loaded");
      expect(policy.runtime.mode.active).toBe("supervised_crisis");
    });
  });

  describe("loadPolicyFromMap", () => {
    it("parses runtime YAML correctly", () => {
      const yamlContent = `
meta:
  schema_version: "2.0.0"
  canonical_package_version: "2.5.0"
mode:
  active: autonomous_normal
risk:
  per_trade:
    hard_max_pct: 0.02
    default_pct: 0.01
  cluster:
    per_symbol_max_pct: 0.03
    per_sector_max_pct: 0.05
    per_corr_cluster_max_pct: 0.06
  portfolio:
    heat_normal_max_pct: 0.08
    heat_shock_max_pct: 0.04
    heat_crisis_max_pct: 0.02
  kill_switch:
    daily_loss_pct: 0.03
    weekly_loss_pct: 0.05
    drawdown_pct: 0.20
  margin:
    utilization_max_pct: 0.80
    leverage_max: 3.0
`;
      const map = new Map([["policy.runtime.yaml", yamlContent]]);
      const policy = loadPolicyFromMap(map);

      expect(policy.runtime.mode.active).toBe("autonomous_normal");
      expect(policy.runtime.risk.per_trade.hard_max_pct).toBe(0.02);
      expect(policy.runtime.risk.portfolio.heat_normal_max_pct).toBe(0.08);
      expect(policy.runtime.risk.kill_switch.drawdown_pct).toBe(0.20);
      expect(policy.runtime.risk.margin.leverage_max).toBe(3.0);
    });

    it("parses portfolio YAML correctly", () => {
      const yamlContent = `
concentration_limits:
  max_single_position_pct: 0.15
  max_single_sector_exposure_pct: 0.25
  max_correlated_cluster_exposure_pct: 0.20
capital_allocation:
  regime_budgets:
    trending: 1.0
    ranging: 0.5
    transition: 0.3
    shock: 0.2
    crisis: 0.05
`;
      const map = new Map([["policy.portfolio.yaml", yamlContent]]);
      const policy = loadPolicyFromMap(map);

      expect(policy.portfolio.concentration.max_single_position_pct).toBe(0.15);
      expect(policy.portfolio.regime_budgets.trending).toBe(1.0);
      expect(policy.portfolio.regime_budgets.crisis).toBe(0.05);
    });

    it("handles empty map gracefully", () => {
      const policy = loadPolicyFromMap(new Map());
      expect(policy).toBeDefined();
      expect(policy.canonicalHash).toBeDefined();
    });

    it("handles invalid YAML gracefully", () => {
      const map = new Map([["policy.runtime.yaml", "{{{{invalid yaml"]]);
      const policy = loadPolicyFromMap(map);
      expect(policy).toBeDefined();
    });
  });

  describe("getPolicy / reloadPolicy", () => {
    it("caches policy after first load", () => {
      const p1 = getPolicy();
      const p2 = getPolicy();
      expect(p1).toBe(p2);
    });

    it("reloadPolicy returns fresh policy", () => {
      const p1 = getPolicy();
      const p2 = reloadPolicy();
      expect(p2).toBeDefined();
      expect(p2.meta).toBeDefined();
    });
  });
});

describe("CanonicalHash", () => {
  it("produces deterministic hash for same content", () => {
    const map = new Map([
      ["a.yaml", "key: value"],
      ["b.yaml", "other: data"],
    ]);
    const h1 = computeCanonicalHash(map);
    const h2 = computeCanonicalHash(map);
    expect(h1).toBe(h2);
  });

  it("produces different hash for different content", () => {
    const m1 = new Map([["a.yaml", "key: value1"]]);
    const m2 = new Map([["a.yaml", "key: value2"]]);
    expect(computeCanonicalHash(m1)).not.toBe(computeCanonicalHash(m2));
  });

  it("is order-independent (sorted by filename)", () => {
    const m1 = new Map([
      ["b.yaml", "b: 1"],
      ["a.yaml", "a: 2"],
    ]);
    const m2 = new Map([
      ["a.yaml", "a: 2"],
      ["b.yaml", "b: 1"],
    ]);
    expect(computeCanonicalHash(m1)).toBe(computeCanonicalHash(m2));
  });

  it("returns 64-char hex string (SHA-256)", () => {
    const map = new Map([["test.yaml", "data: 1"]]);
    const hash = computeCanonicalHash(map);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("PolicyValidator", () => {
  function makeValidPolicy(): PolicyConfig {
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
  cluster:
    per_symbol_max_pct: 0.02
    per_sector_max_pct: 0.04
    per_corr_cluster_max_pct: 0.05
  portfolio:
    heat_normal_max_pct: 0.06
    heat_shock_max_pct: 0.03
    heat_crisis_max_pct: 0.01
  kill_switch:
    daily_loss_pct: 0.02
    weekly_loss_pct: 0.03
    drawdown_pct: 0.15
  margin:
    utilization_max_pct: 0.75
    leverage_max: 2.0
`,
      ],
    ]);
    return loadPolicyFromMap(map);
  }

  it("validates a correct policy", () => {
    const result = validatePolicy(makeValidPolicy());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("catches heat invariant violation (shock >= normal)", () => {
    const policy = makeValidPolicy();
    policy.runtime.risk.portfolio.heat_shock_max_pct = 0.07;
    policy.runtime.risk.portfolio.heat_normal_max_pct = 0.06;
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("heat_shock_max_pct"))).toBe(true);
  });

  it("catches crisis >= shock violation", () => {
    const policy = makeValidPolicy();
    policy.runtime.risk.portfolio.heat_crisis_max_pct = 0.04;
    policy.runtime.risk.portfolio.heat_shock_max_pct = 0.03;
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("heat_crisis_max_pct"))).toBe(true);
  });

  it("catches default >= hard_max violation", () => {
    const policy = makeValidPolicy();
    policy.runtime.risk.per_trade.default_pct = 0.02;
    policy.runtime.risk.per_trade.hard_max_pct = 0.01;
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
  });

  it("catches out-of-range pct field (> 1)", () => {
    const policy = makeValidPolicy();
    policy.runtime.risk.per_trade.hard_max_pct = 1.5;
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("[0, 1]"))).toBe(true);
  });

  it("catches negative pct field", () => {
    const policy = makeValidPolicy();
    policy.runtime.risk.per_trade.hard_max_pct = -0.01;
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
  });

  it("catches missing canonical hash", () => {
    const policy = makeValidPolicy();
    policy.canonicalHash = "";
    const result = validatePolicy(policy);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("canonicalHash"))).toBe(true);
  });

  it("warns on daily_loss >= weekly_loss", () => {
    const policy = makeValidPolicy();
    policy.runtime.risk.kill_switch.daily_loss_pct = 0.05;
    policy.runtime.risk.kill_switch.weekly_loss_pct = 0.03;
    const result = validatePolicy(policy);
    expect(result.warnings.some((w) => w.includes("daily_loss_pct"))).toBe(true);
  });
});
