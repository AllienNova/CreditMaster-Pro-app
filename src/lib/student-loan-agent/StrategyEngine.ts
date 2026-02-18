import { FederalRegulationEngine, Regulation } from "./FederalRegulationEngine";

export interface LoanAnalysis {
  defaultStatus?: boolean;
  loanType?: string;
  balance?: number;
  status?: string;
}

export interface LoanStrategy {
  name: string;
  description: string;
  regulation: Regulation | undefined;
  priority?: "high" | "medium" | "low";
  complexity?: "low" | "medium" | "high";
}

export interface StrategyContext {
  creditScore?: number;
  loanStatus?: "current" | "default" | "delinquent";
  documentation?: "complete" | "incomplete" | "partial";
}

export class StrategyEngine {
  private regulationEngine: FederalRegulationEngine;
  constructor(regulationEngine: FederalRegulationEngine) {
    this.regulationEngine = regulationEngine;
  }

  public generateStrategies(analysis: LoanAnalysis): LoanStrategy[] {
    const strategies = [];

    if (analysis.defaultStatus) {
      strategies.push(this.getFreshStartStrategy());
      strategies.push(this.getLoanRehabilitationStrategy());
    }

    strategies.push(this.getFcraDisputeStrategy());

    return strategies;
  }

  private getFreshStartStrategy(): LoanStrategy {
    const regulation = this.regulationEngine.getRegulation(
      "fresh_start_program",
    );
    return {
      name: "Fresh Start Program",
      description:
        "Enroll in the Fresh Start program to get your loans out of default.",
      regulation: regulation,
    };
  }

  private getLoanRehabilitationStrategy(): LoanStrategy {
    const regulation = this.regulationEngine.getRegulation(
      "loan_rehabilitation",
    );
    return {
      name: "Loan Rehabilitation",
      description:
        "Rehabilitate your loans to remove the default from your credit report.",
      regulation: regulation,
    };
  }

  private getFcraDisputeStrategy(): LoanStrategy {
    const regulation = this.regulationEngine.getRegulation("fcra");
    return {
      name: "FCRA Dispute",
      description: "Dispute any inaccurate information on your credit report.",
      regulation: regulation,
    };
  }

  public prioritizeStrategies(strategies: LoanStrategy[]): LoanStrategy[] {
    return strategies.sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };
      const aPriority = a.priority ? priorityOrder[a.priority] || 0 : 0;
      const bPriority = b.priority ? priorityOrder[b.priority] || 0 : 0;
      return bPriority - aPriority;
    });
  }

  public estimateTimeline(strategy: LoanStrategy): {
    days: number;
    description: string;
  } {
    const complexityDays: Record<string, number> = {
      low: 30,
      medium: 60,
      high: 120,
    };
    const days = strategy.complexity
      ? complexityDays[strategy.complexity] || 45
      : 45;
    return {
      days,
      description: `Estimated ${days} days to complete`,
    };
  }

  public calculateSuccessProbability(
    _strategy: LoanStrategy,
    context: StrategyContext,
  ): number {
    let probability = 50; // Base probability

    // Adjust based on credit score
    const creditScore = context.creditScore ?? 0;
    if (creditScore > 700) probability += 20;
    else if (creditScore > 600) probability += 10;
    else if (creditScore < 500) probability -= 10;

    // Adjust based on loan status
    if (context.loanStatus === "current") probability += 15;
    else if (context.loanStatus === "default") probability -= 15;

    // Adjust based on documentation
    if (context.documentation === "complete") probability += 15;
    else if (context.documentation === "incomplete") probability -= 10;

    // Ensure probability is between 0 and 100
    return Math.max(0, Math.min(100, probability));
  }
}
