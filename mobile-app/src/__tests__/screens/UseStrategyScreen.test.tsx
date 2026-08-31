/**
 * dispute/use-strategy — the screen that was doubly broken.
 *
 * It imported the parallel client (mobile-app/services/api.ts), which does NOT
 * unwrap the `{ success, data }` envelope. Both of its calls read a field off
 * the wrong level:
 *
 *   getStrategy         `data.strategy` — undefined, so the strategy never
 *                       loaded and the form never appeared
 *   generateFromStrategy `data.letter`  — undefined twice over: wrong level
 *                       AND wrong name. The route returns `disputeLetter`
 *                       (src/app/api/disputes/generate/route.ts:188-198); both
 *                       clients declared `{ letter, strategy, nextSteps }`,
 *                       none of which it sends.
 *
 * So a user could reach this screen and never see a strategy or a letter.
 * These tests pin both paths against the shapes the routes actually return.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockGetStrategy = jest.fn();
const mockGenerate = jest.fn();
jest.mock("../../services/api/disputes", () => ({
  disputeResourcesApi: {
    getStrategy: (...a: unknown[]) => mockGetStrategy(...a),
  },
  disputeLetterApi: {
    generateFromStrategy: (...a: unknown[]) => mockGenerate(...a),
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({
    strategyId: "escalation_tactics",
    strategyName: "Multi-Level Escalation",
  }),
  router: { push: jest.fn(), back: jest.fn() },
}));

import UseStrategyScreen from "../../../app/dispute/use-strategy";

/** Exactly what DisputeStrategyDTO carries — no more. */
const STRATEGY = {
  id: "escalation_tactics",
  name: "Multi-Level Escalation",
  description: "Progressive escalation through regulatory channels",
  successRate: 72,
  difficulty: "advanced",
  riskLevel: "medium",
  timeline: "60–90 days",
  steps: [
    { step: 1, title: "Send the initial dispute", description: "Certified mail." },
    { step: 2, title: "Escalate to the CFPB", description: "File a complaint." },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  // The route wraps it: data: { strategy }.
  mockGetStrategy.mockResolvedValue({
    success: true,
    data: { strategy: STRATEGY },
  });
  mockGenerate.mockResolvedValue({
    success: true,
    // `disputeLetter`, which is what the route actually sends.
    data: { disputeLetter: "Dear Experian,\n\nI dispute...", mode: "ai" },
  });
});

/**
 * The screen gates generation on every required variable being filled
 * (getRequiredVariables -> escalation_tactics needs four). Fill them the way a
 * user would, by typing into the inputs, so the test exercises the real guard
 * rather than reaching past it.
 */
function fillRequiredFields() {
  // Placeholders are built as `Enter ${label.toLowerCase()}` from
  // VARIABLE_LABELS, so match the prefix rather than the variable name.
  const inputs = screen.getAllByPlaceholderText(/^Enter /);
  expect(inputs).toHaveLength(4); // escalation_tactics requires four
  inputs.forEach((input) => fireEvent.changeText(input, "x"));
}

describe("dispute/use-strategy", () => {
  it("loads the strategy from the wrapped payload", async () => {
    render(<UseStrategyScreen />);
    await waitFor(() => expect(mockGetStrategy).toHaveBeenCalledWith("escalation_tactics"));
    expect(await screen.findByText("Multi-Level Escalation")).toBeTruthy();
  });

  it("does not load a strategy from the unwrapped level", async () => {
    // What the parallel client used to deliver: the whole body, so the screen
    // read data.strategy off an object whose only key was `data`.
    mockGetStrategy.mockResolvedValue({
      success: true,
      data: { data: { strategy: STRATEGY } },
    });
    render(<UseStrategyScreen />);
    await waitFor(() => expect(mockGetStrategy).toHaveBeenCalled());
    // Nothing crashes, and the strategy simply is not there — which is the
    // state every user was in.
    expect(screen.queryByText("Progressive escalation through regulatory channels")).toBeNull();
  });

  describe("generating a letter", () => {
    it("renders the letter from `disputeLetter`", async () => {
      render(<UseStrategyScreen />);
      await screen.findByText("Multi-Level Escalation");

      fillRequiredFields();
      fireEvent.press(screen.getByText("Apply Strategy"));

      expect(await screen.findByText(/I dispute/)).toBeTruthy();
    });

    it("shows the strategy's own steps as next steps", async () => {
      // The response has no nextSteps field. The steps already loaded with the
      // strategy are the honest source.
      render(<UseStrategyScreen />);
      await screen.findByText("Multi-Level Escalation");

      fillRequiredFields();
      fireEvent.press(screen.getByText("Apply Strategy"));
      await screen.findByText(/I dispute/);

      // Each title now appears TWICE: once in the strategy's own step list
      // further up the screen, once under "Next Steps". Asserting the count
      // is what distinguishes "next steps came from the strategy" from "next
      // steps are missing and I am matching the step list".
      expect(screen.getByText("🎯 Next Steps")).toBeTruthy();
      expect(screen.getAllByText("Send the initial dispute")).toHaveLength(2);
      expect(screen.getAllByText("Escalate to the CFPB")).toHaveLength(2);
    });

    it("renders nothing rather than an empty letter when the field is absent", async () => {
      // The old declaration promised `letter`; the route sends
      // `disputeLetter`. Reading the wrong name produced an empty letter view
      // that looked like a successful generation.
      mockGenerate.mockResolvedValue({
        success: true,
        data: { letter: "wrong field name", mode: "ai" },
      });
      render(<UseStrategyScreen />);
      await screen.findByText("Multi-Level Escalation");

      fillRequiredFields();
      fireEvent.press(screen.getByText("Apply Strategy"));
      await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
      expect(screen.queryByText("wrong field name")).toBeNull();
    });
  });
});
