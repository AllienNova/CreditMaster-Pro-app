import * as React from "react";

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
          background: "linear-gradient(135deg, #10b981, #3b82f6)",
          padding: "40px 20px",
          textAlign: "center" as const,
        }}
      >
        <h1 style={{ color: "white", margin: 0, fontSize: "28px" }}>
          Welcome to Fynvita!
        </h1>
      </div>

      <div style={{ padding: "40px 20px", backgroundColor: "#ffffff" }}>
        <p style={{ fontSize: "18px", color: "#374151", marginBottom: "20px" }}>
          Hi {name},
        </p>

        <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: "1.6" }}>
          Thank you for joining Fynvita! We're excited to help you on your
          financial vitality journey.
        </p>

        <div
          style={{
            background: "#f3f4f6",
            borderRadius: "8px",
            padding: "20px",
            margin: "30px 0",
          }}
        >
          <h3 style={{ color: "#374151", marginTop: 0 }}>
            Here's what you can do:
          </h3>
          <ul style={{ color: "#6b7280", paddingLeft: "20px" }}>
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
              background: "linear-gradient(135deg, #10b981, #3b82f6)",
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

        <p style={{ fontSize: "14px", color: "#9ca3af", marginTop: "30px" }}>
          If you have any questions, our support team is here to help. Just
          reply to this email!
        </p>
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
          You're receiving this email because you signed up for Fynvita.
        </p>
      </div>
    </div>
  );
}
