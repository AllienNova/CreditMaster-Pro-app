/**
 * One dispute letter template.
 *
 * GET /api/disputes/templates/[id]
 *
 * The collection existed; this did not, so the mobile
 * `disputeTemplateApi.getTemplate(id)` call 404'd and the template detail
 * screen had nothing to render.
 *
 * The catalogue is product content — the letters this app offers — and lives
 * in @/lib/disputes/letter-templates so this route and the collection read the
 * same array. It was a module-local const inside the collection's route.ts
 * until now, which is why a detail route would otherwise have needed a second
 * copy of it.
 *
 * No auth-scoped data is involved: every user sees the same templates. It
 * still requires authentication, matching the collection, because the letter
 * bodies are product IP rather than a public resource.
 *
 * CARRIED, NOT ENDORSED: each template has a `successRate`. Nothing measures
 * it — see the note in letter-templates.ts and SF-09. It is returned here so
 * the detail screen agrees with the list screen, not because it is a fact.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { findDisputeTemplate } from "@/lib/disputes/letter-templates";

/** Template ids are slugs like "late-payment-goodwill", never uuids. */
const TEMPLATE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function templateIdFrom(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

export const GET = withAuth(async (request: NextRequest) => {
  const id = templateIdFrom(request);

  // Reject a malformed id before the lookup. The catalogue is an in-memory
  // array so there is no injection risk, but answering 400 for "??/../x" and
  // 404 for "no-such-template" keeps the two failures distinguishable.
  if (!TEMPLATE_ID.test(id)) {
    return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
  }

  const template = findDisputeTemplate(id);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
});
