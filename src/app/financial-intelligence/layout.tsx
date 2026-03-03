import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Financial Intelligence | Fynvita",
    default: "Financial Intelligence | Fynvita",
  },
  description:
    "AI-powered financial intelligence hub with personalized insights, smart budgeting, and comprehensive financial analysis.",
};

export default function FinancialIntelligenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
