/**
 * Stripe Payment Service
 *
 * Handles all payment-related operations including:
 * - Subscription creation and management
 * - Payment processing
 * - Invoice generation
 * - Webhook handling
 */

import Stripe from "stripe";
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
} from "@/lib/payment/webhook-idempotency";

// Initialize Stripe with API key — lazy to allow graceful degradation
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured. Payment services unavailable.",
      );
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    });
  }
  return _stripe;
}
// Backwards-compatible alias for existing code that references `stripe` directly
const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  interval: "month" | "year";
  features: string[];
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Subscription Plans
 *
 * New pricing model (2025):
 * - Free: $0/month - Basic features for getting started
 * - Standard: $29.99/month - Complete credit health & financial wellness (3% annual discount)
 * - Pro: $99.99/month - Everything for complete financial vitality (8% annual discount)
 * - Family Duo: $159.99/month - For couples (2 members) (18% annual discount)
 * - Family: $199.99/month - For families (3 members) (18% annual discount)
 * - Family Plus: $399.99/month - For larger families (5 members) (18% annual discount)
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    priceId: "price_free", // No Stripe price ID needed for free tier
    price: 0,
    interval: "month",
    features: [
      "Credit score from 1 bureau",
      "Basic budgeting tools",
      "10 AI chat messages/month",
      "Mobile app access",
      "2 linked accounts",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || "price_standard",
    price: 29.99,
    interval: "month",
    features: [
      "Credit scores from all 3 bureaus",
      "10 AI-powered disputes/month",
      "Smart budgeting with AI insights",
      "Debt payoff strategies",
      "Basic investment tracking",
      "Priority email support",
      "Unlimited linked accounts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro",
    price: 99.99,
    interval: "month",
    features: [
      "Everything in Standard",
      "Unlimited AI-powered disputes",
      "Bill negotiation (no success fees!)",
      "Full investment intelligence suite",
      "Student loan optimization",
      "24/7 AI financial coach",
      "Priority chat & phone support",
      "Advanced analytics dashboard",
    ],
  },
  {
    id: "family-duo",
    name: "Family Duo",
    priceId: process.env.STRIPE_FAMILY_DUO_PRICE_ID || "price_family_duo",
    price: 159.99,
    interval: "month",
    features: [
      "Everything in Pro",
      "Up to 2 family members",
      "Family financial dashboard",
      "Shared goals & milestones",
      "Joint account tracking",
      "Family budget collaboration",
      "Priority support",
    ],
  },
  {
    id: "family",
    name: "Family",
    priceId: process.env.STRIPE_FAMILY_PRICE_ID || "price_family",
    price: 199.99,
    interval: "month",
    features: [
      "Everything in Pro",
      "Up to 3 family members",
      "Family financial dashboard",
      "Shared goals & milestones",
      "Kids financial education module",
      "College savings optimizer",
      "Family net worth tracking",
      "Priority support",
    ],
  },
  {
    id: "family-plus",
    name: "Family Plus",
    priceId: process.env.STRIPE_FAMILY_PLUS_PRICE_ID || "price_family_plus",
    price: 399.99,
    interval: "month",
    features: [
      "Everything in Family",
      "Up to 5 family members",
      "Inheritance & estate planning tools",
      "Dedicated account manager",
      "Monthly family financial review call",
      "Custom reporting & exports",
      "API access for integrations",
      "White-glove onboarding",
      "Priority everything (1-hour response)",
    ],
  },
];

/**
 * Stripe Payment Service Class
 */
