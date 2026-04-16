import * as React from "react";
import { EMAIL_COLORS } from "./email-colors";
import { EmailFooter } from "./components/EmailFooter";

interface PaymentReceiptEmailProps {
  name: string;
  plan: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  paymentDate: string;
  nextBillingDate: string;
  dashboardUrl: string;
}

export default function PaymentReceiptEmail({
  name,
  plan,
  amount,
  currency,
  invoiceNumber,
  paymentDate,
  nextBillingDate,
  dashboardUrl,
}: PaymentReceiptEmailProps) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount / 100);

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
          Payment Receipt
        </h1>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: EMAIL_COLORS.bgWhite }}>
        <p style={{ fontSize: "18px", color: EMAIL_COLORS.textPrimary, marginBottom: "20px" }}>
          Hi {name},
        </p>

        <p style={{ fontSize: "16px", color: EMAIL_COLORS.textSecondary, lineHeight: "1.6" }}>
          Thank you for your payment! Here's your receipt:
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
              textAlign: "center" as const,
              marginBottom: "24px",
              paddingBottom: "24px",
              borderBottom: `1px solid ${EMAIL_COLORS.border}`,
            }}
          >
            <span style={{ fontSize: "14px", color: EMAIL_COLORS.textSecondary }}>
              Amount Paid
            </span>
            <p
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: EMAIL_COLORS.brand,
                margin: "8px 0",
              }}
            >
              {formattedAmount}
            </p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    color: EMAIL_COLORS.textSecondary,
                    fontSize: "14px",
                    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
                  }}
                >
                  Plan:
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    color: EMAIL_COLORS.textPrimary,
                    fontWeight: "bold",
                    fontSize: "14px",
                    textAlign: "right" as const,
                    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
                  }}
                >
                  {plan}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    color: EMAIL_COLORS.textSecondary,
                    fontSize: "14px",
                    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
                  }}
                >
                  Invoice #:
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    color: EMAIL_COLORS.textPrimary,
                    fontWeight: "bold",
                    fontSize: "14px",
                    textAlign: "right" as const,
                    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
                  }}
                >
                  {invoiceNumber}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    color: EMAIL_COLORS.textSecondary,
                    fontSize: "14px",
                    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
                  }}
                >
                  Payment Date:
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    color: EMAIL_COLORS.textPrimary,
                    fontWeight: "bold",
                    fontSize: "14px",
                    textAlign: "right" as const,
                    borderBottom: `1px solid ${EMAIL_COLORS.border}`,
                  }}
                >
                  {paymentDate}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    color: EMAIL_COLORS.textSecondary,
                    fontSize: "14px",
                  }}
                >
                  Next Billing:
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    color: EMAIL_COLORS.textPrimary,
                    fontWeight: "bold",
                    fontSize: "14px",
                    textAlign: "right" as const,
                  }}
                >
                  {nextBillingDate}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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
            Payment successful! Your subscription is active and all features are
            available.
          </p>
        </div>

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
            Go to Dashboard →
          </a>
        </div>

        <p
          style={{
            fontSize: "12px",
            color: EMAIL_COLORS.textTertiary,
            textAlign: "center" as const,
          }}
        >
          Need to update your billing information?{" "}
          <a
            href={`${dashboardUrl}/settings/billing`}
            style={{ color: EMAIL_COLORS.link }}
          >
            Manage billing
          </a>
        </p>
      </div>

      <EmailFooter emailType="payments" />
    </div>
  );
}
