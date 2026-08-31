/**
 * Tax Bracket Visualization API
 *
 * POST /api/tax/brackets
 * Returns the federal bracket table for a filing status, the bracket a given
 * taxable income falls in, and the resulting marginal and effective rates.
 *
 * WHY THIS EXISTS. TaxBracketCalculator has held the real IRS 2024 tables all
 * along, and the mobile bracket screen has been calling /tax/brackets all
 * along. Nothing connected them, so the screen 404'd and rendered an empty
 * state — a feature that looked built from either end and worked from neither.
 *
 * Nothing here is stored or read per-user: the caller supplies an income and
 * gets arithmetic back. It still requires authentication, because a public
 * endpoint that performs unbounded computation is a free CPU faucet.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthedUser } from "@/lib/auth/api-guard";
import { TaxBracketCalculator } from "@/lib/tax/services/TaxBracketCalculator";
import { FilingStatus } from "@/lib/tax/types/tax-profile.types";
import { FEDERAL_TAX_BRACKETS_2024 } from "@/lib/tax/types/tax-jurisdiction.types";

const FILING_STATUSES = Object.values(FilingStatus) as string[];

/** Ceiling on a single call's income, so one request cannot ask for nonsense. */
const MAX_TAXABLE_INCOME = 1_000_000_000;

/**
 * The tax years this codebase actually holds bracket data for.
 *
 * Only 2024 exists (FEDERAL_TAX_BRACKETS_2024 is the sole table). Accepting
 * `taxYear: 2023`, echoing it back, and silently applying 2024 brackets would
 * hand someone a confidently wrong number for a prior-year return. Rejecting is
 * the honest answer until another year is loaded.
 */
const SUPPORTED_TAX_YEARS = [2024];

interface BracketRequest {
  taxYear?: number;
  filingStatus?: string;
  taxableIncome?: number;
}

/**
 * Progressive tax on `income`, summed slice by slice.
 *
 * Deliberately NOT `income * marginalRate`. That is the mistake this endpoint
 * exists to prevent a user from making by eye: only the portion above each
 * threshold is taxed at that bracket's rate, so a flat multiplication
 * overstates the bill for every filer above the lowest band.
 */
function progressiveTax(
  income: number,
  brackets: readonly { min: number; max: number; rate: number }[],
): number {
  let owed = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    const slice = Math.min(income, bracket.max) - bracket.min;
    owed += slice * bracket.rate;
  }
  return owed;
}

export const POST = withAuth(
  async (request: NextRequest, _user: AuthedUser) => {
    let body: BracketRequest;
    try {
      body = (await request.json()) as BracketRequest;
    } catch {
      return NextResponse.json(
        { error: "Request body must be JSON" },
        { status: 400 },
      );
    }

    const { taxYear, filingStatus, taxableIncome } = body;

    if (typeof taxableIncome !== "number" || !Number.isFinite(taxableIncome)) {
      return NextResponse.json(
        { error: "taxableIncome is required and must be a number" },
        { status: 400 },
      );
    }
    if (taxableIncome < 0 || taxableIncome > MAX_TAXABLE_INCOME) {
      return NextResponse.json(
        { error: `taxableIncome must be between 0 and ${MAX_TAXABLE_INCOME}` },
        { status: 400 },
      );
    }
    // An unrecognised status must NOT quietly fall back to `single`: the same
    // $50,000 is 22% single and 12% filing jointly, so a silent default would
    // overstate a married filer's marginal rate by ten points and look
    // authoritative doing it.
    if (!filingStatus || !FILING_STATUSES.includes(filingStatus)) {
      return NextResponse.json(
        {
          error: `filingStatus is required and must be one of: ${FILING_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const year = typeof taxYear === "number" ? taxYear : SUPPORTED_TAX_YEARS[0];
    if (!SUPPORTED_TAX_YEARS.includes(year)) {
      return NextResponse.json(
        {
          error: `No bracket data for tax year ${year}. Supported: ${SUPPORTED_TAX_YEARS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const calculator = new TaxBracketCalculator(year);

    const brackets =
      FEDERAL_TAX_BRACKETS_2024[
        filingStatus as keyof typeof FEDERAL_TAX_BRACKETS_2024
      ];

    const marginalRate = calculator.getMarginalRate(
      taxableIncome,
      filingStatus as FilingStatus,
    );

    const currentBracket =
      brackets.find(
        (b) => taxableIncome >= b.min && taxableIncome < (b.max || Infinity),
      ) ?? brackets[brackets.length - 1];

    const owed = progressiveTax(taxableIncome, brackets);
    const effectiveRate = taxableIncome > 0 ? owed / taxableIncome : 0;

    return NextResponse.json({
      success: true,
      data: {
        filingStatus,
        taxYear: year,
        brackets,
        currentBracket,
        effectiveRate,
        marginalRate,
      },
    });
  },
);
