/**
 * Notification Service
 * 
 * Handles all notification types:
 * - Email notifications
 * - In-app notifications
 * - SMS notifications (future)
 * - Push notifications (future)
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build');

type NotificationPayload = Record<string, unknown>;

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
  | 'document_shared'
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
  data?: NotificationPayload;
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
  private notifications: Map<string, Notification[]> = new Map();
  
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
        from: from || process.env.EMAIL_FROM || 'CreditMaster Pro <noreply@creditmaster-pro.com>',
        to,
        subject,
        html,
      });
      
      console.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error('Failed to send email:', error);
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
    data?: NotificationPayload
  ): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    const notification = notifications.find(n => n.id === notificationId);
    
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
    
    notifications.forEach(n => {
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
    const index = notifications.findIndex(n => n.id === notificationId);
    
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
    return notifications.filter(n => !n.read).length;
  }
  
  // Email templates
  
  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = 'Welcome to CreditMaster Pro! 🎉';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Welcome to CreditMaster Pro!</h1>
        <p>Hi ${name},</p>
        <p>We're excited to have you on board! CreditMaster Pro uses advanced AI to help you repair your credit and achieve your financial goals.</p>
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
    const subject = 'Dispute Created Successfully ✅';
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
      removed: 'The negative item has been removed from your credit report! 🎉',
      updated: 'The item has been updated with corrected information.',
      verified: 'The bureau verified the item as accurate.',
    };
    
    const subject = outcome === 'removed' 
      ? 'Great News! Dispute Resolved - Item Removed 🎉'
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
      ? `Your Credit Score Increased by ${change} Points! 📈`
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
        ${isIncrease ? '<p>Keep up the great work! Your credit repair efforts are paying off.</p>' : '<p>Don\'t worry, we\'re here to help you improve your score.</p>'}
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
    const subject = 'Payment Received - Thank You! 💳';
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
    const subject = 'Payment Failed - Action Required ⚠️';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #EF4444;">Payment Failed</h1>
        <p>We were unable to process your payment.</p>
        <div style="background-color: #FEE2E2; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Please update your payment method to continue using CreditMaster Pro.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Payment Method
          </a>
        </p>
      </div>
    `;
    
    await this.sendEmail(to, subject, html);
  }

  async notifyDocumentShareLink(params: {
    ownerUserId: string;
    ownerEmail?: string | null;
    documentName: string;
    recipients: string[];
    shareUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    this.createNotification(
      params.ownerUserId,
      'document_shared',
      'Secure link created',
      `You shared "${params.documentName}" with ${params.recipients.join(', ')}`,
      {
        documentName: params.documentName,
        recipients: params.recipients,
        shareUrl: params.shareUrl,
        expiresAt: params.expiresAt,
      }
    );

    const renderShareHtml = (audience: 'owner' | 'recipient', recipientList?: string[]) => `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h1 style="color:#4F46E5;">Secure document ${audience === 'owner' ? 'shared' : 'received'}</h1>
        <p>${audience === 'owner'
          ? `You shared <strong>${params.documentName}</strong> with ${recipientList?.join(', ')}.`
          : `You now have access to <strong>${params.documentName}</strong>.`}
        </p>
        <p>The link expires on <strong>${params.expiresAt.toLocaleString()}</strong>.</p>
        <p style="margin-top: 24px;">
          <a href="${params.shareUrl}" style="background-color:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
            Open secure link
          </a>
        </p>
      </div>
    `;

    const sendPromises: Promise<void>[] = [];
    if (params.ownerEmail) {
      sendPromises.push(
        this.sendEmail(
          params.ownerEmail,
          `Document shared: ${params.documentName}`,
          renderShareHtml('owner', params.recipients)
        )
      );
    }

    params.recipients.forEach((recipient) => {
      sendPromises.push(
        this.sendEmail(
          recipient,
          `Secure document: ${params.documentName}`,
          renderShareHtml('recipient')
        )
      );
    });

    if (sendPromises.length > 0) {
      await Promise.allSettled(sendPromises);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;

