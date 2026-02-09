/**
 * Onboarding Form Validation Rules
 * 
 * Reusable validation rules and formatters for onboarding forms
 */

import { ValidationRules, FormFieldValue } from '@/hooks/useFormValidation';

// Auto-formatters
export const formatters = {
  phone: (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  },

  ssn: (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as XXX-XX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 5) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
    }
  },

  zipCode: (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as XXXXX or XXXXX-XXXX
    if (digits.length <= 5) {
      return digits;
    } else {
      return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
    }
  },

  currency: (value: string): string => {
    // Remove all non-digits and decimal points
    const cleaned = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    return cleaned;
  },
};

// Validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
  ssn: /^\d{3}-\d{2}-\d{4}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  name: /^[a-zA-Z\s'-]+$/,
};

// Profile step validation rules
export const profileValidationRules: ValidationRules = {
  firstName: {
    required: true,
    pattern: patterns.name,
    minLength: 2,
    maxLength: 50,
    message: 'Please enter a valid first name (letters only)',
  },
  lastName: {
    required: true,
    pattern: patterns.name,
    minLength: 2,
    maxLength: 50,
    message: 'Please enter a valid last name (letters only)',
  },
  email: {
    required: true,
    pattern: patterns.email,
    message: 'Please enter a valid email address',
  },
  phone: {
    required: true,
    pattern: patterns.phone,
    message: 'Please enter a valid phone number',
    format: formatters.phone,
  },
  dateOfBirth: {
    required: true,
    custom: (value: FormFieldValue) => {
      if (typeof value !== 'string') return false;
      const date = new Date(value);
      const age = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return age >= 18 && age <= 120;
    },
    message: 'You must be at least 18 years old',
  },
  ssn: {
    required: true,
    pattern: patterns.ssn,
    message: 'Please enter a valid SSN (XXX-XX-XXXX)',
    format: formatters.ssn,
  },
  address: {
    required: true,
    minLength: 5,
    maxLength: 100,
    message: 'Please enter a valid street address',
  },
  city: {
    required: true,
    pattern: patterns.name,
    minLength: 2,
    maxLength: 50,
    message: 'Please enter a valid city name',
  },
  state: {
    required: true,
    pattern: /^[A-Z]{2}$/,
    message: 'Please select a state',
  },
  zipCode: {
    required: true,
    pattern: patterns.zipCode,
    message: 'Please enter a valid ZIP code',
    format: formatters.zipCode,
  },
};

// Goals step validation rules
export const goalsValidationRules: ValidationRules = {
  selectedGoals: {
    required: true,
    custom: (value: FormFieldValue) => Array.isArray(value) && value.length > 0,
    message: 'Please select at least one goal',
  },
  targetScore: {
    required: false,
    min: 300,
    max: 850,
    message: 'Credit score must be between 300 and 850',
  },
  timeframe: {
    required: true,
    custom: (value: FormFieldValue) => typeof value === 'string' && ['3_months', '6_months', '12_months', '24_months'].includes(value),
    message: 'Please select a timeframe',
  },
};

// Connect step validation rules
export const connectValidationRules: ValidationRules = {
  bureauConsent: {
    required: true,
    custom: (value: FormFieldValue) => value === true,
    message: 'You must consent to connect credit bureaus',
  },
  bankConsent: {
    required: false,
    custom: (value: FormFieldValue) => typeof value === 'boolean',
    message: 'Invalid consent value',
  },
};

