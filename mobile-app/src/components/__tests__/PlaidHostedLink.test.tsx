/**
 * Tests for PlaidHostedLink Component
 *
 * Validates rendering states, API interactions, deep link handling,
 * success/error flows, and callback processing.
 */

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Linking } from "react-native";

// Mock dependencies before importing the component
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock react-native Linking
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve()),
}));

// Mock the API client
const mockApiPost = jest.fn();
jest.mock("../../services/api/client", () => ({
  api: {
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

// Ensure WebView is not available (test system browser flow).
// { virtual: true } is required because react-native-webview is not installed.
jest.mock("react-native-webview", () => {
  throw new Error("Module not found");
}, { virtual: true });

import { PlaidHostedLink } from "../PlaidHostedLink";

const defaultProps = {
  userId: "user-123",
  onSuccess: jest.fn(),
  onExit: jest.fn(),
  onLoad: jest.fn(),
};

const mockHostedLinkResponse = {
  success: true,
  data: {
    hostedLinkUrl: "https://hosted.plaid.com/link/session-abc123",
    linkToken: "link-sandbox-abc123",
    expiration: "2026-03-01T12:00:00Z",
  },
};

describe("PlaidHostedLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockResolvedValue(mockHostedLinkResponse);
    (Linking.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
  });

  describe("Idle State", () => {
    it("renders connect button in idle state", () => {
      const { getByTestId, getByText } = render(
        <PlaidHostedLink {...defaultProps} />,
      );
      expect(getByTestId("plaid-connect-button")).toBeTruthy();
      expect(getByText("Connect Bank Account")).toBeTruthy();
    });

    it("renders title and description text", () => {
      const { getByText } = render(<PlaidHostedLink {...defaultProps} />);
      expect(getByText("Connect Your Bank Account")).toBeTruthy();
      expect(getByText(/Securely link your bank account/)).toBeTruthy();
    });
  });

  describe("Loading State", () => {
    it("shows loading state when connect button is pressed", async () => {
      // Make the API call hang so we can observe loading state
      mockApiPost.mockReturnValue(new Promise(() => {}));

      const { getByTestId, getByText } = render(
        <PlaidHostedLink {...defaultProps} />,
      );

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      // Should be in a loading/linking state
      // The loading text should appear
      expect(getByText("Preparing secure connection...")).toBeTruthy();
    });
  });

  describe("API Call", () => {
    it("calls hosted-link API with correct userId", async () => {
      const { getByTestId } = render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "/financial/plaid/hosted-link",
          { userId: "user-123" },
        );
      });
    });

    it("opens system browser with hosted link URL when WebView not available", async () => {
      const { getByTestId } = render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          "https://hosted.plaid.com/link/session-abc123",
        );
      });
    });

    it("calls onLoad after fetching hosted link", async () => {
      const { getByTestId } = render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(defaultProps.onLoad).toHaveBeenCalled();
      });
    });
  });

  describe("Browser Linking State", () => {
    it("shows browser linking UI after opening URL", async () => {
      const { getByTestId, getByText } = render(
        <PlaidHostedLink {...defaultProps} />,
      );

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(
          getByText("Complete the connection in your browser..."),
        ).toBeTruthy();
        expect(getByTestId("plaid-browser-linking")).toBeTruthy();
      });
    });

    it("shows cancel button during browser linking", async () => {
      const { getByTestId } = render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(getByTestId("plaid-cancel-button")).toBeTruthy();
      });
    });

    it("calls onExit when cancel is pressed during browser linking", async () => {
      const { getByTestId } = render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(getByTestId("plaid-cancel-button")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId("plaid-cancel-button"));
      });

      expect(defaultProps.onExit).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("shows error state when API call fails", async () => {
      mockApiPost.mockResolvedValue({
        success: false,
        error: { message: "Network error", code: "NETWORK_ERROR" },
      });

      const { getByTestId, getByText } = render(
        <PlaidHostedLink {...defaultProps} />,
      );

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(getByTestId("plaid-error")).toBeTruthy();
        expect(getByText("Connection Failed")).toBeTruthy();
        expect(getByText("Network error")).toBeTruthy();
      });
    });

    it("shows retry button on error state", async () => {
      mockApiPost.mockResolvedValue({
        success: false,
        error: { message: "Server error", code: "HTTP_500" },
      });

      const { getByTestId } = render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(getByTestId("plaid-retry-button")).toBeTruthy();
      });
    });

    it("retries when retry button is pressed", async () => {
      mockApiPost
        .mockResolvedValueOnce({
          success: false,
          error: { message: "Temporary error", code: "HTTP_500" },
        })
        .mockResolvedValueOnce(mockHostedLinkResponse);

      const { getByTestId } = render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(getByTestId("plaid-retry-button")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId("plaid-retry-button"));
      });

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledTimes(2);
      });
    });

    it("calls onExit when dismiss is pressed on error state", async () => {
      mockApiPost.mockResolvedValue({
        success: false,
        error: { message: "Error", code: "HTTP_500" },
      });

      const { getByTestId } = render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(getByTestId("plaid-dismiss-button")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId("plaid-dismiss-button"));
      });

      expect(defaultProps.onExit).toHaveBeenCalledWith({
        code: "USER_CANCELLED",
        message: "User dismissed the error",
      });
    });

    it("shows error when browser cannot open URL", async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

      const { getByTestId, getByText } = render(
        <PlaidHostedLink {...defaultProps} />,
      );

      await act(async () => {
        fireEvent.press(getByTestId("plaid-connect-button"));
      });

      await waitFor(() => {
        expect(getByTestId("plaid-error")).toBeTruthy();
        expect(getByText("Unable to open Plaid link in browser")).toBeTruthy();
      });
    });
  });

  describe("Deep Link Callback Handling", () => {
    it("registers deep link listener on mount", () => {
      render(<PlaidHostedLink {...defaultProps} />);
      expect(Linking.addEventListener).toHaveBeenCalledWith(
        "url",
        expect.any(Function),
      );
    });

    it("removes deep link listener on unmount", () => {
      const removeMock = jest.fn();
      (Linking.addEventListener as jest.Mock).mockReturnValue({
        remove: removeMock,
      });

      const { unmount } = render(<PlaidHostedLink {...defaultProps} />);
      unmount();

      expect(removeMock).toHaveBeenCalled();
    });

    it("handles successful callback with public_token", async () => {
      // Mock the exchange token call
      mockApiPost.mockResolvedValue({
        success: true,
        data: { itemId: "item-abc123" },
      });

      let deepLinkHandler: ((event: { url: string }) => void) | undefined;
      (Linking.addEventListener as jest.Mock).mockImplementation(
        (_event: string, handler: (event: { url: string }) => void) => {
          deepLinkHandler = handler;
          return { remove: jest.fn() };
        },
      );

      render(<PlaidHostedLink {...defaultProps} />);

      // Simulate deep link callback
      await act(async () => {
        deepLinkHandler?.({
          url: "fynvita://plaid-callback?public_token=public-sandbox-token&institution_name=Chase&accounts=acc1,acc2",
        });
      });

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "/financial/plaid/exchange-token",
          { publicToken: "public-sandbox-token" },
        );
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(
          "public-sandbox-token",
          {
            institution: "Chase",
            accounts: ["acc1", "acc2"],
          },
        );
      });
    });

    it("handles callback with error params", async () => {
      let deepLinkHandler: ((event: { url: string }) => void) | undefined;
      (Linking.addEventListener as jest.Mock).mockImplementation(
        (_event: string, handler: (event: { url: string }) => void) => {
          deepLinkHandler = handler;
          return { remove: jest.fn() };
        },
      );

      render(<PlaidHostedLink {...defaultProps} />);

      await act(async () => {
        deepLinkHandler?.({
          url: "fynvita://plaid-callback?error=INSTITUTION_NOT_FOUND&error_message=Bank not supported",
        });
      });

      expect(defaultProps.onExit).toHaveBeenCalledWith({
        code: "INSTITUTION_NOT_FOUND",
        message: "Bank not supported",
      });
    });
  });

  describe("Success State", () => {
    it("shows success state after completing token exchange", async () => {
      mockApiPost.mockResolvedValue({
        success: true,
        data: { itemId: "item-abc123" },
      });

      let deepLinkHandler: ((event: { url: string }) => void) | undefined;
      (Linking.addEventListener as jest.Mock).mockImplementation(
        (_event: string, handler: (event: { url: string }) => void) => {
          deepLinkHandler = handler;
          return { remove: jest.fn() };
        },
      );

      const { getByTestId, getByText } = render(
        <PlaidHostedLink {...defaultProps} />,
      );

      await act(async () => {
        deepLinkHandler?.({
          url: "fynvita://plaid-callback?public_token=token123&institution_name=Chase",
        });
      });

      await waitFor(() => {
        expect(getByTestId("plaid-success")).toBeTruthy();
        expect(getByText("Account Connected!")).toBeTruthy();
      });
    });
  });
});
