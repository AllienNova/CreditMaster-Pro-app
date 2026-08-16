/**
 * The score-factor shape the credit-repair API actually returns.
 *
 * /credit-repair rendered "Application error: a client-side exception has
 * occurred" — `t.factors.map is not a function` — because the dashboard did
 * `setScore(scoreData.data)`, an unchecked cast, and then mapped over
 * `score.factors` as an array.
 *
 * It is not an array. src/app/api/credit-repair/score/route.ts reduces the
 * service's `ScoreFactor[]` through `toFactorRecord` before WRITING the row,
 * then returns the saved row — so the client receives
 * `{ building: 100, disputes: 70, utilization: 66.28, negotiations: 55 }`.
 * The service is well tested and produces the array; the route's lossy write
 * is what the browser sees.
 *
 * `impact` and `weight` do not survive that write at all, which is why the
 * "+N points possible" line was removed rather than defaulted.
 *
 * Tolerates the array form too: a row written before the record conversion —
 * or a future route that stops flattening — must not crash the page again.
 */

export interface DisplayFactor {
  category: string;
  currentScore: number;
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function parseScoreFactors(factors: unknown): DisplayFactor[] {
  if (Array.isArray(factors)) {
    return factors
      .filter(
        (f): f is { category: string; currentScore: number } =>
          typeof f === "object" &&
          f !== null &&
          typeof (f as { category?: unknown }).category === "string" &&
          isFiniteNumber((f as { currentScore?: unknown }).currentScore),
      )
      .map((f) => ({ category: f.category, currentScore: f.currentScore }));
  }

  if (typeof factors === "object" && factors !== null) {
    return Object.entries(factors as Record<string, unknown>)
      .filter(([, v]) => isFiniteNumber(v))
      .map(([category, currentScore]) => ({
        category,
        currentScore: currentScore as number,
      }));
  }

  // null, undefined, a string, a number — nothing renderable, and an empty
  // grid is a far better outcome than taking the page down.
  return [];
}
