/**
 * Tests for Tooltip Components (Tooltip, InfoTooltip, HelpTooltip,
 * ContextualHelp, InlineHelp, LabelWithTooltip)
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { createPortal } from "react-dom";
import Tooltip, {
  InfoTooltip,
  HelpTooltip,
  ContextualHelp,
  InlineHelp,
  LabelWithTooltip,
} from "../Tooltip";

// Mock createPortal to render inline
jest.mock("react-dom", () => {
  const actual = jest.requireActual("react-dom");
  return {
    ...actual,
    createPortal: jest.fn((element) => element),
  };
});

// Mock heroicons
jest.mock("@heroicons/react/24/outline", () => ({
  InformationCircleIcon: (props: Record<string, unknown>) => (
    <svg data-testid="info-icon" {...props} />
  ),
  QuestionMarkCircleIcon: (props: Record<string, unknown>) => (
    <svg data-testid="question-icon" {...props} />
  ),
}));

describe("Tooltip", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (createPortal as jest.Mock).mockImplementation((element) => element);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render children", () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("should not show tooltip content initially", () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );
    expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
  });

  it("should show tooltip content on mouse enter after delay", () => {
    render(
      <Tooltip content="Tooltip text" delay={200}>
        <button>Hover me</button>
      </Tooltip>,
    );

    const trigger = screen.getByText("Hover me").closest(".inline-block")!;
    fireEvent.mouseEnter(trigger);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText("Tooltip text")).toBeInTheDocument();
  });

  it("should hide tooltip content on mouse leave", () => {
    render(
      <Tooltip content="Tooltip text" delay={200}>
        <button>Hover me</button>
      </Tooltip>,
    );

    const trigger = screen.getByText("Hover me").closest(".inline-block")!;
    fireEvent.mouseEnter(trigger);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByText("Tooltip text")).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
  });

  it("should not show tooltip if mouse leaves before delay completes", () => {
    render(
      <Tooltip content="Tooltip text" delay={200}>
        <button>Hover me</button>
      </Tooltip>,
    );

    const trigger = screen.getByText("Hover me").closest(".inline-block")!;
    fireEvent.mouseEnter(trigger);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.mouseLeave(trigger);
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.queryByText("Tooltip text")).not.toBeInTheDocument();
  });

  it("should render trigger as inline-block div", () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>,
    );
    const trigger = screen.getByText("Hover me").closest(".inline-block");
    expect(trigger).toBeInTheDocument();
  });
});

describe("ContextualHelp", () => {
  it("should render title and content", () => {
    render(
      <ContextualHelp title="Help Title" content="Help content text" />,
    );
    expect(screen.getByText("Help Title")).toBeInTheDocument();
    expect(screen.getByText("Help content text")).toBeInTheDocument();
  });

  it("should render info icon", () => {
    render(
      <ContextualHelp title="Help Title" content="Help content text" />,
    );
    expect(screen.getByTestId("info-icon")).toBeInTheDocument();
  });

  it("should render learn more link when learnMoreUrl is provided", () => {
    render(
      <ContextualHelp
        title="Help Title"
        content="Help content text"
        learnMoreUrl="https://example.com"
      />,
    );
    const link = screen.getByText(/Learn more/);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should not render learn more link when learnMoreUrl is not provided", () => {
    render(
      <ContextualHelp title="Help Title" content="Help content text" />,
    );
    expect(screen.queryByText(/Learn more/)).not.toBeInTheDocument();
  });

  it("should have blue background styling", () => {
    const { container } = render(
      <ContextualHelp title="Help Title" content="Help content text" />,
    );
    expect(container.querySelector(".bg-blue-50")).toBeInTheDocument();
  });
});

describe("InlineHelp", () => {
  it("should render children text", () => {
    render(<InlineHelp>This is help text</InlineHelp>);
    expect(screen.getByText("This is help text")).toBeInTheDocument();
  });

  it("should render info icon", () => {
    render(<InlineHelp>Help</InlineHelp>);
    expect(screen.getByTestId("info-icon")).toBeInTheDocument();
  });

  it("should render as paragraph element", () => {
    const { container } = render(<InlineHelp>Help text</InlineHelp>);
    const paragraph = container.querySelector("p");
    expect(paragraph).toBeInTheDocument();
    expect(paragraph?.className).toContain("text-sm");
    expect(paragraph?.className).toContain("text-gray-500");
  });
});

describe("LabelWithTooltip", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (createPortal as jest.Mock).mockImplementation((element) => element);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render label text", () => {
    render(<LabelWithTooltip label="Email" tooltip="Your email address" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("should render required asterisk when required", () => {
    render(
      <LabelWithTooltip
        label="Email"
        tooltip="Your email address"
        required={true}
      />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("should not render required asterisk when not required", () => {
    render(<LabelWithTooltip label="Email" tooltip="Your email address" />);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("should render as label element", () => {
    const { container } = render(
      <LabelWithTooltip label="Email" tooltip="Your email address" />,
    );
    const label = container.querySelector("label");
    expect(label).toBeInTheDocument();
  });

  it("should render info icon for tooltip trigger", () => {
    render(<LabelWithTooltip label="Email" tooltip="Your email address" />);
    expect(screen.getByTestId("info-icon")).toBeInTheDocument();
  });
});

describe("InfoTooltip", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (createPortal as jest.Mock).mockImplementation((element) => element);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render info icon", () => {
    render(<InfoTooltip content="Info text" />);
    expect(screen.getByTestId("info-icon")).toBeInTheDocument();
  });

  it("should show tooltip content on hover", () => {
    render(<InfoTooltip content="Info text" />);
    const trigger = screen
      .getByTestId("info-icon")
      .closest(".inline-block")!
      .closest(".inline-block")!;
    fireEvent.mouseEnter(trigger);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByText("Info text")).toBeInTheDocument();
  });
});

describe("HelpTooltip", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (createPortal as jest.Mock).mockImplementation((element) => element);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render question mark icon", () => {
    render(<HelpTooltip content="Help text" />);
    expect(screen.getByTestId("question-icon")).toBeInTheDocument();
  });

  it("should show tooltip content on hover", () => {
    render(<HelpTooltip content="Help text" />);
    const trigger = screen
      .getByTestId("question-icon")
      .closest(".inline-block")!
      .closest(".inline-block")!;
    fireEvent.mouseEnter(trigger);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByText("Help text")).toBeInTheDocument();
  });
});
