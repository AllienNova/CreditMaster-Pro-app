/**
 * Identity Protection — fabrication-removal regression coverage.
 *
 * This page told every caller, with no scan having run and no backend to run
 * one, that "A new credit card ending in 4821 was opened in your name", that
 * their SSN had been "Used in Application" at critical severity, and that two
 * of their passwords were compromised. It then computed a protection score from
 * those invented rows and offered a "Run Scan" button that set a two-second
 * spinner and did nothing.
 *
 * A person who believes an account was opened in their name files a police
 * report and freezes their credit. These tests exist so that copy cannot come
 * back without someone deleting a test that says why it must not.
 */

import fs from "fs";
import path from "path";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

import IdentityProtectionPage from "../page";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/identity/page.tsx"),
  "utf8",
);

afterEach(cleanup);

describe("Identity Protection — claims about the user", () => {
  /** Every assertion the page used to make about the caller's identity. */
  const FABRICATED_CLAIMS = [
    /new credit card ending in 4821/i,
    /opened in your name/i,
    /SSN Used in Application/i,
    /found in a data breach/i,
    /Change 2 compromised passwords/i,
    /Freeze credit at TransUnion/i,
    /two-factor authentication on 3 accounts/i,
  ];

  it.each(FABRICATED_CLAIMS)("never renders %s", (claim) => {
    render(<IdentityProtectionPage />);
    expect(screen.queryByText(claim)).not.toBeInTheDocument();
  });

  it("shows no protection score, because nothing scored anything", () => {
    render(<IdentityProtectionPage />);
    expect(screen.queryByText(/protection score/i)).not.toBeInTheDocument();
    // The score was rendered as a bare number out of 100.
    expect(screen.queryByText(/\/\s*100/)).not.toBeInTheDocument();
  });

  it("offers no Run Scan button, because there is nothing to run", () => {
    render(<IdentityProtectionPage />);
    expect(
      screen.queryByRole("button", { name: /scan/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Identity Protection — what it says instead", () => {
  it("states plainly that monitoring is not active", () => {
    render(<IdentityProtectionPage />);
    expect(
      screen.getByText(/Identity monitoring is not active/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/we have no alerts for you/i)).toBeInTheDocument();
  });

  it("keeps only the tiles that lead somewhere real", () => {
    render(<IdentityProtectionPage />);

    const darkWeb = screen.getByRole("link", { name: /Dark Web Monitoring/i });
    expect(darkWeb).toHaveAttribute("href", "/identity/dark-web");

    const monitoring = screen.getByRole("link", { name: /Credit Monitoring/i });
    expect(monitoring).toHaveAttribute("href", "/dashboard/monitoring");

    // Three tiles linked to /identity — this page — so they went nowhere.
    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("href", "/identity");
    }
  });

  it("carries no status badges on the tiles", () => {
    render(<IdentityProtectionPage />);
    // "2 found" breaches, "2/3" bureaus frozen, "Active" $1M insurance —
    // each a claim about the caller, rendered as a chip on a nav tile.
    expect(screen.queryByText("2 found")).not.toBeInTheDocument();
    expect(screen.queryByText("2/3")).not.toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText(/\$1M coverage/i)).not.toBeInTheDocument();
  });
});

describe("Identity Protection — source", () => {
  it("declares none of the removed mock constants", () => {
    for (const name of [
      "MOCK_ALERTS",
      "SCAN_RESULTS",
      "RECOMMENDED_ACTIONS",
      "computeProtectionScore",
    ]) {
      expect(source).not.toMatch(
        new RegExp(`(const|function)\\s+${name}\\s*[(:=]`),
      );
    }
  });

  it("has no identity API to call, which is why there is no fetch", () => {
    // If this ever fails, an identity backend has landed and this page should
    // be wired to it rather than left on the not-active panel.
    expect(fs.existsSync(path.join(process.cwd(), "src/app/api/identity"))).toBe(
      false,
    );
    expect(source).not.toContain("fetch(");
  });
});
