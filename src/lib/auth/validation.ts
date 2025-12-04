/**
 * Authentication Validation Utilities
 * 
 * Provides validation functions for email, password, and other auth-related inputs.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return {
      valid: false,
      error: 'Email is required',
    };
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'Please enter a valid email address',
    };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  
  if (domain && domain.includes('..')) {
    return {
      valid: false,
      error: 'Email address contains invalid characters',
    };
  }

  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return {
      valid: false,
      error: 'Password is required',
    };
  }

  // Minimum length check
  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  // Maximum length check (prevent DoS)
  if (password.length > 128) {
    return {
      valid: false,
      error: 'Password must be less than 128 characters',
    };
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
    };
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*)',
    };
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password', 'password1', 'password123', '12345678', 'qwerty123',
    'abc123456', 'password!', 'welcome123', 'admin123', 'letmein123',
  ];
  
  if (weakPasswords.includes(password.toLowerCase())) {
    return {
      valid: false,
      error: 'This password is too common. Please choose a stronger password',
    };
  }

  return { valid: true };
}

/**
 * Calculate password strength score (0-4)
 */
export function getPasswordStrength(password: string): {
  score: number;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
} {
  let score = 0;

  if (!password) {
    return { score: 0, label: 'Very Weak', color: 'red' };
  }

  // Length
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;

  // Normalize to 0-4 scale
  score = Math.min(4, Math.floor(score / 1.25));

  const labels: Array<'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong'> = [
    'Very Weak',
    'Weak',
    'Fair',
    'Strong',
    'Very Strong',
  ];

  const colors = ['red', 'orange', 'yellow', 'lime', 'green'];

  return {
    score,
    label: labels[score],
    color: colors[score],
  };
}

/**
 * Validate name
 */
export function validateName(name: string): ValidationResult {
  if (!name) {
    return {
      valid: false,
      error: 'Name is required',
    };
  }

  if (name.trim().length < 2) {
    return {
      valid: false,
      error: 'Name must be at least 2 characters long',
    };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: 'Name must be less than 100 characters',
    };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return {
      valid: false,
      error: 'Name can only contain letters, spaces, hyphens, and apostrophes',
    };
  }

  return { valid: true };
}

/**
 * Sanitize input string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate sign up data
 */
export function validateSignUpData(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): ValidationResult {
  // Validate name
  const nameValidation = validateName(data.name);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    return passwordValidation;
  }

  // Validate password confirmation
  if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
    return {
      valid: false,
      error: 'Passwords do not match',
    };
  }

  return { valid: true };
}

/**
 * Validate sign in data
 */
export function validateSignInData(data: {
  email: string;
  password: string;
}): ValidationResult {
  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  // Basic password check (don't validate strength for sign in)
  if (!data.password) {
    return {
      valid: false,
      error: 'Password is required',
    };
  }

  return { valid: true };
}

/**
 * Validate password reset email
 */
export function validateResetEmail(email: string): ValidationResult {
  return validateEmail(email);
}

/**
 * Check if password meets minimum requirements (for display purposes)
 */
export function getPasswordRequirements(password: string): {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
} {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
}

const authValidation = {
  validateEmail,
  validatePassword,
  validateName,
  validateSignUpData,
  validateSignInData,
  validateResetEmail,
  getPasswordStrength,
  getPasswordRequirements,
  sanitizeInput,
};

export default authValidation;
