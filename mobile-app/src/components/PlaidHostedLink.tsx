/**
 * Plaid Hosted Link Component
 *
 * Opens Plaid's Hosted Link flow for mobile bank account linking.
 * Uses Linking.openURL() to open the hosted link in the system browser,
 * then listens for the deep link callback (fynvita://plaid-callback) to
 * extract the public_token and complete the exchange.
 *
 * If react-native-webview is available, it will use an in-app WebView instead.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api/client";

// -- Types ------------------------------------------------------------------

interface PlaidHostedLinkMetadata {
  institution: string;
  accounts: string[];
}

interface PlaidHostedLinkError {
  code: string;
  message: string;
}

export interface PlaidHostedLinkProps {
  userId: string;
  onSuccess: (publicToken: string, metadata: PlaidHostedLinkMetadata) => void;
  onExit: (error?: PlaidHostedLinkError) => void;
  onLoad?: () => void;
}

type LinkStatus = "idle" | "loading" | "linking" | "exchanging" | "success" | "error";

interface HostedLinkResponse {
  hostedLinkUrl: string;
  linkToken: string;
  expiration: string;
}

// -- WebView dynamic import guard -------------------------------------------

let WebViewComponent: React.ComponentType<{
  source: { uri: string };
  onNavigationStateChange?: (event: { url: string }) => void;
  onLoad?: () => void;
  style?: unknown;
  startInLoadingState?: boolean;
  renderLoading?: () => React.ReactElement;
  javaScriptEnabled?: boolean;
}> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webview = require("react-native-webview");
  WebViewComponent = webview.WebView ?? webview.default ?? null;
} catch {
  // react-native-webview is not installed -- fall back to system browser
  WebViewComponent = null;
}

// -- Helpers ----------------------------------------------------------------

function parseCallbackUrl(url: string): {
  publicToken: string | null;
  institution: string | null;
  accounts: string[];
  error: string | null;
  errorMessage: string | null;
} {
  try {
    // The callback URL follows the pattern:
    // fynvita://plaid-callback?public_token=xxx&institution=yyy&accounts=a,b
    // or fynvita://plaid-callback?error=xxx&error_message=yyy
    const queryString = url.includes("?") ? url.split("?")[1] : "";
    const params = new URLSearchParams(queryString);

    return {
      publicToken: params.get("public_token"),
      institution: params.get("institution_name") ?? params.get("institution") ?? "Unknown",
      accounts: (params.get("accounts") ?? "").split(",").filter(Boolean),
      error: params.get("error"),
      errorMessage: params.get("error_message"),
    };
  } catch {
    return {
      publicToken: null,
      institution: null,
      accounts: [],
      error: "PARSE_ERROR",
      errorMessage: "Failed to parse callback URL",
    };
  }
}

const CALLBACK_SCHEME = "fynvita://plaid-callback";

// -- Component --------------------------------------------------------------

export function PlaidHostedLink({
  userId,
  onSuccess,
  onExit,
  onLoad,
}: PlaidHostedLinkProps): React.ReactElement {
  const [status, setStatus] = useState<LinkStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hostedLinkUrl, setHostedLinkUrl] = useState<string | null>(null);

  // Prevent double-processing of the callback
  const callbackProcessedRef = useRef(false);

  // ------ Deep link listener (for system browser flow) -------------------

  const handleDeepLink = useCallback(
    (event: { url: string }) => {
      const url = event.url;
      if (!url.startsWith(CALLBACK_SCHEME) || callbackProcessedRef.current) {
        return;
      }

      callbackProcessedRef.current = true;

      const parsed = parseCallbackUrl(url);

      if (parsed.error) {
        setStatus("error");
        setErrorMessage(parsed.errorMessage ?? parsed.error);
        onExit({
          code: parsed.error,
          message: parsed.errorMessage ?? "Plaid link exited with an error",
        });
        return;
      }

      if (!parsed.publicToken) {
        // User closed browser without completing -- treat as cancel
        setStatus("idle");
        onExit();
        return;
      }

      // Successfully got a public token -- exchange it
      setStatus("exchanging");
      exchangeToken(parsed.publicToken, {
        institution: parsed.institution ?? "Unknown",
        accounts: parsed.accounts,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onExit, onSuccess, userId],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Also check if the app was opened from a deep link while closed
    Linking.getInitialURL().then((url) => {
      if (url && url.startsWith(CALLBACK_SCHEME)) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  // ------ API calls ------------------------------------------------------

  const fetchHostedLink = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    callbackProcessedRef.current = false;

    try {
      const response = await api.post<HostedLinkResponse>(
        "/financial/plaid/hosted-link",
        { userId },
      );

      if (!response.success || !response.data) {
        const msg =
          response.error?.message ?? "Failed to generate Plaid hosted link";
        setStatus("error");
        setErrorMessage(msg);
        return;
      }

      const { hostedLinkUrl: url } = response.data;
      setHostedLinkUrl(url);
      setStatus("linking");

      if (onLoad) {
        onLoad();
      }

      // If no WebView, open in system browser
      if (!WebViewComponent) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          setStatus("error");
          setErrorMessage("Unable to open Plaid link in browser");
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to initialize Plaid link";
      setStatus("error");
      setErrorMessage(msg);
    }
  }, [userId, onLoad]);

  const exchangeToken = useCallback(
    async (publicToken: string, metadata: PlaidHostedLinkMetadata) => {
      try {
        const response = await api.post<{ itemId: string }>(
          "/financial/plaid/exchange-token",
          { publicToken },
        );

        if (response.success) {
          setStatus("success");
          onSuccess(publicToken, metadata);
        } else {
          setStatus("error");
          setErrorMessage(
            response.error?.message ?? "Failed to exchange token",
          );
          onExit({
            code: "EXCHANGE_ERROR",
            message: response.error?.message ?? "Failed to exchange token",
          });
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to exchange token";
        setStatus("error");
        setErrorMessage(msg);
        onExit({ code: "EXCHANGE_ERROR", message: msg });
      }
    },
    [onSuccess, onExit],
  );

  // ------ WebView navigation handler ------------------------------------

  const handleNavigationStateChange = useCallback(
    (event: { url: string }) => {
      if (
        event.url.startsWith(CALLBACK_SCHEME) &&
        !callbackProcessedRef.current
      ) {
        callbackProcessedRef.current = true;
        const parsed = parseCallbackUrl(event.url);

        if (parsed.error) {
          setStatus("error");
          setErrorMessage(parsed.errorMessage ?? parsed.error);
          onExit({
            code: parsed.error,
            message:
              parsed.errorMessage ?? "Plaid link exited with an error",
          });
          return;
        }

        if (!parsed.publicToken) {
          setStatus("idle");
          onExit();
          return;
        }

        setStatus("exchanging");
        exchangeToken(parsed.publicToken, {
          institution: parsed.institution ?? "Unknown",
          accounts: parsed.accounts,
        });
      }
    },
    [onExit, exchangeToken],
  );

  // ------ Render ---------------------------------------------------------

  if (status === "idle") {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="link-outline" size={48} color="#3B82F6" />
        </View>
        <Text style={styles.title}>Connect Your Bank Account</Text>
        <Text style={styles.subtitle}>
          Securely link your bank account through Plaid to enable automatic
          transaction tracking and financial insights.
        </Text>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={fetchHostedLink}
          testID="plaid-connect-button"
        >
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.connectButtonText}>Connect Bank Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === "loading") {
    return (
      <View style={styles.container} testID="plaid-loading">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Preparing secure connection...</Text>
      </View>
    );
  }

  if (status === "linking" && WebViewComponent && hostedLinkUrl) {
    return (
      <View style={styles.webViewContainer} testID="plaid-webview">
        <View style={styles.webViewHeader}>
          <TouchableOpacity
            onPress={() => {
              setStatus("idle");
              onExit();
            }}
            testID="plaid-webview-close"
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Connect Bank</Text>
          <View style={{ width: 24 }} />
        </View>
        <WebViewComponent
          source={{ uri: hostedLinkUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          onLoad={() => onLoad?.()}
          style={styles.webView}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator
              size="large"
              color="#3B82F6"
              style={styles.webViewLoading}
            />
          )}
          javaScriptEnabled
        />
      </View>
    );
  }

  if (status === "linking" && !WebViewComponent) {
    return (
      <View style={styles.container} testID="plaid-browser-linking">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>
          Complete the connection in your browser...
        </Text>
        <Text style={styles.hintText}>
          You will be redirected back to the app after completing the process.
        </Text>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setStatus("idle");
            onExit();
          }}
          testID="plaid-cancel-button"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === "exchanging") {
    return (
      <View style={styles.container} testID="plaid-exchanging">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Completing connection...</Text>
      </View>
    );
  }

  if (status === "success") {
    return (
      <View style={styles.container} testID="plaid-success">
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>Account Connected!</Text>
        <Text style={styles.successSubtitle}>
          Your bank account has been successfully linked. Your transactions will
          begin syncing shortly.
        </Text>
      </View>
    );
  }

  // Error state
  return (
    <View style={styles.container} testID="plaid-error">
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
      </View>
      <Text style={styles.errorTitle}>Connection Failed</Text>
      <Text style={styles.errorMessage}>
        {errorMessage ?? "An unexpected error occurred. Please try again."}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={fetchHostedLink}
        testID="plaid-retry-button"
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => {
          setStatus("idle");
          onExit({
            code: "USER_CANCELLED",
            message: "User dismissed the error",
          });
        }}
        testID="plaid-dismiss-button"
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// -- Styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
  },
  hintText: {
    marginTop: 8,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  cancelButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "500",
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  webViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#EF4444",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default PlaidHostedLink;
