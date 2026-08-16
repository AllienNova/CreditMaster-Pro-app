/**
 * Where a launch lands, and whether the setup wizard is ever entered.
 *
 * Two defects these cover, both of which passed every gate the repo had.
 *
 * `onboardingCompleted` was initialised `false` and never read back from the
 * profile row, even though `initialize` and `login` both fetch that row with
 * `select("*")` and had the column in hand. So the flag reset to false on every
 * cold start, `app/index.tsx` sent the user to `/onboarding` — the four-slide
 * MARKETING carousel — and that screen's button does
 * `router.replace("/(auth)/login")`. A signed-in user was walked to a login
 * screen they were already past, on every launch.
 *
 * And the four-screen setup wizard (profile → goals → connect → complete) was
 * entered from nowhere: `register` replaced straight to `/(tabs)`. Since
 * `complete.tsx` is the only caller of `completeOnboarding()`, the column could
 * never become true — the redirect had no exit.
 *
 * Assertions are on the href actually rendered, not on the branch being taken,
 * so a future refactor that changes the destination string fails here.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { act } from "@testing-library/react-native";
import { useAuthStore } from "../../store/authStore";
import Index from "../../../app/index";
import type { User } from "../../types";
import { isPublicRoute } from "../../navigation/route-access";

jest.mock("../../services/supabase", () => ({
  supabase: { from: jest.fn() },
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
}));

const {
  signIn,
  signUp,
  getCurrentUser,
  supabase,
} = require("../../services/supabase");

/** A profiles row as `select("*").single()` returns it. */
function profileRow(over: Partial<User> = {}) {
  return {
    data: {
      id: "user-1",
      email: "a@b.com",
      name: "A",
      subscription_tier: "free",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      ...over,
    },
  };
}

/** Arm the chained supabase builder that authStore drives. */
function armProfileFetch(result: { data: unknown }) {
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  });
}

function hrefOf(): string | undefined {
  const tree = render(<Index />).toJSON() as {
    type?: string;
    props?: { href?: string };
  } | null;
  return tree?.props?.href;
}

function setAuth(over: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    onboardingCompleted: false,
    ...over,
  });
}

const SOME_USER = {
  id: "user-1",
  email: "a@b.com",
  name: "A",
  subscription_tier: "free" as const,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("root index routing", () => {
  it("holds the splash while auth is still loading", () => {
    setAuth({ isLoading: true });
    expect(render(<Index />).toJSON()).toBeNull();
  });

  it("sends a signed-out visitor to the welcome carousel", () => {
    setAuth({ user: null });
    expect(hrefOf()).toBe("/onboarding");
  });

  it("sends a signed-in user who has not onboarded to the WIZARD, not the carousel", () => {
    // The bug: this branch pointed at "/onboarding", whose button goes to
    // /(auth)/login — bouncing an authenticated user back to sign-in.
    setAuth({ user: SOME_USER, isAuthenticated: true, onboardingCompleted: false });
    const href = hrefOf();
    expect(href).toBe("/onboarding/profile");
    expect(href).not.toBe("/onboarding");
  });

  it("sends a fully onboarded user to the app", () => {
    setAuth({ user: SOME_USER, isAuthenticated: true, onboardingCompleted: true });
    expect(hrefOf()).toBe("/(tabs)");
  });
});

describe("onboardingCompleted is hydrated, not assumed", () => {
  beforeEach(() => {
    setAuth({});
  });

  it("initialize reads the flag off the profile row it already fetched", async () => {
    getCurrentUser.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", created_at: "2026-01-01" },
      error: null,
    });
    armProfileFetch(profileRow({ onboarding_completed: true }));

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
  });

  it("initialize keeps the flag false for a user who has not finished", async () => {
    getCurrentUser.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", created_at: "2026-01-01" },
      error: null,
    });
    armProfileFetch(profileRow({ onboarding_completed: false }));

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(false);
  });

  it("login hydrates the flag too, so signing in does not replay the wizard", async () => {
    signIn.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@b.com", created_at: "2026-01-01" } },
      error: null,
    });
    armProfileFetch(profileRow({ onboarding_completed: true }));

    await act(async () => {
      await useAuthStore.getState().login("a@b.com", "pw");
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
  });

  it("a brand-new registration has NOT onboarded", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "user-2", email: "new@b.com", created_at: "2026-01-01" } },
      error: null,
    });
    armProfileFetch({ data: null });
    useAuthStore.setState({ onboardingCompleted: true }); // prove it is set, not left

    await act(async () => {
      await useAuthStore.getState().register("new@b.com", "pw", "New");
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(false);
  });
});

describe("completeOnboarding", () => {
  beforeEach(() => {
    setAuth({ user: SOME_USER, isAuthenticated: true });
  });

  it("sets the flag once the write succeeds", async () => {
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    await act(async () => {
      await useAuthStore.getState().completeOnboarding();
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
  });

  it("leaves the flag false when the write fails", async () => {
    // Setting it optimistically would strand the user: the app would believe
    // onboarding is done while the column says otherwise, and the wizard is the
    // only thing that ever writes that column.
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: new Error("offline") }),
    });

    await act(async () => {
      await expect(
        useAuthStore.getState().completeOnboarding(),
      ).rejects.toThrow();
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(false);
  });
});

