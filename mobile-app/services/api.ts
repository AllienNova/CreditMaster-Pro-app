import { supabase } from '../src/services/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.Fynvita.pro';

// Generic API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.message || 'Request failed' };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Network error' };
  }
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error: error?.message || null };
  },
  
  register: async (email: string, password: string, metadata: { firstName: string; lastName: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    return { data, error: error?.message || null };
  },
  
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  },
  
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message || null };
  },
};

// Credit Scores API
export const creditAPI = {
  getScores: () => apiRequest<{ scores: any[] }>('/api/credit/scores'),
  
  getReports: () => apiRequest<{ reports: any[] }>('/api/credit/reports'),
  
  getReport: (id: string) => apiRequest<{ report: any }>(`/api/credit/reports/${id}`),
  
  uploadReport: async (file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append('file', file as any);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${API_BASE_URL}/api/credit/reports/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      return { data: null, error: 'Upload failed' };
    }
    
    return { data: await response.json(), error: null };
  },
  
  analyzeReport: (reportId: string) => 
    apiRequest<{ analysis: any }>('/api/credit/analyze', {
      method: 'POST',
      body: JSON.stringify({ reportId }),
    }),
};

// Dispute Template and Strategy Types
export interface DisputeTemplate {
  id: string;
  name: string;
  category: string;
  scenario: string;
  successRate: number;
  tone: 'formal' | 'humble' | 'assertive' | 'legal';
  letterText: string;
  requiredDocuments: string[];
  placeholders: string[];
  bestPractices: string[];
  whenToUse: string[];
  whenNotToUse: string[];
}

export interface DisputeStrategy {
  id: string;
  name: string;
  description: string;
  successRate: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  riskLevel: 'low' | 'medium' | 'high';
  timeline: string;
  legalBasis: string[];
  steps: { step: number; title: string; description: string }[];
  expectedOutcomes: { outcome: string; probability: number }[];
  whenToUse: string[];
  whenNotToUse: string[];
}

export interface StrategyRecommendation {
  strategy: DisputeStrategy;
  score: number;
  reason: string;
}

// Disputes API
export const disputesAPI = {
  getAll: () => apiRequest<{ disputes: any[] }>('/api/disputes'),

  getById: (id: string) => apiRequest<{ dispute: any }>(`/api/disputes/${id}`),

  create: (dispute: { bureau: string; type: string; creditor: string; reason: string }) =>
    apiRequest<{ dispute: any }>('/api/disputes', {
      method: 'POST',
      body: JSON.stringify(dispute),
    }),

  update: (id: string, updates: Partial<any>) =>
    apiRequest<{ dispute: any }>(`/api/disputes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  // AI-powered letter generation
  generateLetter: (disputeId: string) =>
    apiRequest<{ letter: string }>('/api/disputes/generate', {
      method: 'POST',
      body: JSON.stringify({ mode: 'ai', disputeId }),
    }),

  // Template-based letter generation
  generateFromTemplate: (
    templateId: string,
    placeholders: Record<string, string>
  ) =>
    apiRequest<{ letter: string; template: DisputeTemplate }>('/api/disputes/generate', {
      method: 'POST',
      body: JSON.stringify({ mode: 'template', templateId, placeholders }),
    }),

  // Strategy-based letter generation
  generateFromStrategy: (
    strategyId: string,
    variables: Record<string, string>
  ) =>
    apiRequest<{ letter: string; strategy: DisputeStrategy; nextSteps: string[] }>(
      '/api/disputes/generate',
      {
        method: 'POST',
        body: JSON.stringify({ mode: 'strategy', strategyId, variables }),
      }
    ),

  // Get strategy recommendations based on scenario
  getStrategyRecommendations: (scenario: {
    disputeType: string;
    previousAttempts?: number;
    hasEvidence?: boolean;
    accountAge?: number;
    isCollection?: boolean;
    hasRelationship?: boolean;
  }) =>
    apiRequest<{ recommendations: StrategyRecommendation[] }>('/api/disputes/generate', {
      method: 'POST',
      body: JSON.stringify({ mode: 'strategy', scenario }),
    }),

  // Get all available templates
  getTemplates: () => apiRequest<{ templates: DisputeTemplate[] }>('/api/disputes/templates'),

  // Get templates by category
  getTemplatesByCategory: (category: string) =>
    apiRequest<{ templates: DisputeTemplate[] }>(`/api/disputes/templates?category=${category}`),

  // Get single template by ID
  getTemplate: (templateId: string) =>
    apiRequest<{ template: DisputeTemplate }>(`/api/disputes/templates/${templateId}`),

  // Get all available strategies
  getStrategies: () => apiRequest<{ strategies: DisputeStrategy[] }>('/api/disputes/strategies'),

  // Get strategies by difficulty
  getStrategiesByDifficulty: (difficulty: string) =>
    apiRequest<{ strategies: DisputeStrategy[] }>(`/api/disputes/strategies?difficulty=${difficulty}`),

  // Get single strategy by ID
  getStrategy: (strategyId: string) =>
    apiRequest<{ strategy: DisputeStrategy }>(`/api/disputes/strategies/${strategyId}`),
};

// Student Loans API
export const loansAPI = {
  getAll: () => apiRequest<{ loans: any[] }>('/api/student-loans'),
  
  getPrograms: () => apiRequest<{ programs: any[] }>('/api/federal-programs'),
  
  calculateStrategy: (data: { loans: any[]; income: number; filingStatus: string }) =>
    apiRequest<{ strategy: any }>('/api/student-loans/strategy', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => apiRequest<{ notifications: any[] }>('/api/notifications'),
  
  markAsRead: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),
  
  updatePreferences: (preferences: any) =>
    apiRequest<{ preferences: any }>('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),
};

// Subscription API
export const subscriptionAPI = {
  getCurrent: () => apiRequest<{ subscription: any }>('/api/subscription'),
  
  getPlans: () => apiRequest<{ plans: any[] }>('/api/subscription/plans'),
  
  createCheckout: (priceId: string) =>
    apiRequest<{ url: string }>('/api/payment/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    }),
  
  cancel: () => apiRequest<{ success: boolean }>('/api/subscription/cancel', { method: 'POST' }),
};

// AI Chat API
export const chatAPI = {
  sendMessage: (message: string, context?: any) =>
    apiRequest<{ response: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    }),
};

