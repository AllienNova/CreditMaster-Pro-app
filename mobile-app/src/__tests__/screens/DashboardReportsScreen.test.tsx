/**
 * Reports Dashboard (app/dashboard/reports.tsx) — honest-state coverage.
 *
 * `MOCK_REPORTS` listed documents the reader supposedly had ("Credit Analysis
 * Report - December 2024, 2.4 MB") with a Share button for a file that was
 * nowhere.
 *
 * `handleGenerate` was the sharper problem, because it answered an action the
 * user took: a 2 s setTimeout, a file invented with a `Math.random()` size
 * pushed into the list, and an alert reading "Your Credit Analysis has been
 * generated successfully." Nothing was generated and no request was made.
 *
 * It is NOT wired to a route, and the tests below encode why rather than
 * asserting a fetch that should not exist: no generated-reports table exists,
 * `documents.type` is CHECK-constrained to four upload kinds
 * (001_initial_schema.sql:41), and POST /api/analytics/reports persists nothing
 * and is backed by the AnalyticsEngine stub (#99).
 *
 * The test that matters most is the one asserting the alert no longer claims
 * success.
 */

import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";

import ReportsScreen from "../../../app/dashboard/reports";

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Reports — no report is claimed to exist", () => {
  it("lists no reports", () => {
    render(<ReportsScreen />);

    expect(screen.getByText("No reports generated yet")).toBeTruthy();
    for (const invented of [
      /Credit Analysis Report - December 2024/,
      /Dispute Progress Summary/,
      /2\.4 MB/,
    ]) {
      expect(screen.queryByText(invented)).toBeNull();
    }
  });

  it("says generation is unavailable rather than implying it is ready", () => {
    render(<ReportsScreen />);

    // "No reports generated yet" alone reads as "go ahead and generate one".
    expect(
      screen.getByText(/Report generation is not available yet/),
    ).toBeTruthy();
  });
});

describe("Reports — generating tells the truth", () => {
  it("does not claim success when a report type is tapped", () => {
    render(<ReportsScreen />);

    fireEvent.press(screen.getByText("Credit Analysis"));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toMatch(/not available yet/i);
    expect(`${title} ${body}`).not.toMatch(/successfully/i);
    expect(`${title} ${body}`).not.toMatch(/has been generated/i);
  });

  it("adds nothing to the list when tapped", () => {
    render(<ReportsScreen />);

    fireEvent.press(screen.getByText("Credit Analysis"));

    // The old handler pushed an invented file in after 2 s.
    expect(screen.getByText("No reports generated yet")).toBeTruthy();
  });

  it("still offers the report types, which describe a real intent", () => {
    render(<ReportsScreen />);

    expect(screen.getByText("Credit Analysis")).toBeTruthy();
    expect(
      screen.getByText("Comprehensive credit report analysis"),
    ).toBeTruthy();
  });
});

describe("Reports — the mock is gone from the source", () => {
  const fs = require("fs");
  const path = require("path");
  const raw = fs.readFileSync(
    path.join(process.cwd(), "app/dashboard/reports.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("no longer declares MOCK_REPORTS", () => {
    expect(source).not.toContain("const MOCK_REPORTS");
  });

  it("invents no file size", () => {
    // `${(Math.random() * 3 + 1).toFixed(1)} MB`
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("2.4 MB");
  });

  it("no longer simulates generation on a timer", () => {
    expect(source).not.toContain("setTimeout");
  });
});
