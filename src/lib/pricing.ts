/**
 * Pricing Module
 *
 * Defines subscription pricing tiers for CreditMaster Pro.
 * Integrates with Stripe for payment processing.
 *
 * @module pricing
 */

/**
 * Represents a subscription pricing tier
 * @interface PricingTier
 */
export interface PricingTier {
  /** Unique identifier for the tier (e.g., 'basic', 'premium', 'enterprise') */
  id: string;
  /** Display name of the tier */
  name: string;
  /** Price as a string for display (e.g., '29') */
  price: string;
  /** Numeric price value for calculations */
  priceNumber: number;
  /** Price suffix for display (e.g., '/ month') */
  priceSuffix: string;
  /** Stripe Price ID for checkout integration */
  priceId: string;
  /** List of features included in this tier */
  features: string[];
}

/**
 * Available subscription pricing tiers
 *
 * - **Basic** ($29/mo): Entry-level with AI analysis and 5 disputes/month
 * - **Premium** ($79/mo): Unlimited disputes, student loan optimization
 * - **Enterprise** ($199/mo): Multi-user, API access, white-label options
 *
 * @constant
 */
export const pricingTiers: PricingTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '29',
    priceNumber: 29,
    priceSuffix: '/ month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || 'price_basic',
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
    name: 'Premium',
    price: '79',
    priceNumber: 79,
    priceSuffix: '/ month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || 'price_premium',
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
    name: 'Enterprise',
    price: '199',
    priceNumber: 199,
    priceSuffix: '/ month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
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
