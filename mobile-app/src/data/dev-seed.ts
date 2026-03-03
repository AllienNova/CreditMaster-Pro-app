/**
 * Dev Seed Data — realistic mock data for visual testing in __DEV__ mode.
 * Used by Zustand stores to bypass API calls and render populated UI.
 */

import type {
  CreditScore,
  CreditFactor,
  CreditScoreHistory,
  CreditMonitoringAlert,
  MonitoringStatus,
  BankAccount,
  Transaction,
  Budget,
  FinancialGoal,
  Notification,
  NotificationPreferences,
  Dispute,
  DisputeTemplate,
  DisputeStrategy,
  DisputeReason,
} from "../services/api/types";
import type {
  GamificationProgress,
  Badge,
  BadgesResponse,
  DailyQuest,
  QuestsResponse,
  LeaderboardResponse,
} from "../services/api/gamification";
import type {
  PortfolioResponse,
  Holding,
  AllocationItem,
  PerformancePoint,
} from "../services/api/investments";

const USER_ID = "dev-user-001";
const TODAY = new Date().toISOString();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

// ============================================================================
// AUTH / USER
// ============================================================================

export const seedUser = {
  id: USER_ID,
  email: "marcus.johnson@gmail.com",
  name: "Marcus Johnson",
  firstName: "Marcus",
  lastName: "Johnson",
  subscription_tier: "premium" as const,
  goals: ["improve_credit", "reduce_debt", "build_savings"],
  created_at: "2025-06-15T00:00:00Z",
  updated_at: TODAY,
};

// ============================================================================
// CREDIT SCORES
// ============================================================================

export const seedCreditScores: CreditScore[] = [
  {
    id: "cs-exp-001",
    userId: USER_ID,
    bureau: "experian",
    score: 738,
    previousScore: 721,
    change: 17,
    date: TODAY,
    lastUpdated: daysAgo(1),
  },
  {
    id: "cs-eqf-001",
    userId: USER_ID,
    bureau: "equifax",
    score: 725,
    previousScore: 718,
    change: 7,
    date: TODAY,
    lastUpdated: daysAgo(2),
  },
  {
    id: "cs-tu-001",
    userId: USER_ID,
    bureau: "transunion",
    score: 731,
    previousScore: 714,
    change: 17,
    date: TODAY,
    lastUpdated: daysAgo(1),
  },
];

export const seedCreditFactors: CreditFactor[] = [
  {
    id: "payment_history",
    name: "Payment History",
    impact: "high_positive",
    category: "payment_history",
    status: "excellent",
    value: "99% on-time",
    description: "You have an excellent payment history with 99% on-time payments across all accounts.",
    recommendation: "Keep making all payments on time to maintain this strong factor.",
    percentImpact: 35,
  },
  {
    id: "credit_utilization",
    name: "Credit Utilization",
    impact: "positive",
    category: "credit_utilization",
    status: "good",
    value: "24% utilization",
    description: "Your credit utilization is 24%, which is good. Aim for under 10% for the best scores.",
    recommendation: "Pay down your Chase Sapphire balance by $800 to drop below 15%.",
    percentImpact: 30,
  },
  {
    id: "credit_age",
    name: "Credit Age",
    impact: "neutral",
    category: "credit_age",
    status: "fair",
    value: "4.2 years average",
    description: "Your average account age is 4.2 years. Longer history improves this factor.",
    recommendation: "Keep older accounts open, even if unused, to increase average age.",
    percentImpact: 15,
  },
  {
    id: "credit_mix",
    name: "Credit Mix",
    impact: "positive",
    category: "credit_mix",
    status: "good",
    value: "4 account types",
    description: "You have a good mix of credit cards, auto loan, and student loans.",
    percentImpact: 10,
  },
  {
    id: "new_credit",
    name: "New Credit Inquiries",
    impact: "negative",
    category: "new_credit",
    status: "fair",
    value: "3 inquiries",
    description: "You have 3 hard inquiries in the last 12 months. Try to limit new applications.",
    recommendation: "Wait at least 6 months before applying for new credit.",
    percentImpact: 10,
  },
];

export const seedScoreHistory: CreditScoreHistory = {
  history: [
    { date: monthsAgo(11), score: 682 },
    { date: monthsAgo(10), score: 688 },
    { date: monthsAgo(9), score: 695 },
    { date: monthsAgo(8), score: 690 },
    { date: monthsAgo(7), score: 698 },
    { date: monthsAgo(6), score: 705 },
    { date: monthsAgo(5), score: 710 },
    { date: monthsAgo(4), score: 708 },
    { date: monthsAgo(3), score: 715 },
    { date: monthsAgo(2), score: 721 },
    { date: monthsAgo(1), score: 728 },
    { date: TODAY, score: 731 },
  ],
  averageScore: 710,
  highestScore: 738,
  lowestScore: 682,
  trend: "improving",
  periodStart: monthsAgo(11),
  periodEnd: TODAY,
};

