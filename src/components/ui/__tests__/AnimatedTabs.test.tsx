import { render, screen, fireEvent } from "@testing-library/react";
import { AnimatedTabs } from "../AnimatedTabs";

const sampleTabs = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "history", label: "History" },
];

describe("AnimatedTabs", () => {
  describe("rendering", () => {
    it("renders all tabs", () => {
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={jest.fn()}
        />,
      );
      expect(screen.getByText("Overview")).toBeInTheDocument();
      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("History")).toBeInTheDocument();
    });

    it("renders a tablist with correct role", () => {
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={jest.fn()}
        />,
      );
      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    it("renders each tab with role=tab", () => {
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={jest.fn()}
        />,
      );
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(3);
    });

    it("applies custom className to the container", () => {
      const { container } = render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={jest.fn()}
          className="custom-class"
        />,
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("active tab", () => {
    it("marks the active tab with aria-selected=true", () => {
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="details"
          onChange={jest.fn()}
        />,
      );
      const detailsTab = screen.getByRole("tab", { name: "Details" });
      expect(detailsTab).toHaveAttribute("aria-selected", "true");
    });

    it("marks non-active tabs with aria-selected=false", () => {
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={jest.fn()}
        />,
      );
      const detailsTab = screen.getByRole("tab", { name: "Details" });
      const historyTab = screen.getByRole("tab", { name: "History" });
      expect(detailsTab).toHaveAttribute("aria-selected", "false");
      expect(historyTab).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("onChange callback", () => {
    it("calls onChange with correct id when a tab is clicked", () => {
      const onChange = jest.fn();
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByRole("tab", { name: "Details" }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith("details");
    });

    it("calls onChange when clicking a different tab", () => {
      const onChange = jest.fn();
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByRole("tab", { name: "History" }));
      expect(onChange).toHaveBeenCalledWith("history");
    });
  });

  describe("keyboard navigation", () => {
    it("moves to next tab on ArrowRight", () => {
      const onChange = jest.fn();
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={onChange}
        />,
      );
      const overviewTab = screen.getByRole("tab", { name: "Overview" });
      fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
      expect(onChange).toHaveBeenCalledWith("details");
    });

    it("moves to previous tab on ArrowLeft", () => {
      const onChange = jest.fn();
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="details"
          onChange={onChange}
        />,
      );
      const detailsTab = screen.getByRole("tab", { name: "Details" });
      fireEvent.keyDown(detailsTab, { key: "ArrowLeft" });
      expect(onChange).toHaveBeenCalledWith("overview");
    });

    it("wraps to last tab on ArrowLeft from first tab", () => {
      const onChange = jest.fn();
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="overview"
          onChange={onChange}
        />,
      );
      const overviewTab = screen.getByRole("tab", { name: "Overview" });
      fireEvent.keyDown(overviewTab, { key: "ArrowLeft" });
      expect(onChange).toHaveBeenCalledWith("history");
    });

    it("wraps to first tab on ArrowRight from last tab", () => {
      const onChange = jest.fn();
      render(
        <AnimatedTabs
          tabs={sampleTabs}
          activeTab="history"
          onChange={onChange}
        />,
      );
      const historyTab = screen.getByRole("tab", { name: "History" });
      fireEvent.keyDown(historyTab, { key: "ArrowRight" });
      expect(onChange).toHaveBeenCalledWith("overview");
    });
  });
});
