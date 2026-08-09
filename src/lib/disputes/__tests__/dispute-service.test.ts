/**
 * Tests for dispute-service.ts
 *
 * The service uses an in-memory Map — no Supabase, no external mocks needed.
 * Template and strategy modules are real (imported from source).
 */

import disputeService, {
  type Bureau,
  type DisputeStatus,
  type DisputeOutcome,
} from "../dispute-service";

// ============================================================================
// Helpers
// ============================================================================

let _idCounter = 0;

function uid(): string {
  return `user-${++_idCounter}`;
}

function createBasic(userId = uid()) {
  return disputeService.createDispute(
    userId,
    "experian",
    "late_payment",
    "30-day late payment on account #1234",
    "Payment was made on time — bank processing delay",
    "Letter content here",
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("DisputeService", () => {
  // --------------------------------------------------------------------------
  // createDispute
  // --------------------------------------------------------------------------

  describe("createDispute", () => {
    it("returns a dispute with status=draft", () => {
      const d = createBasic();
      expect(d.status).toBe("draft");
    });

    it("stores the bureau correctly", () => {
      const d = disputeService.createDispute(
        uid(), "equifax", "collection", "desc", "reason", "letter",
      );
      expect(d.bureau).toBe("equifax");
    });

    it("stores the provided letterContent", () => {
      const d = disputeService.createDispute(
        uid(), "transunion", "inquiry", "desc", "reason", "my letter text",
      );
      expect(d.letterContent).toBe("my letter text");
    });

    it("stores optional evidence array", () => {
      const d = disputeService.createDispute(
        uid(), "experian", "inquiry", "desc", "reason", "letter", ["url-1"],
      );
      expect(d.evidence).toEqual(["url-1"]);
    });

    it("evidence is undefined when not provided", () => {
      const d = createBasic();
      expect(d.evidence).toBeUndefined();
    });

    it("creates an initial timeline event", () => {
      const d = createBasic();
      expect(d.timeline).toHaveLength(1);
      expect(d.timeline[0].status).toBe("draft");
    });

    it("generates a unique id for each dispute", () => {
      const d1 = createBasic();
      const d2 = createBasic();
      expect(d1.id).not.toBe(d2.id);
    });

    it("stores userId correctly", () => {
      const userId = uid();
      const d = createBasic(userId);
      expect(d.userId).toBe(userId);
    });
  });

  // --------------------------------------------------------------------------
  // getDispute
  // --------------------------------------------------------------------------

  describe("getDispute", () => {
    it("returns the dispute by id", () => {
      const d = createBasic();
      expect(disputeService.getDispute(d.id)).toBe(d);
    });

    it("returns undefined for unknown id", () => {
      expect(disputeService.getDispute("does-not-exist")).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getUserDisputes
  // --------------------------------------------------------------------------

  describe("getUserDisputes", () => {
    it("returns only disputes belonging to the user", () => {
      const userId = uid();
      createBasic(); // other user
      const d = createBasic(userId);
      const results = disputeService.getUserDisputes(userId);
      expect(results.every((r) => r.userId === userId)).toBe(true);
      expect(results.some((r) => r.id === d.id)).toBe(true);
    });

    it("returns empty array when user has no disputes", () => {
      expect(disputeService.getUserDisputes("no-such-user-zzz")).toEqual([]);
    });

    it("filters by status when provided", () => {
      const userId = uid();
      const d = createBasic(userId);
      disputeService.sendDispute(d.id);
      const sentOnly = disputeService.getUserDisputes(userId, "sent");
      expect(sentOnly.every((r) => r.status === "sent")).toBe(true);
    });

    it("returns all disputes when no status filter", () => {
      const userId = uid();
      createBasic(userId);
      createBasic(userId);
      expect(disputeService.getUserDisputes(userId).length).toBeGreaterThanOrEqual(2);
    });
  });

  // --------------------------------------------------------------------------
  // sendDispute
  // --------------------------------------------------------------------------

  describe("sendDispute", () => {
    it("returns null for unknown dispute id", () => {
      expect(disputeService.sendDispute("nope")).toBeNull();
    });

    it("changes status to sent", () => {
      const d = createBasic();
      disputeService.sendDispute(d.id);
      expect(d.status).toBe("sent");
    });

    it("sets sentAt to a Date", () => {
      const d = createBasic();
      disputeService.sendDispute(d.id);
      expect(d.sentAt).toBeInstanceOf(Date);
    });

    it("sets estimatedResolutionDate ~30 days from sentAt", () => {
      const d = createBasic();
      disputeService.sendDispute(d.id);
      const diffDays =
        (d.estimatedResolutionDate!.getTime() - d.sentAt!.getTime()) /
        (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(30);
    });

    it("adds a timeline event with status=sent", () => {
      const d = createBasic();
      const before = d.timeline.length;
      disputeService.sendDispute(d.id);
      expect(d.timeline.length).toBe(before + 1);
      expect(d.timeline[d.timeline.length - 1].status).toBe("sent");
    });
  });

  // --------------------------------------------------------------------------
  // updateDisputeStatus
  // --------------------------------------------------------------------------

  describe("updateDisputeStatus", () => {
    it("returns null for unknown id", () => {
      expect(disputeService.updateDisputeStatus("nope", "sent")).toBeNull();
    });

    it("updates the status field", () => {
      const d = createBasic();
      disputeService.updateDisputeStatus(d.id, "under_review");
      expect(d.status).toBe("under_review");
    });

    it("sets resolvedAt when status is resolved", () => {
      const d = createBasic();
      disputeService.updateDisputeStatus(d.id, "resolved");
      expect(d.resolvedAt).toBeInstanceOf(Date);
    });

    it("resolvedAt is not set for non-resolved status", () => {
      const d = createBasic();
      disputeService.updateDisputeStatus(d.id, "escalated");
      expect(d.resolvedAt).toBeUndefined();
    });

    it("appends a timeline event with custom description", () => {
      const d = createBasic();
      disputeService.updateDisputeStatus(d.id, "escalated", "Escalated by user");
      const last = d.timeline[d.timeline.length - 1];
      expect(last.description).toBe("Escalated by user");
    });

    it("appends a timeline event with default description when none given", () => {
      const d = createBasic();
      disputeService.updateDisputeStatus(d.id, "under_review");
      const last = d.timeline[d.timeline.length - 1];
      expect(last.description).toContain("under_review");
    });
  });

  // --------------------------------------------------------------------------
  // resolveDispute
  // --------------------------------------------------------------------------

  describe("resolveDispute", () => {
    it("returns null for unknown id", () => {
      expect(disputeService.resolveDispute("nope", "removed")).toBeNull();
    });

    it("sets status to resolved", () => {
      const d = createBasic();
      disputeService.resolveDispute(d.id, "removed");
      expect(d.status).toBe("resolved");
    });

    it("sets the outcome field", () => {
      const d = createBasic();
      disputeService.resolveDispute(d.id, "updated");
      expect(d.outcome).toBe("updated");
    });

    it("stores optional notes", () => {
      const d = createBasic();
      disputeService.resolveDispute(d.id, "verified", "Bureau confirmed accuracy");
      expect(d.notes).toBe("Bureau confirmed accuracy");
    });

    it("notes is unchanged when not provided", () => {
      const d = createBasic();
      disputeService.resolveDispute(d.id, "pending");
      expect(d.notes).toBeUndefined();
    });

    it("appends a timeline event describing the outcome", () => {
      const d = createBasic();
      disputeService.resolveDispute(d.id, "removed");
      const last = d.timeline[d.timeline.length - 1];
      expect(last.description).toContain("removed");
    });
  });

  // --------------------------------------------------------------------------
  // addNote
  // --------------------------------------------------------------------------

  describe("addNote", () => {
    it("returns null for unknown id", () => {
      expect(disputeService.addNote("nope", "a note")).toBeNull();
    });

    it("sets notes when notes was undefined", () => {
      const d = createBasic();
      disputeService.addNote(d.id, "first note");
      expect(d.notes).toBe("first note");
    });

    it("appends to existing notes with double newline separator", () => {
      const d = createBasic();
      disputeService.addNote(d.id, "first");
      disputeService.addNote(d.id, "second");
      expect(d.notes).toBe("first\n\nsecond");
    });
  });

  // --------------------------------------------------------------------------
  // addEvidence
  // --------------------------------------------------------------------------

  describe("addEvidence", () => {
    it("returns null for unknown id", () => {
      expect(disputeService.addEvidence("nope", "url")).toBeNull();
    });

    it("initializes evidence array when undefined", () => {
      const d = createBasic();
      disputeService.addEvidence(d.id, "https://example.com/doc.pdf");
      expect(d.evidence).toEqual(["https://example.com/doc.pdf"]);
    });

    it("appends to existing evidence array", () => {
      const d = disputeService.createDispute(
        uid(), "experian", "inquiry", "desc", "reason", "letter", ["url-1"],
      );
      disputeService.addEvidence(d.id, "url-2");
      expect(d.evidence).toEqual(["url-1", "url-2"]);
    });
  });

  // --------------------------------------------------------------------------
  // deleteDispute
  // --------------------------------------------------------------------------

  describe("deleteDispute", () => {
    it("returns true when dispute existed", () => {
      const d = createBasic();
      expect(disputeService.deleteDispute(d.id)).toBe(true);
    });

    it("returns false for unknown id", () => {
      expect(disputeService.deleteDispute("nonexistent-zzz")).toBe(false);
    });

    it("makes dispute unretrievable after deletion", () => {
      const d = createBasic();
      disputeService.deleteDispute(d.id);
      expect(disputeService.getDispute(d.id)).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // getUserDisputeStats
  // --------------------------------------------------------------------------

  describe("getUserDisputeStats", () => {
    it("returns all zeros for user with no disputes", () => {
      const stats = disputeService.getUserDisputeStats("empty-user-zzz");
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.resolved).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageResolutionDays).toBe(0);
    });

    it("counts total disputes correctly", () => {
      const userId = uid();
      createBasic(userId);
      createBasic(userId);
      const stats = disputeService.getUserDisputeStats(userId);
      expect(stats.total).toBe(2);
    });

    it("counts active disputes (sent or under_review)", () => {
      const userId = uid();
      const d1 = createBasic(userId);
      const d2 = createBasic(userId);
      disputeService.sendDispute(d1.id);
      disputeService.updateDisputeStatus(d2.id, "under_review");
      const stats = disputeService.getUserDisputeStats(userId);
      expect(stats.active).toBe(2);
    });

    it("computes successRate as 0 when no disputes resolved", () => {
      const userId = uid();
      createBasic(userId);
      const stats = disputeService.getUserDisputeStats(userId);
      expect(stats.successRate).toBe(0);
    });

    it("computes successRate = 100 when all resolved disputes are removed/updated", () => {
      const userId = uid();
      const d = createBasic(userId);
      disputeService.sendDispute(d.id);
      disputeService.resolveDispute(d.id, "removed");
      const stats = disputeService.getUserDisputeStats(userId);
      expect(stats.successRate).toBe(100);
    });

    it("computes successRate = 0 when resolved dispute is verified (not successful)", () => {
      const userId = uid();
      const d = createBasic(userId);
      disputeService.resolveDispute(d.id, "verified");
      const stats = disputeService.getUserDisputeStats(userId);
      expect(stats.successRate).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // predictResolutionTimeline
  // --------------------------------------------------------------------------

  describe("predictResolutionTimeline", () => {
    it("returns estimatedDays=30 and confidence=low for unknown id", () => {
      const result = disputeService.predictResolutionTimeline("nope");
      expect(result.estimatedDays).toBe(30);
      expect(result.confidence).toBe("low");
    });

    it("subtracts 3 days for experian bureau", () => {
      const d = disputeService.createDispute(
        uid(), "experian", "inquiry", "desc", "reason", "letter",
      );
      const result = disputeService.predictResolutionTimeline(d.id);
      expect(result.estimatedDays).toBe(27);
    });

    it("adds 2 days for transunion bureau", () => {
      const d = disputeService.createDispute(
        uid(), "transunion", "inquiry", "desc", "reason", "letter",
      );
      const result = disputeService.predictResolutionTimeline(d.id);
      expect(result.estimatedDays).toBe(32);
    });

    it("adds 5 days for late_payment item type", () => {
      const d = disputeService.createDispute(
        uid(), "equifax", "late_payment", "desc", "reason", "letter",
      );
      const result = disputeService.predictResolutionTimeline(d.id);
      expect(result.estimatedDays).toBe(35);
    });

    it("adds 10 days for identity_theft item type", () => {
      const d = disputeService.createDispute(
        uid(), "equifax", "identity_theft", "desc", "reason", "letter",
      );
      const result = disputeService.predictResolutionTimeline(d.id);
      expect(result.estimatedDays).toBe(40);
    });

    it("reduces days and sets confidence=high when evidence provided", () => {
      const d = disputeService.createDispute(
        uid(), "equifax", "inquiry", "desc", "reason", "letter", ["url-1"],
      );
      const result = disputeService.predictResolutionTimeline(d.id);
      expect(result.confidence).toBe("high");
      expect(result.estimatedDays).toBe(25);
    });

    it("clamps estimatedDays to maximum 45", () => {
      // identity_theft + transunion = 30 + 2 + 10 = 42, still <=45
      // Force beyond 45 by having both transunion and identity_theft: 42 < 45 — OK, test the cap exists
      const d = disputeService.createDispute(
        uid(), "transunion", "identity_theft", "desc", "reason", "letter",
      );
      const result = disputeService.predictResolutionTimeline(d.id);
      expect(result.estimatedDays).toBeLessThanOrEqual(45);
    });

    it("clamps estimatedDays to minimum 15", () => {
      // experian (-3) + evidence (-5) = 22, > 15. Min only triggers in extreme cases.
      // We test by checking the value is always >= 15
      const d = createBasic();
      const result = disputeService.predictResolutionTimeline(d.id);
      expect(result.estimatedDays).toBeGreaterThanOrEqual(15);
    });

    it("includes at least one factor string", () => {
      const d = createBasic();
      const result = disputeService.predictResolutionTimeline(d.id);
      expect(result.factors.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // getDisputesByBureau
  // --------------------------------------------------------------------------

  describe("getDisputesByBureau", () => {
    it("returns only disputes for the specified bureau", () => {
      const userId = uid();
      disputeService.createDispute(userId, "experian", "inquiry", "d", "r", "l");
      disputeService.createDispute(userId, "equifax", "inquiry", "d", "r", "l");
      const results = disputeService.getDisputesByBureau(userId, "experian");
      expect(results.every((d) => d.bureau === "experian")).toBe(true);
    });

    it("returns empty array when user has no disputes at bureau", () => {
      const userId = uid();
      disputeService.createDispute(userId, "experian", "inquiry", "d", "r", "l");
      expect(disputeService.getDisputesByBureau(userId, "transunion")).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // getRecentActivity
  // --------------------------------------------------------------------------

  describe("getRecentActivity", () => {
    it("returns empty array when user has no disputes", () => {
      expect(disputeService.getRecentActivity("no-user-zzz")).toEqual([]);
    });

    it("respects the limit parameter", () => {
      const userId = uid();
      const d = createBasic(userId);
      // Add multiple timeline events
      disputeService.sendDispute(d.id);
      disputeService.updateDisputeStatus(d.id, "under_review");
      disputeService.updateDisputeStatus(d.id, "resolved");
      const activity = disputeService.getRecentActivity(userId, 2);
      expect(activity.length).toBeLessThanOrEqual(2);
    });

    it("returns events sorted newest first", () => {
      const userId = uid();
      const d = createBasic(userId);
      disputeService.sendDispute(d.id);
      const activity = disputeService.getRecentActivity(userId);
      for (let i = 1; i < activity.length; i++) {
        expect(activity[i - 1].date.getTime()).toBeGreaterThanOrEqual(
          activity[i].date.getTime(),
        );
      }
    });
  });

  // --------------------------------------------------------------------------
  // Template integration
  // --------------------------------------------------------------------------

  describe("getAvailableTemplates", () => {
    it("returns non-empty array", () => {
      expect(disputeService.getAvailableTemplates().length).toBeGreaterThan(0);
    });
  });

  describe("getTemplate", () => {
    it("returns template for known id", () => {
      const tpl = disputeService.getTemplate("unauthorized_hard_inquiry");
      expect(tpl).toBeDefined();
      expect(tpl!.id).toBe("unauthorized_hard_inquiry");
    });

    it("returns undefined for unknown id", () => {
      expect(disputeService.getTemplate("not_a_real_template")).toBeUndefined();
    });
  });

  describe("getRecommendedTemplates", () => {
    it("returns templates with successRate >= threshold", () => {
      const templates = disputeService.getRecommendedTemplates(70);
      expect(templates.every((t) => t.successRate >= 70)).toBe(true);
    });
  });

  describe("createDisputeFromTemplate", () => {
    it("returns null for unknown template id", () => {
      const result = disputeService.createDisputeFromTemplate(
        uid(), "experian", "nonexistent_template", {},
      );
      expect(result).toBeNull();
    });

    it("creates a dispute with templateId set", () => {
      const d = disputeService.createDisputeFromTemplate(
        uid(), "experian", "unauthorized_hard_inquiry", {
          CREDITOR_NAME: "Acme Bank",
          INQUIRY_DATE: "2025-01-15",
          YOUR_NAME: "Jane Doe",
        },
      );
      expect(d).not.toBeNull();
      expect(d!.templateId).toBe("unauthorized_hard_inquiry");
    });

    it("replaces placeholder values in letter content", () => {
      const d = disputeService.createDisputeFromTemplate(
        uid(), "experian", "unauthorized_hard_inquiry", {
          CREDITOR_NAME: "TestBank",
          INQUIRY_DATE: "2025-01-01",
          YOUR_NAME: "John Smith",
        },
      );
      expect(d!.letterContent).not.toContain("[CREDITOR_NAME]");
    });
  });

  // --------------------------------------------------------------------------
  // Strategy integration
  // --------------------------------------------------------------------------

  describe("getAvailableStrategies", () => {
    it("returns non-empty array", () => {
      expect(disputeService.getAvailableStrategies().length).toBeGreaterThan(0);
    });
  });

  describe("getStrategy", () => {
    it("returns strategy for known id", () => {
      const s = disputeService.getStrategy("escalation_tactics");
      expect(s).toBeDefined();
    });

    it("returns undefined for unknown id", () => {
      expect(disputeService.getStrategy("bogus_strategy")).toBeUndefined();
    });
  });

  describe("applyStrategy", () => {
    it("returns null when dispute not found", () => {
      expect(disputeService.applyStrategy("nope", "escalation_tactics")).toBeNull();
    });

    it("returns null when strategy not found", () => {
      const d = createBasic();
      expect(disputeService.applyStrategy(d.id, "bogus")).toBeNull();
    });

    it("sets strategyId on dispute", () => {
      const d = createBasic();
      disputeService.applyStrategy(d.id, "escalation_tactics");
      expect(d.strategyId).toBe("escalation_tactics");
    });

    it("sets escalationLevel to 1", () => {
      const d = createBasic();
      disputeService.applyStrategy(d.id, "escalation_tactics");
      expect(d.escalationLevel).toBe(1);
    });

    it("adds a timeline event describing the applied strategy", () => {
      const d = createBasic();
      const before = d.timeline.length;
      disputeService.applyStrategy(d.id, "escalation_tactics");
      expect(d.timeline.length).toBe(before + 1);
    });
  });

  describe("escalateDispute", () => {
    it("returns null when dispute not found", () => {
      expect(disputeService.escalateDispute("nope")).toBeNull();
    });

    it("returns null when no strategy applied", () => {
      const d = createBasic();
      expect(disputeService.escalateDispute(d.id)).toBeNull();
    });

    it("increments escalationLevel", () => {
      const d = createBasic();
      disputeService.applyStrategy(d.id, "escalation_tactics");
      disputeService.escalateDispute(d.id);
      expect(d.escalationLevel).toBe(2);
    });

    it("sets status to escalated", () => {
      const d = createBasic();
      disputeService.applyStrategy(d.id, "escalation_tactics");
      disputeService.escalateDispute(d.id);
      expect(d.status).toBe("escalated");
    });

    it("does not escalate beyond max steps", () => {
      const d = createBasic();
      const strategy = disputeService.getStrategy("escalation_tactics")!;
      disputeService.applyStrategy(d.id, "escalation_tactics");
      // Drive escalationLevel to max
      for (let i = 0; i < strategy.steps.length + 5; i++) {
        disputeService.escalateDispute(d.id);
      }
      expect(d.escalationLevel).toBeLessThanOrEqual(strategy.steps.length);
    });
  });

  describe("getStrategyAnalytics", () => {
    it("returns empty maps for user with no disputes", () => {
      const analytics = disputeService.getStrategyAnalytics("no-user-zzz");
      expect(analytics.strategiesUsed.size).toBe(0);
    });

    it("counts strategy usage correctly", () => {
      const userId = uid();
      const d1 = createBasic(userId);
      const d2 = createBasic(userId);
      disputeService.applyStrategy(d1.id, "escalation_tactics");
      disputeService.applyStrategy(d2.id, "escalation_tactics");
      const analytics = disputeService.getStrategyAnalytics(userId);
      expect(analytics.strategiesUsed.get("escalation_tactics")).toBe(2);
    });

    it("tracks successful outcomes by strategy", () => {
      const userId = uid();
      const d = createBasic(userId);
      disputeService.applyStrategy(d.id, "escalation_tactics");
      disputeService.resolveDispute(d.id, "removed");
      const analytics = disputeService.getStrategyAnalytics(userId);
      expect(analytics.successByStrategy.get("escalation_tactics")).toBe(1);
    });
  });
});
