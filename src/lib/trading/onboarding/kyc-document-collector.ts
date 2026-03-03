/**
 * KYC Document Collector
 *
 * Manages document requirements, validation, and tracking
 * for broker KYC onboarding. Each broker has different document
 * requirements; this service provides a unified interface.
 *
 * State is managed via in-memory Maps (production would persist to Supabase).
 */

import type { SupportedBroker } from "@/lib/trading/brokers/broker-interface";

// ============================================================================
// TYPES
// ============================================================================

export type KycDocumentType =
  | "government_id"
  | "passport"
  | "drivers_license"
  | "proof_of_address"
  | "tax_document"
  | "bank_statement"
  | "selfie";

export type DocumentStatus = "pending" | "verified" | "rejected" | "expired";

export interface KycDocument {
  id: string;
  userId: string;
  type: KycDocumentType;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  status: DocumentStatus;
  rejectionReason?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface DocumentRequirement {
  broker: SupportedBroker;
  requiredDocuments: KycDocumentType[];
  optionalDocuments: KycDocumentType[];
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
}

export interface DocumentValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FileInfo {
  name: string;
  size: number;
  mimeType: string;
}

export interface MissingDocumentReport {
  broker: SupportedBroker;
  missingRequired: KycDocumentType[];
  missingOptional: KycDocumentType[];
  complete: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default maximum file size: 10 MB */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Commonly accepted image and document MIME types */
const DEFAULT_ALLOWED_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/** Extended MIME types for brokers that accept more formats */
const EXTENDED_ALLOWED_MIME_TYPES: readonly string[] = [
  ...DEFAULT_ALLOWED_MIME_TYPES,
  "image/tiff",
  "image/bmp",
];

/**
 * Document requirements vary by broker.
 * Interactive Brokers and Schwab have stricter requirements.
 */
const BROKER_REQUIREMENTS: Readonly<Record<SupportedBroker, Omit<DocumentRequirement, "broker">>> = {
  alpaca: {
    requiredDocuments: ["government_id"],
    optionalDocuments: ["proof_of_address", "selfie"],
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: [...DEFAULT_ALLOWED_MIME_TYPES],
  },
  interactive_brokers: {
    requiredDocuments: [
      "government_id",
      "proof_of_address",
      "tax_document",
    ],
    optionalDocuments: ["passport", "bank_statement", "selfie"],
    maxFileSize: 15 * 1024 * 1024, // 15 MB
    allowedMimeTypes: [...EXTENDED_ALLOWED_MIME_TYPES],
  },
  schwab: {
    requiredDocuments: ["government_id", "proof_of_address"],
    optionalDocuments: ["tax_document", "bank_statement"],
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: [...DEFAULT_ALLOWED_MIME_TYPES],
  },
  drivewealth: {
    requiredDocuments: ["government_id", "selfie"],
    optionalDocuments: ["proof_of_address"],
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: [...DEFAULT_ALLOWED_MIME_TYPES],
  },
  paper: {
    requiredDocuments: [],
    optionalDocuments: [],
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    allowedMimeTypes: [...DEFAULT_ALLOWED_MIME_TYPES],
  },
};

// ============================================================================
// KYC DOCUMENT COLLECTOR
// ============================================================================

export class KycDocumentCollector {
  /** documentId -> KycDocument */
  private readonly documents: Map<string, KycDocument> = new Map();

  /** userId -> Set<documentId> */
  private readonly userDocuments: Map<string, Set<string>> = new Map();

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Get document requirements for a specific broker.
   */
  getRequirements(broker: SupportedBroker): DocumentRequirement {
    const reqs = BROKER_REQUIREMENTS[broker];
    return {
      broker,
      requiredDocuments: [...reqs.requiredDocuments],
      optionalDocuments: [...reqs.optionalDocuments],
      maxFileSize: reqs.maxFileSize,
      allowedMimeTypes: [...reqs.allowedMimeTypes],
    };
  }

