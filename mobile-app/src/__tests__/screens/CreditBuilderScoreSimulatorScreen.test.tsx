/**
 * Credit Builder ScoreSimulatorScreen (advanced) — honesty regression
 * (DEFAB-2 / ADR-0009).
 *
 * The screen used to fabricate a projected credit score from a hardcoded impact
 * table: a hardcoded current score of 678, per-action ranges like +20..+40 and
 * -60..-100, projectedScore = clamp(current + avgImpact, 300, 850), and a
 * 6-month projection chart. These tests lock in the de-fabrication — no
 * projected/current score number renders, no hardcoded per-action point value
 * renders as a prediction, and the honest "estimate unavailable" + disclaimer
 * state shows in its place.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";

// expo-router is mocked globally in jest.setup.js.

import ScoreSimulatorScreen from "../../../app/credit-builder/score-simulator";

// Any signed point delta the old impact table rendered as a prediction
// ("+20", "-60", "+30 to +70", ...).
const SIGNED_DELTA = /[+-]\s?\d/;
// Any 3-digit credit-score value in the 300-899 range (the old current /
// projected score numbers).
const SCORE_NUMBER = /\b[3-8]\d{2}\b/;

describe("Credit Builder ScoreSimulatorScreen (honesty)", () => {
  it("renders the honest 'estimate unavailable' + disclaimer state", () => {
    render(<ScoreSimulatorScreen />);
    expect(screen.getByTestId("simulator-unavailable")).toBeTruthy();
    expect(screen.getByText(/Score estimates are being updated/i)).toBeTruthy();
    expect(screen.getByTestId("simulator-disclaimer")).toBeTruthy();
    expect(
      screen.getByText(/not a prediction of your credit score/i),
    ).toBeTruthy();
  });

  it("renders number-free directional education (no promised magnitude)", () => {
    render(<ScoreSimulatorScreen />);
    expect(screen.getByTestId("simulator-education")).toBeTruthy();
    expect(screen.getByText("What generally helps")).toBeTruthy();
    expect(screen.getByText("What generally hurts")).toBeTruthy();
    expect(screen.getByText("Making every payment on time")).toBeTruthy();
    expect(screen.getByText("Missing or making late payments")).toBeTruthy();
  });

  it("renders no fabricated projected or current score number", () => {
    render(<ScoreSimulatorScreen />);
    // Removed score-comparison + projection UI.
    expect(screen.queryByText("Projected")).toBeNull();
    expect(screen.queryByText("Score Projection")).toBeNull();
    expect(screen.queryByText("678")).toBeNull();
    // No 3-digit score value renders anywhere.
    expect(screen.queryByText(SCORE_NUMBER)).toBeNull();
  });

  it("renders no hardcoded per-action point impact as a prediction", () => {
    render(<ScoreSimulatorScreen />);
    // The removed table rendered labels like "+20 to +40" and "-60 to -100".
    expect(screen.queryByText(SIGNED_DELTA)).toBeNull();
  });
});
