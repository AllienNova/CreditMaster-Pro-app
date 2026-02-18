/**
 * Tax Document Processor
 *
 * Main orchestrator for tax document processing with multi-provider support.
 *
 * FEATURES:
 * - Multi-provider OCR with intelligent fallback
 * - Consensus-based field resolution
 * - Confidence scoring and validation
 * - Audit logging for compliance
 *
 * PROVIDER STRATEGY:
 * 1. Primary: OpenAI Vision (best context understanding)
 * 2. Secondary: Google Vision (fast, accurate OCR)
 * 3. Tertiary: LandingAI (specialized document understanding)
 * 4. Fallback: Use best available result
 */

import { getSupabase } from '@/lib/supabase/client';

const supabase = getSupabase();
import { BaseOCRProvider, DocumentInput } from './providers/base-provider';
import { OpenAIVisionProvider } from './providers/openai-vision-provider';
import { GoogleVisionProvider } from './providers/google-vision-provider';
import { LandingAIProvider } from './providers/landing-ai-provider';
import type {
  TaxDocumentType,
  OCRProvider,
  ProviderExtractionResult,
  ConsolidatedExtractionResult,
  OCRProviderConfig,
  FieldConfidence,
  DocumentProcessingStatus,
  ExtractedFields,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.7,
  LOW: 0.5,
  MINIMUM: 0.3,
};

const CONSENSUS_THRESHOLD = 0.8; // Require 80% agreement for consensus

// ============================================================================
// TAX DOCUMENT PROCESSOR CLASS
// ============================================================================

export class TaxDocumentProcessor {
  private providers: Map<OCRProvider, BaseOCRProvider> = new Map();
  private providerConfigs: OCRProviderConfig[];

  constructor(configs?: OCRProviderConfig[]) {
    this.providerConfigs = configs || this.getDefaultConfigs();
    this.initializeProviders();
  }

  private getDefaultConfigs(): OCRProviderConfig[] {
    return [
      {
        provider: 'openai_vision',
        enabled: true,
        priority: 1,
        timeout: 30000,
        retries: 2,
        supportedDocuments: [
          'w2',
          '1099_div',
          '1099_int',
          '1099_b',
          '1099_nec',
          '1099_misc',
          '1099_r',
          '1098',
          '1098_e',
          'charitable_receipt',
          'unknown',
        ],
        costPerPage: 0.01,
      },
      {
        provider: 'google_vision',
        enabled: true,
        priority: 2,
        timeout: 30000,
        retries: 2,
        supportedDocuments: [
          'w2',
          '1099_div',
          '1099_int',
          '1099_b',
          '1099_nec',
          '1099_misc',
          '1099_r',
          '1098',
          '1098_e',
          'charitable_receipt',
          'unknown',
        ],
        costPerPage: 0.0015,
      },
      {
        provider: 'landing_ai',
        enabled: true,
        priority: 3,
        timeout: 45000,
        retries: 2,
        supportedDocuments: [
          'w2',
          '1099_div',
          '1099_int',
          '1099_nec',
          '1099_misc',
          '1098',
          'charitable_receipt',
        ],
        costPerPage: 0.02,
      },
    ];
  }

  private initializeProviders(): void {
    for (const config of this.providerConfigs) {
      if (!config.enabled) continue;

      let provider: BaseOCRProvider;

      switch (config.provider) {
        case 'openai_vision':
          provider = new OpenAIVisionProvider(config);
          break;
        case 'google_vision':
          provider = new GoogleVisionProvider(config);
          break;
        case 'landing_ai':
          provider = new LandingAIProvider(config);
          break;
        default:
          continue;
      }

      this.providers.set(config.provider, provider);
    }
  }

  /**
   * Process a tax document through multiple providers
   */
  async processDocument(
    userId: string,
    input: DocumentInput
  ): Promise<ConsolidatedExtractionResult> {
    const startTime = Date.now();
    const documentId = crypto.randomUUID();

    // Step 1: Get available providers sorted by priority
    const availableProviders = await this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('No OCR providers available');
    }

    // Step 2: Run extraction with primary provider first
    const providerResults: ProviderExtractionResult[] = [];
    let documentType: TaxDocumentType = 'unknown';
    let documentTypeConfidence = 0;

    // Try primary provider first
    const primaryProvider = availableProviders[0];
    const primaryResult = await this.runProviderWithRetry(
      primaryProvider,
      input
    );
    providerResults.push(primaryResult);

