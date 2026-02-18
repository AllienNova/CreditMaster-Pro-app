/**
 * Debt Payoff Service
 * Implements debt payoff strategies (avalanche, snowball, hybrid)
 * with projections, timelines, and recommendations
 */

import {
  Debt,
  DebtType,
  PayoffStrategy,
  PayoffPlan,
  DebtPayoffOrder,
  PayoffTimelineEntry,
  StrategyComparison,
  DebtOverview,
  PayoffMilestone,
  PayoffInsight,
} from "./types/debt-payoff.types";

export class DebtPayoffService {
  /**
   * Calculate debt overview statistics
   */
  calculateOverview(debts: Debt[], monthlyIncome?: number): DebtOverview {
    if (debts.length === 0) {
      return {
        totalDebt: 0,
        totalMinimumPayments: 0,
        averageInterestRate: 0,
        highestInterestRate: 0,
        lowestBalance: 0,
        debtCount: 0,
        debtsByType: {},
      };
    }

    const activeDebts = debts.filter((d) => d.isActive && d.balance > 0);
    const totalDebt = activeDebts.reduce((sum, d) => sum + d.balance, 0);
    const totalMinimumPayments = activeDebts.reduce(
      (sum, d) => sum + d.minimumPayment,
      0,
    );
    const averageInterestRate =
      activeDebts.reduce((sum, d) => sum + d.interestRate, 0) /
      activeDebts.length;
    const highestInterestRate = Math.max(
      ...activeDebts.map((d) => d.interestRate),
    );
    const lowestBalance = Math.min(...activeDebts.map((d) => d.balance));

    const debtsByType: { [key in DebtType]?: number } = {};
    activeDebts.forEach((d) => {
      debtsByType[d.type] = (debtsByType[d.type] || 0) + d.balance;
    });

    return {
      totalDebt,
      totalMinimumPayments,
      averageInterestRate,
      highestInterestRate,
      lowestBalance,
      debtCount: activeDebts.length,
      debtToIncomeRatio: monthlyIncome
        ? (totalMinimumPayments / monthlyIncome) * 100
        : undefined,
      monthlyIncome,
      debtsByType,
    };
  }

  /**
   * Calculate payoff plan for a given strategy
   */
  calculatePayoffPlan(
    debts: Debt[],
    strategy: PayoffStrategy,
    extraPayment: number = 0,
  ): PayoffPlan {
    const activeDebts = debts.filter((d) => d.isActive && d.balance > 0);
    if (activeDebts.length === 0) {
      return this.createEmptyPlan(strategy, extraPayment);
    }

    // Sort debts based on strategy
    const sortedDebts = this.sortDebtsByStrategy(activeDebts, strategy);

    const totalDebt = activeDebts.reduce((sum, d) => sum + d.balance, 0);
    const totalMinimum = activeDebts.reduce(
      (sum, d) => sum + d.minimumPayment,
      0,
    );
    const monthlyPayment = totalMinimum + extraPayment;

    // Simulate payoff
    const simulation = this.simulatePayoff(sortedDebts, monthlyPayment);

    // Calculate baseline (minimum payments only) for comparison
    const baseline = this.simulatePayoff(sortedDebts, totalMinimum);

    return {
      strategy,
      totalDebt,
      monthlyPayment,
      extraPayment,
      payoffDate: simulation.payoffDate,
      totalMonths: simulation.totalMonths,
      totalInterestPaid: simulation.totalInterest,
      totalAmountPaid: simulation.totalPaid,
      interestSaved: baseline.totalInterest - simulation.totalInterest,
      monthsSaved: baseline.totalMonths - simulation.totalMonths,
      debtOrder: simulation.debtOrder,
      timeline: simulation.timeline,
    };
  }

