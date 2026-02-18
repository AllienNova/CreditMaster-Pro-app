/**
 * ImpactCalculator Component Tests
 *
 * Tests the calculation logic, rendering branches, feasibility alerts,
 * goal benefit display, and null-return conditions.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ImpactCalculator } from "../ImpactCalculator";

// ---------------------------------------------------------------------------
// Null-return conditions (component returns null)
// ---------------------------------------------------------------------------

describe("ImpactCalculator — null returns", () => {
  it("returns null when currentScore is empty", () => {
    const { container } = render(
      <ImpactCalculator
        currentScore=""
        targetScore="800_plus"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when targetScore is empty", () => {
    const { container } = render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore=""
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when timeframe is empty", () => {
    const { container } = render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="800_plus"
        timeframe=""
        selectedGoals={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when target <= current (no improvement needed)", () => {
    const { container } = render(
      <ImpactCalculator
        currentScore="800_plus"
        targetScore="below_580"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when target equals current", () => {
    const { container } = render(
      <ImpactCalculator
        currentScore="670_739"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Valid calculations — renders content
// ---------------------------------------------------------------------------

describe("ImpactCalculator — rendering", () => {
  it("renders the Impact Forecast heading", () => {
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText("Your Impact Forecast")).toBeInTheDocument();
  });

  it("displays the correct points to gain", () => {
    // below_580 = 550, 670_739 = 705, diff = 155
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText("+155")).toBeInTheDocument();
  });

  it("displays monthly improvement target", () => {
    // 155 points / 6 months = ~26 pts/month
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText(/26 points\/month/)).toBeInTheDocument();
  });

  it("displays estimated savings", () => {
    // (155/10)*1000 = 15500
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText("$15,500+")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Timeframe branching — 3, 6, 12 months
// ---------------------------------------------------------------------------

describe("ImpactCalculator — timeframe parsing", () => {
  it("uses 3 months for 3_months timeframe", () => {
    // below_580=550, 580_669=625, diff=75, 75/3=25 pts/month
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="580_669"
        timeframe="3_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText(/25 points\/month/)).toBeInTheDocument();
  });

  it("uses 6 months for 6_months timeframe", () => {
    // 75/6 = 12.5 -> Math.round = 13
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="580_669"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText(/13 points\/month/)).toBeInTheDocument();
  });

  it("defaults to 12 months for other timeframes", () => {
    // 75/12 = 6.25 -> Math.round = 6
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="580_669"
        timeframe="12_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText(/6 points\/month/)).toBeInTheDocument();
  });

  it("defaults to 12 months for unrecognized timeframe", () => {
    // 75/12 = 6.25 -> Math.round = 6
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="580_669"
        timeframe="24_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText(/6 points\/month/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Feasibility logic
// ---------------------------------------------------------------------------

describe("ImpactCalculator — feasibility", () => {
  it("does NOT show tip when monthly improvement <= 15 (feasible)", () => {
    // below_580=550, 580_669=625, diff=75, 75/6=13 <= 15 (feasible)
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="580_669"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.queryByText(/Tip:/)).not.toBeInTheDocument();
  });

  it("shows feasibility tip when monthly improvement > 15 (not feasible)", () => {
    // below_580=550, 800_plus=820, diff=270, 270/3=90 > 15 (not feasible)
    // recommendedMonths = ceil(270/15) = 18
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="800_plus"
        timeframe="3_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.getByText(/Tip:/)).toBeInTheDocument();
    expect(screen.getByText(/18 months/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Goal benefits display
// ---------------------------------------------------------------------------

describe("ImpactCalculator — goal benefits", () => {
  it("does not show benefits section when no goals selected", () => {
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={[]}
      />,
    );
    expect(screen.queryByText("What You'll Unlock:")).not.toBeInTheDocument();
  });

  it("displays benefits for known goals", () => {
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={["buy_home"]}
      />,
    );
    expect(screen.getByText("What You'll Unlock:")).toBeInTheDocument();
    expect(
      screen.getByText("Qualify for better mortgage rates"),
    ).toBeInTheDocument();
    expect(screen.getByText("Save $50,000+ over 30 years")).toBeInTheDocument();
  });

  it("displays up to 3 goal benefits", () => {
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={["buy_home", "credit_cards", "lower_rates"]}
      />,
    );
    expect(
      screen.getByText("Qualify for better mortgage rates"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Unlock premium rewards cards"),
    ).toBeInTheDocument();
    expect(screen.getByText("Refinance at lower rates")).toBeInTheDocument();
  });

  it('shows "+N more" when more than 3 goals selected', () => {
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={[
          "buy_home",
          "credit_cards",
          "lower_rates",
          "build_credit",
          "remove_negatives",
        ]}
      />,
    );
    expect(screen.getByText("+2 more benefits")).toBeInTheDocument();
  });

  it('does not show "+N more" for exactly 3 goals', () => {
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={["buy_home", "credit_cards", "lower_rates"]}
      />,
    );
    expect(screen.queryByText(/more benefits/)).not.toBeInTheDocument();
  });

  it("skips unknown goal IDs gracefully", () => {
    render(
      <ImpactCalculator
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
        selectedGoals={["unknown_goal_id"]}
      />,
    );
    // "What You'll Unlock" heading renders but no benefit cards are shown
    expect(screen.getByText("What You'll Unlock:")).toBeInTheDocument();
  });
});
