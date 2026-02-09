/**
 * Form Validation Hook
 * 
 * Provides real-time validation, auto-formatting, and error handling for forms
 */

import { useState, useCallback, useMemo } from 'react';

export type FormFieldValue = string | number | boolean | null | undefined | string[];

export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: (value: FormFieldValue) => boolean;
  message: string;
  format?: (value: string) => string;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface FieldState {
  value: FormFieldValue;
  error: string | null;
  touched: boolean;
  valid: boolean;
}

export interface FormState {
  [fieldName: string]: FieldState;
}

export function useFormValidation(rules: ValidationRules, initialValues: Record<string, FormFieldValue> = {}) {
  const [formState, setFormState] = useState<FormState>(() => {
    const state: FormState = {};
    Object.keys(rules).forEach((fieldName) => {
      state[fieldName] = {
        value: initialValues[fieldName] ?? '',
        error: null,
        touched: false,
        valid: !rules[fieldName].required || !!initialValues[fieldName],
      };
    });
    return state;
  });

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: FormFieldValue): string | null => {
    const rule = rules[fieldName];
    if (!rule) return null;

    // Required check
    if (rule.required && (!value || value.toString().trim() === '')) {
      return rule.message || 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return null;
    }

    // Pattern check
    if (rule.pattern && !rule.pattern.test(value.toString())) {
      return rule.message;
    }

    // Min/Max length check
    if (rule.minLength && value.toString().length < rule.minLength) {
      return rule.message || `Minimum ${rule.minLength} characters required`;
    }

    if (rule.maxLength && value.toString().length > rule.maxLength) {
      return rule.message || `Maximum ${rule.maxLength} characters allowed`;
    }

    // Min/Max value check (for numbers)
    if (rule.min !== undefined && Number(value) < rule.min) {
      return rule.message || `Minimum value is ${rule.min}`;
    }

    if (rule.max !== undefined && Number(value) > rule.max) {
      return rule.message || `Maximum value is ${rule.max}`;
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      return rule.message;
    }

    return null;
  }, [rules]);

  // Handle field change
  const handleChange = useCallback((fieldName: string, value: FormFieldValue) => {
    const rule = rules[fieldName];
    
    // Apply auto-formatting if defined
    let formattedValue = value;
    if (rule?.format && typeof value === 'string') {
      formattedValue = rule.format(value);
    }

    // Validate the field
    const error = validateField(fieldName, formattedValue);

    setFormState((prev) => ({
      ...prev,
      [fieldName]: {
        value: formattedValue,
        error,
        touched: prev[fieldName]?.touched || false,
        valid: error === null,
      },
    }));
  }, [rules, validateField]);

  // Handle field blur
  const handleBlur = useCallback((fieldName: string) => {
    setFormState((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        touched: true,
      },
    }));
  }, []);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let isValid = true;
    const newState = { ...formState };

    Object.keys(rules).forEach((fieldName) => {
      const error = validateField(fieldName, formState[fieldName]?.value);
      newState[fieldName] = {
        ...formState[fieldName],
        error,
        touched: true,
        valid: error === null,
      };
      if (error) isValid = false;
    });

    setFormState(newState);
    return isValid;
  }, [formState, rules, validateField]);

  // Get form values
  const getValues = useCallback((): Record<string, FormFieldValue> => {
    const values: Record<string, FormFieldValue> = {};
    Object.keys(formState).forEach((fieldName) => {
      values[fieldName] = formState[fieldName].value;
    });
    return values;
  }, [formState]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return Object.values(formState).every((field) => field.valid);
  }, [formState]);

  return {
    formState,
    handleChange,
    handleBlur,
    validateAll,
    getValues,
    isFormValid,
  };
}

