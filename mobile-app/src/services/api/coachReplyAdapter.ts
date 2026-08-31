/**
 * Coach Reply Adapter (PARITY)
 *
 * Turns POST /api/ai/financial-coach/advice's PersonalizedAdvice into the one
 * chat bubble the coaching screen renders.
 *
 * WHY THIS EXISTS. useCoaching posted to /ai/coaching/chat, a route that has
 * never existed, and fell back to getCoachResponse() — a function that
 * substring-matched the user's message and returned one of five hardcoded
 * paragraphs. Since the request always failed, that fallback was the only path:
 * every "AI coach" reply any user has received was canned text, chosen by
 * checking whether their message contained "budget", "save" or "credit".
 *
 * /api/ai/financial-coach/advice is real, authenticated, rate-limited to 10
 * requests a minute and backed by ModelRouter. It returns answer, actionSteps
 * and encouragement — all model output — which this composes into one reply
 * rather than discarding the parts the old shape had no field for.
 *
 * No suggestion chips. The mobile type has a `suggestions` field that the old
 * code filled from getCoachSuggestions() — a fixed list like
 * ["Next step", "Explain more"] that had nothing to do with what the coach
 * said. The server produces no follow-up prompts, so none are shown.
 */

/** PersonalizedAdvice, as the advice route returns it. */
export interface ApiPersonalizedAdvice {
  answer?: string;
  actionSteps?: string[];
  encouragement?: string;
}

/** The advice route's minimum question length, mirrored so the UI can say so first. */
export const MIN_QUESTION_LENGTH = 10;
/** The advice route's maximum question length. */
export const MAX_QUESTION_LENGTH = 500;

/**
 * Whether the advice endpoint will accept this message.
 *
 * AdviceRequestSchema requires 10-500 characters. Sending "ok" returns a 400
 * whose body is a Zod issue list, which the chat would have rendered as a
 * failed reply for no reason the user could see.
 */
export function questionRejectionReason(message: string): string | null {
  const trimmed = message.trim();
  if (trimmed.length < MIN_QUESTION_LENGTH) {
    return `Could you give me a bit more to go on? At least ${MIN_QUESTION_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return `That is a bit long for me — keep it under ${MAX_QUESTION_LENGTH} characters.`;
  }
  return null;
}

/**
 * Compose the reply text, or null when the server said nothing usable.
 *
 * Returning null rather than a placeholder is the point: a coach that did not
 * answer must not appear to have answered.
 */
export function toCoachReply(
  advice: ApiPersonalizedAdvice | null | undefined,
): string | null {
  const answer = (advice?.answer ?? "").trim();
  if (!answer) return null;

  const parts = [answer];

  const steps = (advice?.actionSteps ?? [])
    .map((step) => (typeof step === "string" ? step.trim() : ""))
    .filter(Boolean);
  if (steps.length > 0) {
    parts.push(steps.map((step, i) => `${i + 1}. ${step}`).join("\n"));
  }

  const encouragement = (advice?.encouragement ?? "").trim();
  if (encouragement) parts.push(encouragement);

  return parts.join("\n\n");
}
