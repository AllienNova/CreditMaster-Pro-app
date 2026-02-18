/**
 * VAPID Public Key API Route
 *
 * Returns the VAPID public key needed for client-side push subscription
 */

import { NextResponse } from "next/server";

export async function GET() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    publicKey: vapidPublicKey,
  });
}