export const seedMonitoringStatus: MonitoringStatus = {
  isActive: true,
  bureaus: {
    experian: { connected: true, enabled: true, lastSync: daysAgo(1) },
    equifax: { connected: true, enabled: true, lastSync: daysAgo(2) },
    transunion: { connected: true, enabled: true, lastSync: daysAgo(1) },
  },
  alertsCount: { total: 5, unread: 2 },
  nextScheduledSync: new Date(Date.now() + 86400000).toISOString(),
};

export const seedAlerts: CreditMonitoringAlert[] = [
  {
    id: "alert-001",
    userId: USER_ID,
    bureau: "experian",
    alertType: "score_change",
    type: "score_change",
    severity: "low",
    title: "Score Increased +17",
    description: "Your Experian score increased from 721 to 738. Great progress!",
    createdAt: daysAgo(1),
    acknowledged: false,
  },
  {
    id: "alert-002",
    userId: USER_ID,
    bureau: "transunion",
    alertType: "score_change",
    type: "score_change",
    severity: "low",
    title: "Score Increased +17",
    description: "Your TransUnion score increased from 714 to 731.",
    createdAt: daysAgo(1),
    acknowledged: false,
  },
  {
    id: "alert-003",
    userId: USER_ID,
    bureau: "equifax",
    alertType: "inquiry",
    type: "inquiry",
    severity: "medium",
    title: "New Hard Inquiry",
    description: "Capital One performed a hard inquiry on your Equifax report.",
    createdAt: daysAgo(14),
    acknowledged: true,
    acknowledgedAt: daysAgo(13),
  },
  {
    id: "alert-004",
    userId: USER_ID,
    bureau: "experian",
    alertType: "new_account",
    type: "new_account",
    severity: "medium",
    title: "New Account Opened",
    description: "A new Capital One Venture X card was added to your Experian report.",
    createdAt: daysAgo(30),
    acknowledged: true,
    acknowledgedAt: daysAgo(29),
  },
  {
    id: "alert-005",
    userId: USER_ID,
    bureau: "transunion",
    alertType: "address_change",
    type: "address_change",
    severity: "low",
    title: "Address Updated",
    description: "Your address was updated on your TransUnion report.",
    createdAt: daysAgo(60),
    acknowledged: true,
    acknowledgedAt: daysAgo(59),
  },
];

// ============================================================================
// FINANCIAL DASHBOARD
// ============================================================================

export const seedFinancialDashboard = {
  netWorth: 47_250,
  totalAssets: 82_400,
  totalLiabilities: 35_150,
  monthlyIncome: 6_800,
  monthlyExpenses: 4_350,
  savingsRate: 36,
};

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export const seedBankAccounts: BankAccount[] = [
  {
    id: "acct-001",
    userId: USER_ID,
    institutionName: "Chase",
    accountType: "checking",
    type: "checking",
    accountName: "Chase Total Checking",
    name: "Chase Total Checking",
    balance: 4_820.45,
    availableBalance: 4_720.45,
    lastSynced: daysAgo(0),
    isConnected: true,
  },
  {
    id: "acct-002",
    userId: USER_ID,
    institutionName: "Ally Bank",
    accountType: "savings",
    type: "savings",
    accountName: "Ally High-Yield Savings",
    name: "Ally High-Yield Savings",
    balance: 15_340.82,
    availableBalance: 15_340.82,
    lastSynced: daysAgo(0),
    isConnected: true,
  },
  {
    id: "acct-003",
    userId: USER_ID,
    institutionName: "Chase",
    accountType: "credit",
    type: "credit",
    accountName: "Chase Sapphire Preferred",
    name: "Chase Sapphire Preferred",
    balance: -2_145.30,
    availableBalance: 7_854.70,
    lastSynced: daysAgo(0),
    isConnected: true,
  },
  {
    id: "acct-004",
    userId: USER_ID,
    institutionName: "Vanguard",
    accountType: "investment",
    type: "investment",
    accountName: "Vanguard Brokerage",
    name: "Vanguard Brokerage",
    balance: 28_450.00,
    lastSynced: daysAgo(1),
    isConnected: true,
  },
  {
    id: "acct-005",
    userId: USER_ID,
    institutionName: "Capital One",
    accountType: "credit",
    type: "credit",
    accountName: "Capital One Venture X",
    name: "Capital One Venture X",
    balance: -890.15,
    availableBalance: 9_109.85,
    lastSynced: daysAgo(0),
    isConnected: true,
  },
];

