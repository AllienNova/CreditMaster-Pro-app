/**
 * Notification Service (Database Version)
 *
 * Handles all notification types with Supabase:
 * - Email notifications (Resend)
 * - In-app notifications (Supabase)
 */

import { Resend } from 'resend';
import { getSupabase } from '../supabase/client';
import type { Database } from '../supabase/types';

// Type helpers for Supabase operations
type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert =
  Database['public']['Tables']['notifications']['Insert'];
type NotificationUpdate =
  Database['public']['Tables']['notifications']['Update'];

// Helper to get typed table reference
const notifications = () => getSupabase().from('notifications');

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build');

export type NotificationType =
  | 'dispute_update'
  | 'payment_success'
  | 'document_uploaded'
  | 'tip';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Notification Service Class with Supabase
 */
class NotificationServiceDB {
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
        from: from || process.env.EMAIL_FROM || 'CPFI <noreply@CPFI-pro.com>',
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
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<Notification> {
    const insertData: NotificationInsert = {
      user_id: userId,
      type,
      title,
      message,
      read: false,
    };

    const { data, error } = await notifications()
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    return this.mapToNotification(data as NotificationRow);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50
  ): Promise<Notification[]> {
    const { data, error } = await notifications()
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch notifications:', error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    return (data || []).map(this.mapToNotification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    const updateData: NotificationUpdate = { read: true };
    const query = notifications();
    // @ts-expect-error - Supabase types issue with update operations
    const { error } = await query.update(updateData).eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const updateData: NotificationUpdate = { read: true };
    const query2 = notifications();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (query2 as any)
      .update(updateData)
      .eq('user_id', userId)
      .eq('read', false)
      .select();

    if (error) {
      console.error('Failed to mark all as read:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const { error } = await notifications().delete().eq('id', notificationId);

    if (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }

    return true;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await notifications()
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }

    return count || 0;
  }

  // Email templates

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = 'Welcome to CPFI!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Welcome to CPFI!</h1>
        <p>Hi ${name},</p>
        <p>We're excited to have you on board! CPFI uses advanced AI to help you repair your credit and achieve your financial goals.</p>
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
  async notifyDisputeCreated(
    userId: string,
    userEmail: string,
    disputeId: string,
    bureau: string
  ): Promise<void> {
    // In-app notification
    await this.createNotification(
      userId,
      'dispute_update',
      'Dispute Letter Created',
      `Your dispute letter for ${bureau} has been created and is ready to send.`
    );

    // Email notification
    const subject = 'Your Dispute Letter is Ready';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Dispute Letter Created</h1>
        <p>Your professional dispute letter for <strong>${bureau}</strong> has been generated and is ready to send.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/disputes/${disputeId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dispute
          </a>
        </p>
      </div>
    `;

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send payment success notification
   */
  async notifyPaymentSuccess(
    userId: string,
    userEmail: string,
    amount: number,
    planName: string
  ): Promise<void> {
    // In-app notification
    await this.createNotification(
      userId,
      'payment_success',
      'Payment Successful',
      `Your payment of $${amount} for the ${planName} plan was successful.`
    );

    // Email notification
    const subject = 'Payment Received - Thank You!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Payment Successful</h1>
        <p>Thank you for your payment!</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Amount:</strong> $${amount}</p>
        </div>
        <p>Your subscription is now active. You have full access to all features.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </p>
      </div>
    `;

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send document uploaded notification
   */
  async notifyDocumentUploaded(
    userId: string,
    fileName: string,
    documentType: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'document_uploaded',
      'Document Uploaded',
      `${fileName} (${documentType}) has been successfully uploaded.`
    );
  }

  /**
   * Map database row to Notification interface
   */
  private mapToNotification(
    row: Database['public']['Tables']['notifications']['Row']
  ): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      read: row.read,
      createdAt: new Date(row.created_at),
    };
  }
}

// Export singleton instance
export const notificationServiceDB = new NotificationServiceDB();
export default notificationServiceDB;
