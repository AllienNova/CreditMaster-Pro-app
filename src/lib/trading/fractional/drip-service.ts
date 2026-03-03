/**
 * DRIP Service (Dividend Reinvestment Plan)
 *
 * Manages enrollment of positions in automatic dividend reinvestment.
 * When a dividend is paid on an enrolled position, the service
 * automatically places a fractional buy order for additional shares.
 *
 * Enrollment and reinvestment history are stored in-memory with an
 * interface designed for Supabase persistence.
 */

import type { RoutingPreference } from "@/lib/trading/brokers/broker-router";
import type {
  FractionalOrderService,
  FractionalOrderResult,
} from "./fractional-order-service";

// ============================================================================
// TYPES
// ============================================================================

export interface DripEnrollmentParams {
  /** User enrolling the position */
  userId: string;
  /** Ticker symbol of the position to enroll */
  symbol: string;
  /** Whether DRIP is enabled for this position */
  enabled: boolean;
  /** Optional broker routing preference */
  brokerPreference?: RoutingPreference;
}

export interface DripEnrollment {
  /** Unique enrollment identifier */
  id: string;
  /** Owning user */
  userId: string;
  /** Enrolled stock symbol */
  symbol: string;
  /** Whether automatic reinvestment is active */
  enabled: boolean;
  /** Total dollar amount reinvested over the enrollment's lifetime */
  totalReinvested: number;
  /** Total fractional shares acquired through reinvestment */
  totalSharesAcquired: number;
  /** When the enrollment was created */
  createdAt: Date;
  /** When the last dividend reinvestment occurred */
  lastReinvestedAt?: Date;
  /** Broker routing preference for reinvestment orders */
  brokerPreference?: RoutingPreference;
}

export interface DividendEvent {
  /** Ticker symbol paying the dividend */
  symbol: string;
  /** User receiving the dividend */
  userId: string;
  /** Total dividend amount in dollars */
  amount: number;
  /** Ex-dividend date */
  exDate: Date;
  /** Payment date */
  payDate: Date;
  /** Number of shares held at the ex-date */
  sharesHeld: number;
}

export interface DripReinvestment {
  /** Unique reinvestment record identifier */
  id: string;
  /** Associated enrollment ID */
  enrollmentId: string;
  /** Dividend amount that was reinvested */
  dividendAmount: number;
  /** Number of fractional shares acquired */
  sharesAcquired: number;
  /** Price per share at reinvestment */
  pricePerShare: number;
  /** When the reinvestment order was executed */
  executedAt: Date;
  /** Whether the reinvestment order succeeded */
  success: boolean;
  /** Error message if the reinvestment failed */
  error?: string;
}

// ============================================================================
// DRIP SERVICE
// ============================================================================

export class DripService {
  private readonly fractionalService: FractionalOrderService;
  private readonly enrollments: Map<string, DripEnrollment> = new Map();
  private readonly reinvestments: DripReinvestment[] = [];

  constructor(fractionalService: FractionalOrderService) {
    this.fractionalService = fractionalService;
  }

  // ==========================================================================
  // ENROLLMENT MANAGEMENT
  // ==========================================================================

  /**
   * Enroll or update a position in the dividend reinvestment plan.
   * If the user already has an enrollment for this symbol, it is updated.
   */
  enrollDrip(params: DripEnrollmentParams): DripEnrollment {
    if (!params.userId || params.userId.trim() === "") {
      throw new DripError("User ID is required");
    }
    if (!params.symbol || params.symbol.trim() === "") {
      throw new DripError("Symbol is required");
    }

    // Check for existing enrollment for this user+symbol
    const existing = this.findEnrollment(params.userId, params.symbol);
    if (existing) {
      existing.enabled = params.enabled;
      if (params.brokerPreference) {
        existing.brokerPreference = params.brokerPreference;
      }
      return { ...existing };
    }

    const enrollment: DripEnrollment = {
      id: this.generateEnrollmentId(),
      userId: params.userId,
      symbol: params.symbol.toUpperCase(),
      enabled: params.enabled,
      totalReinvested: 0,
      totalSharesAcquired: 0,
      createdAt: new Date(),
      brokerPreference: params.brokerPreference,
    };

    this.enrollments.set(enrollment.id, enrollment);
    return { ...enrollment };
  }

