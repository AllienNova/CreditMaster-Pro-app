/**
 * Tests for Skeleton Components (Skeleton, CardSkeleton, TableRowSkeleton,
 * DashboardSkeleton, ProfileSkeleton, ListSkeleton, FormSkeleton,
 * AssetAllocationSkeleton, MetricCardSkeleton, ChartSkeleton)
 */

import { render, screen } from "@testing-library/react";
import {
  Skeleton,
  CardSkeleton,
  TableRowSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
  ListSkeleton,
  FormSkeleton,
  AssetAllocationSkeleton,
  MetricCardSkeleton,
  ChartSkeleton,
} from "../Skeleton";

describe("Skeleton (base)", () => {
  it("should render with default text variant", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("rounded");
    expect(div.className).toContain("animate-pulse");
  });

  it("should render with circular variant", () => {
    const { container } = render(<Skeleton variant="circular" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("rounded-full");
  });

  it("should render with rectangular variant", () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    const div = container.firstChild as HTMLElement;
    // Rectangular has no border-radius class
    expect(div.className).not.toContain("rounded-full");
    expect(div.className).not.toContain("rounded-lg");
  });

  it("should render with rounded variant", () => {
    const { container } = render(<Skeleton variant="rounded" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("rounded-lg");
  });

  it("should apply pulse animation by default", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("animate-pulse");
  });

  it("should apply wave animation", () => {
    const { container } = render(<Skeleton animation="wave" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("animate-shimmer");
  });

  it("should apply no animation when none", () => {
    const { container } = render(<Skeleton animation="none" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain("animate-pulse");
    expect(div.className).not.toContain("animate-shimmer");
  });

  it("should set width and height via style", () => {
    const { container } = render(
      <Skeleton variant="circular" width={48} height={48} />,
    );
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("48px");
    expect(div.style.height).toBe("48px");
  });

  it("should set string width and height", () => {
    const { container } = render(
      <Skeleton variant="rectangular" width="100%" height="200px" />,
    );
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("100%");
    expect(div.style.height).toBe("200px");
  });

  it("should have aria-hidden attribute", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div).toHaveAttribute("aria-hidden", "true");
  });

  it("should apply custom className", () => {
    const { container } = render(<Skeleton className="my-skeleton" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("my-skeleton");
  });
});

describe("CardSkeleton", () => {
  it("should render skeleton card with skeleton elements", () => {
    const { container } = render(<CardSkeleton />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should apply custom className", () => {
    const { container } = render(<CardSkeleton className="custom-card" />);
    expect(container.querySelector(".custom-card")).toBeInTheDocument();
  });
});

describe("TableRowSkeleton", () => {
  it("should render 4 columns by default", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton />
        </tbody>
      </table>,
    );
    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(4);
  });

  it("should render custom number of columns", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton columns={6} />
        </tbody>
      </table>,
    );
    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(6);
  });
});

describe("DashboardSkeleton", () => {
  it("should render skeleton dashboard structure", () => {
    const { container } = render(<DashboardSkeleton />);
    // Should have multiple skeleton elements
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it("should render 4 card skeletons in stats grid", () => {
    const { container } = render(<DashboardSkeleton />);
    // DashboardSkeleton uses CardSkeleton which has specific structure
    const cards = container.querySelectorAll(".rounded-xl.shadow-sm");
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });
});

describe("ProfileSkeleton", () => {
  it("should render profile skeleton with avatar area", () => {
    const { container } = render(<ProfileSkeleton />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(3);
  });

  it("should have animate-pulse class", () => {
    const { container } = render(<ProfileSkeleton />);
    const animated = container.querySelector(".animate-pulse");
    expect(animated).toBeInTheDocument();
  });
});

describe("ListSkeleton", () => {
  it("should render 5 items by default", () => {
    const { container } = render(<ListSkeleton />);
    const items = container.querySelectorAll(".rounded-lg.border");
    expect(items).toHaveLength(5);
  });

  it("should render custom number of items", () => {
    const { container } = render(<ListSkeleton items={3} />);
    const items = container.querySelectorAll(".rounded-lg.border");
    expect(items).toHaveLength(3);
  });
});

describe("FormSkeleton", () => {
  it("should render 4 field placeholders by default", () => {
    const { container } = render(<FormSkeleton />);
    // Each field has a label skeleton + input skeleton = 2 per field, plus 1 button
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    // 4 fields * 2 skeletons + 1 button skeleton = 9
    expect(skeletons).toHaveLength(9);
  });

  it("should render custom number of fields", () => {
    const { container } = render(<FormSkeleton fields={2} />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    // 2 fields * 2 + 1 button = 5
    expect(skeletons).toHaveLength(5);
  });
});

describe("AssetAllocationSkeleton", () => {
  it("should render with status role", () => {
    render(<AssetAllocationSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute(
      "aria-label",
      "Loading asset allocation analysis",
    );
  });

  it("should render multiple sections", () => {
    const { container } = render(<AssetAllocationSkeleton />);
    const sections = container.querySelectorAll(".bg-gray-800.rounded-lg");
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });
});

describe("MetricCardSkeleton", () => {
  it("should render skeleton elements", () => {
    const { container } = render(<MetricCardSkeleton />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons).toHaveLength(3);
  });

  it("should apply custom className", () => {
    const { container } = render(
      <MetricCardSkeleton className="custom-metric" />,
    );
    expect(container.querySelector(".custom-metric")).toBeInTheDocument();
  });
});

describe("ChartSkeleton", () => {
  it("should render chart skeleton with title and chart area", () => {
    const { container } = render(<ChartSkeleton />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(3);
  });

  it("should apply custom className", () => {
    const { container } = render(<ChartSkeleton className="custom-chart" />);
    expect(container.querySelector(".custom-chart")).toBeInTheDocument();
  });

  it("should apply custom height to chart area", () => {
    const { container } = render(<ChartSkeleton height={400} />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    // The chart area skeleton should have height 400
    const chartArea = Array.from(skeletons).find(
      (s) => (s as HTMLElement).style.height === "400px",
    );
    expect(chartArea).toBeDefined();
  });
});
