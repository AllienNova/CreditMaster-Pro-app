/**
 * Generate a trading signal for a symbol.
 *
 * WHY THIS FILE DID NOT EXIST UNTIL NOW. The signals page has always POSTed
 * here (src/app/investments/signals/page.tsx:674) and there was no route, so the
 * call fell through to /api/investments/signals/[id] with id="generate" — a
 * route that exports GET and PATCH. Next.js answered 405 and the page showed
 * "Failed to generate signal" to every user who pressed the button.
 *
 * Nothing caught it. The path-level check passed precisely BECAUSE the call
 * resolved: a literal segment is satisfied by a [dynamic] route, which is
 * correct in general and wrong here. The verb check added to audit:web-api is
 * what surfaced it — [id] exports GET and PATCH, the call is a POST.
 *
 * SignalGenerator.generateSignal() has been there the whole time. As with the
 * chat handlers and the market-data wrappers earlier, the capability existed and
 * only the route was missing.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SignalGenerator } from "@/lib/investments/signal-generator";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { rateLimit } from "@/lib/security/redis-rate-limiting";
import { AnalysisType } from "@/lib/investments/types/trading-signals.types";

/**
 * Deliberately tighter than the 100/hour the sibling routes use.
 *
 * Reading a signal is a database lookup; GENERATING one runs a full symbol
 * analysis and an AI pass per request. Sharing the read budget would let a
 * held-down button spend real money on model calls.
 */
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
});
const GENERATE_PER_HOUR = 30;

/**
 * The client sends { symbol, assetType, analysisTypes, timeframe }
 * (signals/page.tsx:677-682). Every field is validated against the same closed
 * sets generateSignal() declares, so an unknown value is a 400 here rather than
 * an unexplained failure deeper in the analysis.
 */
const GenerateSignalSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(12)
    // Tickers only. This value reaches a market-data provider and an AI prompt.
    .regex(/^[A-Za-z0-9.\-]+$/, "symbol must be alphanumeric"),
  assetType: z.enum(["stock", "etf", "crypto", "option"]).default("stock"),
  analysisTypes: z
    .array(z.nativeEnum(AnalysisType))
    .min(1, "at least one analysis type is required")
    .optional(),
  timeframe: z
    .enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"])
    .default("1d"),
});

export const POST = withAuth(async (request: NextRequest, user: AuthedUser) => {
  try {
    try {
      await limiter.check(GENERATE_PER_HOUR, user.id);
    } catch {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Maximum ${GENERATE_PER_HOUR} signal generations per hour.`,
        },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Validation error", message: "Body must be valid JSON" },
        { status: 400 },
      );
    }

    const parsed = GenerateSignalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: parsed.error.issues[0]?.message ?? "Invalid request",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { symbol, assetType, analysisTypes, timeframe } = parsed.data;

    // analysisTypes is omitted rather than passed as undefined so the generator
    // applies its own default set instead of receiving an explicit empty one.
    // Constructed per request, not at module scope. A module-level singleton is
    // built at IMPORT time, which makes the dependency invisible to a test that
    // has not yet swapped it — the first draft of this route did that and every
    // generation case failed with "generateSignal is not a function". The
    // constructor is a thin wrapper over a client, so per-request costs nothing.
    const signalGenerator = new SignalGenerator();

    const signal = await signalGenerator.generateSignal(
      user.id,
      symbol.toUpperCase(),
      assetType,
      analysisTypes,
      timeframe,
    );

    return NextResponse.json({ success: true, data: signal }, { status: 201 });
  } catch (error: unknown) {
    // No fabricated signal on failure. A made-up buy/sell recommendation is the
    // worst thing this codebase could return, and the page already handles a
    // non-ok response by telling the user it could not generate one.
    console.error("Generate signal API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Could not generate a signal for that symbol",
      },
      { status: 500 },
    );
  }
});