// ============================================================================
// TRANSACTIONS (last 30 days)
// ============================================================================

export const seedTransactions: Transaction[] = [
  { id: "txn-001", accountId: "acct-001", amount: -85.42, category: "Groceries", merchantName: "Whole Foods Market", date: daysAgo(0), pending: true, type: "expense" },
  { id: "txn-002", accountId: "acct-003", amount: -12.99, category: "Entertainment", merchantName: "Netflix", date: daysAgo(1), pending: false, type: "expense" },
  { id: "txn-003", accountId: "acct-001", amount: 6800.00, category: "Income", merchantName: "Meridian Tech Inc", date: daysAgo(1), pending: false, type: "income" },
  { id: "txn-004", accountId: "acct-003", amount: -64.30, category: "Dining", merchantName: "Sweetgreen", date: daysAgo(2), pending: false, type: "expense" },
  { id: "txn-005", accountId: "acct-001", amount: -1650.00, category: "Housing", merchantName: "Rent - Avalon Apts", date: daysAgo(3), pending: false, type: "expense" },
  { id: "txn-006", accountId: "acct-003", amount: -45.00, category: "Transportation", merchantName: "Shell Gas Station", date: daysAgo(3), pending: false, type: "expense" },
  { id: "txn-007", accountId: "acct-005", amount: -32.50, category: "Shopping", merchantName: "Amazon", date: daysAgo(4), pending: false, type: "expense" },
  { id: "txn-008", accountId: "acct-001", amount: -500.00, category: "Transfer", merchantName: "Transfer to Ally Savings", date: daysAgo(5), pending: false, type: "transfer" },
  { id: "txn-009", accountId: "acct-003", amount: -78.90, category: "Health", merchantName: "CVS Pharmacy", date: daysAgo(5), pending: false, type: "expense" },
  { id: "txn-010", accountId: "acct-001", amount: -120.00, category: "Utilities", merchantName: "ConEd Electric", date: daysAgo(6), pending: false, type: "expense" },
  { id: "txn-011", accountId: "acct-003", amount: -55.00, category: "Subscriptions", merchantName: "Spotify + Apple One", date: daysAgo(7), pending: false, type: "expense" },
  { id: "txn-012", accountId: "acct-005", amount: -189.00, category: "Shopping", merchantName: "Nike.com", date: daysAgo(8), pending: false, type: "expense" },
  { id: "txn-013", accountId: "acct-001", amount: -42.15, category: "Groceries", merchantName: "Trader Joe's", date: daysAgo(9), pending: false, type: "expense" },
  { id: "txn-014", accountId: "acct-003", amount: -95.00, category: "Dining", merchantName: "The Capital Grille", date: daysAgo(10), pending: false, type: "expense" },
  { id: "txn-015", accountId: "acct-001", amount: -65.00, category: "Transportation", merchantName: "Uber", date: daysAgo(11), pending: false, type: "expense" },
  { id: "txn-016", accountId: "acct-001", amount: -200.00, category: "Insurance", merchantName: "Geico Auto Insurance", date: daysAgo(12), pending: false, type: "expense" },
  { id: "txn-017", accountId: "acct-003", amount: -28.75, category: "Groceries", merchantName: "Target", date: daysAgo(13), pending: false, type: "expense" },
  { id: "txn-018", accountId: "acct-001", amount: -75.00, category: "Fitness", merchantName: "Equinox Gym", date: daysAgo(14), pending: false, type: "expense" },
  { id: "txn-019", accountId: "acct-005", amount: -350.00, category: "Travel", merchantName: "Delta Airlines", date: daysAgo(15), pending: false, type: "expense" },
  { id: "txn-020", accountId: "acct-001", amount: 250.00, category: "Income", merchantName: "Venmo - Freelance", date: daysAgo(16), pending: false, type: "income" },
  { id: "txn-021", accountId: "acct-003", amount: -18.50, category: "Entertainment", merchantName: "AMC Theaters", date: daysAgo(17), pending: false, type: "expense" },
  { id: "txn-022", accountId: "acct-001", amount: -92.30, category: "Groceries", merchantName: "Whole Foods Market", date: daysAgo(18), pending: false, type: "expense" },
  { id: "txn-023", accountId: "acct-001", amount: -48.00, category: "Utilities", merchantName: "Verizon Wireless", date: daysAgo(19), pending: false, type: "expense" },
  { id: "txn-024", accountId: "acct-003", amount: -135.00, category: "Dining", merchantName: "DoorDash", date: daysAgo(20), pending: false, type: "expense" },
  { id: "txn-025", accountId: "acct-001", amount: -500.00, category: "Transfer", merchantName: "Transfer to Ally Savings", date: daysAgo(20), pending: false, type: "transfer" },
];