describe("entry points into the wizard", () => {
  const read = (p: string) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("fs").readFileSync(require("path").join(process.cwd(), p), "utf8");

  it("register routes back through the root, like login", () => {
    // Not "/onboarding/profile" directly: naming a destination here is how the
    // old "/(tabs)" jump came to skip the wizard. index.tsx decides, and
    // register() sets onboardingCompleted:false so the decision is the wizard.
    const src = read("app/(auth)/register.tsx");
    expect(src).toMatch(/router\.replace\("\/"\)/);
    expect(src).not.toMatch(/router\.replace\("\/\(tabs\)"\)/);
    expect(src).not.toMatch(/router\.replace\("\/onboarding/);
  });

  it("the carousel does not send a SIGNED-IN visitor to login", () => {
    // Reachable by back-navigation or deep link. Its unconditional
    // router.replace("/(auth)/login") walked an authenticated user to a screen
    // they were already past.
    const src = read("app/onboarding/index.tsx");
    expect(src).toMatch(
      /router\.replace\(isAuthenticated \? "\/" : "\/\(auth\)\/login"\)/,
    );
  });

  it("the completion screen surfaces a failed write instead of swallowing it", () => {
    // A silent catch left the screen saying "You're all set!" over a database
    // that had recorded nothing.
    const src = read("app/onboarding/complete.tsx");
    expect(src).toMatch(/setSaveFailed\(true\)/);
    expect(src).not.toMatch(/completeOnboarding\(\)\.catch\(\(\) => \{\}\)/);
  });

  it("login routes back through the root so one place owns the decision", () => {
    const src = read("app/(auth)/login.tsx");
    expect(src).toMatch(/router\.replace\("\/"\)/);
    expect(src).not.toMatch(/router\.replace\("\/\(tabs\)"\)/);
  });

  it("the wizard chains through to the screen that writes the column", () => {
    // profile → goals → connect → complete. A break anywhere leaves
    // onboarding_completed permanently false and the redirect permanent.
    expect(read("app/onboarding/profile.tsx")).toMatch(/["'`]\/onboarding\/goals["'`]/);
    expect(read("app/onboarding/goals.tsx")).toMatch(/["'`]\/onboarding\/connect["'`]/);
    expect(read("app/onboarding/connect.tsx")).toMatch(/["'`]\/onboarding\/complete["'`]/);
    expect(read("app/onboarding/complete.tsx")).toMatch(/completeOnboarding\(\)/);
  });
});

describe("logout", () => {
  it("clears onboardingCompleted so it does not carry into the next sign-in", async () => {
    const { signOut } = require("../../services/supabase");
    signOut.mockResolvedValue({ error: null });
    setAuth({ user: SOME_USER, isAuthenticated: true, onboardingCompleted: true });

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(false);
  });
});

describe("isPublicRoute — what a signed-out visitor may reach", () => {
  it("lets the index entry through so it can decide for itself", () => {
    expect(isPublicRoute([])).toBe(true);
  });

  it.each([["(auth)", "login"], ["(auth)", "register"], ["handoff"]])(
    "allows /%s",
    (...segments) => {
      expect(isPublicRoute(segments)).toBe(true);
    },
  );

  it("allows the marketing carousel at /onboarding", () => {
    expect(isPublicRoute(["onboarding"])).toBe(true);
  });

  it.each([["profile"], ["goals"], ["connect"], ["complete"]])(
    "PROTECTS the wizard step /onboarding/%s",
    (step) => {
      // These read and write the signed-in user's profile row. The guard used
      // to exempt the whole `onboarding` root, so a deep link walked a
      // signed-out visitor through a form whose writes silently no-opped.
      expect(isPublicRoute(["onboarding", step])).toBe(false);
    },
  );

  it.each([["(tabs)"], ["admin"], ["trading"], ["settings"], ["documents"]])(
    "protects /%s",
    (root) => {
      expect(isPublicRoute([root])).toBe(false);
    },
  );

  it("defaults to PROTECTED for a route nobody has classified", () => {
    // Fail closed: a feature area added after this file was last read is
    // guarded until someone deliberately opens it.
    expect(isPublicRoute(["some-feature-shipped-tomorrow"])).toBe(false);
  });

  it("does not let a lookalike root segment through", () => {
    expect(isPublicRoute(["onboarding-v2"])).toBe(false);
    expect(isPublicRoute(["handoff-debug"])).toBe(false);
  });
});

describe("a failed profile READ must not replay the wizard", () => {
  beforeEach(() => setAuth({}));

  it("initialize treats an unreadable profile as onboarded, not unfinished", async () => {
    // A transport error says nothing about whether setup was done. Reading it
    // as "false" marches an established user through the four-screen wizard on
    // every network blip; the read is retried on the next launch.
    getCurrentUser.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", created_at: "2026-01-01" },
      error: null,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "network" } }),
    });

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("a MISSING row still means unfinished", async () => {
    // No error and no data is a genuinely unconfigured account: register()
    // inserts the row, so its absence is not a transport problem.
    getCurrentUser.mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", created_at: "2026-01-01" },
      error: null,
    });
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await act(async () => {
      await useAuthStore.getState().initialize();
    });

    expect(useAuthStore.getState().onboardingCompleted).toBe(false);
  });
});
