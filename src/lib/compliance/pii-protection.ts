/**
 * PII Protection and Encryption Service
 * 
 * Provides:
 * - PII detection
 * - PII encryption at rest
 * - PII anonymization
 * - Secure data deletion
 * - GDPR/CCPA compliance
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface PIIField {
  type: 'ssn' | 'credit_card' | 'email' | 'phone' | 'address' | 'name' | 'dob' | 'ip_address';
  value: string;
  encrypted?: string;
  hash?: string;
}

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag?: string;
}

export interface AnonymizationOptions {
  method: 'hash' | 'mask' | 'tokenize' | 'remove';
  preserveFormat?: boolean;
}

/**
 * Encryption service
 */
class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  
  /**
   * Get encryption key from environment
   */
  private getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }
    
    // Derive a 256-bit key from the environment variable
    return createHash('sha256').update(key).digest();
  }
  
  /**
   * Encrypt data
   */
  encrypt(data: string): EncryptionResult {
    const key = this.getKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, key, iv) as any;
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }
  
  /**
   * Decrypt data
   */
  decrypt(encrypted: string, iv: string, tag: string): string {
    const key = this.getKey();
    const decipher = createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(iv, 'hex')
    ) as any;
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Hash data (one-way)
   */
  hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Generate secure token
   */
  generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }
}

export const encryption = new EncryptionService();

/**
 * PII patterns (from input-validation.ts)
 */
const PII_PATTERNS = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  dob: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](19|20)\d{2}\b/g,
};

/**
 * Detect PII in text
 */
export function detectPII(text: string): PIIField[] {
  const detected: PIIField[] = [];
  
  // SSN
  const ssnMatches = text.match(PII_PATTERNS.ssn);
  if (ssnMatches) {
    ssnMatches.forEach(value => {
      detected.push({ type: 'ssn', value });
    });
  }
  
  // Credit Card
  const ccMatches = text.match(PII_PATTERNS.creditCard);
  if (ccMatches) {
    ccMatches.forEach(value => {
      detected.push({ type: 'credit_card', value });
    });
  }
  
  // Email
  const emailMatches = text.match(PII_PATTERNS.email);
  if (emailMatches) {
    emailMatches.forEach(value => {
      detected.push({ type: 'email', value });
    });
  }
  
  // Phone
  const phoneMatches = text.match(PII_PATTERNS.phone);
  if (phoneMatches) {
    phoneMatches.forEach(value => {
      detected.push({ type: 'phone', value });
    });
  }
  
  // IP Address
  const ipMatches = text.match(PII_PATTERNS.ipAddress);
  if (ipMatches) {
    ipMatches.forEach(value => {
      detected.push({ type: 'ip_address', value });
    });
  }
  
  // Date of Birth
  const dobMatches = text.match(PII_PATTERNS.dob);
  if (dobMatches) {
    dobMatches.forEach(value => {
      detected.push({ type: 'dob', value });
    });
  }
  
  return detected;
}

/**
 * Anonymize PII
 */
export function anonymizePII(
  text: string,
  options: AnonymizationOptions = { method: 'mask' }
): string {
  let anonymized = text;
  
  switch (options.method) {
    case 'hash':
      // Replace with hash
      anonymized = anonymized.replace(PII_PATTERNS.ssn, (match) => encryption.hash(match).substring(0, 11));
      anonymized = anonymized.replace(PII_PATTERNS.creditCard, (match) => encryption.hash(match).substring(0, 19));
      anonymized = anonymized.replace(PII_PATTERNS.email, (match) => encryption.hash(match).substring(0, match.length));
      anonymized = anonymized.replace(PII_PATTERNS.phone, (match) => encryption.hash(match).substring(0, 14));
      break;
      
    case 'mask':
      // Mask with asterisks
      anonymized = anonymized.replace(PII_PATTERNS.ssn, 'XXX-XX-XXXX');
      anonymized = anonymized.replace(PII_PATTERNS.creditCard, 'XXXX-XXXX-XXXX-XXXX');
      anonymized = anonymized.replace(PII_PATTERNS.email, '[EMAIL REDACTED]');
      anonymized = anonymized.replace(PII_PATTERNS.phone, '[PHONE REDACTED]');
      anonymized = anonymized.replace(PII_PATTERNS.ipAddress, '[IP REDACTED]');
      anonymized = anonymized.replace(PII_PATTERNS.dob, '[DOB REDACTED]');
      break;
      
    case 'tokenize':
      // Replace with tokens
      const tokens = new Map<string, string>();
      anonymized = anonymized.replace(PII_PATTERNS.ssn, (match) => {
        if (!tokens.has(match)) {
          tokens.set(match, `SSN_${encryption.generateToken(8)}`);
        }
        return tokens.get(match)!;
      });
      anonymized = anonymized.replace(PII_PATTERNS.creditCard, (match) => {
        if (!tokens.has(match)) {
          tokens.set(match, `CC_${encryption.generateToken(8)}`);
        }
        return tokens.get(match)!;
      });
      anonymized = anonymized.replace(PII_PATTERNS.email, (match) => {
        if (!tokens.has(match)) {
          tokens.set(match, `EMAIL_${encryption.generateToken(8)}`);
        }
        return tokens.get(match)!;
      });
      break;
      
    case 'remove':
      // Remove completely
      anonymized = anonymized.replace(PII_PATTERNS.ssn, '');
      anonymized = anonymized.replace(PII_PATTERNS.creditCard, '');
      anonymized = anonymized.replace(PII_PATTERNS.email, '');
      anonymized = anonymized.replace(PII_PATTERNS.phone, '');
      anonymized = anonymized.replace(PII_PATTERNS.ipAddress, '');
      anonymized = anonymized.replace(PII_PATTERNS.dob, '');
      break;
  }
  
  return anonymized;
}

