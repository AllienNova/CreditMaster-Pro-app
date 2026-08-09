import { TenantBudgetManager } from "../tenant-budget";
import { validateOverride, applyNarrowOverride } from "../override-validator";
import { TenantContext } from "../tenant-isolation";
import type { PolicyConfig, RuntimeRiskPolicy } from "@/lib/trading/config";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function makeBasePolicy(): PolicyConfig {
  return {
    meta: {
      schema_version: "2.0.0",
      file_version: "2.0.0",
      canonical_package_version: "2.5.0",
    },
    runtime: {
      mode: { active: "supervised_crisis" },
      risk: {
        per_trade: { hard_max_pct: 0.01, default_pct: 0.0075 },
        cluster: {
          per_symbol_max_pct: 0.02,
          per_sector_max_pct: 0.04,
          per_corr_cluster_max_pct: 0.05,
        },
        portfolio: {
          heat_normal_max_pct: 0.06,
          heat_shock_max_pct: 0.03,
          heat_crisis_max_pct: 0.01,
        },
        kill_switch: {
          daily_loss_pct: 0.02,
          weekly_loss_pct: 0.03,
          drawdown_pct: 0.15,
        },
        margin: {
          utilization_max_pct: 0.75,
          leverage_max: 2.0,
        },
      },
    },
    modes: {
      active: "supervised_crisis",
      modes: {
        autonomous_normal: { can_open_positions: true, can_close_positions: true, can_modify_orders: true, signal_generation: true, max_position_size_multiplier: 1.0 },
        autonomous_restricted: { can_open_positions: true, can_close_positions: true, can_modify_orders: true, signal_generation: true, max_position_size_multiplier: 0.5 },
        supervised_crisis: { can_open_positions: false, can_close_positions: true, can_modify_orders: true, signal_generation: true, max_position_size_multiplier: 0.25 },
        manual_only: { can_open_positions: false, can_close_positions: false, can_modify_orders: false, signal_generation: false, max_position_size_multiplier: 0 },
      },
    },
    regimes: {
      regimes: {
        trending: { exposure_budget_multiplier: 1.0, sizing_multiplier: 1.0 },
        ranging: { exposure_budget_multiplier: 0.6, sizing_multiplier: 0.6 },
        transition: { exposure_budget_multiplier: 0.4, sizing_multiplier: 0.4 },
        shock: { exposure_budget_multiplier: 0.25, sizing_multiplier: 0.25 },
        crisis: { exposure_budget_multiplier: 0.1, sizing_multiplier: 0.1 },
      },
    },
    compliance: {
      gates: [],
      pdt: { equity_threshold_usd: 25000, max_day_trades_in_window: 3, window_sessions: 5 },
      mwcb: { level1_pct: 0.07, level2_pct: 0.13, level3_pct: 0.20 },
      luld: { tier1_band_pct: 0.05, tier2_band_pct: 0.10 },
    },
    portfolio: {
      concentration: { max_single_position_pct: 0.20, max_single_sector_pct: 0.30, max_corr_cluster_pct: 0.30 },
      regime_budgets: { trending: 1.0, ranging: 0.6, transition: 0.4, shock: 0.25, crisis: 0.1 },
    },
    promotion: { stages: {} as PolicyConfig["promotion"]["stages"] },
    dataQuality: { staleness: {}, nbbo: { max_spread_bps: 50 }, gap: { sigma_threshold: 5 } },
    execution: {
      default_tif: {},
      slippage_threshold_bps: 10,
      broker_circuit_breaker: { consecutive_rejects: 5, window_seconds: 60, cooldown_seconds: 60, probe_after_seconds: 30, close_after_successes: 3 },
      clock_skew: { max_ms: 500, ntp_stratum_max: 2, measurement_interval_seconds: 10, consecutive_breach_limit: 3, resume_after_ok: 5 },
    },
    calendar: {
      timezone: "America/New_York",
      regular_session: { open: "09:30", close: "16:00" },
      extended_session: { pre_open: "04:00", post_close: "20:00" },
      holidays: [],
      blackout_types: [],
    },
    incidents: [],
    canonicalHash: "test-hash-0123456789abcdef",
  };
}

// ============================================================================
// TENANT BUDGET MANAGER
// ============================================================================

