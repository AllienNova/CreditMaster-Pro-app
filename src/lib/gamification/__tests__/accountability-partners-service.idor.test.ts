/**
 * IDOR regression tests — AccountabilityPartnersService
 *
 * This module reaches Postgres through the SERVICE ROLE, so RLS is bypassed and
 * the membership checks in these methods are the only thing standing between
 * one user's data and another's — the FND-030 lesson.
 *
 * Two distinct defects are covered:
 *
 *  1. SF-04 — `updateShareLevel` had NO membership check at all. It computed
 *     `isRequester = partnership.requesterId === userId` and treated a false
 *     result as "therefore the partner", so a caller who was a stranger to the
 *     partnership fell through and could set `partner_share_level` to "full",
 *     which governs exposure of savings, debt, budget and goal detail to the
 *     other side. Its siblings `endPartnership` and `sendNudge` both had the
 *     guard; this one did not.
 *
 *  2. The restore regression — `b1e993a` had to recover the ownership checks in
 *     this file after a backup-branch copy silently reverted them. These tests
 *     make a third recurrence a failing build rather than a discovery.
 */

import { AccountabilityPartnersService } from "../accountability-partners-service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

function buildChain(terminal: Record<string, unknown> = {}) {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "eq",
    "or",
    "select",
    "insert",
    "update",
    "single",
    "order",
    "limit",
    "in",
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockImplementation(() => chain);
  });
  Object.assign(chain, terminal);
  return chain;
}

const REQUESTER = "user-requester-111";
const PARTNER = "user-partner-222";
const STRANGER = "user-stranger-999";
const PARTNERSHIP_ID = "partnership-abc";