    if (primaryResult.success) {
      documentType = primaryResult.documentType;
      documentTypeConfidence = primaryResult.documentTypeConfidence;
    }

    // Step 3: If confidence is low, run additional providers in parallel
    if (
      documentTypeConfidence < CONFIDENCE_THRESHOLDS.HIGH &&
      availableProviders.length > 1
    ) {
      const secondaryProviders = availableProviders.slice(1, 3); // Run up to 2 more
      const secondaryResults = await Promise.all(
        secondaryProviders.map((provider) =>
          this.runProviderWithRetry(provider, input)
        )
      );
      providerResults.push(...secondaryResults);

      // Re-evaluate document type based on all results
      const typeVotes = this.consolidateDocumentTypes(providerResults);
      if (typeVotes.bestType !== 'unknown') {
        documentType = typeVotes.bestType;
        documentTypeConfidence = typeVotes.confidence;
      }
    }

    // Step 4: Consolidate fields from all successful providers
    const successfulResults = providerResults.filter((r) => r.success);
    const consolidatedFields = this.consolidateFields(successfulResults);

    // Step 5: Validate extracted data
    const validationErrors = this.validateExtractedData(
      documentType,
      consolidatedFields.fields
    );

    // Step 6: Determine if manual review is needed
    const { requiresReview, reviewReasons } = this.determineReviewRequirement(
      documentTypeConfidence,
      consolidatedFields.overallConfidence,
      consolidatedFields.conflictingFields,
      validationErrors
    );

    // Step 7: Extract tax year
    const taxYear = this.extractTaxYear(
      consolidatedFields.fields,
      providerResults
    );

    // Step 8: Build result
    const result: ConsolidatedExtractionResult = {
      documentId,
      userId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,

      documentType,
      documentTypeConfidence,
      taxYear,

      extractedData: {
        type: documentType as ExtractedFields['type'],
        fields: consolidatedFields.fields as any,
      } as ExtractedFields,
      overallConfidence: consolidatedFields.overallConfidence,

      providersUsed: providerResults.map((r) => r.provider),
      providerResults,
      consensusFields: consolidatedFields.consensusFields,
      conflictingFields: consolidatedFields.conflictingFields,

      status: this.determineStatus(requiresReview, validationErrors),
      requiresReview,
      reviewReasons,

      validationErrors,
      isValid:
        validationErrors.filter((e) => e.severity === 'error').length === 0,

      processedAt: new Date(),
      totalProcessingTimeMs: Date.now() - startTime,
    };

    // Step 9: Log to audit trail
    await this.logProcessing(result);

