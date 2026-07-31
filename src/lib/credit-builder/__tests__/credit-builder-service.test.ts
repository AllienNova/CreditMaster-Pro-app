// ============================================================================
// credit-builder-service.test.ts
//
// Strategy: CreditBuilderService is a private class; only the singleton is
// exported. We use jest.isolateModules + jest.doMock to inject a fresh chain
// per test group, then import the singleton from within that isolated scope.
// ============================================================================

// ============================================================================
// Chain factory
// ============================================================================

interface ChainOverrides {
  singleResults?: Array<{ data: unknown; error: unknown }>;
  selectResult?: { data: unknown[] | null; error: unknown };
}

function makeChain(overrides: ChainOverrides = {}) {
  const chain: Record<string, jest.Mock> = {};

  // Single results queue — each call to .single() pops one off
  const singleQueue = overrides.singleResults ?? [{ data: null, error: null }];
  let singleIdx = 0;
  chain.single = jest.fn().mockImplementation(() =>
    Promise.resolve(singleQueue[Math.min(singleIdx++, singleQueue.length - 1)]),
  );

  const selectResult = overrides.selectResult ?? { data: [], error: null };

  // Builder methods return chain
  chain.from = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.range = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);

  // Make chain thenable so `await chain` (financial_accounts path) resolves
  chain.then = jest.fn(
    (resolve: (v: { data: unknown[] | null; error: unknown }) => unknown) =>
      Promise.resolve(selectResult).then(resolve),
  );

  return chain;
}

// ============================================================================
// Helper: load a fresh singleton with a given supabase chain + optional AI mock
// ============================================================================

