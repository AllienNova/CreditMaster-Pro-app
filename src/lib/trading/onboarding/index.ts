/**
 * Trading Onboarding Module
 *
 * Barrel export for KYC, document collection, and account creation services.
 */

// KYC Service
export {
  BrokerKycService,
  default as brokerKycService,
} from "./broker-kyc-service";
export type {
  KycProfile,
  KycAddress,
  KycStatus,
  KycStatusValue,
  KycSubmissionResult,
  KycValidationResult,
  EmploymentStatus,
  InvestmentExperience,
  InvestmentObjective,
  RiskTolerance,
} from "./broker-kyc-service";

// Document Collector
export {
  KycDocumentCollector,
  default as kycDocumentCollector,
} from "./kyc-document-collector";
export type {
  KycDocument,
  KycDocumentType,
  DocumentStatus,
  DocumentRequirement,
  DocumentValidationResult,
  FileInfo,
  MissingDocumentReport,
} from "./kyc-document-collector";

// Account Creator
export {
  BrokerAccountCreator,
  default as brokerAccountCreator,
} from "./broker-account-creator";
export type {
  BrokerAccountRequest,
  BrokerAccount,
  AccountCreationResult,
  MultiAccountCreationResult,
  AccountType,
  AccountStatus,
} from "./broker-account-creator";
