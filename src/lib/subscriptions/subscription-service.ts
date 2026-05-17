/**
 * Subscription Service (Database Version)
 *
 * Manages subscription lifecycle with Stripe + Supabase:
 * - Create subscriptions
 * - Update subscription status
 * - Cancel subscriptions
 * - Sync with Stripe webhooks
 * - Update user profile subscription tier
 */

import { getSupabase } from "../supabase/client";
import type { Database } from "../supabase/types";
import { stripeService } from "../payment/stripe-service";
import {
  tierFromPriceId,
  type SubscriptionTier,
} from "../payment/tier-mapping";
import type Stripe from "stripe";

// Type helpers for Supabase operations
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];
type SubscriptionInsert =
  Database["public"]["Tables"]["subscriptions"]["Insert"];
type SubscriptionUpdate =
  Database["public"]["Tables"]["subscriptions"]["Update"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// Helper to get typed table references
const subscriptions = () => getSupabase().from("subscriptions");
const profiles = () => getSupabase().from("profiles");

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";
export type { SubscriptionTier };

export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  fullName: string | null;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: "active" | "canceled" | "past_due" | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription Service Class with Stripe + Supabase
 */
class SubscriptionService {
  /**
   * Create a new subscription
   */
  async createSubscription(
    userId: string,
    priceId: string,
    trialDays?: number,
  ): Promise<{ subscription: Subscription; clientSecret: string }> {
    // Get or create Stripe customer
    const profile = await this.getUserProfile(userId);
    let customerId = profile?.stripeCustomerId;

    if (!customerId) {
      // Get user email from auth
      const { data: authUser } = await getSupabase().auth.getUser();
      if (!authUser.user) {
        throw new Error("User not authenticated");
      }

      // Create Stripe customer
      const customer = await stripeService.createCustomer(
        authUser.user.email!,
        profile?.fullName || undefined,
        { userId },
      );

      customerId = customer.id;

      // Update profile with Stripe customer ID
      await this.updateProfileStripeCustomer(userId, customerId);
    }

    // Create Stripe subscription
    const stripeSubscription = await stripeService.createSubscription(
      customerId,
      priceId,
      trialDays,
    );

    // Get client secret for payment confirmation
    const clientSecret = this.extractClientSecret(stripeSubscription);

    // Save subscription to database
    // In Stripe API v2025+, current_period_start/end are on subscription items
    const firstItem = stripeSubscription.items.data[0];
    const insertData: SubscriptionInsert = {
      user_id: userId,
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: priceId,
      status: stripeSubscription.status,
      current_period_start: firstItem?.current_period_start
        ? new Date(firstItem.current_period_start * 1000).toISOString()
        : null,
      current_period_end: firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    };

    const { data, error } = await subscriptions()
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      // Subscription error:('Failed to save subscription to database:', error);
      throw new Error(`Failed to save subscription: ${error.message}`);
    }

    // Update profile subscription tier
    const tier = tierFromPriceId(priceId);
    await this.updateProfileSubscriptionTier(
      userId,
      tier,
      stripeSubscription.status,
    );

    return {
      subscription: this.mapToSubscription(data as SubscriptionRow),
      clientSecret,
    };
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await subscriptions()
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      // Subscription error:('Failed to fetch subscription:', error);
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }

    return this.mapToSubscription(data);
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  async getSubscriptionByStripeId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    const { data, error } = await subscriptions()
      .select("*")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      // Subscription error:('Failed to fetch subscription:', error);
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }

    return this.mapToSubscription(data);
  }

  /**
   * Update subscription status (called from webhooks)
   */
  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string,
    currentPeriodStart?: number,
    currentPeriodEnd?: number,
    cancelAtPeriodEnd?: boolean,
  ): Promise<Subscription> {
    const updates: SubscriptionUpdate = { status };

    if (currentPeriodStart) {
      updates.current_period_start = new Date(
        currentPeriodStart * 1000,
      ).toISOString();
    }
    if (currentPeriodEnd) {
      updates.current_period_end = new Date(
        currentPeriodEnd * 1000,
      ).toISOString();
    }
    if (cancelAtPeriodEnd !== undefined) {
      updates.cancel_at_period_end = cancelAtPeriodEnd;
    }

    const query1 = subscriptions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (query1 as any)
      .update(updates)
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .select()
      .single();

    if (error) {
      // Subscription error:('Failed to update subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    // Update profile subscription status
    const subscription = this.mapToSubscription(data as SubscriptionRow);
    await this.updateProfileSubscriptionStatus(subscription.userId, status);

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    immediately: boolean = false,
  ): Promise<Subscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // Cancel in Stripe
    const stripeSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      immediately,
    );

    // Update database
    const updateData: SubscriptionUpdate = {
      status: stripeSubscription.status,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    };

    const query2 = subscriptions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (query2 as any)
      .update(updateData)
      .eq("stripe_subscription_id", subscription.stripeSubscriptionId)
      .select()
      .single();

    if (error) {
      // Subscription error:('Failed to update canceled subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    // Update profile
    if (immediately) {
      await this.updateProfileSubscriptionTier(userId, "free", "canceled");
    } else {
      await this.updateProfileSubscriptionStatus(
        userId,
        stripeSubscription.status,
      );
    }

    return this.mapToSubscription(data as SubscriptionRow);
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.cancelAtPeriodEnd) {
      throw new Error("No subscription to reactivate");
    }

    // Reactivate in Stripe
    const stripeSubscription = await stripeService.reactivateSubscription(
      subscription.stripeSubscriptionId,
    );

    // Update database
    const updateData: SubscriptionUpdate = {
      cancel_at_period_end: false,
      status: stripeSubscription.status,
    };

    const query3 = subscriptions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (query3 as any)
      .update(updateData)
      .eq("stripe_subscription_id", subscription.stripeSubscriptionId)
      .select()
      .single();

    if (error) {
      // Subscription error:('Failed to update reactivated subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    // Update profile
    await this.updateProfileSubscriptionStatus(
      userId,
      stripeSubscription.status,
    );

    return this.mapToSubscription(data as SubscriptionRow);
  }

  /**
   * Change subscription plan
   */
  async changeSubscriptionPlan(
    userId: string,
    newPriceId: string,
  ): Promise<Subscription> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error("No active subscription found");
    }

    // Update in Stripe
    const stripeSubscription = await stripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      newPriceId,
    );

    // Update database
    const updateData2: SubscriptionUpdate = {
      stripe_price_id: newPriceId,
      status: stripeSubscription.status,
    };

    const query4 = subscriptions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (query4 as any)
      .update(updateData2)
      .eq("stripe_subscription_id", subscription.stripeSubscriptionId)
      .select()
      .single();

    if (error) {
      // Subscription error:('Failed to update subscription plan:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    // Update profile tier
    const tier = tierFromPriceId(newPriceId);
    await this.updateProfileSubscriptionTier(
      userId,
      tier,
      stripeSubscription.status,
    );

    return this.mapToSubscription(data as SubscriptionRow);
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await profiles()
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      // Subscription error:('Failed to fetch profile:', error);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return this.mapToUserProfile(data);
  }

  /**
   * Update profile Stripe customer ID
   */
  private async updateProfileStripeCustomer(
    userId: string,
    stripeCustomerId: string,
  ): Promise<void> {
    const updateData: ProfileUpdate = { stripe_customer_id: stripeCustomerId };
    const query5 = profiles();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (query5 as any).update(updateData).eq("id", userId);

    if (error) {
      // Subscription error:('Failed to update profile Stripe customer:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Update profile subscription tier
   */
  private async updateProfileSubscriptionTier(
    userId: string,
    tier: SubscriptionTier,
    status: string,
  ): Promise<void> {
    const updateData: ProfileUpdate = {
      subscription_tier: tier,
      subscription_status: status as "active" | "canceled" | "past_due",
    };
    const { error } = await profiles().update(updateData).eq("id", userId);

    if (error) {
      // Subscription error:('Failed to update profile subscription tier:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Update profile subscription status
   */
  private async updateProfileSubscriptionStatus(
    userId: string,
    status: string,
  ): Promise<void> {
    const updateData: ProfileUpdate = {
      subscription_status: status as "active" | "canceled" | "past_due",
    };
    const query7 = profiles();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (query7 as any).update(updateData).eq("id", userId);

    if (error) {
      // Subscription error:('Failed to update profile subscription status:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Extract client secret from Stripe subscription
   * In Stripe API v2025+, the client_secret is in confirmation_secret
   */
  private extractClientSecret(subscription: Stripe.Subscription): string {
    const latestInvoice = subscription.latest_invoice;
    if (typeof latestInvoice === "object" && latestInvoice !== null) {
      const invoice = latestInvoice as Stripe.Invoice;
      // In newer Stripe API versions, use confirmation_secret
      const confirmationSecret = invoice.confirmation_secret;
      if (confirmationSecret && typeof confirmationSecret === "object") {
        // The confirmation_secret object contains the client_secret
        return (
          (confirmationSecret as { client_secret?: string }).client_secret || ""
        );
      }
    }
    return "";
  }

  /**
   * Webhook handler: Subscription created
   */
  async handleSubscriptionCreated(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const userId = stripeSubscription.metadata?.userId;
    if (!userId) {
      // Subscription error:('No userId in subscription metadata');
      return;
    }

    // Check if already exists
    const existing = await this.getSubscriptionByStripeId(
      stripeSubscription.id,
    );
    if (existing) {
      // Subscription:('Subscription already exists, skipping');
      return;
    }

    // Create subscription record - In Stripe API v2025+, current_period_start/end are on subscription items
    const firstItem = stripeSubscription.items.data[0];
    const insertData: SubscriptionInsert = {
      user_id: userId,
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: firstItem.price.id,
      status: stripeSubscription.status,
      current_period_start: firstItem?.current_period_start
        ? new Date(firstItem.current_period_start * 1000).toISOString()
        : null,
      current_period_end: firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    };

    const { error } = await subscriptions().insert(insertData as any);

    if (error) {
      throw new Error(`Failed to save subscription from webhook: ${error.message}`);
    }

    // Update profile
    const tier = tierFromPriceId(firstItem.price.id);
    await this.updateProfileSubscriptionTier(
      userId,
      tier,
      stripeSubscription.status,
    );
  }

  /**
   * Webhook handler: Subscription updated
   */
  async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const firstItem = stripeSubscription.items.data[0];
    await this.updateSubscriptionStatus(
      stripeSubscription.id,
      stripeSubscription.status,
      firstItem?.current_period_start,
      firstItem?.current_period_end,
      stripeSubscription.cancel_at_period_end,
    );
  }

  /**
   * Webhook handler: Subscription deleted
   */
  async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const subscription = await this.getSubscriptionByStripeId(
      stripeSubscription.id,
    );
    if (!subscription) {
      // Subscription error:('Subscription not found for deletion');
      return;
    }

    // Update status to canceled
    await this.updateSubscriptionStatus(stripeSubscription.id, "canceled");

    // Update profile to free tier
    await this.updateProfileSubscriptionTier(
      subscription.userId,
      "free",
      "canceled",
    );
  }

  /**
   * Map database row to Subscription interface
   */
  private mapToSubscription(
    row: Database["public"]["Tables"]["subscriptions"]["Row"],
  ): Subscription {
    return {
      id: row.id,
      userId: row.user_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripePriceId: row.stripe_price_id,
      status: row.status,
      currentPeriodStart: row.current_period_start
        ? new Date(row.current_period_start)
        : undefined,
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end)
        : undefined,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to UserProfile interface
   */
  private mapToUserProfile(
    row: Database["public"]["Tables"]["profiles"]["Row"],
  ): UserProfile {
    return {
      id: row.id,
      fullName: row.full_name,
      subscriptionTier: row.subscription_tier,
      subscriptionStatus: row.subscription_status,
      stripeCustomerId: row.stripe_customer_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
export default subscriptionService;
