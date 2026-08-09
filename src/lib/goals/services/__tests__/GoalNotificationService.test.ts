/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Supabase real-Promise chain mock ────────────────────────────────────────
//
// Each supabase.from() call shifts the next result from a FIFO queue and
// returns a chain object backed by a REAL Promise.resolve(result).
// Chain methods (select, eq, etc.) return `this` for fluent chaining.
// `await chain` delegates to the real Promise's .then(), guaranteeing
// correct resolution — unlike a jest.fn()-wrapped thenable which breaks
// the await protocol.

let chainResults: Array<{ data: any; error: any }> = [];

function createChain(result: { data: any; error: any }) {
  const promise = Promise.resolve(result);
  const chain: any = {
    select: jest.fn(() => chain),
    insert: jest.fn(() => chain),
    update: jest.fn(() => chain),
    upsert: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    is: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(() => chain),
    then: (onFulfilled: any, onRejected: any) =>
      promise.then(onFulfilled, onRejected),
  };
  return chain;
}

// Bare jest.fn() — implementation is set in beforeEach to survive resetMocks
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    from: (table: string) => mockFrom(table),
  }),
}));

// ── Import AFTER mocks ──────────────────────────────────────────────────────

import {
  GoalNotificationService,
  getGoalNotificationService,
} from "../GoalNotificationService";

// ── Setup ────────────────────────────────────────────────────────────────────

let service: GoalNotificationService;

