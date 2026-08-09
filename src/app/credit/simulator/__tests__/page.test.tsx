/**
 * Credit Score Simulator page — honesty regression (DEFAB-2 / ADR-0009).
 *
 * The page used to fabricate a projected credit score from an invented per-action
 * impact table: projectedScore = clamp(currentScore + scoreChange, 300, 850),
 * rendered as a "Projected Score" number, a signed "+N points" delta, a
 * confidence %, per-factor "+N pts" labels, and a time-to-achieve estimate.
 * These tests lock in the de-fabrication — no projected/current score number
 * renders, no hardcoded point value renders as a prediction, and the honest
 * "estimate unavailable" + disclaimer state shows in its place.
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreditScoreSimulatorPage from "../page";

// Any 3-digit credit-score value in the 300-899 range (the old current /
// projected score numbers).
const SCORE_NUMBER = /\b[3-8]\d{2}\b/;
// Any signed point delta the old impact table rendered as a prediction
// ("+30", "-10", "+40 pts").
const SIGNED_DELTA = /[+-]\s?\d/;

describe("Credit Score Simulator page (honesty)", () => {
  it("renders the honest 'estimate unavailable' + disclaimer state", () => {
    render(<CreditScoreSimulatorPage />);
    expect(screen.getByTestId("simulator-unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Score estimates are being updated/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("simulator-disclaimer")).toBeInTheDocument();
    expect(
      screen.getByText(/not a prediction of your credit score/i),
    ).toBeInTheDocument();
  });

  it("renders number-free directional education (no promised magnitude)", () => {
    render(<CreditScoreSimulatorPage />);
    expect(screen.getByTestId("simulator-education")).toBeInTheDocument();
    expect(screen.getByText("What generally helps")).toBeInTheDocument();
    expect(screen.getByText("What generally hurts")).toBeInTheDocument();
    expect(
      screen.getByText("Making every payment on time"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Missing or making late payments"),
    ).toBeInTheDocument();
  });

  it("renders no fabricated projected or current score number", () => {
    render(<CreditScoreSimulatorPage />);
    // Removed projected-score + confidence UI.
    expect(screen.queryByText(/Projected Score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Run Simulation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
    // No 3-digit score value renders anywhere.
    expect(screen.queryAllByText(SCORE_NUMBER)).toHaveLength(0);
  });

  it("renders no hardcoded point impact as a prediction", () => {
    render(<CreditScoreSimulatorPage />);
    // The removed table rendered signed deltas and point-unit labels.
    expect(screen.queryAllByText(SIGNED_DELTA)).toHaveLength(0);
    expect(screen.queryAllByText(/\bpts\b/i)).toHaveLength(0);
    expect(screen.queryAllByText(/\bpoints\b/i)).toHaveLength(0);
  });
});
