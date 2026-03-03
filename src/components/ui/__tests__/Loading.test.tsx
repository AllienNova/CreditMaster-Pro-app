/**
 * Tests for Loading Components (Spinner, Skeleton, SkeletonText, SkeletonCard,
 * LoadingOverlay, LoadingPage, LoadingButton, ProgressBar)
 */

import { render, screen, fireEvent } from "@testing-library/react";
import {
  Spinner,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  LoadingOverlay,
  LoadingPage,
  LoadingButton,
  ProgressBar,
} from "../Loading";

describe("Spinner", () => {
  it("should render an SVG element", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute("class")).toContain("animate-spin");
  });

  it("should apply default medium size", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("w-6");
    expect(svg?.getAttribute("class")).toContain("h-6");
  });

  it("should apply small size", () => {
    const { container } = render(<Spinner size="sm" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("w-4");
    expect(svg?.getAttribute("class")).toContain("h-4");
  });

  it("should apply large size", () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("w-8");
    expect(svg?.getAttribute("class")).toContain("h-8");
  });

  it("should apply blue color by default", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("text-blue-600");
  });

  it("should apply white color", () => {
    const { container } = render(<Spinner color="white" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("text-white");
  });

  it("should apply custom className", () => {
    const { container } = render(<Spinner className="extra-class" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("extra-class");
  });
});

describe("Skeleton", () => {
  it("should render a div with pulse animation", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("animate-pulse");
    expect(div.className).toContain("bg-gray-200");
  });

  it("should not have animation when animate is false", () => {
    const { container } = render(<Skeleton animate={false} />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain("animate-pulse");
  });

  it("should apply custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("h-4");
    expect(div.className).toContain("w-full");
  });
});

describe("SkeletonText", () => {
  it("should render 3 lines by default", () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll(".bg-gray-200");
    expect(lines).toHaveLength(3);
  });

  it("should render custom number of lines", () => {
    const { container } = render(<SkeletonText lines={5} />);
    const lines = container.querySelectorAll(".bg-gray-200");
    expect(lines).toHaveLength(5);
  });

  it("should make last line shorter", () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = container.querySelectorAll(".bg-gray-200");
    const lastLine = lines[lines.length - 1];
    expect(lastLine.className).toContain("w-3/4");
  });
});

describe("SkeletonCard", () => {
  it("should render card skeleton with multiple skeleton elements", () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll(".bg-gray-200");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should include a circular avatar skeleton", () => {
    const { container } = render(<SkeletonCard />);
    const avatar = container.querySelector(".rounded-full");
    expect(avatar).toBeInTheDocument();
  });
});

describe("LoadingOverlay", () => {
  it("should render with default loading message", () => {
    render(<LoadingOverlay />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render with custom message", () => {
    render(<LoadingOverlay message="Please wait..." />);
    expect(screen.getByText("Please wait...")).toBeInTheDocument();
  });

  it("should have alert role and aria-busy", () => {
    render(<LoadingOverlay />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-busy", "true");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("should render spinner", () => {
    const { container } = render(<LoadingOverlay />);
    const svg = container.querySelector("svg.animate-spin");
    expect(svg).toBeInTheDocument();
  });
});

describe("LoadingPage", () => {
  it("should render with default loading message", () => {
    render(<LoadingPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render with custom message", () => {
    render(<LoadingPage message="Initializing..." />);
    expect(screen.getByText("Initializing...")).toBeInTheDocument();
  });

  it("should have alert role and aria-busy", () => {
    render(<LoadingPage />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-busy", "true");
  });
});

describe("LoadingButton", () => {
  it("should render children when not loading", () => {
    render(<LoadingButton loading={false}>Submit</LoadingButton>);
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("should show spinner when loading", () => {
    const { container } = render(
      <LoadingButton loading={true}>Submit</LoadingButton>,
    );
    const svg = container.querySelector("svg.animate-spin");
    expect(svg).toBeInTheDocument();
  });

  it("should be disabled when loading", () => {
    render(<LoadingButton loading={true}>Submit</LoadingButton>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should be disabled when disabled prop is true", () => {
    render(
      <LoadingButton loading={false} disabled={true}>
        Submit
      </LoadingButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should call onClick when clicked and not loading", () => {
    const onClick = jest.fn();
    render(
      <LoadingButton loading={false} onClick={onClick}>
        Submit
      </LoadingButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should have type button by default", () => {
    render(<LoadingButton loading={false}>Submit</LoadingButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("should accept submit type", () => {
    render(
      <LoadingButton loading={false} type="submit">
        Submit
      </LoadingButton>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("should hide children text when loading", () => {
    render(<LoadingButton loading={true}>Submit</LoadingButton>);
    const textSpan = screen.getByText("Submit");
    expect(textSpan.className).toContain("opacity-0");
  });
});

describe("ProgressBar (from Loading)", () => {
  it("should render with progressbar role", () => {
    render(<ProgressBar progress={50} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
  });

  it("should set aria-valuenow based on progress", () => {
    render(<ProgressBar progress={75} />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "75");
  });

  it("should clamp progress between 0 and 100", () => {
    const { rerender } = render(<ProgressBar progress={150} />);
    let progressbar = screen.getByRole("progressbar");
    // Width is clamped to 100%
    const innerBar = progressbar.firstChild as HTMLElement;
    expect(innerBar.style.width).toBe("100%");

    rerender(<ProgressBar progress={-20} />);
    progressbar = screen.getByRole("progressbar");
    const innerBar2 = progressbar.firstChild as HTMLElement;
    expect(innerBar2.style.width).toBe("0%");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ProgressBar progress={50} className="my-bar" />,
    );
    expect(container.querySelector(".my-bar")).toBeInTheDocument();
  });
});
