/**
 * GoalProgressBar Component Tests
 *
 * Tests for the animated progress indicator with milestones and color-coded status.
 */

import React from "react";
import { render } from "@testing-library/react";
import GoalProgressBar from "../GoalProgressBar";

describe("GoalProgressBar", () => {
  it("renders without crashing", () => {
    const { container } = render(<GoalProgressBar progress={50} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders progress bar with correct width style", () => {
    const { container } = render(<GoalProgressBar progress={60} />);
    const progressFill = container.querySelector("[style]");
    expect(progressFill).toHaveStyle({ width: "60%" });
  });

  it("clamps progress to 100% max width", () => {
    const { container } = render(<GoalProgressBar progress={150} />);
    const progressFill = container.querySelector("[style]");
    expect(progressFill).toHaveStyle({ width: "100%" });
  });

  it("renders milestone markers at 25%, 50%, and 75%", () => {
    const { container } = render(<GoalProgressBar progress={10} />);
    const markers = container.querySelectorAll(
      '[style*="left: 25%"], [style*="left: 50%"], [style*="left: 75%"]',
    );
    expect(markers.length).toBe(3);
  });

  it("shows shimmer animation when showAnimation is true and progress < 100", () => {
    const { container } = render(
      <GoalProgressBar progress={50} showAnimation={true} />,
    );
    const shimmer = container.querySelector(".animate-shimmer");
    expect(shimmer).toBeInTheDocument();
  });

  it("hides shimmer animation when showAnimation is false", () => {
    const { container } = render(
      <GoalProgressBar progress={50} showAnimation={false} />,
    );
    const shimmer = container.querySelector(".animate-shimmer");
    expect(shimmer).not.toBeInTheDocument();
  });

  it("shows celebration emoji when progress >= 100 and showAnimation is true", () => {
    const { container } = render(
      <GoalProgressBar progress={100} showAnimation={true} />,
    );
    const celebration = container.querySelector(".animate-bounce");
    expect(celebration).toBeInTheDocument();
  });

  it("does not show celebration when progress < 100", () => {
    const { container } = render(
      <GoalProgressBar progress={99} showAnimation={true} />,
    );
    const celebration = container.querySelector(".animate-bounce");
    expect(celebration).not.toBeInTheDocument();
  });
});
