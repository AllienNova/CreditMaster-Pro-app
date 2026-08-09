/**
 * Tenant Budget Manager
 *
 * Per-tenant risk budgets that sum to <= platform ceiling (1.0 = 100%).
 * Each tenant is allocated a fraction of the total platform risk capacity.
 * Utilization is tracked in-memory per tenant.
 */

export interface TenantBudget {
  tenantId: string;
  allocatedPct: number;
  utilizedPct: number;
  remainingPct: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

const PLATFORM_CEILING = 1.0;

class TenantBudgetManager {
  private allocations = new Map<string, number>();
  private utilizations = new Map<string, number>();

  allocateBudget(tenantId: string, budgetPct: number): void {
    if (budgetPct < 0 || budgetPct > 1) {
      throw new Error(
        `budgetPct must be in [0, 1], got ${budgetPct}`,
      );
    }

    const currentAllocation = this.allocations.get(tenantId) ?? 0;
    const totalWithout = this.getTotalAllocated() - currentAllocation;

    if (totalWithout + budgetPct > PLATFORM_CEILING) {
      throw new Error(
        `Allocation would exceed platform ceiling: ` +
        `existing ${totalWithout} + requested ${budgetPct} = ${totalWithout + budgetPct} > ${PLATFORM_CEILING}`,
      );
    }

    this.allocations.set(tenantId, budgetPct);
    if (!this.utilizations.has(tenantId)) {
      this.utilizations.set(tenantId, 0);
    }
  }

  getBudget(tenantId: string): TenantBudget {
    const allocatedPct = this.allocations.get(tenantId);
    if (allocatedPct === undefined) {
      throw new Error(`No budget allocated for tenant ${tenantId}`);
    }

    const utilizedPct = this.utilizations.get(tenantId) ?? 0;
    return {
      tenantId,
      allocatedPct,
      utilizedPct,
      remainingPct: allocatedPct - utilizedPct,
    };
  }

  checkBudget(
    tenantId: string,
    requestedRiskPct: number,
  ): BudgetCheckResult {
    const allocatedPct = this.allocations.get(tenantId);
    if (allocatedPct === undefined) {
      return {
        allowed: false,
        remaining: 0,
        reason: `No budget allocated for tenant ${tenantId}`,
      };
    }

    const utilizedPct = this.utilizations.get(tenantId) ?? 0;
    const remaining = allocatedPct - utilizedPct;

    if (requestedRiskPct > remaining) {
      return {
        allowed: false,
        remaining,
        reason:
          `Requested ${requestedRiskPct} exceeds remaining budget ${remaining} ` +
          `(allocated: ${allocatedPct}, utilized: ${utilizedPct})`,
      };
    }

    return { allowed: true, remaining: remaining - requestedRiskPct };
  }

  recordUtilization(tenantId: string, riskPct: number): void {
    const allocatedPct = this.allocations.get(tenantId);
    if (allocatedPct === undefined) {
      throw new Error(`No budget allocated for tenant ${tenantId}`);
    }

    const current = this.utilizations.get(tenantId) ?? 0;
    const next = current + riskPct;
    if (next > allocatedPct) {
      throw new Error(
        `Utilization ${next} would exceed allocation ${allocatedPct} for tenant ${tenantId}`,
      );
    }
    this.utilizations.set(tenantId, next);
  }

  getTotalAllocated(): number {
    let total = 0;
    for (const pct of this.allocations.values()) {
      total += pct;
    }
    return total;
  }

  reset(): void {
    this.allocations.clear();
    this.utilizations.clear();
  }
}

export const tenantBudgetManager = new TenantBudgetManager();
export { TenantBudgetManager };
