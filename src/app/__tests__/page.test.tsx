import { render, screen } from '@testing-library/react';
import HomePage from '../page';

describe('HomePage', () => {
  it('should render the home page', () => {
    render(<HomePage />);
    const elements = screen.getAllByText(/Transform Your Credit/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should display the main heading', () => {
    render(<HomePage />);
    expect(screen.getByText(/Transform Your Credit with/i)).toBeInTheDocument();
    expect(screen.getByText(/AI-Powered Intelligence/i)).toBeInTheDocument();
  });

  it('should display the tagline', () => {
    render(<HomePage />);
    expect(screen.getByText(/Advanced credit intelligence platform powered by 300\+ AI models/i)).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    render(<HomePage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/Transform Your Credit/i);
  });

  it('should have Get Started button', () => {
    render(<HomePage />);
    const buttons = screen.getAllByText('Get Started');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

