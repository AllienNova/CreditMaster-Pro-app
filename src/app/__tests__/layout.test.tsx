import { metadata } from '../layout';

describe('RootLayout', () => {
  it('should have correct metadata title', () => {
    expect(metadata).toBeDefined();
    expect(metadata.title).toBe(
      'CPFI - Credit Master Pro Financial Intelligence'
    );
  });

  it('should have correct metadata description', () => {
    expect(metadata.description).toBe(
      'AI-powered credit repair and financial management platform'
    );
  });

  it('metadata should be an object', () => {
    expect(typeof metadata).toBe('object');
  });

  it('metadata should have title and description properties', () => {
    expect(metadata).toHaveProperty('title');
    expect(metadata).toHaveProperty('description');
  });

  it('metadata should have metadataBase', () => {
    expect(metadata).toHaveProperty('metadataBase');
  });
});
