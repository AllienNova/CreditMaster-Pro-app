/**
 * Security Notifications Service
 * 
 * Sends email notifications for security events:
 * - New login from new device
 * - Password changed
 * - Two-factor authentication enabled/disabled
 * - Account recovery initiated
 * - Suspicious activity detected
 */

import { notificationService } from '@/lib/notifications/notification-service';

export interface SecurityEvent {
  type: 'new_login' | 'password_changed' | '2fa_enabled' | '2fa_disabled' | 'account_recovery' | 'suspicious_activity';
  userId: string;
  userEmail: string;
  userName: string;
  metadata?: {
    deviceName?: string;
    browser?: string;
    os?: string;
    ipAddress?: string;
    location?: string;
    timestamp?: Date;
  };
}

class SecurityNotificationsService {
  /**
   * Send new login notification
   */
  async sendNewLoginNotification(event: SecurityEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const { metadata } = event;
      const deviceInfo = metadata?.deviceName || `${metadata?.browser} on ${metadata?.os}`;
      const location = metadata?.location || 'Unknown location';
      const timestamp = metadata?.timestamp || new Date();

      const subject = '🔐 New Login to Your CreditMaster Pro Account';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .info-item { margin: 10px 0; }
            .info-label { font-weight: bold; color: #667eea; }
            .warning { background: #fef3c7; border-left-color: #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 New Login Detected</h1>
            </div>
            <div class="content">
              <p>Hi ${event.userName},</p>
              <p>We detected a new login to your CreditMaster Pro account.</p>
              
              <div class="info-box">
                <div class="info-item">
                  <span class="info-label">Device:</span> ${deviceInfo}
                </div>
                <div class="info-item">
                  <span class="info-label">Location:</span> ${location}
                </div>
                <div class="info-item">
                  <span class="info-label">IP Address:</span> ${metadata?.ipAddress || 'Unknown'}
                </div>
                <div class="info-item">
                  <span class="info-label">Time:</span> ${timestamp.toLocaleString()}
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Was this you?</strong>
                <p>If you recognize this activity, you can safely ignore this email.</p>
                <p>If you don't recognize this login, please secure your account immediately:</p>
                <ul>
                  <li>Change your password</li>
                  <li>Enable two-factor authentication</li>
                  <li>Review your active sessions</li>
                </ul>
              </div>

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/security" class="button">
                Review Security Settings
              </a>

              <div class="footer">
                <p>This is an automated security notification from CreditMaster Pro.</p>
                <p>If you have any concerns, please contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await notificationService.sendEmail(event.userEmail, subject, html);

      return { success: true };
    } catch (error) {
      console.error('Send new login notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      };
    }
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedNotification(event: SecurityEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = '🔑 Your CreditMaster Pro Password Was Changed';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Password Changed</h1>
            </div>
            <div class="content">
              <p>Hi ${event.userName},</p>
              
              <div class="success-box">
                <strong>✓ Your password was successfully changed</strong>
                <p>Time: ${new Date().toLocaleString()}</p>
              </div>

              <div class="warning">
                <strong>⚠️ Didn't change your password?</strong>
                <p>If you didn't make this change, your account may be compromised. Take action immediately:</p>
                <ul>
                  <li>Reset your password using the "Forgot Password" link</li>
                  <li>Enable two-factor authentication</li>
                  <li>Review your active sessions and revoke suspicious ones</li>
                  <li>Contact our support team</li>
                </ul>
              </div>

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/security" class="button">
                Review Security Settings
              </a>

              <div class="footer">
                <p>This is an automated security notification from CreditMaster Pro.</p>
                <p>If you have any concerns, please contact our support team immediately.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await notificationService.sendEmail(event.userEmail, subject, html);

      return { success: true };
    } catch (error) {
      console.error('Send password changed notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      };
    }
  }

  /**
   * Send 2FA enabled notification
   */
  async send2FAEnabledNotification(event: SecurityEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = '🔒 Two-Factor Authentication Enabled';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 2FA Enabled</h1>
            </div>
            <div class="content">
              <p>Hi ${event.userName},</p>
              
              <div class="success-box">
                <strong>✓ Two-factor authentication has been enabled on your account</strong>
                <p>Your account is now more secure!</p>
              </div>

              <div class="info-box">
                <strong>What this means:</strong>
                <ul>
                  <li>You'll need your password AND a 6-digit code to log in</li>
                  <li>The code comes from your authenticator app</li>
                  <li>This protects your account even if your password is compromised</li>
                </ul>
              </div>

              <p><strong>Important:</strong> Make sure you have access to your authenticator app. If you lose access, you may not be able to log in.</p>

              <div class="footer">
                <p>This is an automated security notification from CreditMaster Pro.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await notificationService.sendEmail(event.userEmail, subject, html);

      return { success: true };
    } catch (error) {
      console.error('Send 2FA enabled notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      };
    }
  }

  /**
   * Send 2FA disabled notification
   */
  async send2FADisabledNotification(event: SecurityEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = '⚠️ Two-Factor Authentication Disabled';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ 2FA Disabled</h1>
            </div>
            <div class="content">
              <p>Hi ${event.userName},</p>
              
              <div class="warning">
                <strong>⚠️ Two-factor authentication has been disabled on your account</strong>
                <p>Your account is now less secure. We strongly recommend re-enabling 2FA.</p>
              </div>

              <p>If you didn't make this change, your account may be compromised. Take action immediately:</p>
              <ul>
                <li>Change your password</li>
                <li>Re-enable two-factor authentication</li>
                <li>Review your active sessions</li>
                <li>Contact our support team</li>
              </ul>

              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/security" class="button">
                Re-enable 2FA
              </a>

              <div class="footer">
                <p>This is an automated security notification from CreditMaster Pro.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await notificationService.sendEmail(event.userEmail, subject, html);

      return { success: true };
    } catch (error) {
      console.error('Send 2FA disabled notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      };
    }
  }

  /**
   * Send notification for any security event
   */
  async sendSecurityNotification(event: SecurityEvent): Promise<{ success: boolean; error?: string }> {
    switch (event.type) {
      case 'new_login':
        return this.sendNewLoginNotification(event);
      case 'password_changed':
        return this.sendPasswordChangedNotification(event);
      case '2fa_enabled':
        return this.send2FAEnabledNotification(event);
      case '2fa_disabled':
        return this.send2FADisabledNotification(event);
      default:
        return {
          success: false,
          error: 'Unknown security event type',
        };
    }
  }
}

// Export singleton instance
export const securityNotifications = new SecurityNotificationsService();
export default securityNotifications;

