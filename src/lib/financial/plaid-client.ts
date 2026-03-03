/**
 * Plaid Client Factory
 *
 * Singleton PlaidApi instance using the official Plaid SDK.
 */

import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || "sandbox";

function getPlaidEnvironment(): string {
  switch (PLAID_ENV) {
    case "production":
      return PlaidEnvironments.production;
    case "development":
      return PlaidEnvironments.development;
    default:
      return PlaidEnvironments.sandbox;
  }
}

let _plaidClient: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (!_plaidClient) {
    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error(
        "Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET environment variables.",
      );
    }

    const configuration = new Configuration({
      basePath: getPlaidEnvironment(),
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
          "PLAID-SECRET": PLAID_SECRET,
        },
      },
    });

    _plaidClient = new PlaidApi(configuration);
  }

  return _plaidClient;
}

export const plaidClient = getPlaidClient;
