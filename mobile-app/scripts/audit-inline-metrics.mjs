#!/usr/bin/env node
/**
 * audit:inline-metrics — a screen must not hardcode a measurement about the user.
 *
 * WHY THIS EXISTS SEPARATELY FROM audit:screen-data. That gate looks for a
 * module-level constant ARRAY or OBJECT rendered by a screen, because that is
 * the shape every fabrication found by hand had taken. `/analytics` had none,
 * passed it clean, and told every user this:
 *
 *     <Text style={styles.statValue}>+45</Text>
 *     <Text style={styles.statLabel}>Score Change</Text>
 *     <Text style={styles.statValue}>87%</Text>
 *     <Text style={styles.statLabel}>Dispute Success</Text>
 *
 * A credit-score movement of +45 points and an 87% dispute success rate, on a
 * screen that makes no request at all. The numbers are inline JSX literals, so
 * there is no constant for a constant-hunting gate to find. This gate reads
 * what is BETWEEN the tags instead.
 *
 * WHAT COUNTS AS A MEASUREMENT. A literal is flagged when it is shaped like a
 * quantity someone measured: a signed number (+45), a percentage (87%), a
 * currency amount ($1,250), a multiple (4.2x), a decimal (78.5), or a bare
 * number of 100 or more (742). Those shapes do not occur by accident in copy.
 *
 * WHAT IS DELIBERATELY NOT FLAGGED, and why each would be noise:
 *   - zero in any form (0, 0%, $0, $0.00) — an empty state, not a claim
 *   - bare integers under 100 — step counters, list indices, badge counts
 *   - anything containing `{` — an expression is data, which is the goal
 *   - literals inside a .map() callback — those render a real collection
 *   - a year (1900-2099) on its own — a date, not a measurement
 *
 * Shrink-only, like the other gates here. Anything NEW fails immediately.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";

/**
 * Runs over EITHER tree. The defect is not mobile-specific — the web app has
 * 199 pages written the same way, and SF-20 already found
 * `credit/factors/page.tsx` holding the caller's score as `useState(742)`.
 *
 *   --root      directory to scan, relative to cwd   (default "app")
 *   --baseline  where the shrink-only list lives     (default scripts/inline-metrics-baseline.json)
 */
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const CWD = process.cwd();
const ROOT = join(CWD, arg("root", "app"));
const BASELINE = join(CWD, arg("baseline", join("scripts", "inline-metrics-baseline.json")));

/**
 * `<Tag ...>literal</Tag>` with no nested element and no expression.
 *
 * Both vocabularies in one pattern: React Native renders text only inside
 * `<Text>`, and the web app uses the ordinary HTML leaf elements. Neither tree
 * contains the other's tags, so a single list cannot cross-match.
 *
 * `<div>` is included deliberately. It is the tag a hardcoded stat most often
 * sits in on the web side, and the measurement shapes below are narrow enough
 * that a layout div holding no number never matches.
 */
const TEXT_TAGS =
  "Text|p|span|div|strong|b|em|dd|dt|td|th|li|h1|h2|h3|h4|h5|h6";
const TEXT_LITERAL = new RegExp(
  `<(${TEXT_TAGS})\\b[^>]*>([^<>{}]+?)</\\1>`,
  "gs",
);

/**
 * Shapes that read as something measured rather than something written.
 *
 * Ordered most to least specific; `bare` is last because it is the widest.
 */
const MEASUREMENT = [
  /^[+-]\s?\d[\d,]*(\.\d+)?( [a-z]{1,7})?$/, // +45   -1,200   +2.5   +6 pts
  /^[+-]?\$\s?\d[\d,]*(\.\d+)?$/, //            $1,250   $29.99   -$40
  /^[+-]?\d[\d,]*(\.\d+)?\s?%$/, //             87%   12.5%
  /^[+-]?\d[\d,]*(\.\d+)?x$/i, //               4.2x
  /^\d[\d,]*\.\d+$/, //                         78.5
  /^\d[\d,]{2,}$/, //                           742   1,250
];

const isYear = (s) => /^(19|20)\d{2}$/.test(s);
const isZero = (s) => /^[+-]?\$?\s?0+(\.0+)?\s?%?$/.test(s);

function isMeasurement(raw) {
  const s = raw.trim();
  if (!s || isZero(s) || isYear(s)) return false;
  return MEASUREMENT.some((re) => re.test(s));
}

/**
 * Character ranges covered by a `.map(...)` callback.
 *
 * A literal inside one renders per row of a real collection, so it is not a
 * hardcoded claim even when it looks like a number.
 */
function mapRanges(source) {
  const ranges = [];
  for (const m of source.matchAll(/\.map\(/g)) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    for (; i < source.length; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    ranges.push([m.index, i]);
  }
  return ranges;
}

const inRanges = (pos, ranges) => ranges.some(([a, b]) => pos >= a && pos <= b);

function findings(source) {
  const ranges = mapRanges(source);
  const out = [];
  for (const m of source.matchAll(TEXT_LITERAL)) {
    if (inRanges(m.index, ranges)) continue;
    // m[1] is the tag; m[2] is the literal between the tags.
    const value = m[2].trim();
    if (!isMeasurement(value)) continue;
    out.push({ value, line: source.slice(0, m.index).split("\n").length });
  }
  return out;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if ([".expo", "node_modules"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry) && !/\.(test|spec)\.tsx$/.test(entry))
      out.push(full);
  }
  return out;
}

const rel = (f) => relative(CWD, f).replace(/\\/g, "/");

