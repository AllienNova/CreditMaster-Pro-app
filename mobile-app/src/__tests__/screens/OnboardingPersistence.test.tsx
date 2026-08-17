/**
 * The onboarding wizard must actually persist what the user enters.
 *
 * Before this, all three data-collecting screens held their answers in local
 * useState and wrote them nowhere. useOnboardingProgress existed and was
 * correct, but nothing in the app imported it — so closing the app or losing
 * the session lost every answer and put the user back on step 1.
 *
 * These assert the wiring at the screen level, because a correct hook that no
 * screen calls is exactly the bug that was here. They also pin the two
 * fabrications removed from connect.tsx: the bureau button that waited 1.5s and
 * then showed a green tick without making a request, and the bank button that
 * did the same while a working PlaidHostedLink component sat in the same app.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

const mockCompleteStep = jest.fn();
const mockConnectBureau = jest.fn();
const mockUpdateProfile = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn() },
}));

jest.mock("../../hooks/useOnboardingProgress", () => ({
  useOnboardingProgress: () => ({
    progress: {
      current_step: 1,
      completed_steps: [],
      form_data: {},
      last_updated: "",
    },
    loading: false,
    saving: false,
    error: null,
    isOnline: true,
    updateProgress: jest.fn(),
    completeStep: (...a: unknown[]) => mockCompleteStep(...a),
    save: jest.fn(),
  }),
}));

jest.mock("../../store/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1", firstName: "", lastName: "" },
    updateProfile: (...a: unknown[]) => mockUpdateProfile(...a),
  }),
}));

jest.mock("../../services/api/credit", () => ({
  creditMonitoringApi: {
    connectBureau: (...a: unknown[]) => mockConnectBureau(...a),
  },
}));

// The real component opens a WebView; only its presence matters here.
jest.mock("../../components/PlaidHostedLink", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    PlaidHostedLink: () => <Text testID="plaid-hosted-link">Plaid</Text>,
  };
});

import ProfileScreen from "../../../app/onboarding/profile";
import GoalsScreen from "../../../app/onboarding/goals";
import ConnectScreen from "../../../app/onboarding/connect";

describe("onboarding persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompleteStep.mockResolvedValue(true);
    mockUpdateProfile.mockResolvedValue(undefined);
    mockConnectBureau.mockResolvedValue({ success: true, data: {} });
  });

  describe("profile screen", () => {
    it("saves the typed answers as step 1 before moving on", async () => {
      const { getByPlaceholderText, getByText } = render(<ProfileScreen />);

      fireEvent.changeText(getByPlaceholderText(/first name/i), "Ada");
      fireEvent.changeText(getByPlaceholderText(/last name/i), "Lovelace");
      fireEvent.press(getByText(/continue/i));

      await waitFor(() =>
        expect(mockCompleteStep).toHaveBeenCalledWith(1, {
          profile: expect.objectContaining({
            firstName: "Ada",
            lastName: "Lovelace",
          }),
        }),
      );
    });

    it("still records the answers when the profile write fails", async () => {
      // Otherwise a transient updateProfile failure costs the user their typing
      // as well, and the wizard restarts empty.
      mockUpdateProfile.mockRejectedValue(new Error("network"));
      const { getByPlaceholderText, getByText } = render(<ProfileScreen />);

      fireEvent.changeText(getByPlaceholderText(/first name/i), "Ada");
      fireEvent.changeText(getByPlaceholderText(/last name/i), "Lovelace");
      fireEvent.press(getByText(/continue/i));

      await waitFor(() => expect(mockCompleteStep).toHaveBeenCalled());
      await waitFor(() => expect(mockPush).toHaveBeenCalled());
    });
  });

  describe("goals screen", () => {
    it("saves the selected goals as step 2", async () => {
      const { getByText } = render(<GoalsScreen />);

      fireEvent.press(getByText("Improve My Credit Score"));
      fireEvent.press(getByText(/continue/i));

      await waitFor(() =>
        expect(mockCompleteStep).toHaveBeenCalledWith(2, {
          goals: ["improve_score"],
        }),
      );
    });
  });

  describe("connect screen", () => {
    it("posts to the bureau endpoint instead of faking a connection", async () => {
      const { getAllByText } = render(<ConnectScreen />);

      fireEvent.press(getAllByText(/^connect$/i)[0]);

      await waitFor(() =>
        expect(mockConnectBureau).toHaveBeenCalledWith("experian"),
      );
    });

    it("does not show a bureau as connected when the request fails", async () => {
      // The fabricated version could not fail: it showed a tick unconditionally.
      mockConnectBureau.mockResolvedValue({
        success: false,
        error: { message: "upstream down" },
      });
      const { getAllByText, queryByText } = render(<ConnectScreen />);

      fireEvent.press(getAllByText(/^connect$/i)[0]);

      await waitFor(() => expect(mockConnectBureau).toHaveBeenCalled());
      expect(queryByText("1 of 3 bureaus connected")).toBeNull();
    });

    it("renders the real Plaid component rather than a fake bank button", () => {
      const { getByTestId } = render(<ConnectScreen />);
      expect(getByTestId("plaid-hosted-link")).toBeTruthy();
    });

    it("saves the connection state as step 3", async () => {
      const { getByText } = render(<ConnectScreen />);

      fireEvent.press(getByText(/continue/i));

      await waitFor(() =>
        expect(mockCompleteStep).toHaveBeenCalledWith(
          3,
          expect.objectContaining({ bankConnected: false }),
        ),
      );
    });
  });
});
