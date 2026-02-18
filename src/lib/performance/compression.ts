/**
 * Response Compression Utilities
 * Optimizes payload sizes for faster delivery
 */

// Check if client accepts compression
export function acceptsCompression(request: Request): "gzip" | "br" | null {
  const acceptEncoding = request.headers.get("accept-encoding") || "";

  if (acceptEncoding.includes("br")) {
    return "br"; // Brotli (best compression)
  }

  if (acceptEncoding.includes("gzip")) {
    return "gzip";
  }

  return null;
}

// Minify JSON response by removing unnecessary whitespace
export function minifyJson(obj: unknown): string {
  return JSON.stringify(obj);
}

// Estimate compressed size (rough approximation)
export function estimateCompressedSize(data: string): number {
  // Typical text compresses to about 30% of original size with gzip
  return Math.round(data.length * 0.3);
}

// Strip null and undefined values from objects
export function stripNullValues<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      if (typeof value === "object" && !Array.isArray(value)) {
        result[key as keyof T] = stripNullValues(
          value as Record<string, unknown>,
        ) as T[keyof T];
      } else {
        result[key as keyof T] = value as T[keyof T];
      }
    }
  }

  return result;
}

// Truncate long strings in objects (useful for logging)
export function truncateStrings<T extends Record<string, unknown>>(
  obj: T,
  maxLength: number = 100,
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.length > maxLength) {
      result[key] = value.substring(0, maxLength) + "...";
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      result[key] = truncateStrings(
        value as Record<string, unknown>,
        maxLength,
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

// Paginate array results
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function paginate<T>(
  items: T[],
  page: number = 1,
  limit: number = 20,
): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = items.slice(offset, offset + limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Create ETag from content
export function createETag(content: string): string {
  // Simple hash for ETag
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

// Check if content hasn't changed (304 Not Modified)
export function checkETag(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  return ifNoneMatch === etag;
}

// Set caching headers
export function getCacheHeaders(options: {
  maxAge?: number;
  private?: boolean;
  revalidate?: boolean;
  etag?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {};

  const directives: string[] = [];

  if (options.private) {
    directives.push("private");
  } else {
    directives.push("public");
  }

  if (options.maxAge !== undefined) {
    directives.push(`max-age=${options.maxAge}`);
  }

  if (options.revalidate) {
    directives.push("must-revalidate");
  }

  headers["Cache-Control"] = directives.join(", ");

  if (options.etag) {
    headers["ETag"] = options.etag;
  }

  return headers;
}
