import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Identity Protection | Fynvita",
    default: "Identity Protection | Fynvita",
  },
  description:
    "Comprehensive identity monitoring, dark web scanning, and identity theft protection.",
};

export default function IdentityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
