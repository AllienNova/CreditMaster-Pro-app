import { FederalIntegrationService } from "@/lib/federal-integration-service";
import { NextRequest, NextResponse } from "next/server";

const federalIntegrationService = new FederalIntegrationService();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url, "http://localhost");
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const result = await federalIntegrationService.retrieveNSLDSData(userId);

  return NextResponse.json(result);
}
