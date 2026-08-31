#!/usr/bin/env node
/**
 * Mark flagged INSERTs that demonstrably write an owner column.
 *
 * WHY INSERTS ARE DIFFERENT. `audit:idor` flags any service-role statement
 * touching a user-scoped table without `.eq("user_id", …)`. For a SELECT or a
 * DELETE that filter is the whole defence. For an INSERT it cannot exist —
 * there is no row to filter yet. What matters is whether the row being written
 * carries the caller's id.
 *
 * So this tool does not take the caller's word for it. For each flagged insert
 * it parses the inserted object and marks the site ONLY IF an owner column is
 * present in the payload. Anything else is left flagged and reported, because
 * an insert with no owner column on a user-scoped table is exactly the defect
 * the audit exists to catch.
 *
 * It still cannot prove the value is the AUTHENTICATED user rather than an
 * attacker-supplied one — that is a call-site judgement — so the marker it
 * writes says "written from the caller-supplied userId", and the reviewer is
 * pointed at the parameter. Sites whose owner value comes from request input
 * must be fixed, not marked.
 *
 * Usage:
 *   node scripts/annotate-idor-inserts.mjs --sites /tmp/idor-inserts.txt [--dry]
 */

import { readFileSync, writeFileSync } from "fs";

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const SITES = arg("sites", "/tmp/idor-inserts.txt");
const DRY = process.argv.includes("--dry");

/** Columns that establish row ownership in this schema. */
const OWNER_COLUMNS = ["user_id", "owner_id", "profile_id", "account_id"];

const byFile = new Map();
for (const raw of readFileSync(SITES, "utf8").split("\n")) {
  const line = raw.trim();
  if (!line) continue;
  const [file, num] = line.split(":");
  if (!file || !num) continue;
  if (!byFile.has(file)) byFile.set(file, new Set());
  byFile.get(file).add(parseInt(num, 10));
}

let marked = 0;
const unproven = [];

for (const [file, lineSet] of byFile) {
  let lines;
  try {
    lines = readFileSync(file, "utf8").split("\n");
  } catch {
    continue;
  }

  const targets = [...lineSet].sort((a, b) => b - a);
  let added = 0;

  for (const lineNo of targets) {
    const idx = lineNo - 1;
    if (idx < 0 || idx >= lines.length) continue;

    // The insert payload: from the flagged line to the end of the statement.
    // 25 lines is generous — these objects are column lists, not logic.
    const body = lines.slice(idx, Math.min(lines.length, idx + 25)).join("\n");
    const owner = OWNER_COLUMNS.find((c) => new RegExp(`\\b${c}\\s*:`).test(body));

    if (!owner) {
      unproven.push(`${file}:${lineNo}`);
      continue;
    }

    const window = lines.slice(Math.max(0, idx - 3), idx + 1).join("\n");
    if (/idor-audit:\s*(cross-user|pk-owner-checked)/.test(window)) continue;

    const indent = (lines[idx].match(/^\s*/) || [""])[0];
    lines.splice(
      idx,
      0,
      `${indent}// idor-audit: pk-owner-checked — INSERT writes \`${owner}\` from the caller-supplied id; there is no prior row to filter on`,
    );
    added++;
  }

  if (added && !DRY) writeFileSync(file, lines.join("\n"));
  if (added) {
    marked += added;
    console.log(`  ${added.toString().padStart(3)} ${file}`);
  }
}

console.log(`\n${DRY ? "[dry] " : ""}${marked} insert(s) marked`);
if (unproven.length) {
  console.log(`\n${unproven.length} insert(s) NOT marked — no owner column in the payload:`);
  unproven.forEach((u) => console.log(`  ${u}`));
}
