/**
 * useCreditAccounts — the shared reader for the caller's credit tradelines.
 *
 * Five screens each held the reader's cards in a useState initialiser and
 * computed advice from them (utilisation, credit age, credit mix, payment
 * timing). All five were invisible to audit:screen-data until da4323a. They
 * read through this hook so they cannot drift on what an empty list means or
 * what a missing credit limit implies.
 *
 * The `creditLimit: null` behaviour is the one worth locking down: a loan has
 * no limit, and defaulting it to 0 makes utilisation NaN or Infinity — or,
 * worse, renders "0% used", which reads as a card being used well.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { rest } from "msw";

import { server } from "@/__tests__/mocks/server";
import { useCreditAccounts, utilizationOf } from "../useCreditAccounts";

const ACCOUNTS = "http://localhost/api/credit-repair/accounts";

function account(over: Record<string, unknown> = {}) {
  return {
    id: "a-1",
    creditorName: "Northgate Card",
    accountType: "revolving",
    balance: 400,
    creditLimit: 2000,
    paymentStatus: "current",
    openedDate: "2019-04-01",
    ageMonths: 76,
    ...over,
  };
}

function serve(accounts: unknown[]) {
  server.use(rest.get(ACCOUNTS, (_req, res, ctx) => res(ctx.json({ accounts }))));
}

describe("useCreditAccounts", () => {
  it("returns the accounts the route provided", async () => {
    serve([account()]);

    const { result } = renderHook(() => useCreditAccounts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].creditorName).toBe("Northgate Card");
    expect(result.current.error).toBeNull();
  });

  it("keeps a missing credit limit as null rather than 0", async () => {
    serve([account({ id: "a-2", accountType: "installment", creditLimit: null })]);

    const { result } = renderHook(() => useCreditAccounts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accounts[0].creditLimit).toBeNull();
  });

  it("reports an empty list with no error when the reader has no accounts", async () => {
    serve([]);

    const { result } = renderHook(() => useCreditAccounts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accounts).toEqual([]);
    // The distinction every caller depends on.
    expect(result.current.error).toBeNull();
  });

  it("reports an error, and an empty list, when the route fails", async () => {
    server.use(rest.get(ACCOUNTS, (_req, res, ctx) => res(ctx.status(500))));

    const { result } = renderHook(() => useCreditAccounts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accounts).toEqual([]);
    expect(result.current.error).toMatch(/could not load your credit accounts/i);
  });

  it("reports an error when the network drops", async () => {
    server.use(rest.get(ACCOUNTS, (_req, res) => res.networkError("offline")));

    const { result } = renderHook(() => useCreditAccounts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/could not reach/i);
  });
});

describe("utilizationOf", () => {
  it("computes balance against limit", () => {
    expect(utilizationOf({ ...account(), creditLimit: 2000, balance: 400 } as never)).toBe(20);
  });

  it("returns null when there is no limit to divide by", () => {
    // A loan. 0 here would read as "using none of it", which is a claim.
    expect(utilizationOf({ ...account(), creditLimit: null } as never)).toBeNull();
    expect(utilizationOf({ ...account(), creditLimit: 0 } as never)).toBeNull();
  });
});
