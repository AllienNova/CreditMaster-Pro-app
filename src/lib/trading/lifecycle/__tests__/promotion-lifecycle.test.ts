/**
 * Promotion Lifecycle — Unit Tests
 *
 * Tests the 6-stage strategy maturity system:
 *  - Stage progression (research → autonomous_live)
 *  - Gate evaluation per stage
 *  - Dwell enforcement (min time in stage)
 *  - Demotion triggers (risk vetoes, recon break, kill switch, SEV1)
 *  - canTrade budget/position limits per stage
 */

// ============================================================================
// MOCKS
// ============================================================================

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock("@/lib/trading/config", () => ({
  getPolicy: jest.fn().mockReturnValue({
    meta: { canonical_package_version: "2.5.0-rc1" },
    canonicalHash: "abc123def456",
    promotion: {
      stages: {
        research: {
          min_dwell_days: 1,
          risk_budget_pct: 0,
          max_positions: Infinity,
          max_notional_usd: Infinity,
        },
        replay: {
          min_signals: 500,
          min_sharpe: 0.8,
          max_drawdown_pct: 0.15,
          min_hit_rate_pct: 0.45,
          min_dwell_days: 3,
          risk_budget_pct: 0,
          max_positions: Infinity,
          max_notional_usd: Infinity,
        },
        shadow: {
          min_correlation: 0.7,
          zero_sev1_days: 30,
          max_fill_sim_error_bps: 3,
          min_dwell_days: 10,
          risk_budget_pct: 0,
          max_positions: Infinity,
          max_notional_usd: Infinity,
        },
        paper: {
          min_trades: 500,
          min_sharpe: 0.6,
          max_slippage_bps: 8,
          zero_violations: true,
          min_dwell_days: 20,
          risk_budget_pct: 0.005,
          max_positions: 10,
          max_notional_usd: 50000,
        },
        supervised_live: {
          min_trades: 2000,
          min_dwell_days: 30,
          risk_budget_pct: 0.25,
          max_positions: 5,
          max_notional_usd: 100000,
        },
        autonomous_live: {
          min_dwell_days: 0,
          risk_budget_pct: 1.0,
          max_positions: Infinity,
          max_notional_usd: Infinity,
        },
      },
    },
  }),
}));

import { supabaseAdmin } from "@/lib/supabase/server";
import { getPolicy } from "@/lib/trading/config";
import { PromotionManager } from "../promotion-manager";
import { evaluateGates, getNextStage, getPreviousStage, stageIndex } from "../promotion-gates";
import { checkDemotionTriggers } from "../demotion-rules";
import type { LifecycleStage } from "@/lib/trading/config";

const mockFrom = supabaseAdmin.from as jest.Mock;
const mockGetPolicy = getPolicy as jest.Mock;

// ---------------------------------------------------------------------------
// Supabase chain mock helpers
// ---------------------------------------------------------------------------

