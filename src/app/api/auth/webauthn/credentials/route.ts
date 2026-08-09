/**
 * WebAuthn Credentials Management API
 *
 * GET: List all credentials for the authenticated user
 * DELETE: Remove a credential by ID
 * PATCH: Update credential name
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";

// Service-role client for credential queries. Every query below is explicitly
// scoped to the authenticated user's id, so the user can only ever touch
// their own credentials.
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const GET = withAuth(
  async (_request: NextRequest, user: AuthedUser) => {
    try {
      const supabase = getServiceClient();

      const { data: credentials, error: credentialsError } = await supabase
        .from("webauthn_credentials")
        .select(
          "id, credential_id, name, type, transports, created_at, last_used_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (credentialsError) {
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
      void _error;
      return NextResponse.json(
        { error: "Failed to list credentials" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const supabase = getServiceClient();

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
      void _error;
      return NextResponse.json(
        { error: "Failed to delete credential" },
        { status: 500 },
      );
    }
  },
);

export const PATCH = withAuth(
  async (request: NextRequest, user: AuthedUser) => {
    try {
      const supabase = getServiceClient();

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
      void _error;
      return NextResponse.json(
        { error: "Failed to update credential" },
        { status: 500 },
      );
    }
  },
);
