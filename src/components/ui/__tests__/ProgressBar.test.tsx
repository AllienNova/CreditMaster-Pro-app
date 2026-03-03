/**
 * Tests for ProgressBar Component
 */

import { render, screen } from "@testing-library/react";
import { ProgressBar } from "../ProgressBar";

describe("ProgressBar", () => {
  it("should render with default props", () => {
    render(<ProgressBar value={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
  });

  it("should set aria-valuenow based on percentage", () => {
    render(<ProgressBar value={75} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "75");
  });

  it("should set aria-valuemin and aria-valuemax", () => {
    render(<ProgressBar value={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
  });

  it("should set aria-label to provided label", () => {
    render(<ProgressBar value={50} label="Upload progress" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-label", "Upload progress");
  });

  it("should default aria-label to Progress when no label", () => {
    render(<ProgressBar value={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-label", "Progress");
  });

  it("should show label text when label is provided", () => {
    render(<ProgressBar value={50} label="Upload progress" />);
    expect(screen.getByText("Upload progress")).toBeInTheDocument();
  });

  it("should show value/max when showLabel is true", () => {
    render(<ProgressBar value={30} max={100} showLabel={true} />);
    expect(screen.getByText("30/100")).toBeInTheDocument();
  });

  it("should not show label text by default", () => {
    render(<ProgressBar value={50} />);
    expect(screen.queryByText("50/100")).not.toBeInTheDocument();
  });

  it("should clamp value to 0 minimum", () => {
    render(<ProgressBar value={-10} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "0");
  });

  it("should clamp value to 100 maximum", () => {
    render(<ProgressBar value={150} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");
  });

  it("should calculate percentage from custom max", () => {
    render(<ProgressBar value={25} max={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "50");
  });

  it("should apply inline width style based on percentage", () => {
    render(<ProgressBar value={60} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveStyle({ width: "60%" });
  });

  it("should apply blue color class by default", () => {
    render(<ProgressBar value={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("bg-blue-500");
  });

  it("should apply green color class", () => {
    render(<ProgressBar value={50} color="green" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("bg-green-500");
  });

  it("should apply red color class", () => {
    render(<ProgressBar value={50} color="red" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("bg-red-500");
  });

  it("should apply dynamic color based on value (green for >= 80)", () => {
    render(<ProgressBar value={85} color="dynamic" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("bg-green-500");
  });

  it("should apply dynamic color based on value (yellow for >= 60)", () => {
    render(<ProgressBar value={65} color="dynamic" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("bg-yellow-500");
  });

  it("should apply dynamic color based on value (orange for >= 40)", () => {
    render(<ProgressBar value={45} color="dynamic" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("bg-orange-500");
  });

  it("should apply dynamic color based on value (red for < 40)", () => {
    render(<ProgressBar value={20} color="dynamic" />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("bg-red-500");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ProgressBar value={50} className="my-progress" />,
    );
    expect(container.querySelector(".my-progress")).toBeInTheDocument();
  });

  it("should have transition animation by default", () => {
    render(<ProgressBar value={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("transition-all");
  });

  it("should not have transition animation when animated is false", () => {
    render(<ProgressBar value={50} animated={false} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).not.toContain("transition-all");
  });
});
