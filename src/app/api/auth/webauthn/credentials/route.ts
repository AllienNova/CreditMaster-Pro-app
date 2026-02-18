/**
 * WebAuthn Credentials Management API
 *
 * GET: List all credentials for the authenticated user
 * DELETE: Remove a credential by ID
 * PATCH: Update credential name
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
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

    // Get all credentials for this user
    const { data: credentials, error: credentialsError } = await supabase
      .from("webauthn_credentials")
      .select(
        "id, credential_id, name, type, transports, created_at, last_used_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (credentialsError) {
      // CredentialsAPI error: Failed to fetch credentials
      return NextResponse.json(
        { error: "Failed to fetch credentials" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      credentials: (credentials || []).map((cred) => ({
        id: cred.id,
        credentialId: cred.credential_id,
        name: cred.name,
        type: cred.type,
        transports: cred.transports,
        createdAt: cred.created_at,
        lastUsedAt: cred.last_used_at,
      })),
    });
  } catch (_error) {
    // CredentialsAPI error: List credentials error
    void _error;
    return NextResponse.json(
      { error: "Failed to list credentials" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Parse credential ID from request
    const body = await request.json();
    const { credentialId } = body;

    if (!credentialId) {
      return NextResponse.json(
        { error: "Credential ID is required" },
        { status: 400 },
      );
    }

    // Delete the credential (only if it belongs to this user)
    const { error: deleteError } = await supabase
      .from("webauthn_credentials")
      .delete()
      .eq("credential_id", credentialId)
      .eq("user_id", user.id);

    if (deleteError) {
      // CredentialsAPI error: Failed to delete credential
      return NextResponse.json(
        { error: "Failed to delete credential" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Credential deleted successfully",
    });
  } catch (_error) {
    // CredentialsAPI error: Delete credential error
    void _error;
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { credentialId, name } = body;

    if (!credentialId || !name) {
      return NextResponse.json(
        { error: "Credential ID and name are required" },
        { status: 400 },
      );
    }

    // Update the credential name (only if it belongs to this user)
    const { data: updatedCredential, error: updateError } = await supabase
      .from("webauthn_credentials")
      .update({ name })
      .eq("credential_id", credentialId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      // CredentialsAPI error: Failed to update credential
      return NextResponse.json(
        { error: "Failed to update credential" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      credential: {
        id: updatedCredential.id,
        credentialId: updatedCredential.credential_id,
        name: updatedCredential.name,
        type: updatedCredential.type,
        createdAt: updatedCredential.created_at,
        lastUsedAt: updatedCredential.last_used_at,
      },
    });
  } catch (_error) {
    // CredentialsAPI error: Update credential error
    void _error;
    return NextResponse.json(
      { error: "Failed to update credential" },
      { status: 500 },
    );
  }
}
