/**
 * Goal Tracker Service
 * 
 * Manages credit improvement goals and tracks progress toward milestones.
 */

export interface CreditGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetScore: number;
  startScore: number;
  currentScore: number;
  category: 'score' | 'utilization' | 'payments' | 'disputes' | 'accounts' | 'custom';
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  targetDate: Date;
  createdAt: Date;
  completedAt?: Date;
  milestones: GoalMilestone[];
  progress: number; // 0-100
}

export interface GoalMilestone {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  completedAt?: Date;
  icon: string;
}

export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: CreditGoal['category'];
  targetScoreIncrease: number;
  suggestedTimeframeDays: number;
  milestones: Omit<GoalMilestone, 'id' | 'currentValue' | 'completed' | 'completedAt'>[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
}

export interface GoalProgress {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  totalPointsGained: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Pre-defined goal templates
export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'reach_fair_credit',
    title: 'Reach Fair Credit (580+)',
    description: 'Build your score to Fair credit range',
    category: 'score',
    targetScoreIncrease: 50,
    suggestedTimeframeDays: 90,
    difficulty: 'beginner',
    icon: '🎯',
    milestones: [
      { title: 'First Steps', description: 'Review your credit report', targetValue: 1, icon: '📋' },
      { title: 'On Track', description: 'Make 2 on-time payments', targetValue: 2, icon: '✅' },
      { title: 'Building Up', description: 'Reduce utilization below 50%', targetValue: 50, icon: '📉' },
      { title: 'Almost There', description: 'Reach score of 560', targetValue: 560, icon: '📈' },
      { title: 'Goal Achieved!', description: 'Reach Fair credit (580+)', targetValue: 580, icon: '🏆' },
    ],
  },
  {
    id: 'reach_good_credit',
    title: 'Reach Good Credit (670+)',
    description: 'Achieve Good credit standing',
    category: 'score',
    targetScoreIncrease: 80,
    suggestedTimeframeDays: 180,
    difficulty: 'intermediate',
    icon: '⭐',
    milestones: [
      { title: 'Foundation', description: 'Establish 6 months payment history', targetValue: 6, icon: '📅' },
      { title: 'Low Utilization', description: 'Keep utilization under 30%', targetValue: 30, icon: '💳' },
      { title: 'Clean Up', description: 'Dispute any errors on report', targetValue: 1, icon: '🧹' },
      { title: 'Diversify', description: 'Add credit mix variety', targetValue: 3, icon: '🎨' },
      { title: 'Goal Achieved!', description: 'Reach Good credit (670+)', targetValue: 670, icon: '🌟' },
    ],
  },
  {
    id: 'reach_excellent_credit',
    title: 'Reach Excellent Credit (740+)',
    description: 'Join the excellent credit club',
    category: 'score',
    targetScoreIncrease: 100,
    suggestedTimeframeDays: 365,
    difficulty: 'advanced',
    icon: '👑',
    milestones: [
      { title: 'Perfect Payments', description: '12 months on-time payments', targetValue: 12, icon: '✨' },
      { title: 'Minimal Utilization', description: 'Keep utilization under 10%', targetValue: 10, icon: '🎯' },
      { title: 'Account Age', description: 'Average age over 3 years', targetValue: 36, icon: '📆' },
      { title: 'No Negatives', description: 'Clear all negative items', targetValue: 0, icon: '✅' },
      { title: 'Goal Achieved!', description: 'Reach Excellent credit (740+)', targetValue: 740, icon: '👑' },
    ],
  },
  {
    id: 'pay_off_debt',
    title: 'Pay Off Credit Card Debt',
    description: 'Eliminate credit card balances',
    category: 'utilization',
    targetScoreIncrease: 40,
    suggestedTimeframeDays: 180,
    difficulty: 'intermediate',
    icon: '💰',
    milestones: [
      { title: 'Assessment', description: 'List all credit card debts', targetValue: 1, icon: '📝' },
      { title: '25% Paid', description: 'Pay off 25% of total debt', targetValue: 25, icon: '📊' },
      { title: '50% Paid', description: 'Reach halfway point', targetValue: 50, icon: '🎯' },
      { title: '75% Paid', description: 'Almost debt free', targetValue: 75, icon: '🚀' },
      { title: 'Debt Free!', description: 'Pay off all credit card debt', targetValue: 100, icon: '🎉' },
    ],
  },
  {
    id: 'dispute_negatives',
    title: 'Clear Negative Items',
    description: 'Remove inaccurate negative items',
    category: 'disputes',
    targetScoreIncrease: 50,
    suggestedTimeframeDays: 120,
    difficulty: 'intermediate',
    icon: '🗑️',
    milestones: [
      { title: 'Identify', description: 'List all negative items', targetValue: 1, icon: '🔍' },
      { title: 'First Dispute', description: 'Send first dispute letter', targetValue: 1, icon: '📤' },
      { title: 'Follow Up', description: 'Send follow-up disputes', targetValue: 3, icon: '📨' },
      { title: 'First Win', description: 'Get first item removed', targetValue: 1, icon: '✅' },
      { title: 'Clean Report', description: 'Remove all inaccurate items', targetValue: 100, icon: '🏆' },
    ],
  },
];

export class GoalTrackerService {
  /**
   * Create a new goal from a template
   */
  createGoalFromTemplate(
    userId: string,
    templateId: string,
    currentScore: number,
    targetDate?: Date
  ): CreditGoal {
    const template = GOAL_TEMPLATES.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    const now = new Date();
    const defaultTargetDate = new Date(now.getTime() + template.suggestedTimeframeDays * 24 * 60 * 60 * 1000);

    return {
      id: `goal_${Date.now()}`,
      userId,
      title: template.title,
      description: template.description,
      targetScore: currentScore + template.targetScoreIncrease,
      startScore: currentScore,
      currentScore,
      category: template.category,
      status: 'active',
      targetDate: targetDate || defaultTargetDate,
      createdAt: now,
      milestones: template.milestones.map((m, i) => ({
        ...m,
        id: `milestone_${i}`,
        currentValue: 0,
        completed: false,
      })),
      progress: 0,
    };
  }
}

export const goalTrackerService = new GoalTrackerService();

