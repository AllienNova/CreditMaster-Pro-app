/**
 * TaxDocumentProcessor Unit Tests
 *
 * Comprehensive tests for the Tax Document OCR processing pipeline.
 * Covers W-2, 1099-INT, 1099-DIV, 1099-MISC, 1099-NEC, 1098 forms.
 * Tests field extraction, confidence scoring, manual correction fallback,
 * validation (SSN/EIN format, amount ranges), error handling, and
 * provider fallback chain.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// ============================================================================
// MOCKS — must be declared before imports
// ============================================================================

const mockSupabaseInsert = jest.fn().mockResolvedValue({ data: null, error: null } as never);
const mockSupabaseFrom = jest.fn().mockReturnValue({
  insert: mockSupabaseInsert,
});

jest.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleClient: () => ({
    from: mockSupabaseFrom,
  }),
}));

// Mock the concrete provider modules so they don't import real SDKs
jest.mock("@/lib/tax/documents/providers/openai-vision-provider", () => {
  const { BaseOCRProvider } = jest.requireActual(
    "@/lib/tax/documents/providers/base-provider",
  ) as typeof import("@/lib/tax/documents/providers/base-provider");

  class MockOpenAIVisionProvider extends BaseOCRProvider {
    async isAvailable(): Promise<boolean> {
      return true;
    }
    async classifyDocument() {
      return { documentType: "unknown" as const, confidence: 0 };
    }
    async extractFields() {
      return {
        provider: "openai_vision" as const,
        success: false,
        documentType: "unknown" as const,
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: 0,
      };
    }
  }
  return { OpenAIVisionProvider: MockOpenAIVisionProvider };
});

jest.mock("@/lib/tax/documents/providers/google-vision-provider", () => {
  const { BaseOCRProvider } = jest.requireActual(
    "@/lib/tax/documents/providers/base-provider",
  ) as typeof import("@/lib/tax/documents/providers/base-provider");

  class MockGoogleVisionProvider extends BaseOCRProvider {
    async isAvailable(): Promise<boolean> {
      return true;
    }
    async classifyDocument() {
      return { documentType: "unknown" as const, confidence: 0 };
    }
    async extractFields() {
      return {
        provider: "google_vision" as const,
        success: false,
        documentType: "unknown" as const,
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: 0,
      };
    }
  }
  return { GoogleVisionProvider: MockGoogleVisionProvider };
});

jest.mock("@/lib/tax/documents/providers/landing-ai-provider", () => {
  const { BaseOCRProvider } = jest.requireActual(
    "@/lib/tax/documents/providers/base-provider",
  ) as typeof import("@/lib/tax/documents/providers/base-provider");

  class MockLandingAIProvider extends BaseOCRProvider {
    async isAvailable(): Promise<boolean> {
      return true;
    }
    async classifyDocument() {
      return { documentType: "unknown" as const, confidence: 0 };
    }
    async extractFields() {
      return {
        provider: "landing_ai" as const,
        success: false,
        documentType: "unknown" as const,
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: 0,
      };
    }
  }
  return { LandingAIProvider: MockLandingAIProvider };
});

// Now import the processor (after mocks are set up)
import { TaxDocumentProcessor } from "@/lib/tax/documents/TaxDocumentProcessor";
import type {
  OCRProviderConfig,
  ProviderExtractionResult,
  FieldConfidence,
  ConsolidatedExtractionResult,
} from "@/lib/tax/documents/types";
import { BaseOCRProvider, DocumentInput } from "@/lib/tax/documents/providers/base-provider";

// ============================================================================
// HELPERS — Mock provider that we can control in tests
// ============================================================================

class TestOCRProvider extends BaseOCRProvider {
  private available: boolean;
  private classifyResult: { documentType: string; confidence: number; taxYear?: number };
  private extractResult: ProviderExtractionResult;

  constructor(
    config: OCRProviderConfig,
    options: {
      available?: boolean;
      classifyResult?: { documentType: string; confidence: number; taxYear?: number };
      extractResult?: Partial<ProviderExtractionResult>;
    } = {},
  ) {
    super(config);
    this.available = options.available ?? true;
    this.classifyResult = options.classifyResult ?? {
      documentType: "w2",
      confidence: 0.95,
      taxYear: 2025,
    };
    this.extractResult = {
      provider: config.provider,
      success: true,
      documentType: "w2",
      documentTypeConfidence: 0.95,
      fields: {},
      fieldConfidences: [],
      processingTimeMs: 100,
      ...options.extractResult,
    };
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async classifyDocument() {
    return this.classifyResult as ReturnType<BaseOCRProvider["classifyDocument"]> extends Promise<infer R> ? R : never;
  }

  async extractFields(): Promise<ProviderExtractionResult> {
    return this.extractResult;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  setClassifyResult(result: { documentType: string; confidence: number; taxYear?: number }): void {
    this.classifyResult = result;
  }

  setExtractResult(result: Partial<ProviderExtractionResult>): void {
    this.extractResult = { ...this.extractResult, ...result };
  }
}

/**
 * Helper to create a TaxDocumentProcessor with injected test providers.
 * We use the class's constructor with custom configs, then monkey-patch
 * the private `providers` map to inject our controllable test providers.
 */
function createProcessorWithProviders(
  providers: { config: OCRProviderConfig; provider: TestOCRProvider }[],
): TaxDocumentProcessor {
  const configs = providers.map((p) => p.config);
  const processor = new TaxDocumentProcessor(configs);

  // Inject test providers into the private map
  const providerMap = new Map<string, BaseOCRProvider>();
  for (const { config, provider } of providers) {
    providerMap.set(config.provider, provider);
  }
  (processor as unknown as { providers: Map<string, BaseOCRProvider> }).providers = providerMap;

  return processor;
}

