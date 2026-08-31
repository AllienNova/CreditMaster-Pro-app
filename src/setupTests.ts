import '@testing-library/jest-dom';
import 'openai/shims/node';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.AIML_API_KEY = 'test-aiml-key';
process.env.AIML_API_URL = 'https://api.aimlapi.com/v1';

// Mock fetch for Node environment
global.fetch = jest.fn() as jest.Mock;
