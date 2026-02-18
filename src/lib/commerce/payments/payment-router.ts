/**
 * Payment Router
 *
 * Unified payment routing that selects the best payment provider
 * based on region, currency, and payment type.
 */

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  TrueLayerPaymentsConnector,
  createTrueLayerPaymentsConnector,
  PaymentAmount,
  Beneficiary,
  Payment as TrueLayerPayment,
  PaymentAuthLink,
} from "../../connectors/payments";

// =============================================================================
// Configuration
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-09-30.clover",
});

// =============================================================================
// Types
// =============================================================================

export type PaymentProvider = "stripe" | "truelayer";
export type PaymentType = "one_time" | "subscription" | "payout" | "transfer";
export type PaymentMethodType =
  | "card"
  | "bank_transfer"
  | "sepa"
  | "ach"
  | "open_banking";

export interface UnifiedPaymentRequest {
  amount: number; // In minor units (cents)
  currency: string;
  type: PaymentType;
  method?: PaymentMethodType;
  region: string;
  userId: string;
  metadata?: Record<string, string>;
  // Card payment specific
  paymentMethodId?: string;
  // Bank transfer specific
  beneficiary?: {
    name: string;
    iban?: string;
    sortCode?: string;
    accountNumber?: string;
  };
  // Subscription specific
  priceId?: string;
  // Description
  description?: string;
  reference?: string;
}

export interface UnifiedPayment {
  id: string;
  provider: PaymentProvider;
  providerPaymentId: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled";
  amount: number;
  currency: string;
  type: PaymentType;
  method: PaymentMethodType;
  authUrl?: string;
  clientSecret?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, string>;
}

export interface ProviderSelection {
  provider: PaymentProvider;
  reason: string;
  fees: {
    fixed: number;
    percentage: number;
    estimatedTotal: number;
  };
  estimatedTime: string;
}

// =============================================================================
// Payment Router
// =============================================================================

class PaymentRouter {
  private truelayerConnector: TrueLayerPaymentsConnector;

  constructor() {
    this.truelayerConnector = createTrueLayerPaymentsConnector();
  }

  // ===========================================================================
  // Provider Selection
  // ===========================================================================

  /**
   * Select the best payment provider based on requirements
   */
  selectProvider(request: UnifiedPaymentRequest): ProviderSelection {
    const { amount, currency, type, method, region } = request;

    // Open banking payments in EU/UK -> TrueLayer
    if (
      (region === "GB" || region === "EU" || this.isEurozone(region)) &&
      (method === "open_banking" || method === "bank_transfer")
    ) {
      return {
        provider: "truelayer",
        reason: "Open Banking payment in supported region",
        fees: {
          fixed: 20, // 20 cents
          percentage: 0.2,
          estimatedTotal: 20 + (amount * 0.2) / 100,
        },
        estimatedTime: "Instant to 2 hours",
      };
    }

    // Card payments -> Stripe
    if (method === "card" || !method) {
      return {
        provider: "stripe",
        reason: "Card payment via Stripe",
        fees: {
          fixed: 30, // 30 cents
          percentage: 2.9,
          estimatedTotal: 30 + (amount * 2.9) / 100,
        },
        estimatedTime: "Instant",
      };
    }

    // SEPA in EU -> TrueLayer or Stripe
    if (method === "sepa" && (region === "EU" || this.isEurozone(region))) {
      return {
        provider: "truelayer",
        reason: "SEPA transfer via Open Banking",
        fees: {
          fixed: 20,
          percentage: 0.2,
          estimatedTotal: 20 + (amount * 0.2) / 100,
        },
        estimatedTime: "1-2 business days",
      };
    }

    // ACH in US -> Stripe
    if (method === "ach" && region === "US") {
      return {
        provider: "stripe",
        reason: "ACH transfer via Stripe",
        fees: {
          fixed: 0,
          percentage: 0.8,
          estimatedTotal: (amount * 0.8) / 100,
        },
        estimatedTime: "3-5 business days",
      };
    }

    // Default to Stripe
    return {
      provider: "stripe",
      reason: "Default payment provider",
      fees: {
        fixed: 30,
        percentage: 2.9,
        estimatedTotal: 30 + (amount * 2.9) / 100,
      },
      estimatedTime: "Instant",
    };
  }

