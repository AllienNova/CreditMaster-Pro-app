"use client";

import { useState, useEffect, useCallback } from "react";
import {
  webAuthnService,
  WebAuthnCredential,
} from "@/lib/auth/webauthn-service";

interface PasskeyManagementProps {
  userId: string;
  userName: string;
  displayName: string;
}

export default function PasskeyManagement({
  userId,
  userName,
  displayName,
}: PasskeyManagementProps) {
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [newCredentialName, setNewCredentialName] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState<string | null>(
    null,
  );
  const [editName, setEditName] = useState("");

  // Check WebAuthn support
  useEffect(() => {
    const checkSupport = async () => {
      const supported = webAuthnService.isSupported();
      setIsSupported(supported);

      if (supported) {
        const platformAvailable =
          await webAuthnService.isPlatformAuthenticatorAvailable();
        setIsPlatformAvailable(platformAvailable);
      }
    };

    checkSupport();
  }, []);

  // Fetch credentials
  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/webauthn/credentials");

      if (response.ok) {
        const data = await response.json();
        setCredentials(data.credentials || []);
      }
      // PasskeyManagement: Failed to fetch credentials (handled by empty state UI)
    } catch (_err) {
      // PasskeyManagement error: Error fetching credentials
      void _err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Register a new passkey
  const handleRegister = async (
    type: "platform" | "cross-platform" | "any",
  ) => {
    setRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      // Start registration via API
      const startResponse = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authenticatorType: type,
          credentialName:
            newCredentialName ||
            (type === "platform" ? "This Device" : "Security Key"),
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.error || "Failed to start registration");
      }

      const { options, credentialName } = await startResponse.json();

      // Convert base64url to ArrayBuffer for WebAuthn API
      const challenge = base64urlToArrayBuffer(options.challenge);
      const userId = base64urlToArrayBuffer(options.user.id);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
        {
          ...options,
          challenge,
          user: {
            ...options.user,
            id: userId,
          },
          excludeCredentials: options.excludeCredentials?.map(
            (cred: { id: string; type: string; transports?: string[] }) => ({
              ...cred,
              id: base64urlToArrayBuffer(cred.id),
            }),
          ),
        };

      // Create the credential using browser API
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // Send credential to server for verification
      const verifyResponse = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: arrayBufferToBase64url(credential.rawId),
            type: credential.type,
            authenticatorAttachment: (
              credential as PublicKeyCredential & {
                authenticatorAttachment?: string;
              }
            ).authenticatorAttachment,
            response: {
              clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
              attestationObject: arrayBufferToBase64url(
                response.attestationObject,
              ),
              transports: response.getTransports?.() || [],
            },
          },
          credentialName,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Failed to verify registration");
      }

      setSuccess("Passkey registered successfully!");
      setShowRegisterModal(false);
      setNewCredentialName("");
      await fetchCredentials();
    } catch (err) {
      // PasskeyManagement error: Registration error
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setError("Registration was cancelled or timed out");
        } else if (err.name === "InvalidStateError") {
          setError("This authenticator is already registered");
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setRegistering(false);
    }
  };

  // Delete a credential
  const handleDelete = async (credentialId: string) => {
    setDeleting(credentialId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/webauthn/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete credential");
      }

      setSuccess("Passkey removed successfully");
      await fetchCredentials();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete credential",
      );
    } finally {
      setDeleting(null);
    }
  };

  // Rename a credential
  const handleRename = async (credentialId: string) => {
    if (!editName.trim()) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/webauthn/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, name: editName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to rename credential");
      }

      setSuccess("Passkey renamed successfully");
      setEditingCredential(null);
      setEditName("");
      await fetchCredentials();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to rename credential",
      );
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
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Passkeys
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Passkeys (WebAuthn) are not supported in this browser. Please use a
            modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Passkeys
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
            Sign in faster and more securely with biometrics or security keys
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          disabled={registering}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Passkey
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Credentials List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : credentials.length === 0 ? (
        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">
            <span role="img" aria-label="key">
              &#128273;
            </span>
          </div>
          <p className="text-gray-600 dark:text-slate-300 mb-4">
            No passkeys registered yet
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Add a passkey to sign in quickly and securely using your
            fingerprint, face, or security key.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {cred.type === "platform" ? (
                    <span role="img" aria-label="device">
                      &#128241;
                    </span>
                  ) : (
                    <span role="img" aria-label="key">
                      &#128273;
                    </span>
                  )}
                </div>
                <div>
                  {editingCredential === cred.credentialId ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm"
                        placeholder="Enter name"
                      />
                      <button
                        onClick={() => handleRename(cred.credentialId)}
                        className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingCredential(null);
                          setEditName("");
                        }}
                        className="px-2 py-1 bg-gray-300 text-gray-700 dark:text-slate-200 text-sm rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {cred.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {cred.type === "platform"
                          ? "Built-in Authenticator"
                          : "Security Key"}
                        {cred.lastUsedAt && (
                          <span className="ml-2">
                            Last used:{" "}
                            {new Date(cred.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingCredential !== cred.credentialId && (
                  <>
                    <button
                      onClick={() => {
                        setEditingCredential(cred.credentialId);
                        setEditName(cred.name);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200 hover:bg-gray-200 dark:bg-slate-700 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(cred.credentialId)}
                      disabled={deleting === cred.credentialId}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove"
                    >
                      {deleting === cred.credentialId ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Add a Passkey
            </h3>

            <div className="mb-4">
              <label
                htmlFor="credentialName"
                className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2"
              >
                Passkey Name (optional)
              </label>
              <input
                id="credentialName"
                type="text"
                value={newCredentialName}
                onChange={(e) => setNewCredentialName(e.target.value)}
                placeholder="e.g., MacBook Pro, iPhone, YubiKey"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
              Choose the type of passkey to register:
            </p>

            <div className="space-y-3">
              {isPlatformAvailable && (
                <button
                  onClick={() => handleRegister("platform")}
                  disabled={registering}
                  className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl">
                    <span role="img" aria-label="fingerprint">
                      &#128270;
                    </span>
                  </span>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      This Device
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Use Face ID, Touch ID, or Windows Hello
                    </p>
                  </div>
                </button>
              )}

              <button
                onClick={() => handleRegister("cross-platform")}
                disabled={registering}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">
                  <span role="img" aria-label="key">
                    &#128273;
                  </span>
                </span>
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Security Key
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Use a hardware security key like YubiKey
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleRegister("any")}
                disabled={registering}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">
                  <span role="img" aria-label="sparkles">
                    &#10024;
                  </span>
                </span>
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Any Available
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Let the system choose the best option
                  </p>
                </div>
              </button>
            </div>

            {registering && (
              <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span>Waiting for authenticator...</span>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  setNewCredentialName("");
                }}
                disabled={registering}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
