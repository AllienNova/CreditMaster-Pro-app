/**
 * GoalCard Component Tests
 *
 * Tests for the individual goal card with progress, milestones, and actions.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GoalCard from "../GoalCard";

const mockGoal = {
  id: "goal-1",
  type: "emergency_fund" as const,
  name: "Emergency Fund",
  targetAmount: 10000,
  currentAmount: 5000,
  targetDate: "2027-01-01",
  status: "active" as const,
  autoSaveEnabled: true,
  autoSaveAmount: 200,
  milestones: [
    {
      id: "m1",
      amount: 2500,
      date: new Date("2026-06-01"),
      achieved: true,
      description: "Quarter way",
    },
    {
      id: "m2",
      amount: 5000,
      date: new Date("2026-09-01"),
      achieved: true,
      description: "Halfway",
    },
    {
      id: "m3",
      amount: 7500,
      date: new Date("2026-12-01"),
      achieved: false,
      description: "Three quarters",
    },
  ],
  createdAt: "2026-01-01T00:00:00Z",
};

describe("GoalCard", () => {
  const defaultProps = {
    goal: mockGoal,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onToggleAutoSave: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onEdit = jest.fn();
    defaultProps.onDelete = jest.fn();
    defaultProps.onToggleAutoSave = jest.fn();
  });

  it("renders without crashing", () => {
    const { container } = render(<GoalCard {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("displays goal name", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
  });

  it("displays status badge", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("displays progress amounts", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText(/\$5,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$10,000/)).toBeInTheDocument();
  });

  it("displays progress percentage", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("50.0% complete")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Edit goal"));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockGoal);
  });

  it("calls onDelete when delete button is clicked", () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Delete goal"));
    expect(defaultProps.onDelete).toHaveBeenCalledWith("goal-1");
  });

  it("shows auto-save section for active goals", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("Auto-Save")).toBeInTheDocument();
    expect(screen.getByText("$200/month")).toBeInTheDocument();
  });

  it("shows milestones toggle with count", () => {
    render(<GoalCard {...defaultProps} />);
    expect(screen.getByText("Milestones (2/3)")).toBeInTheDocument();
  });

  it("expands milestones when toggle is clicked", () => {
    render(<GoalCard {...defaultProps} />);
    fireEvent.click(screen.getByText("Milestones (2/3)"));
    expect(screen.getByText("Quarter way")).toBeInTheDocument();
    expect(screen.getByText("Halfway")).toBeInTheDocument();
    expect(screen.getByText("Three quarters")).toBeInTheDocument();
  });

  it("does not show auto-save for completed goals", () => {
    const completedGoal = { ...mockGoal, status: "completed" as const };
    render(<GoalCard {...defaultProps} goal={completedGoal} />);
    expect(screen.queryByText("Auto-Save")).not.toBeInTheDocument();
  });
});
