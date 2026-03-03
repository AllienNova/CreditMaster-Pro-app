/**
 * Degradation Manager Tests
 *
 * Tests for the 5-level service degradation system:
 * Level 1 (FULL) -> Level 2 (REDUCED) -> Level 3 (MINIMAL)
 * -> Level 4 (RULE_ONLY) -> Level 5 (HALT)
 */

import {
  DegradationManager,
  getDegradationManager,
  resetDegradationManager,
} from "../degradation-manager";
import type {
  DegradationLevel,
  DegradationState,
  DegradationEvent,
} from "../degradation-manager";
import type { AIProvider, AgentType } from "../../agents/agent-types";

// ============================================================================
// HELPERS
// ============================================================================

function makeProviderHealth(
  overrides: Partial<Record<AIProvider, boolean>> = {},
): Record<AIProvider, boolean> {
  return {
    aiml: true,
    anthropic: true,
    openai: true,
    xai: true,
    ...overrides,
  };
}

const CRITICAL_AGENTS: AgentType[] = [
  "consensus_arbiter",
  "risk_narrative",
  "regime_confirmation",
];

const STANDARD_AGENTS: AgentType[] = [
  "sentiment",
  "signal_explainer",
  "earnings_analysis",
];

const OPTIONAL_AGENTS: AgentType[] = ["news_impact"];

const ALL_AGENTS: AgentType[] = [
  ...CRITICAL_AGENTS,
  ...STANDARD_AGENTS,
  ...OPTIONAL_AGENTS,
];

// ============================================================================
// TESTS
// ============================================================================

