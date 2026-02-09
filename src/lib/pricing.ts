/**
 * Pricing Module
 *
 * Defines subscription pricing tiers for Fynvita.
 * Integrates with Stripe for payment processing.
 *
 * New pricing model as of 2025:
 * - Free: Basic credit monitoring and budgeting
 * - Standard ($29.99/mo): Full credit health + financial wellness (3% annual discount)
 * - Pro ($99.99/mo): Everything + Investment Intelligence + AI Coach (8% annual discount)
 * - Family Duo ($159.99/mo): 2 members + all Pro features (18% annual discount)
 * - Family ($199.99/mo): 3 members + all Pro features (18% annual discount)
 * - Family Plus ($399.99/mo): 5 members + premium perks (18% annual discount)
 *
 * @module pricing
 */

/**
 * Represents a subscription pricing tier
 * @interface PricingTier
 */
export interface PricingTier {
  /** Unique identifier for the tier (e.g., 'free', 'standard', 'pro', 'family') */
  id: string;
  /** Display name of the tier */
  name: string;
  /** Price as a string for display (e.g., '29.99') */
  price: string;
  /** Numeric price value for calculations */
  priceNumber: number;
  /** Annual price (20% discount) */
  annualPrice: number;
  /** Price suffix for display (e.g., '/month') */
  priceSuffix: string;
  /** Stripe Price ID for checkout integration */
  priceId: string;
  /** Stripe Annual Price ID for checkout integration */
  annualPriceId: string;
  /** Short description of the tier */
  description: string;
  /** List of features included in this tier */
  features: string[];
  /** Features NOT included (for comparison) */
  excludedFeatures?: string[];
  /** Whether this tier is highlighted as popular */
  popular?: boolean;
  /** Badge text (e.g., "Most Popular", "Best Value") */
  badge?: string;
  /** Call to action text */
  cta: string;
  /** Feature limits */
  limits: {
    disputes: number | 'unlimited';
    linkedAccounts: number | 'unlimited';
    users: number;
    aiChatMessages: number | 'unlimited';
    portfolioHoldings: number | 'unlimited';
  };
}

/**
 * Feature add-ons available for purchase
 */
export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  availableFor: string[]; // Which tiers can purchase this add-on
}

/**
 * Available subscription pricing tiers
 *
 * Competitive positioning:
 * - vs Credit Karma: We offer ALL 3 bureaus, AI disputes, investment tools
 * - vs Rocket Money: Bill negotiation INCLUDED (no 35-60% fees), plus credit repair
 *
 * @constant
 */
