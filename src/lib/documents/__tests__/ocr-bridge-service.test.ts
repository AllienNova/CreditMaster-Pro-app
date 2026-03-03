/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  ConsolidatedExtractionResult,
  TaxDocumentType,
  FieldConfidence,
} from "../../tax/documents/types";
import type { DocumentInput } from "../../tax/documents/providers/base-provider";

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockInsert = jest.fn();
const mockFrom = jest.fn();
const mockGetSupabase = jest.fn();

jest.mock("../../supabase/client", () => ({
  getSupabase: (...args: any[]) => mockGetSupabase(...args),
}));

// ── TaxDocumentProcessor mock ─────────────────────────────────────────────────
// We use a mock object and pass it via DI (the constructor accepts an optional processor)
// instead of mocking the module, because jest.mock hoisting issues prevent reliable
// mockImplementation of the constructor.

const mockProcessDocument = jest.fn();
const mockProcessor = { processDocument: mockProcessDocument } as any;

// Also mock the module so that the singleton export at module scope doesn't fail
jest.mock("../../tax/documents/TaxDocumentProcessor", () => ({
  TaxDocumentProcessor: jest.fn().mockImplementation(() => ({
    processDocument: jest.fn(),
  })),
}));

// ── Imports after mocks ─────────────────────────────────────────────────────

import {
  OCRBridgeService,
  ocrBridgeService,
  W2Schema,
  Form1099NECSchema,
  Form1099DIVSchema,
  Form1099INTSchema,
  Form1099MISCSchema,
  Form1098Schema,
  Form1098ESchema,
} from "../ocr-bridge-service";
import type {
  OCRBridgeFormType,
  OCRBridgeResult,
} from "../ocr-bridge-service";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeDocumentInput(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    base64Image: "dGVzdC1pbWFnZS1kYXRh",
    mimeType: "image/png",
    fileName: "w2-form.png",
    fileSize: 1024,
    ...overrides,
  };
}

function makeFieldConfidence(
  fieldName: string,
  confidence: number,
  value: unknown = null,
): FieldConfidence {
  return {
    fieldName,
    value,
    confidence,
    source: "openai_vision",
  };
}

function makeOCRResult(
  overrides: Partial<ConsolidatedExtractionResult> = {},
): ConsolidatedExtractionResult {
  return {
    documentId: "ocr-doc-123",
    userId: "user-1",
    fileName: "w2-form.png",
    fileSize: 1024,
    mimeType: "image/png",
    documentType: "w2",
    documentTypeConfidence: 0.95,
    taxYear: 2025,
    extractedData: {
      type: "w2",
      fields: {
        employerEIN: "12-3456789",
        employerName: "Acme Corp",
        employerAddress: "123 Main St",
        employeeSSN: "123-45-6789",
        employeeName: "John Doe",
        employeeAddress: "456 Oak Ave",
        wagesTipsOtherComp: 75000,
        federalIncomeTaxWithheld: 15000,
        socialSecurityWages: 75000,
        socialSecurityTaxWithheld: 4650,
        medicareWagesAndTips: 75000,
        medicareTaxWithheld: 1087.5,
        socialSecurityTips: 0,
        allocatedTips: 0,
        dependentCareBenefits: 0,
        nonqualifiedPlans: 0,
        box12Codes: [],
        statutoryEmployee: false,
        retirementPlan: true,
        thirdPartySickPay: false,
        stateWages: 75000,
        stateIncomeTax: 3750,
        localWages: 0,
        localIncomeTax: 0,
        stateCode: "CA",
        localityName: "",
        taxYear: 2025,
      },
    },
    overallConfidence: 0.92,
    providersUsed: ["openai_vision"],
    providerResults: [
      {
        provider: "openai_vision",
        success: true,
        documentType: "w2",
        documentTypeConfidence: 0.95,
        fields: {
          employerName: "Acme Corp",
          employeeName: "John Doe",
          wagesTipsOtherComp: 75000,
          federalIncomeTaxWithheld: 15000,
          taxYear: 2025,
        },
        fieldConfidences: [
          makeFieldConfidence("employerName", 0.95, "Acme Corp"),
          makeFieldConfidence("employeeName", 0.93, "John Doe"),
          makeFieldConfidence("wagesTipsOtherComp", 0.91, 75000),
          makeFieldConfidence("federalIncomeTaxWithheld", 0.90, 15000),
          makeFieldConfidence("taxYear", 0.98, 2025),
        ],
        processingTimeMs: 2500,
      },
    ],
    consensusFields: ["employerName", "employeeName", "wagesTipsOtherComp"],
    conflictingFields: [],
    status: "extracted",
    requiresReview: false,
    reviewReasons: [],
    validationErrors: [],
    isValid: true,
    processedAt: new Date(),
    totalProcessingTimeMs: 2500,
    ...overrides,
  };
}