describe("TenantBudgetManager", () => {
  let manager: TenantBudgetManager;

  beforeEach(() => {
    manager = new TenantBudgetManager();
  });

  describe("allocateBudget", () => {
    it("allocates a valid budget to a tenant", () => {
      manager.allocateBudget("tenant-1", 0.3);
      const budget = manager.getBudget("tenant-1");
      expect(budget.allocatedPct).toBe(0.3);
      expect(budget.utilizedPct).toBe(0);
      expect(budget.remainingPct).toBe(0.3);
    });

    it("allocates budgets to multiple tenants", () => {
      manager.allocateBudget("tenant-1", 0.3);
      manager.allocateBudget("tenant-2", 0.4);
      expect(manager.getTotalAllocated()).toBeCloseTo(0.7);
    });

    it("allows re-allocation that shrinks a tenant budget", () => {
      manager.allocateBudget("tenant-1", 0.5);
      manager.allocateBudget("tenant-1", 0.3);
      expect(manager.getBudget("tenant-1").allocatedPct).toBe(0.3);
    });

    it("throws when allocation exceeds platform ceiling", () => {
      manager.allocateBudget("tenant-1", 0.6);
      expect(() => manager.allocateBudget("tenant-2", 0.5)).toThrow(
        /exceed platform ceiling/,
      );
    });

    it("allows allocation exactly at platform ceiling", () => {
      manager.allocateBudget("tenant-1", 0.6);
      manager.allocateBudget("tenant-2", 0.4);
      expect(manager.getTotalAllocated()).toBeCloseTo(1.0);
    });

    it("throws for negative budgetPct", () => {
      expect(() => manager.allocateBudget("tenant-1", -0.1)).toThrow(
        /must be in \[0, 1\]/,
      );
    });

    it("throws for budgetPct greater than 1", () => {
      expect(() => manager.allocateBudget("tenant-1", 1.5)).toThrow(
        /must be in \[0, 1\]/,
      );
    });

    it("allows zero allocation", () => {
      manager.allocateBudget("tenant-1", 0);
      expect(manager.getBudget("tenant-1").allocatedPct).toBe(0);
    });
  });

  describe("getBudget", () => {
    it("throws for unknown tenant", () => {
      expect(() => manager.getBudget("nonexistent")).toThrow(
        /No budget allocated/,
      );
    });

    it("tracks utilization correctly", () => {
      manager.allocateBudget("tenant-1", 0.5);
      manager.recordUtilization("tenant-1", 0.2);
      const budget = manager.getBudget("tenant-1");
      expect(budget.utilizedPct).toBe(0.2);
      expect(budget.remainingPct).toBeCloseTo(0.3);
    });
  });

  describe("checkBudget", () => {
    it("allows request within remaining budget", () => {
      manager.allocateBudget("tenant-1", 0.5);
      const result = manager.checkBudget("tenant-1", 0.3);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeCloseTo(0.2);
    });

    it("rejects request exceeding remaining budget", () => {
      manager.allocateBudget("tenant-1", 0.5);
      manager.recordUtilization("tenant-1", 0.4);
      const result = manager.checkBudget("tenant-1", 0.2);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBeCloseTo(0.1);
      expect(result.reason).toMatch(/exceeds remaining budget/);
    });

    it("rejects when tenant has no allocation", () => {
      const result = manager.checkBudget("unknown", 0.1);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toMatch(/No budget allocated/);
    });

    it("allows request exactly equal to remaining", () => {
      manager.allocateBudget("tenant-1", 0.5);
      const result = manager.checkBudget("tenant-1", 0.5);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeCloseTo(0);
    });
  });

  describe("getTotalAllocated", () => {
    it("returns 0 with no tenants", () => {
      expect(manager.getTotalAllocated()).toBe(0);
    });

    it("sums allocations correctly", () => {
      manager.allocateBudget("t1", 0.2);
      manager.allocateBudget("t2", 0.3);
      manager.allocateBudget("t3", 0.1);
      expect(manager.getTotalAllocated()).toBeCloseTo(0.6);
    });
  });

  describe("recordUtilization", () => {
    it("throws when utilization would exceed allocation", () => {
      manager.allocateBudget("tenant-1", 0.3);
      expect(() => manager.recordUtilization("tenant-1", 0.4)).toThrow(
        /would exceed allocation/,
      );
    });

    it("throws for unknown tenant", () => {
      expect(() => manager.recordUtilization("unknown", 0.1)).toThrow(
        /No budget allocated/,
      );
    });
  });

  describe("reset", () => {
    it("clears all allocations and utilizations", () => {
      manager.allocateBudget("tenant-1", 0.5);
      manager.recordUtilization("tenant-1", 0.2);
      manager.reset();
      expect(manager.getTotalAllocated()).toBe(0);
      expect(() => manager.getBudget("tenant-1")).toThrow();
    });
  });
});

