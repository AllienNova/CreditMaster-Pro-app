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
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: '🌟 Basic Plan',
    priceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic',
    price: 29,
    interval: 'month',
    features: [
      'AI-powered credit analysis',
      'Basic dispute letter generation',
      'Credit score tracking',
      'Email support',
      '5 disputes per month',
    ],
  },
  {
    id: 'premium',
    name: '🚀 Premium Plan',
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium',
    price: 79,
    interval: 'month',
    features: [
      'Everything in Basic',
      'Advanced AI strategies',
      'Unlimited disputes',
      'Priority support',
      'Student loan optimization',
      'Credit building recommendations',
    ],
  },
  {
    id: 'enterprise',
    name: '💼 Enterprise Plan',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    price: 199,
    interval: 'month',
    features: [
      'Everything in Premium',
      'Multi-user access',
      'Dedicated account manager',
      'Custom AI training',
      'API access',
      'White-label options',
      'Advanced analytics',
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
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
  
  // Webhook handlers
  
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription created:', subscription.id);
    const { subscriptionService } = await import('../subscriptions/subscription-service');
    await subscriptionService.handleSubscriptionCreated(subscription);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    const { subscriptionService } = await import('../subscriptions/subscription-service');
    await subscriptionService.handleSubscriptionUpdated(subscription);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    const { subscriptionService } = await import('../subscriptions/subscription-service');
    await subscriptionService.handleSubscriptionDeleted(subscription);
  }
  
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    console.log('Invoice paid:', invoice.id);
    // TODO: Update payment history in database
  }
  
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Invoice payment failed:', invoice.id);
    // TODO: Notify user of payment failure
  }
  
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('Payment intent succeeded:', paymentIntent.id);
    // TODO: Process successful payment
  }
  
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('Payment intent failed:', paymentIntent.id);
    // TODO: Handle failed payment
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

