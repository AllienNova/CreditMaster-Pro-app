import { supabase } from "./supabase";
import type {
  Dispute,
  Document,
  Notification,
  CreditScore,
  StudentLoan,
  ApiResponse,
} from "../types";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://Fynvita.pro/api";

// Generic fetch wrapper with auth
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Request failed" };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Credit Score APIs
export const creditScoreApi = {
  getScores: () => fetchWithAuth<CreditScore[]>("/credit-builder/score"),
  getHistory: (months: number = 6) =>
    fetchWithAuth<CreditScore[]>(
      `/credit-builder/score/history?months=${months}`,
    ),
  getFactors: () =>
    fetchWithAuth<{ factor: string; impact: number; status: string }[]>(
      "/credit-builder/score/factors",
    ),
};

// Dispute APIs
export const disputeApi = {
  getAll: () => fetchWithAuth<Dispute[]>("/disputes"),
  getById: (id: string) => fetchWithAuth<Dispute>(`/disputes/${id}`),
  create: (dispute: Partial<Dispute>) =>
    fetchWithAuth<Dispute>("/disputes", {
      method: "POST",
      body: JSON.stringify(dispute),
    }),
  update: (id: string, updates: Partial<Dispute>) =>
    fetchWithAuth<Dispute>(`/disputes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  delete: (id: string) =>
    fetchWithAuth<void>(`/disputes/${id}`, { method: "DELETE" }),
  generateLetter: (id: string) =>
    fetchWithAuth<{ letter: string }>(`/disputes/${id}/generate-letter`),
  getTemplates: () =>
    fetchWithAuth<{ id: string; name: string; category: string }[]>(
      "/disputes/templates",
    ),
};

// Document APIs
export const documentApi = {
  getAll: () => fetchWithAuth<Document[]>("/documents"),
  getById: (id: string) => fetchWithAuth<Document>(`/documents/${id}`),
  upload: async (file: { uri: string; name: string; type: string }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: formData,
    });
    return response.json();
  },
  analyze: (id: string) =>
    fetchWithAuth<Document>(`/documents/${id}/analyze`, { method: "POST" }),
  delete: (id: string) =>
    fetchWithAuth<void>(`/documents/${id}`, { method: "DELETE" }),
};

// Notification APIs
export const notificationApi = {
  getAll: () => fetchWithAuth<Notification[]>("/notifications"),
  markAsRead: (id: string) =>
    fetchWithAuth<void>(`/notifications/${id}/read`, { method: "POST" }),
  markAllAsRead: () =>
    fetchWithAuth<void>("/notifications/read-all", { method: "POST" }),
  getPreferences: () =>
    fetchWithAuth<Record<string, boolean>>("/notifications/preferences"),
  updatePreferences: (prefs: Record<string, boolean>) =>
    fetchWithAuth<void>("/notifications/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    }),
};

// Student Loan APIs
export const studentLoanApi = {
  getAll: () => fetchWithAuth<StudentLoan[]>("/student-loans"),
  getById: (id: string) => fetchWithAuth<StudentLoan>(`/student-loans/${id}`),
  getPrograms: () =>
    fetchWithAuth<{ id: string; name: string; description: string }[]>(
      "/federal-programs",
    ),
  getStrategy: () =>
    fetchWithAuth<{ recommendations: string[] }>("/student-loans/strategy"),
};

// Analytics APIs
export const analyticsApi = {
  getDashboard: () =>
    fetchWithAuth<{
      scoreHistory: CreditScore[];
      disputeStats: { total: number; resolved: number; pending: number };
      recentActivity: { type: string; description: string; date: string }[];
    }>("/user/analytics"),
  trackEvent: (event: string, data?: Record<string, unknown>) =>
    fetchWithAuth<void>("/analytics/track", {
      method: "POST",
      body: JSON.stringify({ event, data }),
    }),
};

// User APIs
export const userApi = {
  getProfile: () =>
    fetchWithAuth<{ name: string; email: string; avatar_url?: string }>(
      "/user/profile",
    ),
  updateProfile: (updates: { name?: string; avatar_url?: string }) =>
    fetchWithAuth<void>("/user/profile", {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  getSubscription: () =>
    fetchWithAuth<{ plan: string; status: string; expires_at: string }>(
      "/user/subscription",
    ),
};