  /**
   * Remove a DRIP enrollment by ID.
   * Throws if the enrollment does not exist.
   */
  unenrollDrip(enrollmentId: string): void {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) {
      throw new DripError(`Enrollment "${enrollmentId}" not found`);
    }

    this.enrollments.delete(enrollmentId);
  }

  /**
   * Get all DRIP enrollments for a user.
   */
  getEnrollments(userId: string): DripEnrollment[] {
    const results: DripEnrollment[] = [];
    for (const enrollment of this.enrollments.values()) {
      if (enrollment.userId === userId) {
        results.push({ ...enrollment });
      }
    }
    return results;
  }

  /**
   * Get a specific enrollment by ID.
   */
  getEnrollment(enrollmentId: string): DripEnrollment | undefined {
    const enrollment = this.enrollments.get(enrollmentId);
    return enrollment ? { ...enrollment } : undefined;
  }

  // ==========================================================================
  // DIVIDEND PROCESSING
  // ==========================================================================

  /**
   * Process a dividend event. If the user has an active DRIP enrollment
   * for the dividend's symbol, a fractional buy order is placed to
   * reinvest the dividend amount.
   *
   * Returns the reinvestment record, or null if the user is not enrolled
   * or DRIP is disabled for this symbol.
   */
  async processDividend(dividend: DividendEvent): Promise<DripReinvestment | null> {
    // Validate dividend event
    if (dividend.amount <= 0) {
      throw new DripError("Dividend amount must be greater than 0");
    }
    if (dividend.sharesHeld <= 0) {
      throw new DripError("Shares held must be greater than 0");
    }

    // Find active enrollment
    const enrollment = this.findEnrollment(dividend.userId, dividend.symbol);
    if (!enrollment || !enrollment.enabled) {
      return null;
    }

    // Place fractional buy order for the dividend amount
    const orderResult = await this.fractionalService.placeDollarOrder({
      symbol: dividend.symbol,
      dollarAmount: dividend.amount,
      side: "buy",
      brokerPreference: enrollment.brokerPreference,
      userId: dividend.userId,
    });

    const reinvestment: DripReinvestment = {
      id: this.generateReinvestmentId(),
      enrollmentId: enrollment.id,
      dividendAmount: dividend.amount,
      sharesAcquired: orderResult.sharesOrdered ?? 0,
      pricePerShare:
        orderResult.estimatedCost && orderResult.sharesOrdered
          ? orderResult.estimatedCost / orderResult.sharesOrdered
          : 0,
      executedAt: new Date(),
      success: orderResult.success,
      error: orderResult.error,
    };

    this.reinvestments.push(reinvestment);

    // Update enrollment totals if successful
    if (orderResult.success) {
      enrollment.totalReinvested += dividend.amount;
      enrollment.totalSharesAcquired += reinvestment.sharesAcquired;
      enrollment.lastReinvestedAt = reinvestment.executedAt;
    }

    return reinvestment;
  }

  // ==========================================================================
  // HISTORY
  // ==========================================================================

  /**
   * Get DRIP reinvestment history for a user, optionally filtered by symbol.
   */
  getDripHistory(userId: string, symbol?: string): DripReinvestment[] {
    // Get all enrollment IDs for this user (optionally filtered by symbol)
    const enrollmentIds = new Set<string>();
    for (const enrollment of this.enrollments.values()) {
      if (enrollment.userId !== userId) continue;
      if (symbol && enrollment.symbol !== symbol.toUpperCase()) continue;
      enrollmentIds.add(enrollment.id);
    }

    return this.reinvestments
      .filter((r) => enrollmentIds.has(r.enrollmentId))
      .map((r) => ({ ...r }));
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private findEnrollment(userId: string, symbol: string): DripEnrollment | undefined {
    const upperSymbol = symbol.toUpperCase();
    for (const enrollment of this.enrollments.values()) {
      if (enrollment.userId === userId && enrollment.symbol === upperSymbol) {
        return enrollment;
      }
    }
    return undefined;
  }

  private generateEnrollmentId(): string {
    return `DRIP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateReinvestmentId(): string {
    return `REINV-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class DripError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DripError";
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createDripService(
  fractionalService: FractionalOrderService,
): DripService {
  return new DripService(fractionalService);
}
