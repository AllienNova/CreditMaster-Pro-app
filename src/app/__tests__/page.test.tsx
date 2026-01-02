import { render, screen } from '@testing-library/react';
import HomePage from '../page';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe('HomePage', () => {
  it('should render the home page', () => {
    render(<HomePage />);
    expect(document.body).toBeInTheDocument();
  });

  it('should display the hero heading', () => {
    render(<HomePage />);
    expect(screen.getByText(/Financial Intelligence/i)).toBeInTheDocument();
  });

  it('should display credit intelligence text', () => {
    render(<HomePage />);
    expect(screen.getAllByText(/Credit Intelligence/i).length).toBeGreaterThan(0);
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

