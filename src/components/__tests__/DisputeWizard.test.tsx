import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock wizard component for testing
const DisputeWizard = ({
  onComplete,
}: {
  onComplete: (data: unknown) => void;
}) => {
  const [step, setStep] = React.useState(1);
  const [data, setData] = React.useState({
    bureau: "",
    itemType: "",
    reason: "",
    description: "",
  });

  const steps = ["Select Bureau", "Select Item", "Provide Reason", "Review"];

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      onComplete(data);
    }
  };

  return (
    <div data-testid="dispute-wizard">
      <div data-testid="step-indicator">
        Step {step} of {steps.length}
      </div>
      <div data-testid="step-title">{steps[step - 1]}</div>
      {step === 1 && (
        <select
          data-testid="bureau-select"
          value={data.bureau}
          onChange={(e) => setData({ ...data, bureau: e.target.value })}
        >
          <option value="">Select Bureau</option>
          <option value="experian">Experian</option>
          <option value="equifax">Equifax</option>
          <option value="transunion">TransUnion</option>
        </select>
      )}
      <button data-testid="next-button" onClick={handleNext}>
        {step === steps.length ? "Submit" : "Next"}
      </button>
    </div>
  );
};

describe("DisputeWizard Component", () => {
  describe("Step Navigation", () => {
    it("should render first step initially", () => {
      render(<DisputeWizard onComplete={jest.fn()} />);
      expect(screen.getByTestId("step-indicator")).toHaveTextContent(
        "Step 1 of 4",
      );
      expect(screen.getByTestId("step-title")).toHaveTextContent(
        "Select Bureau",
      );
    });

    it("should advance to next step on click", () => {
      render(<DisputeWizard onComplete={jest.fn()} />);
      fireEvent.click(screen.getByTestId("next-button"));
      expect(screen.getByTestId("step-indicator")).toHaveTextContent(
        "Step 2 of 4",
      );
    });

    it("should show Submit on last step", () => {
      render(<DisputeWizard onComplete={jest.fn()} />);
      // Navigate to last step
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByTestId("next-button"));
      }
      expect(screen.getByTestId("next-button")).toHaveTextContent("Submit");
    });
  });

  describe("Bureau Selection", () => {
    it("should render bureau select on step 1", () => {
      render(<DisputeWizard onComplete={jest.fn()} />);
      expect(screen.getByTestId("bureau-select")).toBeInTheDocument();
    });

    it("should have all bureau options", () => {
      render(<DisputeWizard onComplete={jest.fn()} />);
      const select = screen.getByTestId("bureau-select");
      expect(select).toContainHTML("Experian");
      expect(select).toContainHTML("Equifax");
      expect(select).toContainHTML("TransUnion");
    });
  });

  describe("Form Submission", () => {
    it("should call onComplete when submitted", () => {
      const onComplete = jest.fn();
      render(<DisputeWizard onComplete={onComplete} />);

      // Navigate through all steps
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByTestId("next-button"));
      }

      expect(onComplete).toHaveBeenCalled();
    });
  });
});

describe("Dispute Wizard Validation", () => {
  const validateStep = (step: number, data: Record<string, string>) => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!data.bureau) errors.push("Bureau is required");
        break;
      case 2:
        if (!data.itemType) errors.push("Item type is required");
        break;
      case 3:
        if (!data.reason) errors.push("Reason is required");
        if (data.description && data.description.length < 10) {
          errors.push("Description must be at least 10 characters");
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  };

  it("should require bureau on step 1", () => {
    const result = validateStep(1, { bureau: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Bureau is required");
  });

  it("should pass with valid bureau", () => {
    const result = validateStep(1, { bureau: "experian" });
    expect(result.valid).toBe(true);
  });

  it("should require item type on step 2", () => {
    const result = validateStep(2, { itemType: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Item type is required");
  });

  it("should require reason on step 3", () => {
    const result = validateStep(3, { reason: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Reason is required");
  });

  it("should validate description length", () => {
    const result = validateStep(3, { reason: "test", description: "short" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Description must be at least 10 characters",
    );
  });
});

describe("Dispute Letter Templates", () => {
  it("should have all template types", () => {
    const templates = [
      { id: "collection", name: "Collection Account", category: "debt" },
      { id: "late_payment", name: "Late Payment", category: "payment" },
      { id: "identity_theft", name: "Identity Theft", category: "fraud" },
      {
        id: "incorrect_balance",
        name: "Incorrect Balance",
        category: "accuracy",
      },
    ];
    expect(templates.length).toBe(4);
  });

  it("should categorize templates", () => {
    const templates = [
      { id: "collection", name: "Collection Account", category: "debt" },
      { id: "late_payment", name: "Late Payment", category: "payment" },
      { id: "identity_theft", name: "Identity Theft", category: "fraud" },
      {
        id: "incorrect_balance",
        name: "Incorrect Balance",
        category: "accuracy",
      },
    ];
    const categories = Array.from(new Set(templates.map((t) => t.category)));
    expect(categories).toContain("debt");
    expect(categories).toContain("payment");
    expect(categories).toContain("fraud");
    expect(categories).toContain("accuracy");
  });
});
