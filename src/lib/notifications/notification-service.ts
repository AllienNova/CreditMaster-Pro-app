/**
 * Notification Service
 *
 * Handles all notification types:
 * - Email notifications
 * - In-app notifications
 * - Web Push notifications
 * - SMS notifications (future)
 */

import { Resend } from 'resend';
import { webPushService, type PushNotificationPayload } from './web-push-service';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build');

export type NotificationType =
  | 'dispute_created'
  | 'dispute_updated'
  | 'dispute_resolved'
  | 'credit_score_changed'
  | 'payment_successful'
  | 'payment_failed'
  | 'subscription_renewed'
  | 'subscription_canceled'
  | 'document_uploaded'
  | 'welcome'
  | 'password_reset';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Notification Service Class
 */
class NotificationService {
  private readonly notifications: Map<string, Notification[]> = new Map();

  /**
   * Send email notification
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    from?: string
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: from || process.env.EMAIL_FROM || 'Fynvita <noreply@fynvita.com>',
        to,
        subject,
        html,
      });

      // Email sent successfully
    } catch (error) {
      // Email send failed - rethrowing
      throw error;
    }
  }

  /**
   * Create in-app notification
   */
  createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      data,
    };

    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.unshift(notification);
    this.notifications.set(userId, userNotifications);

    return notification;
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId: string, limit: number = 50): Notification[] {
    const notifications = this.notifications.get(userId) || [];
    return notifications.slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId) || [];
    const notification = notifications.find((n) => n.id === notificationId);

    if (notification) {
      notification.read = true;
      return true;
    }

    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): number {
    const notifications = this.notifications.get(userId) || [];
    let count = 0;

    notifications.forEach((n) => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });

    return count;
  }

  /**
   * Delete notification
   */
  deleteNotification(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId) || [];
    const index = notifications.findIndex((n) => n.id === notificationId);

    if (index !== -1) {
      notifications.splice(index, 1);
      this.notifications.set(userId, notifications);
      return true;
    }

    return false;
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    const notifications = this.notifications.get(userId) || [];
    return notifications.filter((n) => !n.read).length;
  }

  // Email templates

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = 'Welcome to Fynvita! ';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Welcome to Fynvita!</h1>
        <p>Hi ${name},</p>
        <p>We're excited to have you on board! Fynvita uses advanced AI to help you repair your credit and achieve your financial goals.</p>
        <h2>Get Started:</h2>
        <ol>
          <li>Upload your credit report</li>
          <li>Let our AI analyze your credit</li>
          <li>Generate dispute letters automatically</li>
          <li>Track your progress in real-time</li>
        </ol>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </p>
        <p style="margin-top: 30px; color: #666;">
          Need help? Reply to this email or visit our support center.
        </p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send dispute created notification
   */
  async sendDisputeCreatedEmail(
    to: string,
    disputeId: string,
    itemDescription: string
  ): Promise<void> {
    const subject = 'Dispute Created Successfully ';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Dispute Created</h1>
        <p>Your dispute has been created and sent to the credit bureau.</p>
        <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Dispute ID:</strong> ${disputeId}</p>
          <p><strong>Item:</strong> ${itemDescription}</p>
          <p><strong>Status:</strong> Sent to Bureau</p>
        </div>
        <p>We'll notify you when there's an update on your dispute.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/disputes/${disputeId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dispute
          </a>
        </p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send dispute resolved notification
   */
  async sendDisputeResolvedEmail(
    to: string,
    disputeId: string,
    itemDescription: string,
    outcome: 'removed' | 'updated' | 'verified'
  ): Promise<void> {
    const outcomeText = {
      removed: 'The negative item has been removed from your credit report! ',
      updated: 'The item has been updated with corrected information.',
      verified: 'The bureau verified the item as accurate.',
    };

    const subject =
      outcome === 'removed'
        ? 'Great News! Dispute Resolved - Item Removed '
        : 'Dispute Resolved';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${outcome === 'removed' ? '#10B981' : '#4F46E5'};">Dispute Resolved</h1>
        <p>${outcomeText[outcome]}</p>
        <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Dispute ID:</strong> ${disputeId}</p>
          <p><strong>Item:</strong> ${itemDescription}</p>
          <p><strong>Outcome:</strong> ${outcome.charAt(0).toUpperCase() + outcome.slice(1)}</p>
        </div>
        ${outcome === 'removed' ? '<p>This should positively impact your credit score!</p>' : ''}
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/disputes/${disputeId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Details
          </a>
        </p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send credit score changed notification
   */
  async sendCreditScoreChangedEmail(
    to: string,
    oldScore: number,
    newScore: number
  ): Promise<void> {
    const change = newScore - oldScore;
    const isIncrease = change > 0;

    const subject = isIncrease
      ? `Your Credit Score Increased by ${change} Points! `
      : `Credit Score Update`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${isIncrease ? '#10B981' : '#EF4444'};">Credit Score Update</h1>
        <p>Your credit score has ${isIncrease ? 'increased' : 'changed'}!</p>
        <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="font-size: 48px; font-weight: bold; margin: 0; color: ${isIncrease ? '#10B981' : '#EF4444'};">
            ${newScore}
          </p>
          <p style="color: #666; margin-top: 8px;">
            ${isIncrease ? '+' : ''}${change} points
          </p>
        </div>
        ${isIncrease ? '<p>Keep up the great work! Your credit repair efforts are paying off.</p>' : "<p>Don't worry, we're here to help you improve your score.</p>"}
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send payment successful notification
   */
  async sendPaymentSuccessfulEmail(
    to: string,
    amount: number,
    invoiceId: string
  ): Promise<void> {
    const subject = 'Payment Received - Thank You! ';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10B981;">Payment Successful</h1>
        <p>Thank you for your payment!</p>
        <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Invoice ID:</strong> ${invoiceId}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Your subscription is now active and you have full access to all features.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Billing
          </a>
        </p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedEmail(
    to: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const subject = 'Payment Failed - Action Required ';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #EF4444;">Payment Failed</h1>
        <p>We were unable to process your payment.</p>
        <div style="background-color: #FEE2E2; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Please update your payment method to continue using Fynvita.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Payment Method
          </a>
        </p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  // ==========================================================================
  // WEB PUSH NOTIFICATIONS
  // ==========================================================================

  /**
   * Send web push notification to a user
   * Requires user's push subscriptions to be registered
   */
  async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<{ sent: number; failed: number }> {
    try {
      // Fetch user's push subscriptions from API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/notifications/push/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, notification: payload }),
        }
      );

      if (!response.ok) {
        // Push notification failed
        return { sent: 0, failed: 1 };
      }

      const result = await response.json();
      return { sent: result.sent || 0, failed: result.failed || 0 };
    } catch (error) {
      // Push notification error - caught
      return { sent: 0, failed: 1 };
    }
  }

  /**
   * Send credit score change push notification
   */
  async sendCreditScorePush(
    userId: string,
    oldScore: number,
    newScore: number,
    bureau?: string
  ): Promise<void> {
    const payload = webPushService.createCreditScoreNotification(
      oldScore,
      newScore,
      bureau
    );
    await this.sendPushNotification(userId, payload);
  }

  /**
   * Send dispute update push notification
   */
  async sendDisputeUpdatePush(
    userId: string,
    disputeId: string,
    status: string,
    itemDescription: string
  ): Promise<void> {
    const payload = webPushService.createDisputeNotification(
      disputeId,
      status,
      itemDescription
    );
    await this.sendPushNotification(userId, payload);
  }

  /**
   * Send payment reminder push notification
   */
  async sendPaymentReminderPush(
    userId: string,
    amount: number,
    dueDate: string,
    billName?: string
  ): Promise<void> {
    const payload = webPushService.createPaymentReminderNotification(
      amount,
      dueDate,
      billName
    );
    await this.sendPushNotification(userId, payload);
  }

  /**
   * Send security alert push notification
   */
  async sendSecurityAlertPush(
    userId: string,
    alertType: string,
    description: string
  ): Promise<void> {
    const payload = webPushService.createSecurityAlertNotification(
      alertType,
      description
    );
    await this.sendPushNotification(userId, payload);
  }

  /**
   * Send general push notification
   */
  async sendGeneralPush(
    userId: string,
    title: string,
    body: string,
    url?: string
  ): Promise<void> {
    const payload = webPushService.createGeneralNotification(title, body, url);
    await this.sendPushNotification(userId, payload);
  }

  /**
   * Send payment success email (webhook version with customer name)
   */
  async sendPaymentSuccessEmail(
    to: string,
    customerName: string,
    amount: number,
    invoiceId: string
  ): Promise<void> {
    const subject = 'Payment Received - Thank You! ';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10B981;">Payment Successful</h1>
        <p>Hi ${customerName},</p>
        <p>Thank you for your payment!</p>
        <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Invoice ID:</strong> ${invoiceId}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Your subscription is now active and you have full access to all Fynvita features.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/billing" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Billing
          </a>
        </p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Notify recipients about a document share link
   */
  async notifyDocumentShareLink(params: {
    ownerUserId: string;
    ownerEmail?: string;
    documentName: string;
    recipients: string[];
    shareUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    const { ownerEmail, documentName, recipients, shareUrl, expiresAt } =
      params;
    const senderName = ownerEmail || 'A Fynvita user';

    for (const recipient of recipients) {
      const subject = `${senderName} shared a document with you`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Document Shared With You</h1>
          <p>${senderName} has shared a document with you.</p>
          <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Document:</strong> ${documentName}</p>
            <p><strong>Expires:</strong> ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}</p>
          </div>
          <p style="margin-top: 30px;">
            <a href="${shareUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Document
            </a>
          </p>
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            This link will expire on ${expiresAt.toLocaleDateString()}.
          </p>
        </div>
      `;

      try {
        await this.sendEmail(recipient, subject, html);
      } catch {
        // Failed to send share notification - continue with others
      }
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
