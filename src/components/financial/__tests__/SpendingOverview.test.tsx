/**
 * SpendingOverview Component Tests
 *
 * Tests for the monthly spending summary with category breakdown and donut chart.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import SpendingOverview from "../SpendingOverview";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const defaultCategories = [
  { name: "Food & Dining", value: 500, color: "#22C55E", percentage: 35 },
  { name: "Shopping", value: 300, color: "#3B82F6", percentage: 21 },
  { name: "Transportation", value: 200, color: "#F59E0B", percentage: 14 },
  { name: "Entertainment", value: 150, color: "#EC4899", percentage: 11 },
  { name: "Bills & Utilities", value: 280, color: "#EF4444", percentage: 19 },
];

describe("SpendingOverview", () => {
  it("renders without crashing", () => {
    render(
      <SpendingOverview
        totalSpent={1430}
        lastMonthSpent={1200}
        categories={defaultCategories}
      />,
    );
    expect(screen.getByText("Spent this month")).toBeInTheDocument();
  });

  it("displays the total spent amount", () => {
    render(
      <SpendingOverview
        totalSpent={1430}
        lastMonthSpent={1200}
        categories={defaultCategories}
      />,
    );
    expect(screen.getByText("$1,430")).toBeInTheDocument();
  });

  it("shows increase indicator when spending is higher than last month", () => {
    render(
      <SpendingOverview
        totalSpent={1430}
        lastMonthSpent={1200}
        categories={defaultCategories}
      />,
    );
    expect(screen.getByText(/vs last month/)).toBeInTheDocument();
  });

  it("shows decrease indicator when spending is lower than last month", () => {
    render(
      <SpendingOverview
        totalSpent={1000}
        lastMonthSpent={1200}
        categories={defaultCategories}
      />,
    );
    expect(screen.getByText(/vs last month/)).toBeInTheDocument();
  });

  it("shows Same as last month when spending is equal", () => {
    render(
      <SpendingOverview
        totalSpent={1200}
        lastMonthSpent={1200}
        categories={defaultCategories}
      />,
    );
    expect(screen.getByText("Same as last month")).toBeInTheDocument();
  });

  it("displays the top category", () => {
    render(
      <SpendingOverview
        totalSpent={1430}
        lastMonthSpent={1200}
        categories={defaultCategories}
      />,
    );
    expect(screen.getByText("Top category")).toBeInTheDocument();
    expect(screen.getAllByText("Food & Dining").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the See details link", () => {
    render(
      <SpendingOverview
        totalSpent={1430}
        lastMonthSpent={1200}
        categories={defaultCategories}
      />,
    );
    const link = screen.getByRole("link", { name: /see details/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard/spending");
  });

  it("shows loading skeleton when isLoading is true", () => {
    const { container } = render(
      <SpendingOverview
        totalSpent={0}
        lastMonthSpent={0}
        categories={[]}
        isLoading={true}
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
