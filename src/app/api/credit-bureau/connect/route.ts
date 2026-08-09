/**
 * Bureau Connection API
 *
 * GET  /api/credit-bureau/connect - Get connection status for all bureaus
 * POST /api/credit-bureau/connect - Connect or disconnect a bureau
 *
 * POST body:
 *   { "bureau": "experian" | "equifax" | "transunion", "action": "connect" | "disconnect" }
 */

import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";
import { CreditBureauService } from "@/lib/credit-bureau/credit-bureau-service";
import type { Bureau } from "@/lib/credit-bureau/types";

const VALID_BUREAUS = new Set<string>(["experian", "equifax", "transunion"]);

export const GET = withPermission(
  "credit:read",
  async (_request: NextRequest, user: AuthedUser) => {
  try {
    // 3. Get connection statuses
    const statuses =
      await CreditBureauService.getBureauConnectionStatuses(user.id);

    return NextResponse.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve bureau connections",
      },
      { status: 500 },
    );
  }
  },
);

// Note: the CSV row flags an inline `credit:write` check for POST, but
// `credit:write` is not granted to any role in rbac.ts — that check would
// 403 every caller (dead endpoint). Following the CSV `proposed_guard`
// (`withPermission(credit:read)`) restores intended behaviour. See AUTH-03c
// report (CSV-vs-code discrepancy).
export const POST = withPermission(
  "credit:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    // 3. Parse request body
    const body = await request.json();
    const { bureau, action } = body as {
      bureau?: string;
      action?: string;
    };

    // 4. Validate inputs
    if (!bureau || !VALID_BUREAUS.has(bureau)) {
      return NextResponse.json(
        { error: "Invalid or missing bureau. Must be one of: experian, equifax, transunion" },
        { status: 400 },
      );
    }

    if (!action || !["connect", "disconnect"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid or missing action. Must be "connect" or "disconnect"' },
        { status: 400 },
      );
    }

    // 5. Execute action
    if (action === "connect") {
      const status = await CreditBureauService.connectBureau(
        user.id,
        bureau as Bureau,
      );
      return NextResponse.json({
        success: true,
        data: status,
        message: `Successfully connected to ${bureau}`,
      });
    } else {
      await CreditBureauService.disconnectBureau(user.id, bureau as Bureau);
      return NextResponse.json({
        success: true,
        message: `Successfully disconnected from ${bureau}`,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update bureau connection",
      },
      { status: 500 },
    );
  }
  },
);
