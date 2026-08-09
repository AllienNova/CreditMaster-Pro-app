/**
 * Tests for LoadingSkeleton and PulseLoader components.
 *
 * Spinner was consolidated into Loading.tsx (ARCH C-1) and is re-exported from
 * LoadingSkeleton.tsx for back-compat. Its tests now live in Loading.test.tsx.
 */

import { render } from "@testing-library/react";
import LoadingSkeleton, { PulseLoader } from "../LoadingSkeleton";

describe("LoadingSkeleton", () => {
  it("should render text variant by default", () => {
    const { container } = render(<LoadingSkeleton />);
    const pulse = container.querySelector(".animate-pulse");
    expect(pulse).toBeInTheDocument();
  });

  it("should render single line for text variant by default", () => {
    const { container } = render(<LoadingSkeleton variant="text" />);
    const lines = container.querySelectorAll(".h-4.bg-gray-200");
    expect(lines).toHaveLength(1);
  });

  it("should render multiple lines for text variant with count", () => {
    const { container } = render(
      <LoadingSkeleton variant="text" count={4} />,
    );
    const lines = container.querySelectorAll(".h-4.bg-gray-200");
    expect(lines).toHaveLength(4);
  });

  it("should render card variant", () => {
    const { container } = render(<LoadingSkeleton variant="card" count={2} />);
    const cards = container.querySelectorAll(".shadow-lg.p-6");
    expect(cards).toHaveLength(2);
  });

  it("should render avatar variant with circle and text lines", () => {
    const { container } = render(<LoadingSkeleton variant="avatar" />);
    const circle = container.querySelector(".rounded-full");
    expect(circle).toBeInTheDocument();
  });

  it("should render button variant", () => {
    const { container } = render(
      <LoadingSkeleton variant="button" count={3} />,
    );
    const buttons = container.querySelectorAll(".h-10.rounded-lg");
    expect(buttons).toHaveLength(3);
  });

  it("should render table variant with header and rows", () => {
    const { container } = render(
      <LoadingSkeleton variant="table" count={3} />,
    );
    // Should have a header row + data rows
    const header = container.querySelector(".bg-gray-50");
    expect(header).toBeInTheDocument();
    // Data rows
    const rows = container.querySelectorAll(".px-6.py-4");
    expect(rows).toHaveLength(3);
  });

  it("should render dashboard variant with metrics and content", () => {
    const { container } = render(<LoadingSkeleton variant="dashboard" />);
    // Dashboard has a grid of 4 metric cards
    const metricCards = container.querySelectorAll(
      ".grid .shadow-lg.p-6",
    );
    expect(metricCards).toHaveLength(4);
  });

  it("should apply custom className", () => {
    const { container } = render(
      <LoadingSkeleton variant="text" className="custom-skeleton" />,
    );
    expect(container.querySelector(".custom-skeleton")).toBeInTheDocument();
  });
});

describe("PulseLoader", () => {
  it("should render 3 pulse dots", () => {
    const { container } = render(<PulseLoader />);
    const dots = container.querySelectorAll(".bg-blue-500.rounded-full");
    expect(dots).toHaveLength(3);
  });

  it("should apply default medium size", () => {
    const { container } = render(<PulseLoader />);
    const dots = container.querySelectorAll(".h-8.w-8");
    expect(dots).toHaveLength(3);
  });

  it("should apply small size", () => {
    const { container } = render(<PulseLoader size="sm" />);
    const dots = container.querySelectorAll(".h-4.w-4");
    expect(dots).toHaveLength(3);
  });

  it("should apply large size", () => {
    const { container } = render(<PulseLoader size="lg" />);
    const dots = container.querySelectorAll(".h-12.w-12");
    expect(dots).toHaveLength(3);
  });

  it("should have staggered animation delays", () => {
    const { container } = render(<PulseLoader />);
    const dots = container.querySelectorAll(".bg-blue-500.rounded-full");
    expect((dots[0] as HTMLElement).style.animationDelay).toBe("0ms");
    expect((dots[1] as HTMLElement).style.animationDelay).toBe("150ms");
    expect((dots[2] as HTMLElement).style.animationDelay).toBe("300ms");
  });
});

// Spinner tests moved to Loading.test.tsx (ARCH C-1 consolidation)
