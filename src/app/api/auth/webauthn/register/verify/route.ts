/**
 * WebAuthn Registration Verify API
 *
 * Verifies the credential creation response from the browser
 * and stores the credential in the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Parse the credential response
    const body = await request.json();
    const { credential, credentialName } = body;

    if (
      !credential ||
      !credential.id ||
      !credential.rawId ||
      !credential.response
    ) {
      return NextResponse.json(
        { error: "Invalid credential data" },
        { status: 400 },
      );
    }

    // Retrieve and verify the challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "registration")
      .single();

    if (challengeError || !challengeData) {
      return NextResponse.json(
        { error: "No registration challenge found. Please try again." },
        { status: 400 },
      );
    }

    // Check if challenge has expired
    if (new Date(challengeData.expires_at) < new Date()) {
      // Clean up expired challenge
      await supabase
        .from("webauthn_challenges")
        .delete()
        .eq("user_id", user.id)
        .eq("type", "registration");

      return NextResponse.json(
        { error: "Registration challenge expired. Please try again." },
        { status: 400 },
      );
    }

    // Verify the client data
    const clientDataJSON = Buffer.from(
      credential.response.clientDataJSON,
      "base64url",
    ).toString("utf8");
    const clientData = JSON.parse(clientDataJSON);

    // Verify the challenge matches
    if (clientData.challenge !== challengeData.challenge) {
      return NextResponse.json(
        { error: "Challenge mismatch" },
        { status: 400 },
      );
    }

    // Verify the type
    if (clientData.type !== "webauthn.create") {
      return NextResponse.json(
        { error: "Invalid credential type" },
        { status: 400 },
      );
    }

    // Extract transports if available
    const transports = credential.response.transports || ["internal", "hybrid"];

    // Determine credential type based on authenticator attachment
    const credentialType =
      credential.authenticatorAttachment === "platform"
        ? "platform"
        : "security_key";

    // Store the credential
    const { data: storedCredential, error: storeError } = await supabase
      // idor-audit: pk-owner-checked — INSERT writes `user_id` from the caller-supplied id; there is no prior row to filter on
      .from("webauthn_credentials")
      .insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: credential.response.attestationObject,
        name: credentialName || challengeData.credential_name || "My Passkey",
        type: credentialType,
        transports,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (storeError) {
      console.error("Failed to store credential:", storeError);
      return NextResponse.json(
        { error: "Failed to store credential" },
        { status: 500 },
      );
    }

    // Clean up the challenge
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "registration");

    return NextResponse.json({
      success: true,
      credential: {
        id: storedCredential.id,
        credentialId: storedCredential.credential_id,
        name: storedCredential.name,
        type: storedCredential.type,
        createdAt: storedCredential.created_at,
      },
    });
  } catch (error) {
    console.error("WebAuthn registration verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 },
    );
  }
});
