/**
 * Admin Logs API
 *
 * NOTE: The `system_logs` table does not exist. This route returns an honest
 * empty result with `dataAvailable: false` rather than fabricated data.
 *
 * Follow-up required: build the `system_logs` table + writer so the admin
 * logs view is populated with real application log data.
 *
 * SECURITY: Requires admin authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withRole(
  "admin",
  async (_request: NextRequest, _user: AuthedUser) => {
    // system_logs table does not yet exist. Return an honest empty response
    // rather than fabricated data. When the table and writer are built, replace
    // this with a real Supabase query against system_logs.
    return NextResponse.json({
      logs: [],
      total: 0,
      dataAvailable: false,
      message:
        "System logs are not yet available. A system_logs table and writer are needed to populate this view.",
    });
  },
);
