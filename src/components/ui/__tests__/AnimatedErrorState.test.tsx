/**
 * Tests for AnimatedErrorState component
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AnimatedErrorState } from "../AnimatedErrorState";

// framer-motion mocked by jest transform; FadeIn renders a plain div in tests
jest.mock("@/components/ui/animations/FadeIn", () => ({
  FadeIn: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

const VARIANTS = [
  "network-error",
  "server-error",
  "not-found",
  "timeout",
  "generic",
] as const;

describe("AnimatedErrorState", () => {
  describe("renders all variants", () => {
    VARIANTS.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        const { container } = render(
          <AnimatedErrorState
            variant={variant}
            title="Something went wrong"
          />,
        );
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("content display", () => {
    it("renders the title", () => {
      render(
        <AnimatedErrorState variant="generic" title="Connection failed" />,
      );
      expect(screen.getByText("Connection failed")).toBeInTheDocument();
    });

    it("renders description when provided", () => {
      render(
        <AnimatedErrorState
          variant="generic"
          title="Error"
          description="Please check your internet connection."
        />,
      );
      expect(
        screen.getByText("Please check your internet connection."),
      ).toBeInTheDocument();
    });

    it("does not render description when omitted", () => {
      render(<AnimatedErrorState variant="generic" title="Error" />);
      // No paragraph text beyond the title
      const paragraphs = screen.queryAllByRole("paragraph");
      expect(paragraphs).toHaveLength(0);
    });

    it("applies custom className", () => {
      const { container } = render(
        <AnimatedErrorState
          variant="generic"
          title="Error"
          className="custom-error-class"
        />,
      );
      expect(container.querySelector(".custom-error-class")).toBeInTheDocument();
    });
  });

  describe("retry button", () => {
    it("renders retry button when onRetry is provided", () => {
      render(
        <AnimatedErrorState
          variant="generic"
          title="Error"
          onRetry={jest.fn()}
        />,
      );
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("does not render retry button when onRetry is omitted", () => {
      render(<AnimatedErrorState variant="generic" title="Error" />);
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("uses default retry label", () => {
      render(
        <AnimatedErrorState
          variant="generic"
          title="Error"
          onRetry={jest.fn()}
        />,
      );
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    it("uses custom retry label", () => {
      render(
        <AnimatedErrorState
          variant="generic"
          title="Error"
          onRetry={jest.fn()}
          retryLabel="Reload page"
        />,
      );
      expect(screen.getByText("Reload page")).toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined);
      render(
        <AnimatedErrorState
          variant="generic"
          title="Error"
          onRetry={onRetry}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
    });

    it("shows loading state while retrying", async () => {
      let resolve!: () => void;
      const onRetry = jest.fn(
        () =>
          new Promise<void>((r) => {
            resolve = r;
          }),
      );
      const { getByRole } = render(
        <AnimatedErrorState
          variant="generic"
          title="Error"
          onRetry={onRetry}
        />,
      );
      act(() => {
        fireEvent.click(getByRole("button"));
      });
      await waitFor(() => {
        expect(getByRole("button")).toBeDisabled();
      });
      await act(async () => {
        resolve();
      });
    });
  });

  describe("SVG illustrations are unique per variant", () => {
    it("network-error has an svg with style element", () => {
      const { container } = render(
        <AnimatedErrorState variant="network-error" title="No network" />,
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("timeout has an svg illustration", () => {
      const { container } = render(
        <AnimatedErrorState variant="timeout" title="Timed out" />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("not-found has an svg illustration", () => {
      const { container } = render(
        <AnimatedErrorState variant="not-found" title="Not found" />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("server-error has an svg illustration", () => {
      const { container } = render(
        <AnimatedErrorState variant="server-error" title="Server error" />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