// ============================================================================
// BUDGETS (monthly)
// ============================================================================

export const seedBudgets: Budget[] = [
  { id: "bgt-001", userId: USER_ID, category: "Housing", limit: 1700, spent: 1650, remaining: 50, period: "monthly" },
  { id: "bgt-002", userId: USER_ID, category: "Groceries", limit: 400, spent: 248.87, remaining: 151.13, period: "monthly" },
  { id: "bgt-003", userId: USER_ID, category: "Dining", limit: 300, spent: 294.30, remaining: 5.70, period: "monthly" },
  { id: "bgt-004", userId: USER_ID, category: "Transportation", limit: 200, spent: 110.00, remaining: 90.00, period: "monthly" },
  { id: "bgt-005", userId: USER_ID, category: "Entertainment", limit: 150, spent: 86.49, remaining: 63.51, period: "monthly" },
  { id: "bgt-006", userId: USER_ID, category: "Shopping", limit: 250, spent: 221.50, remaining: 28.50, period: "monthly" },
  { id: "bgt-007", userId: USER_ID, category: "Health", limit: 150, spent: 78.90, remaining: 71.10, period: "monthly" },
  { id: "bgt-008", userId: USER_ID, category: "Utilities", limit: 200, spent: 168.00, remaining: 32.00, period: "monthly" },
  { id: "bgt-009", userId: USER_ID, category: "Subscriptions", limit: 80, spent: 67.99, remaining: 12.01, period: "monthly" },
  { id: "bgt-010", userId: USER_ID, category: "Savings", limit: 1000, spent: 1000, remaining: 0, period: "monthly" },
];

// ============================================================================
// FINANCIAL GOALS
// ============================================================================

export const seedGoals: FinancialGoal[] = [
  {
    id: "goal-001",
    userId: USER_ID,
    name: "Emergency Fund",
    type: "emergency_fund",
    targetAmount: 20_000,
    currentAmount: 15_340,
    deadline: "2026-08-01T00:00:00Z",
    targetDate: "2026-08-01T00:00:00Z",
    monthlyContribution: 500,
    status: "active",
  },
  {
    id: "goal-002",
    userId: USER_ID,
    name: "Pay Off Student Loans",
    type: "debt_payoff",
    targetAmount: 18_500,
    currentAmount: 6_200,
    deadline: "2028-01-01T00:00:00Z",
    targetDate: "2028-01-01T00:00:00Z",
    monthlyContribution: 450,
    status: "active",
  },
  {
    id: "goal-003",
    userId: USER_ID,
    name: "Down Payment Fund",
    type: "home",
    targetAmount: 60_000,
    currentAmount: 12_800,
    deadline: "2028-06-01T00:00:00Z",
    targetDate: "2028-06-01T00:00:00Z",
    monthlyContribution: 800,
    status: "active",
  },
  {
    id: "goal-004",
    userId: USER_ID,
    name: "Japan Trip",
    type: "vacation",
    targetAmount: 5_000,
    currentAmount: 3_200,
    deadline: "2026-10-01T00:00:00Z",
    targetDate: "2026-10-01T00:00:00Z",
    monthlyContribution: 250,
    status: "active",
  },
];

// ============================================================================
// DEBT OVERVIEW
// ============================================================================

export const seedDebtOverview = {
  totalDebt: 35_150,
  debts: [
    { id: "debt-001", name: "Federal Student Loan", type: "student_loan", balance: 18_500, interestRate: 4.99, minimumPayment: 210 },
    { id: "debt-002", name: "Auto Loan - Honda Civic", type: "auto_loan", balance: 12_400, interestRate: 5.49, minimumPayment: 385 },
    { id: "debt-003", name: "Chase Sapphire Balance", type: "credit_card", balance: 2_145, interestRate: 21.99, minimumPayment: 65 },
    { id: "debt-004", name: "Capital One Balance", type: "credit_card", balance: 890, interestRate: 19.99, minimumPayment: 35 },
    { id: "debt-005", name: "Medical Bill", type: "medical", balance: 1_215, interestRate: 0, minimumPayment: 101 },
  ],
  monthlyPayments: 796,
  projectedPayoffDate: "2029-03-15T00:00:00Z",
};

// ============================================================================
// DISPUTES
// ============================================================================

