/**
 * Tests for ProgressIndicator, CircularProgress, and WizardProgress Components
 */

import { render, screen, fireEvent } from "@testing-library/react";
import ProgressIndicator, {
  CircularProgress,
  WizardProgress,
  Step,
} from "../ProgressIndicator";

// Mock @heroicons/react/24/solid
jest.mock("@heroicons/react/24/solid", () => ({
  CheckIcon: (props: Record<string, unknown>) => (
    <svg data-testid="check-icon" {...props} />
  ),
}));

describe("ProgressIndicator", () => {
  const steps: Step[] = [
    { id: "1", name: "Account Setup", description: "Create your account", status: "complete" },
    { id: "2", name: "Verification", description: "Verify your identity", status: "current" },
    { id: "3", name: "Preferences", description: "Set your preferences", status: "upcoming" },
  ];

  it("should render default variant with all step names", () => {
    render(<ProgressIndicator steps={steps} currentStep={1} />);
    expect(screen.getByText("Account Setup")).toBeInTheDocument();
    expect(screen.getByText("Verification")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
  });

  it("should render step numbers in default variant", () => {
    render(<ProgressIndicator steps={steps} currentStep={1} />);
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(screen.getByText("Step 3")).toBeInTheDocument();
  });

  it("should mark current step with aria-current", () => {
    render(<ProgressIndicator steps={steps} currentStep={1} />);
    const currentStep = document.querySelector('[aria-current="step"]');
    expect(currentStep).toBeInTheDocument();
    expect(currentStep?.textContent).toContain("Verification");
  });

  it("should show descriptions when showDescription is true", () => {
    render(
      <ProgressIndicator
        steps={steps}
        currentStep={1}
        showDescription={true}
      />,
    );
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByText("Verify your identity")).toBeInTheDocument();
    expect(screen.getByText("Set your preferences")).toBeInTheDocument();
  });

  it("should not show descriptions by default", () => {
    render(<ProgressIndicator steps={steps} currentStep={1} />);
    expect(screen.queryByText("Create your account")).not.toBeInTheDocument();
  });

  it("should render with nav element and progress label", () => {
    render(<ProgressIndicator steps={steps} currentStep={1} />);
    expect(screen.getByRole("navigation")).toHaveAttribute(
      "aria-label",
      "Progress",
    );
  });

  it("should render compact variant with step numbers", () => {
    render(
      <ProgressIndicator
        steps={steps}
        currentStep={1}
        variant="compact"
      />,
    );
    // Compact shows numbers for current/upcoming and check icons for complete
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should render compact variant with labels when showLabels is true", () => {
    render(
      <ProgressIndicator
        steps={steps}
        currentStep={1}
        variant="compact"
        showLabels={true}
      />,
    );
    expect(screen.getByText("Account Setup")).toBeInTheDocument();
    expect(screen.getByText("Verification")).toBeInTheDocument();
  });

  it("should not render labels in compact variant when showLabels is false", () => {
    render(
      <ProgressIndicator
        steps={steps}
        currentStep={1}
        variant="compact"
        showLabels={false}
      />,
    );
    expect(screen.queryByText("Account Setup")).not.toBeInTheDocument();
  });

  it("should render minimal variant with step counter and percentage", () => {
    render(
      <ProgressIndicator
        steps={steps}
        currentStep={1}
        variant="minimal"
      />,
    );
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("should show check icon for completed steps in compact variant", () => {
    render(
      <ProgressIndicator
        steps={steps}
        currentStep={1}
        variant="compact"
      />,
    );
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });
});

describe("CircularProgress", () => {
  it("should render percentage text", () => {
    render(<CircularProgress progress={75} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("should render label when provided", () => {
    render(<CircularProgress progress={50} label="Loading data" />);
    expect(screen.getByText("Loading data")).toBeInTheDocument();
  });

  it("should not render label when not provided", () => {
    render(<CircularProgress progress={50} />);
    // Should only show percentage
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("should render SVG with specified size", () => {
    const { container } = render(<CircularProgress progress={50} size={200} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "200");
    expect(svg).toHaveAttribute("height", "200");
  });

  it("should round progress to nearest integer", () => {
    render(<CircularProgress progress={33.7} />);
    expect(screen.getByText("34%")).toBeInTheDocument();
  });
});

describe("WizardProgress", () => {
  const wizardSteps = ["Basic Info", "Details", "Review", "Confirm"];

  it("should render all steps with correct numbers", () => {
    render(<WizardProgress steps={wizardSteps} currentStep={1} />);
    // Step 0 is complete (check icon), step 1 is current, steps 2 & 3 are upcoming
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("should render check icon for completed steps", () => {
    render(<WizardProgress steps={wizardSteps} currentStep={2} />);
    // Steps 0 and 1 are complete
    const checkIcons = screen.getAllByTestId("check-icon");
    expect(checkIcons).toHaveLength(2);
  });

  it("should set title attribute on buttons", () => {
    render(<WizardProgress steps={wizardSteps} currentStep={1} />);
    expect(screen.getByTitle("Basic Info")).toBeInTheDocument();
    expect(screen.getByTitle("Details")).toBeInTheDocument();
    expect(screen.getByTitle("Review")).toBeInTheDocument();
    expect(screen.getByTitle("Confirm")).toBeInTheDocument();
  });

  it("should disable upcoming step buttons", () => {
    render(<WizardProgress steps={wizardSteps} currentStep={1} />);
    const reviewButton = screen.getByTitle("Review");
    expect(reviewButton).toBeDisabled();
    const confirmButton = screen.getByTitle("Confirm");
    expect(confirmButton).toBeDisabled();
  });

  it("should call onStepClick for completed step", () => {
    const onStepClick = jest.fn();
    render(
      <WizardProgress
        steps={wizardSteps}
        currentStep={2}
        onStepClick={onStepClick}
      />,
    );
    fireEvent.click(screen.getByTitle("Basic Info"));
    expect(onStepClick).toHaveBeenCalledWith(0);
  });

  it("should call onStepClick for current step", () => {
    const onStepClick = jest.fn();
    render(
      <WizardProgress
        steps={wizardSteps}
        currentStep={1}
        onStepClick={onStepClick}
      />,
    );
    fireEvent.click(screen.getByTitle("Details"));
    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it("should not call onStepClick for disabled upcoming step", () => {
    const onStepClick = jest.fn();
    render(
      <WizardProgress
        steps={wizardSteps}
        currentStep={1}
        onStepClick={onStepClick}
      />,
    );
    fireEvent.click(screen.getByTitle("Review"));
    expect(onStepClick).not.toHaveBeenCalled();
  });
});
