/**
 * PaperTradingEngine.closePosition
 *
 * Flattening a position had no engine method and no route, so the mobile
 * "close position" control posted into a 404 and the position stayed open.
 *
 * The design decision these pin: closing goes through placeOrder rather than
 * writing the position away directly. That is what produces the fill record,
 * the balance update and the paper_trades row, and it means realized P&L is
 * computed in exactly one place. A close path that adjusted paper_positions
 * itself would be a second implementation of the same arithmetic, free to
 * drift from the first.
 *
 * NOTE ON WHAT THIS CANNOT PROVE. The prices these trades execute at come from
 * getCurrentPrice, which falls back to `100 + Math.random() * 100` whenever
 * Polygon is unavailable — see docs/specs/security-findings.md. Every
 * assertion below is about the composition, never about a price being right.
 */

import { PaperTradingEngine } from "../PaperTradingEngine";

const mockFrom = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (...a: unknown[]) => mockFrom(...a) }),
}));

const ACCOUNT = "acct-1";
const POSITION = "pos-1";
const OTHER_ACCOUNT = "acct-2";

/** Every .eq() applied, per table, so filters can be asserted rather than assumed. */
const filters: Record<string, [string, unknown][]> = {};

/**
 * A chainable stub whose terminal call resolves to `result`.
 *
 * It RECORDS .eq() arguments. An earlier version discarded them, which made
 * the ownership test unfalsifiable: deleting `.eq("account_id", accountId)`
 * from closePosition left every assertion green, because the stub returned the
 * same row no matter what was filtered on.
 */
function chain(table: string, result: unknown) {
  const node: Record<string, unknown> = {};
  for (const m of ["select", "gt", "order", "limit", "insert", "update"]) {
    node[m] = () => node;
  }
  node.eq = (col: string, val: unknown) => {
    (filters[table] ??= []).push([col, val]);
    return node;
  };
  node.maybeSingle = () => Promise.resolve(result);
  node.single = () => Promise.resolve(result);
  return node;
}

function positionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: POSITION,
    account_id: ACCOUNT,
    symbol: "AAPL",
    quantity: 10,
    avg_entry_price: 150,
    current_price: 160,
    market_value: 1600,
    unrealized_pl: 100,
    unrealized_pl_percent: 6.67,
    realized_pl: 0,
    cost_basis: 1500,
    side: "long",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("PaperTradingEngine.closePosition", () => {
  let engine: PaperTradingEngine;
  let placeOrder: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(filters)) delete filters[k];
    engine = new PaperTradingEngine("http://localhost", "key");
    placeOrder = jest
      .spyOn(engine, "placeOrder")
      .mockResolvedValue({ id: "order-1" } as never);
  });

  function tableStubs(opts: {
    position?: unknown;
    positionError?: { message: string };
    trade?: unknown;
  }) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "paper_positions") {
        return chain(table, {
          data: opts.position ?? null,
          error: opts.positionError ?? null,
        });
      }
      if (table === "paper_trades") {
        return chain(table, { data: opts.trade ?? null, error: null });
      }
      return chain(table, { data: null, error: null });
    });
  }

  describe("ownership", () => {
    it("returns null when the position is not this account's", async () => {
      // closePosition filters on account_id, so another account's id matches
      // nothing and the row simply is not there.
      tableStubs({ position: null });
      expect(await engine.closePosition(OTHER_ACCOUNT, POSITION)).toBeNull();
    });

    it("does not place an order for a position it could not claim", async () => {
      tableStubs({ position: null });
      await engine.closePosition(OTHER_ACCOUNT, POSITION);
      expect(placeOrder).not.toHaveBeenCalled();
    });

    it("filters the lookup by BOTH id and account_id", async () => {
      // Service-role bypasses RLS, so account_id is the entire ownership
      // boundary. Without this assertion the stub would happily return the row
      // for any account and the tests above would still pass.
      tableStubs({ position: positionRow(), trade: { realized_pl: 0 } });
      await engine.closePosition(ACCOUNT, POSITION);

      expect(filters.paper_positions).toEqual(
        expect.arrayContaining([
          ["id", POSITION],
          ["account_id", ACCOUNT],
        ]),
      );
    });

    it("looks the trade up by the order that closed the position", async () => {
      tableStubs({ position: positionRow(), trade: { realized_pl: 0 } });
      await engine.closePosition(ACCOUNT, POSITION);
      expect(filters.paper_trades).toEqual([["order_id", "order-1"]]);
    });
  });

  describe("nothing to close", () => {
    it.each([0, -0])("returns null for a quantity of %j", async (quantity) => {
      // A zero-quantity row is a closed position that was never cleaned up.
      // Ordering zero shares would fail validation with a confusing message.
      tableStubs({ position: positionRow({ quantity }) });
      expect(await engine.closePosition(ACCOUNT, POSITION)).toBeNull();
      expect(placeOrder).not.toHaveBeenCalled();
    });
  });

  describe("closing", () => {
    it("sells the WHOLE holding at market", async () => {
      tableStubs({ position: positionRow(), trade: { realized_pl: 100 } });
      await engine.closePosition(ACCOUNT, POSITION);

      expect(placeOrder).toHaveBeenCalledWith(
        ACCOUNT,
        expect.objectContaining({
          symbol: "AAPL",
          side: "sell",
          type: "market",
          quantity: 10,
        }),
      );
    });

    it("supplies a time in force, because the column is NOT NULL", async () => {
      // paper_orders.time_in_force is NOT NULL with CHECK (day|gtc|ioc|fok|
      // opg|cls). The first live run of this method failed with
      //   null value in column "time_in_force" violates not-null constraint
      // while every mocked test here passed — a mock cannot enforce a
      // constraint. Same family as transactions.category being TEXT[].
      tableStubs({ position: positionRow(), trade: { realized_pl: 0 } });
      await engine.closePosition(ACCOUNT, POSITION);

      expect(placeOrder).toHaveBeenCalledWith(
        ACCOUNT,
        expect.objectContaining({ timeInForce: "day" }),
      );
    });

    it("reports the realized P&L RECORDED against the order", async () => {
      // Read back from paper_trades rather than recomputed here: a second
      // calculation is a second thing to drift.
      tableStubs({ position: positionRow(), trade: { realized_pl: 137.5 } });
      const result = await engine.closePosition(ACCOUNT, POSITION);
      expect(result?.realizedPL).toBe(137.5);
    });

    it("reports a loss unchanged", async () => {
      tableStubs({ position: positionRow(), trade: { realized_pl: -212.75 } });
      const result = await engine.closePosition(ACCOUNT, POSITION);
      expect(result?.realizedPL).toBe(-212.75);
    });

    it("reports 0 when the trade recorded no realized P&L", async () => {
      // executeOrder writes NULL rather than 0 when a trade realises nothing.
      tableStubs({ position: positionRow(), trade: { realized_pl: null } });
      const result = await engine.closePosition(ACCOUNT, POSITION);
      expect(result?.realizedPL).toBe(0);
    });

    it("returns the order that flattened the position", async () => {
      tableStubs({ position: positionRow(), trade: { realized_pl: 0 } });
      const result = await engine.closePosition(ACCOUNT, POSITION);
      expect(result?.order).toEqual({ id: "order-1" });
    });
  });

  it("throws rather than reporting a close when the position read fails", async () => {
    // Returning null here would become a 404 — "no such position" — for what is
    // actually a database failure, and the caller would stop retrying.
    tableStubs({ positionError: { message: "connection reset" } });
    await expect(engine.closePosition(ACCOUNT, POSITION)).rejects.toThrow(
      /Failed to load position/,
    );
  });

  it("lets an order validation failure surface instead of swallowing it", async () => {
    tableStubs({ position: positionRow() });
    placeOrder.mockRejectedValue(
      new Error("Order validation failed: Insufficient shares to sell"),
    );
    await expect(engine.closePosition(ACCOUNT, POSITION)).rejects.toThrow(
      /Order validation failed/,
    );
  });
});
