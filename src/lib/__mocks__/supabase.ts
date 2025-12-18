/**
 * Mock Supabase Client for Testing
 */

const createMockChain = () => {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'order',
    'limit',
    'range',
    'in',
    'is',
    'insert',
    'update',
    'delete',
    'upsert',
  ];

  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain);
  });

  chain.single = jest.fn(() => Promise.resolve({ data: null, error: null }));

  // Make it thenable for await
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve);

  return chain;
};

export const supabase = {
  from: jest.fn(() => createMockChain()),
  auth: {
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
};

export default supabase;

