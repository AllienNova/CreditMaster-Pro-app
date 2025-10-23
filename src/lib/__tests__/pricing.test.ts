import { pricingTiers } from '../pricing';

describe('pricingTiers', () => {
  it('should have at least one pricing tier', () => {
    expect(pricingTiers.length).toBeGreaterThan(0);
  });

  it('should have a name, price, and features for each tier', () => {
    pricingTiers.forEach(tier => {
      expect(tier.name).toBeDefined();
      expect(tier.price).toBeDefined();
      expect(tier.features).toBeDefined();
      expect(Array.isArray(tier.features)).toBe(true);
    });
  });
});

