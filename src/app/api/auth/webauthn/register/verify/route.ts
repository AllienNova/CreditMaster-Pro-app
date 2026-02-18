/**
 * WebAuthn Registration Verify API
 *
 * Verifies the credential creation response from the browser
 * and stores the credential in the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

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
}
