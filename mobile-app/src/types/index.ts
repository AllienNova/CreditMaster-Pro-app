// User types
export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  avatar_url?: string;
  subscription_tier: "free" | "basic" | "premium" | "enterprise";
  goals?: string[];
  created_at: string;
  updated_at: string;
}

// Credit Score types
export interface CreditScore {
  score: number;
  bureau: "experian" | "equifax" | "transunion";
  date: string;
  change?: number;
}

export interface CreditScoreHistory {
  scores: CreditScore[];
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  trend: "up" | "down" | "stable";
}

// Dispute types
export interface Dispute {
  id: string;
  user_id: string;
  bureau: "experian" | "equifax" | "transunion";
  status: "draft" | "sent" | "under_review" | "resolved" | "rejected";
  item_type: string;
  item_description: string;
  dispute_reason: string;
  letter_content?: string;
  created_at: string;
  updated_at: string;
  outcome?: "removed" | "updated" | "verified" | "pending";
  response_date?: string;
}

// Document types
export interface Document {
  id: string;
  user_id: string;
  name: string;
  type: "credit_report" | "dispute_response" | "identity" | "other";
  file_url: string;
  file_size: number;
  status: "processing" | "analyzed" | "error";
  uploaded_at: string;
  analysis_result?: DocumentAnalysis;
}

export interface DocumentAnalysis {
  bureau?: string;
  score?: number;
  accounts_count: number;
  disputable_items: number;
  recommendations: string[];
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type:
    | "dispute_update"
    | "score_change"
    | "document_processed"
    | "recommendation"
    | "payment"
    | "system";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// Subscription types
export interface Subscription {
  id: string;
  user_id: string;
  plan: "free" | "basic" | "premium" | "enterprise";
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

// Student Loan types
export interface StudentLoan {
  id: string;
  user_id: string;
  servicer: string;
  loan_type: "federal" | "private";
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  monthly_payment: number;
  status: "current" | "delinquent" | "default" | "forbearance" | "deferment";
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation types
export type RootStackParamList = {
  "(tabs)": undefined;
  login: undefined;
  register: undefined;
  onboarding: undefined;
  "dispute/[id]": { id: string };
  "document/[id]": { id: string };
  "notification/[id]": { id: string };
};

// Theme types
export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  accent: string;
  background: string;
  backgroundSecondary: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  borderDark: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  white: string;
  black: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
}

export interface ThemeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface Theme {
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  fontWeight: {
    normal: "400";
    medium: "500";
    semibold: "600";
    bold: "700";
  };
  shadow: {
    none: ThemeShadow;
    sm: ThemeShadow;
    md: ThemeShadow;
    lg: ThemeShadow;
  };
  iconSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}
