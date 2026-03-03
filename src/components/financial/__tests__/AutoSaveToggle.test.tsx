/**
 * AutoSaveToggle Component Tests
 *
 * Tests for the auto-save toggle with amount editing functionality.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AutoSaveToggle from "../AutoSaveToggle";

describe("AutoSaveToggle", () => {
  const defaultProps = {
    goalId: "goal-1",
    enabled: false,
    amount: 100,
    onToggle: jest.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    defaultProps.onToggle = jest.fn(() => Promise.resolve());
  });

  it("renders without crashing", () => {
    const { container } = render(<AutoSaveToggle {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("shows Auto-Save heading", () => {
    render(<AutoSaveToggle {...defaultProps} />);
    expect(screen.getByText("Auto-Save")).toBeInTheDocument();
  });

  it("displays enable text when disabled", () => {
    render(<AutoSaveToggle {...defaultProps} enabled={false} />);
    expect(
      screen.getByText("Enable automatic monthly savings"),
    ).toBeInTheDocument();
  });

  it("displays formatted amount when enabled", () => {
    render(<AutoSaveToggle {...defaultProps} enabled={true} amount={200} />);
    expect(
      screen.getByText("$200/month automatically saved"),
    ).toBeInTheDocument();
  });

  it("calls onToggle when toggle button is clicked", async () => {
    render(<AutoSaveToggle {...defaultProps} enabled={false} />);

    const toggleButton = screen.getByRole("button");
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(defaultProps.onToggle).toHaveBeenCalledWith(
        "goal-1",
        true,
        100,
      );
    });
  });

  it("shows Edit button and monthly amount when enabled", () => {
    render(<AutoSaveToggle {...defaultProps} enabled={true} amount={100} />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("shows amount editor when Edit is clicked", () => {
    render(<AutoSaveToggle {...defaultProps} enabled={true} amount={100} />);

    fireEvent.click(screen.getByText("Edit"));

    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows info text about automatic transfers when enabled", () => {
    render(<AutoSaveToggle {...defaultProps} enabled={true} amount={100} />);
    expect(
      screen.getByText(
        /Funds will be automatically transferred on the 1st of each month/,
      ),
    ).toBeInTheDocument();
  });
});
