import { FederalRegulationEngine } from './FederalRegulationEngine';

type StrategyPriority = 'high' | 'medium' | 'low';
type StrategyComplexity = 'low' | 'medium' | 'high';

interface StrategyAnalysis {
  defaultStatus: boolean;
}

interface StrategyContext {
  creditScore: number;
  loanStatus: 'current' | 'delinquent' | 'default';
  documentation: 'complete' | 'incomplete' | 'unknown';
}

interface GeneratedStrategy {
  name: string;
  description: string;
  regulation?: ReturnType<FederalRegulationEngine['getRegulation']>;
  priority?: StrategyPriority;
  complexity?: StrategyComplexity;
}

export class StrategyEngine {
  constructor(private readonly regulationEngine: FederalRegulationEngine) {}

  public generateStrategies(analysis: StrategyAnalysis): GeneratedStrategy[] {
    const strategies: GeneratedStrategy[] = [];

    if (analysis.defaultStatus) {
      strategies.push(this.getFreshStartStrategy());
      strategies.push(this.getLoanRehabilitationStrategy());
    }

    strategies.push(this.getFcraDisputeStrategy());

    return strategies;
  }

  private getFreshStartStrategy(): GeneratedStrategy {
    return {
      name: 'Fresh Start Program',
      description: 'Enroll in the Fresh Start program to get your loans out of default.',
      regulation: this.regulationEngine.getRegulation('fresh_start_program'),
      priority: 'high',
      complexity: 'medium',
    };
  }

  private getLoanRehabilitationStrategy(): GeneratedStrategy {
    return {
      name: 'Loan Rehabilitation',
      description: 'Rehabilitate your loans to remove the default from your credit report.',
      regulation: this.regulationEngine.getRegulation('loan_rehabilitation'),
      priority: 'high',
      complexity: 'high',
    };
  }

  private getFcraDisputeStrategy(): GeneratedStrategy {
    return {
      name: 'FCRA Dispute',
      description: 'Dispute any inaccurate information on your credit report.',
      regulation: this.regulationEngine.getRegulation('fcra'),
      priority: 'medium',
      complexity: 'low',
    };
  }

  public prioritizeStrategies(strategies: GeneratedStrategy[]): GeneratedStrategy[] {
    return [...strategies].sort((a, b) => {
      const priorityOrder: Record<StrategyPriority, number> = { high: 3, medium: 2, low: 1 };
      const aPriority = a.priority ? priorityOrder[a.priority] : 0;
      const bPriority = b.priority ? priorityOrder[b.priority] : 0;
      return bPriority - aPriority;
    });
  }

  public estimateTimeline(strategy: GeneratedStrategy): { days: number; description: string } {
    const complexityDays: Record<StrategyComplexity, number> = {
      low: 30,
      medium: 60,
      high: 120,
    };
    const days = strategy.complexity ? complexityDays[strategy.complexity] : 45;
    return {
      days,
      description: `Estimated ${days} days to complete`,
    };
  }

  public calculateSuccessProbability(strategy: GeneratedStrategy, context: StrategyContext): number {
    let probability = strategy.priority === 'high' ? 60 : 50;

    if (context.creditScore > 700) probability += 20;
    else if (context.creditScore > 600) probability += 10;
    else if (context.creditScore < 500) probability -= 10;

    if (context.loanStatus === 'current') probability += 15;
    else if (context.loanStatus === 'default') probability -= 15;

    if (context.documentation === 'complete') probability += 15;
    else if (context.documentation === 'incomplete') probability -= 10;

    return Math.max(0, Math.min(100, probability));
  }
}
