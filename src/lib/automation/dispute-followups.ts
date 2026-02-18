/**
 * Automated Dispute Follow-up Service
 *
 * Sends scheduled reminder emails for dispute status updates
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Follow-up schedule (days after dispute submission)
const FOLLOWUP_SCHEDULE = [
  { days: 7, type: "first_reminder" },
  { days: 14, type: "second_reminder" },
  { days: 21, type: "third_reminder" },
  { days: 30, type: "final_reminder" },
  { days: 45, type: "escalation_notice" },
];

interface Dispute {
  id: string;
  user_id: string;
  status: string;
  bureau: string;
  item_type: string;
  created_at: string;
  last_followup_at?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

/**
 * Process all pending follow-ups
 */
export async function processFollowups(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const stats = { processed: 0, sent: 0, errors: 0 };

  // Get disputes that need follow-up
  const disputes = await getDisputesNeedingFollowup();

  for (const dispute of disputes) {
    stats.processed++;

    try {
      const user = await getUser(dispute.user_id);
      if (!user) continue;

      const followupType = determineFollowupType(dispute);
      if (!followupType) continue;

      await sendFollowupEmail(user, dispute, followupType);
      await updateLastFollowup(dispute.id);

      stats.sent++;
    } catch (_error) {
      // DisputeFollowups error: Follow-up error for dispute
      void _error;
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Get disputes that need follow-up emails
 */
async function getDisputesNeedingFollowup(): Promise<Dispute[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .in("status", ["pending", "submitted", "in_review"])
    .order("created_at", { ascending: true });

  if (error) {
    // DisputeFollowups error: Error fetching disputes
    return [];
  }

  return data || [];
}

/**
 * Determine which follow-up type to send
 */
function determineFollowupType(dispute: Dispute): string | null {
  const createdAt = new Date(dispute.created_at);
  const lastFollowup = dispute.last_followup_at
    ? new Date(dispute.last_followup_at)
    : null;
  const now = new Date();

  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Find the appropriate follow-up based on days
  for (const schedule of FOLLOWUP_SCHEDULE) {
    if (daysSinceCreation >= schedule.days) {
      // Check if we already sent this type
      if (lastFollowup) {
        const daysSinceLastFollowup = Math.floor(
          (now.getTime() - lastFollowup.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceLastFollowup < 7) continue; // Don't send more than once per week
      }
      return schedule.type;
    }
  }

  return null;
}

/**
 * Get user by ID
 */
async function getUser(userId: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Send follow-up email
 */
async function sendFollowupEmail(
  user: User,
  dispute: Dispute,
  followupType: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const resend = getResendClient();
  const subject = getEmailSubject(followupType);
  const body = getEmailBody(user, dispute, followupType);

  await resend.emails.send({
    from: "Fynvita <noreply@fynvita.com>",
    to: user.email,
    subject,
    html: body,
  });

  // Log the follow-up
  await supabase.from("email_logs").insert({
    user_id: user.id,
    dispute_id: dispute.id,
    email_type: `dispute_followup_${followupType}`,
    sent_at: new Date().toISOString(),
  });
}

/**
 * Update last follow-up timestamp
 */
async function updateLastFollowup(disputeId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from("disputes")
    .update({ last_followup_at: new Date().toISOString() })
    .eq("id", disputeId);
}

function getEmailSubject(type: string): string {
  const subjects: Record<string, string> = {
    first_reminder: "Dispute Update: 1 Week Status Check",
    second_reminder: "Dispute Update: 2 Week Progress Report",
    third_reminder: "Dispute Update: 3 Week Status - Action May Be Needed",
    final_reminder: "Dispute Update: 30 Day Review Required",
    escalation_notice: "Important: Dispute Escalation Notice",
  };
  return subjects[type] || "Dispute Status Update";
}

function getEmailBody(user: User, dispute: Dispute, type: string): string {
  return `
    <h2>Hello ${user.full_name},</h2>
    <p>This is an update regarding your ${dispute.bureau} dispute for ${dispute.item_type}.</p>
    <p>Current Status: <strong>${dispute.status}</strong></p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/disputes/${dispute.id}">View Dispute Details</a></p>
    <p>If you have any questions, please contact our support team.</p>
  `;
}
