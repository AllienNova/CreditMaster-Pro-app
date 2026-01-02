/**
 * AIInvestmentInsights Component Tests
 *
 * Tests for the Investments AI Insights component
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, setupUser } from '@/__tests__/utils/test-utils';
import AIInvestmentInsights from '../AIInvestmentInsights';
import { server } from '@/__tests__/mocks/server';
import { rest } from 'msw';

describe('AIInvestmentInsights', () => {
  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      renderWithProviders(<AIInvestmentInsights />);

      // Check for loading animation class
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should render investment insights after data loads', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/AI Investment Intelligence/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/Powered by advanced market analysis/i)).toBeInTheDocument();
    });

    it('should display portfolio health score', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/Portfolio Health Score/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Score of 78/100 from mock data
      expect(screen.getByText(/78\/100/)).toBeInTheDocument();
    });

    it('should display investment recommendations', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/AI Investment Recommendations/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for stock symbol
      expect(screen.getByText(/AAPL/i)).toBeInTheDocument();

      // Check for recommendation type - use getAllByText since "buy" may appear multiple times
      const buyElements = screen.getAllByText(/buy/i);
      expect(buyElements.length).toBeGreaterThan(0);

      // Check for confidence - 85% from mock data
      const confidenceElements = screen.getAllByText(/85%/i);
      expect(confidenceElements.length).toBeGreaterThan(0);

      // Check for potential return - 11.1% from mock data
      expect(screen.getByText(/\+11\.1%/i)).toBeInTheDocument();
    });

    it('should display risk analysis', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/Portfolio Risk Analysis/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for overall risk - use getAllByText since "medium" appears multiple times
      const mediumElements = screen.getAllByText(/medium/i);
      expect(mediumElements.length).toBeGreaterThan(0);

      // Check for risk score - 65 from mock data
      expect(screen.getByText(/65\/100/)).toBeInTheDocument();

      // Check for risk factor - "Market Volatility" from mock data
      expect(screen.getByText(/Market Volatility/i)).toBeInTheDocument();
    });

    it('should display diversification suggestions', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/Diversification Suggestions/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for asset class - "Bonds" from mock data - use getAllByText since it appears multiple times
      const bondsElements = screen.getAllByText(/Bonds/i);
      expect(bondsElements.length).toBeGreaterThan(0);

      // Check for allocation percentages - use getAllByText since numbers may appear multiple times
      const currentElements = screen.getAllByText(/20%/i);
      expect(currentElements.length).toBeGreaterThan(0);

      const recommendedElements = screen.getAllByText(/30%/i);
      expect(recommendedElements.length).toBeGreaterThan(0);
    });

    it('should display market predictions', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/Market Predictions/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for timeframe - "3 Months" from mock data
      expect(screen.getByText(/3 Months/i)).toBeInTheDocument();

      // Check for predicted return - 5.5% from mock data
      expect(screen.getByText(/\+5\.5%/i)).toBeInTheDocument();

      // Check for confidence - 75% from mock data
      const confidenceElements = screen.getAllByText(/75%/i);
      expect(confidenceElements.length).toBeGreaterThan(0);
    });

    it('should display performance forecasts', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/Performance Forecasts/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for projected value - 105000 from mock data displays as "$105.0K"
      expect(screen.getByText(/\$105\.0K/i)).toBeInTheDocument();

      // Check for projected return - 8.5% from mock data
      expect(screen.getByText(/\+8\.5%/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should toggle expand/collapse', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/AI Investment Intelligence/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Content should be visible initially
      expect(screen.getByText(/Portfolio Health Score/i)).toBeInTheDocument();

      // Find the toggle button by its SVG icon
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn => btn.querySelector('svg'));

      // Use fireEvent instead of user.click to avoid MouseEvent polyfill issues
      if (toggleButton) {
        fireEvent.click(toggleButton);

        // Content should be hidden after click
        await waitFor(() => {
          expect(screen.queryByText(/Portfolio Health Score/i)).not.toBeInTheDocument();
        });
      }
    });

    it('should display risk level badges', async () => {
      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/AI Investment Recommendations/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for risk level (medium from mock data) - use getAllByText since it appears multiple times
      const mediumElements = screen.getAllByText(/medium/i);
      expect(mediumElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API fails', async () => {
      server.use(
        rest.get('http://localhost/api/financial/investments/ai-insights', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Failed to fetch investment insights' })
          );
        })
      );

      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        // Component shows error message
        expect(screen.getByText(/Error loading AI insights/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for error message
      expect(screen.getByText(/Failed to fetch AI investment insights/i)).toBeInTheDocument();

      // Check for retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should allow retry after error', async () => {
      server.use(
        rest.get('http://localhost/api/financial/investments/ai-insights', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Failed to fetch investment insights' })
          );
        })
      );

      renderWithProviders(<AIInvestmentInsights />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading AI insights/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const retryButton = screen.getByRole('button', { name: /retry/i });

      // Use fireEvent instead of user.click
      fireEvent.click(retryButton);

      // Loading state should appear
      await waitFor(() => {
        const loadingElements = document.querySelectorAll('.animate-pulse');
        expect(loadingElements.length).toBeGreaterThan(0);
      });
    });
  });
});

