/**
 * Base OCR Provider
 *
 * Abstract base class for all OCR providers.
 * Defines the interface that all providers must implement.
 */

import type {
  OCRProvider,
  TaxDocumentType,
  ProviderExtractionResult,
  OCRProviderConfig,
} from "../types";

export interface DocumentInput {
  base64Image: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

export interface ClassificationResult {
  documentType: TaxDocumentType;
  confidence: number;
  taxYear?: number;
  reasoning?: string;
}

export abstract class BaseOCRProvider {
  protected config: OCRProviderConfig;
  protected providerName: OCRProvider;

  constructor(config: OCRProviderConfig) {
    this.config = config;
    this.providerName = config.provider;
  }

  /**
   * Check if provider is available and properly configured
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Classify the document type
   */
  abstract classifyDocument(
    input: DocumentInput,
  ): Promise<ClassificationResult>;

  /**
   * Extract fields from a document of known type
   */
  abstract extractFields(
    input: DocumentInput,
    documentType: TaxDocumentType,
  ): Promise<ProviderExtractionResult>;

  /**
   * Full pipeline: classify then extract
   */
  async processDocument(
    input: DocumentInput,
  ): Promise<ProviderExtractionResult> {
    const startTime = Date.now();

    try {
      // Step 1: Classify document
      const classification = await this.classifyDocument(input);

      // Step 2: Extract fields based on classification
      const result = await this.extractFields(
        input,
        classification.documentType,
      );

      return {
        ...result,
        documentType: classification.documentType,
        documentTypeConfidence: classification.confidence,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        provider: this.providerName,
        success: false,
        documentType: "unknown",
        documentTypeConfidence: 0,
        fields: {},
        fieldConfidences: [],
        processingTimeMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): OCRProvider {
    return this.providerName;
  }

  /**
   * Check if provider supports a document type
   */
  supportsDocumentType(documentType: TaxDocumentType): boolean {
    return this.config.supportedDocuments.includes(documentType);
  }

  /**
   * Utility: Parse JSON from text, handling markdown code blocks
   */
  protected parseJsonFromResponse(text: string): Record<string, unknown> {
    // Remove markdown code blocks if present
    let jsonStr = text.trim();

    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }

    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }

    jsonStr = jsonStr.trim();

    try {
      return JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON from the text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Failed to parse JSON from response");
    }
  }

  /**
   * Utility: Calculate confidence for a field based on format validation
   */
  protected calculateFieldConfidence(
    fieldName: string,
    value: unknown,
    validationFn?: (val: unknown) => boolean,
  ): number {
    if (value === null || value === undefined) return 0;
    if (value === "") return 0;

    let confidence = 0.8; // Base confidence

    // Apply validation function if provided
    if (validationFn) {
      confidence = validationFn(value) ? 0.95 : 0.5;
    }

    // Specific validations based on field patterns
    if (typeof value === "string") {
      // SSN pattern
      if (
        fieldName.toLowerCase().includes("ssn") ||
        fieldName.toLowerCase().includes("tin")
      ) {
        const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
        const einPattern = /^\d{2}-?\d{7}$/;
        if (ssnPattern.test(value) || einPattern.test(value)) {
          confidence = 0.95;
        } else {
          confidence = 0.4;
        }
      }

      // State code
      if (fieldName.toLowerCase().includes("statecode")) {
        confidence = value.length === 2 ? 0.95 : 0.5;
      }
    }

    if (typeof value === "number") {
      // Monetary values should be positive (usually)
      if (value >= 0) {
        confidence = 0.9;
      }
    }

    return confidence;
  }
}
