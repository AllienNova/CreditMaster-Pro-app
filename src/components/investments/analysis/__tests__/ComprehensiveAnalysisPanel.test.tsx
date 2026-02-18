/**
 * ComprehensiveAnalysisPanel Component Tests
 *
 * Tests for the comprehensive investment analysis UI component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ComprehensiveAnalysisPanel } from "../ComprehensiveAnalysisPanel";

// Mock useMarketDataWebSocket hook
jest.mock("@/hooks/useMarketDataWebSocket", () => ({
  useMarketDataWebSocket: () => ({
    priceUpdate: null,
    status: "disconnected" as const,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

// Mock URL methods for export tests
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

describe("ComprehensiveAnalysisPanel", () => {
  beforeEach(() => {
    // Clear URL mocks only - let MSW handle fetch
    (global.URL.createObjectURL as jest.Mock).mockClear();
    (global.URL.revokeObjectURL as jest.Mock).mockClear();
  });

  describe("Component Rendering", () => {
    it("should render the analyze button", () => {
      render(<ComprehensiveAnalysisPanel />);
      expect(
        screen.getByRole("button", { name: /Analyze/i }),
      ).toBeInTheDocument();
    });

    it("should render with custom symbol", () => {
      render(<ComprehensiveAnalysisPanel symbol="MSFT" />);
      const input = screen.getByPlaceholderText(
        /Enter symbol/i,
      ) as HTMLInputElement;
      expect(input.value).toBe("MSFT");
    });

    it("should render timeframe select", () => {
      render(<ComprehensiveAnalysisPanel />);
      const select = screen.getByDisplayValue("1 Day") as HTMLSelectElement;
      expect(select).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should update symbol input on change", () => {
      render(<ComprehensiveAnalysisPanel />);
      const input = screen.getByPlaceholderText(
        /Enter symbol/i,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "tsla" } });
      expect(input.value).toBe("TSLA"); // Should be uppercased
    });

    it("should update timeframe on change", () => {
      render(<ComprehensiveAnalysisPanel />);
      const select = screen.getByDisplayValue("1 Day") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "1h" } });
      expect(select.value).toBe("1h");
    });

    it("should disable analyze button when symbol is empty", () => {
      render(<ComprehensiveAnalysisPanel symbol="" />);
      const button = screen.getByRole("button", { name: /Analyze/i });
      expect(button).toBeDisabled();
    });

    it("should enable analyze button when symbol is provided", () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);
      const button = screen.getByRole("button", { name: /Analyze/i });
      expect(button).not.toBeDisabled();
    });
  });

  describe("API Calls", () => {
    // MSW handler will automatically return mock data for /api/investments/comprehensive-analysis
    // No need to manually mock fetch - MSW handles it

    it("should call API when analyze button is clicked", async () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole("button", { name: /Analyze/i });
      fireEvent.click(button);

      // Wait for the analysis results to appear (MSW will return mock data)
      await waitFor(
        () => {
          // Check that analysis results are displayed (look for BUY signal)
          const text = screen.getByText(/BUY/);
          expect(text).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should display loading state during API call", async () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole("button", { name: /Analyze/i });
      fireEvent.click(button);

      // Button should show loading state immediately
      expect(button).toHaveTextContent(/Analyzing/i);
      expect(button).toBeDisabled();

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(button).not.toHaveTextContent(/Analyzing/i);
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Analysis Results Display", () => {
    // MSW handler will automatically return mock data

    it("should display analysis results after successful API call", async () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole("button", { name: /Analyze/i });
      fireEvent.click(button);

      await waitFor(
        () => {
          // Check that analysis results are displayed (look for BUY signal)
          const text = screen.getByText(/BUY/);
          expect(text).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should handle network error gracefully", async () => {
      // Import server to override handler for this test
      const { server } = require("@/__tests__/mocks/server");
      const { rest } = require("msw");

      // Override MSW handler to return error for this test only
      server.use(
        rest.post(
          "http://localhost/api/investments/comprehensive-analysis",
          (req: any, res: any, ctx: any) => {
            return res(
              ctx.status(500),
              ctx.json({ success: false, error: "Network error" }),
            );
          },
        ),
      );

      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole("button", { name: /Analyze/i });
      fireEvent.click(button);

      await waitFor(
        () => {
          // Error message should be displayed - look for the text content
          expect(screen.getByText(/Network error/)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Export Functionality", () => {
    // MSW handler will automatically return mock data

    it("should not show export buttons before analysis", () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      // Export buttons should not be visible before analysis
      expect(screen.queryByText(/CSV/)).not.toBeInTheDocument();
      expect(screen.queryByText(/JSON/)).not.toBeInTheDocument();
      expect(screen.queryByText(/PDF/)).not.toBeInTheDocument();
    });

    it("should show export buttons after successful analysis", async () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const button = screen.getByRole("button", { name: /Analyze/i });
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(screen.getByText(/CSV/)).toBeInTheDocument();
          expect(screen.getByText(/JSON/)).toBeInTheDocument();
          expect(screen.getByText(/PDF/)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should trigger CSV export when CSV button is clicked", async () => {
      render(<ComprehensiveAnalysisPanel symbol="AAPL" />);

      const analyzeButton = screen.getByRole("button", { name: /Analyze/i });
      fireEvent.click(analyzeButton);

      await waitFor(
        () => {
          expect(screen.getByText(/CSV/)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Now set up mocks for export functionality AFTER component is rendered
      const mockAnchor = {
        href: "",
        download: "",
        click: jest.fn(),
      };
      const createElementSpy = jest
        .spyOn(document, "createElement")
        .mockReturnValue(mockAnchor as any);
      const appendChildSpy = jest
        .spyOn(document.body, "appendChild")
        .mockImplementation(() => mockAnchor as any);
      const removeChildSpy = jest
        .spyOn(document.body, "removeChild")
        .mockImplementation(() => mockAnchor as any);

      const csvButton = screen.getByText(/CSV/);
      fireEvent.click(csvButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(createElementSpy).toHaveBeenCalledWith("a");
      });

      // Clean up spies
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
