import { TourStep } from '../OnboardingTour';

export const dashboardTourSteps: TourStep[] = [
  {
    target: '[data-tour="welcome"]',
    title: '👋 Welcome to CreditMaster Pro!',
    content: 'Let\'s take a quick tour to help you get started with AI-powered credit repair. This will only take 2 minutes!',
    placement: 'bottom',
  },
  {
    target: '[data-tour="credit-score"]',
    title: '📊 Your Credit Dashboard',
    content: 'This is your credit score overview. Once you upload your credit reports, you\'ll see your scores from all three bureaus here.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="ai-tools"]',
    title: '🤖 AI-Powered Tools',
    content: 'Access our suite of AI tools here. Generate dispute letters, analyze credit reports, calculate student loan strategies, and chat with our AI assistant.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="disputes"]',
    title: '📝 Dispute Tracking',
    content: 'Track all your credit disputes in one place. See the status of each dispute and monitor your progress toward better credit.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="strategies"]',
    title: '🎯 AI Strategies',
    content: 'Get personalized credit repair strategies powered by AI. We analyze your unique situation and recommend the best path forward.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: '⚡ Quick Actions',
    content: 'Use these quick action buttons to access the most common tasks: generate disputes, analyze credit, and calculate loan strategies.',
    placement: 'top',
  },
  {
    target: '[data-tour="student-loan"]',
    title: '🎓 Student Loan Agent',
    content: 'Have student loans? Our specialized AI agent can help you find the best repayment strategy and check your PSLF eligibility.',
    placement: 'top',
  },
  {
    target: '[data-tour="get-started"]',
    title: '🚀 Ready to Get Started?',
    content: 'Click here to start your first credit analysis! Upload your credit report and let our AI identify opportunities for improvement.',
    placement: 'left',
  },
];

export const aiToolsTourSteps: TourStep[] = [
  {
    target: '[data-tour="ai-chat"]',
    title: '💬 AI Chat Assistant',
    content: 'Ask our AI assistant anything about credit repair, FCRA laws, dispute strategies, or credit building. It has access to 300+ AI models!',
    placement: 'bottom',
  },
  {
    target: '[data-tour="dispute-generator"]',
    title: '📄 Dispute Letter Generator',
    content: 'Generate professional, legally-compliant dispute letters in seconds. Our AI uses advanced prompts and FCRA citations to maximize success rates.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="credit-analyzer"]',
    title: '🔍 Credit Report Analyzer',
    content: 'Upload your credit report and get instant AI-powered analysis. We identify negative items, errors, and opportunities for improvement.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="loan-calculator"]',
    title: '🎓 Student Loan Strategy Calculator',
    content: 'Enter your student loan details and get personalized repayment strategies. Check PSLF eligibility and see potential savings.',
    placement: 'bottom',
  },
];

export const creditRepairTourSteps: TourStep[] = [
  {
    target: '[data-tour="disputes-list"]',
    title: '📋 Your Disputes',
    content: 'All your credit disputes are listed here. You can filter by status, bureau, and date to track your progress.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="create-dispute"]',
    title: '➕ Create New Dispute',
    content: 'Click here to create a new dispute. Our AI will guide you through the process and generate a professional letter.',
    placement: 'left',
  },
  {
    target: '[data-tour="dispute-status"]',
    title: '📊 Dispute Status',
    content: 'Each dispute shows its current status: Draft, Sent, Under Review, Resolved, or Rejected. Click on any dispute to see details.',
    placement: 'right',
  },
  {
    target: '[data-tour="success-rate"]',
    title: '🎯 Success Rate',
    content: 'Track your overall success rate. Our AI-generated disputes have a 70-85% success rate compared to 40-50% for traditional methods.',
    placement: 'top',
  },
];

export const firstDisputeTourSteps: TourStep[] = [
  {
    target: '[data-tour="dispute-form"]',
    title: '📝 Dispute Information',
    content: 'Fill in the details about the item you want to dispute. Be as specific as possible for the best results.',
    placement: 'right',
  },
  {
    target: '[data-tour="bureau-select"]',
    title: '🏢 Select Bureau',
    content: 'Choose which credit bureau to dispute with: Experian, Equifax, or TransUnion. You can dispute the same item with multiple bureaus.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="item-type"]',
    title: '📌 Item Type',
    content: 'Select the type of item: Account, Inquiry, Public Record, or Collection. This helps our AI generate the most effective dispute letter.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="dispute-reason"]',
    title: '❓ Dispute Reason',
    content: 'Choose your reason for disputing: Not Mine, Incorrect Information, Paid/Closed, or Other. This determines the legal strategy.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="generate-button"]',
    title: '🤖 Generate with AI',
    content: 'Click here to let our AI generate a professional dispute letter. It takes 30-60 seconds and uses Claude 4.5 Sonnet for maximum quality.',
    placement: 'top',
  },
];