async function loadSvc(
  chain: ReturnType<typeof makeChain>,
  aiQuickResponse: jest.Mock = jest.fn().mockRejectedValue(new Error("AI down")),
) {
  let svc!: typeof import("../credit-builder-service")["default"];

  jest.isolateModules(() => {
    jest.doMock("@/lib/supabase/client", () => ({
      createClient: jest.fn().mockReturnValue(chain),
    }));
    jest.doMock("@/lib/ai-orchestrator", () => ({
      getAIOrchestrator: jest.fn().mockReturnValue({ quickResponse: aiQuickResponse }),
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    svc = require("../credit-builder-service").default;
  });

  return svc;
}

// ============================================================================
// Helper: like loadSvc, but also isolates @/lib/monitoring/logger so its
// `error` calls can be asserted on. A plain `jest.spyOn(logger, "error")` on
// the statically-imported logger does NOT see calls made by the service
// loaded via jest.isolateModules() above — isolateModules gives every
// module required inside it (including transitive ones like the logger)
// its own fresh registry, decoupled from modules required outside it.
// ============================================================================

async function loadSvcWithLoggerSpy(chain: { from: jest.Mock }) {
  const loggerErrorMock = jest.fn();
  let svc!: typeof import("../credit-builder-service")["default"];

  jest.isolateModules(() => {
    jest.doMock("@/lib/supabase/client", () => ({
      createClient: jest.fn().mockReturnValue(chain),
    }));
    jest.doMock("@/lib/ai-orchestrator", () => ({
      getAIOrchestrator: jest.fn().mockReturnValue({
        quickResponse: jest.fn().mockRejectedValue(new Error("AI down")),
      }),
    }));
    jest.doMock("@/lib/monitoring/logger", () => ({
      logger: {
        error: loggerErrorMock,
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    svc = require("../credit-builder-service").default;
  });

  return { svc, loggerErrorMock };
}

// ============================================================================
// Table-aware chain factory for getProgress — that method reads THREE
// tables in one call (credit_scores, credit_builder_actions, profiles) and
// two of them are both plain (non-.single()) selects, so the shared
// makeChain()'s single `selectResult` can't give scores and actions
// independent data. This gives each table its own result.
// ============================================================================

function tableChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  ["select", "eq", "order", "limit", "range"].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.single = jest.fn().mockResolvedValue(result);
  chain.then = jest.fn((resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve),
  );
  return chain;
}

function makeProgressChain(config: {
  scores?: { data: unknown[] | null; error?: unknown };
  actions?: { data: unknown[] | null; error?: unknown };
  profile?: { data: unknown; error?: unknown };
}) {
  const scoresChain = tableChain({
    data: config.scores?.data ?? [],
    error: config.scores?.error ?? null,
  });
  const actionsChain = tableChain({
    data: config.actions?.data ?? [],
    error: config.actions?.error ?? null,
  });
  const profileChain = tableChain({
    data: config.profile?.data ?? null,
    error: config.profile?.error ?? null,
  });

  return {
    from: jest.fn((table: string) => {
      if (table === "credit_scores") return scoresChain;
      if (table === "credit_builder_actions") return actionsChain;
      if (table === "profiles") return profileChain;
      return tableChain({ data: null, error: null });
    }),
  };
}

// ============================================================================
// calculateCreditBuilderScore
// ============================================================================

describe("CreditBuilderService › calculateCreditBuilderScore", () => {
  it("returns overall:72 when DB returns null data", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.calculateCreditBuilderScore("user-1");
    expect(result.overall).toBe(72);
  });

  it("returns overall:72 when DB returns an error", async () => {
    const chain = makeChain({
      singleResults: [{ data: null, error: { message: "db error" } }],
    });
    const svc = await loadSvc(chain);
    const result = await svc.calculateCreditBuilderScore("user-1");
    expect(result.overall).toBe(72);
  });

  it("returns trending:stable on default path", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.calculateCreditBuilderScore("user-1");
    expect(result.trending).toBe("stable");
  });

  it("computes weighted overall above the default 72 when full credit data is provided", async () => {
    // paymentHistory=100 creditUtilization=80 creditAge=45 creditMix=100 newCredit=100
    // overall = round(100*.35 + 80*.3 + 45*.15 + 100*.1 + 100*.1) = round(85.75) = 86
    const creditData = {
      score: 720,
      on_time_payments_pct: 100,
      utilization_pct: 20,
      avg_account_age_months: 30,
      account_types_count: 4,
      recent_inquiries: 0,
      updated_at: "2025-01-01T00:00:00.000Z",
    };
    const chain = makeChain({
      singleResults: [
        { data: creditData, error: null },
        { data: null, error: null },
      ],
    });
    const svc = await loadSvc(chain);
    const result = await svc.calculateCreditBuilderScore("user-1");
    // Must be above the default fallback of 72
    expect(result.overall).toBeGreaterThan(72);
    // Must be a valid credit builder score (0–100)
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("sets trending:up when current score > previous score", async () => {
    const creditData = {
      score: 720,
      on_time_payments_pct: 90,
      utilization_pct: 25,
      avg_account_age_months: 24,
      account_types_count: 2,
      recent_inquiries: 1,
      updated_at: "2025-01-01T00:00:00.000Z",
    };
    const chain = makeChain({
      singleResults: [
        { data: creditData, error: null },
        { data: { score: 680 }, error: null },
      ],
    });
    const svc = await loadSvc(chain);
    const result = await svc.calculateCreditBuilderScore("user-1");
    expect(result.trending).toBe("up");
  });

  it("sets trending:down when current score < previous score", async () => {
    const creditData = {
      score: 650,
      on_time_payments_pct: 80,
      utilization_pct: 40,
      avg_account_age_months: 12,
      account_types_count: 2,
      recent_inquiries: 2,
      updated_at: "2025-01-01T00:00:00.000Z",
    };
    const chain = makeChain({
      singleResults: [
        { data: creditData, error: null },
        { data: { score: 700 }, error: null },
      ],
    });
    const svc = await loadSvc(chain);
    const result = await svc.calculateCreditBuilderScore("user-1");
    expect(result.trending).toBe("down");
  });

  it("lastUpdated uses updated_at field from DB row", async () => {
    const creditData = {
      score: 700,
      on_time_payments_pct: 90,
      utilization_pct: 20,
      avg_account_age_months: 24,
      account_types_count: 2,
      recent_inquiries: 0,
      updated_at: "2024-06-15T00:00:00.000Z",
    };
    const chain = makeChain({
      singleResults: [
        { data: creditData, error: null },
        { data: null, error: null },
      ],
    });
    const svc = await loadSvc(chain);
    const result = await svc.calculateCreditBuilderScore("user-1");
    expect(result.lastUpdated.toISOString()).toBe("2024-06-15T00:00:00.000Z");
  });
});

// ============================================================================
// analyzeUtilization (pure computation — no DB)
// ============================================================================

describe("CreditBuilderService › analyzeUtilization", () => {
  it("calculates overall utilization as percentage of total balances/limits", async () => {
    const svc = await loadSvc(makeChain());
    const cards = [
      { cardName: "Visa", balance: 300, limit: 1000, utilization: 30 },
      { cardName: "MC", balance: 200, limit: 1000, utilization: 20 },
    ];
    const result = await svc.analyzeUtilization("user-1", cards);
    expect(result.current).toBe(25);
  });

  it("marks card with utilization < 30 as good", async () => {
    const svc = await loadSvc(makeChain());
    const cards = [{ cardName: "Visa", balance: 200, limit: 1000, utilization: 20 }];
    const result = await svc.analyzeUtilization("user-1", cards);
    expect(result.perCardUtilization[0].status).toBe("good");
  });

  it("marks card with utilization >= 30 and < 50 as warning", async () => {
    const svc = await loadSvc(makeChain());
    const cards = [{ cardName: "Visa", balance: 350, limit: 1000, utilization: 35 }];
    const result = await svc.analyzeUtilization("user-1", cards);
    expect(result.perCardUtilization[0].status).toBe("warning");
  });

  it("marks card with utilization >= 50 as danger", async () => {
    const svc = await loadSvc(makeChain());
    const cards = [{ cardName: "Visa", balance: 600, limit: 1000, utilization: 60 }];
    const result = await svc.analyzeUtilization("user-1", cards);
    expect(result.perCardUtilization[0].status).toBe("danger");
  });

  it("generates pay_down recommendation for card > 30% utilization", async () => {
    const svc = await loadSvc(makeChain());
    const cards = [{ cardName: "Visa", balance: 500, limit: 1000, utilization: 50 }];
    const result = await svc.analyzeUtilization("user-1", cards);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].action).toBe("pay_down");
  });

  it("generates no recommendations when all cards are at or below 30%", async () => {
    const svc = await loadSvc(makeChain());
    const cards = [{ cardName: "Visa", balance: 290, limit: 1000, utilization: 29 }];
    const result = await svc.analyzeUtilization("user-1", cards);
    expect(result.recommendations).toHaveLength(0);
  });

  it("recommendation impact is capped at 30", async () => {
    const svc = await loadSvc(makeChain());
    const cards = [{ cardName: "Visa", balance: 900, limit: 1000, utilization: 90 }];
    const result = await svc.analyzeUtilization("user-1", cards);
    expect(result.recommendations[0].impact).toBeLessThanOrEqual(30);
  });

  it("optimal utilization is always 10", async () => {
    const svc = await loadSvc(makeChain());
    const cards = [{ cardName: "Visa", balance: 500, limit: 1000, utilization: 50 }];
    const result = await svc.analyzeUtilization("user-1", cards);
    expect(result.optimal).toBe(10);
  });
});

// ============================================================================
// optimizePayments (pure computation — no DB)
// ============================================================================

describe("CreditBuilderService › optimizePayments", () => {
  function makeAccount(overrides: Record<string, unknown> = {}) {
    return {
      id: "acc-1",
      name: "Card A",
      type: "credit_card" as const,
      balance: 1000,
      minPayment: 25,
      apr: 20,
      dueDate: 15,
      reporting: true,
      priority: 1,
      ...overrides,
    };
  }

  it("returns a non-empty plan for a single account with sufficient budget", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.optimizePayments([makeAccount()], 500, "avalanche");
    expect(result.plan.length).toBeGreaterThan(0);
  });

  it("avalanche sorts by APR descending", async () => {
    const svc = await loadSvc(makeChain());
    const accounts = [
      makeAccount({ id: "a1", name: "Low", apr: 10, balance: 500 }),
      makeAccount({ id: "a2", name: "High", apr: 25, balance: 500 }),
    ];
    const result = await svc.optimizePayments(accounts, 100, "avalanche");
    expect(result.accounts[0].name).toBe("High");
  });

  it("snowball sorts by balance ascending", async () => {
    const svc = await loadSvc(makeChain());
    const accounts = [
      makeAccount({ id: "a1", name: "Large", apr: 15, balance: 2000 }),
      makeAccount({ id: "a2", name: "Small", apr: 15, balance: 300 }),
    ];
    const result = await svc.optimizePayments(accounts, 100, "snowball");
    expect(result.accounts[0].name).toBe("Small");
  });

  it("utilization strategy prioritizes credit_card over loan", async () => {
    const svc = await loadSvc(makeChain());
    const accounts = [
      makeAccount({ id: "a1", name: "Loan", type: "loan", balance: 500 }),
      makeAccount({ id: "a2", name: "Card", type: "credit_card", balance: 300 }),
    ];
    const result = await svc.optimizePayments(accounts, 100, "utilization");
    expect(result.accounts[0].name).toBe("Card");
  });

  it("totalInterestSaved is non-negative", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.optimizePayments([makeAccount()], 500, "avalanche");
    expect(result.totalInterestSaved).toBeGreaterThanOrEqual(0);
  });

  it("plan length does not exceed 60 months", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.optimizePayments(
      [makeAccount({ balance: 1_000_000, minPayment: 1 })],
      2,
      "avalanche",
    );
    expect(result.plan.length).toBeLessThanOrEqual(60);
  });

  it("returns empty plan for zero accounts", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.optimizePayments([], 500, "avalanche");
    expect(result.plan).toHaveLength(0);
  });

  it("creditScoreImpact is 0 when plan is empty", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.optimizePayments([], 500, "avalanche");
    expect(result.creditScoreImpact).toBe(0);
  });
});

