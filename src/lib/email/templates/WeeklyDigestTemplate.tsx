import * as React from "react";

export interface BudgetCategory {
  name: string;
  spent: number;
  budget: number;
  currency: string;
}

export interface WeeklyDigestTemplateProps {
  name: string;
  weekStartDate: string;
  weekEndDate: string;
  totalSpending: number;
  totalSavings: number;
  currency: string;
  spendingChange: number;
  topCategories: BudgetCategory[];
  budgetStatus: "on_track" | "over_budget" | "under_budget";
  budgetUtilization: number;
  tips: string[];
  dashboardUrl: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

const budgetStatusConfig = {
  on_track: {
    color: "#10b981",
    background: "#ecfdf5",
    border: "#10b981",
    label: "On Track",
    textColor: "#065f46",
  },
  over_budget: {
    color: "#ef4444",
    background: "#fef2f2",
    border: "#ef4444",
    label: "Over Budget",
    textColor: "#991b1b",
  },
  under_budget: {
    color: "#3b82f6",
    background: "#eff6ff",
    border: "#3b82f6",
    label: "Under Budget",
    textColor: "#1e40af",
  },
};

export default function WeeklyDigestTemplate({
  name,
  weekStartDate,
  weekEndDate,
  totalSpending,
  totalSavings,
  currency,
  spendingChange,
  topCategories,
  budgetStatus,
  budgetUtilization,
  tips,
  dashboardUrl,
}: WeeklyDigestTemplateProps) {
  const statusConfig = budgetStatusConfig[budgetStatus];
  const spendingChangeText =
    spendingChange > 0
      ? `+${spendingChange.toFixed(1)}%`
      : `${spendingChange.toFixed(1)}%`;
  const spendingChangeColor = spendingChange > 0 ? "#ef4444" : "#10b981";

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
          Your Weekly Financial Summary
        </h1>
        <p
          style={{
            color: "rgba(255, 255, 255, 0.9)",
            margin: "8px 0 0 0",
            fontSize: "14px",
          }}
        >
          {weekStartDate} - {weekEndDate}
        </p>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: "#ffffff" }}>
        <p style={{ fontSize: "18px", color: "#374151", marginBottom: "20px" }}>
          Hi {name},
        </p>

        <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: "1.6" }}>
          Here is your weekly financial overview:
        </p>

        {/* Summary Cards */}
        <div style={{ margin: "24px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "8px", width: "50%" }}>
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: "12px",
                      padding: "20px",
                      textAlign: "center" as const,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>
                      Total Spending
                    </span>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#374151",
                        margin: "8px 0 4px 0",
                      }}
                    >
                      {formatCurrency(totalSpending, currency)}
                    </p>
                    <span
                      style={{
                        fontSize: "12px",
                        color: spendingChangeColor,
                        fontWeight: "bold",
                      }}
                    >
                      {spendingChangeText} vs last week
                    </span>
                  </div>
                </td>
                <td style={{ padding: "8px", width: "50%" }}>
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: "12px",
                      padding: "20px",
                      textAlign: "center" as const,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>
                      Total Savings
                    </span>
                    <p
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#10b981",
                        margin: "8px 0 4px 0",
                      }}
                    >
                      {formatCurrency(totalSavings, currency)}
                    </p>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                      }}
                    >
                      this week
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Budget Status */}
        <div
          style={{
            background: statusConfig.background,
            border: `1px solid ${statusConfig.border}`,
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            textAlign: "center" as const,
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: statusConfig.color,
              color: "white",
              padding: "4px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            {statusConfig.label}
          </span>
          <p
            style={{
              color: statusConfig.textColor,
              margin: "8px 0 0 0",
              fontSize: "14px",
            }}
          >
            You have used {budgetUtilization}% of your monthly budget.
          </p>
        </div>

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ color: "#374151", fontSize: "16px", margin: "0 0 16px 0" }}>
              Top Spending Categories
            </h3>
            <div
              style={{
                background: "#f9fafb",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e5e7eb",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "8px 0",
                        color: "#6b7280",
                        fontSize: "12px",
                        textAlign: "left" as const,
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: "normal",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.5px",
                      }}
                    >
                      Category
                    </th>
                    <th
                      style={{
                        padding: "8px 0",
                        color: "#6b7280",
                        fontSize: "12px",
                        textAlign: "right" as const,
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: "normal",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.5px",
                      }}
                    >
                      Spent
                    </th>
                    <th
                      style={{
                        padding: "8px 0",
                        color: "#6b7280",
                        fontSize: "12px",
                        textAlign: "right" as const,
                        borderBottom: "1px solid #e5e7eb",
                        fontWeight: "normal",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.5px",
                      }}
                    >
                      Budget
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topCategories.map((category, index) => {
                    const isOver = category.spent > category.budget;
                    return (
                      <tr key={index}>
                        <td
                          style={{
                            padding: "10px 0",
                            color: "#374151",
                            fontSize: "14px",
                            borderBottom:
                              index < topCategories.length - 1
                                ? "1px solid #e5e7eb"
                                : "none",
                          }}
                        >
                          {category.name}
                        </td>
                        <td
                          style={{
                            padding: "10px 0",
                            color: isOver ? "#ef4444" : "#374151",
                            fontWeight: "bold",
                            fontSize: "14px",
                            textAlign: "right" as const,
                            borderBottom:
                              index < topCategories.length - 1
                                ? "1px solid #e5e7eb"
                                : "none",
                          }}
                        >
                          {formatCurrency(category.spent, category.currency)}
                        </td>
                        <td
                          style={{
                            padding: "10px 0",
                            color: "#6b7280",
                            fontSize: "14px",
                            textAlign: "right" as const,
                            borderBottom:
                              index < topCategories.length - 1
                                ? "1px solid #e5e7eb"
                                : "none",
                          }}
                        >
                          {formatCurrency(category.budget, category.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ color: "#374151", fontSize: "16px", margin: "0 0 16px 0" }}>
              Financial Tips for You
            </h3>
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <ul style={{ margin: 0, paddingLeft: "20px" }}>
                {tips.map((tip, index) => (
                  <li
                    key={index}
                    style={{
                      color: "#1e40af",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      marginBottom: index < tips.length - 1 ? "8px" : "0",
                    }}
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <a
            href={dashboardUrl}
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
            View Full Dashboard →
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
          You received this digest because you have weekly summaries enabled in
          Fynvita.
        </p>
      </div>
    </div>
  );
}