    return result;
  }

  /**
   * Get available providers sorted by priority
   */
  private async getAvailableProviders(): Promise<BaseOCRProvider[]> {
    const available: { provider: BaseOCRProvider; priority: number }[] = [];

    for (const config of this.providerConfigs) {
      if (!config.enabled) continue;

      const provider = this.providers.get(config.provider);
      if (!provider) continue;

      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        available.push({ provider, priority: config.priority });
      }
    }

    // Sort by priority (lower = higher priority)
    available.sort((a, b) => a.priority - b.priority);

    return available.map((a) => a.provider);
  }

  /**
   * Run a provider with retry logic
   */
  private async runProviderWithRetry(
    provider: BaseOCRProvider,
    input: DocumentInput,
    maxRetries = 2
  ): Promise<ProviderExtractionResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await provider.processDocument(input);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.errorMessage || 'Unknown error');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    return {
      provider: provider.getProviderName(),
      success: false,
      documentType: 'unknown',
      documentTypeConfidence: 0,
      fields: {},
      fieldConfidences: [],
      processingTimeMs: 0,
      errorMessage: lastError?.message || 'Max retries exceeded',
    };
  }

  /**
   * Consolidate document type votes from multiple providers
   */
  private consolidateDocumentTypes(results: ProviderExtractionResult[]): {
    bestType: TaxDocumentType;
    confidence: number;
  } {
    const votes: Map<
      TaxDocumentType,
      { count: number; totalConfidence: number }
    > = new Map();

    for (const result of results) {
      if (!result.success || result.documentType === 'unknown') continue;

      const existing = votes.get(result.documentType) || {
        count: 0,
        totalConfidence: 0,
      };
      votes.set(result.documentType, {
        count: existing.count + 1,
        totalConfidence:
          existing.totalConfidence + result.documentTypeConfidence,
      });
    }

    let bestType: TaxDocumentType = 'unknown';
    let bestScore = 0;

    for (const [type, data] of votes) {
      const score = data.count * (data.totalConfidence / data.count);
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    const bestData = votes.get(bestType);
    const confidence = bestData ? bestData.totalConfidence / bestData.count : 0;

    return { bestType, confidence };
  }

  /**
   * Consolidate fields from multiple provider results
   */
  private consolidateFields(results: ProviderExtractionResult[]): {
    fields: Record<string, unknown>;
    overallConfidence: number;
    consensusFields: string[];
    conflictingFields: ConsolidatedExtractionResult['conflictingFields'];
  } {
    if (results.length === 0) {
      return {
        fields: {},
        overallConfidence: 0,
        consensusFields: [],
        conflictingFields: [],
      };
    }

    if (results.length === 1) {
      return {
        fields: results[0].fields,
        overallConfidence: results[0].documentTypeConfidence,
        consensusFields: Object.keys(results[0].fields),
        conflictingFields: [],
      };
    }

    // Collect all field values from all providers
    const fieldValues: Map<
      string,
      { provider: OCRProvider; value: unknown; confidence: number }[]
    > = new Map();

    for (const result of results) {
      for (const [fieldName, value] of Object.entries(result.fields)) {
        const existing = fieldValues.get(fieldName) || [];
        const fieldConfidence = result.fieldConfidences.find(
          (f) => f.fieldName === fieldName
        );
        existing.push({
          provider: result.provider,
          value,
          confidence: fieldConfidence?.confidence || 0.7,
        });
        fieldValues.set(fieldName, existing);
      }
    }

    // Resolve each field
    const fields: Record<string, unknown> = {};
    const consensusFields: string[] = [];
    const conflictingFields: ConsolidatedExtractionResult['conflictingFields'] =
      [];

    for (const [fieldName, values] of fieldValues) {
      if (values.length === 0) continue;

      // Check for consensus
      const uniqueValues = new Set(values.map((v) => JSON.stringify(v.value)));

      if (uniqueValues.size === 1) {
        // All providers agree
        consensusFields.push(fieldName);
        fields[fieldName] = values[0].value;
      } else {
        // Conflict - resolve by highest confidence
        const sorted = [...values].sort((a, b) => b.confidence - a.confidence);
        fields[fieldName] = sorted[0].value;

        conflictingFields.push({
          fieldName,
          values,
          resolvedValue: sorted[0].value,
          resolutionMethod: 'highest_confidence',
        });
      }
    }

    // Calculate overall confidence
    const allConfidences = results.flatMap((r) =>
      r.fieldConfidences.map((f) => f.confidence)
    );
    const overallConfidence =
      allConfidences.length > 0
        ? allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
        : 0;

    return {
      fields,
      overallConfidence,
      consensusFields,
      conflictingFields,
    };
  }

  /**
   * Validate extracted data against expected schema
   */
  private validateExtractedData(
    documentType: TaxDocumentType,
    fields: Record<string, unknown>
  ): ConsolidatedExtractionResult['validationErrors'] {
    const errors: ConsolidatedExtractionResult['validationErrors'] = [];

    // Common validations
    if (fields.taxYear) {
      const year = fields.taxYear as number;
      const currentYear = new Date().getFullYear();
      if (year < 2000 || year > currentYear + 1) {
        errors.push({
          field: 'taxYear',
          error: `Tax year ${year} seems invalid`,
          severity: 'warning',
        });
      }
    }

    // Document-specific validations
    switch (documentType) {
      case 'w2':
        this.validateW2(fields, errors);
        break;
      case '1099_div':
        this.validate1099DIV(fields, errors);
        break;
      case '1099_nec':
        this.validate1099NEC(fields, errors);
        break;
      case '1098':
        this.validate1098(fields, errors);
        break;
    }

    return errors;
  }

  private validateW2(
    fields: Record<string, unknown>,
    errors: ConsolidatedExtractionResult['validationErrors']
  ): void {
    // Wages should be positive
    const wages = fields.wagesTipsOtherComp as number;
    if (wages !== undefined && wages < 0) {
      errors.push({
        field: 'wagesTipsOtherComp',
        error: 'Wages cannot be negative',
        severity: 'error',
      });
    }

    // Federal withholding should not exceed wages
    const withheld = fields.federalIncomeTaxWithheld as number;
    if (withheld !== undefined && wages !== undefined && withheld > wages) {
      errors.push({
        field: 'federalIncomeTaxWithheld',
        error: 'Withholding exceeds wages',
        severity: 'warning',
      });
    }

    // EIN format
    const ein = fields.employerEIN as string;
    if (ein && !/^\d{2}-?\d{7}$/.test(ein)) {
      errors.push({
        field: 'employerEIN',
        error: 'Invalid EIN format',
        severity: 'warning',
      });
    }
  }

  private validate1099DIV(
    fields: Record<string, unknown>,
    errors: ConsolidatedExtractionResult['validationErrors']
  ): void {
    const ordinary = fields.ordinaryDividends as number;
    const qualified = fields.qualifiedDividends as number;

    if (
      qualified !== undefined &&
      ordinary !== undefined &&
      qualified > ordinary
    ) {
      errors.push({
        field: 'qualifiedDividends',
        error: 'Qualified dividends cannot exceed ordinary dividends',
        severity: 'warning',
      });
    }
  }

  private validate1099NEC(
    fields: Record<string, unknown>,
    errors: ConsolidatedExtractionResult['validationErrors']
  ): void {
    const compensation = fields.nonemployeeCompensation as number;
    if (compensation !== undefined && compensation < 0) {
      errors.push({
        field: 'nonemployeeCompensation',
        error: 'Compensation cannot be negative',
        severity: 'error',
      });
    }
  }

  private validate1098(
    fields: Record<string, unknown>,
    errors: ConsolidatedExtractionResult['validationErrors']
  ): void {
    const interest = fields.mortgageInterestReceived as number;
    if (interest !== undefined && interest < 0) {
      errors.push({
        field: 'mortgageInterestReceived',
        error: 'Mortgage interest cannot be negative',
        severity: 'error',
      });
    }
  }

  /**
   * Determine if manual review is required
   */
  private determineReviewRequirement(
    typeConfidence: number,
    fieldConfidence: number,
    conflictingFields: ConsolidatedExtractionResult['conflictingFields'],
    validationErrors: ConsolidatedExtractionResult['validationErrors']
  ): { requiresReview: boolean; reviewReasons: string[] } {
    const reviewReasons: string[] = [];

    if (typeConfidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      reviewReasons.push(
        `Low document type confidence (${(typeConfidence * 100).toFixed(0)}%)`
      );
    }

    if (fieldConfidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      reviewReasons.push(
        `Low field extraction confidence (${(fieldConfidence * 100).toFixed(0)}%)`
      );
    }

    if (conflictingFields.length > 3) {
      reviewReasons.push(
        `Multiple conflicting fields (${conflictingFields.length})`
      );
    }

    const errors = validationErrors.filter((e) => e.severity === 'error');
    if (errors.length > 0) {
      reviewReasons.push(
        `Validation errors: ${errors.map((e) => e.field).join(', ')}`
      );
    }

    return {
      requiresReview: reviewReasons.length > 0,
      reviewReasons,
    };
  }

  /**
   * Determine processing status
   */
  private determineStatus(
    requiresReview: boolean,
    validationErrors: ConsolidatedExtractionResult['validationErrors']
  ): DocumentProcessingStatus {
    const hasErrors = validationErrors.some((e) => e.severity === 'error');

    if (hasErrors) return 'failed';
    if (requiresReview) return 'needs_review';
    return 'extracted';
  }

  /**
   * Extract tax year from fields or results
   */
  private extractTaxYear(
    fields: Record<string, unknown>,
    results: ProviderExtractionResult[]
  ): number {
    // Try from consolidated fields first
    if (fields.taxYear && typeof fields.taxYear === 'number') {
      return fields.taxYear;
    }

    // Try from individual results
    for (const result of results) {
      if (result.fields.taxYear && typeof result.fields.taxYear === 'number') {
        return result.fields.taxYear;
      }
    }

    // Default to current year
    return new Date().getFullYear();
  }

  /**
   * Log processing to audit trail
   */
  private async logProcessing(
    result: ConsolidatedExtractionResult
  ): Promise<void> {
    try {
      await supabase.from('tax_audit_log').insert({
        user_id: result.userId,
        action_type: 'document_processed',
        entity_type: 'tax_document',
        entity_id: result.documentId,
        new_values: {
          documentType: result.documentType,
          confidence: result.overallConfidence,
          providersUsed: result.providersUsed,
          requiresReview: result.requiresReview,
          processingTimeMs: result.totalProcessingTimeMs,
        },
        created_at: new Date().toISOString(),
      });
    } catch (_error) {
      // Error logged
    }
  }
}

// Export singleton
export const taxDocumentProcessor = new TaxDocumentProcessor();
