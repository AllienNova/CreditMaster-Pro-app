import * as React from "react";
import { EMAIL_COLORS } from "./email-colors";
import { EmailFooter } from "./components/EmailFooter";

interface DisputeStatusEmailProps {
  name: string;
  disputeId: string;
  status: "submitted" | "in_review" | "resolved" | "rejected";
  bureau: string;
  itemDescription: string;
  dashboardUrl: string;
}

const statusConfig = {
  submitted: { color: EMAIL_COLORS.brandBlue, label: "Submitted", emoji: "" },
  in_review: { color: EMAIL_COLORS.warningBright, label: "Under Review", emoji: "" },
  resolved: { color: EMAIL_COLORS.brand, label: "Resolved", emoji: "" },
  rejected: { color: EMAIL_COLORS.danger, label: "Rejected", emoji: "" },
};

export default function DisputeStatusEmail({
  name,
  disputeId,
  status,
  bureau,
  itemDescription,
  dashboardUrl,
}: DisputeStatusEmailProps) {
  const config = statusConfig[status];

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          background: EMAIL_COLORS.brandGradient,
          padding: "30px 20px",
          textAlign: "center" as const,
        }}
      >
        <h1 style={{ color: "white", margin: 0, fontSize: "24px" }}>
          Dispute Status Update
        </h1>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: EMAIL_COLORS.bgWhite }}>
        <p style={{ fontSize: "18px", color: EMAIL_COLORS.textPrimary, marginBottom: "20px" }}>
          Hi {name},
        </p>

        <p style={{ fontSize: "16px", color: EMAIL_COLORS.textSecondary, lineHeight: "1.6" }}>
          Your dispute has been updated. Here are the details:
        </p>

        <div
          style={{
            background: EMAIL_COLORS.bgLight,
            borderRadius: "12px",
            padding: "24px",
            margin: "24px 0",
            border: `1px solid ${EMAIL_COLORS.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <span style={{ fontSize: "32px", marginRight: "12px" }}>
              {config.emoji}
            </span>
            <div>
              <span
                style={{
                  background: config.color,
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {config.label}
              </span>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "8px 0",
                    color: EMAIL_COLORS.textSecondary,
                    fontSize: "14px",
                  }}
                >
                  Dispute ID:
                </td>
                <td
                  style={{
                    padding: "8px 0",
                    color: EMAIL_COLORS.textPrimary,
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  {disputeId}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "8px 0",
                    color: EMAIL_COLORS.textSecondary,
                    fontSize: "14px",
                  }}
                >
                  Bureau:
                </td>
                <td
                  style={{
                    padding: "8px 0",
                    color: EMAIL_COLORS.textPrimary,
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  {bureau}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "8px 0",
                    color: EMAIL_COLORS.textSecondary,
                    fontSize: "14px",
                  }}
                >
                  Item:
                </td>
                <td
                  style={{
                    padding: "8px 0",
                    color: EMAIL_COLORS.textPrimary,
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  {itemDescription}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {status === "resolved" && (
          <div
            style={{
              background: EMAIL_COLORS.successBg,
              border: `1px solid ${EMAIL_COLORS.brand}`,
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <p style={{ color: EMAIL_COLORS.success, margin: 0, fontSize: "14px" }}>
              Great news! The item has been successfully removed or corrected on
              your credit report.
            </p>
          </div>
        )}

        <div style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <a
            href={dashboardUrl}
            style={{
              display: "inline-block",
              background: EMAIL_COLORS.brandGradient,
              color: "white",
              padding: "14px 40px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            View in Dashboard →
          </a>
        </div>
      </div>

      <EmailFooter emailType="disputes" />
    </div>
  );
}
