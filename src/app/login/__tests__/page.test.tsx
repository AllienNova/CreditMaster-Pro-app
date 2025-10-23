import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../page';

// Mock Supabase
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockPush = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the login page', () => {
    render(<LoginPage />);
    expect(screen.getByText('Agentic Credit Repair')).toBeInTheDocument();
  });

  it('should display the tagline', () => {
    render(<LoginPage />);
    expect(screen.getByText('AI-Powered Credit Repair Platform')).toBeInTheDocument();
  });

  it('should display email and password inputs', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('should display sign in button by default', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should display welcome back heading for sign in', () => {
    render(<LoginPage />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('should have email label', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('should have password label', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should update email input value', () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('you@example.com') as HTMLInputElement;
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  it('should update password input value', () => {
    render(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    expect(passwordInput.value).toBe('password123');
  });

  it('should have required attribute on email input', () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput).toHaveAttribute('required');
  });

  it('should have required attribute on password input', () => {
    render(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('should have minLength attribute on password input', () => {
    render(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('minLength', '6');
  });

  it('should have email type on email input', () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should have password type on password input', () => {
    render(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