class StripePaymentService {
  /**
   * Create a new customer in Stripe
   */
  async createCustomer(
    email: string,
    name?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return customer;
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    const customer = await stripe.customers.retrieve(customerId);
    return customer as Stripe.Customer;
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays?: number,
  ): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    return subscription;
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: "create_prorations",
    });

    return updated;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false,
  ): Promise<Stripe.Subscription> {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string = "usd",
    customerId?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return paymentIntent;
  }

  /**
   * Create a checkout session
   */
  async createCheckoutSession(
    priceId: string,
    customerId: string,
    successUrl: string,
    cancelUrl: string,
    trialDays?: number,
  ): Promise<Stripe.Checkout.Session> {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: trialDays
        ? {
            trial_period_days: trialDays,
          }
        : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session;
  }

  /**
   * Create a one-time Checkout Session for a credit pack purchase. Stripe
   * hosts the card form and emits payment_intent.succeeded after capture, at
   * which point fulfillCreditPurchase grants the credits idempotently.
   */
  async createCreditPackCheckoutSession(params: {
    customerId: string;
    userId: string;
    packType: string;
    credits: number;
    priceCents: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: params.priceCents,
            product_data: {
              name: `Fynvita ${params.credits.toLocaleString()} credits (${params.packType})`,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: {
          type: "credit_purchase",
          userId: params.userId,
          packType: params.packType,
          credits: String(params.credits),
        },
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
  }

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  }

  /**
   * List customer invoices
   */
  async listInvoices(
    customerId: string,
    limit: number = 10,
  ): Promise<Stripe.Invoice[]> {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    return invoice;
  }

  /**
   * Create an invoice
   */
  async createInvoice(
    customerId: string,
    items: Array<{ description: string; amount: number; quantity?: number }>,
  ): Promise<Stripe.Invoice> {
    // Create invoice items
    for (const item of items) {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(item.amount * 100),
        currency: "usd",
        description: item.description,
        quantity: item.quantity || 1,
      });
    }

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true,
    });

    await stripe.invoices.finalizeInvoice(invoice.id);

    return invoice;
  }

  /**
   * Get payment method
   */
  async getPaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    return paymentMethod;
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return paymentMethod;
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return customer;
  }

  /**
   * List customer payment methods
   */
  async listPaymentMethods(
    customerId: string,
  ): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return paymentMethods.data;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Handle webhook event — claim-after-success idempotency (FND-022).
   *
   * Sequence:
   *   1. Check sentinel: if already processed → return (no-op; route returns 200).
   *   2. Dispatch to the appropriate handler.
   *   3. On success → mark sentinel (Stripe will not retry).
   *   4. On handler throw → sentinel is NOT marked → route returns 400 → Stripe retries.
   *
   * Both isWebhookEventProcessed and markWebhookEventProcessed throw on RPC
   * error — those throws propagate here so the route returns 400 and Stripe retries.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    if (await isWebhookEventProcessed("stripe", event.id)) {
      return;
    }

    switch (event.type) {
      case "customer.subscription.created":
        await this.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.paid":
        await this.handleInvoicePaid(
          event.data.object as Stripe.Invoice,
          event.id,
        );
        break;
      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          event.id,
        );
        break;
      case "payment_intent.succeeded":
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case "payment_intent.payment_failed":
        await this.handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
          event.id,
        );
        break;
      case "checkout.session.completed":
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          event.id,
        );
        break;
      default:
        // Unhandled event type — return WITHOUT marking the sentinel, so a handler
        // added later can still process a manual Stripe replay of this event.
        return;
    }

    await markWebhookEventProcessed("stripe", event.id);
  }

  // Webhook handlers

  private async handleSubscriptionCreated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    // Stripe: Subscription created
    const { subscriptionService } =
      await import("../subscriptions/subscription-service");
    await subscriptionService.handleSubscriptionCreated(subscription);
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    // Stripe: Subscription updated
    const { subscriptionService } =
      await import("../subscriptions/subscription-service");
    await subscriptionService.handleSubscriptionUpdated(subscription);
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    // Stripe: Subscription deleted
    const { subscriptionService } =
      await import("../subscriptions/subscription-service");
    await subscriptionService.handleSubscriptionDeleted(subscription);
  }

  private async handleInvoicePaid(
    invoice: Stripe.Invoice,
    eventId: string,
  ): Promise<void> {
    // Stripe: Invoice paid

    // Get customer email for notification
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) {
      const { logger } = await import("../monitoring/logger");
      logger.warn("invoice.paid: no customerId on invoice, skipping", {
        invoiceId: invoice.id,
        eventId,
      });
      return;
    }

    try {
      const customer = await this.getCustomer(customerId);
      const { logger } = await import("../monitoring/logger");

      // Log successful payment for analytics
      logger.info("Payment successful", {
        invoiceId: invoice.id,
        customerId,
        amount: invoice.amount_paid,
        currency: invoice.currency,
      });

      // ── Idempotency ordering: DB work FIRST, email LAST ───────────────────
      // If the credit reset throws, Stripe retries this handler. The reset RPC
      // is idempotent (same period → no-op), so re-running it is safe. The
      // email is sent LAST so a retry after a failed reset does not re-send to
      // the customer — the reset runs again (harmlessly) and only then the email
      // is sent. Do not move the email above the credit reset.
      // ─────────────────────────────────────────────────────────────────────

      const { supabaseAdmin } = await import("../supabase/server");
      // The checked-in Database types are a stale subset that omits most
      // tables (see docs/qa/SYSTEMATIC-REVIEW-SYNTHESIS.md — regenerating them
      // is its own slice, currently 61 tsc errors across 15 files). Reusing the
      // one existing cast here rather than introducing a second one.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // Resolved from the subscription record below when this invoice belongs
      // to a subscription. A one-off invoice leaves both null — the payment is
      // still recorded, just unattributed.
      let resolvedUserId: string | null = null;
      let resolvedSubId: string | null = null;

      // Reset monthly credit allowance on subscription renewal
      const subDetails = invoice.parent?.subscription_details;
      if (subDetails?.subscription) {
        const stripeSubId =
          typeof subDetails.subscription === "string"
            ? subDetails.subscription
            : subDetails.subscription.id;
        resolvedSubId = stripeSubId;

        // Look up the user from the subscription record
        const { data: subRecord } = await db
          .from("subscriptions")
          .select("user_id, stripe_price_id")
          .eq("stripe_subscription_id", stripeSubId)
          .single();

        if (subRecord) {
          resolvedUserId = subRecord.user_id ?? null;
          const { resetCreditsForTier } =
            await import("../credits/credit-reset");

          // Determine tier from price ID
          const plan = SUBSCRIPTION_PLANS.find(
            (p) => p.priceId === subRecord.stripe_price_id,
          );
          if (!plan) {
            logger.warn(
              "invoice.paid: no plan for stripe_price_id, defaulting tier to free",
              {
                stripePriceId: subRecord.stripe_price_id,
                userId: subRecord.user_id,
                eventId,
              },
            );
          }
          const tier = plan?.id ?? "free";

          await resetCreditsForTier(subRecord.user_id, tier);
        }
      }

      // ── Revenue ledger ───────────────────────────────────────────────────
      // Record the payment. Before this existed, NOTHING in the codebase wrote
      // a financial record for a paid invoice — this handler touched only
      // `subscriptions`, so /api/admin/metrics reported $0 revenue forever.
      //
      // amount_paid is ALREADY in minor units; it is stored verbatim with no
      // arithmetic. Two dollar/cent unit bugs have already shipped on live
      // money paths here (FND-024, B1) — do not "convert" this.
      //
      // Idempotent on stripe_invoice_id: this handler rethrows so Stripe
      // retries, and a retry must not book the same invoice as revenue twice.
      //
      // Table renamed from `payments` in 20260801000000 (ADR-0011). `payments`
      // now means a provider-agnostic payment attempt owned by payment-router;
      // this ledger holds settled Stripe INVOICES, which is a different entity.
      const { error: ledgerError } = await db
        .from("subscription_invoices")
        .upsert(
          {
            user_id: resolvedUserId,
            stripe_invoice_id: invoice.id,
            stripe_event_id: eventId,
            stripe_customer_id: customerId,
            stripe_subscription_id: resolvedSubId,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            paid_at: new Date(
              (invoice.status_transitions?.paid_at ??
                Math.floor(Date.now() / 1000)) * 1000,
            ).toISOString(),
          },
          { onConflict: "stripe_invoice_id", ignoreDuplicates: true },
        );

      if (ledgerError) {
        // Stripe took the customer's money. Failing to record it is a lost
        // financial record, not a cosmetic issue — throw so this returns non-2xx
        // and Stripe redelivers.
        throw new Error(
          `Failed to record payment in revenue ledger (payments) for invoice ${invoice.id}: ${ledgerError.message}`,
        );
      }

      // Send payment confirmation email — always last so a retry after a
      // transient DB failure re-runs the idempotent reset without re-sending.
      if (customer.email) {
        const { notificationService } =
          await import("../notifications/notification-service");
        await notificationService.sendPaymentSuccessEmail(
          customer.email,
          customer.name || "Customer",
          invoice.amount_paid ? invoice.amount_paid / 100 : 0,
          invoice.id,
        );
      }
    } catch (error) {
      const { logger } = await import("../monitoring/logger");
      logger.error(
        "Failed to process invoice.paid event",
        error instanceof Error ? error : new Error(String(error)),
        {
          eventId,
          invoiceId: invoice.id,
          customerId,
          eventType: "invoice.paid",
        },
      );
      throw error;
    }
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    eventId: string,
  ): Promise<void> {
    // Stripe: Invoice payment failed

    // Get customer email for notification
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) {
      const { logger } = await import("../monitoring/logger");
      logger.warn(
        "invoice.payment_failed: no customerId on invoice, skipping",
        {
          invoiceId: invoice.id,
          eventId,
        },
      );
      return;
    }

    try {
      const customer = await this.getCustomer(customerId);
      const { logger } = await import("../monitoring/logger");

      // Log payment failure for monitoring
      logger.warn("Payment failed", {
        invoiceId: invoice.id,
        customerId,
        amount: invoice.amount_due,
        currency: invoice.currency,
      });

      // Send payment failure email
      if (customer.email) {
        const { notificationService } =
          await import("../notifications/notification-service");
        await notificationService.sendPaymentFailedEmail(
          customer.email,
          invoice.amount_due ? invoice.amount_due / 100 : 0,
          `Invoice ${invoice.id} payment failed. Please update your payment method.`,
        );
      }
    } catch (error) {
      const { logger } = await import("../monitoring/logger");
      logger.error(
        "Failed to process invoice.payment_failed event",
        error instanceof Error ? error : new Error(String(error)),
        {
          eventId,
          invoiceId: invoice.id,
          customerId,
          eventType: "invoice.payment_failed",
        },
      );
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    // Stripe: Payment intent succeeded

    try {
      const { logger } = await import("../monitoring/logger");
      logger.info("Payment intent succeeded", {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId:
          typeof paymentIntent.customer === "string"
            ? paymentIntent.customer
            : paymentIntent.customer?.id,
      });

      // Handle credit purchase fulfillment. Errors propagate so the webhook
      // route returns non-2xx and Stripe retries — the underlying RPC is
      // idempotent, so retries are safe.
      if (paymentIntent.metadata?.type === "credit_purchase") {
        await this.fulfillCreditPurchase(paymentIntent);
      }
    } catch (error) {
      const { logger } = await import("../monitoring/logger");
      logger.error(
        "Failed to process payment intent success",
        error instanceof Error ? error : new Error(String(error)),
        { paymentIntentId: paymentIntent.id },
      );
      throw error;
    }
  }

  /**
   * Fulfill a credit pack purchase. The underlying add_credits RPC is atomic:
   * the credit_purchases sentinel insert and the user_credits update happen in
   * the same Postgres transaction. A duplicate Stripe delivery is detected
   * inside the RPC by stripe_payment_intent_id and short-circuits cleanly,
   * returning already_fulfilled=true with no double-grant and no stranded row.
   */
  private async fulfillCreditPurchase(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { creditService } = await import("../credits/credit-service");
    const { logger } = await import("../monitoring/logger");

    const userId = paymentIntent.metadata.userId;
    const credits = parseInt(paymentIntent.metadata.credits, 10);
    const packType = paymentIntent.metadata.packType;

    if (
      !userId ||
      !packType ||
      !Number.isFinite(credits) ||
      credits <= 0 ||
      paymentIntent.amount <= 0
    ) {
      logger.warn("Credit purchase webhook missing required metadata", {
        paymentIntentId: paymentIntent.id,
        userId,
        credits,
        packType,
        amount: paymentIntent.amount,
      });
      return;
    }

    const result = await creditService.addCredits(
      userId,
      credits,
      "credit_purchase",
      {
        paymentIntentId: paymentIntent.id,
        packType,
        amountCents: paymentIntent.amount,
      },
      {
        paymentIntentId: paymentIntent.id,
        packType,
        amountPaidCents: paymentIntent.amount,
      },
    );

    if (result.alreadyFulfilled) {
      logger.info("Credit purchase webhook duplicate suppressed", {
        paymentIntentId: paymentIntent.id,
        userId,
      });
      return;
    }

    logger.info("Credit purchase fulfilled", {
      paymentIntentId: paymentIntent.id,
      userId,
      credits,
      packType,
    });
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
    eventId: string,
  ): Promise<void> {
    // Stripe: payment_intent.payment_failed. Pure logging — no retryable side-effect.
    // The logger call is unguarded: a transient logging outage propagates and Stripe
    // retries. The failed payment itself is permanent and must NOT throw (retry storm).
    const { logger } = await import("../monitoring/logger");
    logger.error("Payment intent failed", new Error("Payment intent failed"), {
      eventId,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId:
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id,
      lastPaymentError: paymentIntent.last_payment_error?.message,
    });
  }

  /**
   * Handle checkout.session.completed.
   *
   * A completed checkout session signals that a customer has finished the
   * Stripe-hosted payment flow. For subscription mode sessions the subscription
   * is already created via customer.subscription.created; this handler records
   * the completion event with structured context for audit and observability.
   *
   * Errors propagate — the caller (handleWebhookEvent) will NOT mark the
   * sentinel, so the route returns 400 and Stripe retries.
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    eventId: string,
  ): Promise<void> {
    const { logger } = await import("../monitoring/logger");

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer?.id ?? null);

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription?.id ?? null);

    logger.info("checkout.session.completed", {
      eventId,
      sessionId: session.id,
      customerId,
      subscriptionId,
      mode: session.mode,
    });
  }

  /**
   * Get subscription plan by ID
   */
  getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
  }

  /**
   * Get all subscription plans
   */
  getAllSubscriptionPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }
}

// Export singleton instance
export const stripeService = new StripePaymentService();
export default stripeService;