  /**
   * Validate a file against a broker's document requirements.
   * Checks size and MIME type.
   */
  validateDocument(
    file: FileInfo,
    broker: SupportedBroker,
  ): DocumentValidationResult {
    const errors: string[] = [];
    const reqs = BROKER_REQUIREMENTS[broker];

    // File name
    if (!file.name?.trim()) {
      errors.push("File name is required");
    }

    // File size
    if (file.size <= 0) {
      errors.push("File size must be greater than 0");
    } else if (file.size > reqs.maxFileSize) {
      const maxMB = Math.round(reqs.maxFileSize / (1024 * 1024));
      errors.push(`File size exceeds maximum of ${maxMB} MB`);
    }

    // MIME type
    if (!file.mimeType?.trim()) {
      errors.push("MIME type is required");
    } else if (!reqs.allowedMimeTypes.includes(file.mimeType)) {
      errors.push(
        `MIME type "${file.mimeType}" is not allowed. Accepted: ${reqs.allowedMimeTypes.join(", ")}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Register an uploaded document for a user.
   * Returns the created KycDocument record.
   *
   * Note: Actual file storage (e.g. S3 presigned URL upload) is handled
   * externally. This method records the metadata.
   */
  registerUpload(
    userId: string,
    type: KycDocumentType,
    fileInfo: FileInfo,
    metadata?: Record<string, unknown>,
  ): KycDocument {
    const id = this.generateDocumentId();

    const document: KycDocument = {
      id,
      userId,
      type,
      fileName: fileInfo.name,
      mimeType: fileInfo.mimeType,
      size: fileInfo.size,
      uploadedAt: new Date(),
      status: "pending",
      metadata,
    };

    this.documents.set(id, document);

    const userDocs = this.userDocuments.get(userId) ?? new Set();
    userDocs.add(id);
    this.userDocuments.set(userId, userDocs);

    return { ...document };
  }

  /**
   * Get all documents for a user.
   */
  getDocuments(userId: string): KycDocument[] {
    const docIds = this.userDocuments.get(userId);
    if (!docIds) return [];

    const result: KycDocument[] = [];
    for (const id of docIds) {
      const doc = this.documents.get(id);
      if (doc) {
        result.push({ ...doc });
      }
    }
    return result;
  }

  /**
   * Get a specific document by ID.
   * Returns null if not found.
   */
  getDocumentStatus(documentId: string): KycDocument | null {
    const doc = this.documents.get(documentId);
    return doc ? { ...doc } : null;
  }

  /**
   * Determine which required and optional documents are still missing
   * for a user and broker combination.
   */
  getMissingDocuments(
    userId: string,
    broker: SupportedBroker,
  ): MissingDocumentReport {
    const reqs = BROKER_REQUIREMENTS[broker];
    const userDocs = this.getDocuments(userId);

    // Only consider documents that are not rejected or expired
    const validDocs = userDocs.filter(
      (doc) => doc.status !== "rejected" && doc.status !== "expired",
    );
    const uploadedTypes = new Set(validDocs.map((doc) => doc.type));

    const missingRequired = reqs.requiredDocuments.filter(
      (type) => !uploadedTypes.has(type),
    );
    const missingOptional = reqs.optionalDocuments.filter(
      (type) => !uploadedTypes.has(type),
    );

    return {
      broker,
      missingRequired,
      missingOptional,
      complete: missingRequired.length === 0,
    };
  }

  /**
   * Update a document's status (e.g., after broker verification).
   * Throws if the document is not found.
   */
  updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    rejectionReason?: string,
  ): KycDocument {
    const doc = this.documents.get(documentId);
    if (!doc) {
      throw new Error(`Document "${documentId}" not found`);
    }

    doc.status = status;
    if (rejectionReason) {
      doc.rejectionReason = rejectionReason;
    }

    return { ...doc };
  }

  /**
   * Mark a document as expired.
   * Throws if the document is not found.
   */
  markExpired(documentId: string): KycDocument {
    return this.updateDocumentStatus(documentId, "expired");
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private generateDocumentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `DOC-${timestamp}-${random}`;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const kycDocumentCollector = new KycDocumentCollector();
export default kycDocumentCollector;