// ============================================================================
// OVERRIDE VALIDATOR
// ============================================================================

describe("OverrideValidator", () => {
  const basePolicy = makeBasePolicy();

  describe("validateOverride", () => {
    it("accepts valid narrowing of per_trade limits", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.005, default_pct: 0.004 },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("rejects widening of per_trade.hard_max_pct", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.05, default_pct: 0.0075 },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatch(/per_trade\.hard_max_pct/);
    });

    it("rejects widening of per_trade.default_pct", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.01, default_pct: 0.02 },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(false);
      expect(result.violations[0]).toMatch(/per_trade\.default_pct/);
    });

    it("rejects widening of cluster limits", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        cluster: {
          per_symbol_max_pct: 0.05,
          per_sector_max_pct: 0.04,
          per_corr_cluster_max_pct: 0.05,
        },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toMatch(/per_symbol_max_pct/);
    });

    it("accepts narrowing of all cluster limits", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        cluster: {
          per_symbol_max_pct: 0.01,
          per_sector_max_pct: 0.02,
          per_corr_cluster_max_pct: 0.03,
        },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(true);
    });

    it("rejects widening of portfolio heat limits", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        portfolio: {
          heat_normal_max_pct: 0.10,
          heat_shock_max_pct: 0.03,
          heat_crisis_max_pct: 0.01,
        },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(false);
      expect(result.violations[0]).toMatch(/heat_normal_max_pct/);
    });

    it("rejects widening of kill_switch thresholds (must trigger sooner)", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        kill_switch: {
          daily_loss_pct: 0.05,
          weekly_loss_pct: 0.03,
          drawdown_pct: 0.15,
        },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(false);
      expect(result.violations[0]).toMatch(/daily_loss_pct/);
    });

    it("accepts narrowing of kill_switch thresholds", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        kill_switch: {
          daily_loss_pct: 0.01,
          weekly_loss_pct: 0.02,
          drawdown_pct: 0.10,
        },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(true);
    });

    it("rejects widening of margin.leverage_max", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        margin: { utilization_max_pct: 0.75, leverage_max: 5.0 },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(false);
      expect(result.violations[0]).toMatch(/leverage_max/);
    });

    it("rejects widening of margin.utilization_max_pct", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        margin: { utilization_max_pct: 0.90, leverage_max: 2.0 },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(false);
      expect(result.violations[0]).toMatch(/utilization_max_pct/);
    });

    it("collects multiple violations across sections", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.05, default_pct: 0.04 },
        margin: { utilization_max_pct: 0.90, leverage_max: 5.0 },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(4);
    });

    it("accepts equal values (same as base is not widening)", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.01, default_pct: 0.0075 },
      };
      const result = validateOverride(basePolicy, override);
      expect(result.valid).toBe(true);
    });

    it("returns empty applied when no override provided", () => {
      const result = validateOverride(basePolicy, {});
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe("applyNarrowOverride", () => {
    it("uses Math.min for narrowed per_trade values", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.005, default_pct: 0.003 },
      };
      const result = applyNarrowOverride(basePolicy, override);
      expect(result.runtime.risk.per_trade.hard_max_pct).toBe(0.005);
      expect(result.runtime.risk.per_trade.default_pct).toBe(0.003);
    });

    it("ignores wider values and uses base instead", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.05, default_pct: 0.04 },
      };
      const result = applyNarrowOverride(basePolicy, override);
      expect(result.runtime.risk.per_trade.hard_max_pct).toBe(0.01);
      expect(result.runtime.risk.per_trade.default_pct).toBe(0.0075);
    });

    it("preserves base values for unset override fields", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.005, default_pct: 0.003 },
      };
      const result = applyNarrowOverride(basePolicy, override);
      expect(result.runtime.risk.cluster).toEqual(basePolicy.runtime.risk.cluster);
      expect(result.runtime.risk.margin).toEqual(basePolicy.runtime.risk.margin);
    });

    it("narrows kill_switch thresholds correctly", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        kill_switch: { daily_loss_pct: 0.01, weekly_loss_pct: 0.015, drawdown_pct: 0.10 },
      };
      const result = applyNarrowOverride(basePolicy, override);
      expect(result.runtime.risk.kill_switch.daily_loss_pct).toBe(0.01);
      expect(result.runtime.risk.kill_switch.weekly_loss_pct).toBe(0.015);
      expect(result.runtime.risk.kill_switch.drawdown_pct).toBe(0.10);
    });

    it("narrows margin fields correctly", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        margin: { utilization_max_pct: 0.50, leverage_max: 1.5 },
      };
      const result = applyNarrowOverride(basePolicy, override);
      expect(result.runtime.risk.margin.utilization_max_pct).toBe(0.50);
      expect(result.runtime.risk.margin.leverage_max).toBe(1.5);
    });

    it("does not mutate the original base policy", () => {
      const original = makeBasePolicy();
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.001, default_pct: 0.001 },
      };
      applyNarrowOverride(original, override);
      expect(original.runtime.risk.per_trade.hard_max_pct).toBe(0.01);
      expect(original.runtime.risk.per_trade.default_pct).toBe(0.0075);
    });

    it("preserves non-runtime policy sections", () => {
      const override: Partial<RuntimeRiskPolicy> = {
        per_trade: { hard_max_pct: 0.005, default_pct: 0.003 },
      };
      const result = applyNarrowOverride(basePolicy, override);
      expect(result.modes).toEqual(basePolicy.modes);
      expect(result.compliance).toEqual(basePolicy.compliance);
      expect(result.canonicalHash).toBe(basePolicy.canonicalHash);
    });
  });
});

