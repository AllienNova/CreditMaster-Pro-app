"use client";

/**
 * Model Selector Component
 *
 * Allows users to select AI models from the AIML API for different tasks.
 * Displays model capabilities, pricing, and performance metrics.
 */

import { useState, useMemo } from "react";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  category: "chat" | "completion" | "embedding" | "image" | "audio" | "code";
  description: string;
  contextWindow: number;
  inputCost: number; // per 1M tokens
  outputCost: number; // per 1M tokens
  speed: "fast" | "medium" | "slow";
  quality: "standard" | "high" | "premium";
  recommended?: boolean;
}

interface ModelSelectorProps {
  models?: AIModel[];
  selectedModel?: string;
  onSelect: (modelId: string) => void;
  category?: AIModel["category"];
  showPricing?: boolean;
  className?: string;
}

// Default models available through AIML API
const DEFAULT_MODELS: AIModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    category: "chat",
    description: "Most capable model for complex tasks",
    contextWindow: 128000,
    inputCost: 5.0,
    outputCost: 15.0,
    speed: "medium",
    quality: "premium",
    recommended: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    category: "chat",
    description: "Fast and cost-effective for most tasks",
    contextWindow: 128000,
    inputCost: 0.15,
    outputCost: 0.6,
    speed: "fast",
    quality: "high",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    category: "chat",
    description: "Excellent for analysis and writing",
    contextWindow: 200000,
    inputCost: 3.0,
    outputCost: 15.0,
    speed: "medium",
    quality: "premium",
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    category: "chat",
    description: "Fast responses for simple tasks",
    contextWindow: 200000,
    inputCost: 0.25,
    outputCost: 1.25,
    speed: "fast",
    quality: "standard",
  },
  {
    id: "llama-3.1-70b",
    name: "Llama 3.1 70B",
    provider: "Meta",
    category: "chat",
    description: "Open-source high-performance model",
    contextWindow: 128000,
    inputCost: 0.35,
    outputCost: 0.4,
    speed: "fast",
    quality: "high",
  },
  {
    id: "mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    category: "chat",
    description: "Strong reasoning capabilities",
    contextWindow: 32000,
    inputCost: 2.0,
    outputCost: 6.0,
    speed: "medium",
    quality: "high",
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    provider: "DeepSeek",
    category: "code",
    description: "Specialized for code generation",
    contextWindow: 64000,
    inputCost: 0.14,
    outputCost: 0.28,
    speed: "fast",
    quality: "high",
  },
  {
    id: "text-embedding-3-large",
    name: "Text Embedding 3 Large",
    provider: "OpenAI",
    category: "embedding",
    description: "High-quality text embeddings",
    contextWindow: 8191,
    inputCost: 0.13,
    outputCost: 0,
    speed: "fast",
    quality: "premium",
  },
];

export default function ModelSelector({
  models = DEFAULT_MODELS,
  selectedModel,
  onSelect,
  category,
  showPricing = true,
  className = "",
}: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    AIModel["category"] | "all"
  >(category || "all");

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesCategory =
        selectedCategory === "all" || model.category === selectedCategory;
      const matchesSearch =
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [models, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    const cats = new Set(models.map((m) => m.category));
    return ["all", ...Array.from(cats)] as const;
  }, [models]);

  const getSpeedBadge = (speed: AIModel["speed"]) => {
    const colors = {
      fast: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      slow: "bg-red-100 text-red-700",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colors[speed]}`}>
        {speed}
      </span>
    );
  };

  const getQualityBadge = (quality: AIModel["quality"]) => {
    const colors = {
      standard:
        "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200",
      high: "bg-blue-100 text-blue-700",
      premium: "bg-blue-100 text-blue-700",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colors[quality]}`}>
        {quality}
      </span>
    );
  };

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Select AI Model
      </h3>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) =>
            setSelectedCategory(e.target.value as AIModel["category"] | "all")
          }
          className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all"
                ? "All Categories"
                : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Model List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredModels.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onSelect(model.id)}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${selectedModel === model.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900"}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {model.name}
                  </span>
                  {model.recommended && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {model.provider} • {model.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {getSpeedBadge(model.speed)}
                  {getQualityBadge(model.quality)}
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {(model.contextWindow / 1000).toFixed(0)}K context
                  </span>
                </div>
              </div>
              {showPricing && (
                <div className="text-right text-xs text-gray-500 dark:text-slate-400">
                  <div>${model.inputCost}/M in</div>
                  <div>${model.outputCost}/M out</div>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <p className="text-center text-gray-500 dark:text-slate-400 py-8">
          No models found matching your criteria
        </p>
      )}
    </div>
  );
}
