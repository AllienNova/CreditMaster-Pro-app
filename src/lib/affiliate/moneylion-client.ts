/**
 * MoneyLion Engine API Client
 *
 * Handles communication with the MoneyLion Engine API for product catalog,
 * pre-qualification, click tracking, and conversion status.
 */

import { randomUUID } from "crypto";
import type {
  MoneyLionProduct,
  MoneyLionProductCategory,
  UserMatchProfile,
  ClickEvent,
  PreQualResult,
  MoneyLionApiError,
} from "./types";

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_BASE_URL = "https://engine.moneylion.com/api/v1";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// =============================================================================
// MoneyLion Client
// =============================================================================

class MoneyLionClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.MONEYLION_API_URL || DEFAULT_BASE_URL;
    this.apiKey = process.env.MONEYLION_API_KEY || "";
  }

  /**
   * Fetch product catalog, optionally filtered by category
   */
  async getProductCatalog(
    category?: MoneyLionProductCategory,
  ): Promise<MoneyLionProduct[]> {
    const params = category ? `?category=${category}` : "";
    return this.request<MoneyLionProduct[]>(
      `/products${params}`,
      "GET",
    );
  }

  /**
   * Pre-qualify a user for a specific product
   */
  async preQualify(
    userId: string,
    productId: string,
    profile: UserMatchProfile,
  ): Promise<PreQualResult> {
    return this.request<PreQualResult>(
      `/products/${productId}/prequal`,
      "POST",
      { userId, profile },
    );
  }

  /**
   * Track a referral click event
   */
  async trackClick(event: Omit<ClickEvent, "clickId">): Promise<ClickEvent> {
    const clickId = `mlclk_${randomUUID().replace(/-/g, "")}`;
    const fullEvent: ClickEvent = { ...event, clickId };

    await this.request<{ success: boolean }>(
      "/clicks",
      "POST",
      fullEvent,
    );

    return fullEvent;
  }

  /**
   * Check if a click has converted
   */
  async getConversionStatus(
    clickId: string,
  ): Promise<{ clickId: string; status: "converted" | "pending" | "expired"; convertedAt?: string }> {
    return this.request<{ clickId: string; status: "converted" | "pending" | "expired"; convertedAt?: string }>(
      `/clicks/${clickId}/conversion`,
      "GET",
    );
  }

  /**
   * Get products offered by a specific partner
   */
  async getPartnerProducts(partnerId: string): Promise<MoneyLionProduct[]> {
    return this.request<MoneyLionProduct[]>(
      `/partners/${partnerId}/products`,
      "GET",
    );
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Make an authenticated API request with retry logic
   */
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    body?: unknown,
  ): Promise<T> {
    if (!this.apiKey) {
      throw this.createError(
        401,
        "MoneyLion API key not configured. Set MONEYLION_API_KEY environment variable.",
        "MISSING_API_KEY",
        false,
      );
    }

    let lastError: MoneyLionApiError | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        const options: RequestInit = { method, headers };
        if (body && (method === "POST" || method === "PUT")) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "Unknown error");
          const error = this.createError(
            response.status,
            errorBody,
            undefined,
            this.isRetryable(response.status),
          );

          if (!error.retryable || attempt === MAX_RETRIES) {
            throw error;
          }

          lastError = error;
          await this.delay(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        return (await response.json()) as T;
      } catch (error: unknown) {
        if (this.isMoneyLionApiError(error)) {
          if (!error.retryable || attempt === MAX_RETRIES) {
            throw error;
          }
          lastError = error;
        } else {
          const networkError = this.createError(
            0,
            error instanceof Error ? error.message : "Network error",
            "NETWORK_ERROR",
            attempt < MAX_RETRIES,
          );

          if (attempt === MAX_RETRIES) {
            throw networkError;
          }
          lastError = networkError;
        }

        await this.delay(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }

    throw lastError || this.createError(0, "Request failed after retries", "MAX_RETRIES", false);
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private isMoneyLionApiError(error: unknown): error is MoneyLionApiError {
    return (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      "message" in error &&
      "retryable" in error
    );
  }

  private createError(
    status: number,
    message: string,
    code?: string,
    retryable = false,
  ): MoneyLionApiError {
    return { status, message, code, retryable };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton
export const moneyLionClient = new MoneyLionClient();
export default moneyLionClient;
