/**
 * LLM Guardrails Extended — Canary Tokens + Semantic Similarity
 *
 * Tests for the canary token system and semantic similarity detection
 * added to the LLMGuardrails class. Pure logic — no external mocks.
 */

import { LLMGuardrails } from "../llm-guardrails";
import type {
  CanaryToken,
  ResponsePattern,
} from "../llm-guardrails";

// ============================================================================
// HELPERS
// ============================================================================

function makeGuardrails(): LLMGuardrails {
  return new LLMGuardrails();
}

// ============================================================================
// TESTS
// ============================================================================

describe("LLMGuardrails — Canary Tokens & Semantic Similarity", () => {
  let guardrails: LLMGuardrails;

  beforeEach(() => {
    guardrails = makeGuardrails();
  });

  // ==========================================================================
  // CANARY TOKEN GENERATION (5 tests)
  // ==========================================================================

  describe("generateCanaryToken", () => {
    it("should generate a unique token string", () => {
      const canary = guardrails.generateCanaryToken();
      expect(canary.token).toBeDefined();
      expect(canary.token.length).toBeGreaterThan(0);
    });

    it("should produce tokens matching the [CANARY-xxx] format", () => {
      const canary = guardrails.generateCanaryToken();
      expect(canary.token).toMatch(/^\[CANARY-[a-f0-9-]+\]$/);
    });

    it("should generate different tokens on successive calls", () => {
      const t1 = guardrails.generateCanaryToken();
      const t2 = guardrails.generateCanaryToken();
      expect(t1.token).not.toBe(t2.token);
    });

    it("should set default position to prefix", () => {
      const canary = guardrails.generateCanaryToken();
      expect(canary.position).toBe("prefix");
    });

    it("should set generatedAt to a recent timestamp", () => {
      const before = Date.now();
      const canary = guardrails.generateCanaryToken();
      const after = Date.now();
      expect(canary.generatedAt).toBeGreaterThanOrEqual(before);
      expect(canary.generatedAt).toBeLessThanOrEqual(after);
    });

    it("should produce deterministic tokens when given a seed", () => {
      const t1 = guardrails.generateCanaryToken("test-seed-alpha");
      const t2 = guardrails.generateCanaryToken("test-seed-alpha");
      expect(t1.token).toBe(t2.token);
    });

    it("should produce different tokens for different seeds", () => {
      const t1 = guardrails.generateCanaryToken("seed-one");
      const t2 = guardrails.generateCanaryToken("seed-two");
      expect(t1.token).not.toBe(t2.token);
    });
  });

  // ==========================================================================
  // CANARY INJECTION (5 tests)
  // ==========================================================================

  describe("injectCanary", () => {
    it("should inject instruction at the start for prefix position", () => {
      const result = guardrails.injectCanary("Analyze AAPL", "prefix");
      expect(result.prompt.startsWith("Include this verification code")).toBe(
        true,
      );
      expect(result.prompt).toContain("Analyze AAPL");
    });

    it("should inject instruction at the end for suffix position", () => {
      const result = guardrails.injectCanary("Analyze AAPL", "suffix");
      expect(result.prompt.startsWith("Analyze AAPL")).toBe(true);
      expect(result.prompt).toContain("Include this verification code");
      // The instruction should come after the original prompt
      const instructionIdx = result.prompt.indexOf(
        "Include this verification code",
      );
      const promptIdx = result.prompt.indexOf("Analyze AAPL");
      expect(instructionIdx).toBeGreaterThan(promptIdx);
    });

    it("should embed token within the prompt for inline position", () => {
      const result = guardrails.injectCanary(
        "This is a long prompt about trading strategies for stocks",
        "inline",
      );
      // The token should appear somewhere in the middle, not at the very start
      const tokenIdx = result.prompt.indexOf(result.token.token);
      expect(tokenIdx).toBeGreaterThan(0);
      expect(tokenIdx).toBeLessThan(result.prompt.length - result.token.token.length);
    });

    it("should return both the modified prompt and the token", () => {
      const result = guardrails.injectCanary("Test prompt");
      expect(result.prompt).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.token).toMatch(/^\[CANARY-/);
    });

    it("should include the canary token string in the modified prompt", () => {
      const result = guardrails.injectCanary("Test prompt");
      expect(result.prompt).toContain(result.token.token);
    });
  });

  // ==========================================================================
  // CANARY VERIFICATION (6 tests)
  // ==========================================================================

  describe("verifyCanary", () => {
    it("should pass when token is found in response", () => {
      const canary = guardrails.generateCanaryToken("verify-test");
      const response = `Here is my analysis. ${canary.token} The stock looks bullish.`;
      const result = guardrails.verifyCanary(response, canary);

      expect(result.passed).toBe(true);
      expect(result.foundTokens).toContain(canary.token);
      expect(result.missingTokens).toHaveLength(0);
      expect(result.manipulationDetected).toBe(false);
    });

    it("should fail when token is missing from response", () => {
      const canary = guardrails.generateCanaryToken("missing-test");
      const response = "Here is my analysis without any token.";
      const result = guardrails.verifyCanary(response, canary);

      expect(result.passed).toBe(false);
      expect(result.missingTokens).toContain(canary.token);
      expect(result.foundTokens).toHaveLength(0);
    });

    it("should set manipulationDetected when expected but missing", () => {
      const canary = guardrails.generateCanaryToken("manip-test");
      canary.expectedInResponse = true;
      const response = "Response without canary.";
      const result = guardrails.verifyCanary(response, canary);

      expect(result.manipulationDetected).toBe(true);
      expect(result.details).toContain("manipulation");
    });

    it("should fail on partial token match", () => {
      const canary = guardrails.generateCanaryToken("partial-test");
      // Take only the first half of the token
      const partialToken = canary.token.slice(0, canary.token.length / 2);
      const response = `Here is: ${partialToken}`;
      const result = guardrails.verifyCanary(response, canary);

      expect(result.passed).toBe(false);
      expect(result.manipulationDetected).toBe(true);
    });

    it("should handle empty response", () => {
      const canary = guardrails.generateCanaryToken("empty-test");
      const result = guardrails.verifyCanary("", canary);

      expect(result.passed).toBe(false);
      expect(result.manipulationDetected).toBe(true);
      expect(result.missingTokens).toHaveLength(1);
    });

    it("should handle response with modified token", () => {
      const canary = guardrails.generateCanaryToken("modified-test");
      // Modify one character in the token
      const modifiedToken =
        canary.token.slice(0, -2) + "X]";
      const response = `Here is: ${modifiedToken}`;
      const result = guardrails.verifyCanary(response, canary);

      expect(result.passed).toBe(false);
      expect(result.manipulationDetected).toBe(true);
    });

    it("should pass when expectedInResponse is false and token missing", () => {
      const canary = guardrails.generateCanaryToken("not-expected-test");
      canary.expectedInResponse = false;
      const response = "Response without canary.";
      const result = guardrails.verifyCanary(response, canary);

      expect(result.passed).toBe(true);
      expect(result.manipulationDetected).toBe(false);
    });
  });

  // ==========================================================================
  // SEMANTIC CHECK (8 tests)
  // ==========================================================================

  describe("checkResponseSemantic", () => {
    it("should pass when all required fields are present", () => {
      const response = JSON.stringify({
        symbol: "AAPL",
        direction: "long",
        confidence: 0.85,
      });
      const pattern: ResponsePattern = {
        requiredFields: ["symbol", "direction", "confidence"],
      };
      const result = guardrails.checkResponseSemantic(response, pattern);

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.similarityScore).toBe(1);
    });

    it("should fail when a required field is missing", () => {
      const response = JSON.stringify({
        symbol: "AAPL",
        confidence: 0.85,
      });
      const pattern: ResponsePattern = {
        requiredFields: ["symbol", "direction", "confidence"],
      };
      const result = guardrails.checkResponseSemantic(response, pattern);

      expect(result.passed).toBe(false);
      const missingIssue = result.issues.find(
        (i) => i.type === "missing_field" && i.field === "direction",
      );
      expect(missingIssue).toBeDefined();
    });

    it("should pass when numeric values are within range", () => {
      const response = JSON.stringify({
        confidence: 0.75,
        positionSize: 3,
      });
      const pattern: ResponsePattern = {
        requiredFields: [],
        numericRanges: {
          confidence: { min: 0, max: 1 },
          positionSize: { min: 0.1, max: 5 },
        },
      };
      const result = guardrails.checkResponseSemantic(response, pattern);

      expect(result.passed).toBe(true);
    });

    it("should fail when numeric value is out of range", () => {
      const response = JSON.stringify({
        confidence: 1.5,
        positionSize: 3,
      });
      const pattern: ResponsePattern = {
        requiredFields: [],
        numericRanges: {
          confidence: { min: 0, max: 1 },
        },
      };
      const result = guardrails.checkResponseSemantic(response, pattern);

      expect(result.passed).toBe(false);
      const rangeIssue = result.issues.find(
        (i) => i.type === "out_of_range" && i.field === "confidence",
      );
      expect(rangeIssue).toBeDefined();
    });

    it("should pass when enum values match allowed set", () => {
      const response = JSON.stringify({
        direction: "long",
        riskLevel: "medium",
      });
      const pattern: ResponsePattern = {
        requiredFields: [],
        enumValues: {
          direction: ["long", "short"],
          riskLevel: ["low", "medium", "high"],
        },
      };
      const result = guardrails.checkResponseSemantic(response, pattern);

      expect(result.passed).toBe(true);
    });

    it("should fail when enum value is not in allowed set", () => {
      const response = JSON.stringify({
        direction: "sideways",
      });
      const pattern: ResponsePattern = {
        requiredFields: [],
        enumValues: {
          direction: ["long", "short"],
        },
      };
      const result = guardrails.checkResponseSemantic(response, pattern);

      expect(result.passed).toBe(false);
      const enumIssue = result.issues.find(
        (i) => i.type === "invalid_enum" && i.field === "direction",
      );
      expect(enumIssue).toBeDefined();
    });

    it("should detect banned patterns in response", () => {
      const response = JSON.stringify({
        analysis: "This is guaranteed profit",
      });
      const pattern: ResponsePattern = {
        requiredFields: [],
        bannedPatterns: ["guaranteed profit", "risk-free"],
      };
      const result = guardrails.checkResponseSemantic(response, pattern);

      expect(result.passed).toBe(false);
      const bannedIssue = result.issues.find(
        (i) => i.type === "banned_pattern",
      );
      expect(bannedIssue).toBeDefined();
    });

    it("should fail when response exceeds maxLength", () => {
      const longResponse = JSON.stringify({ data: "x".repeat(5000) });
      const pattern: ResponsePattern = {
        requiredFields: [],
        maxLength: 100,
      };
      const result = guardrails.checkResponseSemantic(longResponse, pattern);

      expect(result.passed).toBe(false);
      const lengthIssue = result.issues.find((i) => i.type === "too_long");
      expect(lengthIssue).toBeDefined();
    });

    it("should handle non-JSON response gracefully for field checks", () => {
      const pattern: ResponsePattern = {
        requiredFields: ["symbol"],
      };
      const result = guardrails.checkResponseSemantic(
        "Not valid JSON at all",
        pattern,
      );

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should compute proper similarity score with partial matches", () => {
      const response = JSON.stringify({
        symbol: "AAPL",
        // missing direction and confidence
      });
      const pattern: ResponsePattern = {
        requiredFields: ["symbol", "direction", "confidence"],
      };
      const result = guardrails.checkResponseSemantic(response, pattern);

      // 1 out of 3 fields present, so similarity < 1
      expect(result.similarityScore).toBeLessThan(1);
      expect(result.similarityScore).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // STRUCTURAL SIMILARITY (4 tests)
  // ==========================================================================

  describe("computeStructuralSimilarity", () => {
    it("should return 1.0 for identical JSON", () => {
      const json = JSON.stringify({
        symbol: "AAPL",
        direction: "long",
        confidence: 0.85,
      });
      const score = guardrails.computeStructuralSimilarity(json, json);
      expect(score).toBe(1);
    });

    it("should return 0 for unparseable response", () => {
      const score = guardrails.computeStructuralSimilarity(
        "not json at all",
        JSON.stringify({ a: 1 }),
      );
      expect(score).toBe(0);
    });

    it("should return partial score for partial key overlap", () => {
      const response = JSON.stringify({ symbol: "AAPL", extra: "data" });
      const reference = JSON.stringify({
        symbol: "AAPL",
        direction: "long",
      });
      const score = guardrails.computeStructuralSimilarity(
        response,
        reference,
      );

      // Some overlap but not complete
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it("should handle nested objects", () => {
      const response = JSON.stringify({
        trade: { symbol: "AAPL", direction: "long" },
        risk: { score: 0.3 },
      });
      const reference = JSON.stringify({
        trade: { symbol: "AAPL", direction: "long" },
        risk: { score: 0.3 },
      });
      const score = guardrails.computeStructuralSimilarity(
        response,
        reference,
      );
      expect(score).toBe(1);
    });

    it("should return 0 when reference is not parseable", () => {
      const score = guardrails.computeStructuralSimilarity(
        JSON.stringify({ a: 1 }),
        "not json",
      );
      expect(score).toBe(0);
    });

    it("should give lower score for completely different structures", () => {
      const response = JSON.stringify({ alpha: 1, beta: 2 });
      const reference = JSON.stringify({ gamma: 3, delta: 4 });
      const score = guardrails.computeStructuralSimilarity(
        response,
        reference,
      );
      expect(score).toBe(0);
    });
  });

  // ==========================================================================
  // INTEGRATION: validateAgentResponse (4 tests)
  // ==========================================================================

  describe("validateAgentResponse", () => {
    it("should run both canary and semantic checks and return combined result", () => {
      const canary = guardrails.generateCanaryToken("integration-test");

      // Embed the canary token inside the JSON so the response is valid JSON
      // and the canary can be found via string search
      const responseObj = {
        symbol: "AAPL",
        direction: "long",
        confidence: 0.85,
        verification: canary.token,
      };
      const response = JSON.stringify(responseObj);

      const pattern: ResponsePattern = {
        requiredFields: ["symbol", "direction", "confidence"],
        numericRanges: { confidence: { min: 0, max: 1 } },
        enumValues: { direction: ["long", "short"] },
      };

      const result = guardrails.validateAgentResponse(
        response,
        canary,
        pattern,
      );

      expect(result.passed).toBe(true);
      expect(result.canaryResult).toBeDefined();
      expect(result.canaryResult?.passed).toBe(true);
      expect(result.semanticResult).toBeDefined();
      expect(result.semanticResult?.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should return combined failure when both checks fail", () => {
      const canary = guardrails.generateCanaryToken("fail-test");

      // Response missing canary token AND has bad field values
      const response = JSON.stringify({
        symbol: "AAPL",
        confidence: 5.0, // out of range
      });

      const pattern: ResponsePattern = {
        requiredFields: ["symbol", "direction"],
        numericRanges: { confidence: { min: 0, max: 1 } },
      };

      const result = guardrails.validateAgentResponse(
        response,
        canary,
        pattern,
      );

      expect(result.passed).toBe(false);
      expect(result.canaryResult?.passed).toBe(false);
      expect(result.semanticResult?.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(1);
    });

    it("should handle missing canary token gracefully", () => {
      const response = JSON.stringify({
        symbol: "AAPL",
        direction: "long",
      });
      const pattern: ResponsePattern = {
        requiredFields: ["symbol", "direction"],
      };

      const result = guardrails.validateAgentResponse(
        response,
        undefined,
        pattern,
      );

      expect(result.passed).toBe(true);
      expect(result.canaryResult).toBeUndefined();
      expect(result.semanticResult).toBeDefined();
    });

    it("should handle missing pattern gracefully", () => {
      const canary = guardrails.generateCanaryToken("no-pattern-test");
      const response = `Some response with ${canary.token} included.`;

      const result = guardrails.validateAgentResponse(
        response,
        canary,
        undefined,
      );

      expect(result.passed).toBe(true);
      expect(result.canaryResult).toBeDefined();
      expect(result.semanticResult).toBeUndefined();
    });

    it("should pass when no canary and no pattern are provided", () => {
      const result = guardrails.validateAgentResponse("Some response");

      expect(result.passed).toBe(true);
      expect(result.canaryResult).toBeUndefined();
      expect(result.semanticResult).toBeUndefined();
      expect(result.issues).toHaveLength(0);
    });
  });

  // ==========================================================================
  // AUDIT LOGGING FOR NEW FEATURES
  // ==========================================================================

  describe("audit logging for canary and semantic features", () => {
    it("should log canary injection events", () => {
      guardrails.injectCanary("Test prompt");
      const logs = guardrails.getAuditLogs();
      const injectionLog = logs.find((l) => l.action === "canary_injection");
      expect(injectionLog).toBeDefined();
      expect(injectionLog?.approved).toBe(true);
    });

    it("should log canary verification events", () => {
      const canary = guardrails.generateCanaryToken("audit-test");
      guardrails.verifyCanary("response without canary", canary);
      const logs = guardrails.getAuditLogs();
      const verifyLog = logs.find((l) => l.action === "canary_verification");
      expect(verifyLog).toBeDefined();
      expect(verifyLog?.riskLevel).toBe("high");
    });

    it("should log agent response validation events", () => {
      guardrails.validateAgentResponse("test response");
      const logs = guardrails.getAuditLogs();
      const agentLog = logs.find(
        (l) => l.action === "agent_response_validation",
      );
      expect(agentLog).toBeDefined();
    });
  });
});
