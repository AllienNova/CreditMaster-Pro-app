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
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";
import { CreditBureauService } from "@/lib/credit-bureau/credit-bureau-service";
import type { Bureau } from "@/lib/credit-bureau/types";

const VALID_BUREAUS = new Set<string>(["experian", "equifax", "transunion"]);

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;

    // 2. Check permission
    if (!rbac.hasPermission(user, "credit:read")) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 },
      );
    }

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
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const validation = await jwtValidation.validateFromHeaders(request);
    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = validation.user;

    // 2. Check permission
    if (!rbac.hasPermission(user, "credit:write")) {
      return NextResponse.json(
        { error: "Forbidden - Insufficient permissions" },
        { status: 403 },
      );
    }

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
}