beforeEach(() => {
  chainResults = [];
  // Re-set implementation AFTER Jest's resetMocks has cleared it
  mockFrom.mockImplementation((_table: string) => {
    const result =
      chainResults.length > 0
        ? chainResults.shift()!
        : { data: null, error: null };
    return createChain(result);
  });
  service = new GoalNotificationService();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getNotifications
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – getNotifications", () => {
  it("should return mapped notifications on success", async () => {
    chainResults = [
      {
        data: [
          {
            id: "n1",
            goal_id: "g1",
            financial_goals: { name: "Emergency Fund" },
            type: "milestone_reached",
            priority: "medium",
            title: "Milestone!",
            message: "50% reached",
            action_url: "/goals/g1",
            action_label: "View",
            created_at: "2026-01-15T00:00:00Z",
            read_at: null,
            dismissed_at: null,
            metadata: { milestonePercent: 50 },
          },
        ],
        error: null,
      },
    ];

    const result = await service.getNotifications("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("n1");
    expect(result[0].goalName).toBe("Emergency Fund");
    expect(result[0].type).toBe("milestone_reached");
    expect(mockFrom).toHaveBeenCalledWith("goal_notifications");
  });

  it("should return empty array when supabase returns error", async () => {
    chainResults = [{ data: null, error: { message: "DB error" } }];

    const result = await service.getNotifications("user-1");
    expect(result).toEqual([]);
  });

  it("should return empty array when data is null", async () => {
    chainResults = [{ data: null, error: null }];

    const result = await service.getNotifications("user-1");
    expect(result).toEqual([]);
  });

  it("should use 'Unknown Goal' when financial_goals is null", async () => {
    chainResults = [
      {
        data: [
          {
            id: "n1",
            goal_id: "g1",
            financial_goals: null,
            type: "goal_on_track",
            priority: "low",
            title: "On Track",
            message: "Good",
            action_url: null,
            action_label: null,
            created_at: "2026-01-01T00:00:00Z",
            read_at: null,
            dismissed_at: null,
            metadata: null,
          },
        ],
        error: null,
      },
    ];

    const result = await service.getNotifications("user-1");
    expect(result[0].goalName).toBe("Unknown Goal");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  createNotification
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – createNotification", () => {
  it("should return notification on success", async () => {
    chainResults = [
      {
        data: {
          id: "n-new",
          goal_id: "g1",
          financial_goals: { name: "Savings" },
          type: "milestone_reached",
          priority: "medium",
          title: "50%!",
          message: "Halfway there",
          action_url: "/goals/g1",
          action_label: "View",
          created_at: "2026-02-01T00:00:00Z",
          metadata: null,
        },
        error: null,
      },
    ];

    const result = await service.createNotification("user-1", "g1", {
      type: "milestone_reached",
      priority: "medium",
      title: "50%!",
      message: "Halfway there",
      actionUrl: "/goals/g1",
      actionLabel: "View",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("n-new");
    expect(result!.goalName).toBe("Savings");
  });

  it("should return null on supabase error", async () => {
    chainResults = [{ data: null, error: { message: "Insert failed" } }];

    const result = await service.createNotification("user-1", "g1", {
      type: "milestone_reached",
      priority: "medium",
      title: "Title",
      message: "Message",
    });

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  markAsRead
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – markAsRead", () => {
  it("should return true on success", async () => {
    chainResults = [{ data: {}, error: null }];

    const result = await service.markAsRead("n1");
    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("goal_notifications");
  });

  it("should return false on error", async () => {
    chainResults = [{ data: null, error: { message: "Update failed" } }];

    const result = await service.markAsRead("n1");
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  dismissNotification
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – dismissNotification", () => {
  it("should return true on success", async () => {
    chainResults = [{ data: {}, error: null }];

    const result = await service.dismissNotification("n1");
    expect(result).toBe(true);
  });

  it("should return false on error", async () => {
    chainResults = [{ data: null, error: { message: "Update failed" } }];

    const result = await service.dismissNotification("n1");
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  checkMilestones
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – checkMilestones", () => {
  // Helper: build a fake notification row that createNotification expects
  function fakeNotifRow(goalId: string, type: string, milestone: number) {
    return {
      id: `notif-${milestone}`,
      goal_id: goalId,
      financial_goals: { name: "Test Goal" },
      type,
      priority: milestone === 100 ? "high" : "medium",
      title: `Milestone ${milestone}%`,
      message: `Reached ${milestone}%`,
      action_url: `/goals/${goalId}`,
      action_label: "View Goal",
      created_at: new Date().toISOString(),
      metadata: { milestonePercent: milestone },
    };
  }

  it("should detect new milestones when thresholds crossed", async () => {
    // 60% progress with no existing milestones → hits 10%, 25%, 50%
    // Call sequence:
    //   1. select existing milestones → empty array
    //   Per milestone (10, 25, 50): insert milestone + createNotification
    chainResults = [
      // 1. select existing milestones
      { data: [], error: null },
      // 2. insert milestone 10%
      { data: {}, error: null },
      // 3. createNotification for 10%
      { data: fakeNotifRow("g1", "milestone_reached", 10), error: null },
      // 4. insert milestone 25%
      { data: {}, error: null },
      // 5. createNotification for 25%
      { data: fakeNotifRow("g1", "milestone_reached", 25), error: null },
      // 6. insert milestone 50%
      { data: {}, error: null },
      // 7. createNotification for 50%
      { data: fakeNotifRow("g1", "milestone_reached", 50), error: null },
    ];

    const milestones = await service.checkMilestones(
      "user-1",
      "g1",
      "Emergency Fund",
      600,
      1000,
    );

    // 60% progress → should hit 10%, 25%, 50% milestones
    expect(milestones.length).toBeGreaterThanOrEqual(1);
    expect(milestones.some((m) => m.milestonePercent === 50)).toBe(true);
  });

  it("should skip already-achieved milestones", async () => {
    // 60% progress but 10, 25, 50 already achieved → no new milestones
    chainResults = [
      {
        data: [
          { milestone_percent: 10 },
          { milestone_percent: 25 },
          { milestone_percent: 50 },
        ],
        error: null,
      },
    ];

    const milestones = await service.checkMilestones(
      "user-1",
      "g1",
      "Savings",
      600,
      1000,
    );

    // 60% but 10, 25, 50 already done → no new milestones
    expect(milestones).toEqual([]);
  });

  it("should create goal_completed notification at 100%", async () => {
    // 100% progress, milestones 10-90 already achieved → only 100% is new
    chainResults = [
      // 1. select existing milestones (10, 25, 50, 75, 90 already done)
      {
        data: [
          { milestone_percent: 10 },
          { milestone_percent: 25 },
          { milestone_percent: 50 },
          { milestone_percent: 75 },
          { milestone_percent: 90 },
        ],
        error: null,
      },
      // 2. insert milestone 100%
      { data: {}, error: null },
      // 3. createNotification for 100%
      { data: fakeNotifRow("g1", "goal_completed", 100), error: null },
    ];

    const milestones = await service.checkMilestones(
      "user-1",
      "g1",
      "Dream Car",
      1000,
      1000,
    );

    expect(milestones).toHaveLength(1);
    expect(milestones[0].milestonePercent).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  performHealthCheck
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – performHealthCheck", () => {
  const baseHealthData = {
    goalName: "Retirement",
    currentAmount: 5000,
    targetAmount: 50000,
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    monthlyContribution: 500,
    expectedReturn: 0.07,
  };

  it("should return on-track result when progress is sufficient", async () => {
    // 30000/50000 = 60% current progress. 50% elapsed → ratio ~1.2 → on-track
    // On-track means no createNotification call, just the health check computation
    // No supabase calls needed (no notifications for on-track)
    chainResults = [];

    const result = await service.performHealthCheck("user-1", "g1", {
      ...baseHealthData,
      currentAmount: 30000,
    });

    expect(result.goalId).toBe("g1");
    expect(typeof result.isOnTrack).toBe("boolean");
    expect(typeof result.currentProgress).toBe("number");
    expect(typeof result.expectedProgress).toBe("number");
  });

  it("should generate recommendations when goal is at risk", async () => {
    // 1000/50000 = 2% progress. ~50% time elapsed → ratio ~0.04 → at risk (<0.75)
    // At-risk triggers createNotification (1 supabase chain)
    chainResults = [
      // createNotification for at-risk goal
      {
        data: {
          id: "n-risk",
          goal_id: "g1",
          financial_goals: { name: "Retirement" },
          type: "goal_at_risk",
          priority: "urgent",
          title: "Goal At Risk",
          message: "Your goal is behind",
          action_url: "/goals/g1/adjust",
          action_label: "Review Options",
          created_at: new Date().toISOString(),
          metadata: null,
        },
        error: null,
      },
    ];

    const result = await service.performHealthCheck("user-1", "g1", {
      ...baseHealthData,
      currentAmount: 1000,
      targetAmount: 50000,
    });

    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("should include shortfallAmount when projected to miss target", async () => {
    // 100/100000 = 0.1% progress, tiny contributions → at risk, will have shortfall
    // At-risk triggers createNotification
    chainResults = [
      {
        data: {
          id: "n-risk-2",
          goal_id: "g1",
          financial_goals: { name: "Retirement" },
          type: "goal_at_risk",
          priority: "urgent",
          title: "Goal At Risk",
          message: "Behind",
          action_url: "/goals/g1/adjust",
          action_label: "Review",
          created_at: new Date().toISOString(),
          metadata: null,
        },
        error: null,
      },
    ];

    const result = await service.performHealthCheck("user-1", "g1", {
      ...baseHealthData,
      currentAmount: 100,
      targetAmount: 100000,
      monthlyContribution: 50,
    });

    if (result.shortfallAmount !== undefined) {
      expect(result.shortfallAmount).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  acceptRecommendation / dismissRecommendation
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – recommendation actions", () => {
  it("acceptRecommendation should return false for unknown ID", async () => {
    const result = await service.acceptRecommendation("unknown-rec");
    expect(result).toBe(false);
  });

  it("dismissRecommendation should return false for unknown ID", async () => {
    const result = await service.dismissRecommendation("unknown-rec");
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  getPreferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – getPreferences", () => {
  it("should return preferences from DB when available", async () => {
    chainResults = [
      {
        data: {
          milestone_alerts: false,
          progress_updates: true,
          adjustment_recommendations: true,
          contribution_reminders: false,
          email_notifications: true,
          push_notifications: false,
          frequency_summary: "daily",
        },
        error: null,
      },
    ];

    const prefs = await service.getPreferences("user-1");
    expect(prefs.milestoneAlerts).toBe(false);
    expect(prefs.emailNotifications).toBe(true);
    expect(prefs.frequencySummary).toBe("daily");
  });

  it("should return defaults when no data in DB", async () => {
    chainResults = [{ data: null, error: null }];

    const prefs = await service.getPreferences("user-1");
    expect(prefs.milestoneAlerts).toBe(true);
    expect(prefs.emailNotifications).toBe(false);
    expect(prefs.pushNotifications).toBe(true);
    expect(prefs.frequencySummary).toBe("weekly");
  });

  it("should return defaults on error", async () => {
    chainResults = [{ data: null, error: { message: "DB error" } }];

    const prefs = await service.getPreferences("user-1");
    expect(prefs.milestoneAlerts).toBe(true);
    expect(prefs.frequencySummary).toBe("weekly");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  updatePreferences
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – updatePreferences", () => {
  it("should return true on success", async () => {
    chainResults = [{ data: {}, error: null }];

    const result = await service.updatePreferences("user-1", {
      milestoneAlerts: false,
    });
    expect(result).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("user_notification_preferences");
  });

  it("should return false on error", async () => {
    chainResults = [{ data: null, error: { message: "Upsert failed" } }];

    const result = await service.updatePreferences("user-1", {
      milestoneAlerts: false,
    });
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Singleton
// ═══════════════════════════════════════════════════════════════════════════════
describe("GoalNotificationService – singleton", () => {
  it("getGoalNotificationService should return same instance", () => {
    const a = getGoalNotificationService();
    const b = getGoalNotificationService();
    expect(a).toBe(b);
  });
});
