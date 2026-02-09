/**
 * Score Simulator Service
 * 
 * Calculates predicted credit score changes based on various financial actions.
 * Uses FICO score factor weights to provide realistic estimates.
 */

export interface ScoreFactors {
  paymentHistory: number;      // 35% of FICO score
  creditUtilization: number;   // 30% of FICO score  
  creditAge: number;           // 15% of FICO score
  creditMix: number;           // 10% of FICO score
  newCredit: number;           // 10% of FICO score
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  category: 'utilization' | 'payment' | 'credit_age' | 'new_credit' | 'mix' | 'negative';
  impact: number;           // Estimated point impact
  timeframe: string;        // How long until impact
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
}

export interface SimulationResult {
  currentScore: number;
  projectedScore: number;
  scoreChange: number;
  factorChanges: {
    factor: keyof ScoreFactors;
    currentValue: number;
    projectedValue: number;
    impact: number;
  }[];
  timeline: {
    month: number;
    score: number;
    events: string[];
  }[];
  recommendations: string[];
}

export interface UserCreditProfile {
  currentScore: number;
  utilization: number;      // 0-100%
  accountAge: number;       // months
  onTimePayments: number;   // 0-100%
  totalAccounts: number;
  openAccounts: number;
  recentInquiries: number;
  negativeItems: number;
  installmentLoans: number;
  revolvingAccounts: number;
}

// FICO Score factor weights
const FACTOR_WEIGHTS = {
  paymentHistory: 0.35,
  creditUtilization: 0.30,
  creditAge: 0.15,
  creditMix: 0.10,
  newCredit: 0.10,
};

// Pre-defined simulation scenarios
export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'pay_down_50',
    name: 'Pay Down Balances to 50%',
    description: 'Reduce credit utilization from current level to 50%',
    category: 'utilization',
    impact: 15,
    timeframe: '1 month',
    difficulty: 'medium',
    icon: 'credit-card',
  },
  {
    id: 'pay_down_30',
    name: 'Pay Down Balances to 30%',
    description: 'Reduce credit utilization to optimal 30% level',
    category: 'utilization',
    impact: 30,
    timeframe: '1-2 months',
    difficulty: 'medium',
    icon: 'credit-card',
  },
  {
    id: 'pay_down_10',
    name: 'Pay Down Balances to 10%',
    description: 'Achieve excellent utilization under 10%',
    category: 'utilization',
    impact: 50,
    timeframe: '2-3 months',
    difficulty: 'hard',
    icon: 'credit-card',
  },
  {
    id: 'on_time_6mo',
    name: '6 Months On-Time Payments',
    description: 'Make all payments on time for 6 months',
    category: 'payment',
    impact: 25,
    timeframe: '6 months',
    difficulty: 'easy',
    icon: 'clock',
  },
  {
    id: 'on_time_12mo',
    name: '12 Months On-Time Payments',
    description: 'Establish strong payment history over 1 year',
    category: 'payment',
    impact: 50,
    timeframe: '12 months',
    difficulty: 'easy',
    icon: 'clock',
  },
  {
    id: 'remove_negative',
    name: 'Remove Negative Item',
    description: 'Successfully dispute and remove a negative item',
    category: 'negative',
    impact: 40,
    timeframe: '30-45 days',
    difficulty: 'medium',
    icon: 'x-circle',
  },
  {
    id: 'remove_collection',
    name: 'Pay Off Collection',
    description: 'Pay or settle a collection account',
    category: 'negative',
    impact: 20,
    timeframe: 'Immediate',
    difficulty: 'medium',
    icon: 'banknotes',
  },
  {
    id: 'new_credit_card',
    name: 'Open New Credit Card',
    description: 'Apply for and open a new credit card',
    category: 'new_credit',
    impact: -10,
    timeframe: 'Immediate',
    difficulty: 'easy',
    icon: 'sparkles',
  },
  {
    id: 'credit_builder_loan',
    name: 'Get Credit Builder Loan',
    description: 'Open a credit builder loan to improve mix',
    category: 'mix',
    impact: 15,
    timeframe: '3-6 months',
    difficulty: 'easy',
    icon: 'building',
  },
  {
    id: 'authorized_user',
    name: 'Become Authorized User',
    description: 'Be added to a family member\'s credit card',
    category: 'credit_age',
    impact: 30,
    timeframe: '30-60 days',
    difficulty: 'easy',
    icon: 'user',
  },
];

export class ScoreSimulatorService {
  /**
   * Calculate current factor scores based on user profile
   */
  calculateFactorScores(profile: UserCreditProfile): ScoreFactors {
    return {
      paymentHistory: Math.min(100, profile.onTimePayments),
      creditUtilization: Math.max(0, 100 - profile.utilization * 1.5),
      creditAge: Math.min(100, (profile.accountAge / 84) * 100), // 7 years = 100
      creditMix: this.calculateMixScore(profile),
      newCredit: Math.max(0, 100 - profile.recentInquiries * 10),
    };
  }

  private calculateMixScore(profile: UserCreditProfile): number {
    let score = 50;
    if (profile.installmentLoans > 0) score += 20;
    if (profile.revolvingAccounts > 0) score += 20;
    if (profile.installmentLoans > 0 && profile.revolvingAccounts >= 2) score += 10;
    return Math.min(100, score);
  }