/**
 * Encrypt PII fields in an object
 */
export function encryptPIIFields<T extends Record<string, any>>(
  data: T,
  piiFields: (keyof T)[]
): T & { _encrypted: Record<string, EncryptionResult> } {
  const encrypted: Record<string, EncryptionResult> = {};
  const result = { ...data } as any;
  
  for (const field of piiFields) {
    const value = data[field];
    if (value && typeof value === 'string') {
      const encryptionResult = encryption.encrypt(value);
      encrypted[field as string] = encryptionResult;
      result[field] = '[ENCRYPTED]';
    }
  }
  
  result._encrypted = encrypted;
  return result;
}

/**
 * Decrypt PII fields in an object
 */
export function decryptPIIFields<T extends Record<string, any>>(
  data: T & { _encrypted: Record<string, EncryptionResult> },
  piiFields: (keyof T)[]
): T {
  const result = { ...data } as any;
  
  for (const field of piiFields) {
    const encryptionResult = data._encrypted[field as string];
    if (encryptionResult) {
      result[field] = encryption.decrypt(
        encryptionResult.encrypted,
        encryptionResult.iv,
        encryptionResult.tag!
      );
    }
  }
  
  delete result._encrypted;
  return result;
}

/**
 * Secure data deletion (overwrite before delete)
 */
export function secureDelete(data: Record<string, unknown>): void {
  if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (typeof data[key] === 'string') {
        // Overwrite with random data
        (data as Record<string, string>)[key] = encryption.generateToken(data[key].length);
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        secureDelete(data[key] as Record<string, unknown>);
      }
    }
  }
}

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
  autoDelete: boolean;
}

export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  { dataType: 'logs', retentionDays: 90, autoDelete: true },
  { dataType: 'ai_interactions', retentionDays: 365, autoDelete: true },
  { dataType: 'user_data', retentionDays: 1825, autoDelete: false }, // 5 years
  { dataType: 'credit_reports', retentionDays: 730, autoDelete: false }, // 2 years
  { dataType: 'disputes', retentionDays: 1095, autoDelete: false }, // 3 years
];

/**
 * Check if data should be deleted based on retention policy
 */
export function shouldDelete(
  dataType: string,
  createdAt: Date
): boolean {
  const policy = DEFAULT_RETENTION_POLICIES.find(p => p.dataType === dataType);
  if (!policy || !policy.autoDelete) {
    return false;
  }
  
  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays > policy.retentionDays;
}

/**
 * Pseudonymization (replace identifiable data with pseudonyms)
 */
export function pseudonymize(data: Record<string, any>): {
  pseudonymized: Record<string, any>;
  mapping: Record<string, string>;
} {
  const mapping: Record<string, string> = {};
  const pseudonymized = { ...data };
  
  // Pseudonymize common PII fields
  const piiFields = ['name', 'email', 'phone', 'ssn', 'address'];
  
  for (const field of piiFields) {
    if (pseudonymized[field]) {
      const pseudonym = encryption.generateToken(16);
      mapping[field] = pseudonym;
      pseudonymized[field] = pseudonym;
    }
  }
  
  return { pseudonymized, mapping };
}

/**
 * Data minimization (remove unnecessary fields)
 */
export function minimizeData<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): Partial<T> {
  const minimized: Partial<T> = {};
  
  for (const field of requiredFields) {
    if (data[field] !== undefined) {
      minimized[field] = data[field];
    }
  }
  
  return minimized;
}

