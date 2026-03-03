/**
 * Tests for ConfirmDialog Component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmDialog from "../ConfirmDialog";

// Mock createPortal since ConfirmDialog uses Modal which uses createPortal
jest.mock("react-dom", () => {
  const original = jest.requireActual("react-dom");
  return {
    ...original,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe("ConfirmDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: "Delete Item",
    message: "Are you sure you want to delete this item?",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render title and message when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Delete Item")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete this item?"),
    ).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Delete Item")).not.toBeInTheDocument();
  });

  it("should render default button texts", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("should render custom button texts", () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmText="Yes, Delete"
        cancelText="No, Keep"
      />,
    );
    expect(screen.getByText("Yes, Delete")).toBeInTheDocument();
    expect(screen.getByText("No, Keep")).toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Confirm"));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when cancel button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("should show loading state with spinner", () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("should disable buttons when loading", () => {
    render(<ConfirmDialog {...defaultProps} isLoading={true} />);
    const cancelButton = screen.getByText("Cancel").closest("button");
    const confirmButton = screen
      .getByText("Processing...")
      .closest("button");
    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it("should render with danger variant styling", () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" />);
    const confirmButton = screen.getByText("Confirm").closest("button");
    expect(confirmButton?.className).toContain("bg-red-600");
  });

  it("should render with warning variant styling", () => {
    render(<ConfirmDialog {...defaultProps} variant="warning" />);
    const confirmButton = screen.getByText("Confirm").closest("button");
    expect(confirmButton?.className).toContain("bg-yellow-600");
  });

  it("should render with info variant styling", () => {
    render(<ConfirmDialog {...defaultProps} variant="info" />);
    const confirmButton = screen.getByText("Confirm").closest("button");
    expect(confirmButton?.className).toContain("bg-blue-600");
  });

  it("should render with success variant styling", () => {
    render(<ConfirmDialog {...defaultProps} variant="success" />);
    const confirmButton = screen.getByText("Confirm").closest("button");
    expect(confirmButton?.className).toContain("bg-green-600");
  });

  it("should render variant icon", () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });
});
