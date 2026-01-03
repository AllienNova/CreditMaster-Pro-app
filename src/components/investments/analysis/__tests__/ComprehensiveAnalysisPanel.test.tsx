/**
 * ComprehensiveAnalysisPanel Component Tests
 *
 * Tests for the comprehensive investment analysis UI component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComprehensiveAnalysisPanel } from '../ComprehensiveAnalysisPanel';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock URL methods for export tests
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('ComprehensiveAnalysisPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render the analyze button', () => {
      render(<ComprehensiveAnalysisPanel />);
      expect(screen.getByRole('button', { name: /Analyze/i })).toBeInTheDocument();
    });

    it('should render with custom symbol', () => {
      render(<ComprehensiveAnalysisPanel symbol="MSFT" />);
      const input = screen.getByPlaceholderText(/Enter symbol/i) as HTMLInputElement;
      expect(input.value).toBe('MSFT');
    });

    it('should render timeframe select', () => {
      render(<ComprehensiveAnalysisPanel />);
      const select = screen.getByDisplayValue('1 Day') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should update symbol input on change', () => {
      render(<ComprehensiveAnalysisPanel />);
      const input = screen.getByPlaceholderText(/Enter symbol/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'tsla' } });
      expect(input.value).toBe('TSLA'); // Should be uppercased
    });

    it('should update timeframe on change', () => {
      render(<ComprehensiveAnalysisPanel />);
      const select = screen.getByDisplayValue('1 Day') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: '1h' } });
      expect(select.value).toBe('1h');
    });

    it('should disable analyze button when symbol is empty', () => {
      render(<ComprehensiveAnalysisPanel symbol="" />);
      const button = screen.getByRole('button', { name: /Analyze/i });
      expect(button).toBeDisabled();
    });

    it('should enable analyze button when symbol is provided', () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);
      const button = screen.getByRole('button', { name: /Analyze/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe('API Calls', () => {
    const mockAnalysisResponse = {
      success: true,
      data: {
        symbol: 'AAPL',
        analyzedAt: '2026-01-03T12:00:00Z',
        currentPrice: 150.25,
        overallSignal: 'buy',
        overallConfidence: 0.85,
        riskLevel: 'moderate',
        compositeScore: {
          overall: 75,
          technical: 80,
          fundamental: 70,
          sentiment: 75,
          pattern: 72,
          confidence: 0.85,
          signal: 'buy',
        },
        correlationAnalysis: {
          overallAlignment: 0.78,
          alignmentLevel: 'strong',
        },
        keyInsights: ['Strong technical momentum', 'Positive earnings trend'],
        risks: ['Market volatility', 'Sector rotation risk'],
        opportunities: ['Growth potential', 'Market expansion'],
        summary: 'Strong buy signal with high confidence',
      },
    };

    it('should call API when analyze button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockAnalysisResponse,
      });

      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/investments/comprehensive-analysis',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              symbol: 'AAPL',
              timeframe: '1d',
            }),
          })
        );
      });
    });

    it('should display loading state during API call', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ json: async () => mockAnalysisResponse }), 100)
          )
      );

      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(button);

      // Button should show loading state
      expect(button).toHaveTextContent(/Analyzing/i);
      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).not.toHaveTextContent(/Analyzing/i);
      });
    });
  });

  describe('Analysis Results Display', () => {
    const mockAnalysisResponse = {
      success: true,
      data: {
        symbol: 'AAPL',
        analyzedAt: '2026-01-03T12:00:00Z',
        currentPrice: 150.25,
        overallSignal: 'buy',
        overallConfidence: 0.85,
        riskLevel: 'moderate',
        compositeScore: {
          overall: 75,
          technical: 80,
          fundamental: 70,
          sentiment: 75,
          pattern: 72,
          confidence: 0.85,
          signal: 'buy',
        },
        correlationAnalysis: {
          overallAlignment: 0.78,
          alignmentLevel: 'strong',
        },
        keyInsights: ['Strong technical momentum', 'Positive earnings trend'],
        risks: ['Market volatility', 'Sector rotation risk'],
        opportunities: ['Growth potential', 'Market expansion'],
        summary: 'Strong buy signal with high confidence',
      },
    };

    it('should display analysis results after successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockAnalysisResponse,
      });

      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(button);

      await waitFor(() => {
        // Check that the price is displayed
        expect(screen.getByText(/150\.25/)).toBeInTheDocument();
      });
    });

    it('should handle network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(button);

      await waitFor(() => {
        // Error message should be displayed
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    const mockAnalysisResponse = {
      success: true,
      data: {
        symbol: 'AAPL',
        analyzedAt: '2026-01-03T12:00:00Z',
        currentPrice: 150.25,
        overallSignal: 'buy',
        overallConfidence: 0.85,
        riskLevel: 'moderate',
        compositeScore: {
          overall: 75,
          technical: 80,
          fundamental: 70,
          sentiment: 75,
          pattern: 72,
          confidence: 0.85,
          signal: 'buy',
        },
        correlationAnalysis: {
          overallAlignment: 0.78,
          alignmentLevel: 'strong',
        },
        keyInsights: ['Strong technical momentum'],
        risks: ['Market volatility'],
        opportunities: ['Growth potential'],
        summary: 'Strong buy signal',
      },
    };

    let mockAnchor: any;

    beforeEach(() => {
      // Mock document.createElement and appendChild/removeChild
      mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor);
    });

    it('should not show export buttons before analysis', () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      expect(screen.queryByRole('button', { name: /CSV/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /JSON/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /PDF/i })).not.toBeInTheDocument();
    });

    it('should show export buttons after successful analysis', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockAnalysisResponse,
      });

      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /CSV/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /JSON/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /PDF/i })).toBeInTheDocument();
      });
    });

    it('should trigger CSV export when CSV button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => mockAnalysisResponse,
      });

      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /CSV/i })).toBeInTheDocument();
      });

      const csvButton = screen.getByRole('button', { name: /CSV/i });
      fireEvent.click(csvButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
      });
    });
  });
});