// ============================================================================
// getRecommendedActions
// ============================================================================

describe("CreditBuilderService › getRecommendedActions", () => {
  it("returns default actions when AI orchestrator throws", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getRecommendedActions("user-1");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes creditMix short_term action when creditMix score < 70", async () => {
    // account_types_count=1 → creditMix=25 < 70
    const creditData = {
      score: 600,
      on_time_payments_pct: 90,
      utilization_pct: 20,
      avg_account_age_months: 24,
      account_types_count: 1,
      recent_inquiries: 0,
      updated_at: "2025-01-01T00:00:00.000Z",
    };
    const chain = makeChain({
      singleResults: [
        { data: creditData, error: null },
        { data: null, error: null },
      ],
    });
    const svc = await loadSvc(chain);
    const result = await svc.getRecommendedActions("user-1");
    const mixAction = result.find((a: { id: string }) => a.id === "st-1");
    expect(mixAction).toBeDefined();
  });

  it("returns at most 5 actions", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getRecommendedActions("user-1");
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// analyzeCreditMix
// ============================================================================

describe("CreditBuilderService › analyzeCreditMix", () => {
  it("returns an honest all-zero mix (not a fabricated installment:1 revolving:2) when no accounts returned", async () => {
    // Regression coverage: `current` used to start at a plausible-looking
    // {installment:1, revolving:2, ...} that only got overwritten when real
    // rows came back - so a user with zero financial_accounts rows was told
    // they had 1 installment + 2 revolving accounts. Empty must read as
    // honest zero, not an invented mix.
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditMix("user-1");
    expect(result.current).toEqual({
      installment: 0,
      revolving: 0,
      mortgage: 0,
      other: 0,
    });
  });

  it("recommends add_installment when installment count < ideal (2)", async () => {
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditMix("user-1");
    const rec = result.recommendations.find(
      (r: { type: string }) => r.type === "add_installment",
    );
    expect(rec).toBeDefined();
  });

  it("score is in range [0, 100]", async () => {
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditMix("user-1");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("classifies credit_card accounts as revolving", async () => {
    const accounts = [
      { account_type: "credit_card", account_subtype: null },
      { account_type: "credit_card", account_subtype: null },
      { account_type: "credit_card", account_subtype: null },
    ];
    const svc = await loadSvc(makeChain({ selectResult: { data: accounts, error: null } }));
    const result = await svc.analyzeCreditMix("user-1");
    expect(result.current.revolving).toBe(3);
  });

  it("classifies mortgage account_type as mortgage", async () => {
    const accounts = [{ account_type: "mortgage", account_subtype: null }];
    const svc = await loadSvc(makeChain({ selectResult: { data: accounts, error: null } }));
    const result = await svc.analyzeCreditMix("user-1");
    expect(result.current.mortgage).toBe(1);
  });

  it("classifies loan account_type as installment", async () => {
    const accounts = [
      { account_type: "loan", account_subtype: null },
      { account_type: "auto_loan", account_subtype: null },
    ];
    const svc = await loadSvc(makeChain({ selectResult: { data: accounts, error: null } }));
    const result = await svc.analyzeCreditMix("user-1");
    expect(result.current.installment).toBe(2);
  });
});

// ============================================================================
// analyzeCreditAge
// ============================================================================

describe("CreditBuilderService › analyzeCreditAge", () => {
  // Regression coverage: averageAge/oldestAccount/newestAccount used to
  // start at plausible-looking invented values (3.5 / 7 / 0.5 years) that
  // only got overwritten when real account rows came back - so a user with
  // zero financial_accounts rows was told they had a ~3.5 year old credit
  // history. Empty must read as honest zero, not an invented age.
  it("returns an honest averageAge:0 (not a fabricated 3.5) when no accounts returned", async () => {
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditAge("user-1");
    expect(result.averageAge).toBe(0);
  });

  it("returns an honest oldestAccount:0 (not a fabricated 7) when no accounts returned", async () => {
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditAge("user-1");
    expect(result.oldestAccount).toBe(0);
  });

  it("returns an honest newestAccount:0 (not a fabricated 0.5) when no accounts returned", async () => {
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditAge("user-1");
    expect(result.newestAccount).toBe(0);
  });

  it("returns two recommendations", async () => {
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditAge("user-1");
    expect(result.recommendations).toHaveLength(2);
  });

  it("keepAliveStrategy is a non-empty array", async () => {
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditAge("user-1");
    expect(result.keepAliveStrategy.length).toBeGreaterThan(0);
  });

  it("closedAccountsImpact is 15", async () => {
    const svc = await loadSvc(makeChain({ selectResult: { data: null, error: null } }));
    const result = await svc.analyzeCreditAge("user-1");
    expect(result.closedAccountsImpact).toBe(15);
  });

  it("computes averageAge from account opened_date (~2 years)", async () => {
    const twoYearsAgo = new Date(
      Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const accounts = [{ opened_date: twoYearsAgo, created_at: null }];
    const svc = await loadSvc(makeChain({ selectResult: { data: accounts, error: null } }));
    const result = await svc.analyzeCreditAge("user-1");
    expect(result.averageAge).toBeCloseTo(2, 0);
  });
});

// ============================================================================
// getCreditBuilderLoans
// ============================================================================

describe("CreditBuilderService › getCreditBuilderLoans", () => {
  it("returns a non-empty array of loans", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getCreditBuilderLoans("user-1");
    expect(result.length).toBeGreaterThan(0);
  });

  it("recommended loans sort before non-recommended ones", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getCreditBuilderLoans("user-1");
    // If there is any recommended=true it must appear before recommended=false
    const firstRecIdx = result.findIndex((l: { recommended: boolean }) => l.recommended);
    const firstNotRecIdx = result.findIndex((l: { recommended: boolean }) => !l.recommended);
    if (firstRecIdx !== -1 && firstNotRecIdx !== -1) {
      expect(firstRecIdx).toBeLessThan(firstNotRecIdx);
    }
  });

  it("each loan has id, provider, and reporting fields", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getCreditBuilderLoans("user-1");
    result.forEach((l: { id: unknown; provider: unknown; reporting: unknown }) => {
      expect(l.id).toBeDefined();
      expect(l.provider).toBeDefined();
      expect(l.reporting).toBeDefined();
    });
  });
});

// ============================================================================
// getSecuredCards
// ============================================================================

describe("CreditBuilderService › getSecuredCards", () => {
  it("returns a non-empty array of cards", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getSecuredCards("user-1");
    expect(result.length).toBeGreaterThan(0);
  });

  it("recommended cards sort before non-recommended ones", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getSecuredCards("user-1");
    const firstRecIdx = result.findIndex((c: { recommended: boolean }) => c.recommended);
    const firstNotRecIdx = result.findIndex((c: { recommended: boolean }) => !c.recommended);
    if (firstRecIdx !== -1 && firstNotRecIdx !== -1) {
      expect(firstRecIdx).toBeLessThan(firstNotRecIdx);
    }
  });

  it("each card has minDeposit and annualFee fields", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getSecuredCards("user-1");
    result.forEach((c: { minDeposit: unknown; annualFee: unknown }) => {
      expect(c.minDeposit).toBeDefined();
      expect(c.annualFee).toBeDefined();
    });
  });
});

