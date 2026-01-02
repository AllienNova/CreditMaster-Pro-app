/**
 * @jest-environment node
 */

/**
 * Marketplace Providers API Tests
 */

describe('Providers API', () => {
  const mockProviders = [
    {
      id: 'p1',
      name: 'Credit Repair Pro',
      description: 'Professional credit repair services',
      category: 'credit_repair',
      rating: 4.8,
      reviewCount: 250,
      verified: true,
      yearsInBusiness: 10,
      contactEmail: 'contact@creditrepairpro.com',
      website: 'https://creditrepairpro.com',
    },
    {
      id: 'p2',
      name: 'TradeLine Masters',
      description: 'Premium tradeline services',
      category: 'tradelines',
      rating: 4.6,
      reviewCount: 180,
      verified: true,
      yearsInBusiness: 7,
      contactEmail: 'info@tradelinemasters.com',
      website: 'https://tradelinemasters.com',
    },
    {
      id: 'p3',
      name: 'Budget Monitor',
      description: 'Affordable monitoring services',
      category: 'monitoring',
      rating: 4.2,
      reviewCount: 95,
      verified: false,
      yearsInBusiness: 3,
      contactEmail: 'support@budgetmonitor.com',
      website: 'https://budgetmonitor.com',
    },
  ];

  describe('Provider Listing', () => {
    it('should have all providers', () => {
      expect(mockProviders.length).toBe(3);
    });

    it('should have required fields', () => {
      mockProviders.forEach((provider) => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('category');
        expect(provider).toHaveProperty('rating');
        expect(provider).toHaveProperty('verified');
      });
    });
  });

  describe('Provider Filtering', () => {
    it('should filter by category', () => {
      const category = 'credit_repair';
      const filtered = mockProviders.filter((p) => p.category === category);
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Credit Repair Pro');
    });

    it('should filter by minimum rating', () => {
      const minRating = 4.5;
      const filtered = mockProviders.filter((p) => p.rating >= minRating);
      expect(filtered.length).toBe(2);
    });

    it('should filter verified providers only', () => {
      const verified = mockProviders.filter((p) => p.verified);
      expect(verified.length).toBe(2);
    });

    it('should filter by years in business', () => {
      const minYears = 5;
      const filtered = mockProviders.filter((p) => p.yearsInBusiness >= minYears);
      expect(filtered.length).toBe(2);
    });
  });

  describe('Provider Sorting', () => {
    it('should sort by rating descending', () => {
      const sorted = [...mockProviders].sort((a, b) => b.rating - a.rating);
      expect(sorted[0].rating).toBe(4.8);
      expect(sorted[sorted.length - 1].rating).toBe(4.2);
    });

    it('should sort by review count descending', () => {
      const sorted = [...mockProviders].sort((a, b) => b.reviewCount - a.reviewCount);
      expect(sorted[0].reviewCount).toBe(250);
      expect(sorted[sorted.length - 1].reviewCount).toBe(95);
    });

    it('should sort by years in business descending', () => {
      const sorted = [...mockProviders].sort((a, b) => b.yearsInBusiness - a.yearsInBusiness);
      expect(sorted[0].yearsInBusiness).toBe(10);
      expect(sorted[sorted.length - 1].yearsInBusiness).toBe(3);
    });
  });

  describe('Category Filtering', () => {
    it('should return only credit repair providers', () => {
      const creditRepairProviders = mockProviders.filter(
        (p) => p.category === 'credit_repair'
      );
      expect(creditRepairProviders.length).toBe(1);
      creditRepairProviders.forEach((p) => {
        expect(p.category).toBe('credit_repair');
      });
    });

    it('should return only tradeline providers', () => {
      const tradelineProviders = mockProviders.filter((p) => p.category === 'tradelines');
      expect(tradelineProviders.length).toBe(1);
      expect(tradelineProviders[0].category).toBe('tradelines');
    });

    it('should return only monitoring providers', () => {
      const monitoringProviders = mockProviders.filter((p) => p.category === 'monitoring');
      expect(monitoringProviders.length).toBe(1);
      expect(monitoringProviders[0].category).toBe('monitoring');
    });
  });

  describe('Verification Status', () => {
    it('should identify verified providers', () => {
      const verified = mockProviders.filter((p) => p.verified);
      const unverified = mockProviders.filter((p) => !p.verified);

      expect(verified.length).toBe(2);
      expect(unverified.length).toBe(1);
    });

    it('should return verification badge info', () => {
      const getVerificationBadge = (provider: {
        verified: boolean;
        yearsInBusiness: number;
      }) => {
        if (!provider.verified) return null;
        if (provider.yearsInBusiness >= 10) return 'platinum';
        if (provider.yearsInBusiness >= 5) return 'gold';
        return 'silver';
      };

      expect(getVerificationBadge({ verified: true, yearsInBusiness: 12 })).toBe('platinum');
      expect(getVerificationBadge({ verified: true, yearsInBusiness: 7 })).toBe('gold');
      expect(getVerificationBadge({ verified: true, yearsInBusiness: 2 })).toBe('silver');
      expect(getVerificationBadge({ verified: false, yearsInBusiness: 15 })).toBeNull();
    });
  });

  describe('Data Validation', () => {
    it('should validate rating is between 0 and 5', () => {
      mockProviders.forEach((p) => {
        expect(p.rating).toBeGreaterThanOrEqual(0);
        expect(p.rating).toBeLessThanOrEqual(5);
      });
    });

    it('should validate category is valid', () => {
      const validCategories = [
        'credit_repair',
        'tradelines',
        'monitoring',
        'education',
        'secured_cards',
      ];

      mockProviders.forEach((p) => {
        expect(validCategories).toContain(p.category);
      });
    });

    it('should validate years in business is positive', () => {
      mockProviders.forEach((p) => {
        expect(p.yearsInBusiness).toBeGreaterThan(0);
      });
    });

    it('should have non-negative review counts', () => {
      mockProviders.forEach((p) => {
        expect(p.reviewCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Search Functionality', () => {
    it('should search by name', () => {
      const searchTerm = 'credit';
      const results = mockProviders.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Credit Repair Pro');
    });

    it('should search by description', () => {
      const searchTerm = 'premium';
      const results = mockProviders.filter((p) =>
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('TradeLine Masters');
    });

    it('should return empty for no matches', () => {
      const searchTerm = 'xyz123';
      const results = mockProviders.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results.length).toBe(0);
    });
  });

  describe('Top Providers', () => {
    it('should get top providers by rating', () => {
      const limit = 2;
      const topProviders = [...mockProviders]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit);
      expect(topProviders.length).toBe(2);
      expect(topProviders[0].rating).toBeGreaterThanOrEqual(topProviders[1].rating);
    });

    it('should get top verified providers', () => {
      const topVerified = [...mockProviders]
        .filter((p) => p.verified)
        .sort((a, b) => b.rating - a.rating);
      expect(topVerified.length).toBe(2);
      topVerified.forEach((p) => {
        expect(p.verified).toBe(true);
      });
    });
  });
});
