/**
 * Investment Calculators Service
 *
 * Comprehensive financial calculator suite for investment analysis:
 * - Compound interest with periodic contributions
 * - ROI calculation with dividends and fees
 * - Retirement projection with inflation adjustment
 * - FIRE number (Financial Independence Retire Early)
 * - Dollar-cost averaging analysis
 * - Break-even point calculation
 * - Real (inflation-adjusted) return
 * - Risk-adjusted return (Sharpe ratio)
 * - Mortgage payment calculation
 * - Full loan amortization schedule
 *
 * All formulas use standard financial mathematics.
 * Rates are expressed as decimals (e.g., 0.07 = 7%).
 */

// ============================================================================
// TYPES — Compound Interest
// ============================================================================

type CompoundingFrequency =
  | "annually"
  | "semi-annually"
  | "quarterly"
  | "monthly"
  | "daily";

interface CompoundInterestParams {
  /** Initial deposit (principal) in dollars */
  principal: number;
  /** Annual interest rate as a decimal (0.07 = 7%) */
  rate: number;
  /** Investment duration in years */
  time: number;
  /** How often interest is compounded */
  compoundingFrequency: CompoundingFrequency;
  /** Additional amount contributed each month (default 0) */
  monthlyContribution?: number;
}

interface CompoundInterestResult {
  /** Total value at end of period */
  futureValue: number;
  /** Total amount contributed (principal + all contributions) */
  totalContributed: number;
  /** Total interest earned */
  totalInterest: number;
  /** Effective annual yield accounting for compounding */
  effectiveAnnualRate: number;
  /** Year-by-year breakdown */
  yearlyBreakdown: YearlyBreakdownEntry[];
}

interface YearlyBreakdownEntry {
  year: number;
  /** Balance at end of this year */
  balance: number;
  /** Total contributions up to this year */
  totalContributed: number;
  /** Cumulative interest earned up to this year */
  totalInterest: number;
  /** Interest earned during this year only */
  yearInterest: number;
}

// ============================================================================
// TYPES — ROI
// ============================================================================

interface ROIParams {
  /** Amount originally invested */
  initialInvestment: number;
  /** Current or exit value of the investment */
  finalValue: number;
  /** Total dividends received over the holding period (default 0) */
  dividends?: number;
  /** Total fees and costs paid (default 0) */
  fees?: number;
  /** Holding period in years (used for annualized ROI) */
  timeYears: number;
}

interface ROIResult {
  /** Simple total ROI as a decimal */
  totalROI: number;
  /** Annualized (CAGR) ROI as a decimal */
  annualizedROI: number;
  /** Net profit in dollars */
  netProfit: number;
  /** Total return including dividends minus fees */
  totalReturn: number;
  /** Profit-to-cost ratio */
  profitRatio: number;
}

// ============================================================================
// TYPES — Retirement Projection
// ============================================================================

interface RetirementProjectionParams {
  /** Current age in years */
  currentAge: number;
  /** Desired retirement age */
  retirementAge: number;
  /** Current savings balance */
  currentSavings: number;
  /** Monthly contribution toward retirement */
  monthlyContribution: number;
  /** Expected annual return as a decimal (0.07 = 7%) */
  expectedReturn: number;
  /** Expected annual inflation rate as a decimal (0.03 = 3%) */
  inflationRate: number;
  /** Desired annual income in retirement (today's dollars) */
  desiredAnnualIncome: number;
}

interface RetirementProjectionResult {
  /** Projected portfolio value at retirement (nominal) */
  projectedSavings: number;
  /** Projected portfolio value in today's dollars */
  projectedSavingsReal: number;
  /** Amount needed at retirement to fund desired income (using 4% rule baseline) */
  requiredSavings: number;
  /** Required savings in today's dollars */
  requiredSavingsReal: number;
  /** Surplus or shortfall in nominal dollars */
  surplusOrShortfall: number;
  /** Whether the projection meets the goal */
  onTrack: boolean;
  /** Monthly contribution required to meet the goal exactly */
  requiredMonthlyContribution: number;
  /** Years in accumulation phase */
  yearsToRetirement: number;
  /** Estimated years the portfolio will last in retirement */
  estimatedPortfolioLifespan: number;
  /** Year-by-year accumulation projection */
  yearlyProjection: RetirementYearEntry[];
}

