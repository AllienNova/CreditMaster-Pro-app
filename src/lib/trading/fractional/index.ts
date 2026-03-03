/**
 * Fractional Trading Module
 *
 * Dollar-based ordering, lot splitting, recurring investments,
 * and dividend reinvestment using fractional shares.
 */

// Fractional Order Service
export {
  FractionalOrderService,
  FractionalOrderError,
  createFractionalOrderService,
} from "./fractional-order-service";

export type {
  DollarOrderParams,
  ShareOrderParams,
  LotSplit,
  FractionalOrderResult,
  FractionalValidation,
} from "./fractional-order-service";

// Auto-Invest Scheduler
export {
  AutoInvestScheduler,
  AutoInvestError,
  createAutoInvestScheduler,
} from "./auto-invest-scheduler";

export type {
  InvestmentFrequency,
  PortfolioAllocation,
  AutoInvestScheduleParams,
  AutoInvestSchedule,
  ScheduleExecutionResult,
  ScheduleUpdate,
} from "./auto-invest-scheduler";

// DRIP Service (Dividend Reinvestment Plan)
export {
  DripService,
  DripError,
  createDripService,
} from "./drip-service";

export type {
  DripEnrollmentParams,
  DripEnrollment,
  DividendEvent,
  DripReinvestment,
} from "./drip-service";
