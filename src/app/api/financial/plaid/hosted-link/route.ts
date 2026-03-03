/**
 * Plaid Hosted Link API Route
 *
 * Generates a Plaid Hosted Link URL for mobile app bank account linking.
 * The hosted link can be opened in a WebView or system browser on mobile devices.
 *
 * POST /api/financial/plaid/hosted-link
 * Body: { userId: string, redirectUri?: string }
 * Response: { hostedLinkUrl: string, linkToken: string, expiration: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getPlaidClient } from "@/lib/financial/plaid-client";
import { jwtValidation } from "@/lib/auth/jwt-validation";
import { rbac } from "@/lib/auth/rbac";

const DEFAULT_REDIRECT_URI = "fynvita://plaid-callback";

export async function POST(request: NextRequest) {
  try {
    // Validate JWT token
    const validation = await jwtValidation.validateFromHeaders(request);

    if (!validation.valid || !validation.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!rbac.hasPermission(validation.user, "financial:link_accounts")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, redirectUri } = body as {
      userId?: string;
      redirectUri?: string;
    };

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    // Verify the requesting user matches the userId or is an admin
    if (validation.user.id !== userId && validation.user.role !== "admin" && validation.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: userId does not match authenticated user" },
        { status: 403 },
      );
    }

    const completionRedirectUri = redirectUri || DEFAULT_REDIRECT_URI;

    const client = getPlaidClient();
    const response = await client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Fynvita",
      products: [Products.Transactions, Products.Auth, Products.Identity],
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/financial/plaid/webhook`,
      hosted_link: {
        completion_redirect_uri: completionRedirectUri,
        is_mobile_app: true,
        url_lifetime_seconds: 3600, // 1 hour
      },
    });

    const hostedLinkUrl = response.data.hosted_link_url;

    if (!hostedLinkUrl) {
      return NextResponse.json(
        { error: "Plaid did not return a hosted link URL. Ensure hosted link is enabled for your Plaid account." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hostedLinkUrl,
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
      },
    });
  } catch (error) {
    console.error("Error creating hosted link:", error);
    return NextResponse.json(
      { error: "Failed to create hosted link" },
      { status: 500 },
    );
  }
}