  // ===========================================================================
  // Payment Processing
  // ===========================================================================

  /**
   * Process a payment using the best provider
   */
  async processPayment(
    request: UnifiedPaymentRequest,
  ): Promise<UnifiedPayment> {
    const selection = this.selectProvider(request);

    // Record payment attempt
    const paymentRecord = await this.createPaymentRecord(
      request,
      selection.provider,
    );

    try {
      let result: UnifiedPayment;

      if (selection.provider === "truelayer") {
        result = await this.processTrueLayerPayment(paymentRecord.id, request);
      } else {
        result = await this.processStripePayment(paymentRecord.id, request);
      }

      // Update payment record
      await this.updatePaymentRecord(paymentRecord.id, result);

      return result;
    } catch (error) {
      // Update payment record with failure
      await this.updatePaymentRecord(paymentRecord.id, {
        ...paymentRecord,
        status: "failed",
        metadata: {
          ...request.metadata,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  }

  /**
   * Process payment via Stripe
   */
  private async processStripePayment(
    internalId: string,
    request: UnifiedPaymentRequest,
  ): Promise<UnifiedPayment> {
    if (request.type === "subscription" && request.priceId) {
      return this.processStripeSubscription(internalId, request);
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: request.amount,
      currency: request.currency.toLowerCase(),
      customer: await this.getOrCreateStripeCustomer(request.userId),
      payment_method: request.paymentMethodId,
      confirm: !!request.paymentMethodId,
      automatic_payment_methods: request.paymentMethodId
        ? undefined
        : { enabled: true },
      description: request.description,
      metadata: {
        internal_id: internalId,
        user_id: request.userId,
        ...request.metadata,
      },
    });

    return {
      id: internalId,
      provider: "stripe",
      providerPaymentId: paymentIntent.id,
      status: this.mapStripeStatus(paymentIntent.status),
      amount: request.amount,
      currency: request.currency,
      type: request.type,
      method: request.method || "card",
      clientSecret: paymentIntent.client_secret || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata,
    };
  }

  /**
   * Process subscription via Stripe
   */
  private async processStripeSubscription(
    internalId: string,
    request: UnifiedPaymentRequest,
  ): Promise<UnifiedPayment> {
    const customerId = await this.getOrCreateStripeCustomer(request.userId);

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: request.priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        internal_id: internalId,
        user_id: request.userId,
        ...request.metadata,
      },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent =
      typeof (invoice as unknown as { payment_intent?: unknown })
        .payment_intent === "object"
        ? ((invoice as unknown as { payment_intent?: Stripe.PaymentIntent })
            .payment_intent as Stripe.PaymentIntent | undefined)
        : undefined;

    return {
      id: internalId,
      provider: "stripe",
      providerPaymentId: subscription.id,
      status: this.mapStripeSubscriptionStatus(subscription.status),
      amount: request.amount,
      currency: request.currency,
      type: "subscription",
      method: request.method || "card",
      clientSecret: paymentIntent?.client_secret || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata,
    };
  }

  /**
   * Process payment via TrueLayer
   */
  private async processTrueLayerPayment(
    internalId: string,
    request: UnifiedPaymentRequest,
  ): Promise<UnifiedPayment> {
    const beneficiary: Beneficiary = request.beneficiary
      ? {
          type: "external_account",
          accountHolderName: request.beneficiary.name,
          accountIdentifier: request.beneficiary.iban
            ? { type: "iban", iban: request.beneficiary.iban }
            : {
                type: "sort_code_account_number",
                sortCode: request.beneficiary.sortCode,
                accountNumber: request.beneficiary.accountNumber,
              },
        }
      : {
          type: "merchant_account",
          merchantAccountId: process.env.TRUELAYER_MERCHANT_ACCOUNT_ID,
        };

    const paymentAuth = await this.truelayerConnector.createPayment({
      amount: {
        currency: request.currency,
        value: request.amount,
      },
      beneficiary,
      reference: request.reference || `FYN-${internalId.substring(0, 8)}`,
      userId: request.userId,
      metadata: request.metadata,
    });

    return {
      id: internalId,
      provider: "truelayer",
      providerPaymentId: paymentAuth.paymentId,
      status: "pending",
      amount: request.amount,
      currency: request.currency,
      type: request.type,
      method: "open_banking",
      authUrl: paymentAuth.authUri,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: request.metadata,
    };
  }

  // ===========================================================================
  // Payment Status
  // ===========================================================================

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<UnifiedPayment | null> {
    const { data, error } = await supabase
      .from("payments")
      .select()
      .eq("id", paymentId)
      .single();

    if (error || !data) return null;

    // Refresh status from provider
    if (data.status === "pending" || data.status === "processing") {
      const refreshedStatus = await this.refreshPaymentStatus(data);
      if (refreshedStatus !== data.status) {
        await this.updatePaymentRecord(paymentId, {
          ...this.mapPaymentRecord(data),
          status: refreshedStatus,
        });
        data.status = refreshedStatus;
      }
    }

    return this.mapPaymentRecord(data);
  }

  /**
   * Refresh payment status from provider
   */
  private async refreshPaymentStatus(
    payment: Record<string, unknown>,
  ): Promise<UnifiedPayment["status"]> {
    if (payment.provider === "stripe") {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        payment.provider_payment_id as string,
      );
      return this.mapStripeStatus(paymentIntent.status);
    } else if (payment.provider === "truelayer") {
      const tlPayment = await this.truelayerConnector.getPayment(
        payment.provider_payment_id as string,
      );
      return this.mapTrueLayerStatus(tlPayment.status);
    }

    return payment.status as UnifiedPayment["status"];
  }

  // ===========================================================================
  // Refunds
  // ===========================================================================

  /**
   * Create a refund
   */
  async createRefund(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<{
    id: string;
    status: "pending" | "succeeded" | "failed";
    amount: number;
  }> {
    const payment = await this.getPaymentStatus(paymentId);
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    const refundAmount = amount || payment.amount;

    if (payment.provider === "stripe") {
      const refund = await stripe.refunds.create({
        payment_intent: payment.providerPaymentId,
        amount: refundAmount,
        reason: reason as Stripe.RefundCreateParams.Reason,
      });

      return {
        id: refund.id,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        amount: refund.amount,
      };
    } else if (payment.provider === "truelayer") {
      const refund = await this.truelayerConnector.createRefund(
        payment.providerPaymentId,
        { currency: payment.currency, value: refundAmount },
        `Refund for ${paymentId}`,
      );

      return {
        id: refund.id,
        status: refund.status === "executed" ? "succeeded" : "pending",
        amount: refundAmount,
      };
    }

    throw new Error(`Unsupported provider: ${payment.provider}`);
  }

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded":
        await this.handlePaymentSuccess(
          "stripe",
          (event.data.object as Stripe.PaymentIntent).id,
        );
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentFailure(
          "stripe",
          (event.data.object as Stripe.PaymentIntent).id,
          (event.data.object as Stripe.PaymentIntent).last_payment_error
            ?.message,
        );
        break;
    }
  }

