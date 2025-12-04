/**
 * Email Unsubscribe Token Utility
 * 
 * Generates and verifies unsubscribe tokens for CAN-SPAM compliance
 */

import crypto from 'crypto';

const SECRET = process.env.EMAIL_UNSUBSCRIBE_SECRET || 'default-secret';

/**
 * Generate unsubscribe token for a user
 */
export function generateUnsubscribeToken(userId: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(userId)
    .digest('hex');
}

/**
 * Verify unsubscribe token
 */
export function verifyUnsubscribeToken(token: string, userId: string): boolean {
  const expectedToken = generateUnsubscribeToken(userId);
  return token === expectedToken;
}

/**
 * Generate full unsubscribe URL
 */
export function generateUnsubscribeUrl(
  userId: string, 
  type: 'marketing' | 'disputes' | 'scores' | 'payments' | 'all' = 'all'
): string {
  const token = generateUnsubscribeToken(userId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://creditmaster.pro';
  return `${baseUrl}/api/email/unsubscribe?token=${token}&user=${userId}&type=${type}`;
}

