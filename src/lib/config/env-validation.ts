/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at application startup
 * to prevent runtime errors and security misconfigurations.
 *
 * Uses Zod for declarative schema validation with fail-fast behavior
 * that reports ALL validation errors at once.
 */

import crypto from "crypto";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Zod preprocessor that coerces string env var values to booleans.
 * - "true" (case-insensitive) -> true
 * - anything else / undefined / empty -> falls through to default
 */
const booleanFromEnv = (defaultValue: boolean) =>
	z.preprocess((val) => {
		if (
			val === undefined ||
			val === null ||
			(typeof val === "string" && val.trim() === "")
		) {
			return defaultValue;
		}
		if (typeof val === "string") {
			return val.toLowerCase() === "true";
		}
		return val;
	}, z.boolean());

/**
 * Zod preprocessor that treats empty strings as undefined,
 * allowing `.default()` to kick in.
 */
const optionalStringWithDefault = (defaultValue: string) =>
	z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().default(defaultValue),
	);

/**
 * Zod preprocessor for optional string fields with no default.
 * Empty strings are coerced to undefined.
 */
const optionalString = () =>
	z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().optional(),
	);

/**
 * Zod preprocessor for optional URL fields with a default value.
 * Empty strings fall through to the default, then validated as URL.
 */
const optionalUrlWithDefault = (defaultValue: string) =>
	z.preprocess(
		(val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
		z.string().url(`Must be a valid URL`).default(defaultValue),
	);

/**
 * Encryption key: optional, but when present must be >= 32 characters (AES-256).
 */
const encryptionKeySchema = z.preprocess((val) => {
	if (
		val === undefined ||
		val === null ||
		(typeof val === "string" && val.trim() === "")
	) {
		return undefined;
	}
	return val;
}, z
	.string()
	.min(32, "Encryption key must be at least 32 characters long")
	.optional());

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
	// -- AIML API ---------------------------------------------------------------
	AIML_API_KEY: z
		.string()
		.min(1, "Missing required environment variable: AIML_API_KEY"),
	AIML_BASE_URL: optionalUrlWithDefault("https://api.aimlapi.com/v1"),
	AIML_DEFAULT_CHAT_MODEL: optionalStringWithDefault(
		"anthropic/claude-4.5-sonnet",
	),
	AIML_REASONING_MODEL: optionalStringWithDefault("deepseek/deepseek-r1"),
	AIML_FAST_MODEL: optionalStringWithDefault("openai/gpt-4o-mini"),
	AIML_IMAGE_MODEL: optionalStringWithDefault("flux-pro"),
	AIML_VOICE_MODEL: optionalStringWithDefault("tts-1-hd"),

	// -- Direct AI Providers (optional — AIML API is the catch-all fallback) ------
	OPENAI_API_KEY: optionalString(),
	OPENAI_BASE_URL: optionalUrlWithDefault("https://api.openai.com/v1"),
	OPENAI_DEFAULT_MODEL: optionalStringWithDefault("gpt-4o"),

	ANTHROPIC_API_KEY: optionalString(),
	ANTHROPIC_BASE_URL: optionalString(),

	GOOGLE_API_KEY: optionalString(),
	GOOGLE_DEFAULT_MODEL: optionalStringWithDefault(
		"gemini-2.5-pro-preview-03-25",
	),

	DEEPSEEK_API_KEY: optionalString(),
	DEEPSEEK_BASE_URL: optionalUrlWithDefault("https://api.deepseek.com/v1"),
	DEEPSEEK_DEFAULT_MODEL: optionalStringWithDefault("deepseek-chat"),

	MISTRAL_API_KEY: optionalString(),
	MISTRAL_BASE_URL: optionalUrlWithDefault("https://api.mistral.ai/v1"),
	MISTRAL_DEFAULT_MODEL: optionalStringWithDefault("mistral-large-latest"),

	// -- Supabase ---------------------------------------------------------------
	NEXT_PUBLIC_SUPABASE_URL: z
		.string()
		.min(1, "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
		.url("Invalid URL for NEXT_PUBLIC_SUPABASE_URL"),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z
		.string()
		.trim()
		.min(
			1,
			"Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
		),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

	// -- Application ------------------------------------------------------------
	NEXT_PUBLIC_APP_URL: optionalUrlWithDefault("http://localhost:3000"),
	NODE_ENV: optionalStringWithDefault("development"),

	// -- Feature Flags ----------------------------------------------------------
	ENABLE_MULTI_MODEL: booleanFromEnv(true),
	ENABLE_VOICE_ASSISTANT: booleanFromEnv(true),
	ENABLE_IMAGE_GENERATION: booleanFromEnv(true),
	ENABLE_SEMANTIC_SEARCH: booleanFromEnv(true),

	// -- Encryption -------------------------------------------------------------
	ENCRYPTION_KEY: encryptionKeySchema,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw parsed environment (matches schema keys). */
type ParsedEnv = z.infer<typeof envSchema>;

/**
 * Public-facing config interface.
 * Uses camelCase field names for ergonomic access in application code.
 * This preserves backward compatibility with the previous manual API.
 */
export interface EnvConfig {
	// AIML API
	aimlApiKey: string;
	aimlBaseUrl: string;
	aimlDefaultChatModel: string;
	aimlReasoningModel: string;
	aimlFastModel: string;
	aimlImageModel: string;
	aimlVoiceModel: string;

	// Supabase
	supabaseUrl: string;
	supabaseAnonKey: string;
	supabaseServiceRoleKey?: string;

	// Application
	appUrl: string;
	nodeEnv: string;

	// Feature Flags
	enableMultiModel: boolean;
	enableVoiceAssistant: boolean;
	enableImageGeneration: boolean;
	enableSemanticSearch: boolean;

	// Encryption
	encryptionKey?: string;

	// Direct AI Providers (optional)
	openaiApiKey?: string;
	openaiBaseUrl: string;
	openaiDefaultModel: string;

	anthropicApiKey?: string;
	anthropicBaseUrl?: string;

	googleApiKey?: string;
	googleDefaultModel: string;

	deepseekApiKey?: string;
	deepseekBaseUrl: string;
	deepseekDefaultModel: string;

	mistralApiKey?: string;
	mistralBaseUrl: string;
	mistralDefaultModel: string;
}

// ---------------------------------------------------------------------------
// Secret Rotation & Env Drift Types
// ---------------------------------------------------------------------------

/**
 * Critical secrets that are tracked for rotation detection.
 * When any of these change between validations, a rotation event is detected.
 */
export const CRITICAL_SECRETS = [
	"AIML_API_KEY",
	"SUPABASE_SERVICE_ROLE_KEY",
	"ENCRYPTION_KEY",
	"STRIPE_SECRET_KEY",
] as const;

export type CriticalSecretName = (typeof CRITICAL_SECRETS)[number];

/** Result of a secret rotation check. */
export interface SecretRotationResult {
	/** Whether any secrets have changed since initialization. */
	rotated: boolean;
	/** Names of secrets that changed. */
	changedSecrets: CriticalSecretName[];
	/** Names of secrets that were added (absent at init, now present). */
	addedSecrets: CriticalSecretName[];
	/** Names of secrets that were removed (present at init, now absent). */
	removedSecrets: CriticalSecretName[];
}

/** Result of an env drift check. */
export interface EnvDriftResult {
	/** Whether any drift was detected. */
	drifted: boolean;
	/** Environment variable names that are new since startup. */
	added: string[];
	/** Environment variable names whose values changed since startup. */
	changed: string[];
	/** Environment variable names that were removed since startup. */
	removed: string[];
}

/** Result of the environment initialization. */
export interface InitResult {
	/** The validated environment config. */
	config: EnvConfig;
	/** Number of critical secrets that were hashed and recorded. */
	trackedSecrets: number;
	/** Number of environment variables captured in the snapshot. */
	snapshotSize: number;
}

// ---------------------------------------------------------------------------
// Internal State for Rotation & Drift Detection
// ---------------------------------------------------------------------------

/** SHA-256 hashes of critical secrets, recorded at initialization. */
let secretHashes: Map<CriticalSecretName, string> | null = null;

/** Snapshot of all env var keys and their SHA-256 hashes at initialization. */
let envSnapshot: Map<string, string> | null = null;

/** Whether initializeEnvironment() has been called. */
let initialized = false;

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * Validation errors
 */
export class EnvValidationError extends Error {
	constructor(public errors: string[]) {
		super(`Environment validation failed:\n${errors.join("\n")}`);
		this.name = "EnvValidationError";
	}
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/**
 * Map raw parsed env object to the public camelCase EnvConfig shape.
 */
function toEnvConfig(parsed: ParsedEnv): EnvConfig {
	return {
		aimlApiKey: parsed.AIML_API_KEY,
		aimlBaseUrl: parsed.AIML_BASE_URL,
		aimlDefaultChatModel: parsed.AIML_DEFAULT_CHAT_MODEL,
		aimlReasoningModel: parsed.AIML_REASONING_MODEL,
		aimlFastModel: parsed.AIML_FAST_MODEL,
		aimlImageModel: parsed.AIML_IMAGE_MODEL,
		aimlVoiceModel: parsed.AIML_VOICE_MODEL,
		supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL,
		supabaseAnonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
		appUrl: parsed.NEXT_PUBLIC_APP_URL,
		nodeEnv: parsed.NODE_ENV,
		enableMultiModel: parsed.ENABLE_MULTI_MODEL,
		enableVoiceAssistant: parsed.ENABLE_VOICE_ASSISTANT,
		enableImageGeneration: parsed.ENABLE_IMAGE_GENERATION,
		enableSemanticSearch: parsed.ENABLE_SEMANTIC_SEARCH,
		encryptionKey: parsed.ENCRYPTION_KEY,

		openaiApiKey: parsed.OPENAI_API_KEY,
		openaiBaseUrl: parsed.OPENAI_BASE_URL,
		openaiDefaultModel: parsed.OPENAI_DEFAULT_MODEL,

		anthropicApiKey: parsed.ANTHROPIC_API_KEY,
		anthropicBaseUrl: parsed.ANTHROPIC_BASE_URL,

		googleApiKey: parsed.GOOGLE_API_KEY,
		googleDefaultModel: parsed.GOOGLE_DEFAULT_MODEL,

		deepseekApiKey: parsed.DEEPSEEK_API_KEY,
		deepseekBaseUrl: parsed.DEEPSEEK_BASE_URL,
		deepseekDefaultModel: parsed.DEEPSEEK_DEFAULT_MODEL,

		mistralApiKey: parsed.MISTRAL_API_KEY,
		mistralBaseUrl: parsed.MISTRAL_BASE_URL,
		mistralDefaultModel: parsed.MISTRAL_DEFAULT_MODEL,
	};
}

// ---------------------------------------------------------------------------
// Production-specific refinements
// ---------------------------------------------------------------------------

/**
 * Additional production-environment checks that go beyond simple field
 * validation: cross-field constraints that only apply when NODE_ENV=production.
 */
function validateProductionConstraints(config: EnvConfig): string[] {
	const errors: string[] = [];

	if (config.nodeEnv !== "production") {
		return errors;
	}

	if (config.appUrl.includes("localhost")) {
		errors.push("NEXT_PUBLIC_APP_URL must not be localhost in production");
	}

	if (!config.encryptionKey) {
		errors.push("ENCRYPTION_KEY is required in production");
	}

	if (!config.supabaseServiceRoleKey) {
		errors.push("SUPABASE_SERVICE_ROLE_KEY is required in production");
	}

	return errors;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate all environment variables.
 *
 * Uses Zod safeParse so ALL validation errors are collected and reported
 * at once (fail-fast with complete diagnostics).
 */
export function validateEnv(): EnvConfig {
	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		const errors = result.error.issues.map(
			(issue) => `  ${issue.path.join(".")}: ${issue.message}`,
		);
		throw new EnvValidationError(errors);
	}

	const config = toEnvConfig(result.data);

	// Production cross-field constraints
	const productionErrors = validateProductionConstraints(config);
	if (productionErrors.length > 0) {
		throw new EnvValidationError(productionErrors);
	}

	return config;
}

/**
 * Get validated environment configuration.
 * Caches the result after first validation.
 */
let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
	if (!cachedConfig) {
		cachedConfig = validateEnv();
	}
	return cachedConfig;
}

/**
 * Reset the cached config. Primarily for testing.
 * @internal
 */
export function _resetConfigCache(): void {
	cachedConfig = null;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
	return getEnvConfig().nodeEnv === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
	return getEnvConfig().nodeEnv === "development";
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
	return getEnvConfig().nodeEnv === "test";
}

// ---------------------------------------------------------------------------
// Secret Hashing
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hash of a string value.
 * Used to track secret values without storing them in plaintext.
 */
function hashValue(value: string): string {
	return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Record SHA-256 hashes of all critical secrets currently present in process.env.
 * Secrets that are not set are simply omitted from the map.
 */
function captureSecretHashes(): Map<CriticalSecretName, string> {
	const hashes = new Map<CriticalSecretName, string>();
	for (const name of CRITICAL_SECRETS) {
		const value = process.env[name];
		if (value !== undefined && value !== "") {
			hashes.set(name, hashValue(value));
		}
	}
	return hashes;
}

/**
 * Capture a snapshot of all current environment variable keys and hashed values.
 * Values are hashed so the snapshot does not store secrets in plaintext.
 */
function captureEnvSnapshot(): Map<string, string> {
	const snapshot = new Map<string, string>();
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) {
			snapshot.set(key, hashValue(value));
		}
	}
	return snapshot;
}

// ---------------------------------------------------------------------------
// Secret Rotation Detection
// ---------------------------------------------------------------------------

/**
 * Detect whether any critical secrets have been rotated (changed, added, or
 * removed) since `initializeEnvironment()` was called.
 *
 * Throws if the environment has not been initialized yet.
 */
export function detectSecretRotation(): SecretRotationResult {
	if (!secretHashes) {
		throw new Error(
			"Environment not initialized. Call initializeEnvironment() first.",
		);
	}

	const changedSecrets: CriticalSecretName[] = [];
	const addedSecrets: CriticalSecretName[] = [];
	const removedSecrets: CriticalSecretName[] = [];

	for (const name of CRITICAL_SECRETS) {
		const currentValue = process.env[name];
		const previousHash = secretHashes.get(name);
		const currentlyPresent = currentValue !== undefined && currentValue !== "";
		const previouslyPresent = previousHash !== undefined;

		if (currentlyPresent && !previouslyPresent) {
			addedSecrets.push(name);
		} else if (!currentlyPresent && previouslyPresent) {
			removedSecrets.push(name);
		} else if (currentlyPresent && previouslyPresent) {
			const currentHash = hashValue(currentValue);
			if (currentHash !== previousHash) {
				changedSecrets.push(name);
			}
		}
	}

	const rotated =
		changedSecrets.length > 0 ||
		addedSecrets.length > 0 ||
		removedSecrets.length > 0;

	return { rotated, changedSecrets, addedSecrets, removedSecrets };
}

// ---------------------------------------------------------------------------
// Env Drift Detection
// ---------------------------------------------------------------------------

/**
 * Detect environment variable drift — variables that have been added, changed,
 * or removed since `initializeEnvironment()` was called.
 *
 * Throws if the environment has not been initialized yet.
 */
export function detectEnvDrift(): EnvDriftResult {
	if (!envSnapshot) {
		throw new Error(
			"Environment not initialized. Call initializeEnvironment() first.",
		);
	}

	const added: string[] = [];
	const changed: string[] = [];
	const removed: string[] = [];

	// Check for new or changed vars
	for (const [key, value] of Object.entries(process.env)) {
		if (value === undefined) continue;
		const currentHash = hashValue(value);
		const previousHash = envSnapshot.get(key);

		if (previousHash === undefined) {
			added.push(key);
		} else if (currentHash !== previousHash) {
			changed.push(key);
		}
	}

	// Check for removed vars
	for (const key of envSnapshot.keys()) {
		if (process.env[key] === undefined) {
			removed.push(key);
		}
	}

	const drifted = added.length > 0 || changed.length > 0 || removed.length > 0;

	return { drifted, added, changed, removed };
}

// ---------------------------------------------------------------------------
// Startup Guard
// ---------------------------------------------------------------------------

/**
 * Initialize the environment: validate all env vars, record secret hashes,
 * and capture the env snapshot for drift detection.
 *
 * Should be called once at application startup. Subsequent calls re-initialize
 * (useful after configuration changes or in tests).
 */
export function initializeEnvironment(): InitResult {
	// 1. Validate (throws EnvValidationError on failure — fail-fast)
	const config = validateEnv();

	// 2. Record secret hashes for rotation detection
	secretHashes = captureSecretHashes();

	// 3. Capture full env snapshot for drift detection
	envSnapshot = captureEnvSnapshot();

	// 4. Cache the config
	cachedConfig = config;
	initialized = true;

	return {
		config,
		trackedSecrets: secretHashes.size,
		snapshotSize: envSnapshot.size,
	};
}

/**
 * Check whether the environment has been initialized.
 */
export function isInitialized(): boolean {
	return initialized;
}

/**
 * Reset all internal state (config cache, secret hashes, env snapshot).
 * Primarily for testing.
 * @internal
 */
export function _resetAll(): void {
	cachedConfig = null;
	secretHashes = null;
	envSnapshot = null;
	initialized = false;
}

// Export the schema for advanced use-cases (e.g., tooling, CI checks)
export { envSchema };
