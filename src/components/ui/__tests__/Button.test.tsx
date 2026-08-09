import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../Button";

describe("Button", () => {
  describe("variants", () => {
    it("renders primary variant by default", () => {
      render(<Button>Click me</Button>);
      const btn = screen.getByRole("button", { name: "Click me" });
      expect(btn.className).toContain("bg-emerald-600");
    });

    it("renders secondary variant", () => {
      render(<Button variant="secondary">Cancel</Button>);
      const btn = screen.getByRole("button", { name: "Cancel" });
      expect(btn.className).toContain("border");
      expect(btn.className).toContain("border-gray-300");
    });

    it("renders ghost variant", () => {
      render(<Button variant="ghost">More</Button>);
      const btn = screen.getByRole("button", { name: "More" });
      expect(btn.className).toContain("text-gray-500");
    });

    it("renders destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>);
      const btn = screen.getByRole("button", { name: "Delete" });
      expect(btn.className).toContain("bg-red-600");
    });
  });

  describe("sizes", () => {
    it("renders md size by default", () => {
      render(<Button>Default</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("px-4 py-2");
    });

    it("renders sm size", () => {
      render(<Button size="sm">Small</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("px-3 py-1.5");
    });

    it("renders lg size", () => {
      render(<Button size="lg">Large</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("px-6 py-3");
    });

    it("renders icon size", () => {
      render(
        <Button size="icon" aria-label="Settings">
          <svg />
        </Button>,
      );
      const btn = screen.getByRole("button", { name: "Settings" });
      expect(btn.className).toContain("p-2");
    });
  });

  describe("loading state", () => {
    it("shows spinner when loading", () => {
      render(<Button isLoading>Submit</Button>);
      const btn = screen.getByRole("button");
      const spinner = btn.querySelector("svg.animate-spin");
      expect(spinner).toBeTruthy();
    });

    it("is disabled when loading", () => {
      render(<Button isLoading>Submit</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("disabled state", () => {
    it("is disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("has disabled styles", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button").className).toContain(
        "disabled:opacity-50",
      );
    });
  });

  describe("click handler", () => {
    it("calls onClick when clicked", () => {
      const onClick = jest.fn();
      render(<Button onClick={onClick}>Click</Button>);
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", () => {
      const onClick = jest.fn();
      render(
        <Button onClick={onClick} disabled>
          Click
        </Button>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("icons", () => {
    it("renders left icon", () => {
      render(
        <Button leftIcon={<span data-testid="left-icon" />}>With Icon</Button>,
      );
      expect(screen.getByTestId("left-icon")).toBeTruthy();
    });

    it("renders right icon", () => {
      render(
        <Button rightIcon={<span data-testid="right-icon" />}>
          With Icon
        </Button>,
      );
      expect(screen.getByTestId("right-icon")).toBeTruthy();
    });

    it("hides left icon when loading", () => {
      render(
        <Button isLoading leftIcon={<span data-testid="left-icon" />}>
          Loading
        </Button>,
      );
      expect(screen.queryByTestId("left-icon")).toBeNull();
    });
  });

  describe("accessibility", () => {
    it("includes focus-visible ring styles", () => {
      render(<Button>Accessible</Button>);
      const btn = screen.getByRole("button");
      expect(btn.className).toContain("focus-visible:ring-2");
      expect(btn.className).toContain("focus-visible:ring-emerald-500");
    });

    it("supports custom className", () => {
      render(<Button className="mt-4">Custom</Button>);
      expect(screen.getByRole("button").className).toContain("mt-4");
    });

    it("forwards ref", () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
