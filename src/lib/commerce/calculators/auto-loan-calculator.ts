/**
 * Auto Loan Calculator
 *
 * Standard amortization calculations for auto loans including monthly payment,
 * total interest, affordability analysis, and term comparison.
 */

// =============================================================================
// Types
// =============================================================================

export interface AutoLoanCalculation {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  principal: number;
  apr: number;
  termMonths: number;
}

export interface AffordabilityResult {
  maxLoanAmount: number;
  maxMonthlyPayment: number;
  recommendedMaxPrice: number;
  dtiAfterLoan: number;
}

// =============================================================================
// Calculator
// =============================================================================

/**
 * Calculate auto loan payment using standard amortization formula.
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param vehiclePrice  Total vehicle price
 * @param downPayment   Down payment amount
 * @param apr           Annual rate as decimal, e.g. 0.065 for 6.5%
 * @param termMonths    Loan term in months
 */
export function calculateAutoLoan(
  vehiclePrice: number,
  downPayment: number,
  apr: number,
  termMonths: number,
): AutoLoanCalculation {
  const principal = Math.max(0, vehiclePrice - downPayment);

  // Zero-interest edge case
  if (apr === 0) {
    const monthlyPayment = termMonths > 0 ? principal / termMonths : 0;
    return {
      monthlyPayment,
      totalInterest: 0,
      totalCost: principal,
      principal,
      apr,
      termMonths,
    };
  }

  const monthlyRate = apr / 12;
  const compounded = Math.pow(1 + monthlyRate, termMonths);
  const monthlyPayment = (principal * (monthlyRate * compounded)) / (compounded - 1);
  const totalCost = monthlyPayment * termMonths;
  const totalInterest = totalCost - principal;

  return {
    monthlyPayment,
    totalInterest,
    totalCost,
    principal,
    apr,
    termMonths,
  };
}

/**
 * Calculate maximum affordable auto loan based on income and existing debt.
 *
 * @param monthlyIncome       Gross monthly income
 * @param currentMonthlyDebt  Existing monthly debt obligations
 * @param maxDTI              Maximum acceptable DTI ratio (default 0.36)
 * @param apr                 Assumed APR for calculation (default 0.07)
 * @param termMonths          Assumed loan term (default 60)
 */
export function calculateAffordability(
  monthlyIncome: number,
  currentMonthlyDebt: number,
  maxDTI: number = 0.36,
  apr: number = 0.07,
  termMonths: number = 60,
): AffordabilityResult {
  if (monthlyIncome <= 0) {
    return {
      maxLoanAmount: 0,
      maxMonthlyPayment: 0,
      recommendedMaxPrice: 0,
      dtiAfterLoan: 1,
    };
  }

  // Maximum allowable total monthly debt
  const maxTotalDebt = monthlyIncome * maxDTI;
  // Available headroom for the new car payment
  const maxMonthlyPayment = Math.max(0, maxTotalDebt - currentMonthlyDebt);

  // Derive max principal from payment using inverse amortization
  let maxLoanAmount = 0;
  if (maxMonthlyPayment > 0) {
    if (apr === 0) {
      maxLoanAmount = maxMonthlyPayment * termMonths;
    } else {
      const monthlyRate = apr / 12;
      const compounded = Math.pow(1 + monthlyRate, termMonths);
      maxLoanAmount = (maxMonthlyPayment * (compounded - 1)) / (monthlyRate * compounded);
    }
  }

  // Recommend 20% down, so max vehicle price = maxLoanAmount / 0.80
  const recommendedMaxPrice = maxLoanAmount / 0.8;

  const dtiAfterLoan =
    monthlyIncome > 0
      ? (currentMonthlyDebt + maxMonthlyPayment) / monthlyIncome
      : 1;

  return {
    maxLoanAmount,
    maxMonthlyPayment,
    recommendedMaxPrice,
    dtiAfterLoan,
  };
}

/**
 * Compare the same loan across multiple term lengths.
 *
 * @param vehiclePrice  Total vehicle price
 * @param downPayment   Down payment amount
 * @param apr           Annual rate as decimal
 * @param terms         Array of term lengths in months, e.g. [36, 48, 60, 72, 84]
 */
export function compareTerms(
  vehiclePrice: number,
  downPayment: number,
  apr: number,
  terms: number[],
): AutoLoanCalculation[] {
  return terms.map((term) => calculateAutoLoan(vehiclePrice, downPayment, apr, term));
}