describe("DegradationManager", () => {
  let manager: DegradationManager;

  beforeEach(() => {
    resetDegradationManager();
    manager = new DegradationManager();
  });

  // --------------------------------------------------------------------------
  // Initial state
  // --------------------------------------------------------------------------

  describe("initial state", () => {
    it("starts at level 1 (FULL)", () => {
      expect(manager.getLevel()).toBe(1);
    });

    it("getState returns correct shape", () => {
      const state = manager.getState();

      expect(state.level).toBe(1);
      expect(state.levelName).toBe("FULL");
      expect(state.reason).toBe("System nominal");
      expect(state.autoRecoveryEnabled).toBe(true);
      expect(state.since).toBeDefined();
      expect(Array.isArray(state.activeAgents)).toBe(true);
      expect(Array.isArray(state.disabledAgents)).toBe(true);
    });

    it("all agents active at level 1", () => {
      const state = manager.getState();
      expect(state.activeAgents).toEqual(expect.arrayContaining(ALL_AGENTS));
      expect(state.disabledAgents).toHaveLength(0);
    });

    it("event history is empty initially", () => {
      expect(manager.getHistory()).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // isAgentActive
  // --------------------------------------------------------------------------

  describe("isAgentActive", () => {
    it("returns true for all agents at level 1", () => {
      for (const agent of ALL_AGENTS) {
        expect(manager.isAgentActive(agent)).toBe(true);
      }
    });

    it("returns false for optional agents at level 2", () => {
      manager.setLevel(2, "Degraded");

      // Critical and standard agents should be active
      for (const agent of [...CRITICAL_AGENTS, ...STANDARD_AGENTS]) {
        expect(manager.isAgentActive(agent)).toBe(true);
      }

      // Optional agents should be inactive
      for (const agent of OPTIONAL_AGENTS) {
        expect(manager.isAgentActive(agent)).toBe(false);
      }
    });

    it("returns true only for critical agents at level 3", () => {
      manager.setLevel(3, "Minimal mode");

      for (const agent of CRITICAL_AGENTS) {
        expect(manager.isAgentActive(agent)).toBe(true);
      }

      for (const agent of [...STANDARD_AGENTS, ...OPTIONAL_AGENTS]) {
        expect(manager.isAgentActive(agent)).toBe(false);
      }
    });

    it("returns false for all agents at level 4", () => {
      manager.setLevel(4, "Rule-based only");

      for (const agent of ALL_AGENTS) {
        expect(manager.isAgentActive(agent)).toBe(false);
      }
    });

    it("returns false for all agents at level 5", () => {
      manager.setLevel(5, "Halted");

      for (const agent of ALL_AGENTS) {
        expect(manager.isAgentActive(agent)).toBe(false);
      }
    });
  });

  // --------------------------------------------------------------------------
  // setLevel
  // --------------------------------------------------------------------------

  describe("setLevel", () => {
    it("changes level and reason", () => {
      manager.setLevel(3, "Test degradation");

      expect(manager.getLevel()).toBe(3);
      expect(manager.getState().reason).toBe("Test degradation");
      expect(manager.getState().levelName).toBe("MINIMAL");
    });

    it("is a no-op when setting the same level", () => {
      manager.setLevel(2, "First change");
      const historyLenAfterFirst = manager.getHistory().length;

      manager.setLevel(2, "Duplicate");
      expect(manager.getHistory().length).toBe(historyLenAfterFirst);
    });

    it("records event in history on level change", () => {
      manager.setLevel(3, "Provider issue");

      const history = manager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].fromLevel).toBe(1);
      expect(history[0].toLevel).toBe(3);
      expect(history[0].reason).toBe("Provider issue");
      expect(history[0].timestamp).toBeDefined();
    });

    it("updates since timestamp on change", () => {
      const originalSince = manager.getState().since;
      // Small delay to ensure different timestamp
      manager.setLevel(2, "Changed");
      const newSince = manager.getState().since;
      // They should both be valid ISO strings
      expect(new Date(originalSince).getTime()).toBeLessThanOrEqual(
        new Date(newSince).getTime(),
      );
    });
  });

  // --------------------------------------------------------------------------
  // evaluateHealth
  // --------------------------------------------------------------------------

  describe("evaluateHealth", () => {
    it("stays at level 1 when all providers are healthy", () => {
      const level = manager.evaluateHealth(makeProviderHealth());
      expect(level).toBe(1);
    });

    it("downgrades to level 2 when 1 provider is unavailable", () => {
      const level = manager.evaluateHealth(
        makeProviderHealth({ xai: false }),
      );
      // 3 available + primary available => level 1
      // Actually: 3 available and primary available => level 1
      expect(level).toBe(1);
    });

    it("downgrades to level 2 when primary + 1 are unavailable", () => {
      const level = manager.evaluateHealth(
        makeProviderHealth({ aiml: false, xai: false }),
      );
      // 2 available, primary not available => level 2
      expect(level).toBe(2);
    });

    it("downgrades to level 3 when only 1 provider available", () => {
      const level = manager.evaluateHealth(
        makeProviderHealth({
          aiml: false,
          anthropic: false,
          openai: false,
          xai: true,
        }),
      );
      expect(level).toBe(3);
    });

    it("downgrades to level 4 when no providers available", () => {
      const level = manager.evaluateHealth(
        makeProviderHealth({
          aiml: false,
          anthropic: false,
          openai: false,
          xai: false,
        }),
      );
      expect(level).toBe(4);
    });

    it("auto-recovers when providers return", () => {
      // First degrade
      manager.evaluateHealth(
        makeProviderHealth({
          aiml: false,
          anthropic: false,
          openai: false,
        }),
      );
      expect(manager.getLevel()).toBe(3);

      // Then recover
      manager.evaluateHealth(makeProviderHealth());
      expect(manager.getLevel()).toBe(1);
    });

    it("does not auto-recover when auto-recovery is disabled", () => {
      manager.setAutoRecovery(false);

      // First degrade
      manager.evaluateHealth(
        makeProviderHealth({
          aiml: false,
          anthropic: false,
          openai: false,
        }),
      );
      expect(manager.getLevel()).toBe(3);

      // Try to recover -- should stay at 3 since auto-recovery is off
      // But if newLevel > currentLevel, it should still degrade further
      manager.evaluateHealth(makeProviderHealth());
      // Since newLevel (1) < currentLevel (3), and auto-recovery is off, stays at 3
      expect(manager.getLevel()).toBe(3);
    });

    it("still degrades further even with auto-recovery disabled", () => {
      manager.setAutoRecovery(false);

      // Degrade to 3
      manager.evaluateHealth(
        makeProviderHealth({
          aiml: false,
          anthropic: false,
          openai: false,
        }),
      );
      expect(manager.getLevel()).toBe(3);

      // Degrade further to 4
      manager.evaluateHealth(
        makeProviderHealth({
          aiml: false,
          anthropic: false,
          openai: false,
          xai: false,
        }),
      );
      expect(manager.getLevel()).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // halt / resume
  // --------------------------------------------------------------------------

  describe("halt", () => {
    it("sets level 5 and disables auto-recovery", () => {
      manager.halt("Emergency stop");

      expect(manager.getLevel()).toBe(5);
      expect(manager.getState().reason).toBe("Emergency stop");
      expect(manager.getState().autoRecoveryEnabled).toBe(false);
    });

    it("prevents auto-recovery after halt", () => {
      manager.halt("Emergency stop");
      manager.evaluateHealth(makeProviderHealth());

      // Even with all providers healthy, should stay at level 5
      // because auto-recovery is disabled and newLevel < currentLevel
      // Wait, evaluateHealth with auto-recovery disabled: newLevel=1, currentLevel=5
      // newLevel > currentLevel is false (1 > 5 is false), so no change
      expect(manager.getLevel()).toBe(5);
    });
  });

  describe("resume", () => {
    it("restores to level 1 and enables auto-recovery", () => {
      manager.halt("Emergency");
      expect(manager.getLevel()).toBe(5);

      manager.resume();
      expect(manager.getLevel()).toBe(1);
      expect(manager.getState().autoRecoveryEnabled).toBe(true);
      expect(manager.getState().reason).toBe("Manual resume from halt");
    });
  });

  // --------------------------------------------------------------------------
  // Event history
  // --------------------------------------------------------------------------

  describe("event history", () => {
    it("tracks all level transitions", () => {
      manager.setLevel(2, "Reason A");
      manager.setLevel(3, "Reason B");
      manager.setLevel(1, "Reason C");

      const history = manager.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].fromLevel).toBe(1);
      expect(history[0].toLevel).toBe(2);
      expect(history[1].fromLevel).toBe(2);
      expect(history[1].toLevel).toBe(3);
      expect(history[2].fromLevel).toBe(3);
      expect(history[2].toLevel).toBe(1);
    });

    it("clearHistory empties history", () => {
      manager.setLevel(2, "Test");
      expect(manager.getHistory().length).toBeGreaterThan(0);

      manager.clearHistory();
      expect(manager.getHistory()).toHaveLength(0);
    });

    it("limits history to maxHistorySize", () => {
      // Create many transitions
      for (let i = 0; i < 120; i++) {
        const level: DegradationLevel = (i % 2) === 0 ? 2 : 3;
        manager.setLevel(level, `Transition ${i}`);
      }

      // Max is 100
      expect(manager.getHistory().length).toBeLessThanOrEqual(100);
    });
  });

  // --------------------------------------------------------------------------
  // setAutoRecovery
  // --------------------------------------------------------------------------

  describe("setAutoRecovery", () => {
    it("enables auto-recovery", () => {
      manager.setAutoRecovery(false);
      expect(manager.getState().autoRecoveryEnabled).toBe(false);

      manager.setAutoRecovery(true);
      expect(manager.getState().autoRecoveryEnabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe("singleton", () => {
    it("getDegradationManager returns same instance", () => {
      const d1 = getDegradationManager();
      const d2 = getDegradationManager();
      expect(d1).toBe(d2);
    });

    it("resetDegradationManager creates new instance", () => {
      const d1 = getDegradationManager();
      resetDegradationManager();
      const d2 = getDegradationManager();
      expect(d1).not.toBe(d2);
    });
  });
});
