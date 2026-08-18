/**
 * Financial Coaching Directory.
 *
 * WHAT THIS PAGE LISTED, WITH NO FETCH IN THE FILE.
 *
 * `mockCoaches` was invented coaches with credentials, session prices and
 * ratings — the same shape as the invented attorneys next door, and sold the
 * same way: a person you could book. Nobody on that list exists, and the
 * certifications beside their names were written here.
 *
 * It was hidden from audit:screen-data by the same one-line-break gap:
 *
 *     const filteredCoaches = mockCoaches
 *       .filter((c) => specialty === "all" || ...)
 *
 * The detector matched `mockCoaches.filter(` only with the dot on the same
 * line. Fixed, with the case in its self-test.
 *
 * WHAT IS SHOWN NOW. GET /api/marketplace/providers?category=coaching, whose
 * MarketplaceProvider describes a FIRM: name, description, website, rating,
 * reviewCount, bbbRating, yearsInBusiness, verified. There is no column for a
 * session price or a certification, so neither is shown — and the price-range
 * filter built on the invented prices is gone with them.
 */

"use client";

import ProviderDirectory from "@/components/marketplace/ProviderDirectory";

export default function CoachingPage() {
  return (
    <ProviderDirectory
      category="coaching"
      title="Financial Coaching"
      subtitle="Coaching practices listed in the marketplace"
      emptyTitle="No coaching practices are listed yet"
      emptyBody="When a coaching practice joins the marketplace it appears here. We would rather list nobody than invent a coach and their credentials."
    />
  );
}
