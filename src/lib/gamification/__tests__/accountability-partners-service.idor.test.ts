/**
 * IDOR regression tests — AccountabilityPartnersService
 *
 * The service uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). All ownership
 * checks are enforced in service methods.
 *
 * Fixed IDOR vulnerabilities:
 *   - acceptInvitation: verifies invitation.recipient_user_id === userId
 *   - declineInvitation: added userId param; verifies recipient_user_id
 *   - endPartnership: added userId param; verifies membership
 *   - sendNudge: verifies senderId is a partnership member
 *   - markNudgeAsRead: added userId param; verifies nudge.receiver_id
 *
 * These tests assert that cross-user operations are rejected.
 */

import { AccountabilityPartnersService } from "../accountability-partners-service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Minimal chainable Supabase mock
// ---------------------------------------------------------------------------

function buildChain(terminal: Record<string, unknown>) {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "eq", "select", "insert", "update", "single", "order",
    "limit", "in", "or", "gt",
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockImplementation(() => chain);
  });
  Object.assign(chain, terminal);
  return chain;
}

function createMockSupabase() {
  return { from: jest.fn() };
}

const USER_A = "user-a-partners-001";
const USER_B = "user-b-partners-002";
const USER_C = "user-c-partners-003";
const INVITATION_ID = "invite-xyz";
const PARTNERSHIP_ID = "partner-xyz";
const NUDGE_ID = "nudge-xyz";

let supabase: ReturnType<typeof createMockSupabase>;
let service: AccountabilityPartnersService;

beforeEach(() => {
  supabase = createMockSupabase();
  const { createClient } = require("@supabase/supabase-js");
  (createClient as jest.Mock).mockReturnValue(supabase);
  service = new AccountabilityPartnersService(
    "https://test.supabase.co",
    "test-key",
  );
});

// ---------------------------------------------------------------------------
// acceptInvitation — idor
// ---------------------------------------------------------------------------

describe("acceptInvitation — IDOR", () => {
  it("throws when the caller is not the intended recipient", async () => {
    // Invitation sent to USER_B, but USER_C tries to accept it
    const invitationRow = {
      id: INVITATION_ID,
      sender_id: USER_A,
      sender_name: "Alice",
      recipient_email: "b@example.com",
      recipient_user_id: USER_B, // explicitly set for USER_B
      message: null,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };

    supabase.from.mockReturnValue(buildChain({ data: invitationRow, error: null }));

    await expect(
      service.acceptInvitation(INVITATION_ID, USER_C),
    ).rejects.toThrow("Not authorized to accept this invitation");
  });

  it("succeeds when caller is the intended recipient", async () => {
    const invitationRow = {
      id: INVITATION_ID,
      sender_id: USER_A,
      sender_name: "Alice",
      recipient_email: "b@example.com",
      recipient_user_id: USER_B,
      message: null,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };
    const partnershipRow = {
      id: PARTNERSHIP_ID,
      requester_id: USER_A,
      partner_id: USER_B,
      status: "active",
      requester_share_level: "progress_only",
      partner_share_level: "progress_only",
      shared_goal_ids: [],
      total_nudges_sent: 0,
      total_celebrations: 0,
      partnership_start_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: invitationRow, error: null }); // fetch invitation
      if (call === 2) return buildChain({ data: null, error: null }); // update invitation
      return buildChain({ data: partnershipRow, error: null }); // create partnership
    });

    const result = await service.acceptInvitation(INVITATION_ID, USER_B);
    expect(result.requesterId).toBe(USER_A);
    expect(result.partnerId).toBe(USER_B);
  });

  it("allows accepting an unassigned invitation (recipient_user_id is null)", async () => {
    const invitationRow = {
      id: INVITATION_ID,
      sender_id: USER_A,
      sender_name: "Alice",
      recipient_email: "c@example.com",
      recipient_user_id: null, // not yet associated with a user
      message: null,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };
    const partnershipRow = {
      id: PARTNERSHIP_ID,
      requester_id: USER_A,
      partner_id: USER_C,
      status: "active",
      requester_share_level: "progress_only",
      partner_share_level: "progress_only",
      shared_goal_ids: [],
      total_nudges_sent: 0,
      total_celebrations: 0,
      partnership_start_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: invitationRow, error: null });
      if (call === 2) return buildChain({ data: null, error: null });
      return buildChain({ data: partnershipRow, error: null });
    });

    const result = await service.acceptInvitation(INVITATION_ID, USER_C);
    expect(result.partnerId).toBe(USER_C);
  });
});

// ---------------------------------------------------------------------------
// declineInvitation — idor
// ---------------------------------------------------------------------------

