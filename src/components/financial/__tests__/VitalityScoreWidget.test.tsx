/**
 * VitalityScoreWidget Component Tests
 *
 * Tests for the financial vitality score display with circular progress and trend.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { VitalityScoreWidget } from "../VitalityScoreWidget";

// Mock heroicons
jest.mock("@heroicons/react/24/solid", () => ({
  ArrowTrendingUpIcon: (props: any) => (
    <svg data-testid="arrow-up-icon" {...props} />
  ),
  ArrowTrendingDownIcon: (props: any) => (
    <svg data-testid="arrow-down-icon" {...props} />
  ),
  MinusIcon: (props: any) => <svg data-testid="minus-icon" {...props} />,
  SparklesIcon: (props: any) => (
    <svg data-testid="sparkles-icon" {...props} />
  ),
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

describe("VitalityScoreWidget", () => {
  const defaultProps = {
    score: 82,
    grade: "B" as const,
    trend: "improving" as const,
    trendPercentage: 5,
    percentile: 75,
  };

  it("renders without crashing", () => {
    const { container } = render(<VitalityScoreWidget {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("displays the score number", () => {
    render(<VitalityScoreWidget {...defaultProps} />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("displays the grade", () => {
    render(<VitalityScoreWidget {...defaultProps} />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("displays the Financial Vitality Score heading", () => {
    render(<VitalityScoreWidget {...defaultProps} />);
    expect(
      screen.getByText("Financial Vitality Score"),
    ).toBeInTheDocument();
  });

  it("displays percentile text", () => {
    render(<VitalityScoreWidget {...defaultProps} />);
    expect(
      screen.getByText("You're doing better than 75% of users"),
    ).toBeInTheDocument();
  });

  it("shows improving trend indicator with up arrow", () => {
    render(<VitalityScoreWidget {...defaultProps} />);
    expect(screen.getByTestId("arrow-up-icon")).toBeInTheDocument();
    expect(screen.getByText("+5%")).toBeInTheDocument();
  });

  it("shows declining trend indicator with down arrow", () => {
    render(
      <VitalityScoreWidget
        {...defaultProps}
        trend="declining"
        trendPercentage={3}
      />,
    );
    expect(screen.getByTestId("arrow-down-icon")).toBeInTheDocument();
    expect(screen.getByText("3%")).toBeInTheDocument();
  });

  it("shows stable trend indicator", () => {
    render(<VitalityScoreWidget {...defaultProps} trend="stable" />);
    expect(screen.getByTestId("minus-icon")).toBeInTheDocument();
    expect(screen.getByText("Stable")).toBeInTheDocument();
  });

  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(
      <VitalityScoreWidget {...defaultProps} isLoading={true} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("82")).not.toBeInTheDocument();
  });

  it("renders View full breakdown link", () => {
    render(<VitalityScoreWidget {...defaultProps} />);
    const link = screen.getByText(/View full breakdown/);
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/vitality",
    );
  });
});
