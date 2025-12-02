export interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceNumber: number;
  priceSuffix: string;
  priceId: string;
  features: string[];
}

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
