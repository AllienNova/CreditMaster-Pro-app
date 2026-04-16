import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrandMark } from '../BrandMark';
import { BRAND_ASSETS, BrandMarkVariant } from '../registry';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
    priority,
    className,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    priority?: boolean;
    className?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      data-priority={priority ? 'true' : undefined}
    />
  ),
}));

const variants: BrandMarkVariant[] = [
  'horizontal',
  'vertical',
  'mark',
  'mark-mono-navy',
  'reversed',
  'wordmark',
  'app-icon',
];

describe('BrandMark', () => {
  it('renders with default variant (horizontal)', () => {
    render(<BrandMark />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/brand/fynvita-horizontal.png');
    expect(img).toHaveAttribute('alt', 'Fynvita');
  });

  it.each(variants)('renders variant "%s" without throwing', (variant) => {
    expect(() => render(<BrandMark variant={variant} />)).not.toThrow();
  });

  it('computes width from height × aspect ratio', () => {
    const height = 80;
    const asset = BRAND_ASSETS['horizontal'];
    const expectedWidth = Math.round(height * asset.aspect);
    render(<BrandMark variant="horizontal" height={height} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', String(expectedWidth));
    expect(img).toHaveAttribute('height', String(height));
  });

  it('sets alt="" when decorative is true', () => {
    const { container } = render(<BrandMark decorative />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
  });

  it('uses asset.alt when decorative is false (default)', () => {
    render(<BrandMark />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Fynvita');
  });

  it('applies custom className', () => {
    render(<BrandMark className="my-custom-class" />);
    const img = screen.getByRole('img');
    expect(img).toHaveClass('my-custom-class');
  });

  it('passes priority prop through to next/image', () => {
    render(<BrandMark priority />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-priority', 'true');
  });

  it('does not set data-priority when priority is false (default)', () => {
    render(<BrandMark />);
    const img = screen.getByRole('img');
    expect(img).not.toHaveAttribute('data-priority');
  });
});
