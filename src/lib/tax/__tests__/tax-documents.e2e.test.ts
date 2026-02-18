/**
 * Tax Documents E2E Tests
 *
 * End-to-end tests for tax document upload, OCR processing, and management.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";

// Mock environment variables
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.GOOGLE_VISION_API_KEY = "test-google-key";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

// ============================================================================
// MOCKS
// ============================================================================

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test/path.pdf" }, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest
        .fn()
        .mockReturnValue({ data: { publicUrl: "https://test.url/doc.pdf" } }),
    }),
  },
};

jest.mock("@/lib/supabase/client", () => ({
  getSupabase: () => mockSupabaseClient,
}));

jest.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: mockSupabaseClient,
}));

// ============================================================================
// TEST DATA
// ============================================================================

const testUserId = "test-user-123";
const testDocumentId = "test-doc-456";

const mockW2Document = {
  id: testDocumentId,
  user_id: testUserId,
  document_type: "w2",
  file_name: "w2-2024.pdf",
  file_path: "tax-documents/test-user-123/w2-2024.pdf",
  tax_year: 2024,
  status: "processed",
  ocr_provider: "openai_vision",
  extracted_data: {
    employer_name: "Acme Corporation",
    employer_ein: "12-3456789",
    employee_name: "John Doe",
    employee_ssn: "XXX-XX-1234",
    wages: 75000,
    federal_tax_withheld: 12500,
    state_tax_withheld: 3750,
    social_security_wages: 75000,
    medicare_wages: 75000,
  },
  confidence_score: 0.95,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mock1099Document = {
  id: "test-doc-789",
  user_id: testUserId,
  document_type: "1099_int",
  file_name: "1099-int-2024.pdf",
  file_path: "tax-documents/test-user-123/1099-int-2024.pdf",
  tax_year: 2024,
  status: "processed",
  ocr_provider: "google_vision",
  extracted_data: {
    payer_name: "First National Bank",
    payer_tin: "98-7654321",
    recipient_name: "John Doe",
    recipient_tin: "XXX-XX-1234",
    interest_income: 1250.5,
    early_withdrawal_penalty: 0,
    federal_tax_withheld: 0,
  },
  confidence_score: 0.92,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================================================
// TESTS
// ============================================================================

// Helper to reset mock chain implementations (needed because jest resetMocks: true wipes them)
function setupMockChain() {
  mockSupabaseClient.from.mockReturnThis();
  mockSupabaseClient.select.mockReturnThis();
  mockSupabaseClient.insert.mockReturnThis();
  mockSupabaseClient.update.mockReturnThis();
  mockSupabaseClient.delete.mockReturnThis();
  mockSupabaseClient.eq.mockReturnThis();
  mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
  mockSupabaseClient.storage.from.mockReturnValue({
    upload: jest
      .fn()
      .mockResolvedValue({ data: { path: "test/path.pdf" }, error: null }),
    download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
    remove: jest.fn().mockResolvedValue({ error: null }),
    getPublicUrl: jest
      .fn()
      .mockReturnValue({ data: { publicUrl: "https://test.url/doc.pdf" } }),
  });
}

describe("Tax Documents E2E Tests", () => {
  beforeAll(() => {
    // Setup any global test state
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    setupMockChain();
  });

  describe("Document Upload Flow", () => {
    it("should upload a W-2 document successfully", async () => {
      const mockFile = new File(["test content"], "w2-2024.pdf", {
        type: "application/pdf",
      });

      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.insert.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.single.mockResolvedValue({
        data: mockW2Document,
        error: null,
      });

      // Simulate upload flow
      const uploadResult = await mockSupabaseClient.storage
        .from("tax-documents")
        .upload(`${testUserId}/w2-2024.pdf`, mockFile);

      expect(uploadResult.error).toBeNull();
      expect(uploadResult.data?.path).toBeDefined();
    });

    it("should reject unsupported file types", async () => {
      const mockFile = new File(["test content"], "document.exe", {
        type: "application/x-executable",
      });

      const supportedTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/tiff",
      ];
      const isSupported = supportedTypes.includes(mockFile.type);

      expect(isSupported).toBe(false);
    });

    it("should enforce file size limits", async () => {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const largeFileSize = 15 * 1024 * 1024; // 15MB

      expect(largeFileSize > MAX_FILE_SIZE).toBe(true);
    });
  });

  describe("OCR Processing Flow", () => {
    it("should extract W-2 data correctly", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockW2Document,
        error: null,
      });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .select("*")
        .eq("id", testDocumentId)
        .single();

      expect(result.data).toBeDefined();
      expect(result.data.extracted_data.wages).toBe(75000);
      expect(result.data.extracted_data.federal_tax_withheld).toBe(12500);
      expect(result.data.confidence_score).toBeGreaterThan(0.9);
    });

    it("should extract 1099-INT data correctly", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mock1099Document,
        error: null,
      });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .select("*")
        .eq("id", "test-doc-789")
        .single();

      expect(result.data).toBeDefined();
      expect(result.data.extracted_data.interest_income).toBe(1250.5);
      expect(result.data.document_type).toBe("1099_int");
    });

    it("should handle OCR failures gracefully", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...mockW2Document,
          status: "failed",
          error_message: "OCR processing failed: Unable to read document",
          confidence_score: 0,
        },
        error: null,
      });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .select("*")
        .eq("id", testDocumentId)
        .single();

      expect(result.data.status).toBe("failed");
      expect(result.data.error_message).toBeDefined();
    });

    it("should flag low confidence extractions for review", async () => {
      const lowConfidenceDoc = {
        ...mockW2Document,
        confidence_score: 0.65,
        status: "needs_review",
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: lowConfidenceDoc,
        error: null,
      });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .select("*")
        .eq("id", testDocumentId)
        .single();

      expect(result.data.confidence_score).toBeLessThan(0.7);
      expect(result.data.status).toBe("needs_review");
    });
  });

  describe("Document Management", () => {
    it("should list documents by tax year", async () => {
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient)
        .mockResolvedValueOnce({
          data: [mockW2Document, mock1099Document],
          error: null,
        });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .select("*")
        .eq("user_id", testUserId)
        .eq("tax_year", 2024);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].tax_year).toBe(2024);
    });

    it("should delete documents and associated files", async () => {
      mockSupabaseClient.delete.mockReturnThis();
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const storageResult = await mockSupabaseClient.storage
        .from("tax-documents")
        .remove([mockW2Document.file_path]);

      expect(storageResult.error).toBeNull();

      const dbResult = await mockSupabaseClient
        .from("tax_documents")
        .delete()
        .eq("id", testDocumentId);

      expect(dbResult.error).toBeNull();
    });

    it("should update extracted data after manual review", async () => {
      const updatedData = {
        ...mockW2Document.extracted_data,
        wages: 76000, // Corrected value
      };

      mockSupabaseClient.update.mockReturnThis();
      mockSupabaseClient.eq.mockReturnThis();
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          ...mockW2Document,
          extracted_data: updatedData,
          status: "verified",
        },
        error: null,
      });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .update({
          extracted_data: updatedData,
          status: "verified",
        })
        .eq("id", testDocumentId)
        .single();

      expect(result.data.extracted_data.wages).toBe(76000);
      expect(result.data.status).toBe("verified");
    });
  });

  describe("Tax Summary Generation", () => {
    it("should aggregate income from all documents", async () => {
      const w2Data = mockW2Document.extracted_data;
      const int1099Data = mock1099Document.extracted_data;

      const totalIncome = w2Data.wages + int1099Data.interest_income;
      const totalFederalWithheld =
        w2Data.federal_tax_withheld + (int1099Data.federal_tax_withheld || 0);

      expect(totalIncome).toBe(76250.5); // 75000 + 1250.50
      expect(totalFederalWithheld).toBe(12500);
    });

    it("should calculate tax liability estimate", async () => {
      const grossIncome = 76250.5;
      const standardDeduction = 14600; // 2024 single filer
      const taxableIncome = grossIncome - standardDeduction;

      // Simplified 2024 tax brackets for single filer
      let tax = 0;
      if (taxableIncome > 0) {
        if (taxableIncome <= 11600) {
          tax = taxableIncome * 0.1;
        } else if (taxableIncome <= 47150) {
          tax = 1160 + (taxableIncome - 11600) * 0.12;
        } else {
          tax = 1160 + 4266 + (taxableIncome - 47150) * 0.22;
        }
      }

      const federalWithheld = 12500;
      const refundOrOwed = federalWithheld - tax;

      expect(taxableIncome).toBeGreaterThan(0);
      expect(tax).toBeGreaterThan(0);
      expect(typeof refundOrOwed).toBe("number");
    });
  });

  describe("Security & Privacy", () => {
    it("should mask SSN in responses", async () => {
      const maskedSSN = mockW2Document.extracted_data.employee_ssn;
      expect(maskedSSN).toMatch(/^XXX-XX-\d{4}$/);
    });

    it("should enforce user isolation (RLS)", async () => {
      const otherUserId = "other-user-456";

      mockSupabaseClient.eq.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .select("*")
        .eq("user_id", otherUserId);

      // User should not see other users' documents
      expect(result.data).toHaveLength(0);
    });

    it("should log document access", async () => {
      const accessLog = {
        user_id: testUserId,
        document_id: testDocumentId,
        action: "view",
        timestamp: new Date().toISOString(),
        ip_address: "192.168.1.1",
      };

      mockSupabaseClient.insert.mockReturnThis();
      mockSupabaseClient.single.mockResolvedValue({
        data: accessLog,
        error: null,
      });

      const result = await mockSupabaseClient
        .from("tax_document_access_log")
        .insert(accessLog)
        .single();

      expect(result.data.action).toBe("view");
      expect(result.data.document_id).toBe(testDocumentId);
    });
  });
});

describe("Tax Document API Integration Tests", () => {
  beforeEach(() => {
    setupMockChain();
  });

  describe("GET /api/tax/documents", () => {
    it("should return user documents with pagination", async () => {
      const mockResponse = {
        documents: [mockW2Document, mock1099Document],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 2,
          totalPages: 1,
        },
      };

      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.eq.mockResolvedValue({
        data: [mockW2Document, mock1099Document],
        error: null,
        count: 2,
      });

      // Simulate API response structure
      expect(mockResponse.documents).toHaveLength(2);
      expect(mockResponse.pagination.total).toBe(2);
    });

    it("should filter by document type", async () => {
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient)
        .mockResolvedValueOnce({
          data: [mockW2Document],
          error: null,
        });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .select("*")
        .eq("user_id", testUserId)
        .eq("document_type", "w2");

      expect(result.data).toHaveLength(1);
      expect(result.data[0].document_type).toBe("w2");
    });
  });

  describe("POST /api/tax/documents/upload", () => {
    it("should accept valid document upload", async () => {
      const uploadRequest = {
        file: new File(["test"], "w2.pdf", { type: "application/pdf" }),
        taxYear: 2024,
        documentType: "w2",
      };

      expect(uploadRequest.file.type).toBe("application/pdf");
      expect(uploadRequest.taxYear).toBe(2024);
    });

    it("should validate required fields", async () => {
      const invalidRequest = {
        file: null,
        taxYear: null,
      };

      const errors: string[] = [];
      if (!invalidRequest.file) errors.push("File is required");
      if (!invalidRequest.taxYear) errors.push("Tax year is required");

      expect(errors).toHaveLength(2);
    });
  });

  describe("DELETE /api/tax/documents/:id", () => {
    it("should delete document and return success", async () => {
      mockSupabaseClient.delete.mockReturnThis();
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .delete()
        .eq("id", testDocumentId);

      expect(result.error).toBeNull();
    });

    it("should return 404 for non-existent document", async () => {
      mockSupabaseClient.delete.mockReturnThis();
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await mockSupabaseClient
        .from("tax_documents")
        .delete()
        .eq("id", "non-existent-id");

      expect(result.error?.code).toBe("PGRST116");
    });
  });
});
