// Mock getSupabase BEFORE any import — it's called at module level in the source
const mockSupabase = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  lte: jest.fn(),
  gte: jest.fn(),
  order: jest.fn(),
  single: jest.fn(),
};

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => mockSupabase,
}));

import {
  ContributionSchedulerService,
  type ScheduledContribution,
} from "../ContributionSchedulerService";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Returns a fresh terminal-eq object for update chains.
 * update().eq("id", x) is always the terminal call in this service — it is
 * awaited directly. We give update() its own eq so it never contaminates the
 * shared select chain.
 */
function makeUpdateChain() {
  return { eq: jest.fn().mockResolvedValue({ error: null }) };
}

/**
 * Returns a fresh insert object — insert() is awaited directly (no chaining).
 */
function makeInsertResult() {
  return Promise.resolve({ error: null });
}

function makeContribution(
  overrides: Partial<ScheduledContribution> = {},
): ScheduledContribution {
  return {
    id: "c-1",
    scheduleId: "sched-1",
    goalId: "goal-1",
    goalName: "Emergency Fund",
    amount: 200,
    sourceAccountId: "acct-1",
    sourceAccountName: "Checking",
    scheduledDate: new Date(),
    status: "pending",
    retryCount: 0,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ContributionSchedulerService", () => {
  let svc: ContributionSchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: from() returns mockSupabase (chainable)
    mockSupabase.from.mockReturnValue(mockSupabase);

    // select/eq/lte/gte return mockSupabase (stay chainable through any depth)
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.lte.mockReturnValue(mockSupabase);
    mockSupabase.gte.mockReturnValue(mockSupabase);

    // order resolves (terminal for getDueContributions)
    mockSupabase.order.mockResolvedValue({ data: [], error: null });

    // single resolves (terminal for isGoalActive / checkAccountBalance / etc.)
    mockSupabase.single.mockResolvedValue({ data: null, error: null });

    // update returns its own isolated chain so its .eq() is terminal
    mockSupabase.update.mockReturnValue(makeUpdateChain());

    // insert resolves directly
    mockSupabase.insert.mockReturnValue(makeInsertResult());

    svc = new ContributionSchedulerService();
  });

  afterEach(() => {
    svc.stop();
  });

  // --------------------------------------------------------------------------
  // Scheduler lifecycle
  // --------------------------------------------------------------------------

  describe("start / stop / isActive", () => {
    it("isActive returns false before start", () => {
      expect(svc.isActive()).toBe(false);
    });

    it("isActive returns true after start", () => {
      svc.start(60);
      expect(svc.isActive()).toBe(true);
    });

    it("isActive returns false after stop", () => {
      svc.start(60);
      svc.stop();
      expect(svc.isActive()).toBe(false);
    });

    it("calling start twice does not break stop (idempotent)", () => {
      svc.start(60);
      svc.start(60);
      svc.stop();
      expect(svc.isActive()).toBe(false);
    });

    it("calling stop when not running does not throw", () => {
      expect(() => svc.stop()).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // getStats defaults
  // --------------------------------------------------------------------------

  describe("getStats", () => {
    it("returns pendingContributions=0 initially", () => {
      expect(svc.getStats().pendingContributions).toBe(0);
    });

    it("returns completedToday=0 initially", () => {
      expect(svc.getStats().completedToday).toBe(0);
    });

    it("returns failedToday=0 initially", () => {
      expect(svc.getStats().failedToday).toBe(0);
    });

    it("returns totalProcessedThisMonth=0 initially", () => {
      expect(svc.getStats().totalProcessedThisMonth).toBe(0);
    });

    it("returns totalAmountThisMonth=0 initially", () => {
      expect(svc.getStats().totalAmountThisMonth).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // SchedulerConfig — maxRetries override
  // --------------------------------------------------------------------------

  describe("SchedulerConfig", () => {
    it("custom maxRetries is respected — retryCount >= maxRetries returns Max retries exceeded", async () => {
      const custom = new ContributionSchedulerService({ maxRetries: 5 });

      // getContribution → single returns row with retry_count=5
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "c-x",
          schedule_id: "s-1",
          amount: 100,
          source_account_id: "a-1",
          scheduled_date: new Date().toISOString(),
          status: "failed",
          retry_count: 5,
          contribution_schedules: { goal_id: "g-1" },
          financial_goals: { name: "Goal" },
          bank_accounts: { name: "Checking" },
        },
        error: null,
      });

      const result = await custom.retryContribution("c-x");

      expect(result.error).toBe("Max retries exceeded");
      custom.stop();
    });
  });

  // --------------------------------------------------------------------------
  // events$ observable
  // --------------------------------------------------------------------------

  describe("events$", () => {
    it("emits processing event when processContribution is called", async () => {
      const events: string[] = [];
      svc.events$.subscribe((e) => events.push(e.type));

      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })    // isGoalActive
        .mockResolvedValueOnce({ data: { balance: 1000 }, error: null })        // checkAccountBalance
        .mockResolvedValueOnce({ data: { current_amount: 0 }, error: null })   // updateGoalProgress
        .mockResolvedValueOnce({ data: null, error: null });                    // scheduleNext → bail

      await svc.processContribution(makeContribution());

      expect(events).toContain("processing");
    });

    it("emits completed event when transfer succeeds", async () => {
      const events: string[] = [];
      svc.events$.subscribe((e) => events.push(e.type));

      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })
        .mockResolvedValueOnce({ data: { balance: 1000 }, error: null })
        .mockResolvedValueOnce({ data: { current_amount: 0 }, error: null }) // updateGoalProgress
        .mockResolvedValueOnce({ data: null, error: null }); // scheduleNext → bail

      await svc.processContribution(makeContribution());

      expect(events).toContain("completed");
    });

    it("emits skipped event when goal is paused", async () => {
      const events: string[] = [];
      svc.events$.subscribe((e) => events.push(e.type));

      // isGoalActive → paused
      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "paused" }, error: null })
        // scheduleNextContribution → null
        .mockResolvedValueOnce({ data: null, error: null });

      await svc.processContribution(makeContribution());

      expect(events).toContain("skipped");
    });

    it("emits failed event when balance is insufficient and autoSkip is false", async () => {
      const events: string[] = [];
      svc.events$.subscribe((e) => events.push(e.type));

      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })
        .mockResolvedValueOnce({ data: { balance: 1 }, error: null }); // balance < amount

      await svc.processContribution(makeContribution({ amount: 500 }));

      expect(events).toContain("failed");
    });
  });

  // --------------------------------------------------------------------------
  // processContribution — return values
  // --------------------------------------------------------------------------

  describe("processContribution", () => {
    it("returns success=true when all checks pass and transfer succeeds", async () => {
      // Call order: updateContributionStatus(update/eq), isGoalActive(single#1),
      // checkAccountBalance(single#2), completeContribution(update/eq + insert),
      // updateGoalProgress(single#3 for select, update/eq for update),
      // scheduleNextContribution(single#4 → null → early return)
      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })  // isGoalActive
        .mockResolvedValueOnce({ data: { balance: 1000 }, error: null })      // checkAccountBalance
        .mockResolvedValueOnce({ data: { current_amount: 0 }, error: null }) // updateGoalProgress
        .mockResolvedValueOnce({ data: null, error: null });                  // scheduleNext → bail

      const result = await svc.processContribution(makeContribution());

      expect(result.success).toBe(true);
    });

    it("returns failureReason=goal_paused when goal is inactive", async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "paused" }, error: null })
        .mockResolvedValueOnce({ data: null, error: null }); // scheduleNext

      const result = await svc.processContribution(makeContribution());

      expect(result.failureReason).toBe("goal_paused");
    });

    it("returns success=false when goal is inactive", async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "paused" }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await svc.processContribution(makeContribution());

      expect(result.success).toBe(false);
    });

    it("returns failureReason=insufficient_funds when balance is low", async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })
        .mockResolvedValueOnce({ data: { balance: 1 }, error: null });

      const result = await svc.processContribution(makeContribution({ amount: 999 }));

      expect(result.failureReason).toBe("insufficient_funds");
    });

    it("returns contributionId matching input id", async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })
        .mockResolvedValueOnce({ data: { balance: 1000 }, error: null })
        .mockResolvedValueOnce({ data: { current_amount: 0 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null }); // scheduleNext → bail

      const result = await svc.processContribution(makeContribution({ id: "c-unique-99" }));

      expect(result.contributionId).toBe("c-unique-99");
    });

    it("returns amount=contribution.amount on success", async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })
        .mockResolvedValueOnce({ data: { balance: 1000 }, error: null })
        .mockResolvedValueOnce({ data: { current_amount: 0 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null }); // scheduleNext → bail

      const result = await svc.processContribution(makeContribution({ amount: 350 }));

      expect(result.amount).toBe(350);
    });

    it("returns failureReason=insufficient_funds and skips when autoSkip is enabled", async () => {
      const svcAutoSkip = new ContributionSchedulerService({
        autoSkipInsufficientFunds: true,
      });

      mockSupabase.single
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })
        .mockResolvedValueOnce({ data: { balance: 1 }, error: null })
        .mockResolvedValueOnce({ data: null, error: null }); // scheduleNext

      const result = await svcAutoSkip.processContribution(makeContribution({ amount: 999 }));

      expect(result.failureReason).toBe("insufficient_funds");
      svcAutoSkip.stop();
    });
  });

  // --------------------------------------------------------------------------
  // retryContribution
  // --------------------------------------------------------------------------

  describe("retryContribution", () => {
    it("returns error=Contribution not found when contribution does not exist", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await svc.retryContribution("nonexistent");

      expect(result.error).toBe("Contribution not found");
    });

    it("returns success=false when contribution is not found", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await svc.retryContribution("nonexistent");

      expect(result.success).toBe(false);
    });

    it("returns error=Max retries exceeded when retryCount equals default maxRetries (3)", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "c-1",
          schedule_id: "s-1",
          amount: 100,
          source_account_id: "a-1",
          scheduled_date: new Date().toISOString(),
          status: "failed",
          retry_count: 3,
          contribution_schedules: { goal_id: "g-1" },
          financial_goals: { name: "Goal" },
          bank_accounts: { name: "Checking" },
        },
        error: null,
      });

      const result = await svc.retryContribution("c-1");

      expect(result.error).toBe("Max retries exceeded");
    });

    it("emits retrying event before processing", async () => {
      const events: string[] = [];
      svc.events$.subscribe((e) => events.push(e.type));

      mockSupabase.single
        // getContribution
        .mockResolvedValueOnce({
          data: {
            id: "c-1",
            schedule_id: "s-1",
            amount: 100,
            source_account_id: "a-1",
            scheduled_date: new Date().toISOString(),
            status: "failed",
            retry_count: 1,
            contribution_schedules: { goal_id: "g-1" },
            financial_goals: { name: "Goal" },
            bank_accounts: { name: "Checking" },
          },
          error: null,
        })
        // processContribution → isGoalActive
        .mockResolvedValueOnce({ data: { status: "active" }, error: null })
        // checkAccountBalance
        .mockResolvedValueOnce({ data: { balance: 1000 }, error: null })
        // updateGoalProgress
        .mockResolvedValueOnce({ data: { current_amount: 0 }, error: null })
        // scheduleNextContribution → null → bails early
        .mockResolvedValueOnce({ data: null, error: null });

      await svc.retryContribution("c-1");

      expect(events).toContain("retrying");
    });
  });

  // --------------------------------------------------------------------------
  // skipContribution
  // --------------------------------------------------------------------------

  describe("skipContribution", () => {
    it("sets contribution.status to skipped", async () => {
      // scheduleNextContribution → single returns null → bails early
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const contribution = makeContribution();
      await svc.skipContribution(contribution, "goal_paused");

      expect(contribution.status).toBe("skipped");
    });

    it("sets contribution.failureReason to provided reason", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const contribution = makeContribution();
      await svc.skipContribution(contribution, "insufficient_funds");

      expect(contribution.failureReason).toBe("insufficient_funds");
    });

    it("emits skipped event", async () => {
      const events: string[] = [];
      svc.events$.subscribe((e) => events.push(e.type));

      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const contribution = makeContribution();
      await svc.skipContribution(contribution, "network_error");

      expect(events).toContain("skipped");
    });
  });
});
