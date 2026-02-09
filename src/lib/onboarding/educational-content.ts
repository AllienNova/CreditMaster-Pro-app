/**
 * Educational Content for Onboarding
 * 
 * Centralized educational tooltips and help content
 */

export interface EducationalContent {
  title: string;
  content: string;
  learnMoreUrl?: string;
}

export const educationalContent: Record<string, EducationalContent> = {
  // Profile Step
  ssn: {
    title: 'Why we need your SSN',
    content: 'Your Social Security Number is required to verify your identity with credit bureaus and access your credit reports. We use bank-level encryption to protect your data and never share it with third parties.',
    learnMoreUrl: '/security',
  },
  
  dateOfBirth: {
    title: 'Why we need your date of birth',
    content: 'Your date of birth helps us verify your identity with credit bureaus and ensure we\'re accessing the correct credit reports. This is a standard requirement for all credit monitoring services.',
  },
  
  address: {
    title: 'Why we need your address',
    content: 'Credit bureaus use your current address to match your identity and pull accurate credit reports. Make sure this matches the address on your credit reports for best results.',
  },

  // Goals Step
  creditScore: {
    title: 'Understanding credit scores',
    content: 'Credit scores range from 300 to 850. Scores above 700 are considered good, above 750 are very good, and above 800 are excellent. Your score affects loan approvals, interest rates, and even job opportunities.',
    learnMoreUrl: '/learn/credit-scores',
  },
  
  scoreRanges: {
    title: 'Credit score ranges',
    content: 'Poor (300-579): High risk to lenders. Fair (580-669): Below average. Good (670-739): Above average. Very Good (740-799): Low risk. Excellent (800-850): Exceptional creditworthiness.',
    learnMoreUrl: '/learn/score-ranges',
  },
  
  timeframe: {
    title: 'How long does credit repair take?',
    content: 'Most people see improvements in 3-6 months, but significant changes can take 12-24 months. The timeline depends on your starting score, the issues on your report, and how consistently you follow your action plan.',
    learnMoreUrl: '/learn/timeline',
  },

  // Connect Step
  bureauConnection: {
    title: 'Why connect credit bureaus?',
    content: 'Connecting to Experian, Equifax, and TransUnion allows us to monitor your credit reports 24/7, detect errors automatically, and track your progress in real-time. You can disconnect at any time.',
    learnMoreUrl: '/learn/bureaus',
  },
  
  bankConnection: {
    title: 'Why connect your bank? (Optional)',
    content: 'Connecting your bank account helps us analyze your spending patterns, identify opportunities to improve your credit utilization, and provide personalized recommendations. This is completely optional and uses secure Plaid integration.',
    learnMoreUrl: '/learn/plaid-security',
  },
  
  plaidSecurity: {
    title: 'Is Plaid secure?',
    content: 'Plaid is a trusted financial technology company used by over 11,000 apps including Venmo, Robinhood, and Coinbase. They use bank-level 256-bit encryption and never store your login credentials. We only receive read-only access to transaction data.',
    learnMoreUrl: 'https://plaid.com/safety',
  },

  // General
  dataPrivacy: {
    title: 'How we protect your data',
    content: 'We use military-grade 256-bit AES encryption for all data at rest and in transit. Your information is stored in SOC 2 Type II certified data centers with 24/7 monitoring. We never sell your data to third parties.',
    learnMoreUrl: '/privacy',
  },
  
  creditUtilization: {
    title: 'What is credit utilization?',
    content: 'Credit utilization is the percentage of your available credit that you\'re using. For example, if you have a $10,000 credit limit and a $3,000 balance, your utilization is 30%. Keeping it below 30% (ideally below 10%) helps improve your score.',
    learnMoreUrl: '/learn/utilization',
  },
  
  paymentHistory: {
    title: 'Why payment history matters',
    content: 'Payment history is the most important factor in your credit score, accounting for 35% of your FICO score. Even one late payment can drop your score by 50-100 points. We help you set up payment reminders to avoid this.',
    learnMoreUrl: '/learn/payment-history',
  },
  
  hardInquiries: {
    title: 'What are hard inquiries?',
    content: 'Hard inquiries occur when you apply for credit (loans, credit cards, etc.). Each inquiry can lower your score by 5-10 points and stays on your report for 2 years. Multiple inquiries in a short period can signal risk to lenders.',
    learnMoreUrl: '/learn/inquiries',
  },
  
  disputeProcess: {
    title: 'How credit disputes work',
    content: 'When you dispute an error on your credit report, the bureau has 30 days to investigate. They contact the creditor to verify the information. If the creditor can\'t verify it, the item must be removed. We automate this entire process for you.',
    learnMoreUrl: '/learn/disputes',
  },
  
  goodwillLetters: {
    title: 'What are goodwill letters?',
    content: 'Goodwill letters are formal requests to creditors asking them to remove negative items (like late payments) as a courtesy. They work best if you have a good payment history otherwise and can explain the circumstances. Our AI helps you write compelling letters.',
    learnMoreUrl: '/learn/goodwill',
  },
  
  creditMix: {
    title: 'What is credit mix?',
    content: 'Credit mix refers to the variety of credit accounts you have (credit cards, auto loans, mortgages, etc.). Having a diverse mix shows lenders you can manage different types of credit responsibly. It accounts for 10% of your FICO score.',
    learnMoreUrl: '/learn/credit-mix',
  },
  
  accountAge: {
    title: 'Why account age matters',
    content: 'The age of your credit accounts affects 15% of your FICO score. Older accounts show a longer credit history, which is favorable. This is why closing old credit cards can hurt your score, even if you don\'t use them.',
    learnMoreUrl: '/learn/account-age',
  },
};

