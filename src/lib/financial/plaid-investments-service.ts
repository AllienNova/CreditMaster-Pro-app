/**
 * Plaid Investments Service
 *
 * Handles investment holdings, transactions, and securities via the Plaid SDK.
 */

import { getPlaidClient } from "@/lib/financial/plaid-client";

// Types

export interface PlaidHolding {
  accountId: string;
  securityId: string;
  institutionPrice: number;
  institutionPriceAsOf: string | null;
  institutionValue: number;
  costBasis: number | null;
  quantity: number;
  currency: string;
  vestedQuantity: number | null;
  vestedValue: number | null;
}

export interface PlaidSecurity {
  securityId: string;
  name: string | null;
  tickerSymbol: string | null;
  isin: string | null;
  cusip: string | null;
  type: string | null;
  closePrice: number | null;
  closePriceAsOf: string | null;
  currency: string;
  isCashEquivalent: boolean | null;
  sector: string | null;
  industry: string | null;
}

export interface PlaidInvestmentTransaction {
  investmentTransactionId: string;
  accountId: string;
  securityId: string | null;
  date: string;
  name: string;
  quantity: number;
  amount: number;
  price: number;
  fees: number | null;
  type: string;
  subtype: string;
  currency: string;
}

export interface PlaidHoldingsResult {
  holdings: PlaidHolding[];
  securities: PlaidSecurity[];
  accounts: Array<{ accountId: string; name: string; type: string }>;
}

export interface PlaidInvestmentTransactionsResult {
  transactions: PlaidInvestmentTransaction[];
  securities: PlaidSecurity[];
  totalTransactions: number;
}

/**
 * Plaid Investments Service Class
 */
class PlaidInvestmentsService {
  /**
   * Get investment holdings for an access token
   */
  async getHoldings(accessToken: string): Promise<PlaidHoldingsResult> {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    try {
      const client = getPlaidClient();
      const response = await client.investmentsHoldingsGet({
        access_token: accessToken,
      });

      const holdings: PlaidHolding[] = (response.data.holdings ?? []).map(
        (h) => ({
          accountId: h.account_id,
          securityId: h.security_id,
          institutionPrice: h.institution_price,
          institutionPriceAsOf: h.institution_price_as_of ?? null,
          institutionValue: h.institution_value,
          costBasis: h.cost_basis ?? null,
          quantity: h.quantity,
          currency: h.iso_currency_code || h.unofficial_currency_code || "USD",
          vestedQuantity: h.vested_quantity ?? null,
          vestedValue: h.vested_value ?? null,
        }),
      );

      const securities: PlaidSecurity[] = (response.data.securities ?? []).map(
        (s) => this.mapSecurity(s),
      );

      const accounts = (response.data.accounts ?? []).map((a) => ({
        accountId: a.account_id,
        name: a.official_name || a.name,
        type: a.type as string,
      }));

      return { holdings, securities, accounts };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get investment transactions for an access token and date range
   */
  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
  ): Promise<PlaidInvestmentTransactionsResult> {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    try {
      const client = getPlaidClient();
      const response = await client.investmentsTransactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
      });

      const transactions: PlaidInvestmentTransaction[] = (
        response.data.investment_transactions ?? []
      ).map((t) => ({
        investmentTransactionId: t.investment_transaction_id,
        accountId: t.account_id,
        securityId: t.security_id ?? null,
        date: t.date,
        name: t.name,
        quantity: t.quantity,
        amount: t.amount,
        price: t.price,
        fees: t.fees ?? null,
        type: t.type as string,
        subtype: t.subtype as string,
        currency: t.iso_currency_code || t.unofficial_currency_code || "USD",
      }));

      const securities: PlaidSecurity[] = (response.data.securities ?? []).map(
        (s) => this.mapSecurity(s),
      );

      return {
        transactions,
        securities,
        totalTransactions: response.data.total_investment_transactions,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unique securities from investment holdings
   */
  async getSecurities(accessToken: string): Promise<PlaidSecurity[]> {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    const result = await this.getHoldings(accessToken);
    return result.securities;
  }

  /**
   * Map a Plaid SDK Security object to our PlaidSecurity interface
   */
  private mapSecurity(s: {
    security_id: string;
    name: string | null;
    ticker_symbol: string | null;
    isin: string | null;
    cusip: string | null;
    type: string | null;
    close_price: number | null;
    close_price_as_of: string | null;
    iso_currency_code: string | null;
    unofficial_currency_code: string | null;
    is_cash_equivalent: boolean | null;
    sector: string | null;
    industry: string | null;
  }): PlaidSecurity {
    return {
      securityId: s.security_id,
      name: s.name,
      tickerSymbol: s.ticker_symbol,
      isin: s.isin,
      cusip: s.cusip,
      type: s.type,
      closePrice: s.close_price,
      closePriceAsOf: s.close_price_as_of,
      currency: s.iso_currency_code || s.unofficial_currency_code || "USD",
      isCashEquivalent: s.is_cash_equivalent,
      sector: s.sector,
      industry: s.industry,
    };
  }
}

// Export singleton instance
export const plaidInvestmentsService = new PlaidInvestmentsService();
export default plaidInvestmentsService;
