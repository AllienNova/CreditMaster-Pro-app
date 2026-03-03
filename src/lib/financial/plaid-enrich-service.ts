/**
 * Plaid Transaction Enrich Service
 *
 * Enriches transactions with merchant info, categories, logos, and location via the Plaid SDK.
 */

import { getPlaidClient } from "@/lib/financial/plaid-client";
import {
  EnrichTransactionDirection,
  type ClientProvidedEnrichedTransaction,
} from "plaid";

// Types

export interface EnrichTransactionInput {
  id: string;
  description: string;
  amount: number;
  direction: "INFLOW" | "OUTFLOW";
  iso_currency_code: string;
  account_type?: string;
  account_subtype?: string;
  date_posted?: string;
  mcc?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    postal_code?: string;
  };
}

export interface EnrichedCounterparty {
  name: string | null;
  type: string | null;
  entityId: string | null;
  logoUrl: string | null;
  website: string | null;
  phoneNumber: string | null;
}

export interface EnrichedLocation {
  address: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  storeNumber: string | null;
}

export interface PersonalFinanceCategoryResult {
  primary: string;
  detailed: string;
  confidenceLevel: string | null;
}

export interface EnrichedTransaction {
  id: string;
  description: string;
  amount: number;
  direction: string | null;
  isoCurrencyCode: string;
  merchantName: string | null;
  logoUrl: string | null;
  website: string | null;
  counterparties: EnrichedCounterparty[];
  location: EnrichedLocation;
  personalFinanceCategory: PersonalFinanceCategoryResult | null;
  personalFinanceCategoryIconUrl: string | null;
  paymentChannel: string | null;
  phoneNumber: string | null;
  checkNumber: string | null;
  legacyCategory: string[] | null;
  legacyCategoryId: string | null;
}

export interface EnrichTransactionsResult {
  enrichedTransactions: EnrichedTransaction[];
  requestId: string | null;
}

export interface PlaidCategory {
  categoryId: string;
  group: string;
  hierarchy: string[];
}

export interface CategoriesResult {
  categories: PlaidCategory[];
  requestId: string;
}

// Error helper

interface PlaidApiError {
  response?: {
    status?: number;
    data?: {
      error_type?: string;
      error_code?: string;
      error_message?: string;
      display_message?: string | null;
    };
  };
}

function isPlaidApiError(error: unknown): error is PlaidApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as PlaidApiError).response === "object"
  );
}

function extractPlaidError(error: unknown): Error {
  if (isPlaidApiError(error) && error.response?.data) {
    const { error_type, error_code, error_message } = error.response.data;
    const statusCode = error.response.status ?? 500;
    const message = `Plaid API error [${statusCode}]: ${error_type ?? "UNKNOWN"} - ${error_code ?? "UNKNOWN"} - ${error_message ?? "Unknown error"}`;
    const enrichedError = new Error(message);
    (enrichedError as unknown as Record<string, unknown>).statusCode =
      statusCode;
    (enrichedError as unknown as Record<string, unknown>).errorType =
      error_type;
    (enrichedError as unknown as Record<string, unknown>).errorCode =
      error_code;
    return enrichedError;
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

/**
 * Plaid Transaction Enrich Service Class
 */
class PlaidEnrichService {
  /**
   * Enrich an array of transactions with merchant info, categories, logos.
   * Maximum of 100 transactions per request.
   */
  async enrichTransactions(
    transactions: EnrichTransactionInput[],
    accountType: string = "depository",
  ): Promise<EnrichTransactionsResult> {
    if (!transactions || transactions.length === 0) {
      return {
        enrichedTransactions: [],
        requestId: null,
      };
    }

    if (transactions.length > 100) {
      throw new Error(
        "Maximum of 100 transactions per request. Received: " +
          transactions.length,
      );
    }

    try {
      const client = getPlaidClient();

      const plaidTransactions = transactions.map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        direction:
          t.direction === "INFLOW"
            ? EnrichTransactionDirection.Inflow
            : EnrichTransactionDirection.Outflow,
        iso_currency_code: t.iso_currency_code,
        account_type: t.account_type,
        account_subtype: t.account_subtype,
        date_posted: t.date_posted,
        mcc: t.mcc,
        location: t.location
          ? {
              country: t.location.country,
              region: t.location.region,
              city: t.location.city,
              postal_code: t.location.postal_code,
            }
          : undefined,
      }));

      const response = await client.transactionsEnrich({
        account_type: accountType,
        transactions: plaidTransactions,
      });

      const enrichedTransactions: EnrichedTransaction[] = (
        response.data.enriched_transactions ?? []
      ).map((et) => this.mapEnrichedTransaction(et));

      return {
        enrichedTransactions,
        requestId: response.data.request_id ?? null,
      };
    } catch (error) {
      throw extractPlaidError(error);
    }
  }

  /**
   * Get Plaid's transaction category taxonomy
   */
  async getTransactionCategories(): Promise<CategoriesResult> {
    try {
      const client = getPlaidClient();
      const response = await client.categoriesGet({});

      const categories: PlaidCategory[] = (
        response.data.categories ?? []
      ).map((c) => ({
        categoryId: c.category_id,
        group: c.group,
        hierarchy: c.hierarchy ?? [],
      }));

      return {
        categories,
        requestId: response.data.request_id,
      };
    } catch (error) {
      throw extractPlaidError(error);
    }
  }

  /**
   * Map a Plaid SDK enriched transaction to our interface
   */
  private mapEnrichedTransaction(
    et: ClientProvidedEnrichedTransaction,
  ): EnrichedTransaction {
    const enrichments = et.enrichments;
    const counterpartiesRaw = enrichments.counterparties ?? [];
    const locationRaw = enrichments.location;
    const pfc = enrichments.personal_finance_category;

    return {
      id: et.id,
      description: et.description,
      amount: et.amount,
      direction: (et.direction as string) ?? null,
      isoCurrencyCode: et.iso_currency_code,
      merchantName: enrichments.merchant_name ?? null,
      logoUrl: enrichments.logo_url ?? null,
      website: enrichments.website ?? null,
      counterparties: counterpartiesRaw.map((cp) => ({
        name: cp.name ?? null,
        type: (cp.type as string) ?? null,
        entityId: cp.entity_id ?? null,
        logoUrl: cp.logo_url ?? null,
        website: cp.website ?? null,
        phoneNumber: cp.phone_number ?? null,
      })),
      location: {
        address: locationRaw.address ?? null,
        city: locationRaw.city ?? null,
        region: locationRaw.region ?? null,
        postalCode: locationRaw.postal_code ?? null,
        country: locationRaw.country ?? null,
        lat: locationRaw.lat ?? null,
        lon: locationRaw.lon ?? null,
        storeNumber: locationRaw.store_number ?? null,
      },
      personalFinanceCategory: pfc
        ? {
            primary: pfc.primary ?? "",
            detailed: pfc.detailed ?? "",
            confidenceLevel: pfc.confidence_level ?? null,
          }
        : null,
      personalFinanceCategoryIconUrl:
        enrichments.personal_finance_category_icon_url ?? null,
      paymentChannel: (enrichments.payment_channel as string) ?? null,
      phoneNumber: enrichments.phone_number ?? null,
      checkNumber: enrichments.check_number ?? null,
      legacyCategory: enrichments.legacy_category ?? null,
      legacyCategoryId: enrichments.legacy_category_id ?? null,
    };
  }
}

// Export singleton instance
export const plaidEnrichService = new PlaidEnrichService();
export default plaidEnrichService;
