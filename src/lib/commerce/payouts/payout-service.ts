/**
 * Payout Service
 *
 * Manages payouts to affiliates, partners, and users.
 * Supports multiple payout methods and automated scheduling.
 *
 * Fail-LOUD contract for money-amount computations: getPendingEarnings and
 * the due-schedule lookup in processScheduledPayouts both throw on a query
 * error rather than defaulting to "$0 pending" / "nothing due." A wrong
 * balance must never be computed as if it were a real one — the query
 * currently errors on every call (affiliate_conversions and
 * payout_schedules do not exist yet), and silently treating that as zero
 * would starve every recipient's payout with no visible failure.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { cents, fromDollars, toDollars, toStripeAmount, type Cents } from "@/lib/money";
import {
  TrueLayerPaymentsConnector,
  createTrueLayerPaymentsConnector,
} from "../../connectors/payments";

// =============================================================================
// Configuration
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Lazily constructed so `next build` page-data-collection (no runtime env)
// does not abort on createClient's "supabaseUrl is required".
let _supabase: SupabaseClient | null = null;
const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, recv) {
    if (!_supabase) _supabase = createClient(supabaseUrl, supabaseServiceKey);
    const v = Reflect.get(_supabase, prop, recv);
    return typeof v === "function" ? v.bind(_supabase) : v;
  },
});

let _stripe: Stripe | null = null;
const stripe = new Proxy({} as Stripe, {
  get(_t, prop, recv) {
    if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-09-30.clover" });
    const v = Reflect.get(_stripe, prop, recv);
    return typeof v === "function" ? v.bind(_stripe) : v;
  },
});

// =============================================================================
// Types
// =============================================================================

export type PayoutStatus =
  | "pending"
  | "processing"
  | "in_transit"
  | "paid"
  | "failed"
  | "canceled";

export type PayoutMethod =
  | "stripe_connect"
  | "bank_transfer"
  | "open_banking"
  | "paypal"
  | "check";

export type PayoutType =
  | "affiliate"
  | "referral"
  | "refund"
  | "reward"
  | "other";

export interface PayoutRecipient {
  id: string;
  type: "partner" | "user";
  name: string;
  email: string;
  preferredMethod: PayoutMethod;
  stripeAccountId?: string;
  bankDetails?: {
    accountHolderName: string;
    accountNumber?: string;
    routingNumber?: string;
    iban?: string;
    sortCode?: string;
    bankName?: string;
    country: string;
  };
  paypalEmail?: string;
  taxInfo?: {
    taxId?: string;
    w9OnFile?: boolean;
    w8OnFile?: boolean;
  };
}

export interface PayoutRequest {
  recipientId: string;
  type: PayoutType;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  method?: PayoutMethod;
  sourceIds?: string[]; // Conversion IDs, transaction IDs, etc.
  metadata?: Record<string, string>;
}

export interface Payout {
  id: string;
  recipientId: string;
  recipientType: "partner" | "user";
  type: PayoutType;
  status: PayoutStatus;
  method: PayoutMethod;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  description?: string;
  reference: string;
  providerPayoutId?: string;
  sourceIds?: string[];
  createdAt: Date;
  processedAt?: Date;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, string>;
}

export interface PayoutBatch {
  id: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  totalAmount: number;
  currency: string;
  payoutCount: number;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  completedAt?: Date;
  payouts: Payout[];
}

export interface PayoutSchedule {
  id: string;
  recipientId: string;
  frequency: "weekly" | "biweekly" | "monthly";
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  minimumAmount: number;
  currency: string;
  isActive: boolean;
  lastPayoutDate?: Date;
  nextPayoutDate: Date;
}

// =============================================================================
// Payout Service
// =============================================================================

export class PayoutService {
  private truelayerConnector: TrueLayerPaymentsConnector;

  constructor() {
    this.truelayerConnector = createTrueLayerPaymentsConnector();
  }

  // ===========================================================================
  // Individual Payouts
  // ===========================================================================

  /**
   * Create and process a payout
   */
  async createPayout(request: PayoutRequest): Promise<Payout> {
    // Get recipient details
    const recipient = await this.getRecipient(request.recipientId);
    if (!recipient) {
      throw new Error(`Recipient not found: ${request.recipientId}`);
    }

    // Determine payout method
    const method = request.method || recipient.preferredMethod;

    // Calculate fees
    const fees = this.calculateFees(request.amount, method);

    // Create payout record
    const payoutRecord = await this.createPayoutRecord({
      recipientId: request.recipientId,
      recipientType: recipient.type,
      type: request.type,
      method,
      amount: request.amount,
      fee: fees.fee,
      netAmount: fees.net,
      currency: request.currency,
      description: request.description,
      reference: request.reference || this.generateReference(),
      sourceIds: request.sourceIds,
      metadata: request.metadata,
    });

    // Process payout
    try {
      const result = await this.processPayout(payoutRecord, recipient);
      return result;
    } catch (error) {
      await this.updatePayoutStatus(
        payoutRecord.id,
        "failed",
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }

  /**
   * Process a payout based on method
   */
  private async processPayout(
    payout: Payout,
    recipient: PayoutRecipient,
  ): Promise<Payout> {
    await this.updatePayoutStatus(payout.id, "processing");

    let providerPayoutId: string | undefined;

    switch (payout.method) {
      case "stripe_connect":
        providerPayoutId = await this.processStripeConnectPayout(
          payout,
          recipient,
        );
        break;
      case "bank_transfer":
      case "open_banking":
        providerPayoutId = await this.processBankPayout(payout, recipient);
        break;
      case "paypal":
        providerPayoutId = await this.processPayPalPayout(payout, recipient);
        break;
      case "check":
        providerPayoutId = await this.processCheckPayout(payout, recipient);
        break;
      default:
        throw new Error(`Unsupported payout method: ${payout.method}`);
    }

    // Update with provider ID
    const { error: inTransitError } = await supabase
      .from("payouts")
      .update({
        provider_payout_id: providerPayoutId,
        status: "in_transit",
        processed_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    // The provider has ALREADY been told to send money at this point. If the
    // row does not record "in_transit" with the provider's id, reconciliation
    // cannot match the outbound transfer to this payout, and a retry would
    // send it again.
    if (inTransitError) {
      throw new Error(
        `Payout ${payout.id} was sent to the provider but could not be marked in_transit: ${inTransitError.message}`,
      );
    }

    return {
      ...payout,
      providerPayoutId,
      status: "in_transit",
      processedAt: new Date(),
    };
  }

  /**
   * Process payout via Stripe Connect
   */
  private async processStripeConnectPayout(
    payout: Payout,
    recipient: PayoutRecipient,
  ): Promise<string> {
    if (!recipient.stripeAccountId) {
      throw new Error("Recipient does not have a Stripe Connect account");
    }

    // Create transfer to connected account
    const transfer = await stripe.transfers.create(
      {
        // Stripe amount is integer cents; netAmount is dollars — convert via Cents type
        amount: toStripeAmount(fromDollars(payout.netAmount)),
        currency: payout.currency.toLowerCase(),
        destination: recipient.stripeAccountId,
        description: payout.description,
        metadata: {
          payout_id: payout.id,
          type: payout.type,
          ...payout.metadata,
        },
      },
      // Idempotency key derived from stable payout row id — prevents double-pay on retry (FND-026)
      { idempotencyKey: `transfer-${payout.id}` },
    );

    return transfer.id;
  }

  /**
   * Process payout via bank transfer
   */
  private async processBankPayout(
    payout: Payout,
    recipient: PayoutRecipient,
  ): Promise<string> {
    if (!recipient.bankDetails) {
      throw new Error("Recipient does not have bank details");
    }

    // Use TrueLayer for EU/UK
    if (
      recipient.bankDetails.country === "GB" ||
      this.isEurozone(recipient.bankDetails.country)
    ) {
      const merchantAccounts =
        await this.truelayerConnector.getMerchantAccounts();
      const sourceAccount = merchantAccounts.find(
        (a) => a.currency === payout.currency,
      );

      if (!sourceAccount) {
        throw new Error(`No merchant account for ${payout.currency}`);
      }

      const tlPayout = await this.truelayerConnector.createPayout(
        sourceAccount.id,
        // TrueLayer PaymentAmount.value is in minor units (pence/cents) — convert via Cents type (FND-024)
        { currency: payout.currency, value: toStripeAmount(fromDollars(payout.netAmount)) },
        {
          type: "external_account",
          accountHolderName: recipient.bankDetails.accountHolderName,
          accountIdentifier: recipient.bankDetails.iban
            ? { type: "iban", iban: recipient.bankDetails.iban }
            : {
                type: "sort_code_account_number",
                sortCode: recipient.bankDetails.sortCode,
                accountNumber: recipient.bankDetails.accountNumber,
              },
        },
        payout.reference,
      );

      return tlPayout.id;
    }

    // US ACH via Stripe
    if (recipient.bankDetails.country === "US") {
      // Create bank account token
      const bankToken = await stripe.tokens.create({
        bank_account: {
          country: "US",
          currency: "usd",
          account_holder_name: recipient.bankDetails.accountHolderName,
          account_holder_type: "individual",
          routing_number: recipient.bankDetails.routingNumber!,
          account_number: recipient.bankDetails.accountNumber!,
        },
      });

      // Create payout
      const payout_ = await stripe.payouts.create(
        {
          // Stripe amount is integer cents; netAmount is dollars — convert via Cents type
          amount: toStripeAmount(fromDollars(payout.netAmount)),
          currency: payout.currency.toLowerCase(),
          destination: bankToken.id,
          description: payout.description,
          metadata: {
            payout_id: payout.id,
            type: payout.type,
          },
        },
        {
          stripeAccount: process.env.STRIPE_PLATFORM_ACCOUNT_ID,
          // Idempotency key derived from stable payout row id — prevents double-pay on retry (FND-026)
          idempotencyKey: `payout-${payout.id}`,
        },
      );

      return payout_.id;
    }

    // Fallback: Queue for manual processing
    return await this.queueManualPayout(payout, recipient);
  }

  /**
   * Process payout via PayPal
   */
  private async processPayPalPayout(
    payout: Payout,
    recipient: PayoutRecipient,
  ): Promise<string> {
    if (!recipient.paypalEmail) {
      throw new Error("Recipient does not have a PayPal email");
    }

    // Queue for manual PayPal payout (would integrate with PayPal API in production)
    const reference = await this.queueManualPayout(payout, recipient);
    return `PP-${reference}`;
  }

  /**
   * Process check payout
   */
  private async processCheckPayout(
    payout: Payout,
    recipient: PayoutRecipient,
  ): Promise<string> {
    // Queue for check printing/mailing
    const reference = await this.queueManualPayout(payout, recipient);
    return `CHK-${reference}`;
  }

  /**
   * Queue payout for manual processing
   */
  private async queueManualPayout(
    payout: Payout,
    recipient: PayoutRecipient,
  ): Promise<string> {
    const reference = this.generateReference();

    const { error: queueError } = await supabase
      .from("manual_payout_queue")
      .insert({
      payout_id: payout.id,
      reference,
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      method: payout.method,
      // Store as integer cents — manual_payout_queue.amount is in minor units (FND-024)
      amount: toStripeAmount(fromDollars(payout.netAmount)),
      currency: payout.currency,
      bank_details: recipient.bankDetails,
      paypal_email: recipient.paypalEmail,
      created_at: new Date().toISOString(),
    });

    // This is the FALLBACK rail — it runs when an automated payout could not be
    // sent. A fire-and-forget insert meant the queue entry could vanish while
    // the caller still marked the payout "in_transit", producing a payout that
    // is owed, believed to be moving, and recorded nowhere. Fail loudly: an
    // unqueued manual payout must not look like a queued one.
    if (queueError) {
      throw new Error(
        `Failed to queue manual payout ${payout.id} (ref ${reference}): ${queueError.message}`,
      );
    }

    return reference;
  }

  // ===========================================================================
  // Batch Payouts
  // ===========================================================================

  /**
   * Create a batch of payouts
   */
  async createPayoutBatch(requests: PayoutRequest[]): Promise<PayoutBatch> {
    const batchId = this.generateBatchId();
    const currency = requests[0]?.currency || "USD";
    const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);

    // Create batch record
    const { error: batchError } = await supabase.from("payout_batches").insert({
      id: batchId,
      status: "pending",
      total_amount: totalAmount,
      currency,
      payout_count: requests.length,
      success_count: 0,
      failure_count: 0,
      created_at: new Date().toISOString(),
    });

    // Without the batch row the individual payouts still process but are
    // unreconcilable — there is no record of what was meant to go out together.
    if (batchError) {
      throw new Error(
        `Failed to create payout batch ${batchId}: ${batchError.message}`,
      );
    }

    // Process payouts
    const payouts: Payout[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const request of requests) {
      try {
        const payout = await this.createPayout(request);
        payouts.push(payout);
        successCount++;
      } catch (_error) {
        failureCount++;
        // PayoutService error: Payout failed for recipient
        void _error;
      }
    }

    // Update batch status
    const status =
      failureCount === 0
        ? "completed"
        : successCount === 0
          ? "failed"
          : "partial";

    const { error: batchUpdateError } = await supabase
      .from("payout_batches")
      .update({
        status,
        success_count: successCount,
        failure_count: failureCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    // A batch stuck at "pending" after its payouts finished is indistinguishable
    // from one that never ran.
    if (batchUpdateError) {
      throw new Error(
        `Failed to finalise payout batch ${batchId}: ${batchUpdateError.message}`,
      );
    }

    return {
      id: batchId,
      status,
      totalAmount,
      currency,
      payoutCount: requests.length,
      successCount,
      failureCount,
      createdAt: new Date(),
      completedAt: new Date(),
      payouts,
    };
  }

  // ===========================================================================
  // Scheduled Payouts
  // ===========================================================================

  /**
   * Create a payout schedule
   */
  async createPayoutSchedule(
    recipientId: string,
    schedule: Omit<
      PayoutSchedule,
      "id" | "recipientId" | "lastPayoutDate" | "nextPayoutDate"
    >,
  ): Promise<PayoutSchedule> {
    const nextPayoutDate = this.calculateNextPayoutDate(
      schedule.frequency,
      schedule.dayOfWeek,
      schedule.dayOfMonth,
    );

    const { data, error } = await supabase
      .from("payout_schedules")
      .insert({
        recipient_id: recipientId,
        frequency: schedule.frequency,
        day_of_week: schedule.dayOfWeek,
        day_of_month: schedule.dayOfMonth,
        minimum_amount: schedule.minimumAmount,
        currency: schedule.currency,
        is_active: schedule.isActive,
        next_payout_date: nextPayoutDate.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payout schedule: ${error.message}`);
    }

    return this.mapPayoutSchedule(data);
  }

  /**
   * Process scheduled payouts
   */
  async processScheduledPayouts(): Promise<PayoutBatch | null> {
    const now = new Date();

    // Get due schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from("payout_schedules")
      .select()
      .eq("is_active", true)
      .lte("next_payout_date", now.toISOString());

    // Fail LOUD: a query error must never be indistinguishable from "no
    // schedules are due" — that silent conflation is what would let this
    // entry point become a no-op that pays nobody, with nothing in the
    // logs to explain why.
    if (schedulesError) {
      throw new Error(
        `Failed to fetch due payout schedules: ${schedulesError.message}`,
      );
    }

    if (!schedules || schedules.length === 0) {
      return null;
    }

    const requests: PayoutRequest[] = [];

    for (const schedule of schedules) {
      // Get pending earnings for this recipient
      const pendingAmount = await this.getPendingEarnings(
        schedule.recipient_id,
      );

      if (pendingAmount >= schedule.minimum_amount) {
        requests.push({
          recipientId: schedule.recipient_id,
          type: "affiliate",
          amount: pendingAmount,
          currency: schedule.currency,
          description: `Scheduled payout for ${now.toISOString().split("T")[0]}`,
        });

        // Update schedule
        const nextPayoutDate = this.calculateNextPayoutDate(
          schedule.frequency,
          schedule.day_of_week,
          schedule.day_of_month,
        );

        const { error: scheduleError } = await supabase
          .from("payout_schedules")
          .update({
            last_payout_date: now.toISOString(),
            next_payout_date: nextPayoutDate.toISOString(),
          })
          .eq("id", schedule.id);

        // If the schedule's cursor does not advance, the next run treats this
        // schedule as still due and pays it again. Losing this write is a
        // duplicate-payout bug, not a bookkeeping nit.
        if (scheduleError) {
          throw new Error(
            `Failed to advance payout schedule ${schedule.id}: ${scheduleError.message}`,
          );
        }
      }
    }

    if (requests.length === 0) {
      return null;
    }

    return this.createPayoutBatch(requests);
  }

  // ===========================================================================
  // Payout Status & History
  // ===========================================================================

  /**
   * Get payout by ID
   */
  async getPayout(payoutId: string): Promise<Payout | null> {
    const { data, error } = await supabase
      .from("payouts")
      .select()
      .eq("id", payoutId)
      .single();

    // PGRST116 is a genuine "no such payout". Any other error means the payout
    // may well exist and we simply could not read it — returning null there
    // reports "no payout" for what is actually a failed lookup.
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to load payout ${payoutId}: ${error.message}`);
    }
    if (!data) return null;
    return this.mapPayout(data);
  }

  /**
   * Get payouts for a recipient
   */
  async getRecipientPayouts(
    recipientId: string,
    options?: {
      status?: PayoutStatus;
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<Payout[]> {
    let query = supabase
      .from("payouts")
      .select()
      .eq("recipient_id", recipientId);

    if (options?.status) {
      query = query.eq("status", options.status);
    }
    if (options?.from) {
      query = query.gte("created_at", options.from.toISOString());
    }
    if (options?.to) {
      query = query.lte("created_at", options.to.toISOString());
    }

    query = query.order("created_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get payouts: ${error.message}`);
    }

    return (data || []).map(this.mapPayout);
  }

  /**
   * Get payout summary for a recipient
   */
  async getPayoutSummary(recipientId: string): Promise<{
    totalPaid: number;
    pendingAmount: number;
    lastPayoutDate?: Date;
    payoutCount: number;
    averagePayoutAmount: number;
  }> {
    const payouts = await this.getRecipientPayouts(recipientId);
    const paidPayouts = payouts.filter((p) => p.status === "paid");
    const pendingAmount = await this.getPendingEarnings(recipientId);

    const totalPaid = paidPayouts.reduce((sum, p) => sum + p.netAmount, 0);
    const lastPayoutDate = paidPayouts[0]?.paidAt;
    const payoutCount = paidPayouts.length;
    const averagePayoutAmount = payoutCount > 0 ? totalPaid / payoutCount : 0;

    return {
      totalPaid,
      pendingAmount,
      lastPayoutDate,
      payoutCount,
      averagePayoutAmount,
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async getRecipient(
    recipientId: string,
  ): Promise<PayoutRecipient | null> {
    // Try partners first
    const { data: partner } = await supabase
      .from("affiliate_partners")
      .select("*")
      .eq("id", recipientId)
      .single();

    if (partner) {
      return {
        id: partner.id,
        type: "partner",
        name: partner.name,
        email: partner.email || "",
        preferredMethod: partner.payment_method || "stripe_connect",
        stripeAccountId: partner.stripe_account_id,
        bankDetails: partner.bank_details,
      };
    }

    // Try profiles table (canonical user data table)
    // Note: Some payout fields may need to be added to profiles schema
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", recipientId)
      .single();

    if (profile) {
      // Get email from auth.users using admin API (requires service role key)
      let userEmail: string | undefined;
      try {
        const { data: authData } =
          await supabase.auth.admin.getUserById(recipientId);
        userEmail = authData?.user?.email;
      } catch (_error) {
        // PayoutService warning: Could not fetch user email via admin API
        void _error;
      }

      // Cast profile to access optional payout fields (may need schema migration)
      const profileData = profile as Record<string, unknown>;

      return {
        id: profile.id,
        type: "user" as const,
        name: profile.full_name || userEmail || "User",
        email: userEmail || "",
        preferredMethod:
          (profileData.payout_method as PayoutMethod) || "bank_transfer",
        stripeAccountId: profileData.stripe_connect_id as string | undefined,
        bankDetails: profileData.bank_details as PayoutRecipient["bankDetails"],
        paypalEmail: profileData.paypal_email as string | undefined,
      };
    }

    return null;
  }

  private async getPendingEarnings(recipientId: string): Promise<number> {
    // Get confirmed but unpaid conversions
    const { data, error } = await supabase
      .from("affiliate_conversions")
      .select("commission_earned")
      .eq("partner_id", recipientId)
      .in("status", ["confirmed", "qualified"]);

    // Fail LOUD: a query error must never be read as "$0 pending" — that
    // silent default is what let a batch/schedule run believe every
    // recipient has nothing owed, starving real payouts with no error.
    if (error) {
      throw new Error(
        `Failed to compute pending earnings for ${recipientId}: ${error.message}`,
      );
    }

    return (data || []).reduce((sum, c) => sum + (c.commission_earned || 0), 0);
  }

  /**
   * amount/fee/net are all dollars at this function's boundary (payouts.amount,
   * .fee, .net_amount are dollar-denominated columns — createPayoutRecord writes
   * request.amount straight through unconverted). Fee arithmetic itself runs in
   * integer cents via the Money module so flat-cent fees (50 = $0.50, etc.) never
   * get summed against a dollar-scaled amount (that mismatch was the bug: a $50
   * bank_transfer netted $50 - 50 = $0.00 instead of $49.50).
   */
  private calculateFees(
    amount: number,
    method: PayoutMethod,
  ): { fee: number; net: number } {
    const amountCents = fromDollars(amount);
    let feeCents: Cents = cents(0);

    switch (method) {
      case "stripe_connect":
        feeCents = cents(Math.ceil(amountCents * 0.0025)); // 0.25%
        break;
      case "bank_transfer":
      case "open_banking":
        feeCents = cents(50); // $0.50 flat
        break;
      case "paypal":
        feeCents = cents(Math.ceil(amountCents * 0.02) + 25); // 2% + $0.25
        break;
      case "check":
        feeCents = cents(100); // $1.00 for printing/mailing
        break;
    }

    const netCents = cents(amountCents - feeCents);

    return {
      fee: toDollars(feeCents),
      net: toDollars(netCents),
    };
  }

  private async createPayoutRecord(
    data: Omit<Payout, "id" | "createdAt" | "status">,
  ): Promise<Payout> {
    const { data: record, error } = await supabase
      .from("payouts")
      .insert({
        recipient_id: data.recipientId,
        recipient_type: data.recipientType,
        type: data.type,
        method: data.method,
        amount: data.amount,
        fee: data.fee,
        net_amount: data.netAmount,
        currency: data.currency,
        description: data.description,
        reference: data.reference,
        source_ids: data.sourceIds,
        status: "pending",
        metadata: data.metadata,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payout record: ${error.message}`);
    }

    return this.mapPayout(record);
  }

  private async updatePayoutStatus(
    payoutId: string,
    status: PayoutStatus,
    failureReason?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };

    if (status === "paid") {
      updateData.paid_at = new Date().toISOString();
    } else if (status === "failed") {
      updateData.failed_at = new Date().toISOString();
      updateData.failure_reason = failureReason;
    }

    const { error: statusError } = await supabase
      .from("payouts")
      .update(updateData)
      .eq("id", payoutId);

    // The single most dangerous silent failure in this file: this is what
    // records that a payout reached "paid" or "failed". Losing it leaves the
    // row stuck at its previous status, so a reconciliation or retry job would
    // treat an already-sent payout as unsent. Money can go out twice.
    if (statusError) {
      throw new Error(
        `Failed to update payout ${payoutId} to status ${status}: ${statusError.message}`,
      );
    }
  }

  private calculateNextPayoutDate(
    frequency: string,
    dayOfWeek?: number,
    dayOfMonth?: number,
  ): Date {
    const now = new Date();

    switch (frequency) {
      case "weekly":
        const targetDay = dayOfWeek ?? 5; // Default Friday
        const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
        return new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);

      case "biweekly":
        const biweeklyTarget = dayOfWeek ?? 5;
        const biweeklyDays = (biweeklyTarget - now.getDay() + 14) % 14 || 14;
        return new Date(now.getTime() + biweeklyDays * 24 * 60 * 60 * 1000);

      case "monthly":
        const targetDate = dayOfMonth ?? 1;
        const nextMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          targetDate,
        );
        return nextMonth;

      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PO-${timestamp}-${random}`.toUpperCase();
  }

  private generateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `BATCH-${timestamp}-${random}`.toUpperCase();
  }

  private isEurozone(country: string): boolean {
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
    return eurozoneCountries.includes(country);
  }

  private mapPayout(row: Record<string, unknown>): Payout {
    return {
      id: row.id as string,
      recipientId: row.recipient_id as string,
      recipientType: row.recipient_type as "partner" | "user",
      type: row.type as PayoutType,
      status: row.status as PayoutStatus,
      method: row.method as PayoutMethod,
      amount: row.amount as number,
      fee: row.fee as number,
      netAmount: row.net_amount as number,
      currency: row.currency as string,
      description: row.description as string | undefined,
      reference: row.reference as string,
      providerPayoutId: row.provider_payout_id as string | undefined,
      sourceIds: row.source_ids as string[] | undefined,
      createdAt: new Date(row.created_at as string),
      processedAt: row.processed_at
        ? new Date(row.processed_at as string)
        : undefined,
      paidAt: row.paid_at ? new Date(row.paid_at as string) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at as string) : undefined,
      failureReason: row.failure_reason as string | undefined,
      metadata: row.metadata as Record<string, string> | undefined,
    };
  }

  private mapPayoutSchedule(row: Record<string, unknown>): PayoutSchedule {
    return {
      id: row.id as string,
      recipientId: row.recipient_id as string,
      frequency: row.frequency as "weekly" | "biweekly" | "monthly",
      dayOfWeek: row.day_of_week as number | undefined,
      dayOfMonth: row.day_of_month as number | undefined,
      minimumAmount: row.minimum_amount as number,
      currency: row.currency as string,
      isActive: row.is_active as boolean,
      lastPayoutDate: row.last_payout_date
        ? new Date(row.last_payout_date as string)
        : undefined,
      nextPayoutDate: new Date(row.next_payout_date as string),
    };
  }
}

// Export singleton
export const payoutService = new PayoutService();
export default payoutService;
