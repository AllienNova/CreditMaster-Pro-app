import React, { useState } from 'react';
import type { OnboardingAnalysis } from '@/types/student-loan-agent';

interface StudentLoanOnboardingProps {
  onOnboardingComplete: (analysis: OnboardingAnalysis) => void;
}

export const StudentLoanOnboarding = ({ onOnboardingComplete }: StudentLoanOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleFinish = () => {
    // In a real application, you would use the DocumentIntelligenceSystem
    // to process the uploaded files and generate a detailed analysis.
    // For now, we'll just create a mock analysis object.
    const mockAnalysis = {
      defaultStatus: true, // Assume the user is in default for demonstration purposes
      uploadedFiles: files.map(file => file.name),
    };
    onOnboardingComplete(mockAnalysis);
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1 nextStep={nextStep} handleFileChange={handleFileChange} />;
      case 2:
        return <Step2 nextStep={nextStep} prevStep={prevStep} />;
      case 3:
        return <Step3 prevStep={prevStep} onFinish={handleFinish} />;
      default:
        return <Step1 nextStep={nextStep} handleFileChange={handleFileChange} />;
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Student Loan Onboarding</h2>
      {renderStep()}
    </div>
  );
};

const Step1 = ({ nextStep, handleFileChange }: { nextStep: () => void, handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <div>
    <h3 className="text-xl font-semibold mb-2">Step 1: Loan Discovery</h3>
    <p className="mb-4">Let's start by identifying all of your student loans. Please upload any relevant documents, such as your credit report or statements from your loan servicer.</p>
    <input type="file" multiple className="mb-4" onChange={handleFileChange} />
    <button onClick={nextStep} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
  </div>
);

const Step2 = ({ nextStep, prevStep }: { nextStep: () => void, prevStep: () => void }) => (
  <div>
    <h3 className="text-xl font-semibold mb-2">Step 2: Servicer Identification</h3>
    <p className="mb-4">Next, we need to identify your loan servicers. Please select your servicers from the list below.</p>
    {/* Add a list of servicers here */}
    <div className="flex justify-between mt-4">
      <button onClick={prevStep} className="bg-gray-500 text-white px-4 py-2 rounded">Previous</button>
      <button onClick={nextStep} className="bg-blue-500 text-white px-4 py-2 rounded">Next</button>
    </div>
  </div>
);

const Step3 = ({ prevStep, onFinish }: { prevStep: () => void, onFinish: () => void }) => (
  <div>
    <h3 className="text-xl font-semibold mb-2">Step 3: Initial Strategy Assessment</h3>
    <p className="mb-4">Based on the information you've provided, we're generating an initial set of credit repair strategies.</p>
    {/* Display a loading indicator or initial strategies here */}
    <div className="flex justify-between mt-4">
      <button onClick={prevStep} className="bg-gray-500 text-white px-4 py-2 rounded">Previous</button>
      <button onClick={onFinish} className="bg-green-500 text-white px-4 py-2 rounded">Finish</button>
    </div>
  </div>
);
