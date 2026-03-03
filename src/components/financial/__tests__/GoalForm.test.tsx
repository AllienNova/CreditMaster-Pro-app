/**
 * GoalForm Component Tests
 *
 * Tests for the goal creation/editing form with validation and auto-save toggle.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GoalForm from "../GoalForm";

describe("GoalForm", () => {
  const mockOnSave = jest.fn(() => Promise.resolve());
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnSave.mockImplementation(() => Promise.resolve());
  });

  it("renders without crashing", () => {
    render(<GoalForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Create Goal")).toBeInTheDocument();
  });

  it("displays all goal type options", () => {
    render(<GoalForm onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
    expect(screen.getByText("Debt Payoff")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Investment")).toBeInTheDocument();
    expect(screen.getByText("Retirement")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    render(<GoalForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    const submitButton = screen.getByText("Create Goal");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Goal name is required")).toBeInTheDocument();
    });
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("shows validation error for zero target amount", async () => {
    render(<GoalForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/goal name/i);
    fireEvent.change(nameInput, { target: { value: "My Goal" } });

    const targetDateInput = screen.getByLabelText(/target date/i);
    fireEvent.change(targetDateInput, { target: { value: "2027-12-31" } });

    const submitButton = screen.getByText("Create Goal");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Target amount must be greater than 0"),
      ).toBeInTheDocument();
    });
  });

  it("calls onSave with form data when validation passes", async () => {
    render(<GoalForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/goal name/i);
    fireEvent.change(nameInput, { target: { value: "Emergency Fund" } });

    const amountInput = screen.getByLabelText(/target amount/i);
    fireEvent.change(amountInput, { target: { value: "5000" } });

    const targetDateInput = screen.getByLabelText(/target date/i);
    fireEvent.change(targetDateInput, { target: { value: "2027-12-31" } });

    const submitButton = screen.getByText("Create Goal");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it("calls onCancel when cancel button is clicked", () => {
    render(<GoalForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("shows Update Goal button when editing an existing goal", () => {
    const existingGoal = {
      id: "goal-1",
      type: "savings" as const,
      name: "My Savings",
      targetAmount: 10000,
      currentAmount: 2500,
      targetDate: "2027-06-30",
      status: "active" as const,
    };

    render(
      <GoalForm
        goal={existingGoal}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
    );
    expect(screen.getByText("Update Goal")).toBeInTheDocument();
  });

  it("pre-fills form data when editing an existing goal", () => {
    const existingGoal = {
      id: "goal-1",
      type: "savings" as const,
      name: "My Savings",
      targetAmount: 10000,
      currentAmount: 2500,
      targetDate: "2027-06-30",
      status: "active" as const,
    };

    render(
      <GoalForm
        goal={existingGoal}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />,
    );

    const nameInput = screen.getByLabelText(/goal name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("My Savings");
  });

  it("shows Saving... text while saving", async () => {
    mockOnSave.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500)),
    );

    render(<GoalForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/goal name/i);
    fireEvent.change(nameInput, { target: { value: "Test Goal" } });

    const amountInput = screen.getByLabelText(/target amount/i);
    fireEvent.change(amountInput, { target: { value: "1000" } });

    const targetDateInput = screen.getByLabelText(/target date/i);
    fireEvent.change(targetDateInput, { target: { value: "2027-12-31" } });

    const submitButton = screen.getByText("Create Goal");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });
});
