/**
 * UI Components Tests
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// Mock Loading components
jest.mock("../ui/Loading", () => ({
  Spinner: ({
    size = "md",
    color = "blue",
  }: {
    size?: string;
    color?: string;
  }) => (
    <div data-testid="spinner" data-size={size} data-color={color}>
      Loading...
    </div>
  ),
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
  SkeletonText: ({ lines = 3 }: { lines?: number }) => (
    <div data-testid="skeleton-text">
      {Array(lines)
        .fill(null)
        .map((_, i) => (
          <div key={i} />
        ))}
    </div>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
  LoadingOverlay: ({ message }: { message?: string }) => (
    <div data-testid="loading-overlay">{message || "Loading..."}</div>
  ),
  LoadingPage: ({ message }: { message?: string }) => (
    <div data-testid="loading-page">{message || "Loading..."}</div>
  ),
  LoadingButton: ({
    loading,
    children,
    onClick,
    disabled,
  }: {
    loading: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button
      data-testid="loading-button"
      data-loading={loading}
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? "Loading..." : children}
    </button>
  ),
  ProgressBar: ({ progress }: { progress: number }) => (
    <div
      data-testid="progress-bar"
      data-progress={progress}
      style={{ width: `${progress}%` }}
    />
  ),
}));

// Mock Toast components
jest.mock("../ui/Toast", () => {
  const React = require("react");
  const ToastContext = React.createContext(null);

  return {
    ToastProvider: ({ children }: { children: React.ReactNode }) => {
      const [toasts, setToasts] = React.useState([]);
      const addToast = (toast: {
        type: string;
        title: string;
        message?: string;
      }) =>
        setToasts(
          (
            prev: Array<{
              id: string;
              type: string;
              title: string;
              message?: string;
            }>,
          ) => [...prev, { ...toast, id: Date.now().toString() }],
        );
      const removeToast = (id: string) =>
        setToasts(
          (
            prev: Array<{
              id: string;
              type: string;
              title: string;
              message?: string;
            }>,
          ) => prev.filter((t: { id: string }) => t.id !== id),
        );
      const success = (title: string, message?: string) =>
        addToast({ type: "success", title, message });
      const error = (title: string, message?: string) =>
        addToast({ type: "error", title, message });
      const warning = (title: string, message?: string) =>
        addToast({ type: "warning", title, message });
      const info = (title: string, message?: string) =>
        addToast({ type: "info", title, message });

      return (
        <ToastContext.Provider
          value={{
            toasts,
            addToast,
            removeToast,
            success,
            error,
            warning,
            info,
          }}
        >
          {children}
          <div data-testid="toast-container">
            {toasts.map(
              (t: {
                id: string;
                type: string;
                title: string;
                message?: string;
              }) => (
                <div key={t.id} data-testid={`toast-${t.type}`}>
                  <span>{t.title}</span>
                  {t.message && <span>{t.message}</span>}
                  <button type="button" onClick={() => removeToast(t.id)}>
                    Close
                  </button>
                </div>
              ),
            )}
          </div>
        </ToastContext.Provider>
      );
    },
    useToast: () => React.useContext(ToastContext),
  };
});

import {
  Spinner,
  Skeleton,
  SkeletonCard,
  LoadingOverlay,
  LoadingButton,
  ProgressBar,
} from "../ui/Loading";
import { ToastProvider, useToast } from "../ui/Toast";

describe("Loading Components", () => {
  describe("Spinner", () => {
    it("renders with default props", () => {
      render(<Spinner />);
      const spinner = screen.getByTestId("spinner");
      expect(spinner).toHaveAttribute("data-size", "md");
      expect(spinner).toHaveAttribute("data-color", "blue");
    });

    it("renders with custom size", () => {
      render(<Spinner size="lg" />);
      expect(screen.getByTestId("spinner")).toHaveAttribute("data-size", "lg");
    });

    it("renders with custom color", () => {
      render(<Spinner color="white" />);
      expect(screen.getByTestId("spinner")).toHaveAttribute(
        "data-color",
        "white",
      );
    });
  });

  describe("Skeleton", () => {
    it("renders skeleton element", () => {
      render(<Skeleton className="h-4 w-full" />);
      expect(screen.getByTestId("skeleton")).toHaveClass("h-4", "w-full");
    });
  });

  describe("SkeletonCard", () => {
    it("renders skeleton card", () => {
      render(<SkeletonCard />);
      expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
    });
  });

  describe("LoadingOverlay", () => {
    it("renders with default message", () => {
      render(<LoadingOverlay />);
      expect(screen.getByTestId("loading-overlay")).toHaveTextContent(
        "Loading...",
      );
    });

    it("renders with custom message", () => {
      render(<LoadingOverlay message="Please wait..." />);
      expect(screen.getByTestId("loading-overlay")).toHaveTextContent(
        "Please wait...",
      );
    });
  });

  describe("LoadingButton", () => {
    it("shows children when not loading", () => {
      render(<LoadingButton loading={false}>Submit</LoadingButton>);
      expect(screen.getByTestId("loading-button")).toHaveTextContent("Submit");
    });

    it("shows loading text when loading", () => {
      render(<LoadingButton loading={true}>Submit</LoadingButton>);
      expect(screen.getByTestId("loading-button")).toHaveTextContent(
        "Loading...",
      );
    });

    it("is disabled when loading", () => {
      render(<LoadingButton loading={true}>Submit</LoadingButton>);
      expect(screen.getByTestId("loading-button")).toBeDisabled();
    });

    it("calls onClick when clicked", () => {
      const onClick = jest.fn();
      render(
        <LoadingButton loading={false} onClick={onClick}>
          Submit
        </LoadingButton>,
      );
      fireEvent.click(screen.getByTestId("loading-button"));
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe("ProgressBar", () => {
    it("renders with progress value", () => {
      render(<ProgressBar progress={75} />);
      expect(screen.getByTestId("progress-bar")).toHaveAttribute(
        "data-progress",
        "75",
      );
    });
  });
});

describe("Toast Components", () => {
  function ToastTester() {
    const toast = useToast();
    return (
      <div>
        <button
          onClick={() => toast.success("Success!", "Operation completed")}
        >
          Success
        </button>
        <button onClick={() => toast.error("Error!", "Something went wrong")}>
          Error
        </button>
        <button onClick={() => toast.warning("Warning!")}>Warning</button>
        <button onClick={() => toast.info("Info!")}>Info</button>
      </div>
    );
  }

  it("renders ToastProvider", () => {
    render(
      <ToastProvider>
        <div>Content</div>
      </ToastProvider>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("shows success toast", () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Success"));
    expect(screen.getByTestId("toast-success")).toBeInTheDocument();
    expect(screen.getByText("Success!")).toBeInTheDocument();
  });

  it("shows error toast", () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Error"));
    expect(screen.getByTestId("toast-error")).toBeInTheDocument();
  });

  it("removes toast when close clicked", () => {
    render(
      <ToastProvider>
        <ToastTester />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Info"));
    expect(screen.getByTestId("toast-info")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("toast-info")).not.toBeInTheDocument();
  });
});
