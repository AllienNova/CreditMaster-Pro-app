/**
 * Credit Repair Hub Screen — real store wiring (PARITY-P2).
 *
 * The hub used to render three hardcoded Quick Stats ("12" active disputes,
 * "+45" points gained, "85%" success rate) behind a fake setTimeout load. It
 * now derives its stats from real store data: dispute counts from
 * useDisputeStore and the credit score from useCreditStore, fetched on mount.
 * These tests prove the fetch-on-mount, that real store-derived stats render,
 * that the former hardcoded values never appear, and that the honest inline
 * loading / error / empty states show — while the static TOOLS nav stays
 * visible throughout.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { Dispute } from "../../services/api/types";
// Store hooks are mocked below; jest.mock is babel-hoisted above these imports,
// so importing the screen here still receives the mocked stores.
import CreditRepairScreen from "../../../app/credit-repair/index";

const mockFetchDisputes = jest.fn();
const mockFetchScores = jest.fn();

interface DisputeStoreState {
  disputes: Dispute[];
  isLoading: boolean;
  error: string | null;
  fetchDisputes: jest.Mock;
}

interface CreditStoreState {
  currentScore: number | null;
  isLoadingScores: boolean;
  fetchScores: jest.Mock;
}

let mockDisputeState: DisputeStoreState;
let mockCreditState: CreditStoreState;

jest.mock("../../store/disputeStore", () => ({
  useDisputeStore: () => mockDisputeState,
}));

jest.mock("../../store/creditStore", () => ({
  useCreditStore: () => mockCreditState,
}));

// expo-router and @expo/vector-icons are mocked globally in jest.setup.js.

function dispute(over: Partial<Dispute> = {}): Dispute {
  return {
    id: "d1",
    userId: "u1",
    bureau: "experian",
    status: "sent",
    itemType: "Late Payment",
    creditorName: "Capital One",
    disputeReason: "Reported late in error",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDisputeState = {
    disputes: [],
    isLoading: false,
    error: null,
    fetchDisputes: mockFetchDisputes,
  };
  mockCreditState = {
    currentScore: null,
    isLoadingScores: false,
    fetchScores: mockFetchScores,
  };
});

describe("Credit Repair Hub Screen", () => {
  it("fetches disputes and credit scores from the stores on mount", () => {
    render(<CreditRepairScreen />);
    expect(mockFetchDisputes).toHaveBeenCalled();
    expect(mockFetchScores).toHaveBeenCalled();
  });

  it("renders real store-derived stats; the removed hardcoded values never appear", () => {
    mockDisputeState.disputes = [
      dispute({ id: "d1", status: "under_review" }), // active
      dispute({ id: "d2", status: "sent" }), // active
      dispute({ id: "d3", status: "resolved" }), // resolved (closed)
    ];
    mockCreditState.currentScore = 712;

    render(<CreditRepairScreen />);

    // Active = in-flight (under_review + sent) = 2, Resolved = 1, Score = 712.
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("712")).toBeTruthy();

    // Real labels present.
    expect(screen.getByText("Active Disputes")).toBeTruthy();
    expect(screen.getByText("Resolved")).toBeTruthy();
    expect(screen.getByText("Credit Score")).toBeTruthy();

    // Former hardcoded stats must never appear.
    expect(screen.queryByText("12")).toBeNull();
    expect(screen.queryByText("+45")).toBeNull();
    expect(screen.queryByText("85%")).toBeNull();
    expect(screen.queryByText("Points Gained")).toBeNull();
    expect(screen.queryByText("Success Rate")).toBeNull();
  });

  it("renders honest zeros (not the fake '12') when the user has no disputes", () => {
    render(<CreditRepairScreen />);

    // Active 0 and Resolved 0 are real, honest counts.
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.queryByText("12")).toBeNull();
  });

  it("shows the inline stats loading state while fetching with no data yet, keeping tools visible", () => {
    mockDisputeState.isLoading = true;

    render(<CreditRepairScreen />);

    expect(screen.getByTestId("credit-repair-hub-loading")).toBeTruthy();
    // Stats row is not rendered while loading.
    expect(screen.queryByTestId("credit-repair-hub-stats")).toBeNull();
    // Static TOOLS navigation stays visible during load (no full-screen gate).
    expect(screen.getByText("Dispute Center")).toBeTruthy();
    expect(screen.getByText("Repair Tools")).toBeTruthy();
  });

  it("empty-states the credit score with an em dash when there is no score", () => {
    mockDisputeState.disputes = [dispute({ status: "sent" })];
    mockCreditState.currentScore = null;

    render(<CreditRepairScreen />);

    expect(screen.getByTestId("credit-repair-hub-score")).toBeTruthy();
    // No fabricated score — honest empty placeholder.
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows an honest error state with retry that re-fetches when disputes fail to load", () => {
    mockDisputeState.error = "Network down";

    render(<CreditRepairScreen />);

    expect(screen.getByTestId("credit-repair-hub-error")).toBeTruthy();
    expect(screen.getByText("Network down")).toBeTruthy();
    // Tools remain reachable even when stats are unavailable.
    expect(screen.getByText("Dispute Center")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Again"));

    // mount + retry
    expect(mockFetchDisputes).toHaveBeenCalledTimes(2);
    expect(mockFetchScores).toHaveBeenCalledTimes(2);
  });
});
