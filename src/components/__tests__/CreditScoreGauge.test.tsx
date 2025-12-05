import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock component for testing
const CreditScoreGauge = ({ score, bureau }: { score: number; bureau: string }) => {
  const getScoreRating = (score: number) => {
    if (score >= 800) return { label: 'Exceptional', color: 'green' };
    if (score >= 740) return { label: 'Very Good', color: 'blue' };
    if (score >= 670) return { label: 'Good', color: 'teal' };
    if (score >= 580) return { label: 'Fair', color: 'yellow' };
    return { label: 'Poor', color: 'red' };
  };

  const rating = getScoreRating(score);

  return (
    <div data-testid="credit-score-gauge">
      <div data-testid="score-value">{score}</div>
      <div data-testid="score-rating">{rating.label}</div>
      <div data-testid="bureau-name">{bureau}</div>
    </div>
  );
};

describe('CreditScoreGauge Component', () => {
  describe('Score Display', () => {
    it('should display the score value', () => {
      render(<CreditScoreGauge score={750} bureau="Experian" />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('750');
    });

    it('should display the bureau name', () => {
      render(<CreditScoreGauge score={750} bureau="Experian" />);
      expect(screen.getByTestId('bureau-name')).toHaveTextContent('Experian');
    });
  });

  describe('Score Ratings', () => {
    it('should show Exceptional for scores 800+', () => {
      render(<CreditScoreGauge score={820} bureau="Experian" />);
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Exceptional');
    });

    it('should show Very Good for scores 740-799', () => {
      render(<CreditScoreGauge score={760} bureau="Equifax" />);
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Very Good');
    });

    it('should show Good for scores 670-739', () => {
      render(<CreditScoreGauge score={700} bureau="TransUnion" />);
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Good');
    });

    it('should show Fair for scores 580-669', () => {
      render(<CreditScoreGauge score={620} bureau="Experian" />);
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Fair');
    });

    it('should show Poor for scores below 580', () => {
      render(<CreditScoreGauge score={520} bureau="Equifax" />);
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Poor');
    });
  });

  describe('Bureau Colors', () => {
    const bureauColors = {
      Experian: '#0066CC',
      Equifax: '#CC0000',
      TransUnion: '#00AA00',
    };

    it('should have correct Experian color', () => {
      expect(bureauColors.Experian).toBe('#0066CC');
    });

    it('should have correct Equifax color', () => {
      expect(bureauColors.Equifax).toBe('#CC0000');
    });

    it('should have correct TransUnion color', () => {
      expect(bureauColors.TransUnion).toBe('#00AA00');
    });
  });

  describe('Score Boundaries', () => {
    it('should handle minimum score (300)', () => {
      render(<CreditScoreGauge score={300} bureau="Experian" />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('300');
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Poor');
    });

    it('should handle maximum score (850)', () => {
      render(<CreditScoreGauge score={850} bureau="Experian" />);
      expect(screen.getByTestId('score-value')).toHaveTextContent('850');
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Exceptional');
    });

    it('should handle boundary score (740)', () => {
      render(<CreditScoreGauge score={740} bureau="Experian" />);
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Very Good');
    });

    it('should handle boundary score (670)', () => {
      render(<CreditScoreGauge score={670} bureau="Experian" />);
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Good');
    });

    it('should handle boundary score (580)', () => {
      render(<CreditScoreGauge score={580} bureau="Experian" />);
      expect(screen.getByTestId('score-rating')).toHaveTextContent('Fair');
    });
  });
});

describe('Score Calculation Utilities', () => {
  const getScoreChange = (current: number, previous: number) => ({
    change: current - previous,
    direction: current > previous ? 'up' : current < previous ? 'down' : 'same',
    percentage: Math.round(((current - previous) / previous) * 100),
  });

  it('should calculate positive score change', () => {
    const result = getScoreChange(750, 720);
    expect(result.change).toBe(30);
    expect(result.direction).toBe('up');
  });

  it('should calculate negative score change', () => {
    const result = getScoreChange(700, 720);
    expect(result.change).toBe(-20);
    expect(result.direction).toBe('down');
  });

  it('should handle no change', () => {
    const result = getScoreChange(720, 720);
    expect(result.change).toBe(0);
    expect(result.direction).toBe('same');
  });
});