// ── Self-test ───────────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) {
  let bad = 0;
  const check = (got, want, why) => {
    if (JSON.stringify(got) === JSON.stringify(want)) return;
    bad++;
    console.log(`  SELF-TEST FAIL: ${why}\n    got ${JSON.stringify(got)}`);
  };
  const values = (src) => findings(src).map((f) => f.value);

  check(
    values(`<Text style={styles.statValue}>+45</Text>`),
    ["+45"],
    "the real /analytics score-change literal is caught",
  );
  check(
    values(`<Text style={styles.statValue}>87%</Text>`),
    ["87%"],
    "a percentage is caught",
  );
  check(
    values(`<Text>$1,250</Text><Text>$29.99</Text><Text>4.2x</Text>`),
    ["$1,250", "$29.99", "4.2x"],
    "currency with grouping, currency with cents, and a multiple",
  );
  check(values(`<Text>742</Text>`), ["742"], "a bare number >= 100 is caught");
  check(
    values(`<Text>Score Change</Text><Text>Dispute Success</Text>`),
    [],
    "ordinary copy is not a measurement",
  );
  check(
    values(`<Text>0</Text><Text>0%</Text><Text>$0.00</Text>`),
    [],
    "zero in any form is an empty state, not a claim",
  );
  check(
    values(`<Text>1</Text><Text>2</Text><Text>12</Text>`),
    [],
    "bare integers under 100 are counters, not measurements",
  );
  check(values(`<Text>2024</Text>`), [], "a bare year is a date, not a measurement");
  check(
    values("<Text>{score}</Text><Text>{`+${delta}`}</Text>"),
    [],
    "an expression is data — which is the outcome this gate wants",
  );
  check(
    values(`{items.map((i) => (<Text>87%</Text>))}`),
    [],
    "a literal inside .map renders per row of a real collection",
  );
  check(
    values(`{a.map((x) => (<Text>{x.v}</Text>))}\n<Text>87%</Text>`),
    ["87%"],
    "a literal AFTER a .map is still caught — the range must close",
  );
  check(
    values(`<p className="stat">742</p><span>87%</span><h2>$1,250</h2>`),
    ["742", "87%", "$1,250"],
    "the web vocabulary is read too — the same defect, different tags",
  );
  check(
    values(`<div className="grid"><span>Score</span></div>`),
    [],
    "a layout div holding no number is not a measurement",
  );
  check(
    values(`<p>Save up to 30% on your first year</p>`),
    [],
    "a percentage inside a SENTENCE is copy, not a standalone stat",
  );
  check(
    values(`<Text\n  style={styles.v}\n>\n  +45\n</Text>`),
    ["+45"],
    "the literal is found across line breaks",
  );

  console.log(
    bad === 0
      ? "audit:inline-metrics self-test PASSED — 15/15 cases correct."
      : `audit:inline-metrics self-test FAILED — ${bad} wrong.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

// ── Scan ────────────────────────────────────────────────────────────────────
const offenders = [];
for (const file of walk(ROOT)) {
  const found = findings(readFileSync(file, "utf8"));
  if (found.length) offenders.push({ file: rel(file), found });
}

const key = (o) => `${o.file}: ${o.found.map((f) => f.value).join(", ")}`;

let baseline = { entries: {} };
try {
  baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
} catch {
  /* first run */
}

if (process.argv.includes("--freeze-baseline")) {
  const entries = {};
  for (const o of offenders) {
    entries[key(o)] = baseline.entries?.[key(o)] ?? {
      classification: "UNCLASSIFIED",
    };
  }
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        frozen: baseline.frozen ?? "2026-08-18",
        why:
          "Screens rendering a hardcoded measurement as inline JSX text. Each must be " +
          "classified `catalogue` (a price, a published rate, product copy) or " +
          "`fabrication` (a number presented as this user's). /analytics told every " +
          "user their score moved +45 and their dispute success was 87%, on a screen " +
          "that makes no request. This list may only shrink.",
        entries,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `audit:inline-metrics baseline frozen — ${Object.keys(entries).length} entries`,
  );
  process.exit(0);
}

const known = baseline.entries ?? {};
const novel = offenders.filter((o) => !known[key(o)]);
const gone = Object.keys(known).filter((k) => !offenders.some((o) => key(o) === k));

const total = offenders.reduce((n, o) => n + o.found.length, 0);
console.log(
  `audit:inline-metrics — ${offenders.length} screen(s) hardcode a measurement ` +
    `(${total} literal(s))`,
);

if (novel.length === 0) {
  console.log("audit:inline-metrics PASSED — no NEW hardcoded measurement.");
  const counts = Object.values(known).reduce((acc, e) => {
    acc[e.classification] = (acc[e.classification] || 0) + 1;
    return acc;
  }, {});
  for (const [k, n] of Object.entries(counts).sort()) console.log(`  ${n} ${k}`);
  if (gone.length) {
    console.log(
      `\n${gone.length} baselined entr(ies) are gone — run \`--freeze-baseline\`:\n` +
        gone.map((g) => `  ${g}`).join("\n"),
    );
  }
  process.exit(0);
}

console.log(`\naudit:inline-metrics FAILED — ${novel.length} NEW screen(s):\n`);
for (const o of novel) {
  console.log(`  ${o.file}`);
  for (const f of o.found) console.log(`      line ${f.line}: ${f.value}`);
}
console.log(
  `\nRead the value from the API, or classify it in ${rel(BASELINE)} as` +
    `\n"catalogue" if it is product copy rather than a claim about the caller.`,
);
process.exit(1);
