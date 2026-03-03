/**
 * OCR Bridge Service
 *
 * Bridges the general document system with the tax document processor,
 * providing structured output validation and manual entry fallback.
 *
 * FEATURES:
 * - Orchestrates document upload -> OCR processing -> validation -> storage
 * - Zod schemas for structured validation of W-2, 1099, 1098 form types
 * - Configurable confidence threshold with manual entry fallback
 * - Result persistence in Supabase
 */

import { z } from "zod";
import { getSupabase } from "@/lib/supabase/client";
import { TaxDocumentProcessor } from "@/lib/tax/documents/TaxDocumentProcessor";
import type {
  TaxDocumentType,
  ConsolidatedExtractionResult,
} from "@/lib/tax/documents/types";
import type { DocumentInput } from "@/lib/tax/documents/providers/base-provider";

// ============================================================================
// ZOD SCHEMAS FOR FORM VALIDATION
// ============================================================================

export const W2Schema = z.object({
  employerEIN: z.string().regex(/^\d{2}-?\d{7}$/, "Invalid EIN format").optional(),
  employerName: z.string().min(1, "Employer name is required"),
  employerAddress: z.string().optional(),
  employeeSSN: z.string().optional(),
  employeeName: z.string().min(1, "Employee name is required"),
  employeeAddress: z.string().optional(),
  wagesTipsOtherComp: z.number().nonnegative("Wages cannot be negative"),
  federalIncomeTaxWithheld: z.number().nonnegative("Withholding cannot be negative"),
  socialSecurityWages: z.number().nonnegative().optional(),
  socialSecurityTaxWithheld: z.number().nonnegative().optional(),
  medicareWagesAndTips: z.number().nonnegative().optional(),
  medicareTaxWithheld: z.number().nonnegative().optional(),
  socialSecurityTips: z.number().nonnegative().optional(),
  allocatedTips: z.number().nonnegative().optional(),
  dependentCareBenefits: z.number().nonnegative().optional(),
  nonqualifiedPlans: z.number().nonnegative().optional(),
  box12Codes: z
    .array(z.object({ code: z.string(), amount: z.number() }))
    .optional(),
  statutoryEmployee: z.boolean().optional(),
  retirementPlan: z.boolean().optional(),
  thirdPartySickPay: z.boolean().optional(),
  stateWages: z.number().nonnegative().optional(),
  stateIncomeTax: z.number().nonnegative().optional(),
  localWages: z.number().nonnegative().optional(),
  localIncomeTax: z.number().nonnegative().optional(),
  stateCode: z.string().length(2).optional(),
  localityName: z.string().optional(),
  taxYear: z.number().int().min(2000).max(2099),
});

export const Form1099NECSchema = z.object({
  payerName: z.string().min(1, "Payer name is required"),
  payerTIN: z.string().regex(/^\d{2}-?\d{7}$/, "Invalid TIN format").optional(),
  recipientTIN: z.string().optional(),
  recipientName: z.string().min(1, "Recipient name is required"),
  nonemployeeCompensation: z.number().nonnegative("Compensation cannot be negative"),
  payerMadeDirectSalesOf5000OrMore: z.boolean().optional(),
  federalIncomeTaxWithheld: z.number().nonnegative().optional(),
  stateCode: z.string().length(2).optional(),
  statePayerNumber: z.string().optional(),
  stateIncome: z.number().nonnegative().optional(),
  stateTaxWithheld: z.number().nonnegative().optional(),
  taxYear: z.number().int().min(2000).max(2099),
});

