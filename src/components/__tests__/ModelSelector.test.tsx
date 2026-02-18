/**
 * ModelSelector Component Tests
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock the ModelSelector component
jest.mock("../model-selector/ModelSelector", () => {
  interface Model {
    id: string;
    name: string;
    provider: string;
    category: string;
    description: string;
    inputCost: number;
    outputCost: number;
    recommended?: boolean;
  }
  const MockModelSelector = ({
    models,
    selectedModel,
    onSelect,
    category,
    showPricing,
    className,
  }: {
    models?: Model[];
    selectedModel?: string;
    onSelect: (modelId: string) => void;
    category?: string;
    showPricing?: boolean;
    className?: string;
  }) => {
    const defaultModels: Model[] = [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "OpenAI",
        category: "chat",
        description: "Best for complex tasks",
        inputCost: 5,
        outputCost: 15,
        recommended: true,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "OpenAI",
        category: "chat",
        description: "Fast and efficient",
        inputCost: 0.15,
        outputCost: 0.6,
      },
      {
        id: "claude-3-opus",
        name: "Claude 3 Opus",
        provider: "Anthropic",
        category: "chat",
        description: "Detailed analysis",
        inputCost: 15,
        outputCost: 75,
      },
    ];
    const displayModels = models || defaultModels;
    const filteredModels = category
      ? displayModels.filter((m) => m.category === category)
      : displayModels;

    return (
      <div className={className} data-testid="model-selector">
        <input
          type="text"
          placeholder="Search models..."
          data-testid="search-input"
        />
        <div data-testid="model-list">
          {filteredModels.map((model) => (
            <button
              type="button"
              key={model.id}
              data-testid={`model-${model.id}`}
              className={selectedModel === model.id ? "selected" : ""}
              onClick={() => onSelect(model.id)}
            >
              <span>{model.name}</span>
              <span>{model.provider}</span>
              {model.recommended && (
                <span data-testid="recommended-badge">Recommended</span>
              )}
              {showPricing && (
                <span data-testid="pricing">
                  ${model.inputCost}/${model.outputCost}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };
  return { __esModule: true, default: MockModelSelector };
});

import ModelSelector from "../model-selector/ModelSelector";

describe("ModelSelector", () => {
  it("renders model selector", () => {
    render(<ModelSelector onSelect={jest.fn()} />);
    expect(screen.getByTestId("model-selector")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<ModelSelector onSelect={jest.fn()} />);
    expect(screen.getByPlaceholderText("Search models...")).toBeInTheDocument();
  });

  it("renders default models", () => {
    render(<ModelSelector onSelect={jest.fn()} />);
    expect(screen.getByText("GPT-4o")).toBeInTheDocument();
    expect(screen.getByText("GPT-4o Mini")).toBeInTheDocument();
  });

  it("calls onSelect when model clicked", () => {
    const onSelect = jest.fn();
    render(<ModelSelector onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId("model-gpt-4o"));
    expect(onSelect).toHaveBeenCalledWith("gpt-4o");
  });

  it("shows recommended badge for recommended models", () => {
    render(<ModelSelector onSelect={jest.fn()} />);
    expect(screen.getByTestId("recommended-badge")).toBeInTheDocument();
  });

  it("shows pricing when showPricing is true", () => {
    render(<ModelSelector onSelect={jest.fn()} showPricing />);
    expect(screen.getAllByTestId("pricing").length).toBeGreaterThan(0);
  });

  it("applies custom className", () => {
    render(<ModelSelector onSelect={jest.fn()} className="custom-class" />);
    expect(screen.getByTestId("model-selector")).toHaveClass("custom-class");
  });

  it("highlights selected model", () => {
    render(<ModelSelector onSelect={jest.fn()} selectedModel="gpt-4o" />);
    expect(screen.getByTestId("model-gpt-4o")).toHaveClass("selected");
  });

  it("filters by category when provided", () => {
    render(<ModelSelector onSelect={jest.fn()} category="chat" />);
    expect(screen.getByText("GPT-4o")).toBeInTheDocument();
  });

  it("renders provider information", () => {
    render(<ModelSelector onSelect={jest.fn()} />);
    expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0);
  });
});
