/**
 * Email Footer Component with Unsubscribe Link
 * CAN-SPAM compliant footer for all marketing and transactional emails
 */

import * as React from "react";
import { Text, Link, Hr, Section } from "@react-email/components";

interface EmailFooterProps {
  unsubscribeToken: string;
  userId: string;
  emailType: "marketing" | "transactional" | "disputes" | "scores" | "payments";
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fynvita.com";

export function EmailFooter({
  unsubscribeToken,
  userId,
  emailType,
}: EmailFooterProps) {
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}&user=${userId}&type=${emailType}`;
  const preferencesUrl = `${baseUrl}/settings/notifications`;

  return (
    <Section style={footerStyle}>
      <Hr style={hrStyle} />

      <Text style={addressStyle}>
        Fynvita, Inc.
        <br />
        123 Financial District
        <br />
        San Francisco, CA 94111
      </Text>

      <Text style={linksStyle}>
        <Link href={preferencesUrl} style={linkStyle}>
          Manage Preferences
        </Link>
        {" | "}
        <Link href={unsubscribeUrl} style={linkStyle}>
          Unsubscribe
        </Link>
        {" | "}
        <Link href={`${baseUrl}/privacy`} style={linkStyle}>
          Privacy Policy
        </Link>
      </Text>

      <Text style={disclaimerStyle}>
        You received this email because you have an account with Fynvita.
        {emailType === "marketing" && <> This is a promotional email. </>}
        {emailType === "transactional" && (
          <> This is a transactional email related to your account. </>
        )}
      </Text>

      <Text style={copyrightStyle}>
        © {new Date().getFullYear()} Fynvita. All rights reserved.
      </Text>
    </Section>
  );
}

// Styles
const footerStyle: React.CSSProperties = {
  marginTop: "32px",
  padding: "24px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0 0 24px 0",
};

const addressStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "0 0 16px 0",
};

const linksStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "0 0 16px 0",
};

const linkStyle: React.CSSProperties = {
  color: "#10b981",
  textDecoration: "underline",
};

const disclaimerStyle: React.CSSProperties = {
  fontSize: "11px",
  lineHeight: "16px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0 0 8px 0",
};

const copyrightStyle: React.CSSProperties = {
  fontSize: "11px",
  lineHeight: "16px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};

export default EmailFooter;