function chainBuilder(resolvedValue: unknown) {
  const resolved = Promise.resolve(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  const methods = [
    "select", "insert", "update", "eq", "in", "neq",
    "order", "limit", "single", "range", "gte", "lte",
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain["single"] = jest.fn().mockResolvedValue(resolvedValue);
  chain["limit"] = jest.fn().mockResolvedValue(resolvedValue);
  chain["range"] = jest.fn().mockResolvedValue(resolvedValue);
  // Supabase query builders are thenable — make the chain awaitable
  chain["then"] = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    resolved.then(onFulfilled, onRejected);
  return chain;
}

function makeInsertChain() {
  const chain: Record<string, jest.Mock> = {};
  const methods = ["insert", "select", "eq", "order", "limit", "update"];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain["single"] = jest.fn().mockResolvedValue({ data: { id: "new-id" }, error: null });
  return chain;
}

/**
 * Configures mockFrom to route different table names to different mock chains.
 */
function setupTableMocks(tableMap: Record<string, ReturnType<typeof chainBuilder>>) {
  mockFrom.mockImplementation((table: string) => {
    return tableMap[table] ?? chainBuilder({ data: null, error: null });
  });
}

// ============================================================================
// TESTS: Stage Ordering Utilities
// ============================================================================

describe("Stage ordering utilities", () => {
  it("returns correct next stage for each stage", () => {
    expect(getNextStage("research")).toBe("replay");
    expect(getNextStage("replay")).toBe("shadow");
    expect(getNextStage("shadow")).toBe("paper");
    expect(getNextStage("paper")).toBe("supervised_live");
    expect(getNextStage("supervised_live")).toBe("autonomous_live");
    expect(getNextStage("autonomous_live")).toBeNull();
  });

  it("returns correct previous stage for each stage", () => {
    expect(getPreviousStage("research")).toBeNull();
    expect(getPreviousStage("replay")).toBe("research");
    expect(getPreviousStage("shadow")).toBe("replay");
    expect(getPreviousStage("paper")).toBe("shadow");
    expect(getPreviousStage("supervised_live")).toBe("paper");
    expect(getPreviousStage("autonomous_live")).toBe("supervised_live");
  });

  it("returns correct stage index", () => {
    expect(stageIndex("research")).toBe(0);
    expect(stageIndex("replay")).toBe(1);
    expect(stageIndex("shadow")).toBe(2);
    expect(stageIndex("paper")).toBe(3);
    expect(stageIndex("supervised_live")).toBe(4);
    expect(stageIndex("autonomous_live")).toBe(5);
  });
});

// ============================================================================
// TESTS: Gate Evaluation
// ============================================================================

describe("evaluateGates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPolicy.mockReturnValue({
      promotion: {
        stages: {
          research: {
            min_dwell_days: 1,
            risk_budget_pct: 0,
            max_positions: Infinity,
            max_notional_usd: Infinity,
          },
          replay: {
            min_signals: 500,
            min_sharpe: 0.8,
            max_drawdown_pct: 0.15,
            min_hit_rate_pct: 0.45,
            min_dwell_days: 3,
            risk_budget_pct: 0,
            max_positions: Infinity,
            max_notional_usd: Infinity,
          },
          shadow: {
            min_correlation: 0.7,
            zero_sev1_days: 30,
            max_fill_sim_error_bps: 3,
            min_dwell_days: 10,
            risk_budget_pct: 0,
            max_positions: Infinity,
            max_notional_usd: Infinity,
          },
          paper: {
            min_trades: 500,
            min_sharpe: 0.6,
            max_slippage_bps: 8,
            zero_violations: true,
            min_dwell_days: 20,
            risk_budget_pct: 0.005,
            max_positions: 10,
            max_notional_usd: 50000,
          },
          supervised_live: {
            min_trades: 2000,
            min_dwell_days: 30,
            risk_budget_pct: 0.25,
            max_positions: 5,
            max_notional_usd: 100000,
          },
          autonomous_live: {
            min_dwell_days: 0,
            risk_budget_pct: 1.0,
            max_positions: Infinity,
            max_notional_usd: Infinity,
          },
        },
      },
    });
  });

  it("returns missing metrics when strategy has no metrics record", async () => {
    const metricsChain = chainBuilder({ data: null, error: { message: "not found" } });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "research");
    expect(result.passed).toBe(false);
    expect(result.missing).toContain("all_metrics");
    expect(result.scores).toHaveLength(0);
  });

  it("passes research gate when dwell_days >= 1", async () => {
    const metricsChain = chainBuilder({
      data: {
        signal_count: 10,
        sharpe_ratio: 0.5,
        max_drawdown_pct: 0.05,
        hit_rate_pct: 0.5,
        correlation: 0.5,
        sev1_free_days: 5,
        fill_sim_error_bps: 1,
        trade_count: 10,
        slippage_bps: 2,
        has_violations: false,
        dwell_days: 2,
      },
      error: null,
    });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "research");
    expect(result.passed).toBe(true);
    expect(result.scores.length).toBeGreaterThanOrEqual(1);
    expect(result.scores.find((s) => s.gate === "min_dwell_days")?.passed).toBe(true);
  });

  it("fails research gate when dwell_days < 1", async () => {
    const metricsChain = chainBuilder({
      data: {
        signal_count: 10,
        sharpe_ratio: 0.5,
        max_drawdown_pct: 0.05,
        hit_rate_pct: 0.5,
        correlation: 0.5,
        sev1_free_days: 5,
        fill_sim_error_bps: 1,
        trade_count: 10,
        slippage_bps: 2,
        has_violations: false,
        dwell_days: 0,
      },
      error: null,
    });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "research");
    expect(result.passed).toBe(false);
    expect(result.scores.find((s) => s.gate === "min_dwell_days")?.passed).toBe(false);
  });

  it("passes replay gates when all criteria met", async () => {
    const metricsChain = chainBuilder({
      data: {
        signal_count: 600,
        sharpe_ratio: 1.2,
        max_drawdown_pct: 0.08,
        hit_rate_pct: 0.55,
        correlation: 0.5,
        sev1_free_days: 40,
        fill_sim_error_bps: 2,
        trade_count: 200,
        slippage_bps: 3,
        has_violations: false,
        dwell_days: 5,
      },
      error: null,
    });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "replay");
    expect(result.passed).toBe(true);
  });

  it("fails replay gate when sharpe is below threshold", async () => {
    const metricsChain = chainBuilder({
      data: {
        signal_count: 600,
        sharpe_ratio: 0.5, // Below 0.8
        max_drawdown_pct: 0.08,
        hit_rate_pct: 0.55,
        correlation: 0.5,
        sev1_free_days: 40,
        fill_sim_error_bps: 2,
        trade_count: 200,
        slippage_bps: 3,
        has_violations: false,
        dwell_days: 5,
      },
      error: null,
    });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "replay");
    expect(result.passed).toBe(false);
    expect(result.scores.find((s) => s.gate === "min_sharpe")?.passed).toBe(false);
  });

  it("fails shadow gate when correlation is below threshold", async () => {
    const metricsChain = chainBuilder({
      data: {
        signal_count: 600,
        sharpe_ratio: 1.0,
        max_drawdown_pct: 0.08,
        hit_rate_pct: 0.55,
        correlation: 0.5, // Below 0.7
        sev1_free_days: 40,
        fill_sim_error_bps: 2,
        trade_count: 200,
        slippage_bps: 3,
        has_violations: false,
        dwell_days: 15,
      },
      error: null,
    });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "shadow");
    expect(result.passed).toBe(false);
    expect(result.scores.find((s) => s.gate === "min_correlation")?.passed).toBe(false);
  });

  it("fails paper gate when violations exist", async () => {
    const metricsChain = chainBuilder({
      data: {
        signal_count: 600,
        sharpe_ratio: 1.0,
        max_drawdown_pct: 0.05,
        hit_rate_pct: 0.55,
        correlation: 0.9,
        sev1_free_days: 40,
        fill_sim_error_bps: 2,
        trade_count: 600,
        slippage_bps: 3,
        has_violations: true, // Violations present
        dwell_days: 25,
      },
      error: null,
    });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "paper");
    expect(result.passed).toBe(false);
    expect(result.scores.find((s) => s.gate === "zero_violations")?.passed).toBe(false);
  });

  it("passes supervised_live gates with sufficient trades and dwell", async () => {
    const metricsChain = chainBuilder({
      data: {
        signal_count: 3000,
        sharpe_ratio: 1.5,
        max_drawdown_pct: 0.05,
        hit_rate_pct: 0.6,
        correlation: 0.9,
        sev1_free_days: 60,
        fill_sim_error_bps: 1,
        trade_count: 2500,
        slippage_bps: 3,
        has_violations: false,
        dwell_days: 35,
      },
      error: null,
    });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "supervised_live");
    expect(result.passed).toBe(true);
  });

  it("fails supervised_live when dwell days insufficient", async () => {
    const metricsChain = chainBuilder({
      data: {
        signal_count: 3000,
        sharpe_ratio: 1.5,
        max_drawdown_pct: 0.05,
        hit_rate_pct: 0.6,
        correlation: 0.9,
        sev1_free_days: 60,
        fill_sim_error_bps: 1,
        trade_count: 2500,
        slippage_bps: 3,
        has_violations: false,
        dwell_days: 20, // Below 30
      },
      error: null,
    });
    setupTableMocks({ strategy_metrics: metricsChain });

    const result = await evaluateGates("strat-1", "supervised_live");
    expect(result.passed).toBe(false);
    expect(result.scores.find((s) => s.gate === "min_dwell_days")?.passed).toBe(false);
  });
});

