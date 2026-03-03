/**
 * Comprehensive unit tests for AIOrchestrator
 *
 * Tests the orchestration layer that combines AIMLService and ModelRouter
 * for multi-model AI workflows (disputes, credit analysis, loan strategy,
 * compliance review, consensus, and quick response).
 */

import { TaskType } from "../model-router";

// ---------------------------------------------------------------------------
// Mock helpers – kept outside so every test can reference them
// ---------------------------------------------------------------------------

const mockChat = jest.fn();
const mockAimlService = { chat: mockChat } as Record<string, unknown>;

const mockGetModel = jest.fn();
const mockGetAllModels = jest.fn();
const mockModelRouter = {
  getModel: mockGetModel,
  getAllModels: mockGetAllModels,
} as Record<string, unknown>;

// ---------------------------------------------------------------------------
// Module mocks – intercept constructors so default-constructed instances
// inside AIOrchestrator resolve to our mocks
// ---------------------------------------------------------------------------

jest.mock("../aiml-service", () => ({
  AIMLService: jest.fn().mockImplementation(() => mockAimlService),
  getAIMLService: jest.fn(() => mockAimlService),
}));

jest.mock("../model-router", () => {
  const actual = jest.requireActual("../model-router");
  return {
    ...actual,
    ModelRouter: jest.fn().mockImplementation(() => mockModelRouter),
    getModelRouter: jest.fn(() => mockModelRouter),
  };
});

// Import AFTER mocks are registered
import {
  AIOrchestrator,
  getAIOrchestrator,
  resetAIOrchestrator,
  DisputeGenerationInput,
  CreditAnalysisInput,
  CreditAnalysisOutput,
  LoanStrategyInput,
  LoanStrategyOutput,
} from "../ai-orchestrator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock chat completion response with the given content string */
function chatResponse(content: string) {
  return {
    id: "chatcmpl-test",
    object: "chat.completion",
    created: Date.now(),
    model: "test-model",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  };
}

/** Minimal valid dispute input */
function makeDisputeInput(overrides?: Partial<DisputeGenerationInput>): DisputeGenerationInput {
  return {
    creditReport: {
      accounts: [
        {
          accountNumber: "1234",
          creditorName: "Test Bank",
          accountType: "credit_card",
          balance: 5000,
          status: "30 days late",
          dateOpened: "2022-01-15",
          lastUpdated: "2025-12-01",
        },
      ],
    },
    disputeReason: "Inaccurate late payment reporting",
    userInfo: {
      name: "Jane Doe",
      address: "123 Main St, Anytown, US 12345",
      accountNumber: "XXXX-1234",
    },
    ...overrides,
  };
}

/** Minimal valid credit analysis input */
function makeCreditAnalysisInput(overrides?: Partial<CreditAnalysisInput>): CreditAnalysisInput {
  return {
    creditReport: {
      accounts: [
        {
          accountNumber: "5678",
          creditorName: "Credit Union",
          balance: 2000,
          status: "current",
        },
      ],
    },
    creditScore: 680,
    goals: ["Improve credit score to 750", "Reduce utilization"],
    ...overrides,
  };
}

/** Minimal valid loan strategy input */
function makeLoanStrategyInput(overrides?: Partial<LoanStrategyInput>): LoanStrategyInput {
  return {
    loanData: {
      totalBalance: 45000,
      interestRate: 5.5,
      loanType: "Direct Subsidized",
      servicer: "FedLoan",
      monthlyPayment: 450,
    },
    financialSituation: {
      income: 55000,
      familySize: 1,
      state: "CA",
      employmentType: "public_sector",
    },
    goals: ["Minimize total cost", "Explore PSLF"],
    ...overrides,
  };
}