  /**
   * Simulate score impact of applying selected scenarios
   */
  simulateScenarios(
    profile: UserCreditProfile,
    scenarioIds: string[]
  ): SimulationResult {
    const scenarios = scenarioIds
      .map(id => SIMULATION_SCENARIOS.find(s => s.id === id))
      .filter((s): s is SimulationScenario => s !== null);

    const currentFactors = this.calculateFactorScores(profile);
    const projectedFactors = { ...currentFactors };
    const factorChanges: SimulationResult['factorChanges'] = [];
    let totalImpact = 0;

    for (const scenario of scenarios) {
      const impact = this.applyScenarioToFactors(projectedFactors, scenario, profile);
      totalImpact += impact;
    }

    // Calculate factor changes
    for (const key of Object.keys(currentFactors) as (keyof ScoreFactors)[]) {
      if (currentFactors[key] !== projectedFactors[key]) {
        factorChanges.push({
          factor: key,
          currentValue: currentFactors[key],
          projectedValue: projectedFactors[key],
          impact: Math.round((projectedFactors[key] - currentFactors[key]) * FACTOR_WEIGHTS[key]),
        });
      }
    }

    const projectedScore = Math.min(850, Math.max(300, profile.currentScore + totalImpact));

    // Generate timeline
    const timeline = this.generateTimeline(profile.currentScore, projectedScore, scenarios);

    // Generate recommendations
    const recommendations = this.generateRecommendations(profile, scenarios);

    return {
      currentScore: profile.currentScore,
      projectedScore,
      scoreChange: projectedScore - profile.currentScore,
      factorChanges,
      timeline,
      recommendations,
    };
  }

  private applyScenarioToFactors(
    factors: ScoreFactors,
    scenario: SimulationScenario,
    profile: UserCreditProfile
  ): number {
    let impact = scenario.impact;

    switch (scenario.category) {
      case 'utilization':
        const targetUtil = scenario.id === 'pay_down_10' ? 10
          : scenario.id === 'pay_down_30' ? 30 : 50;
        const utilImprovement = profile.utilization - targetUtil;
        if (utilImprovement > 0) {
          factors.creditUtilization = Math.min(100, 100 - targetUtil * 1.5);
          impact = Math.round(utilImprovement * 0.5);
        }
        break;
      case 'payment':
        factors.paymentHistory = Math.min(100, factors.paymentHistory + 10);
        break;
      case 'negative':
        factors.paymentHistory = Math.min(100, factors.paymentHistory + 15);
        break;
      case 'new_credit':
        factors.newCredit = Math.max(0, factors.newCredit - 10);
        break;
      case 'mix':
        factors.creditMix = Math.min(100, factors.creditMix + 15);
        break;
      case 'credit_age':
        factors.creditAge = Math.min(100, factors.creditAge + 20);
        break;
    }

    return impact;
  }

  private generateTimeline(
    currentScore: number,
    projectedScore: number,
    scenarios: SimulationScenario[]
  ): SimulationResult['timeline'] {
    const timeline: SimulationResult['timeline'] = [];
    const totalChange = projectedScore - currentScore;
    const months = Math.max(1, Math.ceil(Math.abs(totalChange) / 15));

    for (let i = 0; i <= months; i++) {
      const progress = i / months;
      const score = Math.round(currentScore + totalChange * progress);
      const events = scenarios
        .filter(s => this.getScenarioMonth(s) === i)
        .map(s => s.name);

      timeline.push({ month: i, score, events: events.length > 0 ? events : [] });
    }

    return timeline;
  }

  private getScenarioMonth(scenario: SimulationScenario): number {
    if (scenario.timeframe.includes('Immediate')) return 0;
    if (scenario.timeframe.includes('30')) return 1;
    if (scenario.timeframe.includes('1 month')) return 1;
    if (scenario.timeframe.includes('2')) return 2;
    if (scenario.timeframe.includes('3')) return 3;
    if (scenario.timeframe.includes('6')) return 6;
    if (scenario.timeframe.includes('12')) return 12;
    return 1;
  }

  private generateRecommendations(
    profile: UserCreditProfile,
    selectedScenarios: SimulationScenario[]
  ): string[] {
    const recommendations: string[] = [];
    const selectedIds = selectedScenarios.map(s => s.id);

    if (profile.utilization > 30 && !selectedIds.some(id => id.includes('pay_down'))) {
      recommendations.push('Consider paying down balances to reduce utilization below 30%');
    }
    if (profile.onTimePayments < 100 && !selectedIds.includes('on_time_6mo')) {
      recommendations.push('Focus on making all payments on time to build payment history');
    }
    if (profile.negativeItems > 0 && !selectedIds.includes('remove_negative')) {
      recommendations.push('Dispute inaccurate negative items to potentially improve your score');
    }
    if (profile.installmentLoans === 0 && !selectedIds.includes('credit_builder_loan')) {
      recommendations.push('A credit builder loan could improve your credit mix');
    }
    if (selectedScenarios.length === 0) {
      recommendations.push('Select scenarios above to see how they would impact your score');
    }

    return recommendations;
  }

  /**
   * Get personalized scenario suggestions based on profile
   */
  getSuggestedScenarios(profile: UserCreditProfile): SimulationScenario[] {
    return SIMULATION_SCENARIOS.filter(scenario => {
      if (scenario.category === 'utilization' && profile.utilization <= 10) return false;
      if (scenario.category === 'negative' && profile.negativeItems === 0) return false;
      if (scenario.category === 'mix' && profile.installmentLoans > 0) return false;
      return true;
    }).slice(0, 5);
  }
}

export const scoreSimulatorService = new ScoreSimulatorService();

