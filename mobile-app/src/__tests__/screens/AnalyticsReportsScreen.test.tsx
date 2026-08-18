/**
 * Analytics Reports (app/analytics/reports.tsx) — honest-state coverage.
 *
 * Three claims were removed, and each has a test here:
 *
 *   GENERATED_REPORTS listed files the reader supposedly had, with Download
 *   and Share buttons for documents that were nowhere.
 *
 *   handleGenerate promised delivery — "Credit Score Summary will be ready in
 *   approximately 2 min" — and spun for 2 s. No request was made.
 *
 *   The Scheduled Reports card stated a schedule the reader never set,
 *   "Monthly Credit Summary, every 1st of the month", written inline in JSX.
 *   That one is the shape audit:screen-data cannot see (task #100), so this
 *   file is the only thing standing over it.
 *
 * Nothing is wired, and the tests encode why rather than asserting a fetch
 * that should not exist: no generated-reports table, documents.type excludes
 * them (001_initial_schema.sql:41), and /api/analytics/reports persists
 * nothing and sits on the AnalyticsEngine stub (#99).
 */

import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";

import AnalyticsReportsScreen from "../../../app/analytics/reports";

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Analytics reports — no file is claimed to exist", () => {
  it("lists none of the invented reports", () => {
    render(<AnalyticsReportsScreen />);

    for (const invented of [
      /Credit Score Summary - Dec 2024/,
      /Dispute History - Q4 2024/,
      /2\.4 MB/,
    ]) {
      expect(screen.queryByText(invented)).toBeNull();
    }
  });

  it("says why the list is empty", () => {
    render(<AnalyticsReportsScreen />);

    expect(screen.getByText("No reports generated yet")).toBeTruthy();
    expect(
      screen.getByText(/Report generation is not available yet/),
    ).toBeTruthy();
  });
});

describe("Analytics reports — generating promises nothing", () => {
  it("does not say a report will be ready", () => {
    render(<AnalyticsReportsScreen />);

    fireEvent.press(screen.getAllByText("Generate")[0]);

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body] = (Alert.alert as jest.Mock).mock.calls[0];
    const said = `${title} ${body}`;
    expect(title).toMatch(/not available yet/i);
    expect(said).not.toMatch(/will be ready/i);
    expect(said).not.toMatch(/approximately/i);
  });

  it("shows no in-flight generating state", () => {
    render(<AnalyticsReportsScreen />);

    fireEvent.press(screen.getAllByText("Generate")[0]);

    // A spinner is the same promise the old handler made in words.
    expect(screen.queryByText("Generating...")).toBeNull();
  });
});

describe("Analytics reports — no schedule is claimed", () => {
  it("states no scheduled reports rather than naming one", () => {
    render(<AnalyticsReportsScreen />);

    expect(screen.getByText("No scheduled reports")).toBeTruthy();
    // Written inline in JSX, so no gate would ever have caught this.
    expect(screen.queryByText("Monthly Credit Summary")).toBeNull();
    expect(screen.queryByText("Every 1st of the month")).toBeNull();
  });
});

describe("Analytics reports — the templates are real intent", () => {
  it("still offers the report kinds", () => {
    render(<AnalyticsReportsScreen />);

    expect(screen.getByText("Credit Score Summary")).toBeTruthy();
    expect(
      screen.getByText("Complete credit score analysis with trends"),
    ).toBeTruthy();
  });
});

describe("Analytics reports — the source is clean", () => {
  const fs = require("fs");
  const path = require("path");
  const raw = fs.readFileSync(
    path.join(process.cwd(), "app/analytics/reports.tsx"),
    "utf8",
  );
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("no longer declares GENERATED_REPORTS", () => {
    expect(source).not.toContain("const GENERATED_REPORTS");
  });

  it("quotes no file size and no schedule", () => {
    for (const literal of ["2.4 MB", "1.8 MB", "Every 1st of the month"]) {
      expect(source).not.toContain(literal);
    }
  });

  it("no longer fakes work with a timer", () => {
    expect(source).not.toContain("setTimeout");
  });
});
