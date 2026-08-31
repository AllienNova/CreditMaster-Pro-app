/**
 * Coach reply mapping.
 *
 * useCoaching posted to /ai/coaching/chat, which has never existed, and fell
 * back to getCoachResponse() — a function that checked whether the user's
 * message contained "budget", "save", "credit" or "yes" and returned one of
 * five hardcoded paragraphs. Because the request always failed, that WAS the
 * coach: no model was ever consulted.
 *
 * The chat now posts to /api/ai/financial-coach/advice, which is real,
 * authenticated, rate-limited and backed by ModelRouter. These tests exist to
 * pin the one rule that matters here: when the server says nothing usable, the
 * answer is null, so the screen can say it could not reach the coach instead of
 * printing something that looks like advice.
 */

import {
  toCoachReply,
  questionRejectionReason,
  MIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
} from "../coachReplyAdapter";

describe("toCoachReply", () => {
  it("uses the model's answer", () => {
    expect(toCoachReply({ answer: "Start with a starter emergency fund." })).toBe(
      "Start with a starter emergency fund.",
    );
  });

  it("appends action steps as a numbered list", () => {
    const reply = toCoachReply({
      answer: "Here is where to begin.",
      actionSteps: ["Open a savings account", "Automate $25 a week"],
    });
    expect(reply).toBe(
      "Here is where to begin.\n\n1. Open a savings account\n2. Automate $25 a week",
    );
  });

  it("appends the encouragement last", () => {
    const reply = toCoachReply({
      answer: "Here is where to begin.",
      encouragement: "You are closer than you think.",
    });
    expect(reply).toBe(
      "Here is where to begin.\n\nYou are closer than you think.",
    );
  });

  it("keeps all three parts in order", () => {
    const reply = toCoachReply({
      answer: "A.",
      actionSteps: ["B."],
      encouragement: "C.",
    });
    expect(reply).toBe("A.\n\n1. B.\n\nC.");
  });

  it("drops blank action steps rather than numbering an empty line", () => {
    const reply = toCoachReply({
      answer: "A.",
      actionSteps: ["  ", "", "Real step"],
    });
    expect(reply).toBe("A.\n\n1. Real step");
  });

  describe("when there is no answer", () => {
    it.each([
      [null, "null advice"],
      [undefined, "undefined advice"],
      [{}, "no answer field"],
      [{ answer: "" }, "an empty answer"],
      [{ answer: "   " }, "a whitespace answer"],
    ])("returns null for %j — %s", (advice, _why) => {
      expect(toCoachReply(advice as never)).toBeNull();
    });

    it("returns null even when action steps came back", () => {
      // Steps without an answer are not a reply; rendering them alone would
      // look like the coach responded.
      expect(
        toCoachReply({ actionSteps: ["Do the thing"], encouragement: "Go!" }),
      ).toBeNull();
    });

    it("never substitutes canned advice", () => {
      // The old fallback returned paragraphs about the 50/30/20 rule for any
      // message containing "budget".
      const reply = toCoachReply({ answer: "" });
      expect(reply).toBeNull();
      expect(String(reply)).not.toMatch(/50\/30\/20/);
    });
  });
});

describe("questionRejectionReason", () => {
  it("accepts a normal question", () => {
    expect(questionRejectionReason("How do I start budgeting?")).toBeNull();
  });

  it("rejects a message shorter than the server accepts", () => {
    // AdviceRequestSchema requires 10 characters; "ok" returns a 400 carrying a
    // Zod issue list, which the chat would have shown as a failed reply.
    expect(questionRejectionReason("ok")).toMatch(/at least 10/i);
  });

  it("measures the TRIMMED message, as the server does not see the padding", () => {
    expect(questionRejectionReason("   hi   ")).toMatch(/at least 10/i);
  });

  it.each([MIN_QUESTION_LENGTH, MAX_QUESTION_LENGTH])(
    "accepts a message of exactly %i characters",
    (length) => {
      expect(questionRejectionReason("x".repeat(length))).toBeNull();
    },
  );

  it("rejects one character over the maximum", () => {
    expect(
      questionRejectionReason("x".repeat(MAX_QUESTION_LENGTH + 1)),
    ).toMatch(/under 500/i);
  });
});
