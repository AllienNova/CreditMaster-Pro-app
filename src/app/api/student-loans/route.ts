import { FederalIntegrationService } from "@/lib/federal-integration-service";
import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";

const federalIntegrationService = new FederalIntegrationService();

export const GET = withAuth(
  async (_req: NextRequest, user: AuthedUser) => {
    // NSLDS data is always retrieved for the authenticated user — a
    // client-supplied `userId` query param is never trusted.
    const result = await federalIntegrationService.retrieveNSLDSData(user.id);

    return NextResponse.json(result);
  },
);
