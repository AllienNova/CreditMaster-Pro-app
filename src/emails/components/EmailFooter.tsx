/**
 * Shared email footer.
 *
 * Single source of truth for the copyright line, physical address, legal
 * links, and CAN-SPAM unsubscribe controls across every transactional and
 * marketing email template.
 *
 * The four historic templates (WelcomeEmail, DisputeStatusEmail,
 * PaymentReceiptEmail, ScoreChangeEmail) used to inline their own footers,
 * drifting apart as CAN-SPAM copy and branding changed. They now render this
 * component instead (ARCH H1).
 *
 * `unsubscribeToken` and `userId` are optional because the email-service
 * API does not yet thread them through. When provided, the footer renders
 * CAN-SPAM-compliant unsubscribe + manage-preferences links. When omitted,
 * it falls back to the preferences page as a compliant manual-unsubscribe
 * path (users can toggle all notification categories there).
 */

import * as React from "react";
import { EMAIL_COLORS } from "../email-colors";

interface EmailFooterProps {
  emailType: "marketing" | "transactional" | "disputes" | "scores" | "payments";
  unsubscribeToken?: string;
  userId?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fynvita.com";

export function EmailFooter({
  emailType,
  unsubscribeToken,
  userId,
}: EmailFooterProps) {
  const unsubscribeUrl =
    unsubscribeToken && userId
      ? `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}&user=${userId}&type=${emailType}`
      : `${baseUrl}/settings/notifications`;
  const preferencesUrl = `${baseUrl}/settings/notifications`;
  const privacyUrl = `${baseUrl}/privacy`;

  return (
    <div
      style={{
        marginTop: "32px",
        padding: "24px",
        backgroundColor: EMAIL_COLORS.bgLight,
        borderRadius: "8px",
        borderTop: `1px solid ${EMAIL_COLORS.border}`,
      }}
    >
      <p
        style={{
          fontSize: "12px",
          lineHeight: "18px",
          color: EMAIL_COLORS.textSecondary,
          textAlign: "center" as const,
          margin: "0 0 16px 0",
        }}
      >
        Fynvita, Inc.
        <br />
        123 Financial District
        <br />
        San Francisco, CA 94111
      </p>

      <p
        style={{
          fontSize: "12px",
          lineHeight: "18px",
          color: EMAIL_COLORS.textSecondary,
          textAlign: "center" as const,
          margin: "0 0 16px 0",
        }}
      >
        <a
          href={preferencesUrl}
          style={{ color: EMAIL_COLORS.brand, textDecoration: "underline" }}
        >
          Manage Preferences
        </a>
        {" | "}
        <a
          href={unsubscribeUrl}
          style={{ color: EMAIL_COLORS.brand, textDecoration: "underline" }}
        >
          Unsubscribe
        </a>
        {" | "}
        <a
          href={privacyUrl}
          style={{ color: EMAIL_COLORS.brand, textDecoration: "underline" }}
        >
          Privacy Policy
        </a>
      </p>

      <p
        style={{
          fontSize: "11px",
          lineHeight: "16px",
          color: EMAIL_COLORS.textTertiary,
          textAlign: "center" as const,
          margin: "0 0 8px 0",
        }}
      >
        You received this email because you have an account with Fynvita.
        {emailType === "marketing"
          ? " This is a promotional email."
          : " This is a transactional email related to your account."}
      </p>

      <p
        style={{
          fontSize: "11px",
          lineHeight: "16px",
          color: EMAIL_COLORS.textTertiary,
          textAlign: "center" as const,
          margin: 0,
        }}
      >
        © {new Date().getFullYear()} Fynvita. All rights reserved.
      </p>
    </div>
  );
}

export default EmailFooter;
