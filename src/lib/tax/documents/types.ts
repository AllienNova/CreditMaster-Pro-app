/**
 * Tax Document Types
 *
 * Comprehensive type definitions for tax document processing including:
 * - Document type classifications
 * - Field extraction schemas for each document type
 * - Provider configurations
 * - Extraction results and confidence scoring
 */

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type TaxDocumentType =
  | "w2"
  | "1099_div"
  | "1099_int"
  | "1099_b"
  | "1099_misc"
  | "1099_nec"
  | "1099_r"
  | "1099_g"
  | "1099_ssa"
  | "k1"
  | "1098"
  | "1098_e"
  | "1098_t"
  | "5498"
  | "charitable_receipt"
  | "medical_receipt"
  | "property_tax"
  | "business_expense"
  | "unknown";

export type DocumentProcessingStatus =
  | "pending"
  | "processing"
  | "extracted"
  | "verified"
  | "failed"
  | "needs_review";

export type OCRProvider =
  | "openai_vision"
  | "google_vision"
  | "landing_ai"
  | "azure_di"
  | "tesseract";

// ============================================================================
// FIELD DEFINITIONS BY DOCUMENT TYPE
// ============================================================================

export interface W2Fields {
  employerEIN: string;
  employerName: string;
  employerAddress: string;
  employeeSSN: string;
  employeeName: string;
  employeeAddress: string;
  wagesTipsOtherComp: number; // Box 1
  federalIncomeTaxWithheld: number; // Box 2
  socialSecurityWages: number; // Box 3
  socialSecurityTaxWithheld: number; // Box 4
  medicareWagesAndTips: number; // Box 5
  medicareTaxWithheld: number; // Box 6
  socialSecurityTips: number; // Box 7
  allocatedTips: number; // Box 8
  dependentCareBenefits: number; // Box 10
  nonqualifiedPlans: number; // Box 11
  box12Codes: { code: string; amount: number }[]; // Box 12 (a-d)
  statutoryEmployee: boolean; // Box 13
  retirementPlan: boolean; // Box 13
  thirdPartySickPay: boolean; // Box 13
  stateWages: number; // Box 16
  stateIncomeTax: number; // Box 17
  localWages: number; // Box 18
  localIncomeTax: number; // Box 19
  stateCode: string;
  localityName: string;
  taxYear: number;
}

export interface Form1099DIVFields {
  payerName: string;
  payerTIN: string;
  recipientTIN: string;
  recipientName: string;
  ordinaryDividends: number; // Box 1a
  qualifiedDividends: number; // Box 1b
  totalCapitalGainDistributions: number; // Box 2a
  unrecaptured1250Gain: number; // Box 2b
  section1202Gain: number; // Box 2c
  collectiblesGain: number; // Box 2d
  section897Dividends: number; // Box 2e
  section897CapitalGain: number; // Box 2f
  nondividendDistributions: number; // Box 3
  federalIncomeTaxWithheld: number; // Box 4
  section199ADividends: number; // Box 5
  investmentExpenses: number; // Box 6
  foreignTaxPaid: number; // Box 7
  foreignCountry: string; // Box 8
  cashLiquidationDistributions: number; // Box 9
  noncashLiquidationDistributions: number; // Box 10
  exemptInterestDividends: number; // Box 12
  specifiedPrivateActivityBondDividends: number; // Box 13
  stateCode: string;
  stateIdNumber: string;
  stateTaxWithheld: number;
  taxYear: number;
}

export interface Form1099INTFields {
  payerName: string;
  payerTIN: string;
  recipientTIN: string;
  recipientName: string;
  interestIncome: number; // Box 1
  earlyWithdrawalPenalty: number; // Box 2
  interestOnUSSavingsBonds: number; // Box 3
  federalIncomeTaxWithheld: number; // Box 4
  investmentExpenses: number; // Box 5
  foreignTaxPaid: number; // Box 6
  foreignCountry: string; // Box 7
  taxExemptInterest: number; // Box 8
  specifiedPrivateActivityBondInterest: number; // Box 9
  marketDiscount: number; // Box 10
  bondPremium: number; // Box 11
  bondPremiumTreasury: number; // Box 12
  bondPremiumTaxExempt: number; // Box 13
  taxYear: number;
}

