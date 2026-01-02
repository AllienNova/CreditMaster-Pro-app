/**
 * Custom Test Utilities
 * 
 * Provides custom render functions and utilities for testing React components
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Setup user event for testing user interactions
 * Note: Using userEvent directly instead of setup() to avoid EventTarget polyfill issues
 */
export function setupUser() {
  return userEvent;
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingToFinish() {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => {
    expect(document.querySelector('[data-testid="loading"]')).not.toBeInTheDocument();
  }, { timeout: 3000 });
}

/**
 * Mock window.matchMedia for responsive design tests
 */
export function mockMatchMedia(matches: boolean = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/**
 * Mock IntersectionObserver for components that use it
 */
export function mockIntersectionObserver() {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;
}

/**
 * Create mock AI component data for testing
 */
export const mockAIData = {
  insights: {
    overallScore: 78,
    insights: [
      {
        category: 'spending',
        title: 'Test Insight',
        description: 'Test description',
        severity: 'medium' as const,
        impact: 'Test impact',
        actionable: true,
        confidence: 85,
      },
    ],
  },
  budget: {
    optimizationScore: 82,
    currentBudget: { income: 5000, expenses: 4200, savings: 800 },
    optimizedBudget: { income: 5000, expenses: 3800, savings: 1200 },
  },
  goals: {
    optimizationScore: 85,
    goals: [
      {
        id: '1',
        name: 'Emergency Fund',
        targetAmount: 10000,
        currentAmount: 5000,
        targetDate: '2025-12-31',
        onTrack: true,
        confidence: 92,
      },
    ],
  },
  spending: {
    spendingScore: 72,
    patterns: [
      {
        category: 'Dining',
        trend: 'increasing' as const,
        change: 25,
        confidence: 85,
      },
    ],
  },
  bills: {
    optimizationScore: 88,
    totalMonthlySavings: 245,
  },
  credit: {
    creditHealthScore: 78,
    scorePredictions: [
      {
        timeframe: '30 days',
        predictedScore: 665,
        confidence: 85,
      },
    ],
  },
  disputes: {
    strategyScore: 85,
    disputes: [],
  },
  investments: {
    portfolioHealthScore: 78,
    recommendations: [],
  },
  creditBuilder: {
    roadmapScore: 85,
    milestones: [],
  },
  creditRepair: {
    repairScore: 88,
    successMetrics: {
      overallSuccessProbability: 82,
      estimatedScoreIncrease: 100,
      estimatedTimeframe: '90-120 days',
      confidenceLevel: 'high' as const,
      riskFactors: [],
    },
  },
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { userEvent };

