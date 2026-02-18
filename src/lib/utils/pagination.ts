/**
 * Pagination Utilities
 *
 * Provides pagination helpers for API responses and database queries
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// PAGINATION UTILITIES
// ============================================================================

export class PaginationUtils {
  /**
   * Parse pagination parameters from query string
   */
  static parseParams(searchParams: URLSearchParams): PaginationMeta {
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get("sort_by") || undefined;
    const sortOrder = (searchParams.get("sort_order") || "desc") as
      | "asc"
      | "desc";

    return {
      page,
      limit,
      offset,
      sortBy,
      sortOrder,
    };
  }

  /**
   * Create paginated response
   */
  static createResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Paginate array in memory
   */
  static paginateArray<T>(
    array: T[],
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    const offset = (page - 1) * limit;
    const data = array.slice(offset, offset + limit);

    return this.createResponse(data, array.length, page, limit);
  }

  /**
   * Get Supabase pagination query
   */
  static getSupabaseRange(
    page: number,
    limit: number,
  ): { from: number; to: number } {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    return { from, to };
  }

  /**
   * Calculate offset for SQL queries
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Validate pagination parameters
   */
  static validateParams(params: PaginationParams): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (params.page !== undefined && params.page < 1) {
      errors.push("Page must be >= 1");
    }

    if (
      params.limit !== undefined &&
      (params.limit < 1 || params.limit > 100)
    ) {
      errors.push("Limit must be between 1 and 100");
    }

    if (params.sortOrder && !["asc", "desc"].includes(params.sortOrder)) {
      errors.push('Sort order must be "asc" or "desc"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get pagination links for API responses
   */
  static getPaginationLinks(
    baseUrl: string,
    page: number,
    limit: number,
    totalPages: number,
  ): {
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  } {
    const createUrl = (p: number) => `${baseUrl}?page=${p}&limit=${limit}`;

    return {
      first: createUrl(1),
      prev: page > 1 ? createUrl(page - 1) : null,
      next: page < totalPages ? createUrl(page + 1) : null,
      last: createUrl(totalPages),
    };
  }

  /**
   * Create cursor-based pagination token
   */
  static createCursor(id: string, timestamp: string): string {
    return Buffer.from(`${id}:${timestamp}`).toString("base64");
  }

  /**
   * Parse cursor-based pagination token
   */
  static parseCursor(cursor: string): { id: string; timestamp: string } | null {
    try {
      const decoded = Buffer.from(cursor, "base64").toString("utf-8");
      const [id, timestamp] = decoded.split(":");
      return { id, timestamp };
    } catch {
      return null;
    }
  }
}

export default PaginationUtils;