export const Form1099DIVSchema = z.object({
  payerName: z.string().min(1, "Payer name is required"),
  payerTIN: z.string().regex(/^\d{2}-?\d{7}$/, "Invalid TIN format").optional(),
  recipientTIN: z.string().optional(),
  recipientName: z.string().min(1, "Recipient name is required"),
  ordinaryDividends: z.number().nonnegative("Ordinary dividends cannot be negative"),
  qualifiedDividends: z.number().nonnegative().optional(),
  totalCapitalGainDistributions: z.number().nonnegative().optional(),
  unrecaptured1250Gain: z.number().nonnegative().optional(),
  section1202Gain: z.number().nonnegative().optional(),
  collectiblesGain: z.number().nonnegative().optional(),
  section897Dividends: z.number().nonnegative().optional(),
  section897CapitalGain: z.number().nonnegative().optional(),
  nondividendDistributions: z.number().nonnegative().optional(),
  federalIncomeTaxWithheld: z.number().nonnegative().optional(),
  section199ADividends: z.number().nonnegative().optional(),
  investmentExpenses: z.number().nonnegative().optional(),
  foreignTaxPaid: z.number().nonnegative().optional(),
  foreignCountry: z.string().optional(),
  cashLiquidationDistributions: z.number().nonnegative().optional(),
  noncashLiquidationDistributions: z.number().nonnegative().optional(),
  exemptInterestDividends: z.number().nonnegative().optional(),
  specifiedPrivateActivityBondDividends: z.number().nonnegative().optional(),
  stateCode: z.string().length(2).optional(),
  stateIdNumber: z.string().optional(),
  stateTaxWithheld: z.number().nonnegative().optional(),
  taxYear: z.number().int().min(2000).max(2099),
});

export const Form1099INTSchema = z.object({
  payerName: z.string().min(1, "Payer name is required"),
  payerTIN: z.string().regex(/^\d{2}-?\d{7}$/, "Invalid TIN format").optional(),
  recipientTIN: z.string().optional(),
  recipientName: z.string().min(1, "Recipient name is required"),
  interestIncome: z.number().nonnegative("Interest income cannot be negative"),
  earlyWithdrawalPenalty: z.number().nonnegative().optional(),
  interestOnUSSavingsBonds: z.number().nonnegative().optional(),
  federalIncomeTaxWithheld: z.number().nonnegative().optional(),
  investmentExpenses: z.number().nonnegative().optional(),
  foreignTaxPaid: z.number().nonnegative().optional(),
  foreignCountry: z.string().optional(),
  taxExemptInterest: z.number().nonnegative().optional(),
  specifiedPrivateActivityBondInterest: z.number().nonnegative().optional(),
  marketDiscount: z.number().nonnegative().optional(),
  bondPremium: z.number().nonnegative().optional(),
  bondPremiumTreasury: z.number().nonnegative().optional(),
  bondPremiumTaxExempt: z.number().nonnegative().optional(),
  taxYear: z.number().int().min(2000).max(2099),
});

export const Form1099MISCSchema = z.object({
  payerName: z.string().min(1, "Payer name is required"),
  payerTIN: z.string().regex(/^\d{2}-?\d{7}$/, "Invalid TIN format").optional(),
  recipientTIN: z.string().optional(),
  recipientName: z.string().min(1, "Recipient name is required"),
  rents: z.number().nonnegative().optional(),
  royalties: z.number().nonnegative().optional(),
  otherIncome: z.number().nonnegative().optional(),
  federalIncomeTaxWithheld: z.number().nonnegative().optional(),
  fishingBoatProceeds: z.number().nonnegative().optional(),
  medicalHealthcarePayments: z.number().nonnegative().optional(),
  payerMadeDirectSales: z.boolean().optional(),
  substitutePaymentsInLieuOfDividends: z.number().nonnegative().optional(),
  cropInsuranceProceeds: z.number().nonnegative().optional(),
  grossProceedsAttorney: z.number().nonnegative().optional(),
  taxYear: z.number().int().min(2000).max(2099),
});

export const Form1098Schema = z.object({
  lenderName: z.string().min(1, "Lender name is required"),
  lenderTIN: z.string().regex(/^\d{2}-?\d{7}$/, "Invalid TIN format").optional(),
  borrowerTIN: z.string().optional(),
  borrowerName: z.string().min(1, "Borrower name is required"),
  mortgageInterestReceived: z.number().nonnegative("Mortgage interest cannot be negative"),
  outstandingMortgagePrincipal: z.number().nonnegative().optional(),
  mortgageOriginationDate: z.string().optional(),
  refundOfOverpaidInterest: z.number().nonnegative().optional(),
  mortgageInsurancePremiums: z.number().nonnegative().optional(),
  pointsPaidOnPurchase: z.number().nonnegative().optional(),
  propertyAddress: z.string().optional(),
  numberOfProperties: z.number().int().nonnegative().optional(),
  acquisitionDate: z.string().optional(),
  propertySecuringMortgage: z.string().optional(),
  taxYear: z.number().int().min(2000).max(2099),
});

