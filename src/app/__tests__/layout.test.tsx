import { metadata } from '../layout';

describe('RootLayout', () => {
  it('should have correct metadata title', () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe('CreditMaster Pro - AI-Powered Credit Intelligence Platform');
  });

  it('should have correct metadata description', () => {
    expect(metadata.description).toBe('Transform your credit with AI-powered tools and strategies. Generate dispute letters, analyze credit reports, optimize utilization, and access 300+ AI models for personalized credit guidance. Available nationwide.');
  });

  it('metadata should be an object', () => {
    expect(typeof metadata).toBe('object');
  });

  it('metadata should have title and description properties', () => {
    expect(metadata).toHaveProperty('title');
    expect(metadata).toHaveProperty('description');
  });
});

