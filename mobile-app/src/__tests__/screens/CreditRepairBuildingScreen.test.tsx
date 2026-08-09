/**
 * CreditRepairBuildingScreen — static educational content (PARITY-P2).
 *
 * The screen previously rendered a fabricated "Your Progress" card
 * ("4 of 6 strategies in progress" + a hardcoded 65% bar) with NO data source,
 * behind a fake setTimeout(600) loading gate. Both were removed: the strategy
 * list is legitimately static educational content, so it now renders
 * immediately with no fabricated per-user progress.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";

import BuildingScreen from "../../../app/credit-repair/building";

describe("CreditRepairBuildingScreen", () => {
  it("renders the static credit-building strategies immediately (no loading gate)", () => {
    render(<BuildingScreen />);
    expect(screen.getByText("Pay Bills On Time")).toBeTruthy();
    expect(screen.getByText("Lower Credit Utilization")).toBeTruthy();
    expect(screen.getByText("Recommended Strategies")).toBeTruthy();
  });

  it("does not render the removed fabricated per-user progress", () => {
    render(<BuildingScreen />);
    expect(screen.queryByText("Your Progress")).toBeNull();
    expect(screen.queryByText("4 of 6 strategies in progress")).toBeNull();
  });
});
