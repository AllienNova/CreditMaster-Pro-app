jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

jest.mock("@/lib/trading/modes/operating-mode-manager", () => ({
  createOperatingModeManager: jest.fn(),
}));

jest.mock("@/lib/trading/pctt/pctt-trading-service", () => ({
  PCTTTradingService: jest.fn().mockImplementation(() => ({
    analyzeForTrade: jest.fn().mockResolvedValue(null),
    executeTrade: jest.fn().mockResolvedValue({ success: false }),
    getTradingStats: jest.fn().mockResolvedValue({
      dailyPL: 0,
      totalExposure: 50000,
      openPositionCount: 0,
      canTrade: true,
    }),
  })),
}));

jest.mock("../signal-scanner", () => ({
  runScanCycle: jest.fn().mockResolvedValue({
    cycleId: "scan_1",
    userId: "user_1",
    startedAt: Date.now(),
    completedAt: Date.now(),
    symbolsScanned: 10,
    signalsFound: 0,
    tradesQueued: 0,
    errors: [],
    results: [],
  }),
  fetchCandles: jest.fn().mockResolvedValue([]),
}));

jest.mock("../autonomous-executor", () => ({
  executeAutonomousTrade: jest.fn().mockResolvedValue({
    success: true,
    symbol: "AAPL",
    side: "buy",
    executedAt: Date.now(),
    latencyMs: 50,
  }),
  checkPortfolioHealth: jest.fn().mockResolvedValue({
    userId: "user_1",
    checkedAt: Date.now(),
    healthy: true,
    dailyPL: 0,
    dailyPLPercent: 0,
    lossVelocity: 0,
    openPositions: 0,
    totalExposure: 0,
    killSwitchTriggered: false,
    alerts: [],
  }),
  checkGraduation: jest.fn().mockResolvedValue({
    graduated: false,
    fromMode: "AUTONOMOUS",
    reason: "Already at highest mode",
  }),
}));

jest.mock("../market-hours", () => ({
  isMarketOpen: jest.fn().mockReturnValue({ isOpen: true, reason: "Market open", minutesUntilClose: 120 }),
  isNearMarketClose: jest.fn().mockReturnValue(false),
}));

import { AutonomousScheduler, createAutonomousScheduler } from "../autonomous-scheduler";
import { createOperatingModeManager } from "@/lib/trading/modes/operating-mode-manager";

const mockModeManager = {
  getModeStatus: jest.fn().mockResolvedValue({
    success: true,
    data: { currentMode: "autonomous" },
  }),
  getGraduationProgress: jest.fn(),
  graduate: jest.fn(),
};

(createOperatingModeManager as jest.Mock).mockReturnValue(mockModeManager);

