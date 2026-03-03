/**
 * Tests for Icon Component
 */

import { render, screen } from "@testing-library/react";
import Icon from "../Icon";

describe("Icon", () => {
  it("should render a known icon by name", () => {
    const { container } = render(<Icon name="home" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should return null for empty name", () => {
    const { container } = render(<Icon name="" />);
    expect(container.innerHTML).toBe("");
  });

  it("should render fallback icon for unknown name", () => {
    const { container } = render(<Icon name="nonexistent-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // Fallback is a circle SVG
    const circle = container.querySelector("circle");
    expect(circle).toBeInTheDocument();
  });

  it("should apply default className", () => {
    const { container } = render(<Icon name="home" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("w-6");
    expect(span?.className).toContain("h-6");
  });

  it("should apply custom className", () => {
    const { container } = render(<Icon name="home" className="w-10 h-10 text-red-500" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("w-10");
    expect(span?.className).toContain("h-10");
    expect(span?.className).toContain("text-red-500");
  });

  it("should render star icon", () => {
    const { container } = render(<Icon name="star" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render credit-card icon", () => {
    const { container } = render(<Icon name="credit-card" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render shield icon", () => {
    const { container } = render(<Icon name="shield" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should render chart-bar icon", () => {
    const { container } = render(<Icon name="chart-bar" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should wrap icon in a span element", () => {
    const { container } = render(<Icon name="bell" />);
    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    expect(span?.querySelector("svg")).toBeInTheDocument();
  });
});
