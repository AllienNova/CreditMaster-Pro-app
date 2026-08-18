#!/usr/bin/env node
/**
 * audit:back-nav — every pushed screen must offer a way back.
 *
 * WHY. A device screenshot of /marketplace showed a screen with a title and no
 * way out. Counting: 72 of 238 screens had no back affordance. Ten are tab
 * roots and two are auth entries, which correctly have none. The rest were
 * screens a user could reach and then be stuck on.
 *
 * The cause was structural. There was no shared header component, so 166
 * screens hand-rolled the same fifteen-line block and sixty left the first
 * half out. A block copied by hand that many times gets copied wrong.
 *
 * WHAT COUNTS AS A WAY BACK.
 *   <ScreenHeader ...>          the shared component, which renders one unless
 *                               hideBack is set
 *   router.back() / goBack()    the hand-rolled pattern, still valid
 *   headerShown: true in the    a native header — but ONLY when the screen is
 *   screen's own options        not the root of its stack, because React
 *                               Navigation draws no back button on a root
 *
 * That last case is why marketplace/index.tsx looked fine to a reader and was
 * broken on a device: its group layout set headerShown: true, the native
 * header rendered with the title, and being the stack root it had no back
 * button. The screen drew its own title too, so it showed "Marketplace" twice
 * and offered no way back from either.
 *
 * EXEMPTIONS are listed explicitly below with a reason, never inferred.
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
} from "fs";
import { join, relative } from "path";

const MOBILE = process.cwd();
const APP = join(MOBILE, "app");

/**
 * Screens that genuinely have nowhere to go back TO.
 *
 * A tab root is reached by the tab bar, not by a push, so popping would leave
 * the app. An auth entry point is the first screen in the session. Every entry
 * here is a deliberate statement, and the list is short on purpose: it is the
 * only way to pass this gate without a back control.
 */
const EXEMPT = {
  "app/(auth)/login.tsx": "Auth entry point — the first screen of a session.",
  "app/(auth)/register.tsx": "Auth entry point.",
  "app/(auth)/forgot-password.tsx":
    "Reached from login, which is itself the session root; the screen provides its own return-to-login link.",
  "app/(tabs)/index.tsx": "Tab root — reached by the tab bar, not a push.",
  "app/(tabs)/credit.tsx": "Tab root.",
  "app/(tabs)/disputes.tsx": "Tab root.",
  "app/(tabs)/financial.tsx": "Tab root.",
  "app/(tabs)/investments.tsx": "Tab root.",
  "app/(tabs)/loans.tsx": "Tab root.",
  "app/(tabs)/more.tsx": "Tab root.",
  "app/(tabs)/profile.tsx": "Tab root.",
  "app/(tabs)/reports.tsx": "Tab root.",
  "app/(tabs)/student-loans.tsx": "Tab root.",
  "app/index.tsx": "App entry — decides where to send the user.",
  "app/onboarding/index.tsx":
    "Onboarding carousel entry; leaving it is Skip, not Back.",
};

const BACK_PATTERNS = [
  /<ScreenHeader\b/, // the shared component
  /router\.back\(\)/, // the hand-rolled pattern
  /navigation\.goBack\(\)/,
  /useRouter\(\)[\s\S]{0,200}\.back\(\)/,
];

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

const rel = (f) => relative(MOBILE, f).replace(/\\/g, "/");

/** A layout file routes; it is not a screen a user lands on. */
const isLayout = (path) => /_layout\.tsx$/.test(path);

function hasBackAffordance(source) {
  return BACK_PATTERNS.some((p) => p.test(source));
}

/**
 * Does this layout draw a native header on its OWN stack root?
 *
 * This is the marketplace defect as a rule rather than an anecdote. React
 * Navigation draws no back button on the root of a stack, so a native header
 * there is a bar with a title and nothing to press — while looking, to anyone
 * reading the layout, exactly like working navigation.
 *
 * Two ways in:
 *   screenOptions={{ headerShown: true }}          applies to EVERY screen in
 *                                                  the stack, root included
 *   <Stack.Screen name="index" options={{ headerShown: true ... }}>
 *
 * A per-screen `headerShown: true` on a NON-root screen is fine and common —
 * that screen was pushed, so it has somewhere to go back to.
 */