// ============================================================================
// TESTS: PromotionManager
// ============================================================================

describe("PromotionManager", () => {
  let manager: PromotionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPolicy.mockReturnValue({
      promotion: {
        stages: {
          research: {
            min_dwell_days: 1,
            risk_budget_pct: 0,
            max_positions: Infinity,
            max_notional_usd: Infinity,
          },
          replay: {
            min_signals: 500,
            min_sharpe: 0.8,
            max_drawdown_pct: 0.15,
            min_hit_rate_pct: 0.45,
            min_dwell_days: 3,
            risk_budget_pct: 0,
            max_positions: Infinity,
            max_notional_usd: Infinity,
          },
          shadow: {
            min_correlation: 0.7,
            zero_sev1_days: 30,
            max_fill_sim_error_bps: 3,
            min_dwell_days: 10,
            risk_budget_pct: 0,
            max_positions: Infinity,
            max_notional_usd: Infinity,
          },
          paper: {
            min_trades: 500,
            min_sharpe: 0.6,
            max_slippage_bps: 8,
            zero_violations: true,
            min_dwell_days: 20,
            risk_budget_pct: 0.005,
            max_positions: 10,
            max_notional_usd: 50000,
          },
          supervised_live: {
            min_trades: 2000,
            min_dwell_days: 30,
            risk_budget_pct: 0.25,
            max_positions: 5,
            max_notional_usd: 100000,
          },
          autonomous_live: {
            min_dwell_days: 0,
            risk_budget_pct: 1.0,
            max_positions: Infinity,
            max_notional_usd: Infinity,
          },
        },
      },
    });
    manager = PromotionManager.getInstance();
  });

  // --------------------------------------------------------------------------
  // getStrategyStage
  // --------------------------------------------------------------------------

  describe("getStrategyStage", () => {
    it("returns research when no lifecycle record exists", async () => {
      const lifecycleChain = chainBuilder({ data: null, error: { message: "not found" } });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const stage = await manager.getStrategyStage("strat-1");
      expect(stage).toBe("research");
    });

    it("returns the stored stage from database", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "paper" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const stage = await manager.getStrategyStage("strat-1");
      expect(stage).toBe("paper");
    });
  });

  // --------------------------------------------------------------------------
  // attemptPromotion
  // --------------------------------------------------------------------------

  describe("attemptPromotion", () => {
    it("rejects promotion from autonomous_live (already at max)", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "autonomous_live" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const result = await manager.attemptPromotion("strat-1");
      expect(result.promoted).toBe(false);
      expect(result.reason).toContain("highest stage");
    });

    it("promotes from research to replay when gates pass", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "research", id: "lc-1", promoted_count: 0, demoted_count: 0 },
        error: null,
      });
      const metricsChain = chainBuilder({
        data: {
          signal_count: 100,
          sharpe_ratio: 0.5,
          max_drawdown_pct: 0.05,
          hit_rate_pct: 0.5,
          correlation: 0.5,
          sev1_free_days: 5,
          fill_sim_error_bps: 1,
          trade_count: 10,
          slippage_bps: 2,
          has_violations: false,
          dwell_days: 2,
        },
        error: null,
      });
      const auditChain = makeInsertChain();

      setupTableMocks({
        strategy_lifecycle: lifecycleChain,
        strategy_metrics: metricsChain,
        lifecycle_audit: auditChain,
      });

      const result = await manager.attemptPromotion("strat-1");
      expect(result.promoted).toBe(true);
      expect(result.previousStage).toBe("research");
      expect(result.newStage).toBe("replay");
    });

    it("rejects promotion when gates fail", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "replay" },
        error: null,
      });
      const metricsChain = chainBuilder({
        data: {
          signal_count: 100, // Below 500
          sharpe_ratio: 0.3, // Below 0.8
          max_drawdown_pct: 0.20, // Above 0.15
          hit_rate_pct: 0.30, // Below 0.45
          correlation: 0.5,
          sev1_free_days: 5,
          fill_sim_error_bps: 1,
          trade_count: 10,
          slippage_bps: 2,
          has_violations: false,
          dwell_days: 1, // Below 3
        },
        error: null,
      });

      setupTableMocks({
        strategy_lifecycle: lifecycleChain,
        strategy_metrics: metricsChain,
      });

      const result = await manager.attemptPromotion("strat-1");
      expect(result.promoted).toBe(false);
      expect(result.reason).toContain("Gate criteria not met");
      expect(result.reason).toContain("min_signals");
    });

    it("rejects promotion when metrics are missing", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "research" },
        error: null,
      });
      const metricsChain = chainBuilder({ data: null, error: { message: "not found" } });

      setupTableMocks({
        strategy_lifecycle: lifecycleChain,
        strategy_metrics: metricsChain,
      });

      const result = await manager.attemptPromotion("strat-1");
      expect(result.promoted).toBe(false);
      expect(result.reason).toContain("Missing metrics");
    });
  });

  // --------------------------------------------------------------------------
  // demote
  // --------------------------------------------------------------------------

  describe("demote", () => {
    it("demotes one stage down", async () => {
      const lifecycleChain = chainBuilder({
        data: {
          current_stage: "paper",
          id: "lc-1",
          promoted_count: 3,
          demoted_count: 0,
        },
        error: null,
      });
      const auditChain = makeInsertChain();

      setupTableMocks({
        strategy_lifecycle: lifecycleChain,
        lifecycle_audit: auditChain,
      });

      const newStage = await manager.demote("strat-1", "Risk veto exceeded");
      expect(newStage).toBe("shadow");
    });

    it("returns research if already at research (no further demotion)", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "research" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const newStage = await manager.demote("strat-1", "Some reason");
      expect(newStage).toBe("research");
    });
  });

  // --------------------------------------------------------------------------
  // canTrade
  // --------------------------------------------------------------------------

  describe("canTrade", () => {
    it("returns not allowed for research stage (0% budget)", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "research" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const result = await manager.canTrade("strat-1");
      expect(result.allowed).toBe(false);
      expect(result.maxBudgetPct).toBe(0);
    });

    it("returns not allowed for replay stage (0% budget)", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "replay" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const result = await manager.canTrade("strat-1");
      expect(result.allowed).toBe(false);
      expect(result.maxBudgetPct).toBe(0);
    });

    it("returns not allowed for shadow stage (0% budget)", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "shadow" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const result = await manager.canTrade("strat-1");
      expect(result.allowed).toBe(false);
      expect(result.maxBudgetPct).toBe(0);
    });

    it("returns allowed for paper stage (0.5% budget, 10 positions)", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "paper" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const result = await manager.canTrade("strat-1");
      expect(result.allowed).toBe(true);
      expect(result.maxBudgetPct).toBe(0.005);
      expect(result.maxPositions).toBe(10);
    });

    it("returns allowed for supervised_live (25% budget, 5 positions)", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "supervised_live" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const result = await manager.canTrade("strat-1");
      expect(result.allowed).toBe(true);
      expect(result.maxBudgetPct).toBe(0.25);
      expect(result.maxPositions).toBe(5);
    });

    it("returns allowed for autonomous_live (100% budget, unlimited positions)", async () => {
      const lifecycleChain = chainBuilder({
        data: { current_stage: "autonomous_live" },
        error: null,
      });
      setupTableMocks({ strategy_lifecycle: lifecycleChain });

      const result = await manager.canTrade("strat-1");
      expect(result.allowed).toBe(true);
      expect(result.maxBudgetPct).toBe(1.0);
      expect(result.maxPositions).toBe(Infinity);
    });
  });
});

