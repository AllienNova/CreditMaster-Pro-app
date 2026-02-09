/**
 * Stripe Payment Service
 * 
 * Handles all payment-related operations including:
 * - Subscription creation and management
 * - Payment processing
 * - Invoice generation
 * - Webhook handling
 */

import Stripe from 'stripe';

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build', {
  apiVersion: '2025-09-30.clover',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  interval: 'month' | 'year';
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
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
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
    id: 'free',
    name: 'Free',
    priceId: 'price_free', // No Stripe price ID needed for free tier
    price: 0,
    interval: 'month',
    features: [
      'Credit score from 1 bureau',
      'Basic budgeting tools',
      '10 AI chat messages/month',
      'Mobile app access',
      '2 linked accounts',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    priceId: process.env.STRIPE_STANDARD_PRICE_ID || 'price_standard',
    price: 29.99,
    interval: 'month',
    features: [
      'Credit scores from all 3 bureaus',
      '10 AI-powered disputes/month',
      'Smart budgeting with AI insights',
      'Debt payoff strategies',
      'Basic investment tracking',
      'Priority email support',
      'Unlimited linked accounts',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    price: 99.99,
    interval: 'month',
    features: [
      'Everything in Standard',
      'Unlimited AI-powered disputes',
      'Bill negotiation (no success fees!)',
      'Full investment intelligence suite',
      'Student loan optimization',
      '24/7 AI financial coach',
      'Priority chat & phone support',
      'Advanced analytics dashboard',
    ],
  },
  {
    id: 'family-duo',
    name: 'Family Duo',
    priceId: process.env.STRIPE_FAMILY_DUO_PRICE_ID || 'price_family_duo',
    price: 159.99,
    interval: 'month',
    features: [
      'Everything in Pro',
      'Up to 2 family members',
      'Family financial dashboard',
      'Shared goals & milestones',
      'Joint account tracking',
      'Family budget collaboration',
      'Priority support',
    ],
  },
  {
    id: 'family',
    name: 'Family',
    priceId: process.env.STRIPE_FAMILY_PRICE_ID || 'price_family',
    price: 199.99,
    interval: 'month',
    features: [
      'Everything in Pro',
      'Up to 3 family members',
      'Family financial dashboard',
      'Shared goals & milestones',
      'Kids financial education module',
      'College savings optimizer',
      'Family net worth tracking',
      'Priority support',
    ],
  },
  {
    id: 'family-plus',
    name: 'Family Plus',
    priceId: process.env.STRIPE_FAMILY_PLUS_PRICE_ID || 'price_family_plus',
    price: 399.99,
    interval: 'month',
    features: [
      'Everything in Family',
      'Up to 5 family members',
      'Inheritance & estate planning tools',
      'Dedicated account manager',
      'Monthly family financial review call',
      'Custom reporting & exports',
      'API access for integrations',
      'White-glove onboarding',
      'Priority everything (1-hour response)',
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
  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
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
    trialDays?: number
  ): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
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
    priceId: string
  ): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    });
    
    return updated;
  }
  
  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
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
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }
  
  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    customerId?: string,
    metadata?: Record<string, string>
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
    trialDays?: number
  ): Promise<Stripe.Checkout.Session> {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      subscription_data: trialDays ? {
        trial_period_days: trialDays,
      } : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    
    return session;
  }
  
  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
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
  async listInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
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
    items: Array<{ description: string; amount: number; quantity?: number }>
  ): Promise<Stripe.Invoice> {
    // Create invoice items
    for (const item of items) {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(item.amount * 100),
        currency: 'usd',
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
  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    return paymentMethod;
  }
  
  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
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
    paymentMethodId: string
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
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    return paymentMethods.data;
  }
  
  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }
  
  /**
   * Handle webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        // Stripe: Unhandled event type
    }
  }
  
  // Webhook handlers
  
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    // Stripe: Subscription created
    const { subscriptionService } = await import('../subscriptions/subscription-service');
    await subscriptionService.handleSubscriptionCreated(subscription);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    // Stripe: Subscription updated
    const { subscriptionService } = await import('../subscriptions/subscription-service');
    await subscriptionService.handleSubscriptionUpdated(subscription);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    // Stripe: Subscription deleted
    const { subscriptionService } = await import('../subscriptions/subscription-service');
    await subscriptionService.handleSubscriptionDeleted(subscription);
  }
  
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Stripe: Invoice paid

    // Get customer email for notification
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (customerId) {
      try {
        const customer = await this.getCustomer(customerId);
        const { notificationService } = await import('../notifications/notification-service');

        // Send payment confirmation email
        if (customer.email) {
          await notificationService.sendPaymentSuccessEmail(
            customer.email,
            customer.name || 'Customer',
            invoice.amount_paid ? invoice.amount_paid / 100 : 0,
            invoice.id
          );
        }

        // Log successful payment for analytics
        const { logger } = await import('../monitoring/logger');
        logger.info('Payment successful', {
          invoiceId: invoice.id,
          customerId,
          amount: invoice.amount_paid,
          currency: invoice.currency,
        });
      } catch (error) {
        // Stripe error: Failed to process invoice paid event
      }
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Stripe: Invoice payment failed

    // Get customer email for notification
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (customerId) {
      try {
        const customer = await this.getCustomer(customerId);
        const { notificationService } = await import('../notifications/notification-service');

        // Send payment failure email
        if (customer.email) {
          await notificationService.sendPaymentFailedEmail(
            customer.email,
            invoice.amount_due ? invoice.amount_due / 100 : 0,
            `Invoice ${invoice.id} payment failed. Please update your payment method.`
          );
        }

        // Log payment failure for monitoring
        const { logger } = await import('../monitoring/logger');
        logger.warn('Payment failed', {
          invoiceId: invoice.id,
          customerId,
          amount: invoice.amount_due,
          currency: invoice.currency,
        });
      } catch (error) {
        // Stripe error: Failed to process invoice payment failed event
      }
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Stripe: Payment intent succeeded

    // Log successful payment for analytics
    try {
      const { logger } = await import('../monitoring/logger');
      logger.info('Payment intent succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: typeof paymentIntent.customer === 'string'
          ? paymentIntent.customer
          : paymentIntent.customer?.id,
      });
    } catch (error) {
      // Stripe error: Failed to log payment intent success
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Stripe: Payment intent failed

    // Log payment failure for monitoring and alerting
    try {
      const { logger } = await import('../monitoring/logger');
      logger.error('Payment intent failed', new Error('Payment intent failed'), {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: typeof paymentIntent.customer === 'string'
          ? paymentIntent.customer
          : paymentIntent.customer?.id,
        lastPaymentError: paymentIntent.last_payment_error?.message,
      });
    } catch (error) {
      // Stripe error: Failed to log payment intent failure
    }
  }
  
  /**
   * Get subscription plan by ID
   */
  getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
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