function drawsHeaderOnStackRoot(layoutSource) {
  // A per-screen option BEATS screenOptions, so read the root's own block
  // first. Getting this backwards is not hypothetical: the first version of
  // this check reported app/tax/_layout.tsx, which sets headerShown: true in
  // screenOptions and then turns it off again for `index`. The screen was
  // fine; the detector was wrong.
  const rootBlock = layoutSource.match(
    /<Stack\.Screen[^>]*name="index"[\s\S]{0,300}?\/>/,
  );
  if (rootBlock) {
    if (/headerShown:\s*false/.test(rootBlock[0])) return null; // explicit opt-out
    if (/headerShown:\s*true/.test(rootBlock[0])) {
      return 'the "index" screen — the stack root — sets headerShown: true';
    }
  }

  const screenOptions = layoutSource.match(/screenOptions={{([\s\S]*?)}}/);
  if (screenOptions && /headerShown:\s*true/.test(screenOptions[1])) {
    return "screenOptions applies headerShown to every screen, root included";
  }
  return null;
}

// ── Self-test ───────────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) {
  let bad = 0;
  const CASES = [
    [`<ScreenHeader title="Marketplace" />`, true, "the shared component"],
    [
      `<TouchableOpacity onPress={() => router.back()}>`,
      true,
      "the hand-rolled pattern still counts",
    ],
    [`navigation.goBack()`, true, "the navigation API counts"],
    [
      `<View style={styles.header}><Text>Marketplace</Text></View>`,
      false,
      "a title with no control is exactly the reported defect",
    ],
    [
      `<Stack.Screen options={{ headerShown: true, title: "X" }} />`,
      false,
      "a native header on a stack ROOT draws no back button — this is what made marketplace/index look fine while being broken",
    ],
    [
      `// router.back() is commented out`,
      true,
      "KNOWN LIMIT: this scans text, so a mention in a comment passes. Accepted — the alternative is parsing, and the gate's job is to catch the sixty screens with no mention at all",
    ],
  ];
  for (const [src, want, why] of CASES) {
    if (hasBackAffordance(src) === want) continue;
    bad++;
    console.log(
      `  SELF-TEST FAIL: expected ${want ? "PASS" : "FLAG"} — ${why}`,
    );
  }

  const LAYOUT_CASES = [
    [
      `<Stack screenOptions={{ headerShown: true, headerTintColor: "#F59E0B" }}>`,
      true,
      "screenOptions covers the root too — this is app/tax/_layout.tsx",
    ],
    [
      `<Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="index" options={{ headerShown: true, title: "Marketplace" }} />`,
      true,
      "a native header on the named root — this is the reported marketplace defect",
    ],
    [
      `<Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="detail" options={{ headerShown: true, title: "Detail" }} />`,
      false,
      "a PUSHED screen may have a native header; it has somewhere to go back to",
    ],
    [
      `<Stack screenOptions={{ headerShown: false }}>`,
      false,
      "headers off everywhere is the app's own convention and is fine",
    ],
    [
      `<Stack screenOptions={{ headerShown: true, headerTintColor: "#F59E0B" }}>
         <Stack.Screen name="index" options={{ title: "Tax", headerShown: false }} />`,
      false,
      "a per-screen headerShown:false BEATS screenOptions — this is app/tax/_layout.tsx, " +
        "which the first version of this check wrongly reported",
    ],
  ];
  for (const [src, want, why] of LAYOUT_CASES) {
    if (Boolean(drawsHeaderOnStackRoot(src)) === want) continue;
    bad++;
    console.log(
      `  SELF-TEST FAIL (layout): expected ${want ? "FLAG" : "PASS"} — ${why}`,
    );
  }
  const CASES_TOTAL = CASES.length + LAYOUT_CASES.length;
  console.log(
    bad === 0
      ? `audit:back-nav self-test PASSED — ${CASES_TOTAL}/${CASES_TOTAL} cases correct.`
      : `audit:back-nav self-test FAILED — ${bad} of ${CASES_TOTAL} wrong.`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

/**
 * Shrink-only baseline, same contract as audit:screen-data and audit:api.
 *
 * 70 screens have no way back today. Failing the build on all of them at once
 * gets the gate switched off within a day, and there is no safe mechanical
 * fix: the 70 use 27 different header shapes and 21 have no header container
 * at all, so most of the `styles.*Header` matches are CARD headers inside
 * content. A script that injected a back control by pattern would put one in
 * the middle of a card.
 *
 * So the existing set is recorded and may only ever shrink; anything NEW fails
 * immediately. Each screen gets fixed by hand, with its header placed where it
 * actually belongs.
 */
const BASELINE = join(MOBILE, "scripts", "back-nav-baseline.json");

// ── Scan ────────────────────────────────────────────────────────────────────
const screens = walk(APP).filter((f) => !isLayout(f));
const offenders = [];
const exemptUsed = new Set();

for (const file of screens) {
  const path = rel(file);
  if (EXEMPT[path]) {
    exemptUsed.add(path);
    continue;
  }
  if (hasBackAffordance(readFileSync(file, "utf8"))) continue;
  offenders.push(path);
}

/**
 * The second class of finding: a stack root wearing a native header.
 *
 * These do NOT appear in `offenders` if the screen also happens to hold a
 * router.back() somewhere — and that is the point of checking layouts
 * separately. The screen reads as fine; the navigator is what is wrong.
 */
const rootHeaderOffenders = [];
for (const layout of walk(APP).filter(isLayout)) {
  const reason = drawsHeaderOnStackRoot(readFileSync(layout, "utf8"));
  if (!reason) continue;
  const root = join(layout, "..", "index.tsx");
  if (!existsSync(root)) continue;
  rootHeaderOffenders.push({ screen: rel(root), layout: rel(layout), reason });
}

const staleExemptions = Object.keys(EXEMPT).filter(
  (p) => !exemptUsed.has(p) && !existsSync(join(MOBILE, p)),
);

let baselined = new Set();
try {
  baselined = new Set(JSON.parse(readFileSync(BASELINE, "utf8")).screens || []);
} catch {
  /* first run */
}

if (process.argv.includes("--freeze-baseline")) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        frozen: "2026-08-17",
        why:
          "Screens with no way back, recorded so the count can only shrink. " +
          "Reported from a device screenshot of /marketplace. There is no safe " +
          "mechanical fix — 27 different header shapes, 21 with no header " +
          "container — so each is fixed by hand. Anything NEW fails the gate.",
        screens: offenders.sort(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`audit:back-nav baseline frozen — ${offenders.length} screen(s)`);
  process.exit(0);
}

