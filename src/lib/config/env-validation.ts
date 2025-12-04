/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at application startup
 * to prevent runtime errors and security misconfigurations.
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
}

/**
 * Validation errors
 */
export class EnvValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Environment validation failed:\n${errors.join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate a required environment variable
 */
function validateRequired(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Validate an optional environment variable
 */
function validateOptional(name: string, value: string | undefined, defaultValue: string): string {
  return value && value.trim() !== '' ? value : defaultValue;
}

/**
 * Validate a boolean environment variable
 */
function validateBoolean(name: string, value: string | undefined, defaultValue: boolean): boolean {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Validate a URL
 */
function validateUrl(name: string, value: string): string {
  try {
    new URL(value);
    return value;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`Invalid URL for ${name}: ${value} (${reason})`);
  }
}

/**
 * Validate encryption key
 */
function validateEncryptionKey(key: string | undefined): string | undefined {
  if (!key) {
    return undefined;
  }
  
  // Check key length (should be 32 bytes for AES-256)
  if (key.length < 32) {
    throw new Error('Encryption key must be at least 32 characters long');
  }
  
  return key;
}

/**
 * Validate all environment variables
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = [];
  
  try {
    // AIML API
    const aimlApiKey = validateRequired('AIML_API_KEY', process.env.AIML_API_KEY);
    const aimlBaseUrl = validateUrl('AIML_BASE_URL', 
      validateOptional('AIML_BASE_URL', process.env.AIML_BASE_URL, 'https://api.aimlapi.com/v1')
    );
    const aimlDefaultChatModel = validateOptional(
      'AIML_DEFAULT_CHAT_MODEL',
      process.env.AIML_DEFAULT_CHAT_MODEL,
      'anthropic/claude-4.5-sonnet'
    );
    const aimlReasoningModel = validateOptional(
      'AIML_REASONING_MODEL',
      process.env.AIML_REASONING_MODEL,
      'deepseek/deepseek-r1'
    );
    const aimlFastModel = validateOptional(
      'AIML_FAST_MODEL',
      process.env.AIML_FAST_MODEL,
      'openai/gpt-4o-mini'
    );
    const aimlImageModel = validateOptional(
      'AIML_IMAGE_MODEL',
      process.env.AIML_IMAGE_MODEL,
      'flux-pro'
    );
    const aimlVoiceModel = validateOptional(
      'AIML_VOICE_MODEL',
      process.env.AIML_VOICE_MODEL,
      'tts-1-hd'
    );
    
    // Supabase
    const supabaseUrl = validateUrl('NEXT_PUBLIC_SUPABASE_URL',
      validateRequired('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
    );
    const supabaseAnonKey = validateRequired(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Application
    const appUrl = validateUrl('NEXT_PUBLIC_APP_URL',
      validateOptional('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:3000')
    );
    const nodeEnv = validateOptional('NODE_ENV', process.env.NODE_ENV, 'development');
    
    // Feature Flags
    const enableMultiModel = validateBoolean('ENABLE_MULTI_MODEL', process.env.ENABLE_MULTI_MODEL, true);
    const enableVoiceAssistant = validateBoolean('ENABLE_VOICE_ASSISTANT', process.env.ENABLE_VOICE_ASSISTANT, true);
    const enableImageGeneration = validateBoolean('ENABLE_IMAGE_GENERATION', process.env.ENABLE_IMAGE_GENERATION, true);
    const enableSemanticSearch = validateBoolean('ENABLE_SEMANTIC_SEARCH', process.env.ENABLE_SEMANTIC_SEARCH, true);
    
    // Encryption
    const encryptionKey = validateEncryptionKey(process.env.ENCRYPTION_KEY);
    
    // Warn about missing optional variables
    if (!supabaseServiceRoleKey) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - admin operations will not work');
    }
    
    if (!encryptionKey) {
      console.warn('⚠️  ENCRYPTION_KEY not set - PII encryption will not work');
    }
    
    // Production-specific validations
    if (nodeEnv === 'production') {
      if (appUrl.includes('localhost')) {
        errors.push('NEXT_PUBLIC_APP_URL must not be localhost in production');
      }
      
      if (!encryptionKey) {
        errors.push('ENCRYPTION_KEY is required in production');
      }
      
      if (!supabaseServiceRoleKey) {
        errors.push('SUPABASE_SERVICE_ROLE_KEY is required in production');
      }
    }
    
    if (errors.length > 0) {
      throw new EnvValidationError(errors);
    }
    
    return {
      aimlApiKey,
      aimlBaseUrl,
      aimlDefaultChatModel,
      aimlReasoningModel,
      aimlFastModel,
      aimlImageModel,
      aimlVoiceModel,
      supabaseUrl,
      supabaseAnonKey,
      supabaseServiceRoleKey,
      appUrl,
      nodeEnv,
      enableMultiModel,
      enableVoiceAssistant,
      enableImageGeneration,
      enableSemanticSearch,
      encryptionKey,
    };
  } catch (error) {
    if (error instanceof EnvValidationError) {
      throw error;
    }
    
    if (error instanceof Error) {
      errors.push(error.message);
    }
    
    throw new EnvValidationError(errors);
  }
}

/**
 * Get validated environment configuration
 * Caches the result after first validation
 */
let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
    console.log('✅ Environment variables validated successfully');
  }
  return cachedConfig;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvConfig().nodeEnv === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvConfig().nodeEnv === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return getEnvConfig().nodeEnv === 'test';
}

// Validate on module load (but only in Node.js environment)
if (typeof window === 'undefined') {
  try {
    getEnvConfig();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }
    throw error;
  }
}