const partnershipRow = {
  id: PARTNERSHIP_ID,
  requester_id: REQUESTER,
  partner_id: PARTNER,
  status: "active",
  partnership_type: "accountability",
  requester_share_level: "progress_only",
  partner_share_level: "progress_only",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let supabase: { from: jest.Mock };
let service: AccountabilityPartnersService;
let updateChain: Record<string, jest.Mock>;

beforeEach(() => {
  updateChain = buildChain({
    single: jest.fn().mockResolvedValue({ data: partnershipRow, error: null }),
  });

  // getPartnership reads the row; every mutation path then uses updateChain.
  const readChain = buildChain({
    single: jest.fn().mockResolvedValue({ data: partnershipRow, error: null }),
  });

  supabase = {
    from: jest.fn().mockImplementation(() => ({
      ...readChain,
      update: updateChain.update,
      insert: updateChain.insert,
    })),
  };

  const { createClient } = jest.requireMock("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new AccountabilityPartnersService(
    "https://test.supabase.co",
    "test-key",
  );
});

describe("updateShareLevel — SF-04", () => {
  it("rejects a caller who is neither requester nor partner", async () => {
    await expect(
      service.updateShareLevel(PARTNERSHIP_ID, STRANGER, "full"),
    ).rejects.toThrow(/not authorized/i);
  });

  it("writes nothing when the caller is a stranger", async () => {
    await expect(
      service.updateShareLevel(PARTNERSHIP_ID, STRANGER, "full"),
    ).rejects.toThrow();

    // The assertion that matters: rejecting AFTER the update would be no fix.
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("does not let a stranger escalate partner_share_level to full", async () => {
    await expect(
      service.updateShareLevel(PARTNERSHIP_ID, STRANGER, "full"),
    ).rejects.toThrow();

    const wrote = updateChain.update.mock.calls.flat();
    expect(JSON.stringify(wrote)).not.toContain("full");
  });

  it("allows the requester, and writes to the requester's own field", async () => {
    await service.updateShareLevel(PARTNERSHIP_ID, REQUESTER, "detailed");

    expect(updateChain.update).toHaveBeenCalledTimes(1);
    expect(updateChain.update.mock.calls[0][0]).toMatchObject({
      requester_share_level: "detailed",
    });
  });

  it("allows the partner, and writes to the partner's own field", async () => {
    await service.updateShareLevel(PARTNERSHIP_ID, PARTNER, "detailed");

    expect(updateChain.update).toHaveBeenCalledTimes(1);
    expect(updateChain.update.mock.calls[0][0]).toMatchObject({
      partner_share_level: "detailed",
    });
  });

  it("does not let the partner write the requester's field", async () => {
    await service.updateShareLevel(PARTNERSHIP_ID, PARTNER, "full");

    expect(updateChain.update.mock.calls[0][0]).not.toHaveProperty(
      "requester_share_level",
    );
  });
});

describe("endPartnership — membership guard", () => {
  it("rejects a stranger", async () => {
    await expect(
      service.endPartnership(PARTNERSHIP_ID, STRANGER),
    ).rejects.toThrow(/not authorized/i);
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("allows a member", async () => {
    await expect(
      service.endPartnership(PARTNERSHIP_ID, REQUESTER),
    ).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledTimes(1);
  });
});

describe("sendNudge — membership guard", () => {
  it("rejects a stranger", async () => {
    await expect(
      service.sendNudge(PARTNERSHIP_ID, STRANGER, "encouragement"),
    ).rejects.toThrow(/not authorized/i);
    expect(updateChain.insert).not.toHaveBeenCalled();
  });
});

/**
 * The other three ownership-bearing methods. Audited alongside SF-04 and found
 * to ALREADY have their guards — these tests exist so that stays true, since
 * this file has already lost its ownership checks once (`b1e993a`).
 *
 * Scope note, stated rather than left implicit: this covers the module's
 * security surface, not its invitation-creation business logic. That logic sits
 * behind an undecided wiring verdict (see gap-analysis.md G-019), and writing
 * behavioural tests for code that may be deleted is waste. Ownership checks are
 * worth testing either way — they are the only enforcement under a service-role
 * client.
 */
describe("invitation and nudge ownership guards", () => {
  const withRow = (row: Record<string, unknown> | null) => {
    const chain = buildChain({
      single: jest.fn().mockResolvedValue({ data: row, error: null }),
      update: updateChain.update,
    });
    supabase.from.mockImplementation(() => chain);
    return chain;
  };

  it("acceptInvitation rejects a caller who is not the recipient", async () => {
    withRow({
      id: "inv-1",
      sender_id: REQUESTER,
      recipient_user_id: PARTNER,
      recipient_email: "p@example.com",
      status: "pending",
    });

    await expect(
      service.acceptInvitation("inv-1", STRANGER),
    ).rejects.toThrow(/not authorized/i);
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("declineInvitation rejects a caller who is not the recipient", async () => {
    withRow({
      id: "inv-1",
      sender_id: REQUESTER,
      recipient_user_id: PARTNER,
      status: "pending",
    });

    await expect(
      service.declineInvitation("inv-1", STRANGER),
    ).rejects.toThrow(/not authorized/i);
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("markNudgeAsRead rejects a caller who is not the receiver", async () => {
    withRow({ receiver_id: PARTNER });

    await expect(
      service.markNudgeAsRead("nudge-1", STRANGER),
    ).rejects.toThrow(/not authorized/i);
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("markNudgeAsRead allows the receiver", async () => {
    withRow({ receiver_id: PARTNER });

    await expect(
      service.markNudgeAsRead("nudge-1", PARTNER),
    ).resolves.toBeUndefined();
    expect(updateChain.update).toHaveBeenCalledWith({ is_read: true });
  });

  it("markNudgeAsRead throws when the nudge does not exist", async () => {
    withRow(null);

    await expect(service.markNudgeAsRead("nudge-1", PARTNER)).rejects.toThrow(
      /not found/i,
    );
    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("getNudges scopes the read to the caller as receiver", async () => {
    const chain = buildChain({});
    // getNudges awaits the query itself rather than .single()
    const thenable = Object.assign(chain, {
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null }),
    });
    supabase.from.mockImplementation(() => thenable);

    await service.getNudges(PARTNER);

    expect(chain.eq).toHaveBeenCalledWith("receiver_id", PARTNER);
  });
});

describe("missing partnership", () => {
  it("does not fall through to a write when the row does not exist", async () => {
    supabase.from.mockImplementation(() =>
      buildChain({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: updateChain.update,
      }),
    );

    await expect(
      service.updateShareLevel(PARTNERSHIP_ID, REQUESTER, "full"),
    ).rejects.toThrow(/not found/i);
    expect(updateChain.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The three sibling ownership checks from the same b1e993a restore. Each
// reads its own resource shape (invitations key off recipient_user_id,
// nudges off receiver_id — neither matches partnershipRow above), so each
// gets a locally-scoped supabase.from override rather than reusing the
// partnership-shaped mock from the outer beforeEach.
// ---------------------------------------------------------------------------

const INVITATION_ID = "invitation-abc";
const NUDGE_ID = "nudge-abc";

describe("acceptInvitation — membership guard", () => {
  it("rejects a caller who is not the invited recipient", async () => {
    supabase.from.mockImplementation(() =>
      buildChain({
        data: {
          id: INVITATION_ID,
          sender_id: REQUESTER,
          status: "pending",
          recipient_user_id: PARTNER,
        },
        error: null,
      }),
    );

    await expect(
      service.acceptInvitation(INVITATION_ID, STRANGER),
    ).rejects.toThrow("Not authorized to accept this invitation");
  });

  it("does not create a partnership when the caller is rejected", async () => {
    const insert = jest.fn().mockImplementation(function (this: unknown) {
      return this;
    });
    supabase.from.mockImplementation(() =>
      buildChain({
        data: {
          id: INVITATION_ID,
          sender_id: REQUESTER,
          status: "pending",
          recipient_user_id: PARTNER,
        },
        error: null,
        insert,
      }),
    );

    await expect(
      service.acceptInvitation(INVITATION_ID, STRANGER),
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  it("allows an open invitation (no recipient assigned yet) to be accepted by anyone", async () => {
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildChain({
          data: {
            id: INVITATION_ID,
            sender_id: REQUESTER,
            status: "pending",
            recipient_user_id: null,
          },
          error: null,
        });
      }
      if (callCount === 2) return buildChain({ data: null, error: null }); // status update
      return buildChain({ data: partnershipRow, error: null }); // createPartnership insert
    });

    const result = await service.acceptInvitation(INVITATION_ID, STRANGER);
    expect(result.id).toBe(PARTNERSHIP_ID);
  });
});

describe("declineInvitation — membership guard", () => {
  it("rejects a caller who is not the invited recipient", async () => {
    supabase.from.mockImplementation(() =>
      buildChain({ data: { recipient_user_id: PARTNER }, error: null }),
    );

    await expect(
      service.declineInvitation(INVITATION_ID, STRANGER),
    ).rejects.toThrow("Not authorized to decline this invitation");
  });

  it("throws when the invitation does not exist", async () => {
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: null }),
    );

    await expect(
      service.declineInvitation(INVITATION_ID, PARTNER),
    ).rejects.toThrow("Invitation not found");
  });

  it("filters the update on recipient_user_id, not just the invitation id", async () => {
    const update = jest.fn().mockImplementation(function (this: unknown) {
      return this;
    });
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildChain({ data: { recipient_user_id: PARTNER }, error: null });
      }
      return buildChain({ data: null, error: null, update });
    });

    await service.declineInvitation(INVITATION_ID, PARTNER);

    const updateReturnChain = update.mock.results[0].value;
    expect(updateReturnChain.eq).toHaveBeenCalledWith(
      "recipient_user_id",
      PARTNER,
    );
  });
});

describe("markNudgeAsRead — membership guard", () => {
  it("rejects a caller who is not the nudge recipient", async () => {
    supabase.from.mockImplementation(() =>
      buildChain({ data: { receiver_id: PARTNER }, error: null }),
    );

    await expect(
      service.markNudgeAsRead(NUDGE_ID, STRANGER),
    ).rejects.toThrow("Not authorized to mark this nudge as read");
  });

  it("throws when the nudge does not exist", async () => {
    supabase.from.mockImplementation(() =>
      buildChain({ data: null, error: null }),
    );

    await expect(
      service.markNudgeAsRead(NUDGE_ID, PARTNER),
    ).rejects.toThrow("Nudge not found");
  });

  it("filters the update on receiver_id, not just the nudge id", async () => {
    const update = jest.fn().mockImplementation(function (this: unknown) {
      return this;
    });
    let callCount = 0;
    supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildChain({ data: { receiver_id: PARTNER }, error: null });
      }
      return buildChain({ data: null, error: null, update });
    });

    await service.markNudgeAsRead(NUDGE_ID, PARTNER);

    const updateReturnChain = update.mock.results[0].value;
    expect(updateReturnChain.eq).toHaveBeenCalledWith("receiver_id", PARTNER);
  });
});
