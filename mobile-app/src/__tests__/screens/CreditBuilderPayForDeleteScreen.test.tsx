/**
 * credit-builder/pay-for-delete — no invented debts, and no settlement figure
 * computed from one.
 *
 * The screen listed MOCK_COLLECTIONS as the user's own collection accounts —
 * "ABC Collections, originally Medical Center, $1,250, opened 2023-06-15" —
 * then offered to settle the selected one at 40% of its balance. Both the debt
 * and the settlement were invented.
 *
 * There is no source to replace them with. Collection accounts come from a
 * parsed credit report, and that data sits in `credit_reports.reportData`,
 * typed `Record<string, unknown>` (src/lib/credit-repair/db-legacy.ts:27) —
 * an untyped JSONB blob with no contract to read. The only `tradelines` table
 * in the schema is the MARKETPLACE one, not the caller's accounts.
 *
 * So the screen states what is missing. The process guide and negotiation tips
 * stay: those describe how pay-for-delete works, not what this user owes.
 */

import React from "react";
import { render, screen } from "@testing-library/react-native";

// expo-router is mocked globally in jest.setup.js.

import PayForDeleteScreen from "../../../app/credit-builder/pay-for-delete";

describe("credit-builder/pay-for-delete", () => {
  it("names no collection account as the user's", () => {
    render(<PayForDeleteScreen />);
    for (const invented of [
      "ABC Collections",
      "Medical Center",
      "XYZ Recovery",
      "National Credit Systems",
    ]) {
      expect(screen.queryByText(invented)).toBeNull();
    }
  });

  it("shows no balance and no settlement offer", () => {
    // The suggested offer was 40% of a balance nobody owed, so a currency
    // figure anywhere on this screen is the defect returning.
    render(<PayForDeleteScreen />);
    expect(screen.queryByText(/\$[\d,]/)).toBeNull();
  });

  it("says why the list is absent rather than showing an empty section", () => {
    // A bare "Your Collections" heading with nothing under it reads as "you
    // have none", which is a different claim from "we cannot see them".
    render(<PayForDeleteScreen />);
    expect(screen.getByText("Your Collections")).toBeTruthy();
    expect(
      screen.getByText(/cannot list your collection accounts yet/i),
    ).toBeTruthy();
  });

  it("keeps the process guide, which is about the strategy and not the user", () => {
    render(<PayForDeleteScreen />);
    expect(screen.getByText("The Process")).toBeTruthy();
    expect(screen.getByText("Verify the Debt")).toBeTruthy();
    expect(screen.getByText("Get Written Agreement")).toBeTruthy();
    expect(screen.getByText("Negotiation Tips")).toBeTruthy();
  });

  it("still warns that a collector may refuse", () => {
    // The one honest thing the screen already did.
    render(<PayForDeleteScreen />);
    expect(screen.getByText(/Not all collectors agree to PFD/i)).toBeTruthy();
  });
});
