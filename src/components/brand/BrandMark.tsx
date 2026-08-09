import Image from 'next/image';
import { BrandMarkVariant, getBrandAsset } from './registry';

export interface BrandMarkProps {
  variant?: BrandMarkVariant;
  /** Display height in pixels. Width is computed from aspect ratio. */
  height?: number;
  /** Optional className override */
  className?: string;
  /** For decorative use (alt=""). Default: false. */
  decorative?: boolean;
  /** Loading priority — true for above-the-fold logos */
  priority?: boolean;
}

export function BrandMark({
  variant = 'horizontal',
  height = 40,
  className,
  decorative = false,
  priority = false,
}: BrandMarkProps) {
  const asset = getBrandAsset(variant);
  const width = Math.round(height * asset.aspect);
  return (
    <Image
      src={asset.src}
      alt={decorative ? '' : asset.alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}

BrandMark.displayName = 'BrandMark';
