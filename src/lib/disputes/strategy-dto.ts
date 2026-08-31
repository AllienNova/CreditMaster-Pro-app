import type { AdvancedStrategy } from "@/lib/disputes/advanced-strategies";

/**
 * The strategy shape the clients actually read.
 *
 * WHY THIS EXISTS. There were TWO dispute-strategy catalogues with ZERO
 * overlapping ids:
 *
 *   src/app/api/disputes/strategies/route.ts  fcra_violation, validation_request,
 *     (an inline array)                       goodwill_adjustment, pay_for_delete,
 *                                             identity_theft, statute_of_limitations,
 *                                             procedural_error
 *   src/lib/disputes/advanced-strategies.ts   escalation_tactics, mov_challenge,
 *     (ALL_ADVANCED_STRATEGIES)               furnisher_direct, procedural_violations,
 *                                             debt_validation, bureau_negligence,
 *                                             hybrid_goodwill
 *
 * They describe overlapping tactics under different names — validation_request
 * and debt_validation are the same idea — but nothing could match one to the
 * other. /api/disputes/generate and /api/disputes/recommend-strategy both use
 * the library; only the list endpoint used the inline copy. So a client could
 * be recommended `debt_validation` and then fail to find it in the list of
 * strategies, because the list only knew about `validation_request`.
 *
 * I introduced that break: recommend-strategy was added against the library
 * while the list still served the inline array. The fix is one catalogue, and
 * the library is the right one — it is already used by two routes, it carries
 * riskLevel (which the mobile DisputeStrategy type requires and the inline copy
 * lacked), and it is the set the recommender reasons over.
 *
 * The DTO exists because AdvancedStrategy is richer than the clients need and
 * shaped differently: `timeline` is a {minDays,maxDays,phases} object where the
 * client wants a string, and `steps` carry documents/tips/duration the list
 * screens do not render.
 */
export interface DisputeStrategyDTO {
  id: string;
  name: string;
  description: string;
  successRate: number;
  difficulty: AdvancedStrategy["difficulty"];
  riskLevel: AdvancedStrategy["riskLevel"];
  /** Human-readable range, e.g. "30–60 days". The client type wants a string. */
  timeline: string;
  steps: { step: number; title: string; description: string }[];
}

export function toDisputeStrategyDTO(s: AdvancedStrategy): DisputeStrategyDTO {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    successRate: s.successRate,
    difficulty: s.difficulty,
    riskLevel: s.riskLevel,
    // Rendered from the real bounds rather than a single invented number — the
    // inline catalogue had one `estimatedDays`, which turned a range into a
    // point estimate the data never supported.
    timeline:
      s.timeline.minDays === s.timeline.maxDays
        ? `${s.timeline.minDays} days`
        : `${s.timeline.minDays}–${s.timeline.maxDays} days`,
    steps: s.steps.map((step) => ({
      step: step.order,
      title: step.title,
      description: step.description,
    })),
  };
}
