/**
 * Input Sanitization
 * Prevents XSS, SQL injection, and other injection attacks
 */

// HTML entity encoding for XSS prevention
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char]);
}

// Remove potentially dangerous characters from strings
export function sanitizeString(input: string, options?: {
  maxLength?: number;
  allowNewlines?: boolean;
  allowHtml?: boolean;
}): string {
  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines if allowed
  if (options?.allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }

  // Escape HTML unless explicitly allowed
  if (!options?.allowHtml) {
    sanitized = escapeHtml(sanitized);
  }

  // Enforce max length
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

// Sanitize email addresses
export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional checks for suspicious patterns
  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.includes('.@')) {
    return null;
  }

  return trimmed;
}

// Sanitize phone numbers (US format)
export function sanitizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return digits;
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }

  return null;
}

// Sanitize SSN
export function sanitizeSSN(ssn: string): string | null {
  const digits = ssn.replace(/\D/g, '');
  
  if (digits.length !== 9) {
    return null;
  }

  // Check for invalid patterns
  if (digits.startsWith('000') || digits.startsWith('666') || digits.startsWith('9')) {
    return null;
  }

  return digits;
}

// Sanitize numeric input
export function sanitizeNumber(input: string | number, options?: {
  min?: number;
  max?: number;
  decimals?: number;
}): number | null {
  const num = typeof input === 'string' ? parseFloat(input.replace(/[^0-9.-]/g, '')) : input;

  if (isNaN(num)) return null;
  if (options?.min !== undefined && num < options.min) return null;
  if (options?.max !== undefined && num > options.max) return null;

  if (options?.decimals !== undefined) {
    return Math.round(num * Math.pow(10, options.decimals)) / Math.pow(10, options.decimals);
  }

  return num;
}

// Sanitize URL
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    // Prevent javascript: URLs that might bypass protocol check
    if (url.toLowerCase().includes('javascript:')) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

// Sanitize object recursively
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

