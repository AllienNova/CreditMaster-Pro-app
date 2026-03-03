import * as React from "react";

export type TradingAlertType = "signal" | "price_alert" | "position_update";
export type SignalDirection = "buy" | "sell" | "hold";

export interface TradingAlertTemplateProps {
  name: string;
  alertType: TradingAlertType;
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  dashboardUrl: string;
  // Signal-specific
  signalDirection?: SignalDirection;
  signalConfidence?: number;
  signalStrategy?: string;
  // Price alert-specific
  targetPrice?: number;
  priceDirection?: "above" | "below";
  // Position update-specific
  positionAction?: string;
  positionQuantity?: number;
  positionPnl?: number;
  positionPnlPercentage?: number;
  timestamp: string;
}

const alertTypeConfig: Record<
  TradingAlertType,
  { title: string; icon: string }
> = {
  signal: { title: "Trading Signal Alert", icon: "Signal" },
  price_alert: { title: "Price Alert Triggered", icon: "Price" },
  position_update: { title: "Position Update", icon: "Position" },
};

const signalDirectionConfig: Record<
  SignalDirection,
  { color: string; background: string; label: string }
> = {
  buy: { color: "#10b981", background: "#ecfdf5", label: "BUY" },
  sell: { color: "#ef4444", background: "#fef2f2", label: "SELL" },
  hold: { color: "#f59e0b", background: "#fef3c7", label: "HOLD" },
};

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function TradingAlertTemplate({
  name,
  alertType,
  symbol,
  companyName,
  currentPrice,
  currency,
  dashboardUrl,
  signalDirection,
  signalConfidence,
  signalStrategy,
  targetPrice,
  priceDirection,
  positionAction,
  positionQuantity,
  positionPnl,
  positionPnlPercentage,
  timestamp,
}: TradingAlertTemplateProps) {
  const config = alertTypeConfig[alertType];

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
          {config.title}
        </h1>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: "#ffffff" }}>
        <p style={{ fontSize: "18px", color: "#374151", marginBottom: "20px" }}>
          Hi {name},
        </p>

        {/* Symbol Header */}
        <div
          style={{
            textAlign: "center" as const,
            margin: "24px 0",
            padding: "20px",
            background: "#f9fafb",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
          }}
        >
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#374151",
              margin: "0 0 4px 0",
            }}
          >
            {symbol}
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: "0 0 12px 0",
            }}
          >
            {companyName}
          </p>
          <p
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#374151",
              margin: 0,
            }}
          >
            {formatPrice(currentPrice, currency)}
          </p>
        </div>

        {/* Signal Alert Content */}
        {alertType === "signal" && signalDirection && (
          <div style={{ margin: "24px 0" }}>
            <div
              style={{
                textAlign: "center" as const,
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  background: signalDirectionConfig[signalDirection].color,
                  color: "white",
                  padding: "8px 32px",
                  borderRadius: "20px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                }}
              >
                {signalDirectionConfig[signalDirection].label}
              </span>
            </div>

            <div
              style={{
                background:
                  signalDirectionConfig[signalDirection].background,
                border: `1px solid ${signalDirectionConfig[signalDirection].color}`,
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {signalStrategy && (
                    <tr>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#6b7280",
                          fontSize: "14px",
                        }}
                      >
                        Strategy:
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#374151",
                          fontWeight: "bold",
                          fontSize: "14px",
                          textAlign: "right" as const,
                        }}
                      >
                        {signalStrategy}
                      </td>
                    </tr>
                  )}
                  {signalConfidence !== undefined && (
                    <tr>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#6b7280",
                          fontSize: "14px",
                        }}
                      >
                        Confidence:
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          color: "#374151",
                          fontWeight: "bold",
                          fontSize: "14px",
                          textAlign: "right" as const,
                        }}
                      >
                        {signalConfidence}%
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Price Alert Content */}
        {alertType === "price_alert" &&
          targetPrice !== undefined &&
          priceDirection && (
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                padding: "16px",
                margin: "24px 0",
              }}
            >
              <p
                style={{
                  color: "#1e40af",
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: "1.6",
                }}
              >
                {symbol} has moved {priceDirection}{" "}
                your target price of {formatPrice(targetPrice, currency)}.
                The current price is {formatPrice(currentPrice, currency)}.
              </p>
            </div>
          )}

        {/* Position Update Content */}
        {alertType === "position_update" && (
          <div style={{ margin: "24px 0" }}>
            <div
              style={{
                background: "#f9fafb",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e5e7eb",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {positionAction && (
                    <tr>
                      <td
                        style={{
                          padding: "10px 0",
                          color: "#6b7280",
                          fontSize: "14px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Action:
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          color: "#374151",
                          fontWeight: "bold",
                          fontSize: "14px",
                          textAlign: "right" as const,
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        {positionAction}
                      </td>
                    </tr>
                  )}
                  {positionQuantity !== undefined && (
                    <tr>
                      <td
                        style={{
                          padding: "10px 0",
                          color: "#6b7280",
                          fontSize: "14px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Quantity:
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          color: "#374151",
                          fontWeight: "bold",
                          fontSize: "14px",
                          textAlign: "right" as const,
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        {positionQuantity}
                      </td>
                    </tr>
                  )}
                  {positionPnl !== undefined && (
                    <tr>
                      <td
                        style={{
                          padding: "10px 0",
                          color: "#6b7280",
                          fontSize: "14px",
                        }}
                      >
                        P&L:
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          color: positionPnl >= 0 ? "#10b981" : "#ef4444",
                          fontWeight: "bold",
                          fontSize: "14px",
                          textAlign: "right" as const,
                        }}
                      >
                        {positionPnl >= 0 ? "+" : ""}
                        {formatPrice(positionPnl, currency)}
                        {positionPnlPercentage !== undefined && (
                          <span>
                            {" "}
                            ({positionPnlPercentage >= 0 ? "+" : ""}
                            {positionPnlPercentage.toFixed(2)}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            textAlign: "center" as const,
          }}
        >
          Alert generated at {timestamp}
        </p>

        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
            padding: "12px 16px",
            margin: "16px 0 24px 0",
          }}
        >
          <p
            style={{
              color: "#92400e",
              margin: 0,
              fontSize: "12px",
              lineHeight: "1.5",
            }}
          >
            This alert is for informational purposes only and does not
            constitute financial advice. Always do your own research before
            making investment decisions.
          </p>
        </div>

        <div style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <a
            href={`${dashboardUrl}/investments`}
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
            View Investments →
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
          You received this alert because you have trading alerts enabled in
          Fynvita.
        </p>
      </div>
    </div>
  );
}
