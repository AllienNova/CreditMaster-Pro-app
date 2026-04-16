import * as React from "react";
import { EMAIL_COLORS } from "./email-colors";
import { EmailFooter } from "./components/EmailFooter";

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

export default function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
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
          padding: "40px 20px",
          textAlign: "center" as const,
        }}
      >
        <h1 style={{ color: "white", margin: 0, fontSize: "28px" }}>
          Welcome to Fynvita!
        </h1>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: EMAIL_COLORS.bgWhite }}>
        <p style={{ fontSize: "18px", color: EMAIL_COLORS.textPrimary, marginBottom: "20px" }}>
          Hi {name},
        </p>

        <p style={{ fontSize: "16px", color: EMAIL_COLORS.textSecondary, lineHeight: "1.6" }}>
          Thank you for joining Fynvita! We're excited to help you on your
          financial vitality journey.
        </p>

        <div
          style={{
            background: EMAIL_COLORS.borderLight,
            borderRadius: "8px",
            padding: "20px",
            margin: "30px 0",
          }}
        >
          <h3 style={{ color: EMAIL_COLORS.textPrimary, marginTop: 0 }}>
            Here's what you can do:
          </h3>
          <ul style={{ color: EMAIL_COLORS.textSecondary, paddingLeft: "20px" }}>
            <li style={{ marginBottom: "10px" }}>
              Upload your credit report for AI analysis
            </li>
            <li style={{ marginBottom: "10px" }}>
              Generate personalized dispute letters
            </li>
            <li style={{ marginBottom: "10px" }}>
              Track your credit score improvements
            </li>
            <li style={{ marginBottom: "10px" }}>Get expert recommendations</li>
          </ul>
        </div>

        <div style={{ textAlign: "center" as const, margin: "30px 0" }}>
          <a
            href={loginUrl}
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
            Get Started Now →
          </a>
        </div>

        <p style={{ fontSize: "14px", color: EMAIL_COLORS.textTertiary, marginTop: "30px" }}>
          If you have any questions, our support team is here to help. Just
          reply to this email!
        </p>
      </div>

      <EmailFooter emailType="transactional" />
    </div>
  );
}
