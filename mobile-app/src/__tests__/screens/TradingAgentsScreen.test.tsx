/**
 * AI Agent Insights (app/trading/agents.tsx) — real-data wiring coverage.
 *
 * THE FETCH WAS DECORATIVE. The screen called /api/trading/agents and then
 * tested `json.data?.agents`. That route returns `data.logs` (route.ts:101) and
 * has no `agents` key, so the real branch could never be taken — every user, on
 * every successful response, fell through to MOCK_AGENTS. Two more fallbacks
 * caught the non-ok and network paths, so there was no way to see anything else.
 *
 * What the mock asserted: totalRuns 1247, successRate 0.97, avgLatencyMs 850,
 * lastRun two minutes ago, and a latestOutput reporting an analysis that never
 * ran ("market sentiment is cautiously bullish... Social media sentiment score:
 * 0.72") — on a screen about trading.
 *
 * The stats are now counted from the caller's own rows in trading_agent_logs.
 * The test that matters most after the wiring is the labelling one: the column
 * is `validation_passed`, so the screen says "Validated", not "Success". On a
 * trading screen those mean very different things.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

jest.mock(
  "react-native/Libraries/Components/RefreshControl/RefreshControl",
  () => "RefreshControl",
);

import AgentsScreen from "../../../app/trading/agents";

function log(over: Record<string, unknown> = {}) {
  return {
    agent_type: "sentiment",
    decision: { summary: "Momentum is flat on the names you hold." },
    confidence: 0.61,
    model: "gpt-4o-mini",
    latency_ms: 400,
    validation_passed: true,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    ...over,
  };
}

function serveLogs(logs: unknown[]) {
  (global as { fetch?: unknown }).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { logs } }),
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Trading agents — stats are counted from the caller's own runs", () => {
  it("derives the run count from the number of log rows", async () => {
    serveLogs([log(), log(), log()]);

    render(<AgentsScreen />);

    await waitFor(() => expect(screen.getByText("Sentiment")).toBeTruthy());
    expect(screen.getByText("3")).toBeTruthy();
    // The mock's invented totals must not appear.
    expect(screen.queryByText("1247")).toBeNull();
  });

  it("averages the real latency", async () => {
    serveLogs([log({ latency_ms: 300 }), log({ latency_ms: 500 })]);

    render(<AgentsScreen />);

    // (300 + 500) / 2 = 400ms, not the mock's 850.
    await waitFor(() => expect(screen.getByText("400ms")).toBeTruthy());
    expect(screen.queryByText("850ms")).toBeNull();
  });

  it("computes the validation rate from validation_passed", async () => {
    serveLogs([
      log({ validation_passed: true }),
      log({ validation_passed: true }),
      log({ validation_passed: false }),
      log({ validation_passed: true }),
    ]);

    render(<AgentsScreen />);

    await waitFor(() => expect(screen.getByText("Sentiment")).toBeTruthy());
    // 3 of 4 validated.
    expect(screen.getAllByText("75%").length).toBeGreaterThan(0);
  });

  it("groups separate agent types separately", async () => {
    serveLogs([log(), log({ agent_type: "risk_narrative" })]);

    render(<AgentsScreen />);

    await waitFor(() => expect(screen.getByText("Sentiment")).toBeTruthy());
    expect(screen.getByText("Risk narrative")).toBeTruthy();
  });

  it("shows the agent's real latest output", async () => {
    serveLogs([log()]);

    render(<AgentsScreen />);

    await waitFor(() =>
      expect(
        screen.getByText("Momentum is flat on the names you hold."),
      ).toBeTruthy(),
    );
  });
});

describe("Trading agents — the validation rate is not called success", () => {
  it("labels it Validated, because the column is validation_passed", async () => {
    serveLogs([log()]);

    render(<AgentsScreen />);

    await waitFor(() => expect(screen.getByText("Sentiment")).toBeTruthy());
    expect(screen.getAllByText("Validated").length).toBeGreaterThan(0);
    // "Success" on a trading screen claims the call was right about the
    // market. Nothing in trading_agent_logs supports that.
    expect(screen.queryByText("Success")).toBeNull();
  });
});

describe("Trading agents — nothing is invented when there is nothing", () => {
  it("says no runs were recorded rather than showing a roster", async () => {
    serveLogs([]);

    render(<AgentsScreen />);

    await waitFor(() =>
      expect(screen.getByText("No agent runs recorded")).toBeTruthy(),
    );
    expect(screen.queryByText("Sentiment Agent")).toBeNull();
  });

  it("says activity is unavailable when the response has no logs key", async () => {
    (global as { fetch?: unknown }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });

    render(<AgentsScreen />);

    await waitFor(() =>
      expect(screen.getByText("Agent activity is unavailable")).toBeTruthy(),
    );
  });

  it("says the service is unreachable when the request throws", async () => {
    (global as { fetch?: unknown }).fetch = jest
      .fn()
      .mockRejectedValue(new Error("offline"));

    render(<AgentsScreen />);

    await waitFor(() =>
      expect(
        screen.getByText("We could not reach the trading service."),
      ).toBeTruthy(),
    );
  });

  it("shows no agent telemetry on a failed response", async () => {
    (global as { fetch?: unknown }).fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) });

    render(<AgentsScreen />);

    await waitFor(() =>
      expect(screen.getByText("Agent activity is unavailable")).toBeTruthy(),
    );
    expect(screen.queryByText("1247")).toBeNull();
    expect(screen.queryByText("97%")).toBeNull();
  });
});

describe("Trading agents — the mock is gone from the source", () => {
  const fs = require("fs");
  const path = require("path");
  const raw = fs.readFileSync(
    path.join(process.cwd(), "app/trading/agents.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it.each(["MOCK_AGENTS", "MOCK_SUMMARY"])("no longer declares %s", (name) => {
    expect(source).not.toContain(`const ${name}`);
  });

  it("holds none of the invented telemetry", () => {
    for (const literal of ["1247", "0.97", "cautiously bullish"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("reads data.logs, the key the route actually returns", () => {
    expect(source).toContain("data?.logs");
  });
});
