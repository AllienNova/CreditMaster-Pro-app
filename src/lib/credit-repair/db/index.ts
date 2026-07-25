/**
 * Credit Repair Database Services - Index
 *
 * Central export point for all database services.
 * Provides unified access to all CRUD operations.
 */

import creditRepairDbService from "./credit-repair-db-service";
import disputesDbService from "./disputes-db-service";
import goodwillDbService from "./goodwill-db-service";
import negotiationsDbService from "./negotiations-db-service";
import creditCardsDbService from "./credit-cards-db-service";
import creditReportsDbService from "./credit-reports-db-service";
import inquiriesDbService from "./inquiries-db-service";

// Export all services
export * from "./credit-repair-db-service";
export * from "./disputes-db-service";
export * from "./goodwill-db-service";
export * from "./negotiations-db-service";
export * from "./credit-cards-db-service";
export * from "./credit-reports-db-service";
export * from "./inquiries-db-service";

// Export default service objects
export {
  creditRepairDbService,
  disputesDbService,
  goodwillDbService,
  negotiationsDbService,
  creditCardsDbService,
  creditReportsDbService,
  inquiriesDbService,
};

/**
 * Unified database service object
 *
 * Usage:
 * ```typescript
 * import { db } from '@/lib/credit-repair/db';
 *
 * const score = await db.creditRepair.getCreditRepairScore(userId);
 * const disputes = await db.disputes.getDisputesByUser(userId);
 * const cards = await db.creditCards.getCreditCardsByUser(userId);
 * const inquiries = await db.inquiries.getInquiriesByUser(userId);
 * ```
 */
export const db = {
  creditRepair: creditRepairDbService,
  disputes: disputesDbService,
  goodwill: goodwillDbService,
  negotiations: negotiationsDbService,
  creditCards: creditCardsDbService,
  creditReports: creditReportsDbService,
  inquiries: inquiriesDbService,
};
