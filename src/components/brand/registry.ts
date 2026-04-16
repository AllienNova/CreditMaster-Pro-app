export type BrandMarkVariant =
  | 'horizontal'
  | 'vertical'
  | 'mark'
  | 'mark-mono-navy'
  | 'reversed'
  | 'wordmark'
  | 'app-icon';

export interface BrandAsset {
  variant: BrandMarkVariant;
  src: string;
  alt: string;
  /** Intrinsic aspect ratio (width / height) */
  aspect: number;
  /** Recommended minimum display size in pixels */
  minSize: number;
  /** Whether this variant is suitable for small (< 64px) display */
  smallSafe: boolean;
}

export const BRAND_ASSETS: Record<BrandMarkVariant, BrandAsset> = {
  horizontal:       { variant: 'horizontal',       src: '/brand/fynvita-horizontal.png',       alt: 'Fynvita', aspect: 2816 / 1536, minSize: 120, smallSafe: false },
  vertical:         { variant: 'vertical',         src: '/brand/fynvita-vertical.png',         alt: 'Fynvita', aspect: 1.0,          minSize: 120, smallSafe: false },
  mark:             { variant: 'mark',             src: '/brand/fynvita-mark.png',             alt: 'Fynvita', aspect: 1.0,          minSize: 32,  smallSafe: true  },
  'mark-mono-navy': { variant: 'mark-mono-navy',   src: '/brand/fynvita-mark-mono-navy.png',   alt: 'Fynvita', aspect: 1.0,          minSize: 32,  smallSafe: true  },
  reversed:         { variant: 'reversed',         src: '/brand/fynvita-reversed.png',         alt: 'Fynvita', aspect: 2816 / 1536, minSize: 120, smallSafe: false },
  wordmark:         { variant: 'wordmark',         src: '/brand/fynvita-wordmark.png',         alt: 'Fynvita', aspect: 1.0,          minSize: 80,  smallSafe: false },
  'app-icon':       { variant: 'app-icon',         src: '/brand/fynvita-app-icon.png',         alt: 'Fynvita', aspect: 1.0,          minSize: 32,  smallSafe: true  },
};

export function getBrandAsset(variant: BrandMarkVariant): BrandAsset {
  return BRAND_ASSETS[variant];
}
