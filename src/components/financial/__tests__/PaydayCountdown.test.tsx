/**
 * PaydayCountdown Component Tests
 *
 * Tests for the payday countdown widget with circular progress and states.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import PaydayCountdown from "../PaydayCountdown";

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

describe("PaydayCountdown", () => {
  it("renders without crashing with default props", () => {
    render(<PaydayCountdown />);
    expect(screen.getByText("Today's payday!")).toBeInTheDocument();
  });

  it("shows loading skeleton when isLoading is true", () => {
    const { container } = render(<PaydayCountdown isLoading={true} />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows empty state when hasIncomeSources is false", () => {
    render(<PaydayCountdown hasIncomeSources={false} />);
    expect(screen.getByText("Track Your Payday")).toBeInTheDocument();
    expect(screen.getByText("Add Income")).toBeInTheDocument();
  });

  it("displays payday message when daysUntilPayday is 0", () => {
    render(
      <PaydayCountdown
        daysUntilPayday={0}
        expectedAmount={3000}
        sourceName="Salary"
        percentComplete={100}
      />,
    );
    expect(screen.getByText("Payday!")).toBeInTheDocument();
    expect(screen.getByText("Today's payday!")).toBeInTheDocument();
  });

  it("displays tomorrow message when daysUntilPayday is 1", () => {
    render(
      <PaydayCountdown
        daysUntilPayday={1}
        expectedAmount={3000}
        sourceName="Salary"
        percentComplete={95}
      />,
    );
    expect(screen.getByText("Payday tomorrow!")).toBeInTheDocument();
    expect(screen.getByText("day")).toBeInTheDocument();
  });

  it("displays the expected amount and source name", () => {
    render(
      <PaydayCountdown
        daysUntilPayday={5}
        expectedAmount={3000}
        sourceName="Salary"
        percentComplete={75}
      />,
    );
    expect(screen.getByText("$3,000")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
  });

  it("displays the pay period percentage", () => {
    render(
      <PaydayCountdown
        daysUntilPayday={5}
        expectedAmount={3000}
        percentComplete={75}
      />,
    );
    expect(screen.getByText("75% through pay period")).toBeInTheDocument();
  });

  it("renders manage income sources link", () => {
    render(<PaydayCountdown daysUntilPayday={5} />);
    const link = screen.getByRole("link", {
      name: /manage income sources/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/financial/income");
  });
});
