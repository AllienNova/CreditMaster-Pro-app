import { render, screen } from '@testing-library/react';
import StudentLoanAgentPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/student-loan-agent',
}));

describe('StudentLoanAgentPage', () => {
  it('should render the student loan agent page', () => {
    render(<StudentLoanAgentPage />);
    expect(screen.getByText(/Student Loan AI Agent/i)).toBeInTheDocument();
  });

  it('should display the federal integration feature', () => {
    render(<StudentLoanAgentPage />);
    expect(screen.getByText(/Federal Integration/i)).toBeInTheDocument();
  });

  it('should display the AI agent description', () => {
    render(<StudentLoanAgentPage />);
    expect(screen.getByText(/Specialized AI-powered assistance/i)).toBeInTheDocument();
  });
});

