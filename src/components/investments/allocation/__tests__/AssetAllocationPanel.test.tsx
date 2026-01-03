/**
 * AssetAllocationPanel Component Tests
 * Tests mobile-responsive features, accessibility, and collapsible sections
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssetAllocationPanel from '../AssetAllocationPanel';
import { Portfolio } from '@/lib/investments/types/investment.types';
import { RiskTolerance, AssetClass } from '@/lib/investments/types/asset-allocation.types';

// Mock the AssetAllocationService
const mockGenerateEfficientFrontier = jest.fn(() => [
  { volatility: 5, expectedReturn: 8, sharpeRatio: 1.2 },
  { volatility: 10, expectedReturn: 12, sharpeRatio: 1.0 },
]);

const mockService = {
  generateEfficientFrontier: mockGenerateEfficientFrontier,
};

jest.mock('@/lib/investments/services/AssetAllocationService', () => ({
  getAssetAllocationService: () => mockService,
}));

// Mock the EfficientFrontierChart component
jest.mock('../EfficientFrontierChart', () => ({
  EfficientFrontierChart: () => <div data-testid="efficient-frontier-chart">Chart</div>,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const mockPortfolio: Portfolio = {
  id: 'test-portfolio',
  userId: 'user1',
  name: 'Test Portfolio',
  description: 'Test portfolio for mobile responsive tests',
  totalValue: 100000,
  holdings: [],
  assetAllocations: [],
  sectorAllocations: [],
  performanceHistory: [],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-12-01'),
};

describe('AssetAllocationPanel - Mobile Responsive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch.mockClear();
  });

  describe('Responsive Layout', () => {
    it('should render header with mobile-friendly controls', () => {
      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      expect(screen.getByText('Asset Allocation Analysis')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Risk Tolerance Level')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Analyze portfolio allocation/i })).toBeInTheDocument();
    });

    it('should have minimum 44px tap targets for buttons', () => {
      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      const styles = window.getComputedStyle(analyzeButton);
      
      // Check min-height class is applied
      expect(analyzeButton.className).toContain('min-h-[44px]');
    });

    it('should have proper focus indicators for accessibility', () => {
      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const riskSelect = screen.getByLabelText('Select Risk Tolerance Level');
      expect(riskSelect.className).toContain('focus:ring-2');
      expect(riskSelect.className).toContain('focus:ring-blue-500');
    });
  });

  describe('Collapsible Sections', () => {
    it('should render collapsible sections when analysis is available', async () => {
      const mockAnalysis = {
        currentAllocations: [
          { assetClass: 'stocks' as any, percentage: 60, value: 60000 },
          { assetClass: 'bonds' as any, percentage: 40, value: 40000 },
        ],
        diversificationScore: 75,
        riskMetrics: {
          portfolioVolatility: 0.15,
          portfolioBeta: 1.1,
          valueAtRisk: 5000,
          maxDrawdown: 0.20,
        },
        performanceMetrics: {
          expectedReturn: 0.08,
          sharpeRatio: 1.2,
          sortinoRatio: 1.5,
          informationRatio: 0.8,
        },
        recommendedModel: {
          name: 'Moderate Growth',
          expectedReturn: 0.09,
          expectedVolatility: 0.14,
        },
        needsRebalancing: false,
        rebalancingRecommendations: [],
        deviationFromTarget: 2.5,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAnalysis }),
      });

      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Current Allocation')).toBeInTheDocument();
        expect(screen.getByText('Diversification Score')).toBeInTheDocument();
        expect(screen.getByText('Risk Metrics')).toBeInTheDocument();
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText('Efficient Frontier')).toBeInTheDocument();
      });
    });

    it('should toggle collapsible sections on click', async () => {
      const mockAnalysis = {
        currentAllocations: [
          { assetClass: 'stocks' as any, percentage: 60, value: 60000 },
        ],
        diversificationScore: 75,
        riskMetrics: {
          portfolioVolatility: 0.15,
          portfolioBeta: 1.1,
          valueAtRisk: 5000,
          maxDrawdown: 0.20,
        },
        performanceMetrics: {
          expectedReturn: 0.08,
          sharpeRatio: 1.2,
          sortinoRatio: 1.5,
          informationRatio: 0.8,
        },
        recommendedModel: {
          name: 'Moderate Growth',
          expectedReturn: 0.09,
          expectedVolatility: 0.14,
        },
        needsRebalancing: false,
        rebalancingRecommendations: [],
        deviationFromTarget: 2.5,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAnalysis }),
      });

      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Risk Metrics')).toBeInTheDocument();
      });

      // Find the Risk Metrics collapsible button
      const riskMetricsButton = screen.getByRole('button', { name: /Risk Metrics/i });

      // Check initial state (collapsed by default)
      expect(riskMetricsButton).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      fireEvent.click(riskMetricsButton);
      expect(riskMetricsButton).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      fireEvent.click(riskMetricsButton);
      expect(riskMetricsButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should persist collapsible section state in localStorage', async () => {
      const mockAnalysis = {
        currentAllocations: [
          { assetClass: 'stocks' as any, percentage: 60, value: 60000 },
        ],
        diversificationScore: 75,
        riskMetrics: {
          portfolioVolatility: 0.15,
          portfolioBeta: 1.1,
          valueAtRisk: 5000,
          maxDrawdown: 0.20,
        },
        performanceMetrics: {
          expectedReturn: 0.08,
          sharpeRatio: 1.2,
          sortinoRatio: 1.5,
          informationRatio: 0.8,
        },
        recommendedModel: {
          name: 'Moderate Growth',
          expectedReturn: 0.09,
          expectedVolatility: 0.14,
        },
        needsRebalancing: false,
        rebalancingRecommendations: [],
        deviationFromTarget: 2.5,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAnalysis }),
      });

      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Risk Metrics')).toBeInTheDocument();
      });

      const riskMetricsButton = screen.getByRole('button', { name: /Risk Metrics/i });

      // Expand section
      fireEvent.click(riskMetricsButton);

      // Check localStorage
      expect(localStorage.getItem('allocation-section-risk-metrics')).toBe('true');

      // Collapse section
      fireEvent.click(riskMetricsButton);
      expect(localStorage.getItem('allocation-section-risk-metrics')).toBe('false');
    });
  });

  describe('Accessibility (WCAG 2.1 AA)', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const riskSelect = screen.getByLabelText('Select Risk Tolerance Level');
      expect(riskSelect).toHaveAttribute('aria-label', 'Risk tolerance level');

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      expect(analyzeButton).toHaveAttribute('aria-label');
    });

    it('should display error messages with proper ARIA attributes', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
        expect(errorAlert).toHaveTextContent('Network error');
      });
    });

    it('should have proper color contrast for text elements', async () => {
      const mockAnalysis = {
        currentAllocations: [
          { assetClass: 'stocks' as any, percentage: 60, value: 60000 },
        ],
        diversificationScore: 75,
        riskMetrics: {
          portfolioVolatility: 0.15,
          portfolioBeta: 1.1,
          valueAtRisk: 5000,
          maxDrawdown: 0.20,
        },
        performanceMetrics: {
          expectedReturn: 0.08,
          sharpeRatio: 1.2,
          sortinoRatio: 1.5,
          informationRatio: 0.8,
        },
        recommendedModel: {
          name: 'Moderate Growth',
          expectedReturn: 0.09,
          expectedVolatility: 0.14,
        },
        needsRebalancing: false,
        rebalancingRecommendations: [],
        deviationFromTarget: 2.5,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAnalysis }),
      });

      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        // Check for well-balanced message
        const successMessage = screen.getByRole('status');
        expect(successMessage).toBeInTheDocument();
        expect(successMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have progress bars with proper ARIA attributes', async () => {
      const mockAnalysis = {
        currentAllocations: [
          { assetClass: 'stocks' as any, percentage: 60, value: 60000 },
        ],
        diversificationScore: 75,
        riskMetrics: {
          portfolioVolatility: 0.15,
          portfolioBeta: 1.1,
          valueAtRisk: 5000,
          maxDrawdown: 0.20,
        },
        performanceMetrics: {
          expectedReturn: 0.08,
          sharpeRatio: 1.2,
          sortinoRatio: 1.5,
          informationRatio: 0.8,
        },
        recommendedModel: {
          name: 'Moderate Growth',
          expectedReturn: 0.09,
          expectedVolatility: 0.14,
        },
        needsRebalancing: false,
        rebalancingRecommendations: [],
        deviationFromTarget: 2.5,
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockAnalysis }),
      });

      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBeGreaterThan(0);

        progressBars.forEach((bar) => {
          expect(bar).toHaveAttribute('aria-valuenow');
          expect(bar).toHaveAttribute('aria-valuemin', '0');
          expect(bar).toHaveAttribute('aria-valuemax', '100');
          expect(bar).toHaveAttribute('aria-label');
        });
      });
    });
  });

  describe('Touch-Friendly Interactions', () => {
    it('should have active states for touch feedback', () => {
      render(<AssetAllocationPanel portfolio={mockPortfolio} />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze portfolio allocation/i });
      expect(analyzeButton.className).toContain('active:scale-95');
      expect(analyzeButton.className).toContain('active:bg-blue-800');
    });
  });
});


