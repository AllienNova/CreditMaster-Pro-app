/**
 * Tests for EmptyState Component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  const defaultProps = {
    title: "No data found",
    description: "Try adjusting your filters or search criteria.",
  };

  it("should render title and description", () => {
    render(<EmptyState {...defaultProps} />);
    expect(screen.getByText("No data found")).toBeInTheDocument();
    expect(
      screen.getByText("Try adjusting your filters or search criteria."),
    ).toBeInTheDocument();
  });

  it("should render an SVG illustration", () => {
    const { container } = render(<EmptyState {...defaultProps} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render primary action button", () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        {...defaultProps}
        primaryAction={{ label: "Add Item", onClick }}
      />,
    );
    const button = screen.getByText("Add Item");
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should render secondary action button", () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        {...defaultProps}
        secondaryAction={{ label: "Learn More", onClick }}
      />,
    );
    const button = screen.getByText("Learn More");
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should render both primary and secondary action buttons", () => {
    render(
      <EmptyState
        {...defaultProps}
        primaryAction={{ label: "Create", onClick: jest.fn() }}
        secondaryAction={{ label: "Import", onClick: jest.fn() }}
      />,
    );
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("should not render action buttons when not provided", () => {
    const { container } = render(<EmptyState {...defaultProps} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(0);
  });

  it("should render action button with icon", () => {
    const icon = <span data-testid="custom-icon">+</span>;
    render(
      <EmptyState
        {...defaultProps}
        primaryAction={{ label: "Add", onClick: jest.fn(), icon }}
      />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <EmptyState {...defaultProps} className="my-custom-class" />,
    );
    expect(container.querySelector(".my-custom-class")).toBeInTheDocument();
  });

  it("should render different illustration types", () => {
    const types = [
      "no-data",
      "no-subscriptions",
      "no-rules",
      "no-transactions",
      "no-spending",
      "search-empty",
      "error",
    ] as const;

    types.forEach((type) => {
      const { container, unmount } = render(
        <EmptyState {...defaultProps} type={type} />,
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      unmount();
    });
  });

  it("should default to no-data illustration type", () => {
    const { container } = render(<EmptyState {...defaultProps} />);
    // Default illustration should have gray fill classes
    const circle = container.querySelector("circle");
    expect(circle?.className.baseVal).toContain("fill-gray");
  });
});
