import { NextRequest, NextResponse } from "next/server";
import { subscriptionCancellationService } from "@/lib/financial/subscription-cancellation-service";

export async function GET(request: NextRequest) {
  const merchant = request.nextUrl.searchParams.get("merchant");

  if (!merchant) {
    return NextResponse.json({ info: null }, { status: 200 });
  }

  try {
    const info = subscriptionCancellationService.getCancellationInfo(merchant);
    return NextResponse.json({ info });
  } catch {
    return NextResponse.json({ info: null }, { status: 200 });
  }
}
