export interface RegulationSummary {
  name?: string;
  summary?: string;
  link?: string;
  [key: string]: unknown;
}

export interface StrategySummary {
  name: string;
  description: string;
  regulation: RegulationSummary;
  priority?: "low" | "medium" | "high";
  complexity?: "low" | "medium" | "high";
}

export interface OnboardingAnalysis {
  defaultStatus: boolean;
  uploadedFiles: string[];
}
