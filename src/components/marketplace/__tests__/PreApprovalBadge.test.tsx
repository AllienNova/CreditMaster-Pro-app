/**
 * PreApprovalBadge Component Tests
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock framer-motion to avoid animation complexity in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
    span: ({ children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...rest}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import PreApprovalBadge from "../PreApprovalBadge";
import type { PreApprovalOdds } from "@/lib/commerce/matching/pre-approval-calculator";

// ===========================================================================
// Fixtures
// ===========================================================================

function makeOdds(
  likelihood: PreApprovalOdds["likelihood"],
  probability: number,
  overrides: Partial<PreApprovalOdds> = {},
): PreApprovalOdds {
  return {
    likelihood,
    probability,
    factors: [
      {
        name: "Credit Score",
        impact: "positive",
        weight: 40,
        score: 30,
        detail: "Good credit score.",
      },
      {
        name: "Debt-to-Income Ratio",
        impact: "neutral",
        weight: 25,
        score: 15,
        detail: "Moderate DTI.",
      },
    ],
    creditImpact: {
      hardInquiry: true,
      estimatedScoreDrop: 5,
    },
    disclaimer:
      "This estimate is based on your credit profile and does not constitute a loan offer or guarantee of approval. Actual approval decisions are made by the lender.",
    ...overrides,
  };
}

// ===========================================================================
// Likelihood variants
// ===========================================================================

describe("PreApprovalBadge — likelihood variants", () => {
  it("renders Excellent Odds label", () => {
    render(<PreApprovalBadge odds={makeOdds("excellent", 90)} />);
    expect(screen.getByText("Excellent Odds")).toBeInTheDocument();
  });

  it("renders Good Odds label", () => {
    render(<PreApprovalBadge odds={makeOdds("good", 65)} />);
    expect(screen.getByText("Good Odds")).toBeInTheDocument();
  });

  it("renders Fair Odds label", () => {
    render(<PreApprovalBadge odds={makeOdds("fair", 45)} />);
    expect(screen.getByText("Fair Odds")).toBeInTheDocument();
  });

  it("renders Low Odds label", () => {
    render(<PreApprovalBadge odds={makeOdds("poor", 20)} />);
    expect(screen.getByText("Low Odds")).toBeInTheDocument();
  });

  it("displays probability percentage", () => {
    render(<PreApprovalBadge odds={makeOdds("good", 68)} />);
    // "68" and "%" are separate text nodes inside the same span
    expect(screen.getByText(/68/)).toBeInTheDocument();
  });
});

// ===========================================================================
// Expand / collapse
// ===========================================================================

describe("PreApprovalBadge — expand/collapse", () => {
  it("does not show factor details by default", () => {
    render(<PreApprovalBadge odds={makeOdds("good", 65)} />);
    expect(screen.queryByText("Good credit score.")).not.toBeInTheDocument();
  });

  it("shows factor details after clicking badge", () => {
    render(<PreApprovalBadge odds={makeOdds("good", 65)} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Good credit score.")).toBeInTheDocument();
  });

  it("hides factor details after clicking badge a second time", () => {
    render(<PreApprovalBadge odds={makeOdds("good", 65)} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.queryByText("Good credit score.")).not.toBeInTheDocument();
  });

  it("does not expand when compact=true", () => {
    render(<PreApprovalBadge odds={makeOdds("good", 65)} compact />);
    // In compact mode the button is disabled, no toggle
    const button = screen.queryByRole("button");
    if (button) {
      fireEvent.click(button);
    }
    expect(screen.queryByText("Good credit score.")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Disclaimer display
// ===========================================================================

describe("PreApprovalBadge — disclaimer", () => {
  it("shows disclaimer when expanded", () => {
    const odds = makeOdds("fair", 40);
    render(<PreApprovalBadge odds={odds} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(odds.disclaimer)).toBeInTheDocument();
  });

  it("does not show disclaimer when collapsed", () => {
    const odds = makeOdds("fair", 40);
    render(<PreApprovalBadge odds={odds} />);
    expect(screen.queryByText(odds.disclaimer)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Hard inquiry warning
// ===========================================================================

describe("PreApprovalBadge — hard inquiry", () => {
  it("shows hard inquiry warning icon when hardInquiry is true", () => {
    render(<PreApprovalBadge odds={makeOdds("excellent", 90)} />);
    expect(screen.getByLabelText("Hard inquiry warning")).toBeInTheDocument();
  });

  it("does not show hard inquiry warning when hardInquiry is false", () => {
    const odds = makeOdds("excellent", 90, {
      creditImpact: { hardInquiry: false, estimatedScoreDrop: 0 },
    });
    render(<PreApprovalBadge odds={odds} />);
    expect(screen.queryByLabelText("Hard inquiry warning")).not.toBeInTheDocument();
  });

  it("shows hard inquiry detail text when expanded", () => {
    render(<PreApprovalBadge odds={makeOdds("excellent", 90)} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/hard inquiry/i)).toBeInTheDocument();
  });
});

// ===========================================================================
// Factor list
// ===========================================================================

describe("PreApprovalBadge — factor list", () => {
  it("renders all factor names when expanded", () => {
    render(<PreApprovalBadge odds={makeOdds("good", 65)} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Credit Score")).toBeInTheDocument();
    expect(screen.getByText("Debt-to-Income Ratio")).toBeInTheDocument();
  });

  it("renders factor detail text when expanded", () => {
    render(<PreApprovalBadge odds={makeOdds("good", 65)} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Moderate DTI.")).toBeInTheDocument();
  });
});