const novel = offenders.filter((o) => !baselined.has(o));
const fixed = [...baselined].filter((b) => !offenders.includes(b));

console.log(
  `audit:back-nav — ${screens.length} screen(s), ` +
    `${Object.keys(EXEMPT).length} exempt by name`,
);

if (staleExemptions.length) {
  // An exemption for a file that no longer exists is a licence nobody is
  // using, and it will silently cover a future file with the same path.
  console.log(
    `\n${staleExemptions.length} exemption(s) name a file that does not exist — remove them:\n` +
      staleExemptions.map((p) => `  ${p}`).join("\n"),
  );
}

if (rootHeaderOffenders.length) {
  console.log(
    `\n${rootHeaderOffenders.length} stack root(s) draw a native header, which has ` +
      `no back button:\n`,
  );
  for (const o of rootHeaderOffenders) {
    console.log(`  ${o.screen}`);
    console.log(`    ${o.layout} — ${o.reason}`);
  }
  console.log(
    `\nTurn the native header off for the root and use <ScreenHeader/>, whose` +
      `\nrouter.back() pops the PARENT navigator — which is where the user` +
      `\nactually came from.`,
  );
}

if (
  novel.length === 0 &&
  staleExemptions.length === 0 &&
  rootHeaderOffenders.length === 0
) {
  console.log(
    `audit:back-nav PASSED — no NEW screen without a way back.` +
      (offenders.length
        ? `\n${offenders.length} screen(s) remain baselined in scripts/back-nav-baseline.json.` +
          `\nThat is tracked debt, NOT a pass: each one is a screen a user can` +
          `\nreach and then be stuck on.`
        : ""),
  );
  if (fixed.length) {
    console.log(
      `\n${fixed.length} baselined screen(s) now have a way back — run` +
        ` \`--freeze-baseline\` to bank it:\n` +
        fixed.map((f) => `  ${f}`).join("\n"),
    );
  }
  process.exit(0);
}

if (novel.length) {
  console.log(
    `\naudit:back-nav FAILED — ${novel.length} NEW screen(s) with no way back:\n`,
  );
  novel.forEach((o) => console.log(`  ${o}`));
  console.log(
    `\nUse <ScreenHeader title="..." /> from src/components/ScreenHeader.` +
      `\nIf a screen genuinely has nowhere to go back TO — a tab root, an auth` +
      `\nentry — add it to EXEMPT in this script with the reason.`,
  );
}

process.exit(1);