// ============================================================================
// TENANT ISOLATION
// ============================================================================

describe("TenantContext", () => {
  let ctx: TenantContext;

  beforeEach(() => {
    ctx = new TenantContext();
  });

  describe("run / getTenantId", () => {
    it("returns the tenant ID inside a run context", () => {
      ctx.run("tenant-abc", () => {
        expect(ctx.getTenantId()).toBe("tenant-abc");
      });
    });

    it("throws when getTenantId called outside run context", () => {
      expect(() => ctx.getTenantId()).toThrow(/No tenant context active/);
    });

    it("isolates nested contexts", () => {
      ctx.run("outer", () => {
        expect(ctx.getTenantId()).toBe("outer");
        ctx.run("inner", () => {
          expect(ctx.getTenantId()).toBe("inner");
        });
        expect(ctx.getTenantId()).toBe("outer");
      });
    });
  });

  describe("setTenant", () => {
    it("replaces tenant ID in current context", () => {
      ctx.run("original", () => {
        ctx.setTenant("replaced");
        expect(ctx.getTenantId()).toBe("replaced");
      });
    });

    it("throws when called outside context", () => {
      expect(() => ctx.setTenant("nope")).toThrow(/No tenant context active/);
    });
  });

  describe("scopeQuery", () => {
    it("adds WHERE clause to query without existing WHERE", () => {
      ctx.run("tenant-1", () => {
        const result = ctx.scopeQuery("SELECT * FROM orders", {});
        expect(result.query).toBe("SELECT * FROM orders WHERE tenant_id = :tenant_id");
        expect(result.params.tenant_id).toBe("tenant-1");
      });
    });

    it("adds AND clause to query with existing WHERE", () => {
      ctx.run("tenant-2", () => {
        const result = ctx.scopeQuery(
          "SELECT * FROM orders WHERE status = :status",
          { status: "open" },
        );
        expect(result.query).toBe(
          "SELECT * FROM orders WHERE status = :status AND tenant_id = :tenant_id",
        );
        expect(result.params.tenant_id).toBe("tenant-2");
        expect(result.params.status).toBe("open");
      });
    });

    it("throws when called outside context", () => {
      expect(() => ctx.scopeQuery("SELECT 1", {})).toThrow(
        /No tenant context active/,
      );
    });
  });

  describe("validateTenantAccess", () => {
    it("returns true when tenant matches resource", () => {
      expect(ctx.validateTenantAccess("tenant-1", "tenant-1")).toBe(true);
    });

    it("returns false for cross-tenant access", () => {
      expect(ctx.validateTenantAccess("tenant-1", "tenant-2")).toBe(false);
    });

    it("returns false for empty string mismatch", () => {
      expect(ctx.validateTenantAccess("tenant-1", "")).toBe(false);
    });
  });
});
