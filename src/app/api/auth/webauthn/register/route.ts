/**
 * WebAuthn Registration Start API
 *
 * Generates registration options for creating a new passkey/credential.
 * Returns challenge and options needed by the browser's WebAuthn API.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";

const RP_NAME = "Fynvita";
const RP_ID = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : "localhost";

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Parse request body for optional parameters
    const body = await request.json().catch(() => ({}));
    const authenticatorType = body.authenticatorType || "any";
    const credentialName = body.credentialName || "My Passkey";

    // Get existing credentials to exclude
    const { data: existingCredentials } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    const excludeCredentials = (existingCredentials || []).map((cred) => ({
      type: "public-key" as const,
      id: cred.credential_id,
      transports: cred.transports || ["internal", "hybrid"],
    }));

    // Generate a secure random challenge
    const challenge = crypto.randomBytes(32).toString("base64url");

    // Store challenge temporarily for verification (expires in 5 minutes)
    const challengeExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
    await supabase.from("webauthn_challenges").upsert(
      {
        user_id: user.id,
        challenge,
        type: "registration",
        credential_name: credentialName,
        authenticator_type: authenticatorType,
        expires_at: challengeExpiry,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,type",
      },
    );

    // Build authenticator selection criteria
    const authenticatorSelection: AuthenticatorSelectionCriteria = {
      userVerification: "preferred",
      residentKey: "preferred",
      requireResidentKey: false,
    };

    if (authenticatorType === "platform") {
      authenticatorSelection.authenticatorAttachment = "platform";
    } else if (authenticatorType === "cross-platform") {
      authenticatorSelection.authenticatorAttachment = "cross-platform";
    }

    // Create registration options
    const registrationOptions = {
      challenge,
      rp: {
        name: RP_NAME,
        id: RP_ID,
      },
      user: {
        id: Buffer.from(user.id).toString("base64url"),
        name: user.email || user.id,
        displayName: user.email || "User",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256 (ECDSA with P-256)
        { alg: -257, type: "public-key" }, // RS256 (RSASSA-PKCS1-v1_5)
        { alg: -8, type: "public-key" }, // EdDSA
      ],
      authenticatorSelection,
      timeout: 60000,
      attestation: "none" as const,
      excludeCredentials,
    };

    return NextResponse.json({
      options: registrationOptions,
      credentialName,
    });
  } catch (error) {
    console.error("WebAuthn registration start error:", error);
    return NextResponse.json(
      { error: "Failed to start registration" },
      { status: 500 },
    );
  }
});
