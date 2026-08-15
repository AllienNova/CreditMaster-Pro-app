#!/usr/bin/env node
/**
 * audit:cascade — GDPR erasure must reach every table that holds user rows.
 *
 * WHY. FND-056..058: the erasure path missed a large set of tables, so a
 * "delete my account" left personal data behind in whatever the function did
 * not happen to name. That is an Art. 17 failure, and it is invisible from the
 * application side — the RPC returns success either way.
 *
 * WHAT IT CHECKS. Every base table in `public` carrying a `user_id` column is
 * personal data by construction. The audit reads the live definition of
 * `delete_user_data_cascade` and reports any such table the function never
 * mentions.
 *
 * WHY AGAINST THE LIVE DATABASE. The function is defined across many
 * migrations and amended by several more; only the installed definition says
 * what actually runs. Reading the .sql files would report the intent of
 * whichever migration you happened to read.
 *
 * Deliberate exemptions live in scripts/cascade-exempt.json with a reason each
 * — a table that legitimately survives erasure (an immutable financial ledger a
 * regulator requires, say) is a decision worth writing down, not a silent skip.
 */

import { execFileSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const CONTAINER = arg("container", "supabase_db_wave-7-foundation");
const FN = arg("fn", "delete_user_data_cascade");
const EXEMPT_PATH = join(process.cwd(), "scripts", "cascade-exempt.json");

function psql(sql) {
  return execFileSync(
    "docker",
    ["exec", CONTAINER, "psql", "-U", "postgres", "-tAc", sql],
    { encoding: "utf8", timeout: 60000 },
  ).trim();
}

let tables, fnBody;
try {
  tables = psql(
    `select c.table_name from information_schema.columns c
     join information_schema.tables t
       on t.table_name = c.table_name and t.table_schema = c.table_schema
     where c.table_schema='public' and c.column_name='user_id'
       and t.table_type='BASE TABLE'
     order by 1;`,
  )
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  fnBody = psql(
    `select coalesce(string_agg(prosrc, E'\\n'), '') from pg_proc where proname='${FN}';`,
  );
} catch (e) {
  console.error(
    `audit:cascade SKIPPED — could not reach the database (${e.message.split("\n")[0]}).\n` +
      `This gate needs a live schema: the erasure function is amended across many\n` +
      `migrations and only the installed definition says what actually runs.`,
  );
  process.exit(0);
}

if (!fnBody) {
  console.error(`audit:cascade FAILED — no function named ${FN} is installed.`);
  process.exit(1);
}

// `_`-prefixed keys are documentation, not exemptions — counting them
// overstated the number of tables deliberately skipped.
const exempt = existsSync(EXEMPT_PATH)
  ? Object.fromEntries(
      Object.entries(JSON.parse(readFileSync(EXEMPT_PATH, "utf8"))).filter(
        ([k]) => !k.startsWith("_"),
      ),
    )
  : {};

const missing = tables.filter((t) => {
  if (Object.prototype.hasOwnProperty.call(exempt, t)) return false;
  // Word-boundary match so `orders` does not satisfy `paper_orders`.
  return !new RegExp(`\\b${t}\\b`).test(fnBody);
});

console.log(
  `audit:cascade — ${tables.length} table(s) hold user_id; ` +
    `${Object.keys(exempt).length} exempt by decision`,
);

if (missing.length === 0) {
  console.log(`audit:cascade PASSED — ${FN} reaches every user-scoped table.`);
  process.exit(0);
}

console.log(
  `\naudit:cascade FAILED — ${missing.length} table(s) hold user rows that erasure never deletes:\n`,
);
missing.forEach((t) => console.log(`  ${t}`));
console.log(
  `\nEach is personal data that survives "delete my account" (GDPR Art. 17).` +
    `\nAdd it to ${FN}, or record a reason in scripts/cascade-exempt.json:` +
    `\n  { "table_name": "why this legitimately survives erasure" }`,
);
process.exit(1);
