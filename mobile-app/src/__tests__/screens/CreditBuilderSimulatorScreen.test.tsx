/**
 * Credit Builder SimulatorScreen (what-if) — honesty regression
 * (DEFAB-2 / ADR-0009).
 *
 * The screen used to fabricate a simulated credit score by summing hardcoded
 * per-scenario point impacts (on-time +15, close-card -20, remove-negative +30,
 * a pay-down slider worth up to +50, ...) into
 * simulatedScore = clamp(baseScore + Σimpact, 300, 850), rendered as a specific
 * "Simulated" number and "+N" deltas. These tests lock in the de-fabrication —
 * no simulated/base score number renders, no hardcoded per-scenario point value
 * renders as a prediction, and the honest "estimate unavailable" + disclaimer
 * state shows in its place.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";

// expo-router is mocked globally in jest.setup.js.

import SimulatorScreen from "../../../app/credit-builder/simulator";

// Any signed point delta the old scenario table rendered as a prediction
// ("+15", "-20", "+30", ...).
const SIGNED_DELTA = /[+-]\s?\d/;
// Any 3-digit credit-score value in the 300-899 range (the old base /
// simulated score numbers, e.g. the 680 default).
const SCORE_NUMBER = /\b[3-8]\d{2}\b/;

describe("Credit Builder SimulatorScreen (honesty)", () => {
  it("renders the honest 'estimate unavailable' + disclaimer state", () => {
    render(<SimulatorScreen />);
    expect(screen.getByTestId("simulator-unavailable")).toBeTruthy();
    expect(screen.getByText(/Score estimates are being updated/i)).toBeTruthy();
    expect(screen.getByTestId("simulator-disclaimer")).toBeTruthy();
    expect(
      screen.getByText(/not a prediction of your credit score/i),
    ).toBeTruthy();
  });

  it("renders number-free directional education (no promised magnitude)", () => {
    render(<SimulatorScreen />);
    expect(screen.getByTestId("simulator-education")).toBeTruthy();
    expect(screen.getByText("What generally helps")).toBeTruthy();
    expect(screen.getByText("What generally hurts")).toBeTruthy();
    expect(screen.getByText("Making every payment on time")).toBeTruthy();
    expect(screen.getByText("Missing or making late payments")).toBeTruthy();
  });

  it("renders no fabricated simulated or base score number", () => {
    render(<SimulatorScreen />);
    // Removed score-comparison UI.
    expect(screen.queryByText("Simulated")).toBeNull();
    expect(screen.queryByText("What-If Scenarios")).toBeNull();
    expect(screen.queryByText("680")).toBeNull();
    // No 3-digit score value renders anywhere.
    expect(screen.queryByText(SCORE_NUMBER)).toBeNull();
  });

  it("renders no hardcoded per-scenario point impact as a prediction", () => {
    render(<SimulatorScreen />);
    // The removed table rendered labels like "+15", "-20", "+30".
    expect(screen.queryByText(SIGNED_DELTA)).toBeNull();
  });
});
