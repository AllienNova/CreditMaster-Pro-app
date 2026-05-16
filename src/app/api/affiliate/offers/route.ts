import { NextRequest, NextResponse } from "next/server";
import { withPermission, type AuthedUser } from "@/lib/auth/api-guard";
import { productMatcher } from "@/lib/affiliate/product-matcher";
import { creditCardMatcher } from "@/lib/affiliate/credit-card-matcher";
import { insuranceMatcher } from "@/lib/affiliate/insurance-matcher";
import { loanMatcher } from "@/lib/affiliate/loan-matcher";
import { moneyLionClient } from "@/lib/affiliate/moneylion-client";
import { complianceChecker } from "@/lib/affiliate/compliance-checker";
import type { UserMatchProfile, MoneyLionProductCategory } from "@/lib/affiliate/types";
import type { InsuranceType } from "@/lib/affiliate/insurance-matcher";
import type { LoanType } from "@/lib/affiliate/loan-matcher";

/**
 * GET /api/affiliate/offers
 *
 * Returns matched affiliate product offers for the authenticated user.
 *
 * Query params:
 *   category  - "credit_card" | "loan" | "insurance" | "all" (default: "all")
 *   subType   - Sub-category filter (e.g., loan type "personal", insurance type "auto")
 *   limit     - Max results per category (default: 10)
 */
export const GET = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const subType = searchParams.get("subType") || undefined;
    const limit = Math.min(
      Math.max(1, Number.parseInt(searchParams.get("limit") || "10")),
      50,
    );

    const profile: UserMatchProfile = {
      userId,
      creditScore: searchParams.has("creditScore")
        ? Number.parseInt(searchParams.get("creditScore")!)
        : undefined,
      annualIncome: searchParams.has("annualIncome")
        ? Number.parseFloat(searchParams.get("annualIncome")!)
        : undefined,
      state: searchParams.get("state") || undefined,
    };

    const results: Record<string, unknown> = {};

    if (category === "all" || category === "credit_card") {
      const cards = creditCardMatcher.getRecommendations(profile, { limit });
      results.creditCards = cards;
    }

    if (category === "all" || category === "loan") {
      const loanType = subType as LoanType | undefined;
      const loans = loanMatcher.getRecommendations(profile, loanType, limit);
      results.loans = loans;
    }

    if (category === "all" || category === "insurance") {
      const insuranceType = subType as InsuranceType | undefined;
      const insurance = insuranceMatcher.getRecommendations(
        profile,
        insuranceType,
        limit,
      );
      results.insurance = insurance;
    }

    if (category === "all" || category === "general") {
      const catalogCategory = searchParams.get(
        "catalogCategory",
      ) as MoneyLionProductCategory | undefined;
      const catalog = await moneyLionClient.getProductCatalog(catalogCategory);
      const matched = productMatcher.matchProducts(catalog, profile, { limit });
      results.general = matched;
    }

    return NextResponse.json({
      success: true,
      data: results,
      meta: { category, limit, userId },
    });
  } catch (error) {
    console.error("Error fetching affiliate offers:", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliate offers" },
      { status: 500 },
    );
  }
},
);

/**
 * POST /api/affiliate/offers
 *
 * Track a click event when a user clicks on an affiliate offer.
 *
 * Body: { productId, partnerId, source?, referrer? }
 */
export const POST = withPermission(
  "financial:read",
  async (request: NextRequest, user: AuthedUser) => {
  try {
    const userId = user.id;
    const body = await request.json();

    if (!body.productId || !body.partnerId) {
      return NextResponse.json(
        { error: "productId and partnerId are required" },
        { status: 400 },
      );
    }

    const clickEvent = {
      userId,
      productId: String(body.productId),
      partnerId: String(body.partnerId),
      sessionId: String(body.sessionId || crypto.randomUUID()),
      source: body.source ? String(body.source) : undefined,
      referrer: body.referrer ? String(body.referrer) : undefined,
      timestamp: new Date(),
    };

    const result = await moneyLionClient.trackClick(clickEvent);

    // Validate compliance for the click
    const catalog = await moneyLionClient.getProductCatalog();
    const product = catalog.find((p) => p.productId === body.productId);
    if (product) {
      const disclosures = complianceChecker.getRequiredDisclosures(product);
      return NextResponse.json({
        success: true,
        data: { clickId: result.clickId, disclosures },
      });
    }

    return NextResponse.json({
      success: true,
      data: { clickId: result.clickId },
    });
  } catch (error) {
    console.error("Error tracking affiliate click:", error);
    return NextResponse.json(
      { error: "Failed to track affiliate click" },
      { status: 500 },
    );
  }
},
);