/** Sample credit analysis output (valid JSON) */
function sampleCreditAnalysisOutput(): CreditAnalysisOutput {
  return {
    score_factors: ["payment_history", "utilization"],
    negative_items: [
      {
        item: "Late payment on Credit Union account",
        impact: "high",
        disputable: true,
        reason: "May be reporting inaccurately",
      },
    ],
    positive_items: ["No collections", "Long credit history"],
    action_plan: [
      {
        step: 1,
        action: "Dispute late payment",
        timeline: "30 days",
        priority: "high",
      },
    ],
    timeline_estimate: "3-6 months",
    estimated_score_improvement: 50,
  };
}

/** Sample loan strategy output (valid JSON) */
function sampleLoanStrategyOutput(): LoanStrategyOutput {
  return {
    recommended_plan: {
      name: "PAYE",
      description: "Pay As You Earn with PSLF",
      monthly_payment: 280,
      total_cost: 33600,
      forgiveness_eligible: true,
      forgiveness_timeline: "10 years",
    },
    alternative_plans: [
      {
        name: "Standard",
        monthly_payment: 450,
        total_cost: 54000,
        pros: ["Faster payoff"],
        cons: ["Higher monthly payment"],
      },
    ],
    pslf_analysis: {
      eligible: true,
      qualifying_payments: 24,
      remaining_payments: 96,
      estimated_forgiveness_amount: 20000,
    },
    tax_implications: "PSLF forgiveness is not taxable under current law.",
    recommendations: ["Enroll in PAYE", "Submit ECF annually"],
  };
}

