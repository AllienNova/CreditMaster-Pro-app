"use client";

import { useState, useEffect } from "react";
import { webAuthnService } from "@/lib/auth/webauthn-service";

interface PasskeyLoginButtonProps {
  email?: string;
  onSuccess: (result: { userId: string; email: string }) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function PasskeyLoginButton({
  email,
  onSuccess,
  onError,
  disabled = false,
  className = "",
}: PasskeyLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isConditionalAvailable, setIsConditionalAvailable] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = webAuthnService.isSupported();
      setIsSupported(supported);

      if (supported) {
        const conditionalAvailable =
          await webAuthnService.isConditionalMediationAvailable();
        setIsConditionalAvailable(conditionalAvailable);
      }
    };

    checkSupport();
  }, []);

  const handlePasskeyLogin = async () => {
    if (!isSupported) {
      onError("Passkeys are not supported in this browser");
      return;
    }

    setLoading(true);

    try {
      // Start authentication via API
      const startResponse = await fetch("/api/auth/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.error || "Failed to start authentication");
      }

      const { options, sessionId } = await startResponse.json();

      // Convert base64url to ArrayBuffer for WebAuthn API
      const challenge = base64urlToArrayBuffer(options.challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
        {
          ...options,
          challenge,
          allowCredentials: options.allowCredentials?.map(
            (cred: { id: string; type: string; transports?: string[] }) => ({
              ...cred,
              id: base64urlToArrayBuffer(cred.id),
            }),
          ),
        };

      // Get the credential using browser API
      const assertion = (await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      })) as PublicKeyCredential;

      if (!assertion) {
        throw new Error("Authentication failed");
      }

      const response = assertion.response as AuthenticatorAssertionResponse;

      // Send assertion to server for verification
      const verifyResponse = await fetch(
        "/api/auth/webauthn/authenticate/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: {
              id: assertion.id,
              rawId: arrayBufferToBase64url(assertion.rawId),
              type: assertion.type,
              response: {
                clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
                authenticatorData: arrayBufferToBase64url(
                  response.authenticatorData,
                ),
                signature: arrayBufferToBase64url(response.signature),
                userHandle: response.userHandle
                  ? arrayBufferToBase64url(response.userHandle)
                  : null,
              },
            },
            sessionId,
          }),
        },
      );

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Failed to verify authentication");
      }

      const result = await verifyResponse.json();

      if (result.success && result.user) {
        onSuccess(result.user);
      } else if (result.requiresManualLogin) {
        onError(
          "Passkey verified, but automatic sign-in is not available. Please sign in manually.",
        );
      } else if (result.actionRequired === "verify_link") {
        // If verification URL is provided, redirect user
        window.location.href = result.verificationUrl;
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err) {
      // Error logged
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          onError("Authentication was cancelled or timed out");
        } else if (err.name === "SecurityError") {
          onError("Authentication is not allowed on this origin");
        } else {
          onError(err.message);
        }
      } else {
        onError(err instanceof Error ? err.message : "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function arrayBufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handlePasskeyLogin}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 ${className}`}
    >
      {loading ? (
        <svg
          className="animate-spin h-5 w-5 text-gray-500 dark:text-slate-400"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <>
          <svg
            className="w-5 h-5 text-gray-700 dark:text-slate-200"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C9.24 2 7 4.24 7 7C7 8.85 8.04 10.44 9.54 11.24C6.32 12.04 4 15.04 4 18.5V20C4 20.55 4.45 21 5 21H19C19.55 21 20 20.55 20 20V18.5C20 15.04 17.68 12.04 14.46 11.24C15.96 10.44 17 8.85 17 7C17 4.24 14.76 2 12 2ZM12 4C13.66 4 15 5.34 15 7C15 8.66 13.66 10 12 10C10.34 10 9 8.66 9 7C9 5.34 10.34 4 12 4ZM12 12C14.21 12 16.17 13.28 17.35 15.21L6.65 15.21C7.83 13.28 9.79 12 12 12Z"
              fill="currentColor"
            />
            <circle cx="12" cy="7" r="2" fill="currentColor" opacity="0.5" />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
            Sign in with Passkey
          </span>
        </>
      )}
    </button>
  );
}
