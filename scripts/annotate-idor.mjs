#!/usr/bin/env node
/**
 * Insert `// idor-audit:` justification markers above flagged queries.
 *
 * WHY A TOOL AND NOT HAND EDITS. `audit:idor` reports 263 flagged query sites.
 * Most are legitimately cross-user (a cron batch has no user session; an
 * admin report spans users by definition) and the audit script's own remedy is
 * a marker at the call site. Hand-editing 263 sites invites the mistake this
 * session already made once — a bulk edit landing in the wrong place — so the
 * insertion is mechanical and the JUDGEMENT stays manual: this tool only
 * annotates files it is explicitly given, with a reason supplied per file.
 *
 * It never decides that something is safe. Deciding is the caller's job; the
 * caller must have checked the route's guard first.
 *
 * Usage:
 *   node scripts/annotate-idor.js --marker cross-user \
 *     --reason "system batch job, no user session; gated by CRON_SECRET" \
 *     --sites /tmp/idor-sites.txt --filter src/app/api/cron/
 */

import { readFileSync, writeFileSync } from "fs";

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const MARKER = arg("marker", "cross-user");
const REASON = arg("reason");
const SITES = arg("sites", "/tmp/idor-sites.txt");
const FILTER = arg("filter", "");
const DRY = process.argv.includes("--dry");

if (!REASON) {
  console.error("--reason is required: a marker without a real justification is worse than no marker");
  process.exit(2);
}

// file -> [lineNumbers]
const byFile = new Map();
for (const raw of readFileSync(SITES, "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || !line.includes(FILTER)) continue;
  const [file, num] = line.split(":");
  if (!file || !num) continue;
  if (!byFile.has(file)) byFile.set(file, new Set());
  byFile.get(file).add(parseInt(num, 10));
}

let filesTouched = 0;
let markersAdded = 0;

for (const [file, lineSet] of byFile) {
  let lines;
  try {
    lines = readFileSync(file, "utf8").split("\n");
  } catch {
    console.error(`  skip (unreadable): ${file}`);
    continue;
  }

  // Descending, so inserting a line never shifts a line we have yet to touch.
  const targets = [...lineSet].sort((a, b) => b - a);
  let added = 0;

  for (const lineNo of targets) {
    const idx = lineNo - 1;
    if (idx < 0 || idx >= lines.length) continue;

    // Already justified within the window the audit script honours (the marker
    // may sit on the line itself or up to 3 lines above).
    const window = lines.slice(Math.max(0, idx - 3), idx + 1).join("\n");
    if (/idor-audit:\s*(cross-user|pk-owner-checked)/.test(window)) continue;

    const indent = (lines[idx].match(/^\s*/) || [""])[0];
    lines.splice(idx, 0, `${indent}// idor-audit: ${MARKER} — ${REASON}`);
    added++;
  }

  if (added && !DRY) writeFileSync(file, lines.join("\n"));
  if (added) {
    filesTouched++;
    markersAdded += added;
    console.log(`  ${added.toString().padStart(3)} ${file}`);
  }
}

console.log(`\n${DRY ? "[dry] " : ""}${markersAdded} marker(s) across ${filesTouched} file(s)`);
