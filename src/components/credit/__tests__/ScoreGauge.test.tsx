import React from "react";
import { render, screen } from "@testing-library/react";
import ScoreGauge, {
  getScoreColor,
  getScoreLabel,
  getScoreBgColor,
  getScoreTextColor,
} from "../ScoreGauge";

describe("ScoreGauge Component", () => {
  describe("Score Display", () => {
    it("should display the score value", () => {
      render(<ScoreGauge score={750} />);
      expect(screen.getByTestId("score-value")).toHaveTextContent("750");
    });

    it("should display score label by default", () => {
      render(<ScoreGauge score={750} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Very Good");
    });

    it("should hide label when showLabel is false", () => {
      render(<ScoreGauge score={750} showLabel={false} />);
      expect(screen.queryByTestId("score-label")).not.toBeInTheDocument();
    });

    it("should render SVG gauge", () => {
      render(<ScoreGauge score={750} />);
      expect(screen.getByTestId("score-gauge-svg")).toBeInTheDocument();
    });

    it("should have proper aria-label for accessibility", () => {
      render(<ScoreGauge score={750} />);
      expect(screen.getByRole("img")).toHaveAttribute(
        "aria-label",
        "Credit score 750, rated Very Good",
      );
    });
  });

  describe("Score Ratings", () => {
    it("should show Excellent for scores 800+", () => {
      render(<ScoreGauge score={820} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Excellent");
    });

    it("should show Very Good for scores 740-799", () => {
      render(<ScoreGauge score={760} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Very Good");
    });

    it("should show Good for scores 670-739", () => {
      render(<ScoreGauge score={700} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Good");
    });

    it("should show Fair for scores 580-669", () => {
      render(<ScoreGauge score={620} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Fair");
    });

    it("should show Poor for scores below 580", () => {
      render(<ScoreGauge score={520} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Poor");
    });
  });

  describe("Score Boundaries", () => {
    it("should handle minimum score (300)", () => {
      render(<ScoreGauge score={300} />);
      expect(screen.getByTestId("score-value")).toHaveTextContent("300");
      expect(screen.getByTestId("score-label")).toHaveTextContent("Poor");
    });

    it("should handle maximum score (850)", () => {
      render(<ScoreGauge score={850} />);
      expect(screen.getByTestId("score-value")).toHaveTextContent("850");
      expect(screen.getByTestId("score-label")).toHaveTextContent("Excellent");
    });

    it("should handle boundary score at 580 (Fair)", () => {
      render(<ScoreGauge score={580} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Fair");
    });

    it("should handle boundary score at 670 (Good)", () => {
      render(<ScoreGauge score={670} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Good");
    });

    it("should handle boundary score at 740 (Very Good)", () => {
      render(<ScoreGauge score={740} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Very Good");
    });

    it("should handle boundary score at 800 (Excellent)", () => {
      render(<ScoreGauge score={800} />);
      expect(screen.getByTestId("score-label")).toHaveTextContent("Excellent");
    });
  });

  describe("Score Change Indicator", () => {
    it("should display positive change with plus sign", () => {
      render(<ScoreGauge score={750} change={15} />);
      const changeEl = screen.getByTestId("score-change");
      expect(changeEl).toHaveTextContent("+15");
      expect(changeEl).toHaveClass("bg-green-100", "text-green-700");
    });

    it("should display negative change", () => {
      render(<ScoreGauge score={720} change={-10} />);
      const changeEl = screen.getByTestId("score-change");
      expect(changeEl).toHaveTextContent("-10");
      expect(changeEl).toHaveClass("bg-red-100", "text-red-700");
    });

    it("should not display change when value is 0", () => {
      render(<ScoreGauge score={720} change={0} />);
      expect(screen.queryByTestId("score-change")).not.toBeInTheDocument();
    });

    it("should not display change when undefined", () => {
      render(<ScoreGauge score={720} />);
      expect(screen.queryByTestId("score-change")).not.toBeInTheDocument();
    });
  });

  describe("Utility Functions", () => {
    describe("getScoreColor", () => {
      it("should return green for Excellent", () => {
        expect(getScoreColor(820)).toBe("#22C55E");
      });
      it("should return lime for Very Good", () => {
        expect(getScoreColor(760)).toBe("#84CC16");
      });
      it("should return yellow for Good", () => {
        expect(getScoreColor(700)).toBe("#EAB308");
      });
      it("should return orange for Fair", () => {
        expect(getScoreColor(620)).toBe("#F97316");
      });
      it("should return red for Poor", () => {
        expect(getScoreColor(520)).toBe("#EF4444");
      });
    });

    describe("getScoreLabel", () => {
      it("should return correct labels for each range", () => {
        expect(getScoreLabel(820)).toBe("Excellent");
        expect(getScoreLabel(760)).toBe("Very Good");
        expect(getScoreLabel(700)).toBe("Good");
        expect(getScoreLabel(620)).toBe("Fair");
        expect(getScoreLabel(520)).toBe("Poor");
      });
    });

    describe("getScoreBgColor", () => {
      it("should return correct background colors", () => {
        expect(getScoreBgColor(820)).toBe("bg-green-100");
        expect(getScoreBgColor(760)).toBe("bg-lime-100");
        expect(getScoreBgColor(700)).toBe("bg-yellow-100");
        expect(getScoreBgColor(620)).toBe("bg-orange-100");
        expect(getScoreBgColor(520)).toBe("bg-red-100");
      });
    });

    describe("getScoreTextColor", () => {
      it("should return correct text colors", () => {
        expect(getScoreTextColor(820)).toBe("text-green-600");
        expect(getScoreTextColor(760)).toBe("text-lime-600");
        expect(getScoreTextColor(700)).toBe("text-yellow-600");
        expect(getScoreTextColor(620)).toBe("text-orange-600");
        expect(getScoreTextColor(520)).toBe("text-red-600");
      });
    });
  });
});
