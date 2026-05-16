import { NextRequest, NextResponse } from "next/server";
import { subscriptionCancellationService } from "@/lib/financial/subscription-cancellation-service";
import { withAuth } from "@/lib/auth/api-guard";
import type { AuthedUser } from "@/lib/auth/api-guard";

export const GET = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
    const merchant = request.nextUrl.searchParams.get("merchant");

    if (!merchant) {
      return NextResponse.json({ info: null }, { status: 200 });
    }

    try {
      const info =
        subscriptionCancellationService.getCancellationInfo(merchant);
      return NextResponse.json({ info });
    } catch {
      return NextResponse.json({ info: null }, { status: 200 });
    }
  },
);
