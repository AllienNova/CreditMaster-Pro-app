import { render, screen } from '@testing-library/react';
import PricingPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/pricing',
}));

describe('PricingPage', () => {
  it('should render the pricing page', () => {
    render(<PricingPage />);
    expect(screen.getByText(/Choose Your AI Credit Repair Plan/i)).toBeInTheDocument();
  });

  it('should display all three pricing tiers', () => {
    render(<PricingPage />);
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('should display pricing information', () => {
    render(<PricingPage />);
    // Prices appear in both the price display and button text
    expect(screen.getAllByText(/\$29/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$79/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$199/).length).toBeGreaterThan(0);
  });

  it('should highlight the Pro tier as popular', () => {
    render(<PricingPage />);
    const popularBadges = screen.getAllByText('Most Popular');
    expect(popularBadges.length).toBeGreaterThan(0);
  });

  it('should display features for each tier', () => {
    render(<PricingPage />);
    expect(screen.getAllByText(/AI-powered credit analysis/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Student loan/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Federal/i).length).toBeGreaterThan(0);
  });

  it('should have Subscribe buttons for each tier', () => {
    render(<PricingPage />);
    const buttons = screen.getAllByRole('button', { name: /Subscribe to/i });
    expect(buttons.length).toBe(3);
  });
});