export const Form1098ESchema = z.object({
  lenderName: z.string().min(1, "Lender name is required"),
  lenderTIN: z.string().regex(/^\d{2}-?\d{7}$/, "Invalid TIN format").optional(),
  borrowerTIN: z.string().optional(),
  borrowerName: z.string().min(1, "Borrower name is required"),
  studentLoanInterestReceived: z.number().nonnegative(
    "Student loan interest cannot be negative",
  ),
  lenderReimbursedOrRefunded: z.boolean().optional(),
  taxYear: z.number().int().min(2000).max(2099),
});

// ============================================================================
// TYPES
// ============================================================================

/** Supported form types for the OCR bridge */
export type OCRBridgeFormType =
  | "w2"
  | "1099_nec"
  | "1099_div"
  | "1099_int"
  | "1099_misc"
  | "1098"
  | "1098_e";

/** Fields that need manual entry when OCR confidence is low */
export interface ManualEntryField {
  fieldName: string;
  expectedType: "string" | "number" | "boolean";
  label: string;
  required: boolean;
  currentValue: unknown;
  confidence: number;
}

/** Result of processing a document through the OCR bridge */
export interface OCRBridgeResult {
  documentId: string;
  formType: OCRBridgeFormType;
  status: "success" | "needs_manual_entry" | "validation_failed" | "ocr_failed";
  confidence: number;
  extractedData: Record<string, unknown> | null;
  validationErrors: z.ZodIssue[] | null;
  manualEntryFields: ManualEntryField[] | null;
  ocrResult: ConsolidatedExtractionResult | null;
  processedAt: Date;
}

/** Configuration options for the OCR bridge */
export interface OCRBridgeConfig {
  confidenceThreshold: number;
  enableManualFallback: boolean;
}

// ============================================================================
// SCHEMA MAP
// ============================================================================

const FORM_SCHEMA_MAP: Record<OCRBridgeFormType, z.ZodSchema> = {
  w2: W2Schema,
  "1099_nec": Form1099NECSchema,
  "1099_div": Form1099DIVSchema,
  "1099_int": Form1099INTSchema,
  "1099_misc": Form1099MISCSchema,
  "1098": Form1098Schema,
  "1098_e": Form1098ESchema,
};

const FORM_REQUIRED_FIELDS: Record<OCRBridgeFormType, string[]> = {
  w2: ["employerName", "employeeName", "wagesTipsOtherComp", "federalIncomeTaxWithheld", "taxYear"],
  "1099_nec": ["payerName", "recipientName", "nonemployeeCompensation", "taxYear"],
  "1099_div": ["payerName", "recipientName", "ordinaryDividends", "taxYear"],
  "1099_int": ["payerName", "recipientName", "interestIncome", "taxYear"],
  "1099_misc": ["payerName", "recipientName", "taxYear"],
  "1098": ["lenderName", "borrowerName", "mortgageInterestReceived", "taxYear"],
  "1098_e": ["lenderName", "borrowerName", "studentLoanInterestReceived", "taxYear"],
};

const FORM_FIELD_LABELS: Record<string, string> = {
  employerEIN: "Employer EIN",
  employerName: "Employer Name",
  employerAddress: "Employer Address",
  employeeSSN: "Employee SSN",
  employeeName: "Employee Name",
  employeeAddress: "Employee Address",
  wagesTipsOtherComp: "Wages, Tips & Other Compensation (Box 1)",
  federalIncomeTaxWithheld: "Federal Income Tax Withheld (Box 2)",
  socialSecurityWages: "Social Security Wages (Box 3)",
  socialSecurityTaxWithheld: "Social Security Tax Withheld (Box 4)",
  medicareWagesAndTips: "Medicare Wages and Tips (Box 5)",
  medicareTaxWithheld: "Medicare Tax Withheld (Box 6)",
  stateWages: "State Wages (Box 16)",
  stateIncomeTax: "State Income Tax (Box 17)",
  stateCode: "State Code",
  taxYear: "Tax Year",
  payerName: "Payer Name",
  payerTIN: "Payer TIN",
  recipientTIN: "Recipient TIN",
  recipientName: "Recipient Name",
  nonemployeeCompensation: "Nonemployee Compensation (Box 1)",
  ordinaryDividends: "Ordinary Dividends (Box 1a)",
  qualifiedDividends: "Qualified Dividends (Box 1b)",
  interestIncome: "Interest Income (Box 1)",
  lenderName: "Lender Name",
  lenderTIN: "Lender TIN",
  borrowerTIN: "Borrower TIN",
  borrowerName: "Borrower Name",
  mortgageInterestReceived: "Mortgage Interest Received (Box 1)",
  outstandingMortgagePrincipal: "Outstanding Mortgage Principal (Box 2)",
  studentLoanInterestReceived: "Student Loan Interest Received (Box 1)",
  rents: "Rents (Box 1)",
  royalties: "Royalties (Box 2)",
  otherIncome: "Other Income (Box 3)",
};