interface RetirementYearEntry {
  age: number;
  year: number;
  /** Nominal balance at end of year */
  balance: number;
  /** Balance in today's dollars */
  balanceReal: number;
  /** Total contributed to date */
  totalContributed: number;
  /** Total growth (interest/gains) to date */
  totalGrowth: number;
}

// ============================================================================
// TYPES — FIRE
// ============================================================================

interface FIREResult {
  /** The target nest egg required */
  fireNumber: number;
  /** Monthly savings needed (assumes 7% real return, 30-year horizon) */
  monthlySavingsNeeded: number;
  /** Implied safe withdrawal amount per year */
  annualWithdrawal: number;
}

// ============================================================================
// TYPES — Dollar-Cost Averaging
// ============================================================================

interface DCAResult {
  /** Total amount invested */
  totalInvested: number;
  /** Total units/shares purchased */
  totalUnits: number;
  /** Weighted average cost per unit */
  averageCostBasis: number;
  /** Current portfolio value at most recent price */
  currentValue: number;
  /** Total gain or loss in dollars */
  gainOrLoss: number;
  /** Return as a decimal */
  returnPct: number;
  /** Per-purchase breakdown */
  purchases: DCAPurchase[];
}

interface DCAPurchase {
  period: number;
  price: number;
  amountInvested: number;
  unitsPurchased: number;
  cumulativeUnits: number;
  cumulativeInvested: number;
  averageCostAtPurchase: number;
}

// ============================================================================
// TYPES — Break-Even
// ============================================================================

interface BreakEvenResult {
  /** Months until the investment is recovered */
  monthsToBreakEven: number;
  /** Years until break-even (decimal) */
  yearsToBreakEven: number;
  /** Total return earned by break-even point */
  totalReturnAtBreakEven: number;
}

// ============================================================================
// TYPES — Mortgage / Loan
// ============================================================================

interface MortgagePaymentResult {
  /** Fixed monthly payment */
  monthlyPayment: number;
  /** Total amount paid over the life of the loan */
  totalPaid: number;
  /** Total interest paid over the life of the loan */
  totalInterest: number;
  /** Loan-to-payment ratio */
  paymentToIncomeEstimate: number;
}

interface LoanAmortizationEntry {
  /** Payment number (1-based) */
  month: number;
  /** Monthly payment amount */
  payment: number;
  /** Portion of payment going to principal */
  principalPortion: number;
  /** Portion of payment going to interest */
  interestPortion: number;
  /** Remaining loan balance after this payment */
  remainingBalance: number;
  /** Cumulative principal paid */
  cumulativePrincipal: number;
  /** Cumulative interest paid */
  cumulativeInterest: number;
}

interface LoanAmortizationResult {
  /** Fixed monthly payment */
  monthlyPayment: number;
  /** Total amount paid over the life of the loan */
  totalPaid: number;
  /** Total interest paid */
  totalInterest: number;
  /** Total number of payments */
  totalPayments: number;
  /** Complete month-by-month amortization schedule */
  schedule: LoanAmortizationEntry[];
}

// ============================================================================
// TYPES — Risk-Adjusted Return
// ============================================================================

