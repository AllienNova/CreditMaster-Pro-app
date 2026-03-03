/**
 * Credit Bureau Integration - Main Export
 *
 * Exports all credit bureau integration functionality
 */

import { CreditBureauService as CreditBureauServiceClass } from "./credit-bureau-service";

export { CreditBureauService } from "./credit-bureau-service";
export { ExperianClient } from "./experian-client";
export { EquifaxClient } from "./equifax-client";
export { TransUnionClient } from "./transunion-client";
export { MockCreditBureauAdapter } from "./mock-credit-bureau-adapter";
export type { MockAdapterOptions } from "./mock-credit-bureau-adapter";

// Credit Error Detector — identity theft assessment, severity scoring, error persistence
export { CreditErrorDetector, creditErrorDetector } from "./credit-error-detector";
export type {
  IdentityTheftRiskLevel,
  IdentityTheftIndicator,
  IdentityTheftIndicatorType,
  IdentityTheftAssessment,
  DetectedErrorRecord,
  ErrorTrendAnalysis,
} from "./credit-error-detector";

// Inquiry Removal Service — lifecycle management, letter generation, outcome tracking
export { InquiryRemovalService, inquiryRemovalService } from "./inquiry-removal-service";
export type {
  InquiryRemovalStatus,
  RemovalReason,
  InquiryForRemoval,
  InquiryRemovalLetter,
  InquiryRemovalRecord,
  InquiryAnalysisSummary,
  BulkRemovalResult,
} from "./inquiry-removal-service";

export type {
  BureauCredentials,
  BureauApiEnvironment,
  SingleBureauCredential,
  BureauConfig,
  BureauCredentialStatus,
  CredentialValidationResult,
  Bureau,
  ReportType,
  CreditReportRequest,
  CreditReport,
  CreditAccount,
  PaymentHistory,
  CreditInquiry,
  PublicRecord,
  DisputeSubmission,
  BureauResponse,
  CreditMonitoringAlert,
  UserPII,
  Address,
  CreditUtilization,
  CreditAnalysis,
  CreditBureauAdapter,
  CreditScoreHistoryEntry,
  ScoreHistoryQuery,
  BureauConnectionStatus,
} from "./types";

const CreditBureauIntegration = {
  CreditBureauService: CreditBureauServiceClass,
};

export default CreditBureauIntegration;
