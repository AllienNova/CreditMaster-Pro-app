/**
 * AICreditRepairStrategy Component Tests
 * 
 * Tests for the Credit Repair AI Strategy component
 */

import React from 'react';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, setupUser } from '@/__tests__/utils/test-utils';
import AICreditRepairStrategy from '../AICreditRepairStrategy';
import { server } from '@/__tests__/mocks/server';
import { rest } from 'msw';

describe('AICreditRepairStrategy', () => {
  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      renderWithProviders(<AICreditRepairStrategy />);

      // Check for loading animation class - the component shows a pulsing div while loading
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should render credit repair strategy after data loads', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Repair Strategy Effectiveness/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/AI Credit Repair Strategy/i)).toBeInTheDocument();
    });

    it('should display repair score', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Repair Strategy Effectiveness/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Score of 88/100 from mock data
      expect(screen.getByText(/88\/100/)).toBeInTheDocument();
    });

    it('should display success metrics', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Repair Strategy Effectiveness/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for success probability
      expect(screen.getByText(/Success Probability/i)).toBeInTheDocument();
      expect(screen.getByText(/82%/i)).toBeInTheDocument();

      // Check for estimated score increase
      expect(screen.getByText(/Expected Increase/i)).toBeInTheDocument();
      expect(screen.getByText(/\+100 pts/i)).toBeInTheDocument();

      // Check for timeframe - use getAllByText since it appears multiple times
      const timeframeElements = screen.getAllByText(/90-120 days/i);
      expect(timeframeElements.length).toBeGreaterThan(0);

      // Check for confidence level
      expect(screen.getByText(/HIGH CONFIDENCE/i)).toBeInTheDocument();
    });

    it('should display quick wins', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Quick Wins \(Start Today\)/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for quick win description
      expect(screen.getByText(/Pay down Chase card from 78% to 20% utilization/i)).toBeInTheDocument();
    });

    it('should display prioritized actions', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Priority Repair Actions/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for action title
      expect(screen.getByText(/Dispute inaccurate late payment/i)).toBeInTheDocument();

      // Check for impact - use getAllByText since +45 appears multiple times
      const impactElements = screen.getAllByText(/\+45/i);
      expect(impactElements.length).toBeGreaterThan(0);

      // Check for success probability - use getAllByText since it appears multiple times
      const successElements = screen.getAllByText(/85% success/i);
      expect(successElements.length).toBeGreaterThan(0);

      // Check for priority
      expect(screen.getByText(/critical/i)).toBeInTheDocument();
    });

    it('should display impact predictions', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Score Impact Predictions/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for action name
      expect(screen.getByText(/Pay down utilization to 10%/i)).toBeInTheDocument();

      // Check for score transition (620 → 675)
      expect(screen.getByText(/620 → 675/)).toBeInTheDocument();

      // Check for score increase
      expect(screen.getByText(/\+55 pts/i)).toBeInTheDocument();
    });

    it('should display timeline estimates', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Repair Timeline/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for phase name
      expect(screen.getByText(/Immediate Actions \(0-30 days\)/i)).toBeInTheDocument();

      // Check for expected score range
      expect(screen.getByText(/620 - 645/i)).toBeInTheDocument();
    });

    it('should display strategy optimizations', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Recommended Strategies/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for strategy name
      expect(screen.getByText(/Aggressive Dispute Strategy/i)).toBeInTheDocument();

      // Check for success rate
      expect(screen.getByText(/78% success/i)).toBeInTheDocument();

      // Check for expected outcome
      expect(screen.getByText(/\+45-65 points in 60-90 days/i)).toBeInTheDocument();
    });

    it('should display risk factors', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Risk Factors to Consider/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for risk factor
      expect(screen.getByText(/Collection agency may not agree to pay-for-delete/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should toggle expand/collapse', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Repair Strategy Effectiveness/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find the toggle button (it's the only button in the component)
      const toggleButton = screen.getByRole('button');

      // Content should be visible initially
      expect(screen.getByText(/Quick Wins/i)).toBeInTheDocument();

      // Use fireEvent instead of user.click to avoid MouseEvent polyfill issues
      fireEvent.click(toggleButton);

      // Content should be hidden after click
      await waitFor(() => {
        expect(screen.queryByText(/Quick Wins/i)).not.toBeInTheDocument();
      });
    });

    it('should display difficulty indicators', async () => {
      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Priority Repair Actions/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for difficulty level (medium from mock data) - use getAllByText since it appears twice
      const difficultyElements = screen.getAllByText(/medium/i);
      expect(difficultyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API fails', async () => {
      server.use(
        rest.get('http://localhost/api/financial/credit-repair/ai-strategy', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Failed to fetch credit repair strategy' })
          );
        })
      );

      renderWithProviders(<AICreditRepairStrategy />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading AI repair strategy/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

