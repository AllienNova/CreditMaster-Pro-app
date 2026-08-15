/**
 * QuickActionsBar Component Tests
 *
 * Tests for the quick navigation bar linking to all financial tools.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import QuickActionsBar from "../QuickActionsBar";

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock Icon component
jest.mock("@/components/ui/Icon", () => ({
  Icon: ({ name, ...props }: any) => (
    <span data-testid={`icon-${name}`} {...props}>
      {name}
    </span>
  ),
}));

describe("QuickActionsBar", () => {
  it("renders without crashing", () => {
    const { container } = render(<QuickActionsBar />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders the Quick Actions heading", () => {
    render(<QuickActionsBar />);
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });

  it("renders all six quick action links", () => {
    render(<QuickActionsBar />);
    expect(screen.getByText("Smart Budget")).toBeInTheDocument();
    expect(screen.getByText("Financial Goals")).toBeInTheDocument();
    expect(screen.getByText("Spending Analysis")).toBeInTheDocument();
    expect(screen.getByText("Bills & Negotiation")).toBeInTheDocument();
    expect(screen.getByText("Savings Optimizer")).toBeInTheDocument();
    expect(screen.getByText("Health Score")).toBeInTheDocument();
  });

  it("renders correct href for each action", () => {
    render(<QuickActionsBar />);
    expect(
      screen.getByText("Smart Budget").closest("a"),
    ).toHaveAttribute("href", "/financial/smart-budget");
    expect(
      screen.getByText("Financial Goals").closest("a"),
    ).toHaveAttribute("href", "/financial/goals");
    expect(
      screen.getByText("Health Score").closest("a"),
    ).toHaveAttribute("href", "/financial-hub");
  });

  it("renders additional action links (Transactions, Reports, Settings)", () => {
    render(<QuickActionsBar />);
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders correct hrefs for additional actions", () => {
    render(<QuickActionsBar />);
    expect(
      screen.getByText("Transactions").closest("a"),
    ).toHaveAttribute("href", "/financial/transactions");
    expect(
      screen.getByText("Reports").closest("a"),
    ).toHaveAttribute("href", "/financial/reports");
    expect(
      screen.getByText("Settings").closest("a"),
    ).toHaveAttribute("href", "/financial/settings");
  });

  it("renders descriptions for each quick action", () => {
    render(<QuickActionsBar />);
    expect(
      screen.getByText("AI-powered budget recommendations"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Track and achieve your goals"),
    ).toBeInTheDocument();
  });
});
