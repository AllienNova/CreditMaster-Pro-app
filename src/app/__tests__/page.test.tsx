import { render, screen } from '@testing-library/react';
import HomePage from '../page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock the Header component since it uses client-side hooks
jest.mock('@/components/ui/Header', () => {
  return function MockHeader() {
    return <nav data-testid="header">Mock Header</nav>;
  };
});

describe('HomePage', () => {
  it('should render the home page', () => {
    render(<HomePage />);
    expect(document.body).toBeInTheDocument();
  });

  it('should display the hero heading', () => {
    render(<HomePage />);
    // Updated to match new Fynvita branding - may appear multiple times
    expect(screen.getAllByText(/The Only Platform That/i).length).toBeGreaterThan(0);
  });

  it('should display financial life text', () => {
    render(<HomePage />);
    // Updated to match new branding - "Unifies Your Financial Life"
    expect(screen.getAllByText(/Financial Life/i).length).toBeGreaterThan(0);
  });

  it('should have proper heading hierarchy', () => {
    render(<HomePage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it('should render CTA buttons', () => {
    render(<HomePage />);
    expect(screen.getAllByText(/Get Started/i).length).toBeGreaterThan(0);
  });
});

