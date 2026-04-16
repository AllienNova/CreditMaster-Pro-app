import * as React from "react";
import { EMAIL_COLORS } from "./email-colors";
import { EmailFooter } from "./components/EmailFooter";

interface ScoreChangeEmailProps {
  name: string;
  previousScore: number;
  newScore: number;
  changeDate: string;
  dashboardUrl: string;
}

export default function ScoreChangeEmail({
  name,
  previousScore,
  newScore,
  changeDate,
  dashboardUrl,
}: ScoreChangeEmailProps) {
  const change = newScore - previousScore;
  const isPositive = change > 0;
  const changeText = isPositive ? `+${change}` : `${change}`;
  const emoji = isPositive ? "" : "";

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
          Credit Score Update {emoji}
        </h1>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: EMAIL_COLORS.bgWhite }}>
        <p style={{ fontSize: "18px", color: EMAIL_COLORS.textPrimary, marginBottom: "20px" }}>
          Hi {name},
        </p>

        <p style={{ fontSize: "16px", color: EMAIL_COLORS.textSecondary, lineHeight: "1.6" }}>
          Your credit score has changed! Here's your update:
        </p>

        <div
          style={{
            textAlign: "center" as const,
            margin: "30px 0",
            padding: "30px",
            background: isPositive ? EMAIL_COLORS.successBg : EMAIL_COLORS.errorBg,
            borderRadius: "16px",
            border: `2px solid ${isPositive ? EMAIL_COLORS.brand : EMAIL_COLORS.danger}`,
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "14px", color: EMAIL_COLORS.textSecondary }}>
              Previous Score
            </span>
            <p
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: EMAIL_COLORS.textTertiary,
                margin: "8px 0",
              }}
            >
              {previousScore}
            </p>
          </div>

          <div
            style={{
              display: "inline-block",
              background: isPositive ? EMAIL_COLORS.brand : EMAIL_COLORS.danger,
              color: "white",
              padding: "8px 24px",
              borderRadius: "20px",
              fontSize: "20px",
              fontWeight: "bold",
              margin: "10px 0",
            }}
          >
            {changeText} points
          </div>

          <div style={{ marginTop: "20px" }}>
            <span style={{ fontSize: "14px", color: EMAIL_COLORS.textSecondary }}>
              New Score
            </span>
            <p
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: isPositive ? EMAIL_COLORS.brand : EMAIL_COLORS.danger,
                margin: "8px 0",
              }}
            >
              {newScore}
            </p>
          </div>
        </div>

        {isPositive ? (
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
              Congratulations! Your hard work is paying off. Keep up the great
              progress!
            </p>
          </div>
        ) : (
          <div
            style={{
              background: EMAIL_COLORS.errorBg,
              border: `1px solid ${EMAIL_COLORS.danger}`,
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px",
            }}
          >
            <p style={{ color: EMAIL_COLORS.error, margin: 0, fontSize: "14px" }}>
              Don't worry! Log in to your dashboard to see what factors may have
              affected your score and get personalized recommendations.
            </p>
          </div>
        )}

        <p
          style={{
            fontSize: "14px",
            color: EMAIL_COLORS.textTertiary,
            textAlign: "center" as const,
          }}
        >
          Score recorded on {changeDate}
        </p>

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
            View Score Details →
          </a>
        </div>
      </div>

      <EmailFooter emailType="scores" />
    </div>
  );
}