interface RiskAdjustedReturnResult {
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Mean return of the series */
  meanReturn: number;
  /** Standard deviation of returns */
  standardDeviation: number;
  /** Excess return over risk-free rate */
  excessReturn: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function compoundingPeriodsPerYear(freq: CompoundingFrequency): number {
  switch (freq) {
    case "annually":
      return 1;
    case "semi-annually":
      return 2;
    case "quarterly":
      return 4;
    case "monthly":
      return 12;
    case "daily":
      return 365;
  }
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================================
// INVESTMENT CALCULATORS CLASS
// ============================================================================

class InvestmentCalculators {
  // --------------------------------------------------------------------------
  // Compound Interest
  // --------------------------------------------------------------------------

  /**
   * Calculate compound interest with optional periodic contributions.
   *
   * Formula (principal only):
   *   FV = P * (1 + r/n)^(n*t)
   *
   * Future value of a series of periodic contributions (annuity):
   *   FV_contributions = PMT * [((1 + r/n)^(n*t) - 1) / (r/n)]
   *
   * When rate is 0 the formulas degenerate to simple addition.
   */
  calculateCompoundInterest(
    params: CompoundInterestParams,
  ): CompoundInterestResult {
    const {
      principal,
      rate,
      time,
      compoundingFrequency,
      monthlyContribution = 0,
    } = params;

    if (principal < 0) throw new Error("Principal must be non-negative");
    if (rate < 0) throw new Error("Rate must be non-negative");
    if (time <= 0) throw new Error("Time must be positive");

    const n = compoundingPeriodsPerYear(compoundingFrequency);

    // Convert monthly contribution to per-compounding-period contribution.
    // Monthly contribution happens 12 times/year; compounding happens n times/year.
    // We convert to equivalent per-period contribution.
    const contributionPerPeriod = monthlyContribution * (12 / n);

    const totalPeriods = n * time;
    const ratePerPeriod = rate / n;

    let futureValue: number;
    if (rate === 0) {
      futureValue = principal + contributionPerPeriod * totalPeriods;
    } else {
      // FV of lump sum
      const fvPrincipal = principal * Math.pow(1 + ratePerPeriod, totalPeriods);
      // FV of annuity (contributions at end of each period)
      const fvContributions =
        contributionPerPeriod *
        ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);
      futureValue = fvPrincipal + fvContributions;
    }

    const totalContributed = principal + monthlyContribution * 12 * time;
    const totalInterest = futureValue - totalContributed;

    // Effective annual rate: (1 + r/n)^n - 1
    const effectiveAnnualRate =
      rate === 0 ? 0 : Math.pow(1 + ratePerPeriod, n) - 1;

    // Year-by-year breakdown
    const yearlyBreakdown: YearlyBreakdownEntry[] = [];
    let prevBalance = principal;

    for (let year = 1; year <= Math.ceil(time); year++) {
      const periodsThisYear =
        year <= time ? n : Math.round((time - Math.floor(time)) * n);
      const cumulativePeriods = Math.min(year, time) * n;

      let balance: number;
      if (rate === 0) {
        balance = principal + contributionPerPeriod * cumulativePeriods;
      } else {
        const fvP = principal * Math.pow(1 + ratePerPeriod, cumulativePeriods);
        const fvC =
          contributionPerPeriod *
          ((Math.pow(1 + ratePerPeriod, cumulativePeriods) - 1) /
            ratePerPeriod);
        balance = fvP + fvC;
      }

      const yearContributed =
        principal + monthlyContribution * 12 * Math.min(year, time);
      const yearTotalInterest = balance - yearContributed;
      const yearInterest =
        balance -
        prevBalance -
        monthlyContribution * 12 * (year <= time ? 1 : time - Math.floor(time));

      yearlyBreakdown.push({
        year,
        balance: roundCents(balance),
        totalContributed: roundCents(yearContributed),
        totalInterest: roundCents(yearTotalInterest),
        yearInterest: roundCents(yearInterest),
      });

      prevBalance = balance;
    }

    return {
      futureValue: roundCents(futureValue),
      totalContributed: roundCents(totalContributed),
      totalInterest: roundCents(totalInterest),
      effectiveAnnualRate: Math.round(effectiveAnnualRate * 1e8) / 1e8,
      yearlyBreakdown,
    };
  }

  // --------------------------------------------------------------------------
  // ROI
  // --------------------------------------------------------------------------

  /**
   * Calculate Return on Investment.
   *
   * Total ROI = (finalValue + dividends - fees - initialInvestment) / initialInvestment
   * Annualized ROI (CAGR) = ((finalValue + dividends - fees) / initialInvestment)^(1/t) - 1
   */
  calculateROI(params: ROIParams): ROIResult {
    const {
      initialInvestment,
      finalValue,
      dividends = 0,
      fees = 0,
      timeYears,
    } = params;

    if (initialInvestment <= 0)
      throw new Error("Initial investment must be positive");
    if (timeYears <= 0) throw new Error("Time must be positive");

    const totalReturn = finalValue + dividends - fees;
    const netProfit = totalReturn - initialInvestment;
    const totalROI = netProfit / initialInvestment;

    // CAGR: Compound Annual Growth Rate
    const annualizedROI =
      Math.pow(totalReturn / initialInvestment, 1 / timeYears) - 1;

    const profitRatio = totalReturn / initialInvestment;

    return {
      totalROI: Math.round(totalROI * 1e8) / 1e8,
      annualizedROI: Math.round(annualizedROI * 1e8) / 1e8,
      netProfit: roundCents(netProfit),
      totalReturn: roundCents(totalReturn),
      profitRatio: Math.round(profitRatio * 1e6) / 1e6,
    };
  }

  // --------------------------------------------------------------------------
  // Retirement Projection
  // --------------------------------------------------------------------------

  /**
   * Project retirement savings with inflation adjustment.
   *
   * Accumulation uses compound growth with monthly contributions.
   * Required savings uses the 4% rule adjusted for inflation.
   * Portfolio lifespan estimated via systematic withdrawal simulation.
   */
  calculateRetirementProjection(
    params: RetirementProjectionParams,
  ): RetirementProjectionResult {
    const {
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution,
      expectedReturn,
      inflationRate,
      desiredAnnualIncome,
    } = params;

    if (retirementAge <= currentAge)
      throw new Error("Retirement age must exceed current age");
    if (currentSavings < 0)
      throw new Error("Current savings must be non-negative");

    const yearsToRetirement = retirementAge - currentAge;
    const monthlyRate = expectedReturn / 12;
    const totalMonths = yearsToRetirement * 12;

    // Accumulation phase: FV of lump sum + FV of annuity (monthly compounding)
    let projectedSavings: number;
    if (expectedReturn === 0) {
      projectedSavings = currentSavings + monthlyContribution * totalMonths;
    } else {
      const fvLump = currentSavings * Math.pow(1 + monthlyRate, totalMonths);
      const fvAnnuity =
        monthlyContribution *
        ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
      projectedSavings = fvLump + fvAnnuity;
    }

    // Inflation-adjusted (real) projected savings
    const inflationFactor = Math.pow(1 + inflationRate, yearsToRetirement);
    const projectedSavingsReal = projectedSavings / inflationFactor;

    // Required savings: desired income in future dollars / safe withdrawal rate (4%)
    const safeWithdrawalRate = 0.04;
    const futureAnnualIncome = desiredAnnualIncome * inflationFactor;
    const requiredSavings = futureAnnualIncome / safeWithdrawalRate;
    const requiredSavingsReal = requiredSavings / inflationFactor;

    const surplusOrShortfall = projectedSavings - requiredSavings;
    const onTrack = surplusOrShortfall >= 0;

    // Calculate required monthly contribution to meet the goal exactly
    let requiredMonthlyContribution: number;
    const targetFV = requiredSavings;
    if (expectedReturn === 0) {
      requiredMonthlyContribution = Math.max(
        0,
        (targetFV - currentSavings) / totalMonths,
      );
    } else {
      const fvLumpAlready =
        currentSavings * Math.pow(1 + monthlyRate, totalMonths);
      const annuityFactor =
        (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate;
      requiredMonthlyContribution = Math.max(
        0,
        (targetFV - fvLumpAlready) / annuityFactor,
      );
    }

    // Estimate portfolio lifespan in retirement via withdrawal simulation.
    // Assume real return in retirement = expectedReturn - inflationRate, withdrawals increase with inflation.
    const realReturnInRetirement = Math.max(expectedReturn - inflationRate, 0);
    const monthlyRealReturn = realReturnInRetirement / 12;
    const monthlyWithdrawal = futureAnnualIncome / 12;

    let retirementBalance = projectedSavings;
    let retirementMonths = 0;
    const maxRetirementMonths = 50 * 12; // cap at 50 years
    let annualWithdrawal = monthlyWithdrawal;

    while (retirementBalance > 0 && retirementMonths < maxRetirementMonths) {
      // Annual inflation adjustment to withdrawals
      if (retirementMonths > 0 && retirementMonths % 12 === 0) {
        annualWithdrawal *= 1 + inflationRate;
      }
      retirementBalance =
        retirementBalance * (1 + monthlyRealReturn) - annualWithdrawal;
      retirementMonths++;
    }

    const estimatedPortfolioLifespan = retirementMonths / 12;

    // Year-by-year accumulation projection
    const yearlyProjection: RetirementYearEntry[] = [];
    let runningBalance = currentSavings;
    let runningContributed = currentSavings;

    for (let y = 1; y <= yearsToRetirement; y++) {
      // Grow balance monthly for this year
      for (let m = 0; m < 12; m++) {
        runningBalance =
          runningBalance * (1 + monthlyRate) + monthlyContribution;
      }
      runningContributed += monthlyContribution * 12;

      const yearInflationFactor = Math.pow(1 + inflationRate, y);

      yearlyProjection.push({
        age: currentAge + y,
        year: y,
        balance: roundCents(runningBalance),
        balanceReal: roundCents(runningBalance / yearInflationFactor),
        totalContributed: roundCents(runningContributed),
        totalGrowth: roundCents(runningBalance - runningContributed),
      });
    }

    return {
      projectedSavings: roundCents(projectedSavings),
      projectedSavingsReal: roundCents(projectedSavingsReal),
      requiredSavings: roundCents(requiredSavings),
      requiredSavingsReal: roundCents(requiredSavingsReal),
      surplusOrShortfall: roundCents(surplusOrShortfall),
      onTrack,
      requiredMonthlyContribution: roundCents(requiredMonthlyContribution),
      yearsToRetirement,
      estimatedPortfolioLifespan:
        Math.round(estimatedPortfolioLifespan * 100) / 100,
      yearlyProjection,
    };
  }

  // --------------------------------------------------------------------------
  // FIRE Number
  // --------------------------------------------------------------------------

  /**
   * Calculate FIRE (Financial Independence Retire Early) number.
   *
   * FIRE Number = annualExpenses / withdrawalRate
   *
   * Also estimates monthly savings needed assuming a 7% real return and
   * a 30-year accumulation horizon using the future value annuity formula.
   */
  calculateFIRENumber(
    annualExpenses: number,
    withdrawalRate: number = 0.04,
  ): FIREResult {
    if (annualExpenses <= 0)
      throw new Error("Annual expenses must be positive");
    if (withdrawalRate <= 0 || withdrawalRate > 1)
      throw new Error("Withdrawal rate must be between 0 and 1");

    const fireNumber = annualExpenses / withdrawalRate;

    // Estimate monthly savings needed: assume 7% real return, 30 years
    const assumedRealReturn = 0.07;
    const horizonYears = 30;
    const monthlyRate = assumedRealReturn / 12;
    const totalMonths = horizonYears * 12;
    const annuityFactor =
      (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate;
    const monthlySavingsNeeded = fireNumber / annuityFactor;

    return {
      fireNumber: roundCents(fireNumber),
      monthlySavingsNeeded: roundCents(monthlySavingsNeeded),
      annualWithdrawal: roundCents(annualExpenses),
    };
  }

  // --------------------------------------------------------------------------
  // Dollar-Cost Averaging
  // --------------------------------------------------------------------------

  /**
   * Analyze dollar-cost averaging for a fixed monthly investment.
   *
   * Given a fixed amount invested each period and the price at each period,
   * calculates total units purchased, weighted average cost basis, and return.
   */
  calculateDollarCostAverage(
    monthlyAmount: number,
    prices: number[],
  ): DCAResult {
    if (monthlyAmount <= 0) throw new Error("Monthly amount must be positive");
    if (prices.length === 0) throw new Error("Prices array must not be empty");
    if (prices.some((p) => p <= 0))
      throw new Error("All prices must be positive");

    const purchases: DCAPurchase[] = [];
    let totalUnits = 0;
    let totalInvested = 0;

    for (let i = 0; i < prices.length; i++) {
      const price = prices[i];
      const unitsPurchased = monthlyAmount / price;
      totalUnits += unitsPurchased;
      totalInvested += monthlyAmount;

      purchases.push({
        period: i + 1,
        price,
        amountInvested: roundCents(monthlyAmount),
        unitsPurchased: Math.round(unitsPurchased * 1e8) / 1e8,
        cumulativeUnits: Math.round(totalUnits * 1e8) / 1e8,
        cumulativeInvested: roundCents(totalInvested),
        averageCostAtPurchase: roundCents(totalInvested / totalUnits),
      });
    }

    const averageCostBasis = totalInvested / totalUnits;
    const latestPrice = prices[prices.length - 1];
    const currentValue = totalUnits * latestPrice;
    const gainOrLoss = currentValue - totalInvested;
    const returnPct = gainOrLoss / totalInvested;

    return {
      totalInvested: roundCents(totalInvested),
      totalUnits: Math.round(totalUnits * 1e8) / 1e8,
      averageCostBasis: roundCents(averageCostBasis),
      currentValue: roundCents(currentValue),
      gainOrLoss: roundCents(gainOrLoss),
      returnPct: Math.round(returnPct * 1e8) / 1e8,
      purchases,
    };
  }

  // --------------------------------------------------------------------------
  // Break-Even Point
  // --------------------------------------------------------------------------

  /**
   * Calculate when an investment breaks even.
   *
   * Given a lump-sum investment and a fixed monthly return,
   * determines the number of months until cumulative returns >= investment.
   *
   * monthlyReturn is the dollar amount returned each month.
   */
  calculateBreakEvenPoint(
    investment: number,
    monthlyReturn: number,
  ): BreakEvenResult {
    if (investment <= 0) throw new Error("Investment must be positive");
    if (monthlyReturn <= 0) throw new Error("Monthly return must be positive");

    const monthsToBreakEven = Math.ceil(investment / monthlyReturn);
    const yearsToBreakEven = Math.round((monthsToBreakEven / 12) * 100) / 100;
    const totalReturnAtBreakEven = roundCents(
      monthlyReturn * monthsToBreakEven,
    );

    return {
      monthsToBreakEven,
      yearsToBreakEven,
      totalReturnAtBreakEven,
    };
  }

  // --------------------------------------------------------------------------
  // Real Return (Inflation-Adjusted)
  // --------------------------------------------------------------------------

  /**
   * Calculate the real (inflation-adjusted) return using the Fisher equation.
   *
   * Real Return = ((1 + nominalReturn) / (1 + inflationRate)) - 1
   *
   * This is more accurate than the simple subtraction approximation.
   */
  calculateRealReturn(nominalReturn: number, inflationRate: number): number {
    if (inflationRate === -1) throw new Error("Inflation rate cannot be -100%");
    const realReturn = (1 + nominalReturn) / (1 + inflationRate) - 1;
    return Math.round(realReturn * 1e8) / 1e8;
  }

  // --------------------------------------------------------------------------
  // Risk-Adjusted Return (Sharpe Ratio)
  // --------------------------------------------------------------------------

  /**
   * Calculate the Sharpe ratio for a series of periodic returns.
   *
   * Sharpe = (mean(returns) - riskFreeRate) / stddev(returns)
   *
   * A higher Sharpe ratio indicates better risk-adjusted performance.
   * Returns are expected as decimals for each period (e.g., monthly returns).
   * riskFreeRate should be expressed for the same period length.
   */
  calculateRiskAdjustedReturn(
    returns: number[],
    riskFreeRate: number,
  ): RiskAdjustedReturnResult {
    if (returns.length < 2)
      throw new Error("At least two return observations are required");

    const n = returns.length;
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / n;

    // Population standard deviation
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    const excessReturn = meanReturn - riskFreeRate;
    const sharpeRatio =
      standardDeviation === 0 ? 0 : excessReturn / standardDeviation;

    return {
      sharpeRatio: Math.round(sharpeRatio * 1e6) / 1e6,
      meanReturn: Math.round(meanReturn * 1e8) / 1e8,
      standardDeviation: Math.round(standardDeviation * 1e8) / 1e8,
      excessReturn: Math.round(excessReturn * 1e8) / 1e8,
    };
  }

  // --------------------------------------------------------------------------
  // Mortgage Payment
  // --------------------------------------------------------------------------

  /**
   * Calculate the fixed monthly mortgage (or loan) payment.
   *
   * Formula:  M = P * [r(1+r)^n] / [(1+r)^n - 1]
   *
   * Where:
   *   P = principal loan amount
   *   r = monthly interest rate (annualRate / 12)
   *   n = total number of monthly payments (termYears * 12)
   */
  calculateMortgagePayment(
    principal: number,
    annualRate: number,
    termYears: number,
  ): MortgagePaymentResult {
    if (principal <= 0) throw new Error("Principal must be positive");
    if (annualRate < 0) throw new Error("Annual rate must be non-negative");
    if (termYears <= 0) throw new Error("Term must be positive");

    const monthlyRate = annualRate / 12;
    const totalPayments = termYears * 12;

    let monthlyPayment: number;
    if (annualRate === 0) {
      monthlyPayment = principal / totalPayments;
    } else {
      const factor = Math.pow(1 + monthlyRate, totalPayments);
      monthlyPayment = (principal * (monthlyRate * factor)) / (factor - 1);
    }

    const totalPaid = monthlyPayment * totalPayments;
    const totalInterest = totalPaid - principal;

    return {
      monthlyPayment: roundCents(monthlyPayment),
      totalPaid: roundCents(totalPaid),
      totalInterest: roundCents(totalInterest),
      paymentToIncomeEstimate: roundCents(monthlyPayment),
    };
  }

  // --------------------------------------------------------------------------
  // Loan Amortization
  // --------------------------------------------------------------------------

  /**
   * Generate a full loan amortization schedule.
   *
   * Each month:
   *   interestPortion = remainingBalance * monthlyRate
   *   principalPortion = monthlyPayment - interestPortion
   *   remainingBalance -= principalPortion
   */
  calculateLoanAmortization(
    principal: number,
    annualRate: number,
    termYears: number,
  ): LoanAmortizationResult {
    if (principal <= 0) throw new Error("Principal must be positive");
    if (annualRate < 0) throw new Error("Annual rate must be non-negative");
    if (termYears <= 0) throw new Error("Term must be positive");

    const monthlyRate = annualRate / 12;
    const totalPayments = termYears * 12;

    let monthlyPayment: number;
    if (annualRate === 0) {
      monthlyPayment = principal / totalPayments;
    } else {
      const factor = Math.pow(1 + monthlyRate, totalPayments);
      monthlyPayment = (principal * (monthlyRate * factor)) / (factor - 1);
    }

    const schedule: LoanAmortizationEntry[] = [];
    let remainingBalance = principal;
    let cumulativePrincipal = 0;
    let cumulativeInterest = 0;

    for (let month = 1; month <= totalPayments; month++) {
      const interestPortion = remainingBalance * monthlyRate;
      let principalPortion = monthlyPayment - interestPortion;

      // Handle final payment rounding
      if (month === totalPayments) {
        principalPortion = remainingBalance;
        const actualPayment = principalPortion + interestPortion;
        cumulativePrincipal += principalPortion;
        cumulativeInterest += interestPortion;

        schedule.push({
          month,
          payment: roundCents(actualPayment),
          principalPortion: roundCents(principalPortion),
          interestPortion: roundCents(interestPortion),
          remainingBalance: 0,
          cumulativePrincipal: roundCents(cumulativePrincipal),
          cumulativeInterest: roundCents(cumulativeInterest),
        });
        remainingBalance = 0;
      } else {
        remainingBalance -= principalPortion;
        cumulativePrincipal += principalPortion;
        cumulativeInterest += interestPortion;

        schedule.push({
          month,
          payment: roundCents(monthlyPayment),
          principalPortion: roundCents(principalPortion),
          interestPortion: roundCents(interestPortion),
          remainingBalance: roundCents(Math.max(0, remainingBalance)),
          cumulativePrincipal: roundCents(cumulativePrincipal),
          cumulativeInterest: roundCents(cumulativeInterest),
        });
      }
    }

    const totalPaid = monthlyPayment * totalPayments;
    const totalInterest = totalPaid - principal;

    return {
      monthlyPayment: roundCents(monthlyPayment),
      totalPaid: roundCents(totalPaid),
      totalInterest: roundCents(totalInterest),
      totalPayments,
      schedule,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/** Singleton instance for direct import */
const investmentCalculators = new InvestmentCalculators();

/** Factory function matching project convention */
function createInvestmentCalculators(): InvestmentCalculators {
  return new InvestmentCalculators();
}

export {
  InvestmentCalculators,
  investmentCalculators,
  createInvestmentCalculators,
};

export type {
  CompoundingFrequency,
  CompoundInterestParams,
  CompoundInterestResult,
  YearlyBreakdownEntry,
  ROIParams,
  ROIResult,
  RetirementProjectionParams,
  RetirementProjectionResult,
  RetirementYearEntry,
  FIREResult,
  DCAResult,
  DCAPurchase,
  BreakEvenResult,
  MortgagePaymentResult,
  LoanAmortizationEntry,
  LoanAmortizationResult,
  RiskAdjustedReturnResult,
};

export default investmentCalculators;
