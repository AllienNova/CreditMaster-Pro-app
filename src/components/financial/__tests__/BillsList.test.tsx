/**
 * BillsList Component Tests
 *
 * Tests for the bills list with sorting, filtering, and negotiation actions.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BillsList from "../BillsList";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@test.com" },
  }),
}));

const mockBills = [
  {
    id: "bill-1",
    name: "Internet Service",
    provider: "Comcast",
    amount: 100,
    dueDate: "2026-03-01",
    nextDueDate: "2026-04-01",
    category: "telecom",
    frequency: "monthly",
    status: "active",
    negotiable: true,
    negotiationPotential: 75,
    estimatedSavings: 25,
    autoPayEnabled: false,
  },
  {
    id: "bill-2",
    name: "Electric Bill",
    provider: "Power Co",
    amount: 150,
    dueDate: "2026-03-05",
    nextDueDate: "2026-04-05",
    category: "utilities",
    frequency: "monthly",
    status: "active",
    negotiable: false,
    negotiationPotential: 0,
    estimatedSavings: 0,
    autoPayEnabled: true,
  },
];

describe("BillsList", () => {
  const mockOnSelectBill = jest.fn();
  const mockOnNegotiate = jest.fn();

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockBills }),
      }),
    ) as jest.Mock;
  });

  it("renders loading state initially", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(
      <BillsList
        onSelectBill={mockOnSelectBill}
        onNegotiate={mockOnNegotiate}
      />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("displays Your Bills header after loading", async () => {
    render(
      <BillsList
        onSelectBill={mockOnSelectBill}
        onNegotiate={mockOnNegotiate}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Your Bills")).toBeInTheDocument();
    });
  });

  it("displays bill names and amounts", async () => {
    render(
      <BillsList
        onSelectBill={mockOnSelectBill}
        onNegotiate={mockOnNegotiate}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Internet Service")).toBeInTheDocument();
      expect(screen.getByText("Electric Bill")).toBeInTheDocument();
    });
  });

  it("shows No Bills Found when bill list is empty", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      }),
    ) as jest.Mock;

    render(
      <BillsList
        onSelectBill={mockOnSelectBill}
        onNegotiate={mockOnNegotiate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No Bills Found")).toBeInTheDocument();
    });
  });

  it("calls onNegotiate when negotiate button is clicked", async () => {
    render(
      <BillsList
        onSelectBill={mockOnSelectBill}
        onNegotiate={mockOnNegotiate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Internet Service")).toBeInTheDocument();
    });

    const negotiateButtons = screen.getAllByText("Negotiate");
    if (negotiateButtons.length > 0) {
      fireEvent.click(negotiateButtons[0]);
      expect(mockOnNegotiate).toHaveBeenCalledWith("bill-1");
    }
  });

  it("renders sort and filter controls", async () => {
    render(
      <BillsList
        onSelectBill={mockOnSelectBill}
        onNegotiate={mockOnNegotiate}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Your Bills")).toBeInTheDocument();
    });

    // Should have category filter dropdown with "All Categories"
    expect(screen.getByText("All Categories")).toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network error")),
    ) as jest.Mock;

    render(
      <BillsList
        onSelectBill={mockOnSelectBill}
        onNegotiate={mockOnNegotiate}
      />,
    );

    // Should not crash
    await waitFor(() => {
      expect(
        document.querySelector(".animate-pulse"),
      ).not.toBeInTheDocument();
    });
  });
});
