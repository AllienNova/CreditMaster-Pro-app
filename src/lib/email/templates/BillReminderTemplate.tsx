import * as React from "react";

export interface BillReminderTemplateProps {
  name: string;
  billName: string;
  amount: number;
  currency: string;
  dueDate: string;
  accountName: string;
  daysUntilDue: number;
  autopayEnabled: boolean;
  dashboardUrl: string;
}

export default function BillReminderTemplate({
  name,
  billName,
  amount,
  currency,
  dueDate,
  accountName,
  daysUntilDue,
  autopayEnabled,
  dashboardUrl,
}: BillReminderTemplateProps) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

  const urgencyColor =
    daysUntilDue <= 1 ? "#ef4444" : daysUntilDue <= 3 ? "#f59e0b" : "#10b981";
  const urgencyLabel =
    daysUntilDue <= 0
      ? "Due Today"
      : daysUntilDue === 1
        ? "Due Tomorrow"
        : `Due in ${daysUntilDue} days`;

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
          background: "linear-gradient(135deg, #10b981, #3b82f6)",
          padding: "30px 20px",
          textAlign: "center" as const,
        }}
      >
        <h1 style={{ color: "white", margin: 0, fontSize: "24px" }}>
          Bill Payment Reminder
        </h1>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: "#ffffff" }}>
        <p style={{ fontSize: "18px", color: "#374151", marginBottom: "20px" }}>
          Hi {name},
        </p>

        <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: "1.6" }}>
          You have an upcoming bill payment. Here are the details:
        </p>

        <div
          style={{
            background: "#f9fafb",
            borderRadius: "12px",
            padding: "24px",
            margin: "24px 0",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              textAlign: "center" as const,
              marginBottom: "24px",
              paddingBottom: "24px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <span style={{ fontSize: "14px", color: "#6b7280" }}>
              Amount Due
            </span>
            <p
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: "#374151",
                margin: "8px 0",
              }}
            >
              {formattedAmount}
            </p>
            <span
              style={{
                display: "inline-block",
                background: urgencyColor,
                color: "white",
                padding: "4px 16px",
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {urgencyLabel}
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    color: "#6b7280",
                    fontSize: "14px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Bill:
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    color: "#374151",
                    fontWeight: "bold",
                    fontSize: "14px",
                    textAlign: "right" as const,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {billName}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    color: "#6b7280",
                    fontSize: "14px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Due Date:
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    color: "#374151",
                    fontWeight: "bold",
                    fontSize: "14px",
                    textAlign: "right" as const,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {dueDate}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    color: "#6b7280",
                    fontSize: "14px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  Account:
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    color: "#374151",
                    fontWeight: "bold",
                    fontSize: "14px",
                    textAlign: "right" as const,
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {accountName}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "12px 0",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Autopay:
                </td>
                <td
                  style={{
                    padding: "12px 0",
                    color: autopayEnabled ? "#10b981" : "#f59e0b",
                    fontWeight: "bold",
                    fontSize: "14px",
                    textAlign: "right" as const,
                  }}
                >
                  {autopayEnabled ? "Enabled" : "Not Enabled"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {!autopayEnabled && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <p style={{ color: "#92400e", margin: 0, fontSize: "14px" }}>
              Autopay is not enabled for this bill. Set up autopay to never miss
              a payment and protect your credit score.
            </p>
          </div>
        )}

        {autopayEnabled && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #10b981",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <p style={{ color: "#065f46", margin: 0, fontSize: "14px" }}>
              Autopay is enabled. This bill will be paid automatically. Make
              sure your account has sufficient funds.
            </p>
          </div>
        )}

        <div style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <a
            href={`${dashboardUrl}/bills`}
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #10b981, #3b82f6)",
              color: "white",
              padding: "14px 40px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            View Bills Dashboard →
          </a>
        </div>
      </div>

      <div
        style={{
          background: "#f9fafb",
          padding: "20px",
          textAlign: "center" as const,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <p style={{ color: "#6b7280", fontSize: "12px", margin: 0 }}>
          © {new Date().getFullYear()} Fynvita. All rights reserved.
        </p>
        <p style={{ color: "#9ca3af", fontSize: "11px", marginTop: "10px" }}>
          You received this reminder because you have bill tracking enabled in
          Fynvita.
        </p>
      </div>
    </div>
  );
}
