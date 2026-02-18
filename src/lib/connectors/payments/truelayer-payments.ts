/**
 * TrueLayer Payments Connector
 *
 * Open Banking payments for EU/UK via TrueLayer Payments API.
 * Supports instant bank payments and payment initiation.
 */

import {
  BaseConnector,
  ConnectorConfig,
  HealthCheckResult,
  Region,
} from "../types";
import { createHash, createSign, randomBytes } from "crypto";

// =============================================================================
// Configuration
// =============================================================================

interface TrueLayerPaymentsConfig extends ConnectorConfig {
  clientId: string;
  clientSecret: string;
  signingKeyId: string;
  privateKey: string;
  webhookSecret?: string;
  sandbox?: boolean;
}

// =============================================================================
// Payment Types
// =============================================================================

export type PaymentStatus =
  | "authorization_required"
  | "authorizing"
  | "authorized"
  | "executed"
  | "settled"
  | "failed";

export type PaymentMethod = "bank_transfer" | "mandate";

export interface PaymentAmount {
  currency: string;
  value: number; // In minor units (cents/pence)
}

export interface Beneficiary {
  type: "merchant_account" | "external_account";
  merchantAccountId?: string;
  accountHolderName?: string;
  accountIdentifier?: {
    type: "sort_code_account_number" | "iban";
    sortCode?: string;
    accountNumber?: string;
    iban?: string;
  };
}

export interface Remitter {
  accountHolderName?: string;
  accountIdentifier?: {
    type: "sort_code_account_number" | "iban";
    sortCode?: string;
    accountNumber?: string;
    iban?: string;
  };
}

export interface PaymentRequest {
  amount: PaymentAmount;
  beneficiary: Beneficiary;
  remitter?: Remitter;
  reference: string;
  userId?: string;
  metadata?: Record<string, string>;
}

export interface Payment {
  id: string;
  resourceToken: string;
  status: PaymentStatus;
  amount: PaymentAmount;
  beneficiary: Beneficiary;
  remitter?: Remitter;
  reference: string;
  authorizationFlow?: {
    type: "redirect" | "provider_selection";
    redirectUri?: string;
    providers?: Array<{
      id: string;
      name: string;
      logoUri: string;
    }>;
  };
  createdAt: Date;
  executedAt?: Date;
  settledAt?: Date;
  failureReason?: string;
  metadata?: Record<string, string>;
}

export interface PaymentAuthLink {
  paymentId: string;
  authUri: string;
  resourceToken: string;
  expiresAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  status: "pending" | "executed" | "failed";
  amount: PaymentAmount;
  reference: string;
  createdAt: Date;
  executedAt?: Date;
  failureReason?: string;
}

export interface MerchantAccount {
  id: string;
  currency: string;
  accountHolderName: string;
  accountIdentifier: {
    type: "sort_code_account_number" | "iban";
    sortCode?: string;
    accountNumber?: string;
    iban?: string;
  };
  availableBalance: number;
}

// =============================================================================
// Standing Order / Mandate Types
// =============================================================================

export interface MandateRequest {
  beneficiary: Beneficiary;
  remitter?: Remitter;
  reference: string;
  constraints: {
    maximumIndividualAmount?: PaymentAmount;
    periodicLimits?: {
      period: "day" | "week" | "fortnight" | "month" | "year";
      maximumAmount: PaymentAmount;
    };
    validFrom?: Date;
    validTo?: Date;
  };
  userId?: string;
  metadata?: Record<string, string>;
}

export interface Mandate {
  id: string;
  status: "authorization_required" | "authorized" | "revoked" | "failed";
  beneficiary: Beneficiary;
  remitter?: Remitter;
  reference: string;
  constraints: MandateRequest["constraints"];
  authorizationFlow?: Payment["authorizationFlow"];
  createdAt: Date;
  authorizedAt?: Date;
  revokedAt?: Date;
  metadata?: Record<string, string>;
}

// =============================================================================
// TrueLayer Payments Connector
// =============================================================================

export class TrueLayerPaymentsConnector extends BaseConnector<TrueLayerPaymentsConfig> {
  readonly name = "truelayer_payments";
  readonly type = "payments" as const;
  readonly supportedRegions: Region[] = ["GB", "EU"];

