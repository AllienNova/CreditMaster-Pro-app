/**
 * Tenant Isolation
 *
 * Data namespace isolation per tenant_id using AsyncLocalStorage
 * for request-scoped context in Node.js.
 */

import { AsyncLocalStorage } from "node:async_hooks";

interface TenantStore {
  tenantId: string;
}

const tenantStorage = new AsyncLocalStorage<TenantStore>();

class TenantContext {
  /**
   * Run a callback within a tenant-scoped context.
   * All calls to getTenantId() inside the callback will return this tenantId.
   */
  run<T>(tenantId: string, fn: () => T): T {
    return tenantStorage.run({ tenantId }, fn);
  }

  /**
   * Set the current tenant context (must be inside a run() callback).
   * Replaces the tenantId for the current async context.
   */
  setTenant(tenantId: string): void {
    const store = tenantStorage.getStore();
    if (!store) {
      throw new Error(
        "No tenant context active. Wrap calls in TenantContext.run().",
      );
    }
    store.tenantId = tenantId;
  }

  /**
   * Get the current tenant ID from the async-local context.
   */
  getTenantId(): string {
    const store = tenantStorage.getStore();
    if (!store) {
      throw new Error(
        "No tenant context active. Wrap calls in TenantContext.run().",
      );
    }
    return store.tenantId;
  }

  /**
   * Add tenant_id filter to a query string and params.
   * Appends `AND tenant_id = :tenant_id` to the query and
   * injects the tenant_id param.
   */
  scopeQuery<T extends Record<string, unknown>>(
    query: string,
    params: T,
  ): { query: string; params: T & { tenant_id: string } } {
    const tenantId = this.getTenantId();
    const scopedQuery = query.includes("WHERE")
      ? `${query} AND tenant_id = :tenant_id`
      : `${query} WHERE tenant_id = :tenant_id`;

    return {
      query: scopedQuery,
      params: { ...params, tenant_id: tenantId },
    };
  }

  /**
   * Validate that the current tenant has access to a resource.
   * Returns true only if the resource belongs to the current tenant.
   */
  validateTenantAccess(
    tenantId: string,
    resourceTenantId: string,
  ): boolean {
    return tenantId === resourceTenantId;
  }
}

export const tenantContext = new TenantContext();
export { TenantContext };
