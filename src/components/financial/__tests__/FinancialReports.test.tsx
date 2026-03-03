/**
 * FinancialReports Component Tests
 *
 * Tests for the financial reports generation with type/format selection and saved reports.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FinancialReports from "../FinancialReports";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

jest.mock("@/components/ui/Icon", () => ({
  Icon: (props: { name: string; className?: string }) => (
    <span data-testid="mock-icon">{props.name}</span>
  ),
}));

describe("FinancialReports", () => {
  beforeEach(() => {
    jest.spyOn(window, "alert").mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders without crashing", () => {
    render(<FinancialReports />);
    expect(screen.getByText("Generate New Report")).toBeInTheDocument();
  });

  it("displays report type buttons", () => {
    render(<FinancialReports />);
    expect(screen.getByText("monthly")).toBeInTheDocument();
    expect(screen.getByText("quarterly")).toBeInTheDocument();
    expect(screen.getByText("annual")).toBeInTheDocument();
    expect(screen.getByText("custom")).toBeInTheDocument();
  });

  it("displays format buttons", () => {
    render(<FinancialReports />);
    // "pdf" appears in the format button AND in saved reports spans, so use getAllByText
    expect(screen.getAllByText("pdf").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("csv").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("excel").length).toBeGreaterThanOrEqual(1);
  });

  it("has a Generate Report button", () => {
    render(<FinancialReports />);
    expect(screen.getByText("Generate Report")).toBeInTheDocument();
  });

  it("shows Generating Report... while generating", async () => {
    render(<FinancialReports />);

    const generateBtn = screen.getByText("Generate Report");
    fireEvent.click(generateBtn);

    expect(screen.getByText("Generating Report...")).toBeInTheDocument();
  });

  it("calls alert after report generation completes", async () => {
    render(<FinancialReports />);

    const generateBtn = screen.getByText("Generate Report");
    fireEvent.click(generateBtn);

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it("displays saved reports", () => {
    render(<FinancialReports />);
    expect(screen.getByText("Saved Reports")).toBeInTheDocument();
  });

  it("displays Quick Report Templates", () => {
    render(<FinancialReports />);
    expect(screen.getByText("Quick Report Templates")).toBeInTheDocument();
    expect(screen.getByText("Monthly Summary")).toBeInTheDocument();
    expect(screen.getByText("Tax Report")).toBeInTheDocument();
    expect(screen.getByText("Net Worth Statement")).toBeInTheDocument();
  });

  it("has include checkboxes", () => {
    render(<FinancialReports />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
  });
});