describe("AutonomousScheduler", () => {
  let scheduler: AutonomousScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    (createOperatingModeManager as jest.Mock).mockReturnValue(mockModeManager);
    mockModeManager.getModeStatus.mockResolvedValue({
      success: true,
      data: { currentMode: "autonomous" },
    });
    jest.useFakeTimers();
    scheduler = new AutonomousScheduler("user_1", {
      maxConcurrentExecutions: 2,
      maxJobRetries: 1,
      jobTimeoutMs: 5000,
    });
  });

  afterEach(() => {
    scheduler.stop();
    jest.useRealTimers();
  });

  // ========================================================================
  // LIFECYCLE
  // ========================================================================
  describe("start", () => {
    it("starts successfully when user is in AUTONOMOUS mode", async () => {
      const result = await scheduler.start();
      expect(result.success).toBe(true);

      const state = scheduler.getState();
      expect(state.status).toBe("running");
      expect(state.startedAt).toBeDefined();
    });

    it("fails when user is not in AUTONOMOUS mode", async () => {
      mockModeManager.getModeStatus.mockResolvedValueOnce({
        success: true,
        data: { currentMode: "watch" },
      });

      const result = await scheduler.start();
      expect(result.success).toBe(false);
      expect(result.error).toContain("watch mode");

      const state = scheduler.getState();
      expect(state.status).toBe("stopped");
    });

    it("fails when mode status retrieval fails", async () => {
      mockModeManager.getModeStatus.mockResolvedValueOnce({
        success: false,
        error: "DB error",
      });

      const result = await scheduler.start();
      expect(result.success).toBe(false);
      expect(result.error).toContain("verify operating mode");

      const state = scheduler.getState();
      expect(state.status).toBe("error");
    });

    it("prevents double-start", async () => {
      await scheduler.start();
      const result = await scheduler.start();
      expect(result.success).toBe(false);
      expect(result.error).toContain("already running");
    });
  });

  describe("stop", () => {
    it("stops a running service", async () => {
      await scheduler.start();
      scheduler.stop();

      const state = scheduler.getState();
      expect(state.status).toBe("stopped");
    });

    it("drains the job queue on stop", async () => {
      await scheduler.start();
      const queue = scheduler.getJobQueue();
      queue.enqueue({
        type: "signal_scan",
        userId: "user_1",
        timestamp: Date.now(),
        data: {},
      });
      scheduler.stop();

      const stats = queue.getStats();
      expect(stats.pending).toBe(0);
    });
  });

  describe("pause / resume", () => {
    it("pauses a running service", async () => {
      await scheduler.start();
      scheduler.pause();

      expect(scheduler.getState().status).toBe("paused");
    });

    it("resumes a paused service", async () => {
      await scheduler.start();
      scheduler.pause();
      scheduler.resume();

      expect(scheduler.getState().status).toBe("running");
    });

    it("pause is no-op when not running", () => {
      scheduler.pause();
      expect(scheduler.getState().status).toBe("stopped");
    });

    it("resume is no-op when not paused", async () => {
      await scheduler.start();
      scheduler.resume(); // Already running, should stay running
      expect(scheduler.getState().status).toBe("running");
    });
  });

  // ========================================================================
  // STATE
  // ========================================================================
  describe("getState", () => {
    it("returns initial state", () => {
      const state = scheduler.getState();
      expect(state.status).toBe("stopped");
      expect(state.startedAt).toBeNull();
      expect(state.lastScanAt).toBeNull();
      expect(state.lastHealthCheckAt).toBeNull();
      expect(state.totalScans).toBe(0);
      expect(state.totalTradesExecuted).toBe(0);
      expect(state.totalErrors).toBe(0);
      expect(state.activeJobs).toBe(0);
      expect(state.uptimeMs).toBe(0);
      expect(state.version).toBe("1.0.0");
    });

    it("calculates uptimeMs after start", async () => {
      await scheduler.start();
      jest.advanceTimersByTime(5000);

      const state = scheduler.getState();
      expect(state.uptimeMs).toBeGreaterThanOrEqual(5000);
    });
  });

  // ========================================================================
  // MANUAL TRIGGERS
  // ========================================================================
  describe("manual triggers", () => {
    it("triggerScan enqueues a signal_scan job", () => {
      const jobId = scheduler.triggerScan();
      expect(jobId).toMatch(/^job_/);

      const job = scheduler.getJobQueue().getJob(jobId);
      expect(job!.payload.type).toBe("signal_scan");
    });

    it("triggerHealthCheck enqueues a portfolio_health job", () => {
      const jobId = scheduler.triggerHealthCheck();
      expect(jobId).toMatch(/^job_/);

      const job = scheduler.getJobQueue().getJob(jobId);
      expect(job!.payload.type).toBe("portfolio_health");
    });

    it("triggerGraduationCheck enqueues a graduation_check job", () => {
      const jobId = scheduler.triggerGraduationCheck();
      expect(jobId).toMatch(/^job_/);

      const job = scheduler.getJobQueue().getJob(jobId);
      expect(job!.payload.type).toBe("graduation_check");
    });
  });

  // ========================================================================
  // FACTORY
  // ========================================================================
  describe("createAutonomousScheduler", () => {
    it("creates a scheduler instance", () => {
      const s = createAutonomousScheduler("user_1");
      expect(s).toBeInstanceOf(AutonomousScheduler);
      s.stop();
    });

    it("accepts optional configs", () => {
      const s = createAutonomousScheduler(
        "user_1",
        { minQScore: 0.75 },
        { riskPerTrade: 0.01 },
      );
      expect(s).toBeInstanceOf(AutonomousScheduler);
      s.stop();
    });
  });
});
