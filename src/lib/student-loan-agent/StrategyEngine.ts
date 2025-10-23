
import { FederalRegulationEngine } from "./FederalRegulationEngine";


export class StrategyEngine {
  private regulationEngine: FederalRegulationEngine;
  constructor(regulationEngine: FederalRegulationEngine) {
    this.regulationEngine = regulationEngine;
  }

  public generateStrategies(analysis: any): any[] {
    const strategies = [];

    if (analysis.defaultStatus) {
      strategies.push(this.getFreshStartStrategy());
      strategies.push(this.getLoanRehabilitationStrategy());
    }

    strategies.push(this.getFcraDisputeStrategy());

    return strategies;
  }

  private getFreshStartStrategy(): any {
    const regulation = this.regulationEngine.getRegulation("fresh_start_program");
    return {
      name: "Fresh Start Program",
      description: "Enroll in the Fresh Start program to get your loans out of default.",
      regulation: regulation,
    };
  }

  private getLoanRehabilitationStrategy(): any {
    const regulation = this.regulationEngine.getRegulation("loan_rehabilitation");
    return {
      name: "Loan Rehabilitation",
      description: "Rehabilitate your loans to remove the default from your credit report.",
      regulation: regulation,
    };
  }

  private getFcraDisputeStrategy(): any {
    const regulation = this.regulationEngine.getRegulation("fcra");
    return {
      name: "FCRA Dispute",
      description: "Dispute any inaccurate information on your credit report.",
      regulation: regulation,
    };
  }

  public prioritizeStrategies(strategies: any[]): any[] {
    return strategies.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      return bPriority - aPriority;
    });
  }

  public estimateTimeline(strategy: any): { days: number; description: string } {
    const complexityDays: Record<string, number> = {
      low: 30,
      medium: 60,
      high: 120,
    };
    const days = complexityDays[strategy.complexity] || 45;
    return {
      days,
      description: `Estimated ${days} days to complete`,
    };
  }

  public calculateSuccessProbability(strategy: any, context: any): number {
    let probability = 50; // Base probability

    // Adjust based on credit score
    if (context.creditScore > 700) probability += 20;
    else if (context.creditScore > 600) probability += 10;
    else if (context.creditScore < 500) probability -= 10;

    // Adjust based on loan status
    if (context.loanStatus === 'current') probability += 15;
    else if (context.loanStatus === 'default') probability -= 15;

    // Adjust based on documentation
    if (context.documentation === 'complete') probability += 15;
    else if (context.documentation === 'incomplete') probability -= 10;

    // Ensure probability is between 0 and 100
    return Math.max(0, Math.min(100, probability));
  }
}