export interface Form1099BFields {
  payerName: string;
  payerTIN: string;
  recipientTIN: string;
  recipientName: string;
  transactions: {
    description: string;
    dateAcquired: string;
    dateSold: string;
    proceeds: number; // Box 1d
    costBasis: number; // Box 1e
    accruedMarketDiscount: number;
    washSaleLossDisallowed: number; // Box 1g
    shortTermLongTerm: "short" | "long" | "unknown";
    basisReportedToIRS: boolean;
    type: "covered" | "noncovered";
  }[];
  totalProceeds: number;
  totalCostBasis: number;
  totalGainLoss: number;
  federalIncomeTaxWithheld: number; // Box 4
  taxYear: number;
}

export interface Form1099NECFields {
  payerName: string;
  payerTIN: string;
  recipientTIN: string;
  recipientName: string;
  nonemployeeCompensation: number; // Box 1
  payerMadeDirectSalesOf5000OrMore: boolean; // Box 2
  federalIncomeTaxWithheld: number; // Box 4
  stateCode: string;
  statePayerNumber: string;
  stateIncome: number;
  stateTaxWithheld: number;
  taxYear: number;
}

export interface Form1099MISCFields {
  payerName: string;
  payerTIN: string;
  recipientTIN: string;
  recipientName: string;
  rents: number; // Box 1
  royalties: number; // Box 2
  otherIncome: number; // Box 3
  federalIncomeTaxWithheld: number; // Box 4
  fishingBoatProceeds: number; // Box 5
  medicalHealthcarePayments: number; // Box 6
  payerMadeDirectSales: boolean; // Box 7
  substitutePaymentsInLieuOfDividends: number; // Box 8
  cropInsuranceProceeds: number; // Box 9
  grossProceedsAttorney: number; // Box 10
  fishPurchasedForResale: number; // Box 11
  section409ADeferrals: number; // Box 12
  excessGoldenParachute: number; // Box 13
  nonqualifiedDeferredCompensation: number; // Box 14
  stateCode: string;
  stateTaxWithheld: number;
  taxYear: number;
}

export interface Form1099RFields {
  payerName: string;
  payerTIN: string;
  recipientTIN: string;
  recipientName: string;
  grossDistribution: number; // Box 1
  taxableAmount: number; // Box 2a
  taxableAmountNotDetermined: boolean; // Box 2b
  totalDistribution: boolean; // Box 2b
  capitalGain: number; // Box 3
  federalIncomeTaxWithheld: number; // Box 4
  employeeContributions: number; // Box 5
  netUnrealizedAppreciation: number; // Box 6
  distributionCodes: string[]; // Box 7
  otherAmount: number; // Box 8
  otherPercentage: number; // Box 9a
  totalEmployeeContributions: number; // Box 9b
  amountAllocableToIRR: number; // Box 10
  firstYearOfDesignatedRothContributions: number; // Box 11
  stateTaxWithheld: number; // Box 12
  stateCode: string; // Box 13
  stateDistribution: number; // Box 14
  localTaxWithheld: number; // Box 15
  localDistribution: number; // Box 17
  taxYear: number;
}

export interface Form1098Fields {
  lenderName: string;
  lenderTIN: string;
  borrowerTIN: string;
  borrowerName: string;
  mortgageInterestReceived: number; // Box 1
  outstandingMortgagePrincipal: number; // Box 2
  mortgageOriginationDate: string; // Box 3
  refundOfOverpaidInterest: number; // Box 4
  mortgageInsurancePremiums: number; // Box 5
  pointsPaidOnPurchase: number; // Box 6
  propertyAddress: string; // Box 7
  numberOfProperties: number; // Box 8
  acquisitionDate: string;
  propertySecuringMortgage: string;
  taxYear: number;
}

export interface Form1098EFields {
  lenderName: string;
  lenderTIN: string;
  borrowerTIN: string;
  borrowerName: string;
  studentLoanInterestReceived: number; // Box 1
  lenderReimbursedOrRefunded: boolean; // Box 2
  taxYear: number;
}

