import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Recommendations | Fynvita",
    default: "Recommendations | Fynvita",
  },
  description:
    "AI-powered personalized financial recommendations for credit cards, loans, and financial insights.",
};

export default function RecommendationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