function make1099NECResult(
  overrides: Partial<ConsolidatedExtractionResult> = {},
): ConsolidatedExtractionResult {
  return makeOCRResult({
    documentType: "1099_nec",
    extractedData: {
      type: "1099_nec",
      fields: {
        payerName: "Client Inc",
        payerTIN: "98-7654321",
        recipientTIN: "123-45-6789",
        recipientName: "Jane Smith",
        nonemployeeCompensation: 50000,
        payerMadeDirectSalesOf5000OrMore: false,
        federalIncomeTaxWithheld: 0,
        stateCode: "NY",
        statePayerNumber: "12345",
        stateIncome: 50000,
        stateTaxWithheld: 2500,
        taxYear: 2025,
      },
    },
    ...overrides,
  });
}

function make1098Result(
  overrides: Partial<ConsolidatedExtractionResult> = {},
): ConsolidatedExtractionResult {
  return makeOCRResult({
    documentType: "1098",
    extractedData: {
      type: "1098",
      fields: {
        lenderName: "First National Bank",
        lenderTIN: "11-2233445",
        borrowerTIN: "123-45-6789",
        borrowerName: "John Doe",
        mortgageInterestReceived: 12000,
        outstandingMortgagePrincipal: 250000,
        mortgageOriginationDate: "2020-06-15",
        refundOfOverpaidInterest: 0,
        mortgageInsurancePremiums: 1200,
        pointsPaidOnPurchase: 0,
        propertyAddress: "123 Main St, Anytown, USA",
        numberOfProperties: 1,
        acquisitionDate: "2020-06-15",
        propertySecuringMortgage: "Residential",
        taxYear: 2025,
      },
    },
    ...overrides,
  });
}

