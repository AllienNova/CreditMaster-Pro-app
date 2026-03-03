/**
 * Tests for Zod-based environment variable validation.
 *
 * Covers:
 * - Happy path (all required vars set)
 * - Missing required variables
 * - Invalid URL formats
 * - Boolean coercion from string env vars
 * - Optional vars with defaults
 * - Encryption key length constraint
 * - Production cross-field constraints
 * - Fail-fast behavior (multiple errors at once)
 * - Caching behavior
 * - Convenience helpers (isProduction, isDevelopment, isTest)
 * - Schema export
 * - Secret rotation detection (SEC-01)
 * - Env drift detection (SEC-01)
 * - Startup guard / initializeEnvironment (SEC-01)
 * - CRITICAL_SECRETS constant (SEC-01)
 * - isInitialized helper (SEC-01)
 */

import {
  validateEnv,
  getEnvConfig,
  isProduction,
  isDevelopment,
  isTest,
  EnvValidationError,
  _resetConfigCache,
  _resetAll,
  envSchema,
  initializeEnvironment,
  detectSecretRotation,
  detectEnvDrift,
  isInitialized,
  CRITICAL_SECRETS,
} from "@/lib/config/env-validation";
import type {
  EnvConfig,
  SecretRotationResult,
  EnvDriftResult,
  InitResult,
} from "@/lib/config/env-validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Type-safe way to manipulate process.env in tests.
 * NODE_ENV is readonly in the TS types, so we cast through a mutable record.
 */
const env = process.env as Record<string, string | undefined>;

/** Minimal valid environment for non-production mode. */
function minimalValidEnv(): Record<string, string> {
  return {
    AIML_API_KEY: "test-aiml-key-12345",
    NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-67890",
  };
}

/** Full environment with every variable explicitly set. */
function fullValidEnv(): Record<string, string> {
  return {
    AIML_API_KEY: "test-aiml-key-12345",
    AIML_BASE_URL: "https://custom-aiml.example.com/v2",
    AIML_DEFAULT_CHAT_MODEL: "custom/chat-model",
    AIML_REASONING_MODEL: "custom/reasoning-model",
    AIML_FAST_MODEL: "custom/fast-model",
    AIML_IMAGE_MODEL: "custom-image-model",
    AIML_VOICE_MODEL: "custom-voice-model",
    NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-67890",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    NEXT_PUBLIC_APP_URL: "https://app.fynvita.com",
    NODE_ENV: "production",
    ENABLE_MULTI_MODEL: "false",
    ENABLE_VOICE_ASSISTANT: "false",
    ENABLE_IMAGE_GENERATION: "true",
    ENABLE_SEMANTIC_SEARCH: "false",
    ENCRYPTION_KEY: "a]3kF9$mPqL7xR2wN5vB8jH1cT6yU0sE", // 32 chars
  };
}

/**
 * Set up a fresh environment from the given base.
 * Replaces process.env entirely so that leftover keys from other tests
 * do not leak in.
 */