export interface CharitableReceiptFields {
  organizationName: string;
  organizationEIN: string;
  organizationAddress: string;
  donorName: string;
  donationDate: string;
  donationAmount: number;
  donationType: "cash" | "property" | "stock" | "other";
  propertyDescription?: string;
  fairMarketValue?: number;
  goodsServicesProvided: boolean;
  goodsServicesValue?: number;
  isQualified501c3: boolean;
  taxYear: number;
}

// Union type for all field types
export type ExtractedFields =
  | { type: "w2"; fields: W2Fields }
  | { type: "1099_div"; fields: Form1099DIVFields }
  | { type: "1099_int"; fields: Form1099INTFields }
  | { type: "1099_b"; fields: Form1099BFields }
  | { type: "1099_nec"; fields: Form1099NECFields }
  | { type: "1099_misc"; fields: Form1099MISCFields }
  | { type: "1099_r"; fields: Form1099RFields }
  | { type: "1098"; fields: Form1098Fields }
  | { type: "1098_e"; fields: Form1098EFields }
  | { type: "charitable_receipt"; fields: CharitableReceiptFields }
  | { type: "unknown"; fields: Record<string, unknown> };

// ============================================================================
// EXTRACTION RESULTS
// ============================================================================

export interface FieldConfidence {
  fieldName: string;
  value: unknown;
  confidence: number; // 0-1
  source: OCRProvider;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProviderExtractionResult {
  provider: OCRProvider;
  success: boolean;
  documentType: TaxDocumentType;
  documentTypeConfidence: number;
  fields: Record<string, unknown>;
  fieldConfidences: FieldConfidence[];
  rawText?: string;
  processingTimeMs: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface ConsolidatedExtractionResult {
  documentId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;

  // Classification
  documentType: TaxDocumentType;
  documentTypeConfidence: number;
  taxYear: number;

  // Consolidated Fields
  extractedData: ExtractedFields;
  overallConfidence: number;

  // Provider Details
  providersUsed: OCRProvider[];
  providerResults: ProviderExtractionResult[];
  consensusFields: string[]; // Fields where all providers agreed
  conflictingFields: {
    fieldName: string;
    values: { provider: OCRProvider; value: unknown; confidence: number }[];
    resolvedValue: unknown;
    resolutionMethod: "highest_confidence" | "consensus" | "manual";
  }[];

  // Status
  status: DocumentProcessingStatus;
  requiresReview: boolean;
  reviewReasons: string[];

  // Validation
  validationErrors: {
    field: string;
    error: string;
    severity: "error" | "warning";
  }[];
  isValid: boolean;

  // Metadata
  processedAt: Date;
  totalProcessingTimeMs: number;
}

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

export interface OCRProviderConfig {
  provider: OCRProvider;
  enabled: boolean;
  priority: number; // Lower = higher priority
  apiKey?: string;
  endpoint?: string;
  timeout: number;
  retries: number;
  supportedDocuments: TaxDocumentType[];
  costPerPage?: number;
}

export const DEFAULT_PROVIDER_CONFIG: OCRProviderConfig[] = [
  {
    provider: "openai_vision",
    enabled: true,
    priority: 1,
    timeout: 30000,
    retries: 2,
    supportedDocuments: [
      "w2",
      "1099_div",
      "1099_int",
      "1099_b",
      "1099_nec",
      "1099_misc",
      "1099_r",
      "1098",
      "1098_e",
      "charitable_receipt",
      "unknown",
    ],
    costPerPage: 0.01,
  },
  {
    provider: "google_vision",
    enabled: true,
    priority: 2,
    timeout: 30000,
    retries: 2,
    supportedDocuments: [
      "w2",
      "1099_div",
      "1099_int",
      "1099_b",
      "1099_nec",
      "1099_misc",
      "1099_r",
      "1098",
      "1098_e",
      "charitable_receipt",
      "unknown",
    ],
    costPerPage: 0.0015,
  },
  {
    provider: "landing_ai",
    enabled: true,
    priority: 3,
    timeout: 45000,
    retries: 2,
    supportedDocuments: [
      "w2",
      "1099_div",
      "1099_int",
      "1099_nec",
      "1099_misc",
      "1098",
      "charitable_receipt",
    ],
    costPerPage: 0.02,
  },
  {
    provider: "azure_di",
    enabled: false,
    priority: 4,
    timeout: 30000,
    retries: 2,
    supportedDocuments: [
      "w2",
      "1099_div",
      "1099_int",
      "1099_b",
      "1099_nec",
      "1099_misc",
      "1099_r",
      "1098",
      "1098_e",
      "charitable_receipt",
      "unknown",
    ],
    costPerPage: 0.001,
  },
];

// ============================================================================
// EXTRACTION PROMPTS & SCHEMAS
// ============================================================================

export const DOCUMENT_CLASSIFICATION_PROMPT = `You are analyzing a tax document image. Your task is to:
1. Identify the type of tax document
2. Extract the tax year if visible
3. Provide a confidence score (0-1)

Respond in JSON format:
{
  "documentType": "w2" | "1099_div" | "1099_int" | "1099_b" | "1099_misc" | "1099_nec" | "1099_r" | "1098" | "1098_e" | "charitable_receipt" | "unknown",
  "taxYear": number,
  "confidence": number,
  "reasoning": "Brief explanation of classification"
}`;

export const W2_EXTRACTION_PROMPT = `Extract all fields from this W-2 tax form. Be precise with numbers and verify SSN/EIN formats.

Return JSON with these fields:
{
  "employerEIN": "XX-XXXXXXX format",
  "employerName": "string",
  "employerAddress": "full address",
  "employeeSSN": "XXX-XX-XXXX format (masked if partially visible)",
  "employeeName": "string",
  "employeeAddress": "full address",
  "wagesTipsOtherComp": number (Box 1),
  "federalIncomeTaxWithheld": number (Box 2),
  "socialSecurityWages": number (Box 3),
  "socialSecurityTaxWithheld": number (Box 4),
  "medicareWagesAndTips": number (Box 5),
  "medicareTaxWithheld": number (Box 6),
  "socialSecurityTips": number (Box 7),
  "allocatedTips": number (Box 8),
  "dependentCareBenefits": number (Box 10),
  "box12Codes": [{"code": "string", "amount": number}],
  "statutoryEmployee": boolean (Box 13),
  "retirementPlan": boolean (Box 13),
  "stateWages": number (Box 16),
  "stateIncomeTax": number (Box 17),
  "stateCode": "2-letter state code",
  "taxYear": number
}

For any field not visible or unclear, use null.`;

export const FORM_1099_DIV_EXTRACTION_PROMPT = `Extract all fields from this 1099-DIV tax form. Be precise with decimal amounts.

Return JSON with these fields:
{
  "payerName": "string",
  "payerTIN": "XX-XXXXXXX format",
  "recipientTIN": "XXX-XX-XXXX format",
  "recipientName": "string",
  "ordinaryDividends": number (Box 1a),
  "qualifiedDividends": number (Box 1b),
  "totalCapitalGainDistributions": number (Box 2a),
  "nondividendDistributions": number (Box 3),
  "federalIncomeTaxWithheld": number (Box 4),
  "section199ADividends": number (Box 5),
  "foreignTaxPaid": number (Box 7),
  "exemptInterestDividends": number (Box 12),
  "taxYear": number
}`;

export const CHARITABLE_RECEIPT_EXTRACTION_PROMPT = `Extract all fields from this charitable donation receipt.

Return JSON with these fields:
{
  "organizationName": "string",
  "organizationEIN": "XX-XXXXXXX format if visible",
  "organizationAddress": "full address",
  "donorName": "string",
  "donationDate": "YYYY-MM-DD format",
  "donationAmount": number,
  "donationType": "cash" | "property" | "stock" | "other",
  "propertyDescription": "string if applicable",
  "fairMarketValue": number if applicable,
  "goodsServicesProvided": boolean,
  "goodsServicesValue": number if applicable,
  "isQualified501c3": boolean,
  "taxYear": number
}`;