  private baseUrl: string;
  private authUrl: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: TrueLayerPaymentsConfig) {
    super(config);
    this.baseUrl = config.sandbox
      ? "https://api.truelayer-sandbox.com"
      : "https://api.truelayer.com";
    this.authUrl = config.sandbox
      ? "https://auth.truelayer-sandbox.com"
      : "https://auth.truelayer.com";
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async initialize(): Promise<void> {
    await this.authenticate();
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      await this.authenticate();
      const latencyMs = Date.now() - start;

      return {
        success: true,
        latencyMs,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: 0,
        error: error instanceof Error ? error : new Error("Unknown error"),
      };
    }
  }

  // ===========================================================================
  // Authentication
  // ===========================================================================

  private async authenticate(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }

    const response = await fetch(`${this.authUrl}/connect/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "client_credentials",
        scope: "payments",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `TrueLayer authentication failed: ${response.statusText}`,
      );
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useResourceToken?: string,
    idempotencyKey?: string,
  ): Promise<T> {
    if (!useResourceToken) {
      await this.authenticate();
    }

    const token = useResourceToken || this.accessToken;

    const method = (options.method || "GET").toUpperCase();
    const isMutation = method !== "GET" && method !== "HEAD";

    // Use provided idempotency key or generate deterministic one from request body
    const requestBody =
      typeof options.body === "string" ? options.body : undefined;
    const idemKey = isMutation
      ? idempotencyKey || this.generateIdempotencyKey(requestBody)
      : undefined;

    const requestHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(idemKey ? { "Idempotency-Key": idemKey } : {}),
    };

    if (this.shouldSignRequest(method)) {
      requestHeaders["Tl-Signature"] = this.createTlSignature({
        method,
        path: endpoint,
        headers: requestHeaders,
        body: requestBody,
      });
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...requestHeaders,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TrueLayer API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ===========================================================================
  // Payments
  // ===========================================================================

  /**
   * Create a payment
   */
  async createPayment(request: PaymentRequest): Promise<PaymentAuthLink> {
    const payload = {
      amount_in_minor: request.amount.value,
      currency: request.amount.currency,
      payment_method: {
        type: "bank_transfer",
        provider_selection: {
          type: "user_selected",
        },
        beneficiary: this.formatBeneficiary(request.beneficiary),
        reference: request.reference,
      },
      user: request.userId ? { id: request.userId } : undefined,
      metadata: request.metadata,
    };

    // Sign the request
    const signedPayload = await this.signRequest(payload);

    const response = await this.request<{
      id: string;
      resource_token: string;
      user: { id: string };
      status: string;
    }>("/v3/payments", {
      method: "POST",
      body: JSON.stringify(signedPayload),
    });

    // Create authorization link
    const authUri = this.buildAuthUri(response.id, response.resource_token);

    return {
      paymentId: response.id,
      authUri,
      resourceToken: response.resource_token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    };
  }

  /**
   * Get payment status
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const response = await this.request<Record<string, unknown>>(
      `/v3/payments/${paymentId}`,
    );

    return this.mapPayment(response);
  }

  /**
   * Get payment by resource token (for status during authorization)
   */
  async getPaymentByToken(resourceToken: string): Promise<Payment> {
    const response = await this.request<Record<string, unknown>>(
      "/v3/payments/status",
      {},
      resourceToken,
    );

    return this.mapPayment(response);
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(paymentId: string): Promise<void> {
    await this.request(`/v3/payments/${paymentId}/actions/cancel`, {
      method: "POST",
    });
  }

  /**
   * List payments
   */
  async listPayments(options?: {
    userId?: string;
    status?: PaymentStatus;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<Payment[]> {
    const params = new URLSearchParams();
    if (options?.userId) params.set("user_id", options.userId);
    if (options?.status) params.set("status", options.status);
    if (options?.from) params.set("from", options.from.toISOString());
    if (options?.to) params.set("to", options.to.toISOString());
    if (options?.limit) params.set("limit", options.limit.toString());

    const response = await this.request<{ items: Record<string, unknown>[] }>(
      `/v3/payments?${params.toString()}`,
    );

    return (response.items || []).map(this.mapPayment);
  }

  // ===========================================================================
  // Refunds
  // ===========================================================================

  /**
   * Create a refund for a payment
   */
  async createRefund(
    paymentId: string,
    amount: PaymentAmount,
    reference: string,
  ): Promise<Refund> {
    const response = await this.request<Record<string, unknown>>(
      `/v3/payments/${paymentId}/refunds`,
      {
        method: "POST",
        body: JSON.stringify({
          amount_in_minor: amount.value,
          reference,
        }),
      },
    );

    return {
      id: response.id as string,
      paymentId,
      status: response.status as Refund["status"],
      amount,
      reference,
      createdAt: new Date(response.created_at as string),
      executedAt: response.executed_at
        ? new Date(response.executed_at as string)
        : undefined,
    };
  }

  /**
   * Get refund status
   */
  async getRefund(paymentId: string, refundId: string): Promise<Refund> {
    const response = await this.request<Record<string, unknown>>(
      `/v3/payments/${paymentId}/refunds/${refundId}`,
    );

    return {
      id: response.id as string,
      paymentId,
      status: response.status as Refund["status"],
      amount: {
        currency: response.currency as string,
        value: response.amount_in_minor as number,
      },
      reference: response.reference as string,
      createdAt: new Date(response.created_at as string),
      executedAt: response.executed_at
        ? new Date(response.executed_at as string)
        : undefined,
      failureReason: response.failure_reason as string | undefined,
    };
  }

  // ===========================================================================
  // Mandates (Recurring Payments)
  // ===========================================================================

  /**
   * Create a mandate for recurring payments
   */
  async createMandate(request: MandateRequest): Promise<PaymentAuthLink> {
    const payload = {
      mandate: {
        type: "sweeping",
        beneficiary: this.formatBeneficiary(request.beneficiary),
        reference: request.reference,
        constraints: {
          maximum_individual_amount: request.constraints.maximumIndividualAmount
            ? {
                currency: request.constraints.maximumIndividualAmount.currency,
                amount_in_minor:
                  request.constraints.maximumIndividualAmount.value,
              }
            : undefined,
          periodic_limits: request.constraints.periodicLimits
            ? {
                period: request.constraints.periodicLimits.period,
                maximum_amount: {
                  currency:
                    request.constraints.periodicLimits.maximumAmount.currency,
                  amount_in_minor:
                    request.constraints.periodicLimits.maximumAmount.value,
                },
              }
            : undefined,
          valid_from: request.constraints.validFrom?.toISOString(),
          valid_to: request.constraints.validTo?.toISOString(),
        },
      },
      user: request.userId ? { id: request.userId } : undefined,
      metadata: request.metadata,
    };

    const response = await this.request<{
      id: string;
      resource_token: string;
      status: string;
    }>("/v3/mandates", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const authUri = this.buildMandateAuthUri(
      response.id,
      response.resource_token,
    );

    return {
      paymentId: response.id,
      authUri,
      resourceToken: response.resource_token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  /**
   * Get mandate status
   */
  async getMandate(mandateId: string): Promise<Mandate> {
    const response = await this.request<Record<string, unknown>>(
      `/v3/mandates/${mandateId}`,
    );

    return this.mapMandate(response);
  }

  /**
   * Revoke a mandate
   */
  async revokeMandate(mandateId: string): Promise<void> {
    await this.request(`/v3/mandates/${mandateId}/revoke`, {
      method: "POST",
    });
  }

  /**
   * Create payment using a mandate
   */
  async createMandatePayment(
    mandateId: string,
    amount: PaymentAmount,
    reference: string,
  ): Promise<Payment> {
    const response = await this.request<Record<string, unknown>>(
      `/v3/mandates/${mandateId}/payments`,
      {
        method: "POST",
        body: JSON.stringify({
          amount_in_minor: amount.value,
          currency: amount.currency,
          reference,
        }),
      },
    );

    return this.mapPayment(response);
  }

  // ===========================================================================
  // Merchant Accounts
  // ===========================================================================

  /**
   * Get merchant accounts
   */
  async getMerchantAccounts(): Promise<MerchantAccount[]> {
    const response = await this.request<{ items: Record<string, unknown>[] }>(
      "/v3/merchant-accounts",
    );

    return (response.items || []).map((item) => ({
      id: item.id as string,
      currency: item.currency as string,
      accountHolderName: item.account_holder_name as string,
      accountIdentifier: (Array.isArray(
        (item as Record<string, unknown>).account_identifiers,
      )
        ? (
            (item as Record<string, unknown>).account_identifiers as unknown[]
          )[0]
        : undefined) as MerchantAccount["accountIdentifier"],
      availableBalance: (item.available_balance_in_minor as number) / 100,
    }));
  }

  /**
   * Get merchant account balance
   */
  async getMerchantAccountBalance(accountId: string): Promise<number> {
    const accounts = await this.getMerchantAccounts();
    const account = accounts.find((a) => a.id === accountId);
    return account?.availableBalance || 0;
  }

  // ===========================================================================
  // Payouts
  // ===========================================================================

  /**
   * Create a payout from merchant account
   */
  async createPayout(
    merchantAccountId: string,
    amount: PaymentAmount,
    beneficiary: Beneficiary,
    reference: string,
  ): Promise<Payment> {
    const response = await this.request<Record<string, unknown>>(
      `/v3/payouts`,
      {
        method: "POST",
        body: JSON.stringify({
          merchant_account_id: merchantAccountId,
          amount_in_minor: amount.value,
          currency: amount.currency,
          beneficiary: this.formatBeneficiary(beneficiary),
          reference,
        }),
      },
    );

    return this.mapPayment(response);
  }

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error("Webhook secret not configured");
    }

    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: string): {
    type:
      | "payment_executed"
      | "payment_settled"
      | "payment_failed"
      | "refund_executed"
      | "mandate_authorized";
    paymentId?: string;
    mandateId?: string;
    refundId?: string;
    status: string;
    data: Record<string, unknown>;
  } {
    const event = JSON.parse(payload);
    return {
      type: event.type,
      paymentId: event.payment_id,
      mandateId: event.mandate_id,
      refundId: event.refund_id,
      status: event.status,
      data: event,
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Generate a deterministic idempotency key from the request body.
   * This ensures retries of the same request use the same key.
   */
  private generateIdempotencyKey(requestBody?: string): string {
    if (requestBody) {
      // Deterministic key based on content hash
      return createHash("sha256")
        .update(requestBody)
        .digest("hex")
        .substring(0, 32);
    }
    // For non-mutation requests, use a random key
    return randomBytes(16).toString("hex");
  }

  private formatBeneficiary(beneficiary: Beneficiary): Record<string, unknown> {
    if (beneficiary.type === "merchant_account") {
      return {
        type: "merchant_account",
        merchant_account_id: beneficiary.merchantAccountId,
      };
    }

    return {
      type: "external_account",
      account_holder_name: beneficiary.accountHolderName,
      account_identifier: beneficiary.accountIdentifier,
    };
  }

  private buildAuthUri(paymentId: string, resourceToken: string): string {
    const params = new URLSearchParams({
      payment_id: paymentId,
      resource_token: resourceToken,
      redirect_uri: process.env.TRUELAYER_REDIRECT_URI || "",
    });

    return `${this.authUrl}/payments#${params.toString()}`;
  }

  private buildMandateAuthUri(
    mandateId: string,
    resourceToken: string,
  ): string {
    const params = new URLSearchParams({
      mandate_id: mandateId,
      resource_token: resourceToken,
      redirect_uri: process.env.TRUELAYER_REDIRECT_URI || "",
    });

    return `${this.authUrl}/mandates#${params.toString()}`;
  }

  private async signRequest(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // In production, sign with private key
    // For now, return payload as-is
    return payload;
  }

  private shouldSignRequest(method: string): boolean {
    if (this.config.sandbox) return false;
    return (
      method === "POST" ||
      method === "PUT" ||
      method === "PATCH" ||
      method === "DELETE"
    );
  }

  private createTlSignature(input: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
  }): string {
    if (!this.config.signingKeyId) {
      throw new Error("TrueLayer signingKeyId not configured");
    }
    if (!this.config.privateKey) {
      throw new Error("TrueLayer privateKey not configured");
    }
    const idempotencyKey = input.headers["Idempotency-Key"];
    if (!idempotencyKey) {
      throw new Error(
        "Idempotency-Key header required for TrueLayer request signing",
      );
    }

    const normalizedPath = this.normalizeSigningPath(input.path);
    const tlHeaders = ["Idempotency-Key"];

    const joseHeader = {
      alg: "ES512",
      kid: this.config.signingKeyId,
      tl_version: "2",
      tl_headers: tlHeaders.join(","),
    };

    const encodedHeader = this.base64UrlEncode(
      Buffer.from(JSON.stringify(joseHeader), "utf8"),
    );

    const payloadParts: string[] = [];
    payloadParts.push(`${input.method.toUpperCase()} ${normalizedPath}\n`);

    for (const headerName of tlHeaders) {
      const headerValue = input.headers[headerName];
      if (!headerValue) {
        throw new Error(`Missing required header for signing: ${headerName}`);
      }
      payloadParts.push(`${headerName}: ${headerValue}\n`);
    }

    if (input.body) {
      payloadParts.push(input.body);
    }

    const signingPayload = payloadParts.join("");
    const encodedPayload = this.base64UrlEncode(
      Buffer.from(signingPayload, "utf8"),
    );
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signer = createSign("SHA512");
    signer.update(signingInput);
    signer.end();

    const signature = signer.sign({
      key: this.config.privateKey,
      dsaEncoding: "ieee-p1363",
    });

    return `${encodedHeader}..${this.base64UrlEncode(signature)}`;
  }

  private normalizeSigningPath(path: string): string {
    const [pathOnly, query] = path.split("?");
    const trimmed = (pathOnly || "").replace(/\/+$/g, "");
    const normalized = trimmed.length === 0 ? "/" : trimmed;
    return query ? `${normalized}?${query}` : normalized;
  }

  private base64UrlEncode(input: Buffer): string {
    return input
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  private mapPayment(data: Record<string, unknown>): Payment {
    return {
      id: data.id as string,
      resourceToken: (data.resource_token as string) || "",
      status: data.status as PaymentStatus,
      amount: {
        currency: data.currency as string,
        value: data.amount_in_minor as number,
      },
      beneficiary: data.beneficiary as Beneficiary,
      remitter: data.remitter as Remitter | undefined,
      reference:
        ((data.payment_method as Record<string, unknown>)
          ?.reference as string) || "",
      authorizationFlow:
        data.authorization_flow as Payment["authorizationFlow"],
      createdAt: new Date(data.created_at as string),
      executedAt: data.executed_at
        ? new Date(data.executed_at as string)
        : undefined,
      settledAt: data.settled_at
        ? new Date(data.settled_at as string)
        : undefined,
      failureReason: data.failure_reason as string | undefined,
      metadata: data.metadata as Record<string, string> | undefined,
    };
  }

  private mapMandate(data: Record<string, unknown>): Mandate {
    const mandateData = data.mandate as Record<string, unknown>;
    return {
      id: data.id as string,
      status: data.status as Mandate["status"],
      beneficiary: mandateData?.beneficiary as Beneficiary,
      remitter: mandateData?.remitter as Remitter | undefined,
      reference: (mandateData?.reference as string) || "",
      constraints: mandateData?.constraints as MandateRequest["constraints"],
      authorizationFlow:
        data.authorization_flow as Mandate["authorizationFlow"],
      createdAt: new Date(data.created_at as string),
      authorizedAt: data.authorized_at
        ? new Date(data.authorized_at as string)
        : undefined,
      revokedAt: data.revoked_at
        ? new Date(data.revoked_at as string)
        : undefined,
      metadata: data.metadata as Record<string, string> | undefined,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createTrueLayerPaymentsConnector(
  config?: Partial<TrueLayerPaymentsConfig>,
): TrueLayerPaymentsConnector {
  return new TrueLayerPaymentsConnector({
    name: "truelayer_payments",
    provider: "truelayer",
    version: "1.0.0",
    priority: 10,
    regions: ["GB", "EU"],
    capabilities: ["bank_payments", "refunds", "payouts"],
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 600,
    },
    retry: {
      maxRetries: 3,
      baseDelayMs: 500,
      maxDelayMs: 10000,
      exponentialBase: 2,
    },
    cache: {
      enabled: false,
      defaultTTLSeconds: 0,
    },
    healthCheckInterval: 60000,
    timeout: 30000,
    enabled: true,
    clientId: config?.clientId || process.env.TRUELAYER_CLIENT_ID || "",
    clientSecret:
      config?.clientSecret || process.env.TRUELAYER_CLIENT_SECRET || "",
    signingKeyId:
      config?.signingKeyId || process.env.TRUELAYER_SIGNING_KEY_ID || "",
    privateKey: config?.privateKey || process.env.TRUELAYER_PRIVATE_KEY || "",
    webhookSecret:
      config?.webhookSecret || process.env.TRUELAYER_WEBHOOK_SECRET,
    sandbox: config?.sandbox ?? process.env.NODE_ENV !== "production",
  });
}
