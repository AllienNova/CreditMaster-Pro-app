/**
 * PlaidLinkButton Component Tests
 *
 * Tests for the Plaid bank account connection button.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PlaidLinkButton from "../PlaidLinkButton";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    loading: false,
  }),
}));

describe("PlaidLinkButton", () => {
  const defaultProps = {
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onSuccess = jest.fn();
    global.fetch = jest.fn();
    window.alert = jest.fn();
  });

  it("renders without crashing", () => {
    const { container } = render(<PlaidLinkButton {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("displays Connect Bank Account button text", () => {
    render(<PlaidLinkButton {...defaultProps} />);
    expect(screen.getByText("Connect Bank Account")).toBeInTheDocument();
  });

  it("renders primary variant by default", () => {
    render(<PlaidLinkButton {...defaultProps} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-blue-600");
  });

  it("renders secondary variant when specified", () => {
    render(<PlaidLinkButton {...defaultProps} variant="secondary" />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("border");
  });

  it("shows Connecting... text while loading", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves to keep loading
    );

    render(<PlaidLinkButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(<PlaidLinkButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("disables button while loading", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<PlaidLinkButton {...defaultProps} />);
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