  /**
   * Handle TrueLayer webhook
   */
  async handleTrueLayerWebhook(
    payload: string,
    signature: string,
  ): Promise<void> {
    if (!this.truelayerConnector.verifyWebhookSignature(payload, signature)) {
      throw new Error("Invalid webhook signature");
    }

    const event = this.truelayerConnector.parseWebhookEvent(payload);

    switch (event.type) {
      case "payment_executed":
      case "payment_settled":
        if (event.paymentId) {
          await this.handlePaymentSuccess("truelayer", event.paymentId);
        }
        break;
      case "payment_failed":
        if (event.paymentId) {
          await this.handlePaymentFailure("truelayer", event.paymentId);
        }
        break;
    }
  }

  private async handlePaymentSuccess(
    provider: PaymentProvider,
    providerPaymentId: string,
  ): Promise<void> {
    await supabase
      .from("payments")
      .update({ status: "succeeded", updated_at: new Date().toISOString() })
      .eq("provider", provider)
      .eq("provider_payment_id", providerPaymentId);
  }

  private async handlePaymentFailure(
    provider: PaymentProvider,
    providerPaymentId: string,
    error?: string,
  ): Promise<void> {
    await supabase
      .from("payments")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
        metadata: error ? { error } : undefined,
      })
      .eq("provider", provider)
      .eq("provider_payment_id", providerPaymentId);
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private isEurozone(region: string): boolean {
    const eurozoneCountries = [
      "AT",
      "BE",
      "CY",
      "EE",
      "FI",
      "FR",
      "DE",
      "GR",
      "IE",
      "IT",
      "LV",
      "LT",
      "LU",
      "MT",
      "NL",
      "PT",
      "SK",
      "SI",
      "ES",
    ];
    return eurozoneCountries.includes(region);
  }

  private async getOrCreateStripeCustomer(userId: string): Promise<string> {
    // Check for existing customer in profiles table (canonical user data table)
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", userId)
      .single();

    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    // Get email from auth.users using admin API (requires service role key)
    let userEmail: string | undefined;
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      userEmail = authData?.user?.email;
    } catch (_error) {
      // PaymentRouter warning: Could not fetch user email via admin API
      // Fallback: email will be undefined, Stripe can still create customer
      void _error;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: userEmail,
      name: profile?.full_name,
      metadata: { user_id: userId },
    });

    // Save customer ID to profiles table
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", userId);

    return customer.id;
  }

  private async createPaymentRecord(
    request: UnifiedPaymentRequest,
    provider: PaymentProvider,
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: request.userId,
        provider,
        amount: request.amount,
        currency: request.currency,
        type: request.type,
        method: request.method || "card",
        status: "pending",
        metadata: request.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create payment record: ${error.message}`);
    }

    return { id: data.id };
  }

  private async updatePaymentRecord(
    id: string,
    payment: Partial<UnifiedPayment>,
  ): Promise<void> {
    await supabase
      .from("payments")
      .update({
        provider_payment_id: payment.providerPaymentId,
        status: payment.status,
        updated_at: new Date().toISOString(),
        metadata: payment.metadata,
      })
      .eq("id", id);
  }

  private mapStripeStatus(status: string): UnifiedPayment["status"] {
    switch (status) {
      case "succeeded":
        return "succeeded";
      case "processing":
        return "processing";
      case "canceled":
        return "canceled";
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
        return "pending";
      default:
        return "pending";
    }
  }

  private mapStripeSubscriptionStatus(
    status: string,
  ): UnifiedPayment["status"] {
    switch (status) {
      case "active":
        return "succeeded";
      case "incomplete":
        return "pending";
      case "canceled":
        return "canceled";
      default:
        return "pending";
    }
  }

  private mapTrueLayerStatus(status: string): UnifiedPayment["status"] {
    switch (status) {
      case "executed":
      case "settled":
        return "succeeded";
      case "authorizing":
      case "authorized":
        return "processing";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  }

  private mapPaymentRecord(row: Record<string, unknown>): UnifiedPayment {
    return {
      id: row.id as string,
      provider: row.provider as PaymentProvider,
      providerPaymentId: row.provider_payment_id as string,
      status: row.status as UnifiedPayment["status"],
      amount: row.amount as number,
      currency: row.currency as string,
      type: row.type as PaymentType,
      method: row.method as PaymentMethodType,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      metadata: row.metadata as Record<string, string> | undefined,
    };
  }
}

// Export singleton
export const paymentRouter = new PaymentRouter();
export default paymentRouter;
