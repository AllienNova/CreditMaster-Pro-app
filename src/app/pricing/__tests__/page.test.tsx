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
    expect(screen.getByText(/Choose Your Credit Intelligence Plan/i)).toBeInTheDocument();
  });

  it('should display all three pricing tiers', () => {
    render(<PricingPage />);
    expect(screen.getByText('Essential✨')).toBeInTheDocument();
    expect(screen.getByText('Pro 🚀')).toBeInTheDocument();
    expect(screen.getByText('Elite 🏆')).toBeInTheDocument();
  });

  it('should display pricing information', () => {
    render(<PricingPage />);
    expect(screen.getByText(/\$49/)).toBeInTheDocument();
    expect(screen.getByText(/\$99/)).toBeInTheDocument();
    expect(screen.getByText(/\$199/)).toBeInTheDocument();
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

  it('should have Get Started buttons for each tier', () => {
    render(<PricingPage />);
    const buttons = screen.getAllByText('Get Started');
    expect(buttons.length).toBe(3);
  });
});

