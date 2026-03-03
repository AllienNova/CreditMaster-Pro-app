/**
 * MilestoneTimeline Component Tests
 *
 * Tests for the visual timeline of goal milestones and achievements.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import MilestoneTimeline from "../MilestoneTimeline";

const mockMilestones = [
  {
    id: "m1",
    amount: 1000,
    date: new Date("2026-03-01"),
    achieved: true,
    description: "First milestone reached",
  },
  {
    id: "m2",
    amount: 5000,
    date: new Date("2026-06-01"),
    achieved: false,
    description: "Halfway to goal",
  },
  {
    id: "m3",
    amount: 10000,
    date: new Date("2026-12-01"),
    achieved: false,
    description: "Final target",
  },
];

describe("MilestoneTimeline", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <MilestoneTimeline milestones={mockMilestones} />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders all milestones", () => {
    render(<MilestoneTimeline milestones={mockMilestones} />);
    expect(screen.getByText("First milestone reached")).toBeInTheDocument();
    expect(screen.getByText("Halfway to goal")).toBeInTheDocument();
    expect(screen.getByText("Final target")).toBeInTheDocument();
  });

  it("formats currency amounts correctly", () => {
    render(<MilestoneTimeline milestones={mockMilestones} />);
    expect(screen.getByText("$1,000")).toBeInTheDocument();
    expect(screen.getByText("$5,000")).toBeInTheDocument();
    expect(screen.getByText("$10,000")).toBeInTheDocument();
  });

  it("sorts milestones by amount in ascending order", () => {
    const unsorted = [
      {
        id: "m3",
        amount: 10000,
        date: new Date("2026-12-01"),
        achieved: false,
        description: "Final",
      },
      {
        id: "m1",
        amount: 1000,
        date: new Date("2026-03-01"),
        achieved: true,
        description: "First",
      },
    ];
    const { container } = render(<MilestoneTimeline milestones={unsorted} />);
    // First rendered should be smaller amount
    const allText = container.textContent || "";
    const firstIndex = allText.indexOf("$1,000");
    const secondIndex = allText.indexOf("$10,000");
    expect(firstIndex).toBeLessThan(secondIndex);
  });

  it("renders achieved milestones with green styling", () => {
    const { container } = render(
      <MilestoneTimeline milestones={mockMilestones} />,
    );
    const greenMarkers = container.querySelectorAll(
      ".bg-gradient-to-br.from-green-500",
    );
    expect(greenMarkers.length).toBe(1); // Only one achieved milestone
  });

  it("renders empty timeline with no milestones", () => {
    const { container } = render(<MilestoneTimeline milestones={[]} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.querySelector(".space-y-4")?.children.length).toBe(0);
  });

  it("displays formatted dates with Target prefix", () => {
    render(<MilestoneTimeline milestones={mockMilestones} />);
    // Date formatting varies by timezone — just check the "Target:" prefix exists
    const targets = screen.getAllByText(/^Target:/);
    expect(targets.length).toBe(3);
  });
});
