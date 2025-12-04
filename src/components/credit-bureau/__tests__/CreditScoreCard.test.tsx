import { render, screen } from '@testing-library/react';
import CreditScoreCard from '../CreditScoreCard';

describe('CreditScoreCard', () => {
  const mockProps = {
    score: 720,
    bureau: 'experian' as const,
    lastUpdated: new Date('2025-01-01'),
    previousScore: 680,
    factors: {
      positive: ['On-time payments', 'Low credit utilization'],
      negative: ['Recent hard inquiry', 'High balance on one card'],
    },
  };

  it('should render credit score', () => {
    render(<CreditScoreCard {...mockProps} />);
    expect(screen.getByText('720')).toBeInTheDocument();
  });

  it('should render bureau name', () => {
    render(<CreditScoreCard {...mockProps} />);
    expect(screen.getByText(/Experian/i)).toBeInTheDocument();
  });

  it('should render with previousScore', () => {
    render(<CreditScoreCard {...mockProps} />);
    expect(screen.getByText('720')).toBeInTheDocument();
  });

  it('should render without previousScore', () => {
    render(<CreditScoreCard {...mockProps} previousScore={undefined} />);
    expect(screen.getByText('720')).toBeInTheDocument();
  });

  it('should render with negative score change', () => {
    render(<CreditScoreCard {...mockProps} previousScore={750} />);
    expect(screen.getByText('720')).toBeInTheDocument();
  });

  it('should render with factors', () => {
    render(<CreditScoreCard {...mockProps} />);
    expect(screen.getByText('720')).toBeInTheDocument();
  });

  it('should render without factors', () => {
    render(<CreditScoreCard {...mockProps} factors={undefined} />);
    expect(screen.getByText('720')).toBeInTheDocument();
  });

  it('should render Equifax', () => {
    render(<CreditScoreCard {...mockProps} bureau="equifax" />);
    expect(screen.getByText(/Equifax/i)).toBeInTheDocument();
  });

  it('should render TransUnion', () => {
    render(<CreditScoreCard {...mockProps} bureau="transunion" />);
    expect(screen.getByText(/TransUnion/i)).toBeInTheDocument();
  });

  it('should render different score values', () => {
    const { rerender } = render(<CreditScoreCard {...mockProps} score={780} />);
    expect(screen.getByText('780')).toBeInTheDocument();

    rerender(<CreditScoreCard {...mockProps} score={670} />);
    expect(screen.getByText('670')).toBeInTheDocument();

    rerender(<CreditScoreCard {...mockProps} score={600} />);
    expect(screen.getByText('600')).toBeInTheDocument();
  });
});

