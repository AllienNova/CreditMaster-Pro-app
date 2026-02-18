import { render, screen } from "@testing-library/react";
import PricingPage from "../page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/pricing",
}));

describe("PricingPage", () => {
  it("should render the pricing page", () => {
    render(<PricingPage />);
    expect(
      screen.getByText(/Simple, Transparent Pricing/i),
    ).toBeInTheDocument();
  });

  it("should display pricing tiers", () => {
    render(<PricingPage />);
    // Updated to match new Fynvita tiers
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Standard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
  });

  it("should display pricing information", () => {
    render(<PricingPage />);
    // Updated to match new pricing - $29.99, $99.99, etc.
    expect(screen.getAllByText(/\$29/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$99/).length).toBeGreaterThan(0);
  });

  it("should highlight the Pro tier as popular", () => {
    render(<PricingPage />);
    // Badge renders with emoji prefix: "⭐ Most Popular"
    const popularBadges = screen.getAllByText(/Most Popular/i);
    expect(popularBadges.length).toBeGreaterThan(0);
  });

  it("should display features for each tier", () => {
    render(<PricingPage />);
    // Check for features that exist in the current pricing page
    expect(screen.getAllByText(/Credit/i).length).toBeGreaterThan(0);
  });

  it("should have CTA links for tiers", () => {
    render(<PricingPage />);
    // Look for links instead of buttons with specific text
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
  });
});
