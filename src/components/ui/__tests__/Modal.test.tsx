/**
 * Tests for Modal Component
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import Modal from "../Modal";

// Mock createPortal to render in the same container
jest.mock("react-dom", () => {
  const original = jest.requireActual("react-dom");
  return {
    ...original,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe("Modal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render children when open", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("should render title when provided", () => {
    render(<Modal {...defaultProps} title="Test Title" />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("should render description when provided", () => {
    render(
      <Modal
        {...defaultProps}
        title="Title"
        description="Test description text"
      />,
    );
    expect(screen.getByText("Test description text")).toBeInTheDocument();
  });

  it("should render close button by default", () => {
    render(<Modal {...defaultProps} title="Title" />);
    expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", () => {
    render(<Modal {...defaultProps} title="Title" />);
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("should hide close button when showCloseButton is false", () => {
    render(
      <Modal {...defaultProps} title="Title" showCloseButton={false} />,
    );
    expect(screen.queryByLabelText("Close modal")).not.toBeInTheDocument();
  });

  it("should call onClose when Escape key is pressed", () => {
    render(<Modal {...defaultProps} />);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape" }),
      );
    });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("should not call onClose on Escape when closeOnEscape is false", () => {
    render(<Modal {...defaultProps} closeOnEscape={false} />);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape" }),
      );
    });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it("should render footer when provided", () => {
    render(
      <Modal {...defaultProps} footer={<button>Save</button>} />,
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("should have dialog role and aria-modal attribute", () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("should set aria-labelledby when title is provided", () => {
    render(<Modal {...defaultProps} title="My Modal" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
  });

  it("should set aria-describedby when description is provided", () => {
    render(
      <Modal
        {...defaultProps}
        title="Title"
        description="Modal description"
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-describedby", "modal-description");
  });

  it("should apply custom className", () => {
    render(<Modal {...defaultProps} className="custom-modal" />);
    expect(document.querySelector(".custom-modal")).toBeInTheDocument();
  });

  it("should set overflow hidden on body when open", () => {
    render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("should restore body overflow on unmount", () => {
    const { unmount } = render(<Modal {...defaultProps} />);
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("should render with different sizes", () => {
    const sizes = ["sm", "md", "lg", "xl", "full"] as const;
    const sizeClasses: Record<string, string> = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      full: "max-w-4xl",
    };

    sizes.forEach((size) => {
      const { unmount } = render(
        <Modal {...defaultProps} size={size}>
          <div>Size {size}</div>
        </Modal>,
      );
      expect(
        document.querySelector(`.${sizeClasses[size]}`),
      ).toBeInTheDocument();
      unmount();
    });
  });

  it("should not render header when no title and showCloseButton is false", () => {
    render(<Modal {...defaultProps} showCloseButton={false} />);
    expect(screen.queryByLabelText("Close modal")).not.toBeInTheDocument();
  });
});