// ============================================================================
// OCR BRIDGE SERVICE CLASS
// ============================================================================

export class OCRBridgeService {
  private processor: TaxDocumentProcessor;
  private config: OCRBridgeConfig;

  constructor(
    processor?: TaxDocumentProcessor,
    config?: Partial<OCRBridgeConfig>,
  ) {
    this.processor = processor ?? new TaxDocumentProcessor();
    this.config = {
      confidenceThreshold: config?.confidenceThreshold ?? 0.85,
      enableManualFallback: config?.enableManualFallback ?? true,
    };
  }

  /**
   * Process a document through the OCR bridge pipeline.
   *
   * Flow:
   * 1. Send document to TaxDocumentProcessor for OCR
   * 2. Validate extracted data against the appropriate Zod schema
   * 3. If confidence is below threshold, generate manual entry fields
   * 4. Store result in Supabase
   */
  async processDocument(
    userId: string,
    documentId: string,
    formType: OCRBridgeFormType,
    documentInput: DocumentInput,
  ): Promise<OCRBridgeResult> {
    // Step 1: Run OCR
    let ocrResult: ConsolidatedExtractionResult;
    try {
      ocrResult = await this.processor.processDocument(userId, documentInput);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown OCR error";
      const failedResult: OCRBridgeResult = {
        documentId,
        formType,
        status: "ocr_failed",
        confidence: 0,
        extractedData: null,
        validationErrors: null,
        manualEntryFields: this.config.enableManualFallback
          ? this.buildManualEntryFields(formType, {}, [])
          : null,
        ocrResult: null,
        processedAt: new Date(),
      };

      await this.storeResult(userId, failedResult, message);
      return failedResult;
    }

    const extractedFields = ocrResult.extractedData?.fields
      ? (ocrResult.extractedData.fields as Record<string, unknown>)
      : {};

    // Step 2: Validate with Zod
    const schema = FORM_SCHEMA_MAP[formType];
    const validationResult = schema.safeParse(extractedFields);

    // Step 3: Check confidence
    const confidence = ocrResult.overallConfidence;
    const belowThreshold = confidence < this.config.confidenceThreshold;

    // Step 4: Determine result status
    let status: OCRBridgeResult["status"];
    let manualEntryFields: ManualEntryField[] | null = null;

    if (!validationResult.success && belowThreshold) {
      status = "needs_manual_entry";
      if (this.config.enableManualFallback) {
        manualEntryFields = this.buildManualEntryFields(
          formType,
          extractedFields,
          ocrResult.providerResults.flatMap((r) => r.fieldConfidences),
        );
      }
    } else if (!validationResult.success) {
      status = "validation_failed";
      if (this.config.enableManualFallback && belowThreshold) {
        manualEntryFields = this.buildManualEntryFields(
          formType,
          extractedFields,
          ocrResult.providerResults.flatMap((r) => r.fieldConfidences),
        );
      }
    } else if (belowThreshold) {
      status = "needs_manual_entry";
      if (this.config.enableManualFallback) {
        manualEntryFields = this.buildManualEntryFields(
          formType,
          extractedFields,
          ocrResult.providerResults.flatMap((r) => r.fieldConfidences),
        );
      }
    } else {
      status = "success";
    }

    const result: OCRBridgeResult = {
      documentId,
      formType,
      status,
      confidence,
      extractedData: validationResult.success ? validationResult.data as Record<string, unknown> : extractedFields,
      validationErrors: validationResult.success ? null : validationResult.error.issues,
      manualEntryFields,
      ocrResult,
      processedAt: new Date(),
    };

    // Step 5: Store in Supabase
    await this.storeResult(userId, result);

    return result;
  }

