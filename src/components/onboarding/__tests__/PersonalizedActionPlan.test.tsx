/**
 * PersonalizedActionPlan Component Tests
 *
 * Tests deduplication logic, priority sorting, top-5 slicing,
 * null-return for empty steps, goal step rendering, and
 * the "High Priority" badge conditional.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { PersonalizedActionPlan } from "../PersonalizedActionPlan";

// ---------------------------------------------------------------------------
// Null-return conditions
// ---------------------------------------------------------------------------

describe("PersonalizedActionPlan — null returns", () => {
  it("returns null when no goals are selected", () => {
    const { container } = render(
      <PersonalizedActionPlan
        selectedGoals={[]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when all selected goals are unknown", () => {
    const { container } = render(
      <PersonalizedActionPlan
        selectedGoals={["unknown_goal_1", "unknown_goal_2"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rendering — heading and description
// ---------------------------------------------------------------------------

describe("PersonalizedActionPlan — rendering", () => {
  it("renders the heading when goals have steps", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_home"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(
      screen.getByText("Your Personalized Action Plan"),
    ).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_home"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(
      screen.getByText(
        /Based on your goals, here are the most impactful steps/,
      ),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Goal-specific action steps
// ---------------------------------------------------------------------------

describe("PersonalizedActionPlan — goal steps", () => {
  it("shows buy_home steps", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_home"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(screen.getByText("Dispute Negative Items")).toBeInTheDocument();
    expect(screen.getByText("Lower Credit Utilization")).toBeInTheDocument();
    expect(screen.getByText("Become Authorized User")).toBeInTheDocument();
  });

  it("shows buy_car steps", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_car"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(screen.getByText("Pay Down High Balances")).toBeInTheDocument();
    expect(screen.getByText("Dispute Collections")).toBeInTheDocument();
  });

  it("shows credit_cards steps", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["credit_cards"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(screen.getByText("Improve Payment History")).toBeInTheDocument();
    expect(
      screen.getByText("Request Credit Limit Increases"),
    ).toBeInTheDocument();
  });

  it("shows lower_rates steps", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["lower_rates"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(screen.getByText("Dispute Late Payments")).toBeInTheDocument();
    expect(screen.getByText("Consolidate Debt")).toBeInTheDocument();
  });

  it("shows remove_negatives steps", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["remove_negatives"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(screen.getByText("File Disputes")).toBeInTheDocument();
    expect(screen.getByText("Negotiate Pay-for-Delete")).toBeInTheDocument();
  });

  it("shows build_credit steps", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["build_credit"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(screen.getByText("Open Secured Credit Card")).toBeInTheDocument();
    // "Become Authorized User" also in build_credit
    expect(screen.getByText("Become Authorized User")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Deduplication logic
// ---------------------------------------------------------------------------

describe("PersonalizedActionPlan — deduplication", () => {
  it("deduplicates steps with the same title across goals", () => {
    // buy_home and build_credit both have "Become Authorized User"
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_home", "build_credit"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    // Should appear exactly once
    const matches = screen.getAllByText("Become Authorized User");
    expect(matches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Priority sorting
// ---------------------------------------------------------------------------

describe("PersonalizedActionPlan — priority sorting", () => {
  it("renders high priority steps before medium priority steps", () => {
    // buy_home has: Dispute Negative Items (high), Lower Credit Utilization (high), Become Authorized User (medium)
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_home"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    const allStepTitles = screen.getAllByRole("heading", { level: 3 });
    const titles = allStepTitles.map((el) => el.textContent);
    // High priority steps first, medium last
    expect(titles.indexOf("Dispute Negative Items")).toBeLessThan(
      titles.indexOf("Become Authorized User"),
    );
    expect(titles.indexOf("Lower Credit Utilization")).toBeLessThan(
      titles.indexOf("Become Authorized User"),
    );
  });
});

// ---------------------------------------------------------------------------
// Top-5 slicing
// ---------------------------------------------------------------------------

describe("PersonalizedActionPlan — top 5 limit", () => {
  it("renders at most 5 steps even with many goals", () => {
    // Selecting all goals: buy_home (3), buy_car (2), credit_cards (2), lower_rates (2),
    // remove_negatives (2), build_credit (2) = many unique steps
    render(
      <PersonalizedActionPlan
        selectedGoals={[
          "buy_home",
          "buy_car",
          "credit_cards",
          "lower_rates",
          "remove_negatives",
          "build_credit",
        ]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    const allStepTitles = screen.getAllByRole("heading", { level: 3 });
    expect(allStepTitles.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// High Priority badge
// ---------------------------------------------------------------------------

describe("PersonalizedActionPlan — High Priority badge", () => {
  it('shows "High Priority" badge for high-priority steps', () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_home"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    // buy_home has 2 high priority steps
    const badges = screen.getAllByText("High Priority");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT show "High Priority" badge for medium-priority steps', () => {
    // credit_cards has "Request Credit Limit Increases" which is medium
    render(
      <PersonalizedActionPlan
        selectedGoals={["credit_cards"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    // "Improve Payment History" is high -> gets badge
    // "Request Credit Limit Increases" is medium -> no badge
    const badges = screen.getAllByText("High Priority");
    // Only 1 high priority step in credit_cards
    expect(badges).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Step details rendering
// ---------------------------------------------------------------------------

describe("PersonalizedActionPlan — step details", () => {
  it("displays description, timeframe, and impact for each step", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_home"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    // Check first step details
    expect(
      screen.getByText(
        "Remove errors and outdated negative items from your reports",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("30-45 days")).toBeInTheDocument();
    expect(screen.getByText("+20-40 pts")).toBeInTheDocument();
  });

  it("displays step numbers starting from 1", () => {
    render(
      <PersonalizedActionPlan
        selectedGoals={["buy_home"]}
        currentScore="below_580"
        targetScore="670_739"
        timeframe="6_months"
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