export const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    priceNumber: 0,
    annualPrice: 0,
    priceSuffix: '/month',
    priceId: 'price_free',
    annualPriceId: 'price_free',
    description: 'Get started with basic financial tracking',
    cta: 'Get Started Free',
    popular: false,
    limits: {
      disputes: 0,
      linkedAccounts: 2,
      users: 1,
      aiChatMessages: 10,
      portfolioHoldings: 5,
    },
    features: [
      'Credit score monitoring (1 bureau)',
      'Basic budget tracking',
      'Transaction categorization',
      'Financial health score',
      'Mobile app access',
      'Educational resources',
      '10 AI chat messages/month',
      'Email support',
    ],
    excludedFeatures: [
      'All 3 credit bureaus',
      'AI dispute letters',
      'Bill negotiation',
      'Investment tracking',
      'Student loan tools',
      '24/7 AI coach',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '29.99',
    priceNumber: 29.99,
    annualPrice: 349.08, // $29.99 * 12 * 0.97 = 3% off
    priceSuffix: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID || 'price_standard',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_ANNUAL_PRICE_ID || 'price_standard_annual',
    description: 'Complete credit health & financial wellness',
    cta: 'Start 14-Day Free Trial',
    popular: false,
    limits: {
      disputes: 10,
      linkedAccounts: 10,
      users: 1,
      aiChatMessages: 100,
      portfolioHoldings: 25,
    },
    features: [
      'Credit monitoring (ALL 3 bureaus)',
      'AI-powered credit analysis',
      '10 AI dispute letters/month',
      'Credit score simulator',
      'Smart budgeting with AI',
      'Bill detection & alerts',
      'Debt payoff strategies',
      'Savings goal tracking',
      'Transaction insights',
      '100 AI chat messages/month',
      'Basic investment tracking',
      'Priority email support',
    ],
    excludedFeatures: [
      'Unlimited disputes',
      'Bill negotiation assistance',
      'Advanced investment analytics',
      'Student loan optimization',
      '24/7 AI financial coach',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '99.99',
    priceNumber: 99.99,
    annualPrice: 1103.89, // $99.99 * 12 * 0.92 = 8% off
    priceSuffix: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
    description: 'Everything you need for complete financial vitality',
    cta: 'Start 14-Day Free Trial',
    popular: true,
    badge: 'Most Popular',
    limits: {
      disputes: 'unlimited',
      linkedAccounts: 'unlimited',
      users: 1,
      aiChatMessages: 'unlimited',
      portfolioHoldings: 'unlimited',
    },
    features: [
      'Everything in Standard, plus:',
      'Unlimited AI dispute letters',
      'Bill negotiation assistance (no fees!)',
      'Advanced credit building strategies',
      'Full investment intelligence suite',
      'Portfolio analytics & risk assessment',
      'AI trading signals & alerts',
      'Student loan optimization',
      'PSLF & IDR program tracking',
      'Loan forgiveness calculator',
      '24/7 AI financial coach',
      'Real-time market data',
      'Tax loss harvesting insights',
      'Priority chat & phone support',
    ],
  },
  {
    id: 'family-duo',
    name: 'Family Duo',
    price: '159.99',
    priceNumber: 159.99,
    annualPrice: 1574.14, // $159.99 * 12 * 0.82 = 18% off
    priceSuffix: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_DUO_PRICE_ID || 'price_family_duo',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_DUO_ANNUAL_PRICE_ID || 'price_family_duo_annual',
    description: 'Perfect for couples managing finances together',
    cta: 'Start 14-Day Free Trial',
    popular: false,
    limits: {
      disputes: 'unlimited',
      linkedAccounts: 'unlimited',
      users: 2,
      aiChatMessages: 'unlimited',
      portfolioHoldings: 'unlimited',
    },
    features: [
      'Everything in Pro, plus:',
      'Up to 2 family members',
      'Family financial dashboard',
      'Shared goals & milestones',
      'Joint account tracking',
      'Family budget collaboration',
      'Family net worth tracking',
      'Priority support',
    ],
  },
  {
    id: 'family',
    name: 'Family',
    price: '199.99',
    priceNumber: 199.99,
    annualPrice: 1967.90, // $199.99 * 12 * 0.82 = 18% off
    priceSuffix: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID || 'price_family',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_ANNUAL_PRICE_ID || 'price_family_annual',
    description: 'Complete financial management for families',
    cta: 'Start 14-Day Free Trial',
    popular: false,
    limits: {
      disputes: 'unlimited',
      linkedAccounts: 'unlimited',
      users: 3,
      aiChatMessages: 'unlimited',
      portfolioHoldings: 'unlimited',
    },
    features: [
      'Everything in Pro, plus:',
      'Up to 3 family members',
      'Family financial dashboard',
      'Shared goals & milestones',
      'Joint account tracking',
      'Family budget collaboration',
      'Kids financial education module',
      'College savings optimizer',
      'Family net worth tracking',
      'Priority support',
    ],
  },
  {
    id: 'family-plus',
    name: 'Family Plus',
    price: '399.99',
    priceNumber: 399.99,
    annualPrice: 3935.90, // $399.99 * 12 * 0.82 = 18% off
    priceSuffix: '/month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PLUS_PRICE_ID || 'price_family_plus',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PLUS_ANNUAL_PRICE_ID || 'price_family_plus_annual',
    description: 'Premium financial management for larger households',
    cta: 'Start 14-Day Free Trial',
    popular: false,
    badge: 'Best Value',
    limits: {
      disputes: 'unlimited',
      linkedAccounts: 'unlimited',
      users: 5,
      aiChatMessages: 'unlimited',
      portfolioHoldings: 'unlimited',
    },
    features: [
      'Everything in Family, plus:',
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
 * Feature add-ons for enhanced functionality
 */
export const addOns: AddOn[] = [
  {
    id: 'credit_report_bundle',
    name: 'Credit Report Bundle',
    description: 'Full credit reports from all 3 bureaus with detailed analysis',
    price: 19.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ADDON_CREDIT_REPORT || 'price_addon_credit_report',
    availableFor: ['free', 'standard'],
  },
  {
    id: 'identity_protection',
    name: 'Identity Protection Plus',
    description: 'Advanced identity monitoring, dark web scanning, and $1M insurance',
    price: 14.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ADDON_IDENTITY || 'price_addon_identity',
    availableFor: ['free', 'standard', 'pro'],
  },
  {
    id: 'premium_support',
    name: 'Premium Support',
    description: 'Dedicated support agent with 1-hour response time',
    price: 29.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ADDON_SUPPORT || 'price_addon_support',
    availableFor: ['standard', 'pro'],
  },
  {
    id: 'extra_users',
    name: 'Additional Users (3-pack)',
    description: 'Add 3 more users to your Family plan',
    price: 49.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ADDON_USERS || 'price_addon_users',
    availableFor: ['family'],
  },
  {
    id: 'crypto_analytics',
    name: 'Crypto Analytics Pro',
    description: 'Advanced cryptocurrency portfolio analysis and DeFi tracking',
    price: 19.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ADDON_CRYPTO || 'price_addon_crypto',
    availableFor: ['standard', 'pro', 'family'],
  },
];

/**
 * Comparison table data for pricing page
 */
export const comparisonFeatures = [
  {
    category: 'Credit Health',
    features: [
      { name: 'Credit Score Monitoring', free: '1 bureau', standard: 'All 3 bureaus', pro: 'All 3 bureaus', familyDuo: 'All 3 bureaus', family: 'All 3 bureaus', familyPlus: 'All 3 bureaus' },
      { name: 'Credit Report Analysis', free: false, standard: true, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'AI Dispute Letters', free: false, standard: '10/month', pro: 'Unlimited', familyDuo: 'Unlimited', family: 'Unlimited', familyPlus: 'Unlimited' },
      { name: 'Credit Score Simulator', free: false, standard: true, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Credit Building Strategies', free: false, standard: 'Basic', pro: 'Advanced', familyDuo: 'Advanced', family: 'Advanced', familyPlus: 'Advanced' },
      { name: 'Identity Protection', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
    ],
  },
  {
    category: 'Financial Wellness',
    features: [
      { name: 'Smart Budgeting', free: 'Basic', standard: 'AI-powered', pro: 'AI-powered', familyDuo: 'AI-powered', family: 'AI-powered', familyPlus: 'AI-powered' },
      { name: 'Bill Detection & Alerts', free: false, standard: true, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Bill Negotiation Assistance', free: false, standard: false, pro: 'Included (no fees)', familyDuo: 'Included (no fees)', family: 'Included (no fees)', familyPlus: 'Included (no fees)' },
      { name: 'Debt Payoff Strategies', free: false, standard: true, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Savings Goals', free: '1 goal', standard: '5 goals', pro: 'Unlimited', familyDuo: 'Unlimited', family: 'Unlimited', familyPlus: 'Unlimited' },
      { name: 'Cash Flow Forecasting', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
    ],
  },
  {
    category: 'Investment Intelligence',
    features: [
      { name: 'Portfolio Tracking', free: '5 holdings', standard: '25 holdings', pro: 'Unlimited', familyDuo: 'Unlimited', family: 'Unlimited', familyPlus: 'Unlimited' },
      { name: 'Investment Analytics', free: false, standard: 'Basic', pro: 'Advanced', familyDuo: 'Advanced', family: 'Advanced', familyPlus: 'Advanced' },
      { name: 'AI Trading Signals', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Risk Assessment', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Real-time Market Data', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Tax Loss Harvesting', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
    ],
  },
  {
    category: 'Student Loans',
    features: [
      { name: 'Loan Portfolio Tracking', free: false, standard: true, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Federal Program Matching', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'PSLF Tracking', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Forgiveness Calculator', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Repayment Optimization', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
    ],
  },
  {
    category: 'AI & Support',
    features: [
      { name: 'AI Chat Messages', free: '10/month', standard: '100/month', pro: 'Unlimited', familyDuo: 'Unlimited', family: 'Unlimited', familyPlus: 'Unlimited' },
      { name: '24/7 AI Financial Coach', free: false, standard: false, pro: true, familyDuo: true, family: true, familyPlus: true },
      { name: 'Support Level', free: 'Email', standard: 'Priority Email', pro: 'Chat & Phone', familyDuo: 'Priority Support', family: 'Priority Support', familyPlus: 'Dedicated Manager' },
      { name: 'Response Time', free: '48-72 hours', standard: '24 hours', pro: '4 hours', familyDuo: '2 hours', family: '2 hours', familyPlus: '1 hour' },
    ],
  },
  {
    category: 'Family & Team',
    features: [
      { name: 'Number of Users', free: '1', standard: '1', pro: '1', familyDuo: 'Up to 2', family: 'Up to 3', familyPlus: 'Up to 5' },
      { name: 'Family Dashboard', free: false, standard: false, pro: false, familyDuo: true, family: true, familyPlus: true },
      { name: 'Shared Goals', free: false, standard: false, pro: false, familyDuo: true, family: true, familyPlus: true },
      { name: 'Kids Education Module', free: false, standard: false, pro: false, familyDuo: false, family: true, familyPlus: true },
      { name: 'Estate Planning Tools', free: false, standard: false, pro: false, familyDuo: false, family: false, familyPlus: true },
      { name: 'API Access', free: false, standard: false, pro: false, familyDuo: false, family: false, familyPlus: true },
    ],
  },
];

/**
 * Competitor comparison data
 */
export const competitorComparison = {
  fynvita: {
    name: 'Fynvita Pro',
    price: '$99.99/mo',
    creditBureaus: 'All 3',
    aiDisputes: 'Unlimited',
    billNegotiation: 'Included (no fees)',
    investmentTools: 'Full suite',
    studentLoans: 'Complete',
    hiddenFees: 'None',
  },
  creditKarma: {
    name: 'Credit Karma',
    price: 'Free',
    creditBureaus: '2 of 3',
    aiDisputes: 'None',
    billNegotiation: 'None',
    investmentTools: 'None',
    studentLoans: 'Basic',
    hiddenFees: 'Product recommendations',
  },
  rocketMoney: {
    name: 'Rocket Money',
    price: '$6-14/mo',
    creditBureaus: 'None',
    aiDisputes: 'None',
    billNegotiation: '35-60% of savings',
    investmentTools: 'None',
    studentLoans: 'None',
    hiddenFees: 'Success fees',
  },
};

/**
 * Get a pricing tier by ID
 */
export function getPricingTier(id: string): PricingTier | undefined {
  return pricingTiers.find(tier => tier.id === id);
}

/**
 * Get the popular/recommended tier
 */
export function getPopularTier(): PricingTier | undefined {
  return pricingTiers.find(tier => tier.popular);
}

/**
 * Calculate annual savings for a tier
 */
export function getAnnualSavings(tier: PricingTier): number {
  const monthlyAnnual = tier.priceNumber * 12;
  return monthlyAnnual - tier.annualPrice;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
}