// ============================================================================
// TESTS: Demotion Rules
// ============================================================================

describe("checkDemotionTriggers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns no demotion when strategy is at research", async () => {
    setupTableMocks({});

    const result = await checkDemotionTriggers("strat-1", "research");
    expect(result.shouldDemote).toBe(false);
    expect(result.reason).toContain("lowest stage");
  });

  it("triggers demotion on SEV1 incident for autonomous_live strategy", async () => {
    const incidentChain = chainBuilder({ data: [{ id: "inc-1" }], error: null });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "autonomous_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("sev1_incident");
    expect(result.targetStage).toBe("paper");
  });

  it("triggers demotion on recon break for supervised_live strategy", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [{ id: "recon-1" }], error: null });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "supervised_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("recon_break");
    expect(result.targetStage).toBe("paper");
  });

  it("triggers demotion on kill switch L3 for autonomous_live strategy", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: [{ level: "LEVEL_3_FREEZE" }], error: null });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "autonomous_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("kill_switch_l3_plus");
    expect(result.targetStage).toBe("supervised_live");
  });

  it("triggers demotion on 3+ risk vetoes in 24h", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({
      data: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
      error: null,
    });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "supervised_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("risk_vetoes_exceeded");
    expect(result.targetStage).toBe("paper");
  });

  it("does not demote when fewer than 3 risk vetoes", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({
      data: [{ id: "v1" }, { id: "v2" }],
      error: null,
    });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "supervised_live");
    expect(result.shouldDemote).toBe(false);
  });

  it("does not demote on kill switch L3 if already at supervised_live", async () => {
    // Kill switch L3+ demotes to supervised_live, but strategy is already there
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: [{ level: "LEVEL_3_FREEZE" }], error: null });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "supervised_live");
    // Kill switch target is supervised_live but strategy is already there,
    // so the trigger should not fire. But risk vetoes might cascade.
    // Since no vetoes exceed threshold, no demotion.
    expect(result.shouldDemote).toBe(false);
  });

  it("SEV1 takes priority over recon break", async () => {
    const incidentChain = chainBuilder({ data: [{ id: "inc-1" }], error: null });
    const reconChain = chainBuilder({ data: [{ id: "recon-1" }], error: null });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "autonomous_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("sev1_incident");
  });

  it("does not demote paper strategy on recon break (already at paper)", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [{ id: "recon-1" }], error: null });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "paper");
    // recon_break targets paper, but strategy is already at paper, so no demotion
    // risk vetoes < 3, so no demotion from that either
    expect(result.shouldDemote).toBe(false);
  });

  // ----------------------------------------------------------------------
  // Fail-CLOSED behavior — a missing/errored trigger table must never be
  // silently read as "the strategy is safe." Landmine: risk_vetoes and
  // recon_breaks are phantom tables today (always error), and
  // kill_switch_events/incidents can error transiently (RLS, network).
  // Pre-fix, ALL FOUR checks defaulted to "no trigger" on error — this
  // block used to assert exactly that ("no crash, no demotion") as if it
  // were correct. It was the bug.
  // ----------------------------------------------------------------------

  it("fails CLOSED (demotes) when every trigger table errors, instead of silently reporting safe", async () => {
    const incidentChain = chainBuilder({ data: null, error: { message: "db error" } });
    const reconChain = chainBuilder({ data: null, error: { message: "db error" } });
    const ksChain = chainBuilder({ data: null, error: { message: "db error" } });
    const vetoChain = chainBuilder({ data: null, error: { message: "db error" } });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "autonomous_live");
    // Highest-priority trigger (SEV1) fires first and demotes to paper.
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("sev1_incident");
    expect(result.targetStage).toBe("paper");
    expect(result.reason).toContain("failing closed");
  });

  it("fails CLOSED on a risk_vetoes query error (phantom table) — demotes one level", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({
      data: null,
      error: { message: 'relation "risk_vetoes" does not exist' },
    });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "supervised_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("risk_vetoes_exceeded");
    expect(result.reason).toContain("failing closed");
  });

  it("fails CLOSED on a recon_breaks query error (phantom table) — demotes to paper", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({
      data: null,
      error: { message: 'relation "recon_breaks" does not exist' },
    });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "supervised_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("recon_break");
    expect(result.targetStage).toBe("paper");
    expect(result.reason).toContain("failing closed");
  });

  it("fails CLOSED on a kill_switch_events query error (real table, transient failure) — demotes to supervised_live", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: null, error: { message: "connection reset" } });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "autonomous_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("kill_switch_l3_plus");
    expect(result.targetStage).toBe("supervised_live");
    expect(result.reason).toContain("failing closed");
  });

  it("fails CLOSED on an incidents (SEV1) query error (real table, transient failure) — demotes to paper", async () => {
    const incidentChain = chainBuilder({ data: null, error: { message: "connection reset" } });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: [{ level: "INACTIVE" }], error: null });
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "autonomous_live");
    expect(result.shouldDemote).toBe(true);
    expect(result.trigger).toBe("sev1_incident");
    expect(result.targetStage).toBe("paper");
    expect(result.reason).toContain("failing closed");
  });

  it("does NOT fail closed when kill_switch_events legitimately has zero rows (real empty state, not an error)", async () => {
    const incidentChain = chainBuilder({ data: [], error: null });
    const reconChain = chainBuilder({ data: [], error: null });
    const ksChain = chainBuilder({ data: [], error: null }); // no rows, no error
    const vetoChain = chainBuilder({ data: [], error: null });

    setupTableMocks({
      incidents: incidentChain,
      recon_breaks: reconChain,
      kill_switch_events: ksChain,
      risk_vetoes: vetoChain,
    });

    const result = await checkDemotionTriggers("strat-1", "autonomous_live");
    expect(result.shouldDemote).toBe(false);
  });
});
