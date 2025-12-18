'use client';

/**
 * Application Providers
 *
 * Wraps the application with necessary context providers:
 * - ThemeProvider for dark/light mode
 * - ToastProvider for notifications
 */

import { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
