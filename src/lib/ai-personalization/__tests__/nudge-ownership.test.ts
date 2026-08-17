/**
 * NudgeEngine write scoping.
 *
 * recordNudgeResponse and markNudgeAsOpened both filtered on
 * `.eq("id", nudgeId)` alone. Any caller holding a nudge uuid could stamp
 * action_taken — and arbitrary feedback text into the context jsonb — on
 * another user's nudge_history row, or mark their unread nudge opened so it
 * vanished from getUnreadNudges.
 *
 * The route above them destructured `_user` and never used it, so nothing in
 * the stack knew who was writing.
 *
 * These assert the filters themselves. The route's own tests mock the engine,
 * so they can prove the route passes user.id but not that the engine does
 * anything with it — this file is the other half.
 */

import { NudgeEngine } from "../nudge-engine";

const mockFrom = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (...a: unknown[]) => mockFrom(...a) }),
}));

const OWNER = "user-1";
const NUDGE = "nudge-1";

/** Every .eq() applied, so the filters can be asserted rather than assumed. */
let filters: [string, unknown][] = [];
let updated: Record<string, unknown> | null = null;

function chain(result: unknown) {
  const node: Record<string, unknown> = {};
  node.update = (values: Record<string, unknown>) => {
    updated = values;
    return node;
  };
  node.select = () => node;
  node.eq = (col: string, val: unknown) => {
    filters.push([col, val]);
    return node;
  };
  node.maybeSingle = () => Promise.resolve(result);
  // markNudgeAsOpened awaits the builder itself rather than a terminal call.
  node.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return node;
}

describe("NudgeEngine write scoping", () => {
  let engine: NudgeEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    filters = [];
    updated = null;
    engine = new NudgeEngine("http://localhost", "key");
  });

  describe("recordNudgeResponse", () => {
    it("filters by BOTH the nudge id and its owner", async () => {
      mockFrom.mockReturnValue(chain({ data: { id: NUDGE }, error: null }));

      await engine.recordNudgeResponse(OWNER, NUDGE, "accepted");

      expect(filters).toEqual(
        expect.arrayContaining([
          ["id", NUDGE],
          ["user_id", OWNER],
        ]),
      );
    });

    it("records the action and when it happened", async () => {
      mockFrom.mockReturnValue(chain({ data: { id: NUDGE }, error: null }));

      await engine.recordNudgeResponse(OWNER, NUDGE, "dismissed");

      expect(updated).toMatchObject({ action_taken: "dismissed" });
      expect(updated?.action_at).toEqual(expect.any(String));
    });

    it("attaches feedback to the context when given", async () => {
      mockFrom.mockReturnValue(chain({ data: { id: NUDGE }, error: null }));

      await engine.recordNudgeResponse(OWNER, NUDGE, "dismissed", "Not for me");

      expect(updated?.context).toEqual({ feedback: "Not for me" });
    });

    it("reports false when the update matched no row", async () => {
      // A cross-user id matches nothing, and an UPDATE that changes nothing is
      // not a Postgres error — this boolean is the only signal the caller has.
      mockFrom.mockReturnValue(chain({ data: null, error: null }));

      expect(await engine.recordNudgeResponse(OWNER, NUDGE, "accepted")).toBe(
        false,
      );
    });

    it("reports true when a row was updated", async () => {
      mockFrom.mockReturnValue(chain({ data: { id: NUDGE }, error: null }));

      expect(await engine.recordNudgeResponse(OWNER, NUDGE, "accepted")).toBe(
        true,
      );
    });

    it("throws on a database error rather than reporting a silent failure", async () => {
      mockFrom.mockReturnValue(
        chain({ data: null, error: { message: "connection reset" } }),
      );

      await expect(
        engine.recordNudgeResponse(OWNER, NUDGE, "accepted"),
      ).rejects.toThrow(/Failed to record nudge response/);
    });
  });

  describe("markNudgeAsOpened", () => {
    it("filters by BOTH the nudge id and its owner", async () => {
      // Unscoped, this stamps opened_at on a victim's row and their unread
      // nudge disappears from getUnreadNudges.
      mockFrom.mockReturnValue(chain({ error: null }));

      await engine.markNudgeAsOpened(OWNER, NUDGE);

      expect(filters).toEqual(
        expect.arrayContaining([
          ["id", NUDGE],
          ["user_id", OWNER],
        ]),
      );
    });

    it("throws on a database error", async () => {
      mockFrom.mockReturnValue(chain({ error: { message: "boom" } }));

      await expect(engine.markNudgeAsOpened(OWNER, NUDGE)).rejects.toThrow(
        /Failed to mark nudge as opened/,
      );
    });
  });
});