// ── Reset ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockInsert.mockReturnValue(Promise.resolve({ data: null, error: null }));
  mockFrom.mockReturnValue({ insert: mockInsert });
  mockGetSupabase.mockReturnValue({ from: mockFrom });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("W2Schema", () => {
  it("validates a complete valid W-2", () => {
    const data = {
      employerEIN: "12-3456789",
      employerName: "Acme Corp",
      employeeName: "John Doe",
      wagesTipsOtherComp: 75000,
      federalIncomeTaxWithheld: 15000,
      taxYear: 2025,
    };
    const result = W2Schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects negative wages", () => {
    const data = {
      employerName: "Acme Corp",
      employeeName: "John Doe",
      wagesTipsOtherComp: -1000,
      federalIncomeTaxWithheld: 0,
      taxYear: 2025,
    };
    const result = W2Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid EIN format", () => {
    const data = {
      employerEIN: "123-456-789", // invalid: too many digits/wrong format
      employerName: "Acme Corp",
      employeeName: "John Doe",
      wagesTipsOtherComp: 75000,
      federalIncomeTaxWithheld: 15000,
      taxYear: 2025,
    };
    const result = W2Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects missing employer name", () => {
    const data = {
      employeeName: "John Doe",
      wagesTipsOtherComp: 75000,
      federalIncomeTaxWithheld: 15000,
      taxYear: 2025,
    };
    const result = W2Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects tax year before 2000", () => {
    const data = {
      employerName: "Acme Corp",
      employeeName: "John Doe",
      wagesTipsOtherComp: 75000,
      federalIncomeTaxWithheld: 15000,
      taxYear: 1999,
    };
    const result = W2Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows optional fields to be omitted", () => {
    const data = {
      employerName: "Acme Corp",
      employeeName: "John Doe",
      wagesTipsOtherComp: 50000,
      federalIncomeTaxWithheld: 10000,
      taxYear: 2025,
    };
    const result = W2Schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates box12 codes array", () => {
    const data = {
      employerName: "Acme Corp",
      employeeName: "John Doe",
      wagesTipsOtherComp: 75000,
      federalIncomeTaxWithheld: 15000,
      taxYear: 2025,
      box12Codes: [{ code: "DD", amount: 5000 }],
    };
    const result = W2Schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates state code must be 2 characters", () => {
    const data = {
      employerName: "Acme Corp",
      employeeName: "John Doe",
      wagesTipsOtherComp: 75000,
      federalIncomeTaxWithheld: 15000,
      taxYear: 2025,
      stateCode: "CAL",
    };
    const result = W2Schema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("Form1099NECSchema", () => {
  it("validates a complete valid 1099-NEC", () => {
    const data = {
      payerName: "Client Inc",
      recipientName: "Jane Smith",
      nonemployeeCompensation: 50000,
      taxYear: 2025,
    };
    const result = Form1099NECSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects negative compensation", () => {
    const data = {
      payerName: "Client Inc",
      recipientName: "Jane Smith",
      nonemployeeCompensation: -5000,
      taxYear: 2025,
    };
    const result = Form1099NECSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects missing payer name", () => {
    const data = {
      recipientName: "Jane Smith",
      nonemployeeCompensation: 50000,
      taxYear: 2025,
    };
    const result = Form1099NECSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("Form1099DIVSchema", () => {
  it("validates a complete valid 1099-DIV", () => {
    const data = {
      payerName: "Vanguard",
      recipientName: "Jane Smith",
      ordinaryDividends: 5000,
      qualifiedDividends: 3000,
      taxYear: 2025,
    };
    const result = Form1099DIVSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects negative ordinary dividends", () => {
    const data = {
      payerName: "Vanguard",
      recipientName: "Jane Smith",
      ordinaryDividends: -500,
      taxYear: 2025,
    };
    const result = Form1099DIVSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("Form1099INTSchema", () => {
  it("validates a complete valid 1099-INT", () => {
    const data = {
      payerName: "Bank of America",
      recipientName: "John Doe",
      interestIncome: 1500,
      taxYear: 2025,
    };
    const result = Form1099INTSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects negative interest income", () => {
    const data = {
      payerName: "Bank of America",
      recipientName: "John Doe",
      interestIncome: -100,
      taxYear: 2025,
    };
    const result = Form1099INTSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("Form1099MISCSchema", () => {
  it("validates a complete valid 1099-MISC", () => {
    const data = {
      payerName: "Property LLC",
      recipientName: "John Doe",
      rents: 24000,
      taxYear: 2025,
    };
    const result = Form1099MISCSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("Form1098Schema", () => {
  it("validates a complete valid 1098", () => {
    const data = {
      lenderName: "First National Bank",
      borrowerName: "John Doe",
      mortgageInterestReceived: 12000,
      taxYear: 2025,
    };
    const result = Form1098Schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects negative mortgage interest", () => {
    const data = {
      lenderName: "First National Bank",
      borrowerName: "John Doe",
      mortgageInterestReceived: -500,
      taxYear: 2025,
    };
    const result = Form1098Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects missing borrower name", () => {
    const data = {
      lenderName: "First National Bank",
      mortgageInterestReceived: 12000,
      taxYear: 2025,
    };
    const result = Form1098Schema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("Form1098ESchema", () => {
  it("validates a complete valid 1098-E", () => {
    const data = {
      lenderName: "Sallie Mae",
      borrowerName: "Jane Smith",
      studentLoanInterestReceived: 2500,
      taxYear: 2025,
    };
    const result = Form1098ESchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects negative student loan interest", () => {
    const data = {
      lenderName: "Sallie Mae",
      borrowerName: "Jane Smith",
      studentLoanInterestReceived: -100,
      taxYear: 2025,
    };
    const result = Form1098ESchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// processDocument TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("OCRBridgeService.processDocument", () => {
  let service: OCRBridgeService;

  beforeEach(() => {
    service = new OCRBridgeService(mockProcessor);
  });

  it("returns success for a valid W-2 with high confidence", async () => {
    mockProcessDocument.mockResolvedValueOnce(makeOCRResult());

    const result = await service.processDocument(
      "user-1",
      "doc-123",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("success");
    expect(result.formType).toBe("w2");
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.validationErrors).toBeNull();
    expect(result.manualEntryFields).toBeNull();
    expect(result.extractedData).not.toBeNull();
  });

  it("returns success for a valid 1099-NEC with high confidence", async () => {
    mockProcessDocument.mockResolvedValueOnce(make1099NECResult());

    const result = await service.processDocument(
      "user-1",
      "doc-456",
      "1099_nec",
      makeDocumentInput({ fileName: "1099-nec.png" }),
    );

    expect(result.status).toBe("success");
    expect(result.formType).toBe("1099_nec");
    expect(result.extractedData).not.toBeNull();
  });

  it("returns success for a valid 1098 with high confidence", async () => {
    mockProcessDocument.mockResolvedValueOnce(make1098Result());

    const result = await service.processDocument(
      "user-1",
      "doc-789",
      "1098",
      makeDocumentInput({ fileName: "1098.png" }),
    );

    expect(result.status).toBe("success");
    expect(result.formType).toBe("1098");
  });

  it("returns needs_manual_entry when confidence is below threshold", async () => {
    const lowConfidence = makeOCRResult({ overallConfidence: 0.5 });
    mockProcessDocument.mockResolvedValueOnce(lowConfidence);

    const result = await service.processDocument(
      "user-1",
      "doc-low",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("needs_manual_entry");
    expect(result.manualEntryFields).not.toBeNull();
    expect(result.manualEntryFields!.length).toBeGreaterThan(0);
  });

  it("returns validation_failed when OCR data fails schema validation", async () => {
    const invalidData = makeOCRResult({
      overallConfidence: 0.92,
      extractedData: {
        type: "w2",
        fields: {
          // Missing required employeeName and employerName
          wagesTipsOtherComp: -1000, // negative - invalid
          federalIncomeTaxWithheld: 15000,
          taxYear: 2025,
        },
      } as any,
    });
    mockProcessDocument.mockResolvedValueOnce(invalidData);

    const result = await service.processDocument(
      "user-1",
      "doc-invalid",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("validation_failed");
    expect(result.validationErrors).not.toBeNull();
    expect(result.validationErrors!.length).toBeGreaterThan(0);
  });

  it("returns needs_manual_entry when both validation fails and confidence is low", async () => {
    const invalidLowConf = makeOCRResult({
      overallConfidence: 0.4,
      extractedData: {
        type: "w2",
        fields: {
          wagesTipsOtherComp: -1000,
          federalIncomeTaxWithheld: 15000,
          taxYear: 2025,
        },
      } as any,
    });
    mockProcessDocument.mockResolvedValueOnce(invalidLowConf);

    const result = await service.processDocument(
      "user-1",
      "doc-bad",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("needs_manual_entry");
    expect(result.manualEntryFields).not.toBeNull();
    expect(result.validationErrors).not.toBeNull();
  });

  it("returns ocr_failed when the processor throws", async () => {
    mockProcessDocument.mockRejectedValueOnce(new Error("Provider unavailable"));

    const result = await service.processDocument(
      "user-1",
      "doc-fail",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("ocr_failed");
    expect(result.confidence).toBe(0);
    expect(result.ocrResult).toBeNull();
    expect(result.extractedData).toBeNull();
  });

  it("provides manual entry fields when OCR fails and fallback is enabled", async () => {
    mockProcessDocument.mockRejectedValueOnce(new Error("OCR failure"));

    const result = await service.processDocument(
      "user-1",
      "doc-fail",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("ocr_failed");
    expect(result.manualEntryFields).not.toBeNull();
    expect(result.manualEntryFields!.length).toBeGreaterThan(0);
    // Should contain required W-2 fields
    const fieldNames = result.manualEntryFields!.map((f) => f.fieldName);
    expect(fieldNames).toContain("employerName");
    expect(fieldNames).toContain("employeeName");
    expect(fieldNames).toContain("wagesTipsOtherComp");
    expect(fieldNames).toContain("taxYear");
  });

  it("does not provide manual entry fields when fallback is disabled", async () => {
    const noFallback = new OCRBridgeService(mockProcessor, { enableManualFallback: false });
    mockProcessDocument.mockRejectedValueOnce(new Error("OCR failure"));

    const result = await noFallback.processDocument(
      "user-1",
      "doc-no-fallback",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("ocr_failed");
    expect(result.manualEntryFields).toBeNull();
  });

  it("stores result in Supabase on success", async () => {
    mockProcessDocument.mockResolvedValueOnce(makeOCRResult());

    await service.processDocument(
      "user-1",
      "doc-store",
      "w2",
      makeDocumentInput(),
    );

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.user_id).toBe("user-1");
    expect(insertArg.document_id).toBe("doc-store");
    expect(insertArg.form_type).toBe("w2");
    expect(insertArg.status).toBe("success");
  });

  it("stores result in Supabase on OCR failure with error message", async () => {
    mockProcessDocument.mockRejectedValueOnce(new Error("Provider timeout"));

    await service.processDocument(
      "user-1",
      "doc-err-store",
      "w2",
      makeDocumentInput(),
    );

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.status).toBe("ocr_failed");
    expect(insertArg.error_message).toBe("Provider timeout");
  });

  it("continues even if Supabase storage fails", async () => {
    mockInsert.mockImplementationOnce(() => {
      throw new Error("DB connection lost");
    });
    mockProcessDocument.mockResolvedValueOnce(makeOCRResult());

    const result = await service.processDocument(
      "user-1",
      "doc-db-fail",
      "w2",
      makeDocumentInput(),
    );

    // Should still return the result despite storage failure
    expect(result.status).toBe("success");
    expect(result.documentId).toBe("doc-db-fail");
  });

  it("handles non-Error exceptions from OCR processor", async () => {
    mockProcessDocument.mockRejectedValueOnce("string error");

    const result = await service.processDocument(
      "user-1",
      "doc-string-err",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("ocr_failed");
  });

  it("preserves extracted data even when validation fails", async () => {
    const partialData = makeOCRResult({
      overallConfidence: 0.92,
      extractedData: {
        type: "w2",
        fields: {
          employerName: "Acme Corp",
          // Missing employeeName - required
          wagesTipsOtherComp: 50000,
          federalIncomeTaxWithheld: 10000,
          taxYear: 2025,
        },
      } as any,
    });
    mockProcessDocument.mockResolvedValueOnce(partialData);

    const result = await service.processDocument(
      "user-1",
      "doc-partial",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("validation_failed");
    // extractedData should still contain the raw fields
    expect(result.extractedData).not.toBeNull();
    expect((result.extractedData as any).employerName).toBe("Acme Corp");
  });

  it("includes processedAt timestamp", async () => {
    mockProcessDocument.mockResolvedValueOnce(makeOCRResult());
    const before = new Date();

    const result = await service.processDocument(
      "user-1",
      "doc-time",
      "w2",
      makeDocumentInput(),
    );

    expect(result.processedAt).toBeInstanceOf(Date);
    expect(result.processedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("handles null extractedData fields gracefully", async () => {
    const nullFields = makeOCRResult({
      extractedData: {
        type: "w2",
        fields: {} as any,
      },
    });
    mockProcessDocument.mockResolvedValueOnce(nullFields);

    const result = await service.processDocument(
      "user-1",
      "doc-null-fields",
      "w2",
      makeDocumentInput(),
    );

    // Should fail validation (missing required fields), not crash
    expect(["validation_failed", "needs_manual_entry"]).toContain(result.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// processDocument - FORM TYPE SPECIFIC
// ═══════════════════════════════════════════════════════════════════════════════

describe("OCRBridgeService.processDocument - form types", () => {
  let service: OCRBridgeService;

  beforeEach(() => {
    service = new OCRBridgeService(mockProcessor);
  });

  it("processes 1099-DIV form type", async () => {
    const divResult = makeOCRResult({
      documentType: "1099_div",
      extractedData: {
        type: "1099_div",
        fields: {
          payerName: "Vanguard",
          recipientName: "Jane Smith",
          ordinaryDividends: 5000,
          qualifiedDividends: 3000,
          taxYear: 2025,
        },
      } as any,
    });
    mockProcessDocument.mockResolvedValueOnce(divResult);

    const result = await service.processDocument(
      "user-1",
      "doc-div",
      "1099_div",
      makeDocumentInput(),
    );

    expect(result.status).toBe("success");
    expect(result.formType).toBe("1099_div");
  });

  it("processes 1099-INT form type", async () => {
    const intResult = makeOCRResult({
      documentType: "1099_int",
      extractedData: {
        type: "1099_int",
        fields: {
          payerName: "Bank of America",
          recipientName: "John Doe",
          interestIncome: 1500,
          taxYear: 2025,
        },
      } as any,
    });
    mockProcessDocument.mockResolvedValueOnce(intResult);

    const result = await service.processDocument(
      "user-1",
      "doc-int",
      "1099_int",
      makeDocumentInput(),
    );

    expect(result.status).toBe("success");
    expect(result.formType).toBe("1099_int");
  });

  it("processes 1099-MISC form type", async () => {
    const miscResult = makeOCRResult({
      documentType: "1099_misc",
      extractedData: {
        type: "1099_misc",
        fields: {
          payerName: "Property LLC",
          recipientName: "John Doe",
          rents: 24000,
          taxYear: 2025,
        },
      } as any,
    });
    mockProcessDocument.mockResolvedValueOnce(miscResult);

    const result = await service.processDocument(
      "user-1",
      "doc-misc",
      "1099_misc",
      makeDocumentInput(),
    );

    expect(result.status).toBe("success");
    expect(result.formType).toBe("1099_misc");
  });

  it("processes 1098-E form type", async () => {
    const result1098e = makeOCRResult({
      documentType: "1098_e",
      extractedData: {
        type: "1098_e",
        fields: {
          lenderName: "Sallie Mae",
          borrowerName: "Jane Smith",
          studentLoanInterestReceived: 2500,
          taxYear: 2025,
        },
      } as any,
    });
    mockProcessDocument.mockResolvedValueOnce(result1098e);

    const result = await service.processDocument(
      "user-1",
      "doc-1098e",
      "1098_e",
      makeDocumentInput(),
    );

    expect(result.status).toBe("success");
    expect(result.formType).toBe("1098_e");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL ENTRY FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

describe("OCRBridgeService manual entry fields", () => {
  let service: OCRBridgeService;

  beforeEach(() => {
    service = new OCRBridgeService(mockProcessor);
  });

  it("generates manual entry fields with correct types for W-2", async () => {
    mockProcessDocument.mockResolvedValueOnce(
      makeOCRResult({ overallConfidence: 0.3 }),
    );

    const result = await service.processDocument(
      "user-1",
      "doc-manual",
      "w2",
      makeDocumentInput(),
    );

    expect(result.manualEntryFields).not.toBeNull();
    const fields = result.manualEntryFields!;

    const nameField = fields.find((f) => f.fieldName === "employerName");
    expect(nameField?.expectedType).toBe("string");
    expect(nameField?.required).toBe(true);

    const wagesField = fields.find((f) => f.fieldName === "wagesTipsOtherComp");
    expect(wagesField?.expectedType).toBe("number");

    const yearField = fields.find((f) => f.fieldName === "taxYear");
    expect(yearField?.expectedType).toBe("number");
  });

  it("generates manual entry fields for 1099-NEC", async () => {
    mockProcessDocument.mockResolvedValueOnce(
      make1099NECResult({ overallConfidence: 0.3 }),
    );

    const result = await service.processDocument(
      "user-1",
      "doc-manual-nec",
      "1099_nec",
      makeDocumentInput(),
    );

    expect(result.manualEntryFields).not.toBeNull();
    const fieldNames = result.manualEntryFields!.map((f) => f.fieldName);
    expect(fieldNames).toContain("payerName");
    expect(fieldNames).toContain("recipientName");
    expect(fieldNames).toContain("nonemployeeCompensation");
    expect(fieldNames).toContain("taxYear");
  });

  it("generates manual entry fields for 1098", async () => {
    mockProcessDocument.mockResolvedValueOnce(
      make1098Result({ overallConfidence: 0.3 }),
    );

    const result = await service.processDocument(
      "user-1",
      "doc-manual-1098",
      "1098",
      makeDocumentInput(),
    );

    expect(result.manualEntryFields).not.toBeNull();
    const fieldNames = result.manualEntryFields!.map((f) => f.fieldName);
    expect(fieldNames).toContain("lenderName");
    expect(fieldNames).toContain("borrowerName");
    expect(fieldNames).toContain("mortgageInterestReceived");
    expect(fieldNames).toContain("taxYear");
  });

  it("includes current OCR values in manual entry fields", async () => {
    const ocrResult = makeOCRResult({ overallConfidence: 0.5 });
    mockProcessDocument.mockResolvedValueOnce(ocrResult);

    const result = await service.processDocument(
      "user-1",
      "doc-with-values",
      "w2",
      makeDocumentInput(),
    );

    expect(result.manualEntryFields).not.toBeNull();
    const employerField = result.manualEntryFields!.find(
      (f) => f.fieldName === "employerName",
    );
    expect(employerField?.currentValue).toBe("Acme Corp");
  });

  it("includes human-readable labels", async () => {
    mockProcessDocument.mockResolvedValueOnce(
      makeOCRResult({ overallConfidence: 0.3 }),
    );

    const result = await service.processDocument(
      "user-1",
      "doc-labels",
      "w2",
      makeDocumentInput(),
    );

    expect(result.manualEntryFields).not.toBeNull();
    const wagesField = result.manualEntryFields!.find(
      (f) => f.fieldName === "wagesTipsOtherComp",
    );
    expect(wagesField?.label).toBe("Wages, Tips & Other Compensation (Box 1)");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateManualEntry TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("OCRBridgeService.validateManualEntry", () => {
  let service: OCRBridgeService;

  beforeEach(() => {
    service = new OCRBridgeService(mockProcessor);
  });

  it("validates correct W-2 manual entry", () => {
    const data = {
      employerName: "Acme Corp",
      employeeName: "John Doe",
      wagesTipsOtherComp: 75000,
      federalIncomeTaxWithheld: 15000,
      taxYear: 2025,
    };

    const result = service.validateManualEntry("w2", data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeDefined();
    }
  });

  it("rejects invalid W-2 manual entry", () => {
    const data = {
      // Missing required fields
      wagesTipsOtherComp: -1000,
      taxYear: 2025,
    };

    const result = service.validateManualEntry("w2", data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("validates correct 1099-NEC manual entry", () => {
    const data = {
      payerName: "Client Inc",
      recipientName: "Jane Smith",
      nonemployeeCompensation: 50000,
      taxYear: 2025,
    };

    const result = service.validateManualEntry("1099_nec", data);
    expect(result.success).toBe(true);
  });

  it("validates correct 1098 manual entry", () => {
    const data = {
      lenderName: "First National Bank",
      borrowerName: "John Doe",
      mortgageInterestReceived: 12000,
      taxYear: 2025,
    };

    const result = service.validateManualEntry("1098", data);
    expect(result.success).toBe(true);
  });

  it("validates correct 1099-DIV manual entry", () => {
    const data = {
      payerName: "Vanguard",
      recipientName: "Jane Smith",
      ordinaryDividends: 5000,
      taxYear: 2025,
    };

    const result = service.validateManualEntry("1099_div", data);
    expect(result.success).toBe(true);
  });

  it("validates correct 1099-INT manual entry", () => {
    const data = {
      payerName: "Bank of America",
      recipientName: "John Doe",
      interestIncome: 1500,
      taxYear: 2025,
    };

    const result = service.validateManualEntry("1099_int", data);
    expect(result.success).toBe(true);
  });

  it("validates correct 1098-E manual entry", () => {
    const data = {
      lenderName: "Sallie Mae",
      borrowerName: "Jane Smith",
      studentLoanInterestReceived: 2500,
      taxYear: 2025,
    };

    const result = service.validateManualEntry("1098_e", data);
    expect(result.success).toBe(true);
  });

  it("returns specific field errors for invalid data", () => {
    const data = {
      employerName: "", // empty - invalid
      employeeName: "John Doe",
      wagesTipsOtherComp: -500, // negative - invalid
      federalIncomeTaxWithheld: 15000,
      taxYear: 1990, // too old - invalid
    };

    const result = service.validateManualEntry("w2", data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldPaths = result.errors.map((e) => e.path.join("."));
      expect(fieldPaths).toContain("employerName");
      expect(fieldPaths).toContain("wagesTipsOtherComp");
      expect(fieldPaths).toContain("taxYear");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getSchemaForFormType TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("OCRBridgeService.getSchemaForFormType", () => {
  let service: OCRBridgeService;

  beforeEach(() => {
    service = new OCRBridgeService(mockProcessor);
  });

  it("returns W2Schema for w2", () => {
    const schema = service.getSchemaForFormType("w2");
    expect(schema).toBe(W2Schema);
  });

  it("returns Form1099NECSchema for 1099_nec", () => {
    const schema = service.getSchemaForFormType("1099_nec");
    expect(schema).toBe(Form1099NECSchema);
  });

  it("returns Form1098Schema for 1098", () => {
    const schema = service.getSchemaForFormType("1098");
    expect(schema).toBe(Form1098Schema);
  });

  it("returns Form1099DIVSchema for 1099_div", () => {
    const schema = service.getSchemaForFormType("1099_div");
    expect(schema).toBe(Form1099DIVSchema);
  });

  it("returns Form1099INTSchema for 1099_int", () => {
    const schema = service.getSchemaForFormType("1099_int");
    expect(schema).toBe(Form1099INTSchema);
  });

  it("returns Form1099MISCSchema for 1099_misc", () => {
    const schema = service.getSchemaForFormType("1099_misc");
    expect(schema).toBe(Form1099MISCSchema);
  });

  it("returns Form1098ESchema for 1098_e", () => {
    const schema = service.getSchemaForFormType("1098_e");
    expect(schema).toBe(Form1098ESchema);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// isSupportedFormType TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("OCRBridgeService.isSupportedFormType", () => {
  let service: OCRBridgeService;

  beforeEach(() => {
    service = new OCRBridgeService(mockProcessor);
  });

  it("returns true for supported form types", () => {
    expect(service.isSupportedFormType("w2")).toBe(true);
    expect(service.isSupportedFormType("1099_nec")).toBe(true);
    expect(service.isSupportedFormType("1099_div")).toBe(true);
    expect(service.isSupportedFormType("1099_int")).toBe(true);
    expect(service.isSupportedFormType("1099_misc")).toBe(true);
    expect(service.isSupportedFormType("1098")).toBe(true);
    expect(service.isSupportedFormType("1098_e")).toBe(true);
  });

  it("returns false for unsupported form types", () => {
    expect(service.isSupportedFormType("unknown")).toBe(false);
    expect(service.isSupportedFormType("1099_b")).toBe(false);
    expect(service.isSupportedFormType("1099_r")).toBe(false);
    expect(service.isSupportedFormType("charitable_receipt")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE THRESHOLD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("OCRBridgeService confidence threshold", () => {
  it("defaults to 0.85", () => {
    const service = new OCRBridgeService(mockProcessor);
    expect(service.getConfidenceThreshold()).toBe(0.85);
  });

  it("accepts custom threshold in constructor", () => {
    const service = new OCRBridgeService(mockProcessor, { confidenceThreshold: 0.7 });
    expect(service.getConfidenceThreshold()).toBe(0.7);
  });

  it("allows updating threshold via setConfidenceThreshold", () => {
    const service = new OCRBridgeService(mockProcessor);
    service.setConfidenceThreshold(0.9);
    expect(service.getConfidenceThreshold()).toBe(0.9);
  });

  it("throws for threshold below 0", () => {
    const service = new OCRBridgeService(mockProcessor);
    expect(() => service.setConfidenceThreshold(-0.1)).toThrow(
      "Confidence threshold must be between 0 and 1",
    );
  });

  it("throws for threshold above 1", () => {
    const service = new OCRBridgeService(mockProcessor);
    expect(() => service.setConfidenceThreshold(1.1)).toThrow(
      "Confidence threshold must be between 0 and 1",
    );
  });

  it("uses custom threshold for fallback decision", async () => {
    const service = new OCRBridgeService(mockProcessor, { confidenceThreshold: 0.95 });
    // OCR result at 0.92 is below 0.95 threshold
    mockProcessDocument.mockResolvedValueOnce(makeOCRResult({ overallConfidence: 0.92 }));

    const result = await service.processDocument(
      "user-1",
      "doc-threshold",
      "w2",
      makeDocumentInput(),
    );

    // Should be needs_manual_entry because 0.92 < 0.95
    expect(result.status).toBe("needs_manual_entry");
  });

  it("returns success with lower threshold for same confidence", async () => {
    const service = new OCRBridgeService(mockProcessor, { confidenceThreshold: 0.5 });
    mockProcessDocument.mockResolvedValueOnce(makeOCRResult({ overallConfidence: 0.6 }));

    const result = await service.processDocument(
      "user-1",
      "doc-low-thresh",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("success");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

describe("ocrBridgeService singleton", () => {
  it("is exported and is an instance of OCRBridgeService", () => {
    expect(ocrBridgeService).toBeInstanceOf(OCRBridgeService);
  });

  it("has default confidence threshold of 0.85", () => {
    expect(ocrBridgeService.getConfidenceThreshold()).toBe(0.85);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("OCRBridgeService edge cases", () => {
  let service: OCRBridgeService;

  beforeEach(() => {
    service = new OCRBridgeService(mockProcessor);
  });

  it("handles zero confidence from OCR", async () => {
    mockProcessDocument.mockResolvedValueOnce(
      makeOCRResult({
        overallConfidence: 0,
        extractedData: {
          type: "w2",
          fields: {
            employerName: "Unknown",
            employeeName: "Unknown",
            wagesTipsOtherComp: 0,
            federalIncomeTaxWithheld: 0,
            taxYear: 2025,
          },
        } as any,
      }),
    );

    const result = await service.processDocument(
      "user-1",
      "doc-zero",
      "w2",
      makeDocumentInput(),
    );

    expect(result.confidence).toBe(0);
    expect(result.status).toBe("needs_manual_entry");
  });

  it("handles exactly-at-threshold confidence", async () => {
    mockProcessDocument.mockResolvedValueOnce(
      makeOCRResult({ overallConfidence: 0.85 }),
    );

    const result = await service.processDocument(
      "user-1",
      "doc-exact",
      "w2",
      makeDocumentInput(),
    );

    // 0.85 is NOT below 0.85, so should be success
    expect(result.status).toBe("success");
  });

  it("handles confidence just below threshold", async () => {
    mockProcessDocument.mockResolvedValueOnce(
      makeOCRResult({ overallConfidence: 0.849 }),
    );

    const result = await service.processDocument(
      "user-1",
      "doc-just-below",
      "w2",
      makeDocumentInput(),
    );

    expect(result.status).toBe("needs_manual_entry");
  });

  it("correctly populates documentId in result", async () => {
    mockProcessDocument.mockResolvedValueOnce(makeOCRResult());

    const result = await service.processDocument(
      "user-1",
      "my-custom-doc-id",
      "w2",
      makeDocumentInput(),
    );

    expect(result.documentId).toBe("my-custom-doc-id");
  });

  it("correctly populates formType in result", async () => {
    mockProcessDocument.mockResolvedValueOnce(make1099NECResult());

    const result = await service.processDocument(
      "user-1",
      "doc-ft",
      "1099_nec",
      makeDocumentInput(),
    );

    expect(result.formType).toBe("1099_nec");
  });
});
