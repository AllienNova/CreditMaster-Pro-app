/**
 * Credit Bureau Integration - Main Export
 * 
 * Exports all credit bureau integration functionality
 */

import { CreditBureauService as CreditBureauServiceClass } from './credit-bureau-service';

export { CreditBureauService } from './credit-bureau-service';
export { ExperianClient } from './experian-client';
export { EquifaxClient } from './equifax-client';
export { TransUnionClient } from './transunion-client';

export type {
  BureauCredentials,
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
  CreditAnalysis
} from './types';

const CreditBureauIntegration = { CreditBureauService: CreditBureauServiceClass };

export default CreditBureauIntegration;
