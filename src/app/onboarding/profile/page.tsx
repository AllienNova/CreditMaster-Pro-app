"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EducationalTooltip } from "@/components/onboarding/EducationalTooltip";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { profileValidationRules } from "@/lib/validation/onboarding-rules";
import { educationalContent } from "@/lib/onboarding/educational-content";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

const US_STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [subStep, setSubStep] = useState<1 | 2>(1);
  const { progress, updateFormData, completeStep, saving } = useOnboardingProgress();

  // Get saved form data
  const savedData = progress.form_data?.step_2 || {};

  // Form validation
  const { formState, handleChange, handleBlur, validateAll, getValues, isFormValid } = useFormValidation(
    profileValidationRules,
    savedData
  );

  // Auto-save form data
  useEffect(() => {
    const values = getValues();
    if (Object.keys(values).length > 0) {
      updateFormData(values);
    }
  }, [formState, getValues, updateFormData]);

  const handleContinue = async () => {
    if (subStep === 1) {
      // Validate basic info before moving to sub-step 2
      const basicFields = ['firstName', 'lastName', 'phone', 'dateOfBirth'];
      const basicValid = basicFields.every(field => formState[field]?.valid);

      if (basicValid) {
        setSubStep(2);
      } else {
        validateAll();
      }
    } else {
      // Validate all fields before continuing
      if (validateAll()) {
        await completeStep(2);
        router.push('/onboarding/goals');
      }
    }
  };

  const renderField = (
    name: string,
    label: string,
    type: string = "text",
    placeholder?: string,
    tooltip?: keyof typeof educationalContent
  ) => {
    const field = formState[name];
    const showError = field?.touched && field?.error;
    const showValid = field?.touched && field?.valid && field?.value;

    return (
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
          {label}
          {tooltip && (
            <EducationalTooltip
              title={educationalContent[tooltip].title}
              content={educationalContent[tooltip].content}
              learnMoreUrl={educationalContent[tooltip].learnMoreUrl}
            />
          )}
        </label>
        <div className="relative">
          <input
            type={type}
            name={name}
            value={typeof field?.value === 'boolean' ? '' : (field?.value ?? '')}
            onChange={(e) => handleChange(name, e.target.value)}
            onBlur={() => handleBlur(name)}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
              showError ? 'border-red-500' : showValid ? 'border-green-500' : 'border-gray-300 dark:border-slate-600'
            }`}
            placeholder={placeholder}
          />
          {showValid && (
            <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
        </div>
        {showError && (
          <p className="text-xs text-red-600 mt-1">{field.error}</p>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {subStep === 1 ? 'Basic Information' : 'Additional Details'}
        </h1>
        <p className="text-gray-600 dark:text-slate-300">
          {subStep === 1
            ? 'Let\'s start with your basic information'
            : 'We need a few more details to verify your identity'}
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className={`w-8 h-1 rounded ${subStep === 1 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          <div className={`w-8 h-1 rounded ${subStep === 2 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 max-w-2xl mx-auto">
        {subStep === 1 ? (
          <div className="space-y-6">
            {/* Basic Info - Sub-step 1 */}
            <div className="grid md:grid-cols-2 gap-4">
              {renderField('firstName', 'First Name', 'text', 'John')}
              {renderField('lastName', 'Last Name', 'text', 'Doe')}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {renderField('phone', 'Phone Number', 'tel', '(555) 123-4567')}
              {renderField('dateOfBirth', 'Date of Birth', 'date', undefined, 'dateOfBirth')}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Additional Info - Sub-step 2 */}
            {renderField('address', 'Street Address', 'text', '123 Main St', 'address')}

            <div className="grid md:grid-cols-3 gap-4">
              {renderField('city', 'City', 'text', 'New York')}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">State</label>
                <select
                  name="state"
                  value={typeof formState.state?.value === 'boolean' ? '' : (formState.state?.value ?? '')}
                  onChange={(e) => handleChange('state', e.target.value)}
                  onBlur={() => handleBlur('state')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    formState.state?.touched && formState.state?.error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                >
                  <option value="">Select</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {formState.state?.touched && formState.state?.error && (
                  <p className="text-xs text-red-600 mt-1">{formState.state.error}</p>
                )}
              </div>

              {renderField('zipCode', 'ZIP Code', 'text', '10001')}
            </div>

            {renderField('ssn', 'Social Security Number', 'password', 'XXX-XX-XXXX', 'ssn')}
            <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
              <span></span>
              <span>Your SSN is encrypted and only used to verify your identity with credit bureaus</span>
            </p>
          </div>
        )}

        {saving && (
          <div className="mt-4 text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 max-w-2xl mx-auto">
        {subStep === 1 ? (
          <Link href="/onboarding" className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition">
            ← Back
          </Link>
        ) : (
          <button
            onClick={() => setSubStep(1)}
            className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition"
          >
            ← Back
          </button>
        )}
        <button
          onClick={handleContinue}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {subStep === 1 ? 'Continue →' : 'Next: Set Goals →'}
        </button>
      </div>
    </div>
  );
}

