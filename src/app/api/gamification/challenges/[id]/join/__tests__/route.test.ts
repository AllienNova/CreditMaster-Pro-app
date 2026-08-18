/**
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/gamification/challenges/[id]/join — new surface.
 *
 * CommunityChallengesService.joinChallenge was complete, guarded and atomic,
 * and unreachable: GET told a member whether they had joined, and nothing let
 * them join.
 *
 * The assertions that carry weight:
 *  - the user id comes from the session, never the body
 *  - each refusal is reported as its own fact, not a blanket 500
 *  - a duplicate (23505) is a 409, since UNIQUE(user_id, challenge_id) is what
 *    actually prevents a double join
 */

const mockValidate = jest.fn();
jest.mock("@/lib/auth/jwt-validation", () => ({
  jwtValidation: {
    validateFromHeaders: (...args: any[]) => mockValidate(...args),
  },
}));
jest.mock("@/lib/auth/resolve-role", () => ({
  resolveRoleFromDb: jest.fn().mockResolvedValue("user"),
}));

const mockJoinChallenge = jest.fn();
jest.mock("@/lib/gamification", () => ({
  getCommunityChallengesService: () => ({
    joinChallenge: (...args: any[]) => mockJoinChallenge(...args),
  }),
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

const CHALLENGE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const SESSION_USER = "99999999-8888-7777-6666-555555555555";

function makeRequest(
  id: string = CHALLENGE_ID,
  body?: Record<string, unknown>,
) {
  return new NextRequest(
    `http://localhost:3000/api/gamification/challenges/${id}/join`,
    {
      method: "POST",
      ...(body
        ? {
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          }
        : {}),
    } as never,
  );
}

function signedIn() {
  mockValidate.mockResolvedValue({
    valid: true,
    user: { id: SESSION_USER, email: "member@fynvita.test" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST challenges/[id]/join — the gate", () => {
  it("401s when unauthenticated", async () => {
    mockValidate.mockResolvedValue({ valid: false, user: null });

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(mockJoinChallenge).not.toHaveBeenCalled();
  });

  it("400s a non-UUID challenge id without calling the service", async () => {
    signedIn();

    const res = await POST(makeRequest("not-a-uuid"));

    expect(res.status).toBe(400);
    expect(mockJoinChallenge).not.toHaveBeenCalled();
  });

  it("enrols the session user, never a user named in the body", async () => {
    signedIn();
    mockJoinChallenge.mockResolvedValue({ id: "p-1" });

    await POST(makeRequest(CHALLENGE_ID, { userId: "somebody-else" }));

    expect(mockJoinChallenge).toHaveBeenCalledWith(CHALLENGE_ID, SESSION_USER);
  });
});

describe("POST challenges/[id]/join — success", () => {
  it("201s with the participant record", async () => {
    signedIn();
    mockJoinChallenge.mockResolvedValue({ id: "p-1", status: "joined" });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.participant.id).toBe("p-1");
  });
});

describe("POST challenges/[id]/join — every refusal is its own fact", () => {
  beforeEach(signedIn);

  it("409s a duplicate join on the unique violation", async () => {
    mockJoinChallenge.mockRejectedValue({ code: "23505" });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/already joined/i);
  });

  it("404s when the challenge does not exist", async () => {
    mockJoinChallenge.mockRejectedValue(new Error("Challenge not found"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(404);
  });

  it("409s when the challenge is closed, and says so", async () => {
    mockJoinChallenge.mockRejectedValue(
      new Error("Challenge is not open for joining"),
    );

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Challenge is not open for joining");
  });

  it("409s when the challenge is full, and says so", async () => {
    mockJoinChallenge.mockRejectedValue(new Error("Challenge is full"));

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Challenge is full");
  });

  it("500s an unexpected failure without claiming the member joined", async () => {
    mockJoinChallenge.mockRejectedValue(new Error("connection reset"));

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.participant).toBeUndefined();
  });
});