export const seedDisputes: Dispute[] = [
  {
    id: "disp-001",
    userId: USER_ID,
    bureau: "experian",
    status: "resolved",
    itemType: "Late Payment",
    creditorName: "Capital One",
    accountNumber: "****4521",
    disputeReason: "Payment was received on time but reported late due to processing error",
    letterContent: "To Whom It May Concern...",
    createdAt: monthsAgo(3),
    updatedAt: monthsAgo(1),
    sentAt: monthsAgo(3),
    resolvedAt: monthsAgo(1),
    outcome: "removed",
  },
  {
    id: "disp-002",
    userId: USER_ID,
    bureau: "equifax",
    status: "under_review",
    itemType: "Collection Account",
    creditorName: "Midland Credit Management",
    accountNumber: "****8832",
    disputeReason: "This debt was settled in full. Documentation proving payment attached.",
    createdAt: monthsAgo(1),
    updatedAt: daysAgo(5),
    sentAt: monthsAgo(1),
    followUpDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  },
  {
    id: "disp-003",
    userId: USER_ID,
    bureau: "transunion",
    status: "sent",
    itemType: "Hard Inquiry",
    creditorName: "Best Buy / Citibank",
    disputeReason: "I did not authorize this credit inquiry. I have never applied for a Best Buy credit card.",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
    sentAt: daysAgo(10),
  },
  {
    id: "disp-004",
    userId: USER_ID,
    bureau: "experian",
    status: "draft",
    itemType: "Incorrect Balance",
    creditorName: "Discover Financial",
    accountNumber: "****7190",
    disputeReason: "Account balance reported as $2,400 but actual balance is $0. Account was paid in full.",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
];

export const seedDisputeTemplates: DisputeTemplate[] = [
  {
    id: "tmpl-001",
    name: "Late Payment Removal",
    category: "Payment History",
    scenario: "Payment was made on time but incorrectly reported as late",
    successRate: 72,
    tone: "formal",
    letterText: "Dear Sir/Madam,\n\nI am writing to dispute a late payment...",
    requiredDocuments: ["Bank statement", "Payment confirmation"],
    placeholders: ["CREDITOR_NAME", "ACCOUNT_NUMBER", "DATE"],
  },
  {
    id: "tmpl-002",
    name: "Collection Account Dispute",
    category: "Collections",
    scenario: "Debt was paid or settled but still showing as collections",
    successRate: 65,
    tone: "assertive",
    letterText: "To Whom It May Concern,\n\nI am writing to dispute the following collection account...",
    requiredDocuments: ["Settlement letter", "Payment receipt"],
    placeholders: ["COLLECTION_AGENCY", "ORIGINAL_CREDITOR", "AMOUNT"],
  },
];

export const seedDisputeStrategies: DisputeStrategy[] = [
  {
    id: "strat-001",
    name: "Goodwill Letter",
    description: "Request removal of accurate negative items based on good payment history",
    successRate: 45,
    difficulty: "beginner",
    riskLevel: "low",
    timeline: "2-4 weeks",
    steps: [
      { step: 1, title: "Gather History", description: "Document your payment history" },
      { step: 2, title: "Write Letter", description: "Compose a polite goodwill letter" },
      { step: 3, title: "Send Certified", description: "Mail via certified mail with return receipt" },
    ],
  },
  {
    id: "strat-002",
    name: "Debt Validation",
    description: "Request the collector to validate the debt within 30 days of first contact",
    successRate: 55,
    difficulty: "intermediate",
    riskLevel: "low",
    timeline: "30-45 days",
    steps: [
      { step: 1, title: "Send Request", description: "Send validation letter within 30 days" },
      { step: 2, title: "Review Response", description: "Analyze the validation documents" },
      { step: 3, title: "Dispute Errors", description: "File disputes for any inaccuracies" },
    ],
  },
];

export const seedDisputeReasons: DisputeReason[] = [
  { id: "reason-001", code: "NOT_MINE", name: "Not My Account", description: "This account does not belong to me", category: "Identity", legalBasis: "FCRA Section 611" },
  { id: "reason-002", code: "PAID_SETTLED", name: "Paid/Settled", description: "This debt has been paid or settled in full", category: "Status", legalBasis: "FCRA Section 623" },
  { id: "reason-003", code: "WRONG_BALANCE", name: "Incorrect Balance", description: "The reported balance is incorrect", category: "Accuracy", legalBasis: "FCRA Section 611" },
  { id: "reason-004", code: "LATE_INCORRECT", name: "Late Payment Incorrect", description: "Payment was not late as reported", category: "Payment History", legalBasis: "FCRA Section 623" },
  { id: "reason-005", code: "UNAUTHORIZED_INQUIRY", name: "Unauthorized Inquiry", description: "I did not authorize this credit inquiry", category: "Inquiries", legalBasis: "FCRA Section 604" },
];

// ============================================================================
// GAMIFICATION
// ============================================================================

export const seedGamificationProgress: GamificationProgress = {
  xp: { current: 2450, toNextLevel: 3000, totalEarned: 14_250 },
  level: { current: 12, title: "Financial Warrior", progress: 82 },
  streak: { days: 18, multiplier: 1.8, longestStreak: 24 },
};

const badgeSavingsStarter: Badge = {
  id: "badge-001", code: "savings_starter", name: "Savings Starter",
  description: "Set up your first savings goal", icon: "piggy-bank",
  category: "savings", rarity: "common", xpReward: 50,
};
const badgeBudgetMaster: Badge = {
  id: "badge-002", code: "budget_master", name: "Budget Master",
  description: "Stay within budget for 3 consecutive months", icon: "chart-pie",
  category: "budget", rarity: "rare", xpReward: 200,
};
const badgeCreditClimber: Badge = {
  id: "badge-003", code: "credit_climber", name: "Credit Climber",
  description: "Improve your credit score by 50+ points", icon: "trending-up",
  category: "credit", rarity: "epic", xpReward: 500,
};
const badgeStreakWarrior: Badge = {
  id: "badge-004", code: "streak_7", name: "Week Warrior",
  description: "Maintain a 7-day login streak", icon: "flame",
  category: "streak", rarity: "uncommon", xpReward: 100,
};
const badgeDebtDestroyer: Badge = {
  id: "badge-005", code: "debt_destroyer", name: "Debt Destroyer",
  description: "Pay off a debt completely", icon: "shield-check",
  category: "debt", rarity: "rare", xpReward: 300,
};
const badgeInvestorBeginner: Badge = {
  id: "badge-006", code: "investor_beginner", name: "First Investment",
  description: "Make your first investment", icon: "chart-line",
  category: "investing", rarity: "uncommon", xpReward: 150,
};
const badgeTaxPro: Badge = {
  id: "badge-007", code: "tax_pro", name: "Tax Optimizer",
  description: "Maximize tax deductions in a filing year", icon: "receipt",
  category: "tax", rarity: "epic", xpReward: 400,
};
const badgeLegendary: Badge = {
  id: "badge-008", code: "financial_freedom", name: "Financial Freedom",
  description: "Achieve a net worth of $100,000", icon: "crown",
  category: "special", rarity: "legendary", xpReward: 1000,
};

export const seedBadgesResponse: BadgesResponse = {
  earned: [
    { id: "ub-001", badgeId: "badge-001", badge: badgeSavingsStarter, earnedAt: monthsAgo(6), progress: 100, isPinned: false, userId: USER_ID },
    { id: "ub-002", badgeId: "badge-002", badge: badgeBudgetMaster, earnedAt: monthsAgo(2), progress: 100, isPinned: true, userId: USER_ID },
    { id: "ub-003", badgeId: "badge-004", badge: badgeStreakWarrior, earnedAt: monthsAgo(4), progress: 100, isPinned: false, userId: USER_ID },
    { id: "ub-004", badgeId: "badge-006", badge: badgeInvestorBeginner, earnedAt: monthsAgo(3), progress: 100, isPinned: true, userId: USER_ID },
  ],
  inProgress: [
    { id: "bp-001", userId: USER_ID, badgeId: "badge-003", currentValue: 49, targetValue: 50, progressPercent: 98, lastUpdated: daysAgo(1), badge: badgeCreditClimber },
    { id: "bp-002", userId: USER_ID, badgeId: "badge-005", currentValue: 2, targetValue: 3, progressPercent: 67, lastUpdated: daysAgo(5), badge: badgeDebtDestroyer },
    { id: "bp-003", userId: USER_ID, badgeId: "badge-007", currentValue: 4, targetValue: 8, progressPercent: 50, lastUpdated: daysAgo(30), badge: badgeTaxPro },
  ],
  locked: [badgeLegendary],
  stats: {
    totalEarned: 4,
    totalAvailable: 8,
    byCategory: {
      savings: 1, debt: 0, budget: 1, credit: 0, investing: 1,
      trading: 0, tax: 0, streak: 1, community: 0, special: 0,
    },
  },
};

const dailyQuests: DailyQuest[] = [
  {
    id: "quest-001", code: "daily_checkin", name: "Daily Check-In",
    description: "Open the app and review your dashboard",
    xpReward: 25, questType: "engagement",
    criteria: { type: "app_open" }, isActive: true, createdAt: daysAgo(0),
  },
  {
    id: "quest-002", code: "log_transaction", name: "Log a Transaction",
    description: "Record or categorize at least 1 transaction",
    xpReward: 50, questType: "transaction",
    criteria: { type: "transaction_log", min: 1 }, isActive: true, createdAt: daysAgo(0),
  },
  {
    id: "quest-003", code: "savings_deposit", name: "Save $10",
    description: "Transfer at least $10 to your savings goal",
    xpReward: 75, questType: "savings",
    criteria: { type: "savings_transfer", min_amount: 10 }, isActive: true, createdAt: daysAgo(0),
  },
  {
    id: "quest-004", code: "budget_review", name: "Budget Check",
    description: "Review your monthly budget progress",
    xpReward: 30, questType: "budget",
    criteria: { type: "budget_view" }, isActive: true, createdAt: daysAgo(0),
  },
];

export const seedQuestsResponse: QuestsResponse = {
  today: [
    { id: "uqp-001", userId: USER_ID, questId: "quest-001", quest: dailyQuests[0], questDate: daysAgo(0), isCompleted: true, completedAt: daysAgo(0), progressValue: 1 },
    { id: "uqp-002", userId: USER_ID, questId: "quest-002", quest: dailyQuests[1], questDate: daysAgo(0), isCompleted: false, completedAt: null, progressValue: 0 },
    { id: "uqp-003", userId: USER_ID, questId: "quest-003", quest: dailyQuests[2], questDate: daysAgo(0), isCompleted: false, completedAt: null, progressValue: 0 },
    { id: "uqp-004", userId: USER_ID, questId: "quest-004", quest: dailyQuests[3], questDate: daysAgo(0), isCompleted: true, completedAt: daysAgo(0), progressValue: 1 },
  ],
  completedToday: 2,
  totalToday: 4,
  availableXp: 125,
};

export const seedLeaderboard: LeaderboardResponse = {
  type: "weekly_xp",
  periodStart: daysAgo(6),
  periodEnd: daysAgo(0),
  entries: [
    { rank: 1, userId: "user-100", displayName: "SavingsQueen", value: 1850, isCurrentUser: false },
    { rank: 2, userId: "user-101", displayName: "DebtFreeJay", value: 1620, isCurrentUser: false },
    { rank: 3, userId: USER_ID, displayName: "Marcus J.", value: 1480, isCurrentUser: true },
    { rank: 4, userId: "user-102", displayName: "InvestorMike", value: 1350, isCurrentUser: false },
    { rank: 5, userId: "user-103", displayName: "BudgetBoss", value: 1200, isCurrentUser: false },
    { rank: 6, userId: "user-104", displayName: "CreditKing", value: 1150, isCurrentUser: false },
    { rank: 7, userId: "user-105", displayName: "WealthPath", value: 980, isCurrentUser: false },
    { rank: 8, userId: "user-106", displayName: "MoneyMaven", value: 875, isCurrentUser: false },
    { rank: 9, userId: "user-107", displayName: "FinanceNerd", value: 720, isCurrentUser: false },
    { rank: 10, userId: "user-108", displayName: "SmartSaver", value: 650, isCurrentUser: false },
  ],
  userRank: 3,
  userPercentile: 97,
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const seedNotifications: Notification[] = [
  {
    id: "notif-001", userId: USER_ID, type: "score_change",
    title: "Credit Score Up!", body: "Your Experian score increased by 17 points to 738. Keep it up!",
    read: false, createdAt: daysAgo(1),
  },
  {
    id: "notif-002", userId: USER_ID, type: "dispute_update",
    title: "Dispute Resolved", body: "Your dispute with Capital One was resolved — late payment removed!",
    read: false, createdAt: daysAgo(3),
  },
  {
    id: "notif-003", userId: USER_ID, type: "recommendation",
    title: "Budget Alert", body: "You've used 98% of your Dining budget this month. Consider cooking at home this week.",
    read: true, createdAt: daysAgo(4),
  },
  {
    id: "notif-004", userId: USER_ID, type: "alert",
    title: "New Hard Inquiry", body: "Capital One pulled your credit report from Equifax on Feb 10.",
    read: true, createdAt: daysAgo(14),
  },
  {
    id: "notif-005", userId: USER_ID, type: "system",
    title: "Welcome to Premium!", body: "Your premium subscription is active. Enjoy unlimited disputes, advanced AI insights, and more.",
    read: true, createdAt: monthsAgo(2),
  },
  {
    id: "notif-006", userId: USER_ID, type: "payment",
    title: "Auto-Save Complete", body: "$500 transferred to your Ally High-Yield Savings. Emergency Fund is now 77% funded.",
    read: true, createdAt: daysAgo(5),
  },
  {
    id: "notif-007", userId: USER_ID, type: "recommendation",
    title: "Debt Strategy Update", body: "Paying an extra $100/mo on your Chase Sapphire could save you $340 in interest.",
    read: true, createdAt: daysAgo(7),
  },
];

export const seedNotificationPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  categories: {
    disputes: true,
    scoreChanges: true,
    alerts: true,
    recommendations: true,
    payments: true,
    marketing: false,
  },
};

// ============================================================================
// INVESTMENT SEED DATA
// ============================================================================

const seedHoldings: Holding[] = [
  {
    id: "hold-001", user_id: USER_ID, symbol: "AAPL", name: "Apple Inc.",
    asset_type: "stock", quantity: 15, average_cost: 142.50, current_price: 189.84,
    current_value: 2847.60, total_cost: 2137.50, gain_loss: 710.10, gain_loss_percent: 33.22,
    day_change: 2.34, day_change_percent: 1.25, sector: "Technology",
    created_at: monthsAgo(8), updated_at: TODAY,
  },
  {
    id: "hold-002", user_id: USER_ID, symbol: "VTI", name: "Vanguard Total Stock Market ETF",
    asset_type: "etf", quantity: 25, average_cost: 198.30, current_price: 245.12,
    current_value: 6128.00, total_cost: 4957.50, gain_loss: 1170.50, gain_loss_percent: 23.61,
    day_change: -0.87, day_change_percent: -0.35, sector: "Broad Market",
    created_at: monthsAgo(12), updated_at: TODAY,
  },
  {
    id: "hold-003", user_id: USER_ID, symbol: "MSFT", name: "Microsoft Corp.",
    asset_type: "stock", quantity: 8, average_cost: 310.00, current_price: 415.60,
    current_value: 3324.80, total_cost: 2480.00, gain_loss: 844.80, gain_loss_percent: 34.06,
    day_change: 3.20, day_change_percent: 0.78, sector: "Technology",
    created_at: monthsAgo(6), updated_at: TODAY,
  },
  {
    id: "hold-004", user_id: USER_ID, symbol: "BND", name: "Vanguard Total Bond Market ETF",
    asset_type: "bond", quantity: 30, average_cost: 73.40, current_price: 72.85,
    current_value: 2185.50, total_cost: 2202.00, gain_loss: -16.50, gain_loss_percent: -0.75,
    day_change: 0.12, day_change_percent: 0.16, sector: "Fixed Income",
    created_at: monthsAgo(10), updated_at: TODAY,
  },
  {
    id: "hold-005", user_id: USER_ID, symbol: "BTC", name: "Bitcoin",
    asset_type: "crypto", quantity: 0.05, average_cost: 42000.00, current_price: 67500.00,
    current_value: 3375.00, total_cost: 2100.00, gain_loss: 1275.00, gain_loss_percent: 60.71,
    day_change: -850.00, day_change_percent: -1.24,
    created_at: monthsAgo(4), updated_at: TODAY,
  },
];

const seedAllocations: AllocationItem[] = [
  { type: "Stocks", value: 6172.40, percentage: 34.5, count: 2 },
  { type: "ETFs", value: 6128.00, percentage: 34.2, count: 1 },
  { type: "Crypto", value: 3375.00, percentage: 18.9, count: 1 },
  { type: "Bonds", value: 2185.50, percentage: 12.2, count: 1 },
];

const seedPerformanceHistory: PerformancePoint[] = [
  { date: daysAgo(30), value: 16800.00, change: 0, changePercent: 0 },
  { date: daysAgo(25), value: 17050.00, change: 250.00, changePercent: 1.49 },
  { date: daysAgo(20), value: 16920.00, change: -130.00, changePercent: -0.76 },
  { date: daysAgo(15), value: 17280.00, change: 360.00, changePercent: 2.13 },
  { date: daysAgo(10), value: 17540.00, change: 260.00, changePercent: 1.50 },
  { date: daysAgo(5), value: 17680.00, change: 140.00, changePercent: 0.80 },
  { date: TODAY, value: 17860.90, change: 180.90, changePercent: 1.02 },
];

export const seedPortfolio: PortfolioResponse = {
  summary: {
    totalValue: 17860.90,
    totalCost: 13877.00,
    totalGainLoss: 3983.90,
    totalGainLossPercent: 28.71,
    dayChange: 45.23,
    dayChangePercent: 0.25,
    holdingsCount: 5,
  },
  holdings: seedHoldings,
  allocations: seedAllocations,
  performanceHistory: seedPerformanceHistory,
};