/** Sample compliance review output (valid JSON) */
function sampleComplianceOutput() {
  return {
    compliant: true,
    issues: [],
    recommendations: ["Add CFPB complaint reference number"],
    risk_level: "low" as const,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AIOrchestrator", () => {
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    resetAIOrchestrator();

    // Default model router behaviour
    mockGetModel.mockReturnValue("test-model");
    mockGetAllModels.mockReturnValue(["model-a", "model-b", "model-c"]);

    // Instantiate with injected mocks
    orchestrator = new AIOrchestrator(
      mockAimlService as never,
      mockModelRouter as never,
    );
  });

  // -----------------------------------------------------------------------
  // Constructor & singleton
  // -----------------------------------------------------------------------

  describe("constructor and singleton", () => {
    it("should accept injected AIMLService and ModelRouter", () => {
      expect(orchestrator.getAIMLService()).toBe(mockAimlService);
      expect(orchestrator.getModelRouter()).toBe(mockModelRouter);
    });

    it("should create defaults when no arguments provided", () => {
      const o = new AIOrchestrator();
      // The mock constructors should have been invoked
      expect(o.getAIMLService()).toBeDefined();
      expect(o.getModelRouter()).toBeDefined();
    });

    it("getAIOrchestrator should return singleton", () => {
      const a = getAIOrchestrator();
      const b = getAIOrchestrator();
      expect(a).toBe(b);
    });

    it("resetAIOrchestrator should clear singleton", () => {
      const a = getAIOrchestrator();
      resetAIOrchestrator();
      const b = getAIOrchestrator();
      expect(a).not.toBe(b);
    });
  });

  // -----------------------------------------------------------------------
  // generateDispute
  // -----------------------------------------------------------------------

  describe("generateDispute", () => {
    it("should call router.getModel with DISPUTE_GENERATION", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("Dear Sir/Madam, ..."));

      await orchestrator.generateDispute(makeDisputeInput());

      expect(mockGetModel).toHaveBeenCalledWith(TaskType.DISPUTE_GENERATION);
    });

    it("should call aiml.chat with correct model, messages, and options", async () => {
      mockGetModel.mockReturnValue("anthropic/claude-4.5-sonnet");
      mockChat.mockResolvedValueOnce(chatResponse("Dear Sir/Madam, ..."));

      await orchestrator.generateDispute(makeDisputeInput());

      expect(mockChat).toHaveBeenCalledTimes(1);
      const [model, messages, options] = mockChat.mock.calls[0];
      expect(model).toBe("anthropic/claude-4.5-sonnet");
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(options).toEqual({ temperature: 0.7, max_tokens: 2500 });
    });

    it("should return the content from the chat response", async () => {
      const letter = "Dear Experian, I am writing to dispute...";
      mockChat.mockResolvedValueOnce(chatResponse(letter));

      const result = await orchestrator.generateDispute(makeDisputeInput());
      expect(result).toBe(letter);
    });

    it("should return empty string when content is null", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(null as unknown as string));

      const result = await orchestrator.generateDispute(makeDisputeInput());
      expect(result).toBe("");
    });

    it("should include account number in prompt when provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("letter"));
      const input = makeDisputeInput({ userInfo: { name: "A", address: "B", accountNumber: "ACC-99" } });

      await orchestrator.generateDispute(input);

      const userMessage = mockChat.mock.calls[0][1][1].content;
      expect(userMessage).toContain("Account Number: ACC-99");
    });

    it("should omit account number line when not provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("letter"));
      const input = makeDisputeInput();
      delete input.userInfo.accountNumber;

      await orchestrator.generateDispute(input);

      const userMessage = mockChat.mock.calls[0][1][1].content;
      expect(userMessage).not.toContain("Account Number:");
    });

    it("should include additional context when provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("letter"));
      const input = makeDisputeInput({ additionalContext: "I was hospitalized during this period." });

      await orchestrator.generateDispute(input);

      const userMessage = mockChat.mock.calls[0][1][1].content;
      expect(userMessage).toContain("I was hospitalized during this period.");
    });

    it("should omit additional context section when not provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("letter"));

      await orchestrator.generateDispute(makeDisputeInput());

      const userMessage = mockChat.mock.calls[0][1][1].content;
      expect(userMessage).not.toContain("Additional Context:");
    });

    it("should propagate errors from aiml.chat", async () => {
      mockChat.mockRejectedValueOnce(new Error("Network failure"));

      await expect(orchestrator.generateDispute(makeDisputeInput())).rejects.toThrow("Network failure");
    });
  });

  // -----------------------------------------------------------------------
  // analyzeCreditReport
  // -----------------------------------------------------------------------

  describe("analyzeCreditReport", () => {
    it("should call router.getModel with CREDIT_ANALYSIS", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleCreditAnalysisOutput())));

      await orchestrator.analyzeCreditReport(makeCreditAnalysisInput());

      expect(mockGetModel).toHaveBeenCalledWith(TaskType.CREDIT_ANALYSIS);
    });

    it("should parse raw JSON response", async () => {
      const output = sampleCreditAnalysisOutput();
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(output)));

      const result = await orchestrator.analyzeCreditReport(makeCreditAnalysisInput());
      expect(result).toEqual(output);
    });

    it("should parse JSON wrapped in markdown code block", async () => {
      const output = sampleCreditAnalysisOutput();
      const wrapped = "```json\n" + JSON.stringify(output) + "\n```";
      mockChat.mockResolvedValueOnce(chatResponse(wrapped));

      const result = await orchestrator.analyzeCreditReport(makeCreditAnalysisInput());
      expect(result).toEqual(output);
    });

    it("should parse JSON embedded in surrounding text", async () => {
      const output = sampleCreditAnalysisOutput();
      const text = "Here is the analysis:\n" + JSON.stringify(output) + "\nEnd.";
      mockChat.mockResolvedValueOnce(chatResponse(text));

      const result = await orchestrator.analyzeCreditReport(makeCreditAnalysisInput());
      expect(result).toEqual(output);
    });

    it("should throw on unparseable response", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("This is not JSON at all, no braces here."));

      await expect(orchestrator.analyzeCreditReport(makeCreditAnalysisInput())).rejects.toThrow(
        "Failed to parse credit analysis response",
      );
    });

    it("should use temperature 0.3 for analysis", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleCreditAnalysisOutput())));

      await orchestrator.analyzeCreditReport(makeCreditAnalysisInput());

      expect(mockChat.mock.calls[0][2]).toEqual({ temperature: 0.3, max_tokens: 3000 });
    });

    it("should include credit score in prompt when provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleCreditAnalysisOutput())));

      await orchestrator.analyzeCreditReport(makeCreditAnalysisInput({ creditScore: 720 }));

      const userMessage = mockChat.mock.calls[0][1][1].content;
      expect(userMessage).toContain("720");
    });

    it("should include goals in prompt when provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleCreditAnalysisOutput())));

      await orchestrator.analyzeCreditReport(
        makeCreditAnalysisInput({ goals: ["Buy a house", "Reduce debt"] }),
      );

      const userMessage = mockChat.mock.calls[0][1][1].content;
      expect(userMessage).toContain("Buy a house");
      expect(userMessage).toContain("Reduce debt");
    });

    it("should work without optional fields", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleCreditAnalysisOutput())));

      const input: CreditAnalysisInput = {
        creditReport: { accounts: [] },
      };

      const result = await orchestrator.analyzeCreditReport(input);
      expect(result).toEqual(sampleCreditAnalysisOutput());
    });

    it("should propagate aiml.chat errors", async () => {
      mockChat.mockRejectedValueOnce(new Error("AIML chat failed: timeout"));

      await expect(orchestrator.analyzeCreditReport(makeCreditAnalysisInput())).rejects.toThrow(
        "AIML chat failed: timeout",
      );
    });
  });

  // -----------------------------------------------------------------------
  // generateLoanStrategy
  // -----------------------------------------------------------------------

  describe("generateLoanStrategy", () => {
    it("should call router.getModel with STUDENT_LOAN_STRATEGY", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleLoanStrategyOutput())));

      await orchestrator.generateLoanStrategy(makeLoanStrategyInput());

      expect(mockGetModel).toHaveBeenCalledWith(TaskType.STUDENT_LOAN_STRATEGY);
    });

    it("should parse raw JSON response", async () => {
      const output = sampleLoanStrategyOutput();
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(output)));

      const result = await orchestrator.generateLoanStrategy(makeLoanStrategyInput());
      expect(result).toEqual(output);
    });

    it("should parse JSON wrapped in markdown code block", async () => {
      const output = sampleLoanStrategyOutput();
      const wrapped = "```json\n" + JSON.stringify(output) + "\n```";
      mockChat.mockResolvedValueOnce(chatResponse(wrapped));

      const result = await orchestrator.generateLoanStrategy(makeLoanStrategyInput());
      expect(result).toEqual(output);
    });

    it("should throw on unparseable response", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("No valid json content here without braces"));

      await expect(orchestrator.generateLoanStrategy(makeLoanStrategyInput())).rejects.toThrow(
        "Failed to parse loan strategy response",
      );
    });

    it("should use temperature 0.2 and max_tokens 4000", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleLoanStrategyOutput())));

      await orchestrator.generateLoanStrategy(makeLoanStrategyInput());

      expect(mockChat.mock.calls[0][2]).toEqual({ temperature: 0.2, max_tokens: 4000 });
    });

    it("should include goals in prompt when provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleLoanStrategyOutput())));

      await orchestrator.generateLoanStrategy(
        makeLoanStrategyInput({ goals: ["Pay off in 5 years"] }),
      );

      const userMessage = mockChat.mock.calls[0][1][1].content;
      expect(userMessage).toContain("Pay off in 5 years");
    });

    it("should work without goals", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleLoanStrategyOutput())));

      const input = makeLoanStrategyInput();
      delete input.goals;

      const result = await orchestrator.generateLoanStrategy(input);
      expect(result).toEqual(sampleLoanStrategyOutput());
    });

    it("should propagate aiml.chat errors", async () => {
      mockChat.mockRejectedValueOnce(new Error("Service unavailable"));

      await expect(orchestrator.generateLoanStrategy(makeLoanStrategyInput())).rejects.toThrow(
        "Service unavailable",
      );
    });
  });

  // -----------------------------------------------------------------------
  // reviewCompliance
  // -----------------------------------------------------------------------

  describe("reviewCompliance", () => {
    const sampleContent = "Dear Bureau, Please investigate...";
    const contentType = "dispute_letter";

    it("should call router.getModel with LEGAL_COMPLIANCE", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleComplianceOutput())));

      await orchestrator.reviewCompliance(sampleContent, contentType);

      expect(mockGetModel).toHaveBeenCalledWith(TaskType.LEGAL_COMPLIANCE);
    });

    it("should parse raw JSON compliance response", async () => {
      const output = sampleComplianceOutput();
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(output)));

      const result = await orchestrator.reviewCompliance(sampleContent, contentType);
      expect(result).toEqual(output);
    });

    it("should parse JSON wrapped in markdown code block", async () => {
      const output = sampleComplianceOutput();
      const wrapped = "```json\n" + JSON.stringify(output) + "\n```";
      mockChat.mockResolvedValueOnce(chatResponse(wrapped));

      const result = await orchestrator.reviewCompliance(sampleContent, contentType);
      expect(result).toEqual(output);
    });

    it("should throw on unparseable response", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("No valid json here without braces"));

      await expect(orchestrator.reviewCompliance(sampleContent, contentType)).rejects.toThrow(
        "Failed to parse compliance review response",
      );
    });

    it("should use temperature 0.2 and max_tokens 1500", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleComplianceOutput())));

      await orchestrator.reviewCompliance(sampleContent, contentType);

      expect(mockChat.mock.calls[0][2]).toEqual({ temperature: 0.2, max_tokens: 1500 });
    });

    it("should include content type in prompt", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(sampleComplianceOutput())));

      await orchestrator.reviewCompliance(sampleContent, "financial_advice");

      const userMessage = mockChat.mock.calls[0][1][1].content;
      expect(userMessage).toContain("financial_advice");
    });

    it("should handle non-compliant response", async () => {
      const output = {
        compliant: false,
        issues: ["Missing FCRA citation", "Threatening language"],
        recommendations: ["Add Section 609 reference", "Soften tone"],
        risk_level: "high" as const,
      };
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(output)));

      const result = await orchestrator.reviewCompliance(sampleContent, contentType);
      expect(result.compliant).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.risk_level).toBe("high");
    });
  });

  // -----------------------------------------------------------------------
  // getConsensus
  // -----------------------------------------------------------------------

  describe("getConsensus", () => {
    it("should throw if fewer than 2 models available", async () => {
      mockGetAllModels.mockReturnValue(["only-one-model"]);

      await expect(
        orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "Analyze my credit"),
      ).rejects.toThrow("Consensus requires at least 2 models");
    });

    it("should throw if zero models available", async () => {
      mockGetAllModels.mockReturnValue([]);

      await expect(
        orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "Analyze my credit"),
      ).rejects.toThrow("Consensus requires at least 2 models, but only 0 available");
    });

    it("should call aiml.chat for each model plus meta-model", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("Response from model A with credit analysis details"))
        .mockResolvedValueOnce(chatResponse("Response from model B with credit analysis details"))
        .mockResolvedValueOnce(chatResponse("Synthesized consensus response"));

      await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "Analyze my credit");

      // 2 model calls + 1 synthesis call = 3
      expect(mockChat).toHaveBeenCalledTimes(3);
    });

    it("should use openai/gpt-5-pro as meta-model for synthesis", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("A"))
        .mockResolvedValueOnce(chatResponse("B"))
        .mockResolvedValueOnce(chatResponse("Synthesis"));

      await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt");

      // Third call should use meta-model
      expect(mockChat.mock.calls[2][0]).toBe("openai/gpt-5-pro");
    });

    it("should return consensus result with correct structure", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("Response A with some unique credit insights"))
        .mockResolvedValueOnce(chatResponse("Response B with some unique credit insights"))
        .mockResolvedValueOnce(chatResponse("Synthesized answer"));

      const result = await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt");

      expect(result).toHaveProperty("consensus");
      expect(result).toHaveProperty("individual_responses");
      expect(result).toHaveProperty("models_used");
      expect(result).toHaveProperty("confidence_score");
      expect(result.consensus).toBe("Synthesized answer");
      expect(result.models_used).toEqual(["model-a", "model-b"]);
      expect(result.individual_responses).toHaveLength(2);
    });

    it("should handle partial model failures gracefully", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b", "model-c"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("Good response from model A"))
        .mockRejectedValueOnce(new Error("model-b failed"))
        .mockResolvedValueOnce(chatResponse("Good response from model C"))
        // Synthesis call
        .mockResolvedValueOnce(chatResponse("Synthesized from A and C"));

      const result = await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt");

      // Only successful models should appear
      expect(result.models_used).toEqual(["model-a", "model-c"]);
      expect(result.individual_responses).toHaveLength(2);
    });

    it("should throw when ALL models fail", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      mockChat
        .mockRejectedValueOnce(new Error("fail-a"))
        .mockRejectedValueOnce(new Error("fail-b"));

      await expect(
        orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt"),
      ).rejects.toThrow("All models failed to generate responses");
    });

    it("should calculate confidence score between 0 and 1", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("The credit score factors include payment history and utilization ratio"))
        .mockResolvedValueOnce(chatResponse("Credit score depends on payment history and credit utilization"))
        .mockResolvedValueOnce(chatResponse("Synthesis"));

      const result = await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt");

      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
    });

    it("should have higher confidence for similar responses", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      // Very similar responses
      mockChat
        .mockResolvedValueOnce(chatResponse("Your credit score is affected by payment history utilization and length of credit history"))
        .mockResolvedValueOnce(chatResponse("Your credit score is affected by payment history utilization and length of credit history"))
        .mockResolvedValueOnce(chatResponse("Synthesis"));

      const similarResult = await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "p1");

      jest.clearAllMocks();
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      // Very different responses
      mockChat
        .mockResolvedValueOnce(chatResponse("alpha beta gamma delta epsilon zeta"))
        .mockResolvedValueOnce(chatResponse("one two three four five six seven eight nine ten"))
        .mockResolvedValueOnce(chatResponse("Synthesis"));

      const differentResult = await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "p2");

      expect(similarResult.confidence_score).toBeGreaterThan(differentResult.confidence_score);
    });

    it("should pass chat options to individual model calls", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("A"))
        .mockResolvedValueOnce(chatResponse("B"))
        .mockResolvedValueOnce(chatResponse("Synthesis"));

      const opts = { temperature: 0.5, max_tokens: 1000 };
      await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt", opts);

      // Individual model calls should receive the user-specified options
      expect(mockChat.mock.calls[0][2]).toEqual(opts);
      expect(mockChat.mock.calls[1][2]).toEqual(opts);
    });

    it("should use temperature 0.3 for synthesis call", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("A"))
        .mockResolvedValueOnce(chatResponse("B"))
        .mockResolvedValueOnce(chatResponse("Synthesis"));

      await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt", { temperature: 0.8 });

      // Synthesis call should override temperature to 0.3
      expect(mockChat.mock.calls[2][2]).toEqual(
        expect.objectContaining({ temperature: 0.3 }),
      );
    });

    it("should include original prompt in synthesis prompt", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("A"))
        .mockResolvedValueOnce(chatResponse("B"))
        .mockResolvedValueOnce(chatResponse("Synthesis"));

      const originalPrompt = "Analyze my credit report for errors";
      await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, originalPrompt);

      const synthesisMessage = mockChat.mock.calls[2][1][0].content;
      expect(synthesisMessage).toContain(originalPrompt);
    });

    it("should filter out null content responses", async () => {
      mockGetAllModels.mockReturnValue(["model-a", "model-b", "model-c"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("Valid response"))
        .mockResolvedValueOnce({
          choices: [{ index: 0, message: { role: "assistant", content: null }, finish_reason: "stop" }],
        })
        .mockResolvedValueOnce(chatResponse("Another valid response"))
        .mockResolvedValueOnce(chatResponse("Synthesis"));

      const result = await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt");

      // model-b returned null content, should be filtered out
      expect(result.models_used).toEqual(["model-a", "model-c"]);
      expect(result.individual_responses).toHaveLength(2);
    });

    it("should work with exactly 2 models", async () => {
      mockGetAllModels.mockReturnValue(["model-x", "model-y"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("X response"))
        .mockResolvedValueOnce(chatResponse("Y response"))
        .mockResolvedValueOnce(chatResponse("Merged"));

      const result = await orchestrator.getConsensus(TaskType.REASONING, "test");

      expect(result.models_used).toHaveLength(2);
      expect(result.consensus).toBe("Merged");
    });
  });

  // -----------------------------------------------------------------------
  // quickResponse
  // -----------------------------------------------------------------------

  describe("quickResponse", () => {
    it("should call router.getModel with QUICK_RESPONSE", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("Quick answer"));

      await orchestrator.quickResponse("What is APR?");

      expect(mockGetModel).toHaveBeenCalledWith(TaskType.QUICK_RESPONSE);
    });

    it("should return content string", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("APR stands for Annual Percentage Rate."));

      const result = await orchestrator.quickResponse("What is APR?");
      expect(result).toBe("APR stands for Annual Percentage Rate.");
    });

    it("should return empty string when content is null", async () => {
      mockChat.mockResolvedValueOnce(chatResponse(null as unknown as string));

      const result = await orchestrator.quickResponse("Hello");
      expect(result).toBe("");
    });

    it("should include system prompt when provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("answer"));

      await orchestrator.quickResponse("question", "You are a helpful assistant.");

      const messages = mockChat.mock.calls[0][1];
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ role: "system", content: "You are a helpful assistant." });
      expect(messages[1]).toEqual({ role: "user", content: "question" });
    });

    it("should omit system message when system prompt not provided", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("answer"));

      await orchestrator.quickResponse("question");

      const messages = mockChat.mock.calls[0][1];
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: "user", content: "question" });
    });

    it("should use temperature 0.7 and max_tokens 500", async () => {
      mockChat.mockResolvedValueOnce(chatResponse("answer"));

      await orchestrator.quickResponse("test");

      expect(mockChat.mock.calls[0][2]).toEqual({ temperature: 0.7, max_tokens: 500 });
    });

    it("should propagate errors from aiml.chat", async () => {
      mockChat.mockRejectedValueOnce(new Error("Rate limited"));

      await expect(orchestrator.quickResponse("test")).rejects.toThrow("Rate limited");
    });
  });

  // -----------------------------------------------------------------------
  // calculateConfidenceScore (tested indirectly via getConsensus)
  // -----------------------------------------------------------------------

  describe("calculateConfidenceScore (via getConsensus)", () => {
    it("should return 1.0 for identical responses", async () => {
      mockGetAllModels.mockReturnValue(["m1", "m2"]);
      const text = "The exact same response word for word with enough words to pass filter";
      mockChat
        .mockResolvedValueOnce(chatResponse(text))
        .mockResolvedValueOnce(chatResponse(text))
        .mockResolvedValueOnce(chatResponse("synthesis"));

      const result = await orchestrator.getConsensus(TaskType.REASONING, "prompt");
      expect(result.confidence_score).toBe(1.0);
    });

    it("should return value < 1 for different responses", async () => {
      mockGetAllModels.mockReturnValue(["m1", "m2"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("Alpha bravo charlie delta echo foxtrot golf hotel"))
        .mockResolvedValueOnce(chatResponse("India juliet kilo lima mike november oscar papa"))
        .mockResolvedValueOnce(chatResponse("synthesis"));

      const result = await orchestrator.getConsensus(TaskType.REASONING, "prompt");
      expect(result.confidence_score).toBeLessThan(1.0);
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
    });

    it("should handle single successful response (score defaults to no comparison possible)", async () => {
      mockGetAllModels.mockReturnValue(["m1", "m2"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("Only success with enough words for the filter"))
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce(chatResponse("synthesis"));

      const result = await orchestrator.getConsensus(TaskType.REASONING, "prompt");
      // With only 1 response, calculateConfidenceScore returns 1.0
      expect(result.confidence_score).toBe(1.0);
    });

    it("should handle three models and average pairwise similarities", async () => {
      mockGetAllModels.mockReturnValue(["m1", "m2", "m3"]);
      mockChat
        .mockResolvedValueOnce(chatResponse("credit score improvement through payment history management"))
        .mockResolvedValueOnce(chatResponse("credit score improvement through utilization reduction"))
        .mockResolvedValueOnce(chatResponse("credit score improvement through dispute resolution"))
        .mockResolvedValueOnce(chatResponse("synthesis"));

      const result = await orchestrator.getConsensus(TaskType.CREDIT_ANALYSIS, "prompt");

      // Should average 3 pairwise comparisons (m1-m2, m1-m3, m2-m3)
      expect(result.confidence_score).toBeGreaterThan(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // JSON extraction edge cases
  // -----------------------------------------------------------------------

  describe("JSON extraction edge cases", () => {
    it("analyzeCreditReport: should handle JSON with extra whitespace", async () => {
      const output = sampleCreditAnalysisOutput();
      const jsonWithSpaces = "  \n  " + JSON.stringify(output, null, 2) + "  \n  ";
      mockChat.mockResolvedValueOnce(chatResponse(jsonWithSpaces));

      const result = await orchestrator.analyzeCreditReport(makeCreditAnalysisInput());
      expect(result).toEqual(output);
    });

    it("generateLoanStrategy: should handle nested JSON objects", async () => {
      const output = sampleLoanStrategyOutput();
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(output)));

      const result = await orchestrator.generateLoanStrategy(makeLoanStrategyInput());
      expect(result.recommended_plan.name).toBe("PAYE");
      expect(result.pslf_analysis.eligible).toBe(true);
      expect(result.alternative_plans).toHaveLength(1);
    });

    it("reviewCompliance: should handle empty issues array", async () => {
      const output = { compliant: true, issues: [], recommendations: [], risk_level: "low" };
      mockChat.mockResolvedValueOnce(chatResponse(JSON.stringify(output)));

      const result = await orchestrator.reviewCompliance("content", "letter");
      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("analyzeCreditReport: should throw for broken JSON", async () => {
      mockChat.mockResolvedValueOnce(chatResponse('{"score_factors": ['));

      await expect(orchestrator.analyzeCreditReport(makeCreditAnalysisInput())).rejects.toThrow(
        "Failed to parse credit analysis response",
      );
    });

    it("generateLoanStrategy: should throw for broken JSON", async () => {
      mockChat.mockResolvedValueOnce(chatResponse('{"recommended_plan": {'));

      await expect(orchestrator.generateLoanStrategy(makeLoanStrategyInput())).rejects.toThrow(
        "Failed to parse loan strategy response",
      );
    });

    it("reviewCompliance: should throw for broken JSON", async () => {
      mockChat.mockResolvedValueOnce(chatResponse('{"compliant": true, "issues":'));

      await expect(orchestrator.reviewCompliance("c", "t")).rejects.toThrow(
        "Failed to parse compliance review response",
      );
    });
  });

  // -----------------------------------------------------------------------
  // getAIMLService / getModelRouter accessors
  // -----------------------------------------------------------------------

  describe("accessor methods", () => {
    it("getAIMLService should return the injected service", () => {
      expect(orchestrator.getAIMLService()).toBe(mockAimlService);
    });

    it("getModelRouter should return the injected router", () => {
      expect(orchestrator.getModelRouter()).toBe(mockModelRouter);
    });
  });
});
