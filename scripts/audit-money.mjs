#!/usr/bin/env node
/**
 * audit:money — no money crosses the Stripe boundary without a cents conversion.
 *
 * WHY A STATIC GATE AS WELL AS TESTS. FND-024 sent dollars into Stripe's
 * integer-cents `amount` field: a $50 payout moved 50 cents. The unit tests of
 * the conversion helper were green throughout, because the helper was never the
 * problem — the CALL SITE simply did not use it. A test only covers the call
 * sites someone remembered to write a test for; this covers every call site
 * that exists, including the next one added.
 *
 * THE RULE. Any object literal passed to a Stripe SDK method that charges,
 * transfers or pays out must derive its `amount` (or `unit_amount`) from the
 * money module — `toStripeAmount(...)`, `fromDollars(...)` or `cents(...)` —
 * or carry an explicit justification marker:
 *
 *   // money-audit: already-cents — <where the integer cents came from>
 *
 * A bare variable or arithmetic expression fails, because that is exactly what
 * the defect looked like: `amount: payout.netAmount`.
 *
 * Exit 0 clean, 1 with offenders.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Stripe calls whose amount field is money leaving the platform. */
const MONEY_CALLS =
  /\b(transfers|payouts|paymentIntents|charges|refunds|invoiceItems)\.create\s*\(/;

/**
 * The amount-bearing fields Stripe expects in integer minor units.
 *
 * NOT anchored to the start of a line. The first version of this gate was, and
 * it silently missed
 *   stripe.transfers.create({ amount: payout.netAmount, currency: "usd" })
 * — the FND-024 defect written on ONE line. A probe caught it: the gate
 * reported PASSED on a file containing the exact bug it exists to detect.
 * Match the field wherever it sits in the argument object.
 */
const AMOUNT_FIELD =
  /\b(amount|unit_amount|amount_off|application_fee_amount)\s*:\s*([^,}\n]+)/g;

/**
 * Conversions that establish integer cents.
 *
 * `Math.round(x * 100)` is included deliberately: it is the exact formula the
 * Wave 7 plan names ("integer cents = Math.round(input * 100)"), and rejecting
 * a correct inline conversion would push authors toward the marker, which is
 * weaker evidence than the arithmetic itself. Truncation is NOT accepted —
 * Math.floor/trunc under-bill by a cent on most float inputs.
 */
const SAFE_SOURCE =
  /\b(toStripeAmount|fromDollars|cents)\s*\(|Math\.round\s*\([^)]*\*\s*100/;

/** Literal integers are already minor units and self-evidently so. */
const INTEGER_LITERAL = /^-?\d+$/;

const MARKER = /\/\/\s*money-audit:\s*already-cents\s*[—-]\s*\S/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

const offenders = [];
let callsChecked = 0;
let fieldsChecked = 0;

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  // A test's whole job may be to assert the wrong shape is rejected.
  if (/__tests__|\.test\.|\.spec\./.test(rel)) continue;

  const lines = readFileSync(file, "utf8").split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (!MONEY_CALLS.test(lines[i])) continue;
    callsChecked++;

    // Scan the argument object as TEXT so an amount field is found whether the
    // call spans 20 lines or is written on one. 40 lines is generous for a
    // Stripe params object.
    const end = Math.min(lines.length, i + 40);

    for (let j = i; j < end; j++) {
      for (const m of lines[j].matchAll(AMOUNT_FIELD)) {
        fieldsChecked++;

        const expr = m[2].trim();
        const window = lines.slice(Math.max(0, j - 3), j + 1).join("\n");

        const safe =
          SAFE_SOURCE.test(expr) ||
          INTEGER_LITERAL.test(expr) ||
          MARKER.test(window);

        if (!safe) {
          offenders.push(`${rel}:${j + 1}  ${m[1]}: ${expr.slice(0, 70)}`);
        }
      }
    }
  }
}

console.log(
  `audit:money — ${callsChecked} money-moving Stripe call(s), ${fieldsChecked} amount field(s) checked`,
);

if (offenders.length === 0) {
  console.log("audit:money PASSED — every Stripe amount derives from @/lib/money.");
  process.exit(0);
}

console.log(`\naudit:money FAILED — ${offenders.length} amount field(s) not provably integer cents:\n`);
offenders.forEach((o) => console.log(`  ${o}`));
console.log(
  `\nStripe amounts are integer MINOR UNITS. Passing a dollar figure sends 1% of` +
    `\nthe intended value (FND-024: a $50 payout moved 50 cents).` +
    `\n\nUse toStripeAmount(fromDollars(x)) from @/lib/money, or justify with` +
    `\n  // money-audit: already-cents — <where the integer cents came from>`,
);
process.exit(1);