  /**
   * Sort debts based on payoff strategy
   */
  private sortDebtsByStrategy(debts: Debt[], strategy: PayoffStrategy): Debt[] {
    const sorted = [...debts];

    switch (strategy) {
      case "avalanche":
        // Highest interest rate first
        sorted.sort((a, b) => b.interestRate - a.interestRate);
        break;
      case "snowball":
        // Lowest balance first
        sorted.sort((a, b) => a.balance - b.balance);
        break;
      case "hybrid":
        // Score based on both factors (balance weight: 0.4, interest weight: 0.6)
        sorted.sort((a, b) => {
          const maxBalance = Math.max(...debts.map((d) => d.balance));
          const maxRate = Math.max(...debts.map((d) => d.interestRate));
          const scoreA =
            (a.interestRate / maxRate) * 0.6 +
            (1 - a.balance / maxBalance) * 0.4;
          const scoreB =
            (b.interestRate / maxRate) * 0.6 +
            (1 - b.balance / maxBalance) * 0.4;
          return scoreB - scoreA;
        });
        break;
    }

    return sorted;
  }

  /**
   * Simulate debt payoff over time
   */
  private simulatePayoff(
    sortedDebts: Debt[],
    monthlyPayment: number,
  ): {
    payoffDate: Date;
    totalMonths: number;
    totalInterest: number;
    totalPaid: number;
    debtOrder: DebtPayoffOrder[];
    timeline: PayoffTimelineEntry[];
  } {
    const balances: { [id: string]: number } = {};
    const interestPaid: { [id: string]: number } = {};
    sortedDebts.forEach((d) => {
      balances[d.id] = d.balance;
      interestPaid[d.id] = 0;
    });

    const debtOrder: DebtPayoffOrder[] = [];
    const timeline: PayoffTimelineEntry[] = [];
    let month = 0;
    let totalInterest = 0;
    let totalPaid = 0;
    const maxMonths = 360;
    let priority = 1;

    while (Object.values(balances).some((b) => b > 0.01) && month < maxMonths) {
      month++;
      let availablePayment = monthlyPayment;
      const debtsPaidOff: string[] = [];
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() + month);

      // Apply interest to all debts
      for (const debt of sortedDebts) {
        if (balances[debt.id] <= 0) continue;
        const monthlyRate = debt.interestRate / 100 / 12;
        const interest = balances[debt.id] * monthlyRate;
        balances[debt.id] += interest;
        interestPaid[debt.id] += interest;
        totalInterest += interest;
      }

      // Pay minimum on all debts first
      for (const debt of sortedDebts) {
        if (balances[debt.id] <= 0) continue;
        const payment = Math.min(debt.minimumPayment, balances[debt.id]);
        balances[debt.id] -= payment;
        availablePayment -= payment;
        totalPaid += payment;

        if (balances[debt.id] <= 0.01) {
          balances[debt.id] = 0;
          debtsPaidOff.push(debt.id);
          debtOrder.push({
            debtId: debt.id,
            debtName: debt.name,
            balance: debt.balance,
            interestRate: debt.interestRate,
            payoffMonth: month,
            payoffDate: monthDate,
            totalInterestPaid: interestPaid[debt.id],
            priority: priority++,
          });
        }
      }

      // Apply extra payment to first debt with balance
      if (availablePayment > 0) {
        for (const debt of sortedDebts) {
          if (balances[debt.id] <= 0) continue;
          const payment = Math.min(availablePayment, balances[debt.id]);
          balances[debt.id] -= payment;
          availablePayment -= payment;
          totalPaid += payment;

          if (balances[debt.id] <= 0.01) {
            balances[debt.id] = 0;
            if (!debtsPaidOff.includes(debt.id)) {
              debtsPaidOff.push(debt.id);
              debtOrder.push({
                debtId: debt.id,
                debtName: debt.name,
                balance: debt.balance,
                interestRate: debt.interestRate,
                payoffMonth: month,
                payoffDate: monthDate,
                totalInterestPaid: interestPaid[debt.id],
                priority: priority++,
              });
            }
          }
          if (availablePayment <= 0) break;
        }
      }

      // Record timeline entry (every month for first year, then quarterly)
      if (month <= 12 || month % 3 === 0) {
        timeline.push({
          month,
          date: monthDate,
          totalBalance: Object.values(balances).reduce(
            (sum, b) => sum + Math.max(0, b),
            0,
          ),
          totalPaid,
          totalInterest,
          debtBalances: { ...balances },
          debtsPaidOff,
        });
      }
    }

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + month);

    return {
      payoffDate,
      totalMonths: month,
      totalInterest,
      totalPaid,
      debtOrder,
      timeline,
    };
  }

  /**
   * Compare all strategies
   */
  compareStrategies(
    debts: Debt[],
    extraPayment: number = 0,
  ): StrategyComparison {
    const avalanche = this.calculatePayoffPlan(
      debts,
      "avalanche",
      extraPayment,
    );
    const snowball = this.calculatePayoffPlan(debts, "snowball", extraPayment);
    const hybrid = this.calculatePayoffPlan(debts, "hybrid", extraPayment);

    // Determine recommendation
    let recommendation: PayoffStrategy = "avalanche";
    let recommendationReason = "";

    const interestDiff =
      snowball.totalInterestPaid - avalanche.totalInterestPaid;
    const monthDiff = snowball.totalMonths - avalanche.totalMonths;

    if (interestDiff > 500) {
      recommendation = "avalanche";
      recommendationReason = `Avalanche saves $${interestDiff.toFixed(0)} in interest`;
    } else if (debts.some((d) => d.balance < 1000)) {
      recommendation = "snowball";
      recommendationReason = "Quick wins with small balances boost motivation";
    } else {
      recommendation = "hybrid";
      recommendationReason = "Balanced approach for your debt mix";
    }

    return {
      avalanche,
      snowball,
      hybrid,
      recommendation,
      recommendationReason,
    };
  }

  /**
   * Generate payoff milestones
   */
  generateMilestones(plan: PayoffPlan, debts: Debt[]): PayoffMilestone[] {
    const milestones: PayoffMilestone[] = [];
    const now = new Date();

    // Percentage milestones
    [25, 50, 75, 100].forEach((pct) => {
      const targetBalance = plan.totalDebt * (1 - pct / 100);
      const entry = plan.timeline.find((t) => t.totalBalance <= targetBalance);
      milestones.push({
        id: `pct-${pct}`,
        type: "percentage",
        target: pct,
        achieved: false,
        projectedDate: entry?.date || plan.payoffDate,
        description: `${pct}% of debt paid off`,
      });
    });

    // Individual debt payoff milestones
    plan.debtOrder.forEach((debt) => {
      milestones.push({
        id: `debt-${debt.debtId}`,
        type: "debt_paid",
        target: debt.debtName,
        achieved: false,
        projectedDate: debt.payoffDate,
        description: `${debt.debtName} paid off!`,
      });
    });

    return milestones.sort(
      (a, b) => a.projectedDate.getTime() - b.projectedDate.getTime(),
    );
  }

  /**
   * Generate insights and recommendations
   */
  generateInsights(overview: DebtOverview, plan: PayoffPlan): PayoffInsight[] {
    const insights: PayoffInsight[] = [];

    if (overview.highestInterestRate > 20) {
      insights.push({
        type: "warning",
        title: "High Interest Alert",
        description: `You have debt at ${overview.highestInterestRate.toFixed(1)}% APR`,
        impact: "Consider balance transfer or consolidation",
        actionable: true,
        action: "Explore balance transfer options",
      });
    }

    if (plan.interestSaved > 100) {
      insights.push({
        type: "tip",
        title: "Interest Savings",
        description: `Your current plan saves $${plan.interestSaved.toFixed(0)} in interest`,
        impact: `${plan.monthsSaved} months faster payoff`,
      });
    }

    if (overview.debtToIncomeRatio && overview.debtToIncomeRatio > 40) {
      insights.push({
        type: "warning",
        title: "High Debt-to-Income",
        description: `Your DTI is ${overview.debtToIncomeRatio.toFixed(1)}%`,
        impact: "May affect credit applications",
        actionable: true,
        action: "Focus on reducing debt or increasing income",
      });
    }

    return insights;
  }

  private createEmptyPlan(
    strategy: PayoffStrategy,
    extraPayment: number,
  ): PayoffPlan {
    return {
      strategy,
      totalDebt: 0,
      monthlyPayment: 0,
      extraPayment,
      payoffDate: new Date(),
      totalMonths: 0,
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      interestSaved: 0,
      monthsSaved: 0,
      debtOrder: [],
      timeline: [],
    };
  }
}

export const debtPayoffService = new DebtPayoffService();
