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

/**
 * Any Stripe `.create(` / `.update(` call, by its receiver chain.
 *
 * This replaced a six-name whitelist —
 * transfers|payouts|paymentIntents|charges|refunds|invoiceItems — which an
 * adversarial review of this gate broke twice over. `checkout.sessions.create`
 * and `invoices.create` both carry money fields and were never scanned; a LIVE
 * instance sat in the tree (src/lib/payment/stripe-service.ts, `unit_amount:
 * params.priceCents` inside checkout.sessions.create) while this gate printed
 * PASSED. A whitelist of resources is a promise to keep a list current against
 * a vendor API that adds to it, and that promise was already broken.
 *
 * Matching the receiver chain instead means new Stripe resources are covered
 * the day they are used. Non-Stripe `.create()` calls are excluded by the
 * /stripe/i test on the chain, so an internal repository create carrying a
 * dollar `amount` is not dragged in.
 */
const STRIPE_CALL = /([\w.$]+)\s*\.\s*(?:create|update)\s*\(/g;

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

/**
 * Bare integer literals are NOT self-evidently minor units.
 *
 * This used to be an automatic pass, on the reasoning that "a literal integer
 * is obviously cents". It is obviously cents only to a reader already thinking
 * in cents. `amount: 50` is FND-024 written as a literal: an author who means
 * "$50" and types 50 moves fifty cents, and the gate whose entire purpose is
 * that defect waved it through.
 *
 * Small integers now require the marker, which forces the author to state
 * where the value came from. Large ones (>= 1000, i.e. $10.00 and up) still
 * pass: at that magnitude a dollars-as-cents error is implausible as a literal
 * — nobody types 5000 meaning five thousand dollars in a field they believe
 * takes dollars — and requiring markers on every fee constant is the kind of
 * noise that gets a gate switched off.
 */
const INTEGER_LITERAL = /^-?\d+$/;
const LITERAL_OBVIOUSLY_CENTS = (expr) =>
  INTEGER_LITERAL.test(expr) && Math.abs(Number(expr)) >= 1000;

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

/**
 * Text between the parenthesis at `open` and its match, brace-counted.
 *
 * Returns null on an unbalanced run (truncated file, parenthesis inside a
 * string we mis-read) so the caller skips rather than scanning to EOF and
 * reporting every amount field in the rest of the module.
 */
function balancedArgs(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * The comment block immediately above `index`, however many lines it runs.
 *
 * A fixed N-line lookback was the first attempt and it was wrong in the worst
 * direction: it rejected a marker whose justification ran longer than the
 * window, which pushes authors toward terse unexplained markers — the opposite
 * of what the marker is for. Walking contiguous comment lines instead means a
 * justification can be as long as it needs to be, while a marker sitting above
 * some OTHER field, with code in between, still does not count.
 */
function precedingCommentBlock(text, index) {
  const lines = text.slice(0, index).split("\n");
  // The field's own line is partial; start from the line above it.
  const block = [];
  for (let i = lines.length - 2; i >= 0; i--) {
    const t = lines[i].trim();
    if (t === "" || t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) {
      block.unshift(lines[i]);
      continue;
    }
    break;
  }
  return block.join("\n");
}

/** Run the detector over a source string; returns the offending expressions. */
function scan(text) {
  const found = [];
  for (const call of text.matchAll(new RegExp(STRIPE_CALL.source, "g"))) {
    if (!/stripe/i.test(call[1])) continue;
    const args = balancedArgs(text, call.index + call[0].length - 1);
    if (args === null) continue;
    for (const m of args.matchAll(AMOUNT_FIELD)) {
      const expr = m[2].trim();
      const preceding = precedingCommentBlock(args, m.index);
      if (SAFE_SOURCE.test(expr) || LITERAL_OBVIOUSLY_CENTS(expr) || MARKER.test(preceding)) continue;
      found.push(expr);
    }
  }
  return found;
}

// `--self-test` pins the three shapes an adversarial review slipped past the
// previous version. Each was PROVEN to evade it by execution, so each is
// asserted here rather than assumed fixed.
if (process.argv.includes("--self-test")) {
  const CASES = [
    [`await stripe.transfers.create({ amount: payoutDollars })`, true, "one-line dollar variable (the original FND-024 shape)"],
    ["await stripe.transfers\n  .create({\n    amount: payoutDollars,\n  })", true, "call split across lines by the formatter"],
    [`await stripe.checkout.sessions.create({ line_items: [{ price_data: { unit_amount: priceDollars } }] })`, true, "checkout.sessions — absent from the old resource whitelist"],
    [`await stripe.invoices.create({ amount: owedDollars })`, true, "invoices — also absent from the whitelist"],
    [`await stripe.transfers.create({ amount: 50 })`, true, "small bare integer — 50 cents or a $50 payout typed as 50?"],
    [`await stripe.transfers.create({ amount: toStripeAmount(fromDollars(x)) })`, false, "the sanctioned conversion still passes"],
    [`await stripe.transfers.create({ amount: 5000 })`, false, "a large literal is implausible as dollars-as-cents"],
    [`await repo.create({ amount: dollars })`, false, "a non-Stripe create is not this gate's business"],
  ];
  let bad = 0;
  for (const [src, shouldFlag, why] of CASES) {
    const flagged = scan(src).length > 0;
    if (flagged === shouldFlag) continue;
    bad++;
    console.log(`  SELF-TEST FAIL: expected ${shouldFlag ? "FLAG" : "PASS"} — ${why}`);
  }
  console.log(
    bad === 0
      ? `audit:money self-test PASSED — ${CASES.length}/${CASES.length} detector cases correct.`
      : `audit:money self-test FAILED — ${bad} of ${CASES.length} cases wrong.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

const offenders = [];
let callsChecked = 0;
let fieldsChecked = 0;

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  // A test's whole job may be to assert the wrong shape is rejected.
  if (/__tests__|\.test\.|\.spec\./.test(rel)) continue;

  const text = readFileSync(file, "utf8");

  // Whole-file text, not line by line.
  //
  // The previous version tested each LINE for the call, so any call whose
  // receiver and method sat on different lines never entered the scan at all —
  // proven by execution during an adversarial review:
  //
  //     await stripe.transfers
  //       .create({ amount: 5000 })   // never seen by the gate
  //
  // Prettier produces that shape on its own once the line grows past 80
  // columns. The formatter could silence the gate.
  //
  // The 40-line window is gone with it. The argument list is now delimited by
  // its own parentheses, so a call is read exactly as far as it actually
  // extends: no truncation on a long params object, no bleed into the next
  // call on a short one.
  for (const call of text.matchAll(STRIPE_CALL)) {
    if (!/stripe/i.test(call[1])) continue;
    callsChecked++;

    const args = balancedArgs(text, call.index + call[0].length - 1);
    if (args === null) continue;

    for (const m of args.matchAll(AMOUNT_FIELD)) {
      fieldsChecked++;

      const expr = m[2].trim();
      const safe =
        SAFE_SOURCE.test(expr) ||
        LITERAL_OBVIOUSLY_CENTS(expr) ||
        MARKER.test(precedingCommentBlock(args, m.index));

      if (!safe) {
        const line = text.slice(0, call.index + m.index).split("\n").length;
        offenders.push(`${rel}:~${line}  ${m[1]}: ${expr.slice(0, 70)}`);
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
