import { render, screen, fireEvent } from "@testing-library/react";
import { InteractiveCard } from "../InteractiveCard";

describe("InteractiveCard", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(
        <InteractiveCard>
          <span>Card content</span>
        </InteractiveCard>,
      );
      expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <InteractiveCard>
          <h2>Title</h2>
          <p>Description</p>
        </InteractiveCard>,
      );
      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("renders as div by default", () => {
      const { container } = render(<InteractiveCard>content</InteractiveCard>);
      expect(container.querySelector("div")).toBeInTheDocument();
    });

    it("renders as article when specified", () => {
      const { container } = render(
        <InteractiveCard as="article">content</InteractiveCard>,
      );
      expect(container.querySelector("article")).toBeInTheDocument();
    });

    it("renders as li when specified", () => {
      const { container } = render(
        <ul>
          <InteractiveCard as="li">content</InteractiveCard>
        </ul>,
      );
      expect(container.querySelector("li")).toBeInTheDocument();
    });
  });

  describe("onClick handler", () => {
    it("calls onClick when clicked", () => {
      const onClick = jest.fn();
      render(<InteractiveCard onClick={onClick}>Clickable</InteractiveCard>);
      fireEvent.click(screen.getByText("Clickable"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not throw when no onClick is provided", () => {
      expect(() => {
        render(<InteractiveCard>No handler</InteractiveCard>);
        fireEvent.click(screen.getByText("No handler"));
      }).not.toThrow();
    });
  });

  describe("className", () => {
    it("applies custom className", () => {
      const { container } = render(
        <InteractiveCard className="p-4 rounded-lg">content</InteractiveCard>,
      );
      expect(container.firstChild).toHaveClass("p-4");
      expect(container.firstChild).toHaveClass("rounded-lg");
    });

    it("applies cursor-pointer when onClick is provided", () => {
      const { container } = render(
        <InteractiveCard onClick={jest.fn()}>content</InteractiveCard>,
      );
      expect(container.firstChild).toHaveClass("cursor-pointer");
    });

    it("does not apply cursor-pointer when no onClick", () => {
      const { container } = render(<InteractiveCard>content</InteractiveCard>);
      expect(container.firstChild).not.toHaveClass("cursor-pointer");
    });
  });
});
