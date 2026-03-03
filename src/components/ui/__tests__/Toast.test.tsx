/**
 * Tests for Toast Component and ToastProvider
 */

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ToastProvider, useToast } from "../Toast";

// Test component that uses the toast hook
function TestConsumer() {
  const { success, error, warning, info, toasts, removeToast } = useToast();
  return (
    <div>
      <button onClick={() => success("Success!", "It worked")}>
        Add Success
      </button>
      <button onClick={() => error("Error!", "Something failed")}>
        Add Error
      </button>
      <button onClick={() => warning("Warning!", "Be careful")}>
        Add Warning
      </button>
      <button onClick={() => info("Info!", "FYI")}>Add Info</button>
      {toasts.length > 0 && (
        <button onClick={() => removeToast(toasts[0].id)}>
          Remove First
        </button>
      )}
      <span data-testid="toast-count">{toasts.length}</span>
    </div>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should render children within ToastProvider", () => {
    render(
      <ToastProvider>
        <div>App content</div>
      </ToastProvider>,
    );
    expect(screen.getByText("App content")).toBeInTheDocument();
  });

  it("should throw error when useToast is used outside ToastProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useToast must be used within a ToastProvider");
    consoleSpy.mockRestore();
  });

  it("should add a success toast", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Add Success"));
    expect(screen.getByText("Success!")).toBeInTheDocument();
    expect(screen.getByText("It worked")).toBeInTheDocument();
  });

  it("should add an error toast", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Add Error"));
    expect(screen.getByText("Error!")).toBeInTheDocument();
    expect(screen.getByText("Something failed")).toBeInTheDocument();
  });

  it("should add a warning toast", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Add Warning"));
    expect(screen.getByText("Warning!")).toBeInTheDocument();
    expect(screen.getByText("Be careful")).toBeInTheDocument();
  });

  it("should add an info toast", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Add Info"));
    expect(screen.getByText("Info!")).toBeInTheDocument();
    expect(screen.getByText("FYI")).toBeInTheDocument();
  });

  it("should add multiple toasts", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Add Success"));
    fireEvent.click(screen.getByText("Add Error"));
    expect(screen.getByTestId("toast-count").textContent).toBe("2");
  });

  it("should remove a toast manually", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Add Success"));
    expect(screen.getByTestId("toast-count").textContent).toBe("1");
    fireEvent.click(screen.getByText("Remove First"));
    expect(screen.getByTestId("toast-count").textContent).toBe("0");
  });

  it("should auto-dismiss toast after duration", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Add Success"));
    expect(screen.getByText("Success!")).toBeInTheDocument();

    // Default duration is 5000ms + 300ms exit animation
    act(() => {
      jest.advanceTimersByTime(5300);
    });

    await waitFor(() => {
      expect(screen.queryByText("Success!")).not.toBeInTheDocument();
    });
  });

  it("should dismiss toast when close button is clicked", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Add Success"));
    expect(screen.getByText("Success!")).toBeInTheDocument();

    // Find and click the close button within the toast
    const closeButtons = document.querySelectorAll(
      ".flex-shrink-0.text-gray-400",
    );
    const closeButton = closeButtons[closeButtons.length - 1] as HTMLElement;
    fireEvent.click(closeButton);

    // Wait for exit animation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByText("Success!")).not.toBeInTheDocument();
    });
  });
});
