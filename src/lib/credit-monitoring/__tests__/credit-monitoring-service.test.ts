/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Credit Monitoring Service - Comprehensive Unit Tests
 *
 * Tests for: getCurrentScores, getScoreHistory, addCreditScore,
 * getMonitoringSettings, updateMonitoringSettings, getAlerts,
 * createAlert, markAlertAsRead, markAllAlertsAsRead, getMonitoringDashboard
 */

// ---------------------------------------------------------------------------
// Supabase Mock
// ---------------------------------------------------------------------------

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  is: jest.fn().mockReturnThis(),
};

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: jest.fn(() => mockSupabase),
}));

import { creditMonitoringService } from "../credit-monitoring-service";
import type {
  Bureau,
  ScoreFactor,
  AlertType,
} from "../credit-monitoring-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER_ID = "user-abc-123";
const TEST_ALERT_ID = "alert-xyz-789";

function makeScoreRow(overrides: Record<string, any> = {}) {
  return {
    id: "id" in overrides ? overrides.id : "score-1",
    user_id: "user_id" in overrides ? overrides.user_id : TEST_USER_ID,
    bureau: "bureau" in overrides ? overrides.bureau : "experian",
    score: "score" in overrides ? overrides.score : 720,
    score_date:
      "score_date" in overrides
        ? overrides.score_date
        : "2026-01-15T00:00:00Z",
    factors:
      "factors" in overrides
        ? overrides.factors
        : [
            {
              factor: "Payment History",
              impact: "positive",
              description: "Good",
            },
          ],
    created_at:
      "created_at" in overrides
        ? overrides.created_at
        : "2026-01-15T00:00:00Z",
  };
}

function makeAlertRow(overrides: Record<string, any> = {}) {
  return {
    id: "id" in overrides ? overrides.id : "alert-1",
    user_id: "user_id" in overrides ? overrides.user_id : TEST_USER_ID,
    type: "type" in overrides ? overrides.type : "score_increase",
    bureau: "bureau" in overrides ? overrides.bureau : "experian",
    title: "title" in overrides ? overrides.title : "Score Increased",
    message: "message" in overrides ? overrides.message : "Your score went up",
    severity: "severity" in overrides ? overrides.severity : "medium",
    read: "read" in overrides ? overrides.read : false,
    created_at:
      "created_at" in overrides
        ? overrides.created_at
        : "2026-02-01T00:00:00Z",
    data: "data" in overrides ? overrides.data : null,
  };
}

function makeSettingsRow(overrides: Record<string, any> = {}) {
  return {
    user_id: "user_id" in overrides ? overrides.user_id : TEST_USER_ID,
    experian_enabled:
      "experian_enabled" in overrides ? overrides.experian_enabled : true,
    equifax_enabled:
      "equifax_enabled" in overrides ? overrides.equifax_enabled : true,
    transunion_enabled:
      "transunion_enabled" in overrides ? overrides.transunion_enabled : false,
    alert_preferences:
      "alert_preferences" in overrides
        ? overrides.alert_preferences
        : {
            scoreChanges: true,
            newAccounts: true,
            inquiries: false,
            addressChanges: false,
            fraudAlerts: true,
            emailNotifications: true,
            smsNotifications: false,
          },
    score_change_threshold:
      "score_change_threshold" in overrides
        ? overrides.score_change_threshold
        : 15,
  };
}

/**
 * Reset all mock return values and calls between tests.
 * Each mock method re-chains to `mockSupabase` so the fluent API works.
 */
