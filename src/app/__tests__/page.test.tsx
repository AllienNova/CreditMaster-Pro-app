import { render, screen } from '@testing-library/react';
import HomePage from '../page';

// Mock the Layout component
jest.mock('@/components/Layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="layout">{children}</div>;
  };
});

describe('HomePage', () => {
  it('should render the home page', () => {
    render(<HomePage />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should display the welcome heading', () => {
    render(<HomePage />);
    expect(screen.getByText('Welcome to Agentic Credit Repair')).toBeInTheDocument();
  });

  it('should display the tagline', () => {
    render(<HomePage />);
    expect(screen.getByText('Your AI-powered solution for credit repair.')).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    render(<HomePage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Welcome to Agentic Credit Repair');
  });

  it('should render content within Layout', () => {
    render(<HomePage />);
    const layout = screen.getByTestId('layout');
    expect(layout).toContainElement(screen.getByText('Welcome to Agentic Credit Repair'));
  });
});

