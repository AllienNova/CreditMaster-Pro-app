/**
 * billing-data.ts — Real Stripe billing data (TASK-WBH-03 / FND-016, FND-017)
 *
 * Replaces billing-profile-store.ts. All data sourced from Stripe API.
 * No fabricated card numbers. No fabricated invoices. No mock state.
 *
 * stripe_customer_id is sourced from profiles.stripe_customer_id — the
 * canonical location, set at customer-creation time before any checkout.
 * A user with no customer id is on the free plan with no Stripe presence —
 * return empty payment methods, free plan, empty invoices.
 */

import { getSupabase } from "@/lib/supabase/client";
import { stripeService, SUBSCRIPTION_PLANS } from "@/lib/payment/stripe-service";

export interface BillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BillingInvoice {
  id: string;
  amount: number;
  status: "paid" | "open" | "void" | "uncollectible";
  created: Date;
  dueDate?: Date;
  pdfUrl?: string;
}

export interface BillingSubscriptionInfo {
  planId: string;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

export interface BillingData {
  paymentMethods: BillingPaymentMethod[];
  subscription: BillingSubscriptionInfo;
  invoices: BillingInvoice[];
}

const FREE_SUBSCRIPTION: BillingSubscriptionInfo = {
  planId: "free",
  status: "active",
  cancelAtPeriodEnd: false,
};

/**
 * Resolve the Stripe customer id for the given user from profiles.
 * Returns null when the user has no Stripe presence.
 */
async function resolveStripeCustomerId(userId: string): Promise<string | null> {
  const db = getSupabase();

  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id as string;
  }

  return null;
}

/**
 * Resolve the active/trialing subscription DB row for the user.
 * Returns the row or null when there is no active subscription.
 */
async function resolveActiveSubscriptionRow(
  userId: string,
): Promise<{ stripe_price_id: string; status: string; current_period_start: string | null; current_period_end: string | null; cancel_at_period_end: boolean } | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return data as {
    stripe_price_id: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  };
}

/**
 * Map a Stripe PaymentMethod card to our BillingPaymentMethod shape.
 */
function mapPaymentMethod(
  pm: {
    id: string;
    card?: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
  },
  isDefault: boolean,
): BillingPaymentMethod | null {
  if (!pm.card) return null;
  return {
    id: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
    isDefault,
  };
}

/**
 * Map a Stripe Invoice to our BillingInvoice shape.
 */
function mapInvoice(invoice: {
  id: string;
  amount_paid: number;
  status: string | null;
  created: number;
  due_date: number | null;
  invoice_pdf?: string | null;
}): BillingInvoice | null {
  const status = invoice.status as BillingInvoice["status"] | null;
  if (!status || !["paid", "open", "void", "uncollectible"].includes(status)) {
    return null;
  }
  return {
    id: invoice.id,
    amount: invoice.amount_paid / 100,
    status,
    created: new Date(invoice.created * 1000),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
    pdfUrl: invoice.invoice_pdf ?? undefined,
  };
}

/**
 * Build the subscription info shape from the DB row.
 */
function buildSubscriptionInfo(
  row: {
    stripe_price_id: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  },
): BillingSubscriptionInfo {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.priceId === row.stripe_price_id);
  return {
    planId: plan?.id ?? "free",
    status: row.status,
    currentPeriodStart: row.current_period_start
      ? new Date(row.current_period_start)
      : undefined,
    currentPeriodEnd: row.current_period_end
      ? new Date(row.current_period_end)
      : undefined,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}

/**
 * Fetch real billing data for a user from Stripe.
 *
 * - Resolves stripe_customer_id from the profiles table.
 * - Resolves active subscription info from the subscriptions table.
 * - Fetches payment methods and invoices from Stripe using the resolved customer.
 * - A user with no Stripe customer returns empty payment methods, free plan,
 *   and empty invoices.
 */
export async function getBillingData(userId: string): Promise<BillingData> {
  const [customerId, subRow] = await Promise.all([
    resolveStripeCustomerId(userId),
    resolveActiveSubscriptionRow(userId),
  ]);

  const subscription = subRow ? buildSubscriptionInfo(subRow) : FREE_SUBSCRIPTION;

  if (!customerId) {
    return {
      paymentMethods: [],
      subscription,
      invoices: [],
    };
  }

  const [rawPaymentMethods, rawInvoices] = await Promise.all([
    stripeService.listPaymentMethods(customerId),
    stripeService.listInvoices(customerId),
  ]);

  const paymentMethods = rawPaymentMethods
    .map((pm, idx) => mapPaymentMethod(pm, idx === 0))
    .filter((pm): pm is BillingPaymentMethod => pm !== null);

  const invoices = rawInvoices
    .map(mapInvoice)
    .filter((inv): inv is BillingInvoice => inv !== null);

  return { paymentMethods, subscription, invoices };
}
