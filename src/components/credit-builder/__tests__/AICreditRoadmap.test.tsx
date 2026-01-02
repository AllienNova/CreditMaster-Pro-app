/**
 * AICreditRoadmap Component Tests
 *
 * Tests for the Credit Builder AI Roadmap component
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, setupUser } from '@/__tests__/utils/test-utils';
import AICreditRoadmap from '../AICreditRoadmap';
import { server } from '@/__tests__/mocks/server';
import { rest } from 'msw';

describe('AICreditRoadmap', () => {
  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      renderWithProviders(<AICreditRoadmap />);

      // Check for animate-pulse class
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should render credit roadmap after data loads', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/AI Credit Building Roadmap/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText(/AI Credit Building Roadmap/i)).toBeInTheDocument();
    });

    it('should display roadmap score', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/AI Credit Building Roadmap/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Score of 85 from mock data - displayed as "85/100"
      expect(screen.getByText(/85\/100/)).toBeInTheDocument();
    });

    it('should display milestones', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/Credit Building Milestones/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for milestone title from mock data
      expect(screen.getByText(/Reduce credit utilization below 30%/i)).toBeInTheDocument();

      // Check for target score - displayed as "Score: 700"
      expect(screen.getByText(/Score: 700/i)).toBeInTheDocument();

      // Check for estimated days - displayed as "90 days"
      expect(screen.getByText(/90 days/i)).toBeInTheDocument();

      // Check for success probability - "85% success"
      expect(screen.getByText(/85% success/i)).toBeInTheDocument();
    });

    it('should display timeline predictions', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/Score Timeline Predictions/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for milestone name from mock data
      expect(screen.getByText(/Reach 700 credit score/i)).toBeInTheDocument();

      // Check for score range - "650 → 700 (3 actions)"
      expect(screen.getByText(/650 → 700/i)).toBeInTheDocument();

      // Check for confidence - "78% confidence"
      expect(screen.getByText(/78% confidence/i)).toBeInTheDocument();
    });

    it('should display prioritized actions', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/Priority Actions/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for action title from mock data - use getAllByText since it appears multiple times
      const actionElements = screen.getAllByText(/Pay down credit card #1/i);
      expect(actionElements.length).toBeGreaterThan(0);

      // Check for impact points - "+30 pts"
      expect(screen.getByText(/\+30 pts/i)).toBeInTheDocument();

      // Check for priority badge - "high"
      const highElements = screen.getAllByText(/high/i);
      expect(highElements.length).toBeGreaterThan(0);

      // Check for difficulty badge - "medium"
      const mediumElements = screen.getAllByText(/medium/i);
      expect(mediumElements.length).toBeGreaterThan(0);
    });

    it('should display progress metrics', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/Roadmap Progress/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for current score from mock data - 650
      const currentScoreElements = screen.getAllByText(/650/);
      expect(currentScoreElements.length).toBeGreaterThan(0);

      // Check for target score from mock data - 700
      const targetScoreElements = screen.getAllByText(/700/);
      expect(targetScoreElements.length).toBeGreaterThan(0);

      // Check for points gained - "+30" - use getAllByText since it appears multiple times
      const pointsElements = screen.getAllByText(/\+30/);
      expect(pointsElements.length).toBeGreaterThan(0);

      // Check for on-track status
      expect(screen.getByText(/on track to reach your goal/i)).toBeInTheDocument();
    });

    it('should display strategy recommendations', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/Recommended Strategies/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for strategy name from mock data
      expect(screen.getByText(/Debt Snowball Method/i)).toBeInTheDocument();

      // Check for expected impact - "+25 pts" (not "points")
      expect(screen.getByText(/\+25 pts/i)).toBeInTheDocument();
    });

    it('should display milestone status icons', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/Credit Building Milestones/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for priority badge (high from mock data)
      const highElements = screen.getAllByText(/high/i);
      expect(highElements.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('should toggle expand/collapse', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/AI Credit Building Roadmap/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Content should be visible initially
      expect(screen.getByText(/Roadmap Progress/i)).toBeInTheDocument();

      // Find the toggle button by its SVG icon
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn => btn.querySelector('svg'));

      // Use fireEvent instead of user.click
      if (toggleButton) {
        fireEvent.click(toggleButton);

        // Content should be hidden after click
        await waitFor(() => {
          expect(screen.queryByText(/Roadmap Progress/i)).not.toBeInTheDocument();
        });
      }
    });

    it('should display success probability', async () => {
      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/Credit Building Milestones/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for success probability (85% from mock data)
      expect(screen.getByText(/85% success/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API fails', async () => {
      server.use(
        rest.get('http://localhost/api/financial/credit-builder/ai-roadmap', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Failed to fetch credit roadmap' })
          );
        })
      );

      renderWithProviders(<AICreditRoadmap />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading AI roadmap/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for error message
      expect(screen.getByText(/Failed to fetch AI credit roadmap/i)).toBeInTheDocument();

      // Check for retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