// ============================================================================
// getAuthorizedUserStrategies
// ============================================================================

describe("CreditBuilderService › getAuthorizedUserStrategies", () => {
  it("returns a non-empty array of strategies", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getAuthorizedUserStrategies();
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes the family strategy", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getAuthorizedUserStrategies();
    expect(result.some((s: { strategy: string }) => s.strategy === "family")).toBe(true);
  });

  it("each strategy has pros, cons, and steps as arrays", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getAuthorizedUserStrategies();
    result.forEach(
      (s: { pros: unknown[]; cons: unknown[]; steps: unknown[] }) => {
        expect(Array.isArray(s.pros)).toBe(true);
        expect(Array.isArray(s.cons)).toBe(true);
        expect(Array.isArray(s.steps)).toBe(true);
      },
    );
  });

  it("each strategy has a numeric expectedImpact", async () => {
    const svc = await loadSvc(makeChain());
    const result = await svc.getAuthorizedUserStrategies();
    result.forEach((s: { expectedImpact: unknown }) => {
      expect(typeof s.expectedImpact).toBe("number");
    });
  });
});

// ============================================================================
// getProgress
// ============================================================================

describe("CreditBuilderService › getProgress", () => {
  // Regression coverage: getProgress used to wrap everything in a try/catch
  // that swallowed ANY failure - including genuine query errors - into a
  // wholesale fake profile (startScore:580, currentScore:650, targetScore:
  // 720, actionsCompleted:8, actionsTotal:12, a hardcoded 90-day tenure,
  // plus fabricated milestone achievedAt dates). That response was 100%
  // invented and indistinguishable from real data. The route
  // (app/api/credit-builder/progress/route.ts) already has its own catch
  // block that returns a proper 500, so letting a genuine failure propagate
  // here is more honest than disguising it as a successful response.
  it("propagates a genuine query failure instead of returning a fabricated fallback profile", async () => {
    const chain = makeChain();
    chain.then = jest.fn(
      (_resolve: unknown, reject: ((e: Error) => unknown) | undefined) =>
        Promise.reject(new Error("db error")).catch(reject ?? (() => undefined)),
    );
    const svc = await loadSvc(chain);
    await expect(svc.getProgress("user-1")).rejects.toThrow("db error");
  });

  it("returns an honest all-zero progress (not fabricated 580/650/720/8/12/90/85) when the user has no tracked data", async () => {
    const svc = await loadSvc(
      makeProgressChain({
        scores: { data: [] },
        actions: { data: [] },
        profile: { data: null },
      }),
    );
    const result = await svc.getProgress("user-1");
    expect(result).toMatchObject({
      userId: "user-1",
      startScore: 0,
      currentScore: 0,
      targetScore: 0,
      pointsGained: 0,
      daysActive: 0,
      actionsCompleted: 0,
      actionsTotal: 0,
      successRate: 0,
    });
    expect(result.milestones).toHaveLength(3);
    expect(result.milestones.every((m) => !m.achieved)).toBe(true);
  });

  it("computes real startScore/currentScore/pointsGained from credit_scores rows instead of 580/650", async () => {
    const svc = await loadSvc(
      makeProgressChain({
        scores: {
          data: [
            { score: 610, created_at: "2026-01-01T00:00:00.000Z" },
            { score: 655, created_at: "2026-06-01T00:00:00.000Z" },
          ],
        },
      }),
    );
    const result = await svc.getProgress("user-1");
    expect(result.startScore).toBe(610);
    expect(result.currentScore).toBe(655);
    expect(result.pointsGained).toBe(45);
  });

  it("computes real daysActive from profiles.created_at instead of a hardcoded 90", async () => {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const svc = await loadSvc(
      makeProgressChain({ profile: { data: { created_at: thirtyDaysAgo } } }),
    );
    const result = await svc.getProgress("user-1");
    expect(result.daysActive).toBeGreaterThanOrEqual(29);
    expect(result.daysActive).toBeLessThanOrEqual(31);
  });

  it("does not coerce a legitimately-zero completed count back up to 8 (the || self-heal bug)", async () => {
    // `actions?.filter(...).length || 8` used to treat a real 0 as falsy and
    // re-substitute the fabricated constant - so even once
    // credit_builder_actions exists and returns real rows, a user with zero
    // completed actions out of several tracked ones would still read 8.
    const svc = await loadSvc(
      makeProgressChain({
        actions: {
          data: [
            { id: "a1", completed: false },
            { id: "a2", completed: false },
            { id: "a3", completed: false },
          ],
        },
      }),
    );
    const result = await svc.getProgress("user-1");
    expect(result.actionsCompleted).toBe(0);
    expect(result.actionsTotal).toBe(3);
    expect(result.successRate).toBe(0);
  });

  it("logs (does not silently swallow) a credit_scores read error while still degrading to the honest empty state", async () => {
    const { svc, loggerErrorMock } = await loadSvcWithLoggerSpy(
      makeProgressChain({
        scores: {
          data: null,
          error: { message: "connection reset", code: "08006" },
        },
      }),
    );
    const result = await svc.getProgress("user-1");

    expect(result.currentScore).toBe(0);
    expect(loggerErrorMock).toHaveBeenCalled();
    const [message, loggedError] = loggerErrorMock.mock.calls[0];
    expect(String(message)).toContain("credit_scores");
    expect(loggedError).toBeInstanceOf(Error);
  });
});