function setEnv(base: Record<string, string>): void {
  // Wipe process.env and populate from base
  for (const key of Object.keys(env)) {
    delete env[key];
  }
  Object.assign(env, base);
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

const originalEnv = { ...process.env };

beforeEach(() => {
  // Restore a copy of the original environment
  for (const key of Object.keys(env)) {
    delete env[key];
  }
  Object.assign(env, originalEnv);
  // Reset all internal state: config cache, secret hashes, env snapshot
  _resetAll();
});

afterAll(() => {
  for (const key of Object.keys(env)) {
    delete env[key];
  }
  Object.assign(env, originalEnv);
});

// ---------------------------------------------------------------------------
// 1. Happy Path
// ---------------------------------------------------------------------------

describe("validateEnv - happy path", () => {
  it("should return a valid EnvConfig with minimal required vars", () => {
    Object.assign(env, minimalValidEnv());

    const config = validateEnv();

    expect(config.aimlApiKey).toBe("test-aiml-key-12345");
    expect(config.supabaseUrl).toBe("https://abc.supabase.co");
    expect(config.supabaseAnonKey).toBe("test-anon-key-67890");
  });

  it("should apply default values for optional AIML vars", () => {
    Object.assign(env, minimalValidEnv());

    const config = validateEnv();

    expect(config.aimlBaseUrl).toBe("https://api.aimlapi.com/v1");
    expect(config.aimlDefaultChatModel).toBe("anthropic/claude-4.5-sonnet");
    expect(config.aimlReasoningModel).toBe("deepseek/deepseek-r1");
    expect(config.aimlFastModel).toBe("openai/gpt-4o-mini");
    expect(config.aimlImageModel).toBe("flux-pro");
    expect(config.aimlVoiceModel).toBe("tts-1-hd");
  });

  it("should apply default values for optional application vars", () => {
    setEnv(minimalValidEnv());

    const config = validateEnv();

    expect(config.appUrl).toBe("http://localhost:3000");
    expect(config.nodeEnv).toBe("development");
  });

  it("should apply default values for feature flags (all true)", () => {
    Object.assign(env, minimalValidEnv());

    const config = validateEnv();

    expect(config.enableMultiModel).toBe(true);
    expect(config.enableVoiceAssistant).toBe(true);
    expect(config.enableImageGeneration).toBe(true);
    expect(config.enableSemanticSearch).toBe(true);
  });

  it("should leave optional fields undefined when not set", () => {
    setEnv(minimalValidEnv());

    const config = validateEnv();

    expect(config.supabaseServiceRoleKey).toBeUndefined();
    expect(config.encryptionKey).toBeUndefined();
  });

  it("should return all fields when every env var is set", () => {
    Object.assign(env, fullValidEnv());

    const config = validateEnv();

    expect(config).toEqual<EnvConfig>({
      aimlApiKey: "test-aiml-key-12345",
      aimlBaseUrl: "https://custom-aiml.example.com/v2",
      aimlDefaultChatModel: "custom/chat-model",
      aimlReasoningModel: "custom/reasoning-model",
      aimlFastModel: "custom/fast-model",
      aimlImageModel: "custom-image-model",
      aimlVoiceModel: "custom-voice-model",
      supabaseUrl: "https://abc.supabase.co",
      supabaseAnonKey: "test-anon-key-67890",
      supabaseServiceRoleKey: "test-service-role-key",
      appUrl: "https://app.fynvita.com",
      nodeEnv: "production",
      enableMultiModel: false,
      enableVoiceAssistant: false,
      enableImageGeneration: true,
      enableSemanticSearch: false,
      encryptionKey: "a]3kF9$mPqL7xR2wN5vB8jH1cT6yU0sE",
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Missing Required Variables
// ---------------------------------------------------------------------------

describe("validateEnv - missing required variables", () => {
  it("should throw when AIML_API_KEY is missing", () => {
    Object.assign(env, minimalValidEnv());
    delete env.AIML_API_KEY;

    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    Object.assign(env, minimalValidEnv());
    delete env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    Object.assign(env, minimalValidEnv());
    delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("should throw when AIML_API_KEY is empty string", () => {
    Object.assign(env, minimalValidEnv());
    env.AIML_API_KEY = "";

    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("should throw when NEXT_PUBLIC_SUPABASE_ANON_KEY is whitespace", () => {
    Object.assign(env, minimalValidEnv());
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "   ";

    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("should include the variable name in the error message", () => {
    Object.assign(env, minimalValidEnv());
    delete env.AIML_API_KEY;

    try {
      validateEnv();
      fail("Expected EnvValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).message).toContain("AIML_API_KEY");
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Fail-Fast: Multiple Errors Reported at Once
// ---------------------------------------------------------------------------

describe("validateEnv - fail-fast with multiple errors", () => {
  it("should report all missing required vars at once", () => {
    // Wipe env and set only NODE_ENV so we stay in non-production
    setEnv({ NODE_ENV: "test" });

    try {
      validateEnv();
      fail("Expected EnvValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const err = error as EnvValidationError;
      // Should mention all three required vars
      expect(err.errors.length).toBeGreaterThanOrEqual(3);
      expect(err.message).toContain("AIML_API_KEY");
      expect(err.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(err.message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
  });

  it("should report both missing required and invalid URL in one throw", () => {
    setEnv({
      NODE_ENV: "test",
      AIML_API_KEY: "valid-key",
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      // NEXT_PUBLIC_SUPABASE_ANON_KEY is intentionally missing
    });

    try {
      validateEnv();
      fail("Expected EnvValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const err = error as EnvValidationError;
      expect(err.errors.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("should expose errors array on EnvValidationError", () => {
    setEnv({ NODE_ENV: "test" });

    try {
      validateEnv();
      fail("Expected EnvValidationError");
    } catch (error) {
      const err = error as EnvValidationError;
      expect(Array.isArray(err.errors)).toBe(true);
      expect(err.errors.every((e) => typeof e === "string")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Invalid URL Format
// ---------------------------------------------------------------------------

describe("validateEnv - invalid URLs", () => {
  it("should throw for invalid NEXT_PUBLIC_SUPABASE_URL", () => {
    Object.assign(env, minimalValidEnv());
    env.NEXT_PUBLIC_SUPABASE_URL = "not-a-valid-url";

    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("should throw for invalid AIML_BASE_URL", () => {
    Object.assign(env, minimalValidEnv());
    env.AIML_BASE_URL = "not a url at all";

    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("should throw for invalid NEXT_PUBLIC_APP_URL", () => {
    Object.assign(env, minimalValidEnv());
    env.NEXT_PUBLIC_APP_URL = "definitely not a url";

    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("should accept valid HTTPS URLs", () => {
    Object.assign(env, minimalValidEnv());
    env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";

    const config = validateEnv();
    expect(config.supabaseUrl).toBe("https://project-ref.supabase.co");
  });

  it("should accept valid HTTP URLs (for localhost dev)", () => {
    Object.assign(env, minimalValidEnv());
    env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const config = validateEnv();
    expect(config.appUrl).toBe("http://localhost:3000");
  });
});

// ---------------------------------------------------------------------------
// 5. Boolean Coercion from String
// ---------------------------------------------------------------------------

describe("validateEnv - boolean coercion", () => {
  it("should coerce 'true' to true", () => {
    Object.assign(env, minimalValidEnv());
    env.ENABLE_MULTI_MODEL = "true";

    const config = validateEnv();
    expect(config.enableMultiModel).toBe(true);
  });

  it("should coerce 'TRUE' to true (case-insensitive)", () => {
    Object.assign(env, minimalValidEnv());
    env.ENABLE_MULTI_MODEL = "TRUE";

    const config = validateEnv();
    expect(config.enableMultiModel).toBe(true);
  });

  it("should coerce 'True' to true (mixed case)", () => {
    Object.assign(env, minimalValidEnv());
    env.ENABLE_VOICE_ASSISTANT = "True";

    const config = validateEnv();
    expect(config.enableVoiceAssistant).toBe(true);
  });

  it("should coerce 'false' to false", () => {
    Object.assign(env, minimalValidEnv());
    env.ENABLE_MULTI_MODEL = "false";

    const config = validateEnv();
    expect(config.enableMultiModel).toBe(false);
  });

  it("should coerce 'FALSE' to false", () => {
    Object.assign(env, minimalValidEnv());
    env.ENABLE_IMAGE_GENERATION = "FALSE";

    const config = validateEnv();
    expect(config.enableImageGeneration).toBe(false);
  });

  it("should coerce any non-'true' string to false", () => {
    Object.assign(env, minimalValidEnv());
    env.ENABLE_SEMANTIC_SEARCH = "yes";

    const config = validateEnv();
    expect(config.enableSemanticSearch).toBe(false);
  });

  it("should default to true when boolean env var is empty string", () => {
    Object.assign(env, minimalValidEnv());
    env.ENABLE_MULTI_MODEL = "";

    const config = validateEnv();
    expect(config.enableMultiModel).toBe(true);
  });

  it("should default to true when boolean env var is not set", () => {
    Object.assign(env, minimalValidEnv());
    delete env.ENABLE_MULTI_MODEL;

    const config = validateEnv();
    expect(config.enableMultiModel).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Optional Vars with Defaults
// ---------------------------------------------------------------------------

describe("validateEnv - optional vars use defaults", () => {
  it("should use default AIML_BASE_URL when not set", () => {
    Object.assign(env, minimalValidEnv());
    delete env.AIML_BASE_URL;

    const config = validateEnv();
    expect(config.aimlBaseUrl).toBe("https://api.aimlapi.com/v1");
  });

  it("should use default AIML_BASE_URL when empty string", () => {
    Object.assign(env, minimalValidEnv());
    env.AIML_BASE_URL = "";

    const config = validateEnv();
    expect(config.aimlBaseUrl).toBe("https://api.aimlapi.com/v1");
  });

  it("should use custom AIML_BASE_URL when provided", () => {
    Object.assign(env, minimalValidEnv());
    env.AIML_BASE_URL = "https://custom.example.com/api";

    const config = validateEnv();
    expect(config.aimlBaseUrl).toBe("https://custom.example.com/api");
  });

  it("should use default NODE_ENV when not set", () => {
    Object.assign(env, minimalValidEnv());
    delete env.NODE_ENV;

    const config = validateEnv();
    expect(config.nodeEnv).toBe("development");
  });

  it("should use default NEXT_PUBLIC_APP_URL when empty", () => {
    Object.assign(env, minimalValidEnv());
    env.NEXT_PUBLIC_APP_URL = "";

    const config = validateEnv();
    expect(config.appUrl).toBe("http://localhost:3000");
  });

  it("should override defaults when custom values are provided", () => {
    Object.assign(env, minimalValidEnv());
    env.AIML_DEFAULT_CHAT_MODEL = "my-custom-model";
    env.AIML_REASONING_MODEL = "my-reasoning";
    env.AIML_FAST_MODEL = "my-fast";
    env.AIML_IMAGE_MODEL = "my-image";
    env.AIML_VOICE_MODEL = "my-voice";

    const config = validateEnv();
    expect(config.aimlDefaultChatModel).toBe("my-custom-model");
    expect(config.aimlReasoningModel).toBe("my-reasoning");
    expect(config.aimlFastModel).toBe("my-fast");
    expect(config.aimlImageModel).toBe("my-image");
    expect(config.aimlVoiceModel).toBe("my-voice");
  });
});

// ---------------------------------------------------------------------------
// 7. Encryption Key Validation
// ---------------------------------------------------------------------------

describe("validateEnv - encryption key", () => {
  it("should accept encryption key of exactly 32 characters", () => {
    Object.assign(env, minimalValidEnv());
    env.ENCRYPTION_KEY = "12345678901234567890123456789012"; // 32 chars

    const config = validateEnv();
    expect(config.encryptionKey).toBe("12345678901234567890123456789012");
  });

  it("should accept encryption key longer than 32 characters", () => {
    Object.assign(env, minimalValidEnv());
    env.ENCRYPTION_KEY = "1234567890123456789012345678901234567890"; // 40 chars

    const config = validateEnv();
    expect(config.encryptionKey).toHaveLength(40);
  });

  it("should throw for encryption key shorter than 32 characters", () => {
    Object.assign(env, minimalValidEnv());
    env.ENCRYPTION_KEY = "too-short";

    expect(() => validateEnv()).toThrow(EnvValidationError);
    try {
      validateEnv();
    } catch (error) {
      expect((error as EnvValidationError).message).toContain(
        "at least 32 characters",
      );
    }
  });

  it("should allow missing encryption key (optional)", () => {
    Object.assign(env, minimalValidEnv());
    delete env.ENCRYPTION_KEY;

    const config = validateEnv();
    expect(config.encryptionKey).toBeUndefined();
  });

  it("should treat empty string encryption key as undefined", () => {
    Object.assign(env, minimalValidEnv());
    env.ENCRYPTION_KEY = "";

    const config = validateEnv();
    expect(config.encryptionKey).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 8. Production Constraints
// ---------------------------------------------------------------------------

describe("validateEnv - production constraints", () => {
  it("should throw when appUrl is localhost in production", () => {
    Object.assign(env, fullValidEnv());
    env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    expect(() => validateEnv()).toThrow(EnvValidationError);
    try {
      validateEnv();
    } catch (error) {
      expect((error as EnvValidationError).message).toContain(
        "must not be localhost in production",
      );
    }
  });

  it("should throw when encryption key is missing in production", () => {
    Object.assign(env, fullValidEnv());
    delete env.ENCRYPTION_KEY;

    expect(() => validateEnv()).toThrow(EnvValidationError);
    try {
      validateEnv();
    } catch (error) {
      expect((error as EnvValidationError).message).toContain(
        "ENCRYPTION_KEY is required in production",
      );
    }
  });

  it("should throw when service role key is missing in production", () => {
    Object.assign(env, fullValidEnv());
    delete env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => validateEnv()).toThrow(EnvValidationError);
    try {
      validateEnv();
    } catch (error) {
      expect((error as EnvValidationError).message).toContain(
        "SUPABASE_SERVICE_ROLE_KEY is required in production",
      );
    }
  });

  it("should not enforce production constraints in development", () => {
    Object.assign(env, minimalValidEnv());
    env.NODE_ENV = "development";
    // No encryption key, no service role key, localhost URL -- all fine

    const config = validateEnv();
    expect(config.nodeEnv).toBe("development");
  });

  it("should not enforce production constraints in test", () => {
    Object.assign(env, minimalValidEnv());
    env.NODE_ENV = "test";

    const config = validateEnv();
    expect(config.nodeEnv).toBe("test");
  });

  it("should pass all production constraints when fully configured", () => {
    Object.assign(env, fullValidEnv());

    const config = validateEnv();
    expect(config.nodeEnv).toBe("production");
  });
});

// ---------------------------------------------------------------------------
// 9. Caching Behavior
// ---------------------------------------------------------------------------

describe("getEnvConfig - caching", () => {
  it("should cache the result after first call", () => {
    Object.assign(env, minimalValidEnv());

    const config1 = getEnvConfig();
    const config2 = getEnvConfig();

    expect(config1).toBe(config2); // Same reference
  });

  it("should return fresh config after cache reset", () => {
    Object.assign(env, minimalValidEnv());
    const config1 = getEnvConfig();

    _resetConfigCache();
    Object.assign(env, minimalValidEnv());
    env.AIML_DEFAULT_CHAT_MODEL = "changed-model";

    const config2 = getEnvConfig();

    expect(config1).not.toBe(config2);
    expect(config2.aimlDefaultChatModel).toBe("changed-model");
  });

  it("should return cached config even if env vars change without reset", () => {
    Object.assign(env, minimalValidEnv());
    const config1 = getEnvConfig();

    env.AIML_API_KEY = "changed-key";
    const config2 = getEnvConfig();

    expect(config2.aimlApiKey).toBe("test-aiml-key-12345"); // Still cached original
  });
});

// ---------------------------------------------------------------------------
// 10. Convenience Helpers
// ---------------------------------------------------------------------------

describe("convenience helpers", () => {
  it("isProduction returns true when NODE_ENV is production", () => {
    Object.assign(env, fullValidEnv());

    expect(isProduction()).toBe(true);
  });

  it("isProduction returns false when NODE_ENV is development", () => {
    Object.assign(env, minimalValidEnv());
    env.NODE_ENV = "development";

    expect(isProduction()).toBe(false);
  });

  it("isDevelopment returns true when NODE_ENV is development", () => {
    Object.assign(env, minimalValidEnv());
    env.NODE_ENV = "development";

    expect(isDevelopment()).toBe(true);
  });

  it("isDevelopment returns false when NODE_ENV is production", () => {
    Object.assign(env, fullValidEnv());

    expect(isDevelopment()).toBe(false);
  });

  it("isTest returns true when NODE_ENV is test", () => {
    Object.assign(env, minimalValidEnv());
    env.NODE_ENV = "test";

    expect(isTest()).toBe(true);
  });

  it("isTest returns false when NODE_ENV is development", () => {
    Object.assign(env, minimalValidEnv());
    env.NODE_ENV = "development";

    expect(isTest()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11. getEnvConfig Return Shape
// ---------------------------------------------------------------------------

describe("getEnvConfig - return shape", () => {
  it("should return an object with all expected keys", () => {
    Object.assign(env, minimalValidEnv());

    const config = getEnvConfig();
    const expectedKeys: (keyof EnvConfig)[] = [
      "aimlApiKey",
      "aimlBaseUrl",
      "aimlDefaultChatModel",
      "aimlReasoningModel",
      "aimlFastModel",
      "aimlImageModel",
      "aimlVoiceModel",
      "supabaseUrl",
      "supabaseAnonKey",
      "supabaseServiceRoleKey",
      "appUrl",
      "nodeEnv",
      "enableMultiModel",
      "enableVoiceAssistant",
      "enableImageGeneration",
      "enableSemanticSearch",
      "encryptionKey",
    ];

    for (const key of expectedKeys) {
      expect(config).toHaveProperty(key);
    }
  });

  it("should have string types for string fields", () => {
    Object.assign(env, minimalValidEnv());

    const config = getEnvConfig();
    expect(typeof config.aimlApiKey).toBe("string");
    expect(typeof config.aimlBaseUrl).toBe("string");
    expect(typeof config.supabaseUrl).toBe("string");
    expect(typeof config.supabaseAnonKey).toBe("string");
    expect(typeof config.appUrl).toBe("string");
    expect(typeof config.nodeEnv).toBe("string");
  });

  it("should have boolean types for feature flags", () => {
    Object.assign(env, minimalValidEnv());

    const config = getEnvConfig();
    expect(typeof config.enableMultiModel).toBe("boolean");
    expect(typeof config.enableVoiceAssistant).toBe("boolean");
    expect(typeof config.enableImageGeneration).toBe("boolean");
    expect(typeof config.enableSemanticSearch).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// 12. EnvValidationError
// ---------------------------------------------------------------------------

describe("EnvValidationError", () => {
  it("should have name set to EnvValidationError", () => {
    const err = new EnvValidationError(["error1", "error2"]);
    expect(err.name).toBe("EnvValidationError");
  });

  it("should have errors array property", () => {
    const err = new EnvValidationError(["error1", "error2"]);
    expect(err.errors).toEqual(["error1", "error2"]);
  });

  it("should format message with all errors", () => {
    const err = new EnvValidationError(["first issue", "second issue"]);
    expect(err.message).toContain("first issue");
    expect(err.message).toContain("second issue");
    expect(err.message).toContain("Environment validation failed:");
  });

  it("should be an instance of Error", () => {
    const err = new EnvValidationError(["test"]);
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// 13. Schema Export
// ---------------------------------------------------------------------------

describe("envSchema export", () => {
  it("should be a valid Zod schema", () => {
    expect(envSchema).toBeDefined();
    expect(typeof envSchema.safeParse).toBe("function");
    expect(typeof envSchema.parse).toBe("function");
  });

  it("should validate a correct env object", () => {
    const result = envSchema.safeParse({
      AIML_API_KEY: "key",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(result.success).toBe(true);
  });

  it("should fail validation for empty object", () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 14. CRITICAL_SECRETS constant
// ---------------------------------------------------------------------------

describe("CRITICAL_SECRETS", () => {
  it("should export the list of critical secret names", () => {
    expect(CRITICAL_SECRETS).toBeDefined();
    expect(Array.isArray(CRITICAL_SECRETS)).toBe(true);
  });

  it("should contain AIML_API_KEY", () => {
    expect(CRITICAL_SECRETS).toContain("AIML_API_KEY");
  });

  it("should contain SUPABASE_SERVICE_ROLE_KEY", () => {
    expect(CRITICAL_SECRETS).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("should contain ENCRYPTION_KEY", () => {
    expect(CRITICAL_SECRETS).toContain("ENCRYPTION_KEY");
  });

  it("should contain STRIPE_SECRET_KEY", () => {
    expect(CRITICAL_SECRETS).toContain("STRIPE_SECRET_KEY");
  });

  it("should have exactly 4 entries", () => {
    expect(CRITICAL_SECRETS).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 15. initializeEnvironment - startup guard
// ---------------------------------------------------------------------------

describe("initializeEnvironment", () => {
  it("should return an InitResult with config, trackedSecrets, and snapshotSize", () => {
    setEnv(minimalValidEnv());

    const result = initializeEnvironment();

    expect(result.config).toBeDefined();
    expect(result.config.aimlApiKey).toBe("test-aiml-key-12345");
    expect(typeof result.trackedSecrets).toBe("number");
    expect(typeof result.snapshotSize).toBe("number");
  });

  it("should track secrets that are present in env", () => {
    setEnv({
      ...minimalValidEnv(),
      SUPABASE_SERVICE_ROLE_KEY: "service-key-123",
      ENCRYPTION_KEY: "a]3kF9$mPqL7xR2wN5vB8jH1cT6yU0sE",
      STRIPE_SECRET_KEY: "sk_test_123456",
    });

    const result = initializeEnvironment();

    // AIML_API_KEY + SUPABASE_SERVICE_ROLE_KEY + ENCRYPTION_KEY + STRIPE_SECRET_KEY
    expect(result.trackedSecrets).toBe(4);
  });

  it("should only track secrets that exist (skip missing ones)", () => {
    setEnv(minimalValidEnv());
    // Only AIML_API_KEY is present among CRITICAL_SECRETS

    const result = initializeEnvironment();

    expect(result.trackedSecrets).toBe(1);
  });

  it("should capture a snapshot of all env vars", () => {
    setEnv(minimalValidEnv());

    const result = initializeEnvironment();

    // snapshotSize should equal the number of env vars
    expect(result.snapshotSize).toBe(Object.keys(minimalValidEnv()).length);
  });

  it("should set isInitialized to true", () => {
    setEnv(minimalValidEnv());

    expect(isInitialized()).toBe(false);
    initializeEnvironment();
    expect(isInitialized()).toBe(true);
  });

  it("should cache the validated config", () => {
    setEnv(minimalValidEnv());

    const result = initializeEnvironment();
    const cached = getEnvConfig();

    expect(cached).toBe(result.config);
  });

  it("should throw EnvValidationError when env is invalid", () => {
    setEnv({ NODE_ENV: "test" }); // Missing required vars

    expect(() => initializeEnvironment()).toThrow(EnvValidationError);
    expect(isInitialized()).toBe(false);
  });

  it("should allow re-initialization (overwrite previous state)", () => {
    setEnv(minimalValidEnv());
    const result1 = initializeEnvironment();

    // Change env and re-init
    _resetAll();
    setEnv({
      ...minimalValidEnv(),
      AIML_API_KEY: "new-key-67890",
    });
    const result2 = initializeEnvironment();

    expect(result2.config.aimlApiKey).toBe("new-key-67890");
    expect(result2.config.aimlApiKey).not.toBe(result1.config.aimlApiKey);
  });

  it("should not count empty-string secrets as tracked", () => {
    setEnv({
      ...minimalValidEnv(),
      STRIPE_SECRET_KEY: "",
    });

    const result = initializeEnvironment();

    // AIML_API_KEY is present, STRIPE_SECRET_KEY is empty (not tracked)
    expect(result.trackedSecrets).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 16. isInitialized
// ---------------------------------------------------------------------------

describe("isInitialized", () => {
  it("should return false before initialization", () => {
    expect(isInitialized()).toBe(false);
  });

  it("should return true after initialization", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    expect(isInitialized()).toBe(true);
  });

  it("should return false after _resetAll", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    expect(isInitialized()).toBe(true);
    _resetAll();
    expect(isInitialized()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 17. Secret Rotation Detection
// ---------------------------------------------------------------------------

describe("detectSecretRotation", () => {
  it("should throw if environment is not initialized", () => {
    expect(() => detectSecretRotation()).toThrow(
      "Environment not initialized. Call initializeEnvironment() first.",
    );
  });

  it("should report no rotation when secrets are unchanged", () => {
    setEnv({
      ...minimalValidEnv(),
      STRIPE_SECRET_KEY: "sk_test_original",
    });
    initializeEnvironment();

    const result = detectSecretRotation();

    expect(result.rotated).toBe(false);
    expect(result.changedSecrets).toEqual([]);
    expect(result.addedSecrets).toEqual([]);
    expect(result.removedSecrets).toEqual([]);
  });

  it("should detect when AIML_API_KEY is changed", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    // Rotate the key
    env.AIML_API_KEY = "brand-new-api-key";

    const result = detectSecretRotation();

    expect(result.rotated).toBe(true);
    expect(result.changedSecrets).toContain("AIML_API_KEY");
  });

  it("should detect when STRIPE_SECRET_KEY is added after init", () => {
    setEnv(minimalValidEnv());
    // STRIPE_SECRET_KEY not present at init
    initializeEnvironment();

    // Add it after init
    env.STRIPE_SECRET_KEY = "sk_test_new_key";

    const result = detectSecretRotation();

    expect(result.rotated).toBe(true);
    expect(result.addedSecrets).toContain("STRIPE_SECRET_KEY");
  });

  it("should detect when a critical secret is removed", () => {
    setEnv({
      ...minimalValidEnv(),
      STRIPE_SECRET_KEY: "sk_test_original",
    });
    initializeEnvironment();

    // Remove the secret
    delete env.STRIPE_SECRET_KEY;

    const result = detectSecretRotation();

    expect(result.rotated).toBe(true);
    expect(result.removedSecrets).toContain("STRIPE_SECRET_KEY");
  });

  it("should detect multiple changes at once", () => {
    setEnv({
      ...minimalValidEnv(),
      SUPABASE_SERVICE_ROLE_KEY: "old-service-key",
      STRIPE_SECRET_KEY: "sk_test_old",
    });
    initializeEnvironment();

    // Change one, remove another, add encryption key
    env.SUPABASE_SERVICE_ROLE_KEY = "new-service-key";
    delete env.STRIPE_SECRET_KEY;
    env.ENCRYPTION_KEY = "a]3kF9$mPqL7xR2wN5vB8jH1cT6yU0sE";

    const result = detectSecretRotation();

    expect(result.rotated).toBe(true);
    expect(result.changedSecrets).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(result.removedSecrets).toContain("STRIPE_SECRET_KEY");
    expect(result.addedSecrets).toContain("ENCRYPTION_KEY");
  });

  it("should not report rotation for non-critical env var changes", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    // Change a non-critical var
    env.NODE_ENV = "production";

    const result = detectSecretRotation();

    expect(result.rotated).toBe(false);
  });

  it("should not report rotation when secret is set to empty string (treated as removed)", () => {
    setEnv({
      ...minimalValidEnv(),
      STRIPE_SECRET_KEY: "sk_test_original",
    });
    initializeEnvironment();

    env.STRIPE_SECRET_KEY = "";

    const result = detectSecretRotation();

    expect(result.rotated).toBe(true);
    expect(result.removedSecrets).toContain("STRIPE_SECRET_KEY");
  });

  it("should return correct types in result", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    const result: SecretRotationResult = detectSecretRotation();

    expect(typeof result.rotated).toBe("boolean");
    expect(Array.isArray(result.changedSecrets)).toBe(true);
    expect(Array.isArray(result.addedSecrets)).toBe(true);
    expect(Array.isArray(result.removedSecrets)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 18. Env Drift Detection
// ---------------------------------------------------------------------------

describe("detectEnvDrift", () => {
  it("should throw if environment is not initialized", () => {
    expect(() => detectEnvDrift()).toThrow(
      "Environment not initialized. Call initializeEnvironment() first.",
    );
  });

  it("should report no drift when env is unchanged", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    const result = detectEnvDrift();

    expect(result.drifted).toBe(false);
    expect(result.added).toEqual([]);
    expect(result.changed).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("should detect a new variable added after init", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    env.BRAND_NEW_VAR = "some-value";

    const result = detectEnvDrift();

    expect(result.drifted).toBe(true);
    expect(result.added).toContain("BRAND_NEW_VAR");
  });

  it("should detect a variable value change", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    env.AIML_API_KEY = "changed-value";

    const result = detectEnvDrift();

    expect(result.drifted).toBe(true);
    expect(result.changed).toContain("AIML_API_KEY");
  });

  it("should detect a removed variable", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    delete env.AIML_API_KEY;

    const result = detectEnvDrift();

    expect(result.drifted).toBe(true);
    expect(result.removed).toContain("AIML_API_KEY");
  });

  it("should detect multiple types of drift simultaneously", () => {
    setEnv({
      ...minimalValidEnv(),
      EXTRA_VAR: "will-be-removed",
    });
    initializeEnvironment();

    // Add new var
    env.NEW_VAR = "hello";
    // Change existing var
    env.AIML_API_KEY = "different-key";
    // Remove existing var
    delete env.EXTRA_VAR;

    const result = detectEnvDrift();

    expect(result.drifted).toBe(true);
    expect(result.added).toContain("NEW_VAR");
    expect(result.changed).toContain("AIML_API_KEY");
    expect(result.removed).toContain("EXTRA_VAR");
  });

  it("should not report drift when a var is set to same value", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    // Re-set to exact same value
    env.AIML_API_KEY = "test-aiml-key-12345";

    const result = detectEnvDrift();

    expect(result.drifted).toBe(false);
  });

  it("should return correct types in result", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    const result: EnvDriftResult = detectEnvDrift();

    expect(typeof result.drifted).toBe("boolean");
    expect(Array.isArray(result.added)).toBe(true);
    expect(Array.isArray(result.changed)).toBe(true);
    expect(Array.isArray(result.removed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 19. _resetAll
// ---------------------------------------------------------------------------

describe("_resetAll", () => {
  it("should reset config cache", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    _resetAll();

    // getEnvConfig should re-validate (not return cached)
    setEnv({
      ...minimalValidEnv(),
      AIML_API_KEY: "after-reset-key",
    });
    const config = getEnvConfig();
    expect(config.aimlApiKey).toBe("after-reset-key");
  });

  it("should reset secret hashes so detectSecretRotation throws", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    _resetAll();

    expect(() => detectSecretRotation()).toThrow(
      "Environment not initialized",
    );
  });

  it("should reset env snapshot so detectEnvDrift throws", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    _resetAll();

    expect(() => detectEnvDrift()).toThrow("Environment not initialized");
  });

  it("should reset isInitialized to false", () => {
    setEnv(minimalValidEnv());
    initializeEnvironment();

    expect(isInitialized()).toBe(true);
    _resetAll();
    expect(isInitialized()).toBe(false);
  });
});
