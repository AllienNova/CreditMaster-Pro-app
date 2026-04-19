import { render, screen, fireEvent } from "@testing-library/react";
import { AnimatedSwitch } from "../AnimatedSwitch";

describe("AnimatedSwitch", () => {
  describe("rendering", () => {
    it("renders without label", () => {
      render(<AnimatedSwitch checked={false} onChange={jest.fn()} />);
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("renders with label", () => {
      render(
        <AnimatedSwitch
          checked={false}
          onChange={jest.fn()}
          label="Enable notifications"
        />,
      );
      expect(screen.getByText("Enable notifications")).toBeInTheDocument();
    });
  });

  describe("toggle behavior", () => {
    it("calls onChange with true when unchecked switch is clicked", () => {
      const onChange = jest.fn();
      render(<AnimatedSwitch checked={false} onChange={onChange} />);
      fireEvent.click(screen.getByRole("switch"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("calls onChange with false when checked switch is clicked", () => {
      const onChange = jest.fn();
      render(<AnimatedSwitch checked={true} onChange={onChange} />);
      fireEvent.click(screen.getByRole("switch"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it("calls onChange when label is clicked", () => {
      const onChange = jest.fn();
      render(
        <AnimatedSwitch
          checked={false}
          onChange={onChange}
          label="Toggle me"
        />,
      );
      fireEvent.click(screen.getByText("Toggle me"));
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe("disabled state", () => {
    it("does not call onChange when disabled and clicked", () => {
      const onChange = jest.fn();
      render(<AnimatedSwitch checked={false} onChange={onChange} disabled />);
      fireEvent.click(screen.getByRole("switch"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("sets aria-disabled when disabled", () => {
      render(<AnimatedSwitch checked={false} onChange={jest.fn()} disabled />);
      expect(screen.getByRole("switch")).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("removes from tab order when disabled", () => {
      render(<AnimatedSwitch checked={false} onChange={jest.fn()} disabled />);
      expect(screen.getByRole("switch")).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("keyboard support", () => {
    it("toggles on Space key press", () => {
      const onChange = jest.fn();
      render(<AnimatedSwitch checked={false} onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole("switch"), { key: " " });
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("toggles on Enter key press", () => {
      const onChange = jest.fn();
      render(<AnimatedSwitch checked={true} onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole("switch"), { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it("does not toggle on other key presses", () => {
      const onChange = jest.fn();
      render(<AnimatedSwitch checked={false} onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole("switch"), { key: "Tab" });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("aria attributes", () => {
    it("has role=switch", () => {
      render(<AnimatedSwitch checked={false} onChange={jest.fn()} />);
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    it("reflects checked state in aria-checked", () => {
      const { rerender } = render(
        <AnimatedSwitch checked={false} onChange={jest.fn()} />,
      );
      expect(screen.getByRole("switch")).toHaveAttribute(
        "aria-checked",
        "false",
      );

      rerender(<AnimatedSwitch checked={true} onChange={jest.fn()} />);
      expect(screen.getByRole("switch")).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    it("accepts a custom id", () => {
      render(
        <AnimatedSwitch checked={false} onChange={jest.fn()} id="my-switch" />,
      );
      expect(screen.getByRole("switch")).toHaveAttribute("id", "my-switch");
    });
  });
});
