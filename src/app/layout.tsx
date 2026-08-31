import type { Metadata } from 'next';
import './globals.css';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';

export const metadata: Metadata = {
  title: 'CreditMaster Pro - AI-Powered Credit Intelligence Platform',
  description: 'Transform your credit with AI-powered tools and strategies. Generate dispute letters, analyze credit reports, optimize utilization, and access 300+ AI models for personalized credit guidance. Available nationwide.',
  keywords: 'credit tools, AI credit analysis, dispute letter generator, credit score improvement, credit monitoring, student loan strategies, financial planning, credit utilization, goodwill letters, credit intelligence',
  authors: [{ name: 'CreditMaster Pro' }],
  openGraph: {
    title: 'CreditMaster Pro - AI-Powered Credit Intelligence Platform',
    description: 'Transform your credit with AI-powered tools and strategies. Access 300+ AI models for personalized guidance.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}
