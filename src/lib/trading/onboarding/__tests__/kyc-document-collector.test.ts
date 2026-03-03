/**
 * KYC Document Collector Tests
 *
 * Tests for document requirements, file validation, upload registration,
 * missing document detection, and document status management.
 */

import { KycDocumentCollector } from "../kyc-document-collector";
import type { FileInfo, KycDocumentType } from "../kyc-document-collector";
import type { SupportedBroker } from "@/lib/trading/brokers/broker-interface";

// ============================================================================
// HELPERS
// ============================================================================

function createFileInfo(overrides?: Partial<FileInfo>): FileInfo {
  return {
    name: "government-id.jpg",
    size: 1024 * 500, // 500 KB
    mimeType: "image/jpeg",
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe("KycDocumentCollector", () => {
  let collector: KycDocumentCollector;

  beforeEach(() => {
    collector = new KycDocumentCollector();
  });

  // ==========================================================================
  // REQUIREMENTS
  // ==========================================================================

  describe("getRequirements", () => {
    it("should return requirements for Alpaca (government_id required)", () => {
      const reqs = collector.getRequirements("alpaca");
      expect(reqs.broker).toBe("alpaca");
      expect(reqs.requiredDocuments).toContain("government_id");
      expect(reqs.maxFileSize).toBe(10 * 1024 * 1024);
      expect(reqs.allowedMimeTypes).toContain("image/jpeg");
      expect(reqs.allowedMimeTypes).toContain("application/pdf");
    });

    it("should return stricter requirements for Interactive Brokers", () => {
      const reqs = collector.getRequirements("interactive_brokers");
      expect(reqs.requiredDocuments).toContain("government_id");
      expect(reqs.requiredDocuments).toContain("proof_of_address");
      expect(reqs.requiredDocuments).toContain("tax_document");
      expect(reqs.maxFileSize).toBe(15 * 1024 * 1024);
      expect(reqs.allowedMimeTypes).toContain("image/tiff");
    });

    it("should return selfie requirement for DriveWealth", () => {
      const reqs = collector.getRequirements("drivewealth");
      expect(reqs.requiredDocuments).toContain("government_id");
      expect(reqs.requiredDocuments).toContain("selfie");
      expect(reqs.maxFileSize).toBe(5 * 1024 * 1024);
    });

    it("should return no required documents for paper broker", () => {
      const reqs = collector.getRequirements("paper");
      expect(reqs.requiredDocuments).toHaveLength(0);
      expect(reqs.optionalDocuments).toHaveLength(0);
    });

    it("should return Schwab requirements with proof_of_address", () => {
      const reqs = collector.getRequirements("schwab");
      expect(reqs.requiredDocuments).toContain("government_id");
      expect(reqs.requiredDocuments).toContain("proof_of_address");
    });

    it("should return copies of arrays (not references)", () => {
      const reqs1 = collector.getRequirements("alpaca");
      const reqs2 = collector.getRequirements("alpaca");
      expect(reqs1.requiredDocuments).not.toBe(reqs2.requiredDocuments);
      expect(reqs1.requiredDocuments).toEqual(reqs2.requiredDocuments);
    });
  });

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  describe("validateDocument", () => {
    it("should accept a valid file", () => {
      const result = collector.validateDocument(createFileInfo(), "alpaca");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject files exceeding max size", () => {
      const file = createFileInfo({ size: 20 * 1024 * 1024 }); // 20 MB
      const result = collector.validateDocument(file, "alpaca");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exceeds maximum"))).toBe(
        true,
      );
    });

    it("should use broker-specific max size limits", () => {
      // DriveWealth has 5 MB limit
      const file = createFileInfo({ size: 6 * 1024 * 1024 }); // 6 MB
      const dwResult = collector.validateDocument(file, "drivewealth");
      expect(dwResult.valid).toBe(false);

      // Same file should be fine for Alpaca (10 MB limit)
      const alpacaResult = collector.validateDocument(file, "alpaca");
      expect(alpacaResult.valid).toBe(true);
    });

    it("should reject unsupported MIME types", () => {
      const file = createFileInfo({ mimeType: "application/zip" });
      const result = collector.validateDocument(file, "alpaca");
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("MIME type")),
      ).toBe(true);
    });

    it("should accept TIFF for Interactive Brokers but not Alpaca", () => {
      const file = createFileInfo({ mimeType: "image/tiff" });

      const ibResult = collector.validateDocument(
        file,
        "interactive_brokers",
      );
      expect(ibResult.valid).toBe(true);

      const alpacaResult = collector.validateDocument(file, "alpaca");
      expect(alpacaResult.valid).toBe(false);
    });

    it("should reject empty file name", () => {
      const file = createFileInfo({ name: "" });
      const result = collector.validateDocument(file, "alpaca");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File name is required");
    });

    it("should reject zero or negative file size", () => {
      const file = createFileInfo({ size: 0 });
      const result = collector.validateDocument(file, "alpaca");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File size must be greater than 0");
    });

    it("should reject missing MIME type", () => {
      const file = createFileInfo({ mimeType: "" });
      const result = collector.validateDocument(file, "alpaca");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("MIME type is required");
    });
  });

  // ==========================================================================
  // REGISTRATION & RETRIEVAL
  // ==========================================================================

  describe("registerUpload / getDocuments / getDocumentStatus", () => {
    it("should register a document and return it with an ID", () => {
      const doc = collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
      );
      expect(doc.id).toBeTruthy();
      expect(doc.id).toMatch(/^DOC-/);
      expect(doc.userId).toBe("user-001");
      expect(doc.type).toBe("government_id");
      expect(doc.status).toBe("pending");
      expect(doc.uploadedAt).toBeInstanceOf(Date);
    });

    it("should store and retrieve documents by user", () => {
      collector.registerUpload("user-001", "government_id", createFileInfo());
      collector.registerUpload(
        "user-001",
        "proof_of_address",
        createFileInfo({ name: "utility-bill.pdf", mimeType: "application/pdf" }),
      );

      const docs = collector.getDocuments("user-001");
      expect(docs).toHaveLength(2);
      const types = docs.map((d) => d.type);
      expect(types).toContain("government_id");
      expect(types).toContain("proof_of_address");
    });

    it("should return empty array for unknown user", () => {
      const docs = collector.getDocuments("unknown");
      expect(docs).toHaveLength(0);
    });

    it("should retrieve a specific document by ID", () => {
      const uploaded = collector.registerUpload(
        "user-001",
        "passport",
        createFileInfo({ name: "passport.png", mimeType: "image/png" }),
      );
      const retrieved = collector.getDocumentStatus(uploaded.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(uploaded.id);
      expect(retrieved?.type).toBe("passport");
    });

    it("should return null for unknown document ID", () => {
      const result = collector.getDocumentStatus("DOC-nonexistent");
      expect(result).toBeNull();
    });

    it("should store metadata when provided", () => {
      const doc = collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
        { issuing_state: "NY", expiration: "2030-01-01" },
      );
      expect(doc.metadata).toEqual({
        issuing_state: "NY",
        expiration: "2030-01-01",
      });
    });
  });

  // ==========================================================================
  // MISSING DOCUMENTS
  // ==========================================================================

  describe("getMissingDocuments", () => {
    it("should list all required docs as missing when none uploaded", () => {
      const report = collector.getMissingDocuments("user-001", "alpaca");
      expect(report.broker).toBe("alpaca");
      expect(report.missingRequired).toContain("government_id");
      expect(report.complete).toBe(false);
    });

    it("should show complete when all required docs are uploaded", () => {
      collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
      );
      const report = collector.getMissingDocuments("user-001", "alpaca");
      expect(report.complete).toBe(true);
      expect(report.missingRequired).toHaveLength(0);
    });

    it("should not count rejected documents as present", () => {
      const doc = collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
      );
      collector.updateDocumentStatus(doc.id, "rejected", "Blurry image");

      const report = collector.getMissingDocuments("user-001", "alpaca");
      expect(report.complete).toBe(false);
      expect(report.missingRequired).toContain("government_id");
    });

    it("should not count expired documents as present", () => {
      const doc = collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
      );
      collector.markExpired(doc.id);

      const report = collector.getMissingDocuments("user-001", "alpaca");
      expect(report.complete).toBe(false);
    });

    it("should report paper broker as always complete", () => {
      const report = collector.getMissingDocuments("user-001", "paper");
      expect(report.complete).toBe(true);
      expect(report.missingRequired).toHaveLength(0);
      expect(report.missingOptional).toHaveLength(0);
    });

    it("should track missing optional documents separately", () => {
      collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
      );
      const report = collector.getMissingDocuments("user-001", "alpaca");
      expect(report.missingOptional).toContain("proof_of_address");
      expect(report.missingOptional).toContain("selfie");
    });

    it("should handle IB requirements with multiple required docs", () => {
      // Upload only government_id — still missing proof_of_address and tax_document
      collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
      );
      const report = collector.getMissingDocuments(
        "user-001",
        "interactive_brokers",
      );
      expect(report.complete).toBe(false);
      expect(report.missingRequired).toContain("proof_of_address");
      expect(report.missingRequired).toContain("tax_document");
    });
  });

  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================

  describe("updateDocumentStatus / markExpired", () => {
    it("should update document status", () => {
      const doc = collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
      );
      const updated = collector.updateDocumentStatus(doc.id, "verified");
      expect(updated.status).toBe("verified");
    });

    it("should store rejection reason", () => {
      const doc = collector.registerUpload(
        "user-001",
        "government_id",
        createFileInfo(),
      );
      const updated = collector.updateDocumentStatus(
        doc.id,
        "rejected",
        "Image is unreadable",
      );
      expect(updated.status).toBe("rejected");
      expect(updated.rejectionReason).toBe("Image is unreadable");
    });

    it("should throw for unknown document ID", () => {
      expect(() =>
        collector.updateDocumentStatus("DOC-missing", "verified"),
      ).toThrow('Document "DOC-missing" not found');
    });

    it("should mark a document as expired", () => {
      const doc = collector.registerUpload(
        "user-001",
        "passport",
        createFileInfo(),
      );
      const expired = collector.markExpired(doc.id);
      expect(expired.status).toBe("expired");
    });

    it("should throw when marking non-existent document as expired", () => {
      expect(() => collector.markExpired("DOC-nope")).toThrow(
        'Document "DOC-nope" not found',
      );
    });
  });
});