function resetMocks() {
  Object.values(mockSupabase).forEach((fn) => {
    (fn as jest.Mock).mockReset();
  });
  // Re-establish chaining for fluent methods
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.upsert.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.gte.mockReturnValue(mockSupabase);
  mockSupabase.lte.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
  mockSupabase.is.mockReturnValue(mockSupabase);
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe("CreditMonitoringService", () => {
  beforeEach(() => {
    resetMocks();
  });

  // =========================================================================
  // getCurrentScores
  // =========================================================================

  describe("getCurrentScores", () => {
    it("should return scores keyed by bureau", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          makeScoreRow({ bureau: "experian", score: 720 }),
          makeScoreRow({ bureau: "equifax", score: 700, id: "score-2" }),
          makeScoreRow({ bureau: "transunion", score: 680, id: "score-3" }),
        ],
        error: null,
      });

      const result =
        await creditMonitoringService.getCurrentScores(TEST_USER_ID);

      expect(result.experian).toBeDefined();
      expect(result.experian!.score).toBe(720);
      expect(result.equifax).toBeDefined();
      expect(result.equifax!.score).toBe(700);
      expect(result.transunion).toBeDefined();
      expect(result.transunion!.score).toBe(680);
    });

    it("should only keep the first score per bureau (latest by order)", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          makeScoreRow({ bureau: "experian", score: 730 }),
          makeScoreRow({
            bureau: "experian",
            score: 710,
            id: "score-old",
          }),
        ],
        error: null,
      });

      const result =
        await creditMonitoringService.getCurrentScores(TEST_USER_ID);

      expect(result.experian!.score).toBe(730);
    });

    it("should return empty object when data is null", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result =
        await creditMonitoringService.getCurrentScores(TEST_USER_ID);

      expect(result).toEqual({});
    });

    it("should return empty object on database error", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      const result =
        await creditMonitoringService.getCurrentScores(TEST_USER_ID);

      expect(result).toEqual({});
    });

    it("should map score rows correctly with all fields", async () => {
      const row = makeScoreRow({
        id: "id-abc",
        user_id: "user-xyz",
        bureau: "equifax",
        score: 750,
        score_date: "2026-03-01T10:00:00Z",
        factors: [
          {
            factor: "Low Utilization",
            impact: "positive",
            description: "Under 30%",
          },
        ],
        created_at: "2026-03-01T10:00:00Z",
      });
      mockSupabase.limit.mockResolvedValueOnce({
        data: [row],
        error: null,
      });

      const result =
        await creditMonitoringService.getCurrentScores("user-xyz");

      const eq = result.equifax!;
      expect(eq.id).toBe("id-abc");
      expect(eq.userId).toBe("user-xyz");
      expect(eq.bureau).toBe("equifax");
      expect(eq.score).toBe(750);
      expect(eq.scoreDate).toEqual(new Date("2026-03-01T10:00:00Z"));
      expect(eq.factors).toHaveLength(1);
      expect(eq.factors[0].factor).toBe("Low Utilization");
      expect(eq.createdAt).toEqual(new Date("2026-03-01T10:00:00Z"));
    });

    it("should handle null factors gracefully (default to empty array)", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [makeScoreRow({ factors: null })],
        error: null,
      });

      const result =
        await creditMonitoringService.getCurrentScores(TEST_USER_ID);

      expect(result.experian!.factors).toEqual([]);
    });

    it("should call supabase with correct table and parameters", async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await creditMonitoringService.getCurrentScores(TEST_USER_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith("credit_scores");
      expect(mockSupabase.select).toHaveBeenCalledWith("*");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
      expect(mockSupabase.order).toHaveBeenCalledWith("score_date", {
        ascending: false,
      });
      expect(mockSupabase.limit).toHaveBeenCalledWith(3);
    });
  });

  // =========================================================================
  // getScoreHistory
  // =========================================================================

  describe("getScoreHistory", () => {
    it("should return score history for a bureau", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { score: 700, score_date: "2026-01-01T00:00:00Z" },
          { score: 720, score_date: "2026-02-01T00:00:00Z" },
        ],
        error: null,
      });

      const result = await creditMonitoringService.getScoreHistory(
        TEST_USER_ID,
        "experian",
      );

      expect(result.bureau).toBe("experian");
      expect(result.scores).toHaveLength(2);
      expect(result.scores[0].score).toBe(700);
      expect(result.scores[1].score).toBe(720);
    });

    it("should return empty scores on error", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error" },
      });

      const result = await creditMonitoringService.getScoreHistory(
        TEST_USER_ID,
        "transunion",
      );

      expect(result.bureau).toBe("transunion");
      expect(result.scores).toEqual([]);
    });

    it("should return empty scores when data is null (no error)", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await creditMonitoringService.getScoreHistory(
        TEST_USER_ID,
        "equifax",
      );

      expect(result.bureau).toBe("equifax");
      expect(result.scores).toEqual([]);
    });

    it("should convert score_date strings to Date objects", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ score: 710, score_date: "2026-06-15T12:30:00Z" }],
        error: null,
      });

      const result = await creditMonitoringService.getScoreHistory(
        TEST_USER_ID,
        "experian",
        90,
      );

      expect(result.scores[0].date).toEqual(new Date("2026-06-15T12:30:00Z"));
    });

    it("should pass correct parameters including date range filter", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await creditMonitoringService.getScoreHistory(
        TEST_USER_ID,
        "equifax",
        180,
      );

      expect(mockSupabase.from).toHaveBeenCalledWith("credit_scores");
      expect(mockSupabase.select).toHaveBeenCalledWith("score, score_date");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
      expect(mockSupabase.eq).toHaveBeenCalledWith("bureau", "equifax");
      expect(mockSupabase.gte).toHaveBeenCalled();
      expect(mockSupabase.order).toHaveBeenCalledWith("score_date", {
        ascending: true,
      });
    });
  });

  // =========================================================================
  // addCreditScore
  // =========================================================================

  describe("addCreditScore", () => {
    const factors: ScoreFactor[] = [
      {
        factor: "Payment History",
        impact: "positive",
        description: "All payments on time",
      },
    ];

    it("should insert a new score and return the mapped result", async () => {
      // getCurrentScores call -> chain ends at .limit()
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // insert().select().single()
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "new-score-1",
          user_id: TEST_USER_ID,
          bureau: "experian",
          score: 740,
          score_date: "2026-02-20T00:00:00Z",
          factors,
          created_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      const result = await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "experian",
        740,
        factors,
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe("new-score-1");
      expect(result!.score).toBe(740);
      expect(result!.bureau).toBe("experian");
      expect(result!.userId).toBe(TEST_USER_ID);
    });

    it("should create alert when score change exceeds threshold (increase)", async () => {
      // getCurrentScores - previous score exists
      mockSupabase.limit.mockResolvedValueOnce({
        data: [makeScoreRow({ bureau: "experian", score: 700 })],
        error: null,
      });

      // insert for new score -> .select().single()
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "new-score-2",
          user_id: TEST_USER_ID,
          bureau: "experian",
          score: 725,
          score_date: "2026-02-20T00:00:00Z",
          factors,
          created_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      // getMonitoringSettings -> .single()
      mockSupabase.single.mockResolvedValueOnce({
        data: makeSettingsRow({ score_change_threshold: 10 }),
        error: null,
      });

      // createAlert -> insert().select().single()
      mockSupabase.single.mockResolvedValueOnce({
        data: makeAlertRow({
          type: "score_increase",
          title: "Experian Score Increased",
        }),
        error: null,
      });

      const result = await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "experian",
        725,
        factors,
      );

      expect(result).not.toBeNull();
      expect(result!.score).toBe(725);

      // Verify createAlert was called (insert called for alert)
      const fromCalls = mockSupabase.from.mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(fromCalls).toContain("credit_alerts");
    });

    it("should create alert when score change exceeds threshold (decrease)", async () => {
      // getCurrentScores - previous score 750
      mockSupabase.limit.mockResolvedValueOnce({
        data: [makeScoreRow({ bureau: "transunion", score: 750 })],
        error: null,
      });

      // insert new score
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "new-score-3",
          user_id: TEST_USER_ID,
          bureau: "transunion",
          score: 720,
          score_date: "2026-02-20T00:00:00Z",
          factors,
          created_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      // getMonitoringSettings (default threshold 10 -- error path returns defaults)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      // createAlert
      mockSupabase.single.mockResolvedValueOnce({
        data: makeAlertRow({
          type: "score_decrease",
          bureau: "transunion",
          severity: "high",
        }),
        error: null,
      });

      const result = await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "transunion",
        720,
        factors,
      );

      expect(result).not.toBeNull();
      const fromCalls = mockSupabase.from.mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(fromCalls).toContain("credit_alerts");
    });

    it("should NOT create alert when score change is below threshold", async () => {
      // getCurrentScores - previous score 720
      mockSupabase.limit.mockResolvedValueOnce({
        data: [makeScoreRow({ bureau: "experian", score: 720 })],
        error: null,
      });

      // insert new score (change = 5, below threshold of 10)
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "new-score-4",
          user_id: TEST_USER_ID,
          bureau: "experian",
          score: 725,
          score_date: "2026-02-20T00:00:00Z",
          factors,
          created_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      // getMonitoringSettings (threshold 10)
      mockSupabase.single.mockResolvedValueOnce({
        data: makeSettingsRow({ score_change_threshold: 10 }),
        error: null,
      });

      const result = await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "experian",
        725,
        factors,
      );

      expect(result).not.toBeNull();
      const fromCalls = mockSupabase.from.mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(fromCalls).not.toContain("credit_alerts");
    });

    it("should NOT create alert when there is no previous score", async () => {
      // getCurrentScores - no previous score
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // insert new score
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "first-score",
          user_id: TEST_USER_ID,
          bureau: "equifax",
          score: 680,
          score_date: "2026-02-20T00:00:00Z",
          factors,
          created_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      const result = await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "equifax",
        680,
        factors,
      );

      expect(result).not.toBeNull();
      const fromCalls = mockSupabase.from.mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(fromCalls).not.toContain("credit_monitoring_settings");
      expect(fromCalls).not.toContain("credit_alerts");
    });

    it("should return null on insert error", async () => {
      // getCurrentScores
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // insert fails
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Insert failed" },
      });

      const result = await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "experian",
        700,
        factors,
      );

      expect(result).toBeNull();
    });

    it("should still return the saved score when the score itself was saved but the follow-on alert fails to save (alert failure must not mask an already-successful score save)", async () => {
      // getCurrentScores - previous score exists, well past threshold
      mockSupabase.limit.mockResolvedValueOnce({
        data: [makeScoreRow({ bureau: "experian", score: 700 })],
        error: null,
      });

      // insert for new score succeeds -> .select().single()
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "score-saved-alert-failed",
          user_id: TEST_USER_ID,
          bureau: "experian",
          score: 725,
          score_date: "2026-02-20T00:00:00Z",
          factors,
          created_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      // getMonitoringSettings -> .single()
      mockSupabase.single.mockResolvedValueOnce({
        data: makeSettingsRow({ score_change_threshold: 10 }),
        error: null,
      });

      // createAlert's insert -> .select().single() FAILS
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "credit_alerts insert failed" },
      });

      const result = await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "experian",
        725,
        factors,
      );

      // The score row was already committed — its own save must be reported
      // as a success regardless of the alert failure above.
      expect(result).not.toBeNull();
      expect(result!.id).toBe("score-saved-alert-failed");
      expect(result!.score).toBe(725);
    });

    it("should set severity to high when change >= 20 points", async () => {
      // getCurrentScores - previous score
      mockSupabase.limit.mockResolvedValueOnce({
        data: [makeScoreRow({ bureau: "experian", score: 700 })],
        error: null,
      });

      // insert new score (change = 25)
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "big-change",
          user_id: TEST_USER_ID,
          bureau: "experian",
          score: 725,
          score_date: "2026-02-20T00:00:00Z",
          factors,
          created_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      // getMonitoringSettings (threshold 10)
      mockSupabase.single.mockResolvedValueOnce({
        data: makeSettingsRow({ score_change_threshold: 10 }),
        error: null,
      });

      // createAlert
      mockSupabase.single.mockResolvedValueOnce({
        data: makeAlertRow({ severity: "high" }),
        error: null,
      });

      await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "experian",
        725,
        factors,
      );

      // Check the insert call for the alert had severity "high"
      const insertCalls = mockSupabase.insert.mock.calls;
      const alertInsert = insertCalls.find(
        (c: any[]) => c[0]?.type === "score_increase",
      );
      expect(alertInsert).toBeDefined();
      expect(alertInsert![0].severity).toBe("high");
    });

    it("should set severity to medium when change < 20 points", async () => {
      // getCurrentScores - previous score
      mockSupabase.limit.mockResolvedValueOnce({
        data: [makeScoreRow({ bureau: "equifax", score: 700 })],
        error: null,
      });

      // insert new score (change = 12)
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "small-change",
          user_id: TEST_USER_ID,
          bureau: "equifax",
          score: 712,
          score_date: "2026-02-20T00:00:00Z",
          factors,
          created_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      // getMonitoringSettings (threshold 10)
      mockSupabase.single.mockResolvedValueOnce({
        data: makeSettingsRow({ score_change_threshold: 10 }),
        error: null,
      });

      // createAlert
      mockSupabase.single.mockResolvedValueOnce({
        data: makeAlertRow({ severity: "medium" }),
        error: null,
      });

      await creditMonitoringService.addCreditScore(
        TEST_USER_ID,
        "equifax",
        712,
        factors,
      );

      const insertCalls = mockSupabase.insert.mock.calls;
      const alertInsert = insertCalls.find(
        (c: any[]) => c[0]?.type === "score_increase",
      );
      expect(alertInsert).toBeDefined();
      expect(alertInsert![0].severity).toBe("medium");
    });
  });

  // =========================================================================
  // getMonitoringSettings
  // =========================================================================

  describe("getMonitoringSettings", () => {
    it("should return mapped settings from database", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: makeSettingsRow(),
        error: null,
      });

      const result =
        await creditMonitoringService.getMonitoringSettings(TEST_USER_ID);

      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.experianEnabled).toBe(true);
      expect(result.equifaxEnabled).toBe(true);
      expect(result.transunionEnabled).toBe(false);
      expect(result.scoreChangeThreshold).toBe(15);
      expect(result.alertPreferences.scoreChanges).toBe(true);
      expect(result.alertPreferences.smsNotifications).toBe(false);
    });

    it("should return default settings when database returns error", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "PGRST116 not found" },
      });

      const result =
        await creditMonitoringService.getMonitoringSettings(TEST_USER_ID);

      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.experianEnabled).toBe(true);
      expect(result.equifaxEnabled).toBe(true);
      expect(result.transunionEnabled).toBe(true);
      expect(result.scoreChangeThreshold).toBe(10);
      expect(result.alertPreferences.scoreChanges).toBe(true);
      expect(result.alertPreferences.newAccounts).toBe(true);
      expect(result.alertPreferences.inquiries).toBe(true);
      expect(result.alertPreferences.addressChanges).toBe(true);
      expect(result.alertPreferences.fraudAlerts).toBe(true);
      expect(result.alertPreferences.emailNotifications).toBe(true);
      expect(result.alertPreferences.smsNotifications).toBe(false);
    });

    it("should use score_change_threshold from DB, defaulting to 10 if falsy", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: makeSettingsRow({ score_change_threshold: 0 }),
        error: null,
      });

      const result =
        await creditMonitoringService.getMonitoringSettings(TEST_USER_ID);

      // 0 is falsy, so || 10 should give 10
      expect(result.scoreChangeThreshold).toBe(10);
    });

    it("should query the correct table", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: makeSettingsRow(),
        error: null,
      });

      await creditMonitoringService.getMonitoringSettings(TEST_USER_ID);

      expect(mockSupabase.from).toHaveBeenCalledWith(
        "credit_monitoring_settings",
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    });
  });

  // =========================================================================
  // updateMonitoringSettings
  // =========================================================================

  describe("updateMonitoringSettings", () => {
    it("should upsert settings and return true on success", async () => {
      mockSupabase.upsert.mockResolvedValueOnce({
        error: null,
      });

      const result = await creditMonitoringService.updateMonitoringSettings(
        TEST_USER_ID,
        {
          experianEnabled: true,
          equifaxEnabled: false,
          transunionEnabled: true,
          scoreChangeThreshold: 20,
          alertPreferences: {
            scoreChanges: true,
            newAccounts: false,
            inquiries: true,
            addressChanges: false,
            fraudAlerts: true,
            emailNotifications: true,
            smsNotifications: true,
          },
        },
      );

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith(
        "credit_monitoring_settings",
      );
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it("should return false on upsert error", async () => {
      mockSupabase.upsert.mockResolvedValueOnce({
        error: { message: "Upsert failed" },
      });

      const result = await creditMonitoringService.updateMonitoringSettings(
        TEST_USER_ID,
        { experianEnabled: false },
      );

      expect(result).toBe(false);
    });

    it("should pass correct fields to upsert", async () => {
      mockSupabase.upsert.mockResolvedValueOnce({
        error: null,
      });

      const prefs = {
        scoreChanges: true,
        newAccounts: true,
        inquiries: true,
        addressChanges: true,
        fraudAlerts: true,
        emailNotifications: true,
        smsNotifications: false,
      };

      await creditMonitoringService.updateMonitoringSettings(TEST_USER_ID, {
        experianEnabled: true,
        equifaxEnabled: false,
        transunionEnabled: true,
        scoreChangeThreshold: 25,
        alertPreferences: prefs,
      });

      const upsertArg = mockSupabase.upsert.mock.calls[0][0];
      expect(upsertArg.user_id).toBe(TEST_USER_ID);
      expect(upsertArg.experian_enabled).toBe(true);
      expect(upsertArg.equifax_enabled).toBe(false);
      expect(upsertArg.transunion_enabled).toBe(true);
      expect(upsertArg.score_change_threshold).toBe(25);
      expect(upsertArg.alert_preferences).toEqual(prefs);
      expect(upsertArg.updated_at).toBeDefined();
    });
  });

  // =========================================================================
  // getAlerts
  // =========================================================================

  describe("getAlerts", () => {
    it("should return alerts for a user (no filters)", async () => {
      // Chain: from().select().eq(userId).order() -- order is the terminal
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          makeAlertRow({ id: "a1", type: "score_increase" }),
          makeAlertRow({ id: "a2", type: "new_inquiry" }),
        ],
        error: null,
      });

      const result = await creditMonitoringService.getAlerts(TEST_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("a1");
      expect(result[1].id).toBe("a2");
    });

    it("should apply unreadOnly filter", async () => {
      // Chain: from().select().eq(userId).order() then .eq("read", false)
      // The last method is eq, so eq resolves the promise
      mockSupabase.eq.mockReturnValue(mockSupabase);
      // The order of eq calls: eq("user_id",...) returns mockSupabase,
      // then eq("read", false) is the terminal call when no limit/severity.
      // We need the SECOND eq call to resolve with data.
      // Use mockReturnValue for chaining, then mockResolvedValueOnce for
      // the terminal await. Since all eq calls return mockSupabase and
      // the object itself gets awaited, we need to handle this differently.
      //
      // The pattern is: `const { data, error } = await query` where
      // query = mockSupabase (after all chaining). So mockSupabase needs
      // to be awaitable and resolve to {data, error}.
      //
      // Instead, let's mock eq to return a thenable on the right call.
      const response = {
        data: [makeAlertRow({ read: false })],
        error: null,
      };
      // After order(), the query is mockSupabase. Then query.eq("read", false)
      // is called, which also returns mockSupabase. Then `await query` awaits
      // mockSupabase. Since mockSupabase is a plain object (not a promise),
      // `await plainObject` resolves to the plain object. So {data, error}
      // destructures from mockSupabase itself. We need mockSupabase to have
      // data and error properties. But that would pollute all tests.
      //
      // Better approach: make the terminal method return a thenable.
      // For unreadOnly (no severity, no limit), the terminal is eq.
      // We'll mock eq to return a thenable on the appropriate call.
      let eqCallCount = 0;
      mockSupabase.eq.mockImplementation((..._args: any[]) => {
        eqCallCount++;
        // First eq call is eq("user_id", ...) - chain
        // Second eq call is eq("read", false) - terminal
        if (eqCallCount >= 2) {
          return Promise.resolve(response);
        }
        return mockSupabase;
      });

      const result = await creditMonitoringService.getAlerts(TEST_USER_ID, {
        unreadOnly: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].read).toBe(false);
      // Verify the filter call was made
      expect(mockSupabase.eq).toHaveBeenCalledWith("read", false);
    });

    it("should apply severity filter", async () => {
      const response = {
        data: [makeAlertRow({ severity: "critical" })],
        error: null,
      };
      let eqCallCount = 0;
      mockSupabase.eq.mockImplementation((..._args: any[]) => {
        eqCallCount++;
        // First eq is eq("user_id", ...) - chain
        // Second eq is eq("severity", "critical") - terminal
        if (eqCallCount >= 2) {
          return Promise.resolve(response);
        }
        return mockSupabase;
      });

      const result = await creditMonitoringService.getAlerts(TEST_USER_ID, {
        severity: "critical",
      });

      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe("critical");
      expect(mockSupabase.eq).toHaveBeenCalledWith("severity", "critical");
    });

    it("should apply limit filter", async () => {
      // Chain: from().select().eq(userId).order().limit(5)
      // limit is the terminal
      mockSupabase.limit.mockResolvedValueOnce({
        data: [makeAlertRow()],
        error: null,
      });

      await creditMonitoringService.getAlerts(TEST_USER_ID, { limit: 5 });

      expect(mockSupabase.limit).toHaveBeenCalledWith(5);
    });

    it("should apply all filters together (unread + severity + limit)", async () => {
      // Chain: from().select().eq(userId).order().eq("read",false).eq("severity","high").limit(10)
      // limit is the terminal
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await creditMonitoringService.getAlerts(TEST_USER_ID, {
        unreadOnly: true,
        severity: "high",
        limit: 10,
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("read", false);
      expect(mockSupabase.eq).toHaveBeenCalledWith("severity", "high");
      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
    });

    it("should throw (not silently return []) on a database error — a load failure must never render identically to a genuine empty alert list", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error" },
      });

      await expect(
        creditMonitoringService.getAlerts(TEST_USER_ID),
      ).rejects.toThrow("Failed to fetch credit alerts: DB error");
    });

    it("should map alert rows correctly including null bureau", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          makeAlertRow({
            id: "alert-mapped",
            bureau: null,
            data: { key: "value" },
          }),
        ],
        error: null,
      });

      const result = await creditMonitoringService.getAlerts(TEST_USER_ID);

      expect(result[0].id).toBe("alert-mapped");
      expect(result[0].bureau).toBeUndefined(); // null maps to undefined
      expect(result[0].data).toEqual({ key: "value" });
    });

    it("should map alert rows with bureau set", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [makeAlertRow({ bureau: "transunion" })],
        error: null,
      });

      const result = await creditMonitoringService.getAlerts(TEST_USER_ID);

      expect(result[0].bureau).toBe("transunion");
    });

    it("should return empty array when data is null (no error)", async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await creditMonitoringService.getAlerts(TEST_USER_ID);

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // createAlert
  // =========================================================================

  describe("createAlert", () => {
    it("should create an alert and return the mapped result", async () => {
      const alertData = makeAlertRow({
        id: "new-alert-1",
        type: "fraud_alert",
        bureau: "experian",
        severity: "critical",
      });
      mockSupabase.single.mockResolvedValueOnce({
        data: alertData,
        error: null,
      });

      const result = await creditMonitoringService.createAlert(TEST_USER_ID, {
        type: "fraud_alert",
        bureau: "experian",
        title: "Fraud Alert Detected",
        message: "Suspicious activity on your account",
        severity: "critical",
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe("fraud_alert");
      expect(result!.severity).toBe("critical");
      expect(result!.read).toBe(false);
    });

    it("should pass data field to insert", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: makeAlertRow({ data: { previousScore: 700, newScore: 720 } }),
        error: null,
      });

      await creditMonitoringService.createAlert(TEST_USER_ID, {
        type: "score_increase",
        title: "Score Up",
        message: "Your score increased",
        severity: "medium",
        data: { previousScore: 700, newScore: 720, change: 20 },
      });

      const insertArg = mockSupabase.insert.mock.calls[0][0];
      expect(insertArg.data).toEqual({
        previousScore: 700,
        newScore: 720,
        change: 20,
      });
      expect(insertArg.read).toBe(false);
    });

    it("should throw (not silently return null) on insert error — a save failure must never be discarded", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: "Insert error" },
      });

      await expect(
        creditMonitoringService.createAlert(TEST_USER_ID, {
          type: "new_account",
          title: "New Account",
          message: "A new account was opened",
          severity: "low",
        }),
      ).rejects.toThrow("Failed to create credit alert: Insert error");
    });

    it("should throw when no data is returned from a successful-looking response", async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        creditMonitoringService.createAlert(TEST_USER_ID, {
          type: "identity_theft",
          title: "Identity Theft",
          message: "Possible identity theft detected",
          severity: "critical",
        }),
      ).rejects.toThrow("Failed to create credit alert: no data returned");
    });

    it("should handle all 10 alert types", async () => {
      const alertTypes: AlertType[] = [
        "score_increase",
        "score_decrease",
        "new_account",
        "new_inquiry",
        "account_closed",
        "payment_missed",
        "credit_limit_change",
        "address_change",
        "fraud_alert",
        "identity_theft",
      ];

      for (const type of alertTypes) {
        resetMocks();
        mockSupabase.single.mockResolvedValueOnce({
          data: makeAlertRow({ type }),
          error: null,
        });

        const result = await creditMonitoringService.createAlert(
          TEST_USER_ID,
          {
            type,
            title: `Alert: ${type}`,
            message: `Alert of type ${type}`,
            severity: "medium",
          },
        );

        expect(result).not.toBeNull();
        expect(result!.type).toBe(type);
      }
    });
  });

  // =========================================================================
  // markAlertAsRead
  // =========================================================================

  describe("markAlertAsRead", () => {
    it("should update the alert and return true on success", async () => {
      // Chain: from().update({read: true}).eq("id", alertId)
      // eq is the terminal
      mockSupabase.eq.mockResolvedValueOnce({
        error: null,
      });

      const result =
        await creditMonitoringService.markAlertAsRead(TEST_ALERT_ID);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("credit_alerts");
      expect(mockSupabase.update).toHaveBeenCalledWith({ read: true });
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", TEST_ALERT_ID);
    });

    it("should return false on update error", async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        error: { message: "Update failed" },
      });

      const result =
        await creditMonitoringService.markAlertAsRead(TEST_ALERT_ID);

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // markAllAlertsAsRead
  // =========================================================================

  describe("markAllAlertsAsRead", () => {
    it("should update all unread alerts for user and return true", async () => {
      // Chain: from().update({read: true}).eq("user_id", userId).eq("read", false)
      // Two eq calls. The second eq is the terminal.
      let eqCallCount = 0;
      mockSupabase.eq.mockImplementation((..._args: any[]) => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null });
        }
        return mockSupabase;
      });

      const result =
        await creditMonitoringService.markAllAlertsAsRead(TEST_USER_ID);

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("credit_alerts");
      expect(mockSupabase.update).toHaveBeenCalledWith({ read: true });
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
      expect(mockSupabase.eq).toHaveBeenCalledWith("read", false);
    });

    it("should return false on update error", async () => {
      let eqCallCount = 0;
      mockSupabase.eq.mockImplementation((..._args: any[]) => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: { message: "Bulk update failed" } });
        }
        return mockSupabase;
      });

      const result =
        await creditMonitoringService.markAllAlertsAsRead(TEST_USER_ID);

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // getMonitoringDashboard
  // =========================================================================

  describe("getMonitoringDashboard", () => {
    it("should return a composite dashboard with all data", async () => {
      // Dashboard calls: getCurrentScores, getScoreHistory x3, getAlerts
      //
      // .order() call sequence:
      //   #1 getCurrentScores  (intermediate – .limit() follows)
      //   #2 getScoreHistory("experian")  (terminal)
      //   #3 getScoreHistory("equifax")   (terminal)
      //   #4 getScoreHistory("transunion")(terminal)
      //   #5 getAlerts                    (intermediate – .limit() follows)
      //
      // .limit() call sequence:
      //   #1 getCurrentScores (terminal)
      //   #2 getAlerts        (terminal)

      const now = new Date();
      const twentyFiveDaysAgo = new Date(
        now.getTime() - 25 * 24 * 60 * 60 * 1000,
      );
      const recentDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      const historyData = [
        [
          { score: 710, score_date: twentyFiveDaysAgo.toISOString() },
          { score: 720, score_date: recentDate.toISOString() },
        ],
        [
          { score: 690, score_date: twentyFiveDaysAgo.toISOString() },
          { score: 700, score_date: recentDate.toISOString() },
        ],
        [
          { score: 670, score_date: twentyFiveDaysAgo.toISOString() },
          { score: 680, score_date: recentDate.toISOString() },
        ],
      ];

      let orderCallCount = 0;
      mockSupabase.order.mockImplementation((..._args: any[]) => {
        orderCallCount++;
        // Calls 1 and 5 are intermediate (getCurrentScores, getAlerts)
        if (orderCallCount === 1 || orderCallCount === 5) {
          return mockSupabase;
        }
        // Calls 2, 3, 4 are terminal (getScoreHistory x3)
        return Promise.resolve({
          data: historyData[orderCallCount - 2],
          error: null,
        });
      });

      // .limit() call #1 = getCurrentScores (terminal), #2 = getAlerts (terminal)
      mockSupabase.limit
        .mockResolvedValueOnce({
          data: [
            makeScoreRow({ bureau: "experian", score: 720 }),
            makeScoreRow({ bureau: "equifax", score: 700, id: "s2" }),
            makeScoreRow({ bureau: "transunion", score: 680, id: "s3" }),
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [makeAlertRow({ id: "dashboard-alert" })],
          error: null,
        });

      const result =
        await creditMonitoringService.getMonitoringDashboard(TEST_USER_ID);

      expect(result.currentScores.experian).toBe(720);
      expect(result.currentScores.equifax).toBe(700);
      expect(result.currentScores.transunion).toBe(680);
      expect(result.averageScore).toBe(700); // (720 + 700 + 680) / 3 = 700
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].id).toBe("dashboard-alert");
      expect(result.history).toHaveLength(3);
      expect(result.recentChanges).toEqual([]);
    });

    it("should return averageScore of 0 when no scores exist", async () => {
      // .order() calls: #1 intermediate, #2-4 terminal, #5 intermediate
      let orderCallCount = 0;
      mockSupabase.order.mockImplementation((..._args: any[]) => {
        orderCallCount++;
        if (orderCallCount === 1 || orderCallCount === 5) {
          return mockSupabase;
        }
        return Promise.resolve({ data: [], error: null });
      });

      // .limit() call #1 = getCurrentScores (empty), #2 = getAlerts (empty)
      mockSupabase.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result =
        await creditMonitoringService.getMonitoringDashboard(TEST_USER_ID);

      expect(result.averageScore).toBe(0);
      expect(result.currentScores.experian).toBeUndefined();
      expect(result.currentScores.equifax).toBeUndefined();
      expect(result.currentScores.transunion).toBeUndefined();
      expect(result.scoreChange30Days).toBe(0);
      expect(result.scoreChange90Days).toBe(0);
    });

    it("should calculate score change correctly across bureaus", async () => {
      const now = new Date();
      const twentyDaysAgo = new Date(
        now.getTime() - 20 * 24 * 60 * 60 * 1000,
      );
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const historyData = [
        // Experian: 740 -> 750 = +10
        [
          { score: 740, score_date: twentyDaysAgo.toISOString() },
          { score: 750, score_date: fiveDaysAgo.toISOString() },
        ],
        // Equifax: 710 -> 730 = +20
        [
          { score: 710, score_date: twentyDaysAgo.toISOString() },
          { score: 730, score_date: fiveDaysAgo.toISOString() },
        ],
        // Transunion: only 1 data point -> excluded from average
        [{ score: 680, score_date: fiveDaysAgo.toISOString() }],
      ];

      // .order() calls: #1 intermediate, #2-4 terminal, #5 intermediate
      let orderCallCount = 0;
      mockSupabase.order.mockImplementation((..._args: any[]) => {
        orderCallCount++;
        if (orderCallCount === 1 || orderCallCount === 5) {
          return mockSupabase;
        }
        return Promise.resolve({
          data: historyData[orderCallCount - 2],
          error: null,
        });
      });

      // .limit() call #1 = getCurrentScores, #2 = getAlerts
      mockSupabase.limit
        .mockResolvedValueOnce({
          data: [
            makeScoreRow({ bureau: "experian", score: 750 }),
            makeScoreRow({ bureau: "equifax", score: 730, id: "s2" }),
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });

      const result =
        await creditMonitoringService.getMonitoringDashboard(TEST_USER_ID);

      // calculateScoreChange filters scores within the period (30 or 90 days).
      // Both 20 days ago and 5 days ago are within 30 days.
      // Experian: 750 - 740 = 10
      // Equifax: 730 - 710 = 20
      // Transunion: 1 data point, excluded
      // Average: (10 + 20) / 2 = 15
      expect(result.scoreChange30Days).toBe(15);
    });

    it("should handle getCurrentScores error gracefully in dashboard", async () => {
      // getCurrentScores catches errors internally and returns {}
      // So the dashboard should not throw; it should produce a dashboard
      // with no scores and averageScore = 0

      // .order() calls: #1 intermediate, #2-4 terminal, #5 intermediate
      let orderCallCount = 0;
      mockSupabase.order.mockImplementation((..._args: any[]) => {
        orderCallCount++;
        if (orderCallCount === 1 || orderCallCount === 5) {
          return mockSupabase;
        }
        return Promise.resolve({ data: [], error: null });
      });

      // .limit() call #1 = getCurrentScores (error), #2 = getAlerts (empty)
      mockSupabase.limit
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Connection refused" },
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });

      const result =
        await creditMonitoringService.getMonitoringDashboard(TEST_USER_ID);

      expect(result.averageScore).toBe(0);
      expect(result.currentScores.experian).toBeUndefined();
      expect(result.alerts).toEqual([]);
    });

    it("should round average score to nearest integer", async () => {
      // Two scores: 721 and 700, average = 710.5 -> rounds to 711

      // .order() calls: #1 intermediate, #2-4 terminal, #5 intermediate
      let orderCallCount = 0;
      mockSupabase.order.mockImplementation((..._args: any[]) => {
        orderCallCount++;
        if (orderCallCount === 1 || orderCallCount === 5) {
          return mockSupabase;
        }
        return Promise.resolve({ data: [], error: null });
      });

      // .limit() call #1 = getCurrentScores, #2 = getAlerts
      mockSupabase.limit
        .mockResolvedValueOnce({
          data: [
            makeScoreRow({ bureau: "experian", score: 721 }),
            makeScoreRow({ bureau: "equifax", score: 700, id: "s2" }),
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });

      const result =
        await creditMonitoringService.getMonitoringDashboard(TEST_USER_ID);

      expect(result.averageScore).toBe(711); // Math.round(710.5)
    });
  });

  // =========================================================================
  // Bureau and type coverage
  // =========================================================================

  describe("bureau type coverage", () => {
    const bureaus: Bureau[] = ["experian", "equifax", "transunion"];

    it.each(bureaus)(
      "should handle bureau %s in getCurrentScores",
      async (bureau) => {
        mockSupabase.limit.mockResolvedValueOnce({
          data: [makeScoreRow({ bureau, score: 700 })],
          error: null,
        });

        const result =
          await creditMonitoringService.getCurrentScores(TEST_USER_ID);

        expect(result[bureau]).toBeDefined();
        expect(result[bureau]!.bureau).toBe(bureau);
      },
    );

    it.each(bureaus)(
      "should handle bureau %s in getScoreHistory",
      async (bureau) => {
        mockSupabase.order.mockResolvedValueOnce({
          data: [{ score: 700, score_date: "2026-01-01T00:00:00Z" }],
          error: null,
        });

        const result = await creditMonitoringService.getScoreHistory(
          TEST_USER_ID,
          bureau,
        );

        expect(result.bureau).toBe(bureau);
      },
    );
  });

  // =========================================================================
  // Singleton export
  // =========================================================================

  describe("singleton export", () => {
    it("should export creditMonitoringService as a singleton instance", () => {
      expect(creditMonitoringService).toBeDefined();
      expect(typeof creditMonitoringService.getCurrentScores).toBe("function");
      expect(typeof creditMonitoringService.getScoreHistory).toBe("function");
      expect(typeof creditMonitoringService.addCreditScore).toBe("function");
      expect(typeof creditMonitoringService.getMonitoringSettings).toBe(
        "function",
      );
      expect(typeof creditMonitoringService.updateMonitoringSettings).toBe(
        "function",
      );
      expect(typeof creditMonitoringService.getAlerts).toBe("function");
      expect(typeof creditMonitoringService.createAlert).toBe("function");
      expect(typeof creditMonitoringService.markAlertAsRead).toBe("function");
      expect(typeof creditMonitoringService.markAllAlertsAsRead).toBe(
        "function",
      );
      expect(typeof creditMonitoringService.getMonitoringDashboard).toBe(
        "function",
      );
    });

    it("should export default as creditMonitoringService", async () => {
      const defaultExport = (await import("../credit-monitoring-service"))
        .default;
      expect(defaultExport).toBe(creditMonitoringService);
    });
  });
});
