/**
 * Credit Attorneys Directory.
 *
 * WHAT THIS PAGE LISTED, WITH NO FETCH IN THE FILE.
 *
 * `mockAttorneys` was invented people, presented as counsel a reader could
 * take a credit problem to:
 *
 *   Sarah Mitchell — Mitchell Consumer Law — Los Angeles, CA
 *   FCRA Violations, Identity Theft, Debt Collection
 *   4.9 from 127 reviews · 15 years' experience · Free consultation
 *
 * None of them exists. Someone with an error on their credit report could have
 * gone looking for her. Of everything removed in this sweep, this is the one
 * that sends a person somewhere.
 *
 * WHY NO RUN OF THE GATE CAUGHT IT. audit:screen-data matched
 * `mockAttorneys.filter(` with the dot on the SAME LINE, and Prettier had
 * broken the chain:
 *
 *     const filteredAttorneys = mockAttorneys
 *       .filter((a) => specialty === "all" || ...)
 *
 * One line break hid this file, /marketplace/coaching and
 * /marketplace/secured-cards from every run of that gate. The detector now
 * allows whitespace before the method call, and its self-test carries the case.
 *
 * WHAT IS SHOWN NOW. GET /api/marketplace/providers?category=legal.
 * MarketplaceProvider (marketplace-service.ts:28) describes a FIRM, not a
 * person: name, description, website, rating, reviewCount, bbbRating,
 * yearsInBusiness, verified. There is no column for an individual's name, a
 * location, a specialty list or a consultation fee — the mock invented all
 * four, and the specialty and free-consultation filters built on them went
 * with them. `verified` is real, and is the one piece of standing this
 * directory can honestly offer.
 *
 * The "when to consult an attorney" note stays: it is our own editorial copy
 * about the category, true whether or not anyone is listed.
 */

"use client";

import ProviderDirectory from "@/components/marketplace/ProviderDirectory";

export default function AttorneysPage() {
  return (
    <ProviderDirectory
      category="legal"
      title="Credit Attorneys"
      subtitle="Consumer-law firms listed in the marketplace"
      emptyTitle="No law firms are listed yet"
      emptyBody="When a consumer-law firm joins the marketplace it appears here. We would rather list nobody than send you to someone we invented."
      note={
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
          <p className="text-amber-800 dark:text-amber-300 text-sm">
            <strong>When to consult an attorney:</strong> if you have FCRA
            violations, identity theft, harassment from collectors, or need to
            sue a creditor.
          </p>
        </div>
      }
    />
  );
}
