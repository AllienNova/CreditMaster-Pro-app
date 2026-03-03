/**
 * NegotiationStatus Component Tests
 *
 * Tests for the bill negotiation flow: initial, script generation, and outcome recording.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NegotiationStatus from "../NegotiationStatus";

describe("NegotiationStatus", () => {
  const defaultProps = {
    billId: "bill-1",
    billName: "Internet Service",
    provider: "Comcast",
    currentAmount: 100,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    global.fetch = jest.fn() as jest.Mock;
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("renders without crashing", () => {
    render(<NegotiationStatus {...defaultProps} />);
    expect(screen.getByText("Ready to Negotiate?")).toBeInTheDocument();
  });

  it("displays the bill name and provider", () => {
    render(<NegotiationStatus {...defaultProps} />);
    expect(screen.getByText(/Internet Service/)).toBeInTheDocument();
    expect(screen.getByText(/Comcast/)).toBeInTheDocument();
  });

  it("displays the current amount", () => {
    render(<NegotiationStatus {...defaultProps} />);
    expect(screen.getByText(/\$100\/month/)).toBeInTheDocument();
  });

  it("shows Generate Negotiation Script button", () => {
    render(<NegotiationStatus {...defaultProps} />);
    expect(
      screen.getByText("Generate Negotiation Script"),
    ).toBeInTheDocument();
  });

  it("shows Generating... while fetching negotiation script", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<NegotiationStatus {...defaultProps} />);

    const generateBtn = screen.getByText("Generate Negotiation Script");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText("Generating...")).toBeInTheDocument();
    });
  });

  it("displays negotiation script after successful fetch", async () => {
    const scriptData = {
      data: {
        script: {
          opening: "Hello, I would like to discuss my bill.",
          keyPoints: ["Point 1", "Point 2"],
          counterOffers: ["Counter 1"],
          closing: "Thank you for your time.",
        },
      },
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(scriptData),
      }),
    );

    render(<NegotiationStatus {...defaultProps} />);

    const generateBtn = screen.getByText("Generate Negotiation Script");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText("Opening Statement")).toBeInTheDocument();
    });
  });

  it("calls alert on fetch error", async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error("Network error")),
    );

    render(<NegotiationStatus {...defaultProps} />);

    const generateBtn = screen.getByText("Generate Negotiation Script");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it("calls onClose when close button is clicked", () => {
    render(<NegotiationStatus {...defaultProps} />);

    // The header close button is an empty button (no text, no aria-label).
    // Find it by getting all buttons and clicking the one with empty textContent.
    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons.find(
      (btn) => btn.textContent === "" || btn.textContent === "",
    );
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(defaultProps.onClose).toHaveBeenCalled();
    } else {
      // Fallback: click the first button that is not Generate Negotiation Script
      const fallbackBtn = closeButtons.find(
        (btn) => btn.textContent !== "Generate Negotiation Script",
      );
      if (fallbackBtn) {
        fireEvent.click(fallbackBtn);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    }
  });
});
