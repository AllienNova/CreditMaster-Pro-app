/**
 * WebAuthn Registration Start API
 *
 * Generates registration options for creating a new passkey/credential.
 * Returns challenge and options needed by the browser's WebAuthn API.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const RP_NAME = "Fynvita";
const RP_ID = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
  : "localhost";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    // Get access token from cookies
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

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
        displayName: user.user_metadata?.name || user.email || "User",
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
}
