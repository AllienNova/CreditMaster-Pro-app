import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { AppShell } from "@/components/navigation/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fynvita — Your Financial Vitality",
    template: "%s | Fynvita",
  },
  description:
    "Your complete financial health platform. AI-powered credit health, financial wellness, and investment intelligence all in one place.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  keywords: [
    "credit health",
    "financial wellness",
    "investment intelligence",
    "credit repair",
    "financial management",
    "AI financial advisor",
    "credit score",
    "budgeting",
    "portfolio management",
  ],
  authors: [{ name: "Fynvita" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Fynvita - Your Financial Vitality",
    description:
      "Complete financial vitality through credit health, financial wellness, and investment intelligence.",
    type: "website",
    siteName: "Fynvita",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fynvita - Your Financial Vitality Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fynvita - Your Financial Vitality",
    description:
      "Complete financial vitality through credit health, financial wellness, and investment intelligence.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10B981" }, // Vital Green
    { media: "(prefers-color-scheme: dark)", color: "#059669" }, // Darker Emerald
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body
        className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 antialiased transition-colors duration-200"
        suppressHydrationWarning
      >
        {/*
          AppShell mounts the primary navigation. Before it, this layout
          rendered only <Providers> — no nav chrome anywhere in the
          authenticated app — so 165 of 204 built pages could only be reached
          by typing a URL. It hides itself on marketing, auth and onboarding
          routes; see isChromelessRoute.
        */}
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