  /**
   * Validate manually entered data against the form schema.
   */
  validateManualEntry(
    formType: OCRBridgeFormType,
    data: Record<string, unknown>,
  ): { success: true; data: Record<string, unknown> } | { success: false; errors: z.ZodIssue[] } {
    const schema = FORM_SCHEMA_MAP[formType];
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data as Record<string, unknown> };
    }

    return { success: false, errors: result.error.issues };
  }

  /**
   * Get the Zod schema for a given form type.
   */
  getSchemaForFormType(formType: OCRBridgeFormType): z.ZodSchema {
    const schema = FORM_SCHEMA_MAP[formType];
    if (!schema) {
      throw new Error(`Unsupported form type: ${formType}`);
    }
    return schema;
  }

  /**
   * Check whether a TaxDocumentType from the OCR processor
   * is supported by the bridge.
   */
  isSupportedFormType(documentType: TaxDocumentType): documentType is OCRBridgeFormType {
    return documentType in FORM_SCHEMA_MAP;
  }

  /**
   * Get the confidence threshold.
   */
  getConfidenceThreshold(): number {
    return this.config.confidenceThreshold;
  }

  /**
   * Update the confidence threshold.
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error("Confidence threshold must be between 0 and 1");
    }
    this.config.confidenceThreshold = threshold;
  }

  /**
   * Build manual entry field definitions for a form type.
   * Includes current extracted values and their confidences.
   */
  private buildManualEntryFields(
    formType: OCRBridgeFormType,
    extractedFields: Record<string, unknown>,
    fieldConfidences: Array<{ fieldName: string; confidence: number }>,
  ): ManualEntryField[] {
    const requiredFields = FORM_REQUIRED_FIELDS[formType];
    const confidenceMap = new Map<string, number>();

    for (const fc of fieldConfidences) {
      const existing = confidenceMap.get(fc.fieldName);
      if (existing === undefined || fc.confidence > existing) {
        confidenceMap.set(fc.fieldName, fc.confidence);
      }
    }

    const fields: ManualEntryField[] = [];

    for (const fieldName of requiredFields) {
      const currentValue = extractedFields[fieldName] ?? null;
      const confidence = confidenceMap.get(fieldName) ?? 0;

      fields.push({
        fieldName,
        expectedType: this.inferFieldType(fieldName, formType),
        label: FORM_FIELD_LABELS[fieldName] ?? fieldName,
        required: true,
        currentValue,
        confidence,
      });
    }

    return fields;
  }

  /**
   * Infer the expected type of a field for manual entry.
   */
  private inferFieldType(
    fieldName: string,
    _formType: OCRBridgeFormType,
  ): "string" | "number" | "boolean" {
    if (
      fieldName === "statutoryEmployee" ||
      fieldName === "retirementPlan" ||
      fieldName === "thirdPartySickPay" ||
      fieldName === "payerMadeDirectSalesOf5000OrMore" ||
      fieldName === "payerMadeDirectSales" ||
      fieldName === "lenderReimbursedOrRefunded"
    ) {
      return "boolean";
    }

    if (
      fieldName.includes("Wages") ||
      fieldName.includes("Tax") ||
      fieldName.includes("Comp") ||
      fieldName.includes("Withheld") ||
      fieldName.includes("Interest") ||
      fieldName.includes("Dividends") ||
      fieldName.includes("Income") ||
      fieldName.includes("Amount") ||
      fieldName.includes("Compensation") ||
      fieldName.includes("Gain") ||
      fieldName.includes("Principal") ||
      fieldName.includes("Premium") ||
      fieldName.includes("Rents") ||
      fieldName.includes("Royalties") ||
      fieldName === "taxYear" ||
      fieldName === "numberOfProperties"
    ) {
      return "number";
    }

    return "string";
  }

  /**
   * Store the OCR bridge result in Supabase.
   */
  private async storeResult(
    userId: string,
    result: OCRBridgeResult,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const supabase = getSupabase();
      await supabase.from("ocr_bridge_results").insert({
        user_id: userId,
        document_id: result.documentId,
        form_type: result.formType,
        status: result.status,
        confidence: result.confidence,
        extracted_data: result.extractedData,
        validation_errors: result.validationErrors,
        manual_entry_fields: result.manualEntryFields,
        error_message: errorMessage ?? null,
        processed_at: result.processedAt.toISOString(),
      });
    } catch (_error) {
      // Storage failure is non-fatal; the result is still returned to the caller.
      // In production, this would be sent to an error-tracking service.
    }
  }
}

// Export singleton instance
export const ocrBridgeService = new OCRBridgeService();
export default ocrBridgeService;