function makeDocumentInput(overrides?: Partial<DocumentInput>): DocumentInput {
  return {
    base64Image: "dGVzdA==", // "test" base64 encoded
    mimeType: "application/pdf",
    fileName: "test-document.pdf",
    fileSize: 1024,
    ...overrides,
  };
}

function makeFieldConfidences(
  fields: Record<string, unknown>,
  provider: string,
  confidence = 0.9,
): FieldConfidence[] {
  return Object.entries(fields).map(([fieldName, value]) => ({
    fieldName,
    value,
    confidence,
    source: provider as FieldConfidence["source"],
  }));
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe("TaxDocumentProcessor", () => {
  let defaultConfig: OCRProviderConfig;
  let defaultProvider: TestOCRProvider;
  let processor: TaxDocumentProcessor;
  const testUserId = "test-user-123";

  beforeEach(() => {
    defaultConfig = {
      provider: "openai_vision",
      enabled: true,
      priority: 1,
      timeout: 30000,
      retries: 2,
      supportedDocuments: ["w2", "1099_div", "1099_int", "1099_misc", "1099_nec", "1098", "unknown"],
      costPerPage: 0.01,
    };

    defaultProvider = new TestOCRProvider(defaultConfig);
    processor = createProcessorWithProviders([
      { config: defaultConfig, provider: defaultProvider },
    ]);
  });

  // ========================================================================
  // CONSTRUCTOR AND INITIALIZATION
  // ========================================================================

  describe("Constructor and Initialization", () => {
    it("should initialize with default configs when none provided", () => {
      const proc = new TaxDocumentProcessor();
      expect(proc).toBeDefined();
    });

    it("should initialize with custom configs", () => {
      const customConfig: OCRProviderConfig[] = [
        {
          provider: "openai_vision",
          enabled: true,
          priority: 1,
          timeout: 15000,
          retries: 1,
          supportedDocuments: ["w2"],
          costPerPage: 0.01,
        },
      ];
      const proc = new TaxDocumentProcessor(customConfig);
      expect(proc).toBeDefined();
    });

    it("should skip disabled providers during initialization", () => {
      const configs: OCRProviderConfig[] = [
        {
          provider: "openai_vision",
          enabled: false,
          priority: 1,
          timeout: 30000,
          retries: 2,
          supportedDocuments: ["w2"],
        },
      ];
      const proc = new TaxDocumentProcessor(configs);
      expect(proc).toBeDefined();
    });
  });

  // ========================================================================
  // W-2 PROCESSING
  // ========================================================================

  describe("W-2 Document Processing", () => {
    const w2Fields = {
      employerEIN: "12-3456789",
      employerName: "Acme Corporation",
      employerAddress: "123 Main St, Springfield, IL 62701",
      employeeSSN: "123-45-6789",
      employeeName: "John Doe",
      employeeAddress: "456 Oak Ave, Springfield, IL 62702",
      wagesTipsOtherComp: 75000,
      federalIncomeTaxWithheld: 12500,
      socialSecurityWages: 75000,
      socialSecurityTaxWithheld: 4650,
      medicareWagesAndTips: 75000,
      medicareTaxWithheld: 1087.5,
      stateWages: 75000,
      stateIncomeTax: 3750,
      stateCode: "IL",
      retirementPlan: true,
      taxYear: 2025,
    };

    beforeEach(() => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: w2Fields,
        fieldConfidences: makeFieldConfidences(w2Fields, "openai_vision", 0.92),
      });
      defaultProvider.setClassifyResult({
        documentType: "w2",
        confidence: 0.95,
        taxYear: 2025,
      });
    });

    it("should extract all W-2 fields correctly", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());

      expect(result.documentType).toBe("w2");
      expect(result.extractedData.fields).toMatchObject(
        expect.objectContaining({
          employerEIN: "12-3456789",
          employerName: "Acme Corporation",
          wagesTipsOtherComp: 75000,
          federalIncomeTaxWithheld: 12500,
        }),
      );
    });

    it("should extract employer EIN in XX-XXXXXXX format", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.employerEIN).toMatch(/^\d{2}-\d{7}$/);
    });

    it("should extract employee SSN", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.employeeSSN).toBe("123-45-6789");
    });

    it("should extract wages (Box 1)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.wagesTipsOtherComp).toBe(75000);
    });

    it("should extract federal tax withheld (Box 2)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.federalIncomeTaxWithheld).toBe(12500);
    });

    it("should extract Social Security wages and tax (Boxes 3-4)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.socialSecurityWages).toBe(75000);
      expect(fields.socialSecurityTaxWithheld).toBe(4650);
    });

    it("should extract Medicare wages and tax (Boxes 5-6)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.medicareWagesAndTips).toBe(75000);
      expect(fields.medicareTaxWithheld).toBe(1087.5);
    });

    it("should extract state wages and tax (Boxes 16-17)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.stateWages).toBe(75000);
      expect(fields.stateIncomeTax).toBe(3750);
    });

    it("should extract state code", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.stateCode).toBe("IL");
    });

    it("should extract retirement plan flag (Box 13)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.retirementPlan).toBe(true);
    });

    it("should extract tax year", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.taxYear).toBe(2025);
    });

    it("should validate negative wages as error", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { ...w2Fields, wagesTipsOtherComp: -5000 },
        fieldConfidences: makeFieldConfidences(
          { ...w2Fields, wagesTipsOtherComp: -5000 },
          "openai_vision",
        ),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const wageError = result.validationErrors.find(
        (e) => e.field === "wagesTipsOtherComp",
      );
      expect(wageError).toBeDefined();
      expect(wageError?.severity).toBe("error");
    });

    it("should warn when withholding exceeds wages", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: {
          ...w2Fields,
          wagesTipsOtherComp: 50000,
          federalIncomeTaxWithheld: 60000,
        },
        fieldConfidences: makeFieldConfidences(w2Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const withholdError = result.validationErrors.find(
        (e) => e.field === "federalIncomeTaxWithheld",
      );
      expect(withholdError).toBeDefined();
      expect(withholdError?.severity).toBe("warning");
    });

    it("should warn on invalid EIN format", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { ...w2Fields, employerEIN: "ABCD" },
        fieldConfidences: makeFieldConfidences(w2Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const einError = result.validationErrors.find(
        (e) => e.field === "employerEIN",
      );
      expect(einError).toBeDefined();
      expect(einError?.error).toBe("Invalid EIN format");
    });

    it("should warn on invalid SSN format", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { ...w2Fields, employeeSSN: "1234" },
        fieldConfidences: makeFieldConfidences(w2Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const ssnError = result.validationErrors.find(
        (e) => e.field === "employeeSSN",
      );
      expect(ssnError).toBeDefined();
      expect(ssnError?.error).toBe("Invalid SSN format");
    });

    it("should accept masked SSN format (XXX-XX-1234)", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { ...w2Fields, employeeSSN: "XXX-XX-1234" },
        fieldConfidences: makeFieldConfidences(w2Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const ssnError = result.validationErrors.find(
        (e) => e.field === "employeeSSN",
      );
      expect(ssnError).toBeUndefined();
    });

    it("should accept valid EIN without dash", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { ...w2Fields, employerEIN: "123456789" },
        fieldConfidences: makeFieldConfidences(w2Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const einError = result.validationErrors.find(
        (e) => e.field === "employerEIN",
      );
      expect(einError).toBeUndefined();
    });
  });

  // ========================================================================
  // 1099-INT PROCESSING
  // ========================================================================

  describe("1099-INT Document Processing", () => {
    const int1099Fields = {
      payerName: "First National Bank",
      payerTIN: "98-7654321",
      recipientTIN: "123-45-6789",
      recipientName: "John Doe",
      interestIncome: 1250.50,
      earlyWithdrawalPenalty: 0,
      federalIncomeTaxWithheld: 0,
      taxExemptInterest: 200,
      taxYear: 2025,
    };

    beforeEach(() => {
      defaultProvider.setClassifyResult({
        documentType: "1099_int",
        confidence: 0.93,
        taxYear: 2025,
      });
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_int",
        documentTypeConfidence: 0.93,
        fields: int1099Fields,
        fieldConfidences: makeFieldConfidences(int1099Fields, "openai_vision", 0.91),
      });
    });

    it("should extract 1099-INT fields correctly", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.documentType).toBe("1099_int");
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.interestIncome).toBe(1250.50);
      expect(fields.payerName).toBe("First National Bank");
    });

    it("should extract interest income (Box 1)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.interestIncome).toBe(1250.50);
    });

    it("should extract tax-exempt interest (Box 8)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.taxExemptInterest).toBe(200);
    });

    it("should extract federal tax withheld (Box 4)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.federalIncomeTaxWithheld).toBe(0);
    });

    it("should validate negative interest income as error", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_int",
        documentTypeConfidence: 0.93,
        fields: { ...int1099Fields, interestIncome: -100 },
        fieldConfidences: makeFieldConfidences(int1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find((e) => e.field === "interestIncome");
      expect(err).toBeDefined();
      expect(err?.severity).toBe("error");
    });

    it("should validate negative tax-exempt interest as error", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_int",
        documentTypeConfidence: 0.93,
        fields: { ...int1099Fields, taxExemptInterest: -50 },
        fieldConfidences: makeFieldConfidences(int1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find((e) => e.field === "taxExemptInterest");
      expect(err).toBeDefined();
      expect(err?.severity).toBe("error");
    });

    it("should warn on invalid payer TIN format", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_int",
        documentTypeConfidence: 0.93,
        fields: { ...int1099Fields, payerTIN: "INVALID" },
        fieldConfidences: makeFieldConfidences(int1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find((e) => e.field === "payerTIN");
      expect(err).toBeDefined();
      expect(err?.error).toBe("Invalid payer TIN format");
    });
  });

  // ========================================================================
  // 1099-DIV PROCESSING
  // ========================================================================

  describe("1099-DIV Document Processing", () => {
    const div1099Fields = {
      payerName: "Vanguard Brokerage",
      payerTIN: "23-1234567",
      recipientTIN: "123-45-6789",
      recipientName: "Jane Smith",
      ordinaryDividends: 5000,
      qualifiedDividends: 3000,
      totalCapitalGainDistributions: 1500,
      federalIncomeTaxWithheld: 500,
      foreignTaxPaid: 75,
      taxYear: 2025,
    };

    beforeEach(() => {
      defaultProvider.setClassifyResult({
        documentType: "1099_div",
        confidence: 0.94,
        taxYear: 2025,
      });
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_div",
        documentTypeConfidence: 0.94,
        fields: div1099Fields,
        fieldConfidences: makeFieldConfidences(div1099Fields, "openai_vision", 0.90),
      });
    });

    it("should extract 1099-DIV fields correctly", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.documentType).toBe("1099_div");
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.ordinaryDividends).toBe(5000);
      expect(fields.qualifiedDividends).toBe(3000);
    });

    it("should extract ordinary dividends (Box 1a)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.ordinaryDividends).toBe(5000);
    });

    it("should extract qualified dividends (Box 1b)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.qualifiedDividends).toBe(3000);
    });

    it("should extract capital gain distributions (Box 2a)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.totalCapitalGainDistributions).toBe(1500);
    });

    it("should extract foreign tax paid (Box 7)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.foreignTaxPaid).toBe(75);
    });

    it("should warn when qualified dividends exceed ordinary dividends", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_div",
        documentTypeConfidence: 0.94,
        fields: {
          ...div1099Fields,
          ordinaryDividends: 2000,
          qualifiedDividends: 5000,
        },
        fieldConfidences: makeFieldConfidences(div1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find(
        (e) => e.field === "qualifiedDividends",
      );
      expect(err).toBeDefined();
      expect(err?.severity).toBe("warning");
    });

    it("should pass when qualified dividends equal ordinary dividends", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_div",
        documentTypeConfidence: 0.94,
        fields: {
          ...div1099Fields,
          ordinaryDividends: 3000,
          qualifiedDividends: 3000,
        },
        fieldConfidences: makeFieldConfidences(div1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find(
        (e) => e.field === "qualifiedDividends",
      );
      expect(err).toBeUndefined();
    });
  });

  // ========================================================================
  // 1099-MISC PROCESSING
  // ========================================================================

  describe("1099-MISC Document Processing", () => {
    const misc1099Fields = {
      payerName: "ABC Property LLC",
      payerTIN: "45-6789012",
      recipientTIN: "123-45-6789",
      recipientName: "John Doe",
      rents: 12000,
      royalties: 3000,
      otherIncome: 500,
      federalIncomeTaxWithheld: 0,
      taxYear: 2025,
    };

    beforeEach(() => {
      defaultProvider.setClassifyResult({
        documentType: "1099_misc",
        confidence: 0.92,
        taxYear: 2025,
      });
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_misc",
        documentTypeConfidence: 0.92,
        fields: misc1099Fields,
        fieldConfidences: makeFieldConfidences(misc1099Fields, "openai_vision", 0.88),
      });
    });

    it("should extract 1099-MISC fields correctly", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.documentType).toBe("1099_misc");
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.rents).toBe(12000);
      expect(fields.royalties).toBe(3000);
    });

    it("should extract rents (Box 1)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.rents).toBe(12000);
    });

    it("should extract royalties (Box 2)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.royalties).toBe(3000);
    });

    it("should extract other income (Box 3)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.otherIncome).toBe(500);
    });

    it("should validate negative rents as error", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_misc",
        documentTypeConfidence: 0.92,
        fields: { ...misc1099Fields, rents: -1000 },
        fieldConfidences: makeFieldConfidences(misc1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find((e) => e.field === "rents");
      expect(err).toBeDefined();
      expect(err?.severity).toBe("error");
    });

    it("should validate negative royalties as error", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_misc",
        documentTypeConfidence: 0.92,
        fields: { ...misc1099Fields, royalties: -500 },
        fieldConfidences: makeFieldConfidences(misc1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find((e) => e.field === "royalties");
      expect(err).toBeDefined();
      expect(err?.severity).toBe("error");
    });

    it("should validate negative other income as error", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_misc",
        documentTypeConfidence: 0.92,
        fields: { ...misc1099Fields, otherIncome: -200 },
        fieldConfidences: makeFieldConfidences(misc1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find((e) => e.field === "otherIncome");
      expect(err).toBeDefined();
      expect(err?.severity).toBe("error");
    });

    it("should warn on invalid payer TIN in 1099-MISC", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_misc",
        documentTypeConfidence: 0.92,
        fields: { ...misc1099Fields, payerTIN: "BAD" },
        fieldConfidences: makeFieldConfidences(misc1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find((e) => e.field === "payerTIN");
      expect(err).toBeDefined();
    });
  });

  // ========================================================================
  // 1099-NEC PROCESSING
  // ========================================================================

  describe("1099-NEC Document Processing", () => {
    const nec1099Fields = {
      payerName: "Freelance Corp",
      payerTIN: "56-7890123",
      recipientTIN: "123-45-6789",
      recipientName: "John Doe",
      nonemployeeCompensation: 45000,
      federalIncomeTaxWithheld: 0,
      taxYear: 2025,
    };

    beforeEach(() => {
      defaultProvider.setClassifyResult({
        documentType: "1099_nec",
        confidence: 0.91,
        taxYear: 2025,
      });
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_nec",
        documentTypeConfidence: 0.91,
        fields: nec1099Fields,
        fieldConfidences: makeFieldConfidences(nec1099Fields, "openai_vision", 0.89),
      });
    });

    it("should extract 1099-NEC fields correctly", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.documentType).toBe("1099_nec");
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.nonemployeeCompensation).toBe(45000);
    });

    it("should extract nonemployee compensation (Box 1)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.nonemployeeCompensation).toBe(45000);
    });

    it("should validate negative compensation as error", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_nec",
        documentTypeConfidence: 0.91,
        fields: { ...nec1099Fields, nonemployeeCompensation: -1000 },
        fieldConfidences: makeFieldConfidences(nec1099Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find(
        (e) => e.field === "nonemployeeCompensation",
      );
      expect(err).toBeDefined();
      expect(err?.severity).toBe("error");
    });
  });

  // ========================================================================
  // 1098 PROCESSING
  // ========================================================================

  describe("1098 Document Processing", () => {
    const form1098Fields = {
      lenderName: "Wells Fargo",
      lenderTIN: "94-1347393",
      borrowerTIN: "123-45-6789",
      borrowerName: "John Doe",
      mortgageInterestReceived: 15000,
      outstandingMortgagePrincipal: 350000,
      pointsPaidOnPurchase: 2000,
      mortgageInsurancePremiums: 1200,
      propertyAddress: "789 Maple Dr, Springfield, IL 62703",
      taxYear: 2025,
    };

    beforeEach(() => {
      defaultProvider.setClassifyResult({
        documentType: "1098",
        confidence: 0.96,
        taxYear: 2025,
      });
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1098",
        documentTypeConfidence: 0.96,
        fields: form1098Fields,
        fieldConfidences: makeFieldConfidences(form1098Fields, "openai_vision", 0.93),
      });
    });

    it("should extract 1098 fields correctly", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.documentType).toBe("1098");
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.mortgageInterestReceived).toBe(15000);
      expect(fields.lenderName).toBe("Wells Fargo");
    });

    it("should extract mortgage interest (Box 1)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.mortgageInterestReceived).toBe(15000);
    });

    it("should extract outstanding principal (Box 2)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.outstandingMortgagePrincipal).toBe(350000);
    });

    it("should extract points paid (Box 6)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.pointsPaidOnPurchase).toBe(2000);
    });

    it("should extract mortgage insurance premiums (Box 5)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.mortgageInsurancePremiums).toBe(1200);
    });

    it("should extract property address (Box 7)", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.propertyAddress).toBe("789 Maple Dr, Springfield, IL 62703");
    });

    it("should validate negative mortgage interest as error", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1098",
        documentTypeConfidence: 0.96,
        fields: { ...form1098Fields, mortgageInterestReceived: -500 },
        fieldConfidences: makeFieldConfidences(form1098Fields, "openai_vision"),
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const err = result.validationErrors.find(
        (e) => e.field === "mortgageInterestReceived",
      );
      expect(err).toBeDefined();
      expect(err?.severity).toBe("error");
    });
  });

  // ========================================================================
  // CONFIDENCE SCORING
  // ========================================================================

  describe("Confidence Scoring", () => {
    it("should report high confidence for clear documents", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.95, source: "openai_vision" },
          { fieldName: "taxYear", value: 2025, confidence: 0.98, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.documentTypeConfidence).toBeGreaterThanOrEqual(0.85);
    });

    it("should report low confidence for unclear documents", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "unknown",
        documentTypeConfidence: 0.3,
        fields: {},
        fieldConfidences: [],
      });
      defaultProvider.setClassifyResult({
        documentType: "unknown",
        confidence: 0.3,
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.documentTypeConfidence).toBeLessThan(0.5);
    });

    it("should set overall confidence from field confidences with multi-provider", async () => {
      // With a single provider, consolidateFields returns documentTypeConfidence
      // as overallConfidence. To test field-level averaging, we need two providers
      // (which triggers the multi-provider path in consolidateFields).
      const secondaryConfig: OCRProviderConfig = {
        provider: "google_vision",
        enabled: true,
        priority: 2,
        timeout: 30000,
        retries: 2,
        supportedDocuments: ["w2", "unknown"],
        costPerPage: 0.0015,
      };
      const secondaryProvider = new TestOCRProvider(secondaryConfig);

      // Set low documentTypeConfidence on primary to trigger secondary usage
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.6,
        fields: { field1: "a", field2: "b" },
        fieldConfidences: [
          { fieldName: "field1", value: "a", confidence: 0.85, source: "openai_vision" },
          { fieldName: "field2", value: "b", confidence: 0.75, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.6 });

      secondaryProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.7,
        fields: { field1: "a", field2: "b" },
        fieldConfidences: [
          { fieldName: "field1", value: "a", confidence: 0.85, source: "google_vision" },
          { fieldName: "field2", value: "b", confidence: 0.75, source: "google_vision" },
        ],
      });
      secondaryProvider.setClassifyResult({ documentType: "w2", confidence: 0.7 });

      const multiProcessor = createProcessorWithProviders([
        { config: defaultConfig, provider: defaultProvider },
        { config: secondaryConfig, provider: secondaryProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      // Overall confidence is the average of all field confidences across providers:
      // (0.85 + 0.75 + 0.85 + 0.75) / 4 = 0.8
      expect(result.overallConfidence).toBeCloseTo(0.8, 1);
    });

    it("should use documentTypeConfidence as overall confidence with single provider", async () => {
      // With a single provider, consolidateFields returns documentTypeConfidence
      // as the overallConfidence (not averaged from fieldConfidences).
      // Note: BaseOCRProvider.processDocument() uses classifyResult.confidence
      // as documentTypeConfidence (overriding extractResult's value).
      defaultProvider.setClassifyResult({
        documentType: "w2",
        confidence: 0.88,
        taxYear: 2025,
      });
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.88,
        fields: { wagesTipsOtherComp: 50000 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 50000, confidence: 0.75, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      // Single provider path: overallConfidence = documentTypeConfidence
      expect(result.overallConfidence).toBeCloseTo(0.88, 2);
    });
  });

  // ========================================================================
  // MANUAL CORRECTION FALLBACK (REVIEW REQUIREMENT)
  // ========================================================================

  describe("Manual Correction Fallback", () => {
    it("should require review when document type confidence is low", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.5,
        fields: { wagesTipsOtherComp: 50000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 50000, confidence: 0.9, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.5 });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.requiresReview).toBe(true);
      expect(result.reviewReasons.some((r) => r.includes("document type confidence"))).toBe(true);
    });

    it("should require review when field confidence is low", async () => {
      // With a single provider, overallConfidence = documentTypeConfidence.
      // To trigger "Low field extraction confidence", we need documentTypeConfidence < 0.7
      // (CONFIDENCE_THRESHOLDS.MEDIUM). That value becomes the overallConfidence
      // which is then checked as fieldConfidence in determineReviewRequirement.
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.5,
        fields: { wagesTipsOtherComp: 50000 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 50000, confidence: 0.4, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.5 });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.requiresReview).toBe(true);
      expect(result.reviewReasons.some((r) => r.includes("field extraction confidence"))).toBe(true);
    });

    it("should require review when validation errors exist", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: -5000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: -5000, confidence: 0.9, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.requiresReview).toBe(true);
      expect(result.reviewReasons.some((r) => r.includes("Validation errors"))).toBe(true);
    });

    it("should not require review when all is high confidence and valid", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: 75000, employerEIN: "12-3456789", taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.95, source: "openai_vision" },
          { fieldName: "employerEIN", value: "12-3456789", confidence: 0.95, source: "openai_vision" },
          { fieldName: "taxYear", value: 2025, confidence: 0.98, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.requiresReview).toBe(false);
      expect(result.reviewReasons).toHaveLength(0);
    });

    it("should set status to 'needs_review' when review is required", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.5,
        fields: { taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "taxYear", value: 2025, confidence: 0.9, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.5 });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.status).toBe("needs_review");
    });

    it("should set status to 'failed' when validation errors are present", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "1099_nec",
        documentTypeConfidence: 0.95,
        fields: { nonemployeeCompensation: -5000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "nonemployeeCompensation", value: -5000, confidence: 0.9, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "1099_nec", confidence: 0.95 });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.status).toBe("failed");
    });

    it("should set status to 'extracted' when everything is valid and high confidence", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.95, source: "openai_vision" },
          { fieldName: "taxYear", value: 2025, confidence: 0.99, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.status).toBe("extracted");
    });
  });

  // ========================================================================
  // TAX YEAR EXTRACTION
  // ========================================================================

  describe("Tax Year Extraction", () => {
    it("should extract tax year from consolidated fields", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { taxYear: 2025, wagesTipsOtherComp: 50000 },
        fieldConfidences: [
          { fieldName: "taxYear", value: 2025, confidence: 0.99, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.taxYear).toBe(2025);
    });

    it("should default to current year when no tax year found", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: 50000 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 50000, confidence: 0.9, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.taxYear).toBe(new Date().getFullYear());
    });

    it("should warn on invalid tax year", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { taxYear: 1950, wagesTipsOtherComp: 50000 },
        fieldConfidences: [
          { fieldName: "taxYear", value: 1950, confidence: 0.5, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const yearError = result.validationErrors.find((e) => e.field === "taxYear");
      expect(yearError).toBeDefined();
      expect(yearError?.severity).toBe("warning");
    });
  });

  // ========================================================================
  // MULTI-PROVIDER CONSENSUS
  // ========================================================================

  describe("Multi-Provider Consensus", () => {
    let secondaryConfig: OCRProviderConfig;
    let secondaryProvider: TestOCRProvider;

    beforeEach(() => {
      secondaryConfig = {
        provider: "google_vision",
        enabled: true,
        priority: 2,
        timeout: 30000,
        retries: 2,
        supportedDocuments: ["w2", "1099_div", "1099_int", "1098", "unknown"],
        costPerPage: 0.0015,
      };
      secondaryProvider = new TestOCRProvider(secondaryConfig);
    });

    it("should use only primary provider when confidence is high", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.95, source: "openai_vision" },
        ],
      });

      const multiProcessor = createProcessorWithProviders([
        { config: defaultConfig, provider: defaultProvider },
        { config: secondaryConfig, provider: secondaryProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      expect(result.providersUsed).toContain("openai_vision");
      // With high confidence, should only use primary
      expect(result.providersUsed).toHaveLength(1);
    });

    it("should fall back to secondary providers when primary confidence is low", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.5,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.5, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.5 });

      secondaryProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.8,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.8, source: "google_vision" },
        ],
      });
      secondaryProvider.setClassifyResult({ documentType: "w2", confidence: 0.8 });

      const multiProcessor = createProcessorWithProviders([
        { config: defaultConfig, provider: defaultProvider },
        { config: secondaryConfig, provider: secondaryProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      expect(result.providersUsed.length).toBeGreaterThan(1);
    });

    it("should mark consensus fields when providers agree", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.6,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.8, source: "openai_vision" },
          { fieldName: "taxYear", value: 2025, confidence: 0.9, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.6 });

      secondaryProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.7,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.85, source: "google_vision" },
          { fieldName: "taxYear", value: 2025, confidence: 0.95, source: "google_vision" },
        ],
      });
      secondaryProvider.setClassifyResult({ documentType: "w2", confidence: 0.7 });

      const multiProcessor = createProcessorWithProviders([
        { config: defaultConfig, provider: defaultProvider },
        { config: secondaryConfig, provider: secondaryProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      expect(result.consensusFields).toContain("wagesTipsOtherComp");
      expect(result.consensusFields).toContain("taxYear");
    });

    it("should mark conflicting fields when providers disagree", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.6,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.8, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.6 });

      secondaryProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.7,
        fields: { wagesTipsOtherComp: 76000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 76000, confidence: 0.85, source: "google_vision" },
        ],
      });
      secondaryProvider.setClassifyResult({ documentType: "w2", confidence: 0.7 });

      const multiProcessor = createProcessorWithProviders([
        { config: defaultConfig, provider: defaultProvider },
        { config: secondaryConfig, provider: secondaryProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      expect(result.conflictingFields.length).toBeGreaterThan(0);
      const wageConflict = result.conflictingFields.find(
        (c) => c.fieldName === "wagesTipsOtherComp",
      );
      expect(wageConflict).toBeDefined();
      expect(wageConflict?.resolutionMethod).toBe("highest_confidence");
    });

    it("should resolve conflicts by highest confidence", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.6,
        fields: { wagesTipsOtherComp: 75000 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.7, source: "openai_vision" },
        ],
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.6 });

      secondaryProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.7,
        fields: { wagesTipsOtherComp: 76000 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 76000, confidence: 0.95, source: "google_vision" },
        ],
      });
      secondaryProvider.setClassifyResult({ documentType: "w2", confidence: 0.7 });

      const multiProcessor = createProcessorWithProviders([
        { config: defaultConfig, provider: defaultProvider },
        { config: secondaryConfig, provider: secondaryProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      // Google Vision had higher confidence (0.95 vs 0.7), so its value should be used
      const fields = result.extractedData.fields as Record<string, unknown>;
      expect(fields.wagesTipsOtherComp).toBe(76000);
    });

    it("should require review when many fields conflict", async () => {
      const conflictFields1 = { f1: "a", f2: "b", f3: "c", f4: "d" };
      const conflictFields2 = { f1: "x", f2: "y", f3: "z", f4: "w" };

      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.6,
        fields: conflictFields1,
        fieldConfidences: makeFieldConfidences(conflictFields1, "openai_vision", 0.7),
      });
      defaultProvider.setClassifyResult({ documentType: "w2", confidence: 0.6 });

      secondaryProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.7,
        fields: conflictFields2,
        fieldConfidences: makeFieldConfidences(conflictFields2, "google_vision", 0.8),
      });
      secondaryProvider.setClassifyResult({ documentType: "w2", confidence: 0.7 });

      const multiProcessor = createProcessorWithProviders([
        { config: defaultConfig, provider: defaultProvider },
        { config: secondaryConfig, provider: secondaryProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      expect(result.requiresReview).toBe(true);
      expect(result.reviewReasons.some((r) => r.includes("conflicting fields"))).toBe(true);
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  describe("Error Handling", () => {
    it("should throw when no providers are available", async () => {
      defaultProvider.setAvailable(false);

      await expect(
        processor.processDocument(testUserId, makeDocumentInput()),
      ).rejects.toThrow("No OCR providers available");
    });

    it("should handle provider failure gracefully", async () => {
      // Provider returns a failure result
      defaultProvider.setExtractResult({
        success: false,
        documentType: "unknown",
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: 100,
        errorMessage: "API timeout",
      });
      defaultProvider.setClassifyResult({ documentType: "unknown", confidence: 0 });

      // Override processDocument on the TestOCRProvider to simulate failure
      jest.spyOn(defaultProvider, "processDocument").mockResolvedValue({
        provider: "openai_vision",
        success: false,
        documentType: "unknown",
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: 0,
        errorMessage: "API timeout",
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      // Even when primary fails, the processor should return a result (not throw)
      expect(result).toBeDefined();
      expect(result.overallConfidence).toBe(0);
    });

    it("should handle provider throwing exception", async () => {
      jest.spyOn(defaultProvider, "processDocument").mockRejectedValue(
        new Error("Network error"),
      );

      // The retry logic should catch and return a failure result
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result).toBeDefined();
    });

    it("should return valid result structure even on total failure", async () => {
      jest.spyOn(defaultProvider, "processDocument").mockResolvedValue({
        provider: "openai_vision",
        success: false,
        documentType: "unknown",
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: 0,
        errorMessage: "Complete failure",
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());

      expect(result.documentId).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.fileName).toBe("test-document.pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(typeof result.totalProcessingTimeMs).toBe("number");
      expect(result.providersUsed).toBeDefined();
      expect(result.validationErrors).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
    });

    it("should handle empty fields gracefully", async () => {
      // With a single provider, overallConfidence = documentTypeConfidence
      // regardless of whether fields are empty. This tests graceful handling
      // (no crash), not that confidence is zero.
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: {},
        fieldConfidences: [],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result).toBeDefined();
      // Single-provider path: overallConfidence is documentTypeConfidence
      expect(result.overallConfidence).toBe(0.95);
      // Fields should be empty
      expect(Object.keys(result.extractedData.fields as object)).toHaveLength(0);
    });
  });

  // ========================================================================
  // PROVIDER FALLBACK CHAIN
  // ========================================================================

  describe("Provider Fallback Chain", () => {
    it("should sort providers by priority", async () => {
      const lowPriorityConfig: OCRProviderConfig = {
        provider: "google_vision",
        enabled: true,
        priority: 10,
        timeout: 30000,
        retries: 2,
        supportedDocuments: ["w2"],
      };
      const lowPriorityProvider = new TestOCRProvider(lowPriorityConfig);

      const highPriorityConfig: OCRProviderConfig = {
        provider: "openai_vision",
        enabled: true,
        priority: 1,
        timeout: 30000,
        retries: 2,
        supportedDocuments: ["w2"],
      };
      const highPriorityProvider = new TestOCRProvider(highPriorityConfig, {
        extractResult: {
          success: true,
          documentType: "w2",
          documentTypeConfidence: 0.95,
          fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
          fieldConfidences: [
            { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.95, source: "openai_vision" },
          ],
        },
      });

      const multiProcessor = createProcessorWithProviders([
        { config: lowPriorityConfig, provider: lowPriorityProvider },
        { config: highPriorityConfig, provider: highPriorityProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      // High priority provider should be tried first
      expect(result.providersUsed[0]).toBe("openai_vision");
    });

    it("should skip unavailable providers", async () => {
      const unavailableConfig: OCRProviderConfig = {
        provider: "openai_vision",
        enabled: true,
        priority: 1,
        timeout: 30000,
        retries: 2,
        supportedDocuments: ["w2"],
      };
      const unavailableProvider = new TestOCRProvider(unavailableConfig, {
        available: false,
      });

      const availableConfig: OCRProviderConfig = {
        provider: "google_vision",
        enabled: true,
        priority: 2,
        timeout: 30000,
        retries: 2,
        supportedDocuments: ["w2"],
      };
      const availableProvider = new TestOCRProvider(availableConfig, {
        extractResult: {
          success: true,
          documentType: "w2",
          documentTypeConfidence: 0.9,
          fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
          fieldConfidences: [
            { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.9, source: "google_vision" },
          ],
        },
      });

      const multiProcessor = createProcessorWithProviders([
        { config: unavailableConfig, provider: unavailableProvider },
        { config: availableConfig, provider: availableProvider },
      ]);

      const result = await multiProcessor.processDocument(testUserId, makeDocumentInput());
      expect(result.providersUsed).toContain("google_vision");
      expect(result.providersUsed).not.toContain("openai_vision");
    });
  });

  // ========================================================================
  // VALIDATION — CROSS-CUTTING
  // ========================================================================

  describe("Cross-Cutting Validation", () => {
    it("should warn on future tax year", async () => {
      const futureYear = new Date().getFullYear() + 5;
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { taxYear: futureYear, wagesTipsOtherComp: 50000 },
        fieldConfidences: [
          { fieldName: "taxYear", value: futureYear, confidence: 0.5, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const yearError = result.validationErrors.find((e) => e.field === "taxYear");
      expect(yearError).toBeDefined();
    });

    it("should warn on tax year before 2000", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { taxYear: 1999, wagesTipsOtherComp: 50000 },
        fieldConfidences: [
          { fieldName: "taxYear", value: 1999, confidence: 0.5, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const yearError = result.validationErrors.find((e) => e.field === "taxYear");
      expect(yearError).toBeDefined();
      expect(yearError?.severity).toBe("warning");
    });

    it("should not warn on valid current year", async () => {
      const currentYear = new Date().getFullYear();
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { taxYear: currentYear, wagesTipsOtherComp: 50000 },
        fieldConfidences: [
          { fieldName: "taxYear", value: currentYear, confidence: 0.99, source: "openai_vision" },
          { fieldName: "wagesTipsOtherComp", value: 50000, confidence: 0.95, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const yearError = result.validationErrors.find((e) => e.field === "taxYear");
      expect(yearError).toBeUndefined();
    });

    it("should set isValid to true when no error-severity validation errors", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.95, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.isValid).toBe(true);
    });

    it("should set isValid to false when error-severity validation errors exist", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: -5000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: -5000, confidence: 0.95, source: "openai_vision" },
        ],
      });

      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.isValid).toBe(false);
    });
  });

  // ========================================================================
  // RESULT STRUCTURE
  // ========================================================================

  describe("Result Structure", () => {
    it("should include document ID", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.documentId).toBeDefined();
      expect(typeof result.documentId).toBe("string");
      expect(result.documentId.length).toBeGreaterThan(0);
    });

    it("should include user ID", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result.userId).toBe(testUserId);
    });

    it("should include file metadata", async () => {
      const input = makeDocumentInput({
        fileName: "my-w2.pdf",
        fileSize: 2048,
        mimeType: "application/pdf",
      });
      const result = await processor.processDocument(testUserId, input);
      expect(result.fileName).toBe("my-w2.pdf");
      expect(result.fileSize).toBe(2048);
      expect(result.mimeType).toBe("application/pdf");
    });

    it("should include processing timestamp", async () => {
      const before = new Date();
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      const after = new Date();
      expect(result.processedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.processedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should include total processing time", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(typeof result.totalProcessingTimeMs).toBe("number");
      expect(result.totalProcessingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should include provider results array", async () => {
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(Array.isArray(result.providerResults)).toBe(true);
      expect(result.providerResults.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // AUDIT LOGGING
  // ========================================================================

  describe("Audit Logging", () => {
    beforeEach(() => {
      // Re-establish mock chain since resetMocks: true wipes implementations
      mockSupabaseInsert.mockResolvedValue({ data: null, error: null } as never);
      mockSupabaseFrom.mockReturnValue({ insert: mockSupabaseInsert });
    });

    it("should log processing to supabase", async () => {
      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.95, source: "openai_vision" },
        ],
      });

      await processor.processDocument(testUserId, makeDocumentInput());

      expect(mockSupabaseFrom).toHaveBeenCalledWith("tax_audit_log");
      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    it("should not throw when audit logging fails", async () => {
      mockSupabaseInsert.mockRejectedValue(new Error("DB error") as never);
      mockSupabaseFrom.mockReturnValue({ insert: mockSupabaseInsert });

      defaultProvider.setExtractResult({
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: { wagesTipsOtherComp: 75000, taxYear: 2025 },
        fieldConfidences: [
          { fieldName: "wagesTipsOtherComp", value: 75000, confidence: 0.95, source: "openai_vision" },
        ],
      });

      // Should not throw even if logging fails
      const result = await processor.processDocument(testUserId, makeDocumentInput());
      expect(result).toBeDefined();
    });
  });
});
