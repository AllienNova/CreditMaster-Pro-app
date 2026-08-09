/**
 * A/B Testing Framework
 *
 * Feature flag experiments with variant assignment and tracking
 */

import { createClient } from "@supabase/supabase-js";

// Experiment types
export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  targetPercentage: number; // 0-100
  status: "draft" | "running" | "paused" | "completed";
  startDate?: string;
  endDate?: string;
  targetAudience?: AudienceFilter;
}

export interface Variant {
  id: string;
  name: string;
  weight: number; // 0-100, must sum to 100
  config?: Record<string, any>;
}

export interface AudienceFilter {
  plans?: string[];
  countries?: string[];
  signupDateAfter?: string;
  signupDateBefore?: string;
  hasCompletedOnboarding?: boolean;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  userId: string;
  assignedAt: string;
}

// In-memory cache for experiments
const experimentsCache: Map<string, Experiment> = new Map();
let cacheExpiry = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Load experiments from database
 */
async function loadExperiments(): Promise<void> {
  if (Date.now() < cacheExpiry) return;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("status", "running");

  if (error) {
    // ABTesting error: Failed to load experiments
    return;
  }

  experimentsCache.clear();
  data?.forEach((exp) => experimentsCache.set(exp.id, exp));
  cacheExpiry = Date.now() + CACHE_TTL;
}

/**
 * Get variant assignment for a user
 */
export async function getVariant(
  experimentId: string,
  userId: string,
): Promise<Variant | null> {
  await loadExperiments();

  const experiment = experimentsCache.get(experimentId);
  if (!experiment || experiment.status !== "running") {
    return null;
  }

  const supabase = getSupabaseClient();

  // Check for existing assignment
  const { data: existing } = await supabase
    .from("experiment_assignments")
    .select("variant_id")
    .eq("experiment_id", experimentId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return (
      experiment.variants.find((v) => v.id === existing.variant_id) || null
    );
  }

  // Assign new variant
  const variant = assignVariant(experiment, userId);
  if (!variant) return null;

  // Store assignment
  await supabase.from("experiment_assignments").insert({
    experiment_id: experimentId,
    variant_id: variant.id,
    user_id: userId,
    assigned_at: new Date().toISOString(),
  });

  return variant;
}

/**
 * Assign variant based on weights
 */
function assignVariant(experiment: Experiment, userId: string): Variant | null {
  // Check if user is in target percentage
  const hash = hashString(`${experiment.id}:${userId}`);
  const bucket = hash % 100;

  if (bucket >= experiment.targetPercentage) {
    return null; // User not in experiment
  }

  // Assign variant based on weights
  const variantBucket = hashString(`${experiment.id}:${userId}:variant`) % 100;
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (variantBucket < cumulative) {
      return variant;
    }
  }

  return experiment.variants[0];
}

/**
 * Simple hash function for consistent assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Track experiment conversion
 */
export async function trackConversion(
  experimentId: string,
  userId: string,
  eventName: string,
  value?: number,
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from("experiment_conversions").insert({
    experiment_id: experimentId,
    user_id: userId,
    event_name: eventName,
    value,
    created_at: new Date().toISOString(),
  });
}

/**
 * Check if feature is enabled for user
 */
export async function isFeatureEnabled(
  featureKey: string,
  userId: string,
  defaultValue = false,
): Promise<boolean> {
  const variant = await getVariant(featureKey, userId);
  return variant?.config?.enabled ?? defaultValue;
}

/**
 * Get feature config for user
 */
export async function getFeatureConfig<T>(
  featureKey: string,
  userId: string,
  defaultConfig: T,
): Promise<T> {
  const variant = await getVariant(featureKey, userId);
  return (variant?.config as T) ?? defaultConfig;
}