describe("declineInvitation — IDOR", () => {
  it("throws when the caller is not the intended recipient", async () => {
    const invitationRow = {
      id: INVITATION_ID,
      recipient_user_id: USER_B,
    };

    supabase.from.mockReturnValue(buildChain({ data: invitationRow, error: null }));

    await expect(
      service.declineInvitation(INVITATION_ID, USER_C),
    ).rejects.toThrow("Not authorized to decline this invitation");
  });

  it("throws when invitation is not found", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    await expect(
      service.declineInvitation(INVITATION_ID, USER_B),
    ).rejects.toThrow("Invitation not found");
  });

  it("succeeds when caller is the intended recipient", async () => {
    const invitationRow = {
      id: INVITATION_ID,
      recipient_user_id: USER_B,
    };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: invitationRow, error: null }); // fetch
      return buildChain({ data: null, error: null }); // update
    });

    await expect(
      service.declineInvitation(INVITATION_ID, USER_B),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// endPartnership — idor
// ---------------------------------------------------------------------------

describe("endPartnership — IDOR", () => {
  const partnershipRow = {
    id: PARTNERSHIP_ID,
    requester_id: USER_A,
    partner_id: USER_B,
    status: "active",
    requester_share_level: "progress_only",
    partner_share_level: "progress_only",
    shared_goal_ids: [],
    total_nudges_sent: 0,
    total_celebrations: 0,
    partnership_start_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("throws when USER_C (non-member) tries to end USER_A and USER_B's partnership", async () => {
    supabase.from.mockReturnValue(buildChain({ data: partnershipRow, error: null }));

    await expect(
      service.endPartnership(PARTNERSHIP_ID, USER_C),
    ).rejects.toThrow("Not authorized to end this partnership");
  });

  it("allows the requester (USER_A) to end the partnership", async () => {
    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: partnershipRow, error: null }); // getPartnership
      return buildChain({ data: null, error: null }); // update
    });

    await expect(
      service.endPartnership(PARTNERSHIP_ID, USER_A),
    ).resolves.toBeUndefined();
  });

  it("allows the partner (USER_B) to end the partnership", async () => {
    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: partnershipRow, error: null }); // getPartnership
      return buildChain({ data: null, error: null }); // update
    });

    await expect(
      service.endPartnership(PARTNERSHIP_ID, USER_B),
    ).resolves.toBeUndefined();
  });

  it("throws when partnership is not found", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    await expect(
      service.endPartnership(PARTNERSHIP_ID, USER_A),
    ).rejects.toThrow("Partnership not found");
  });
});

// ---------------------------------------------------------------------------
// sendNudge — idor (membership check)
// ---------------------------------------------------------------------------

describe("sendNudge — IDOR", () => {
  const partnershipRow = {
    id: PARTNERSHIP_ID,
    requester_id: USER_A,
    partner_id: USER_B,
    status: "active",
    requester_share_level: "progress_only",
    partner_share_level: "progress_only",
    shared_goal_ids: [],
    total_nudges_sent: 0,
    total_celebrations: 0,
    partnership_start_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("throws when sender (USER_C) is not a member of the partnership", async () => {
    supabase.from.mockReturnValue(buildChain({ data: partnershipRow, error: null }));

    await expect(
      service.sendNudge(PARTNERSHIP_ID, USER_C, "encouragement"),
    ).rejects.toThrow("Not authorized to send nudges in this partnership");
  });

  it("allows requester (USER_A) to send a nudge", async () => {
    const nudgeRow = {
      id: NUDGE_ID,
      partnership_id: PARTNERSHIP_ID,
      sender_id: USER_A,
      receiver_id: USER_B,
      type: "encouragement",
      message: "You've got this!",
      is_read: false,
      created_at: new Date().toISOString(),
    };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: partnershipRow, error: null }); // getPartnership
      return buildChain({ data: nudgeRow, error: null }); // insert nudge
    });

    const result = await service.sendNudge(PARTNERSHIP_ID, USER_A, "encouragement");
    expect(result.senderId).toBe(USER_A);
    expect(result.receiverId).toBe(USER_B);
  });

  it("allows partner (USER_B) to send a nudge", async () => {
    const nudgeRow = {
      id: NUDGE_ID,
      partnership_id: PARTNERSHIP_ID,
      sender_id: USER_B,
      receiver_id: USER_A,
      type: "encouragement",
      message: "Keep it up!",
      is_read: false,
      created_at: new Date().toISOString(),
    };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: partnershipRow, error: null }); // getPartnership
      return buildChain({ data: nudgeRow, error: null }); // insert nudge
    });

    const result = await service.sendNudge(PARTNERSHIP_ID, USER_B, "reminder");
    expect(result.senderId).toBe(USER_B);
    expect(result.receiverId).toBe(USER_A);
  });
});

// ---------------------------------------------------------------------------
// markNudgeAsRead — idor
// ---------------------------------------------------------------------------

describe("markNudgeAsRead — IDOR", () => {
  it("throws when caller (USER_A) tries to mark USER_B's nudge as read", async () => {
    const nudgeRow = {
      id: NUDGE_ID,
      receiver_id: USER_B, // nudge belongs to USER_B
    };

    supabase.from.mockReturnValue(buildChain({ data: nudgeRow, error: null }));

    await expect(
      service.markNudgeAsRead(NUDGE_ID, USER_A),
    ).rejects.toThrow("Not authorized to mark this nudge as read");
  });

  it("throws when nudge is not found", async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));

    await expect(
      service.markNudgeAsRead(NUDGE_ID, USER_B),
    ).rejects.toThrow("Nudge not found");
  });

  it("succeeds when caller is the receiver of the nudge", async () => {
    const nudgeRow = {
      id: NUDGE_ID,
      receiver_id: USER_B,
    };

    let call = 0;
    supabase.from.mockImplementation(() => {
      call++;
      if (call === 1) return buildChain({ data: nudgeRow, error: null }); // fetch
      return buildChain({ data: null, error: null }); // update
    });

    await expect(
      service.markNudgeAsRead(NUDGE_ID, USER_B),
    ).resolves.toBeUndefined();

    // Verify update was scoped to receiver_id
    const updateChain = supabase.from.mock.results[1].value;
    expect(updateChain.eq).toHaveBeenCalledWith("receiver_id", USER_B);
  });
});
