"use client";

import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import DisputeGenerator from "@/components/aiml/DisputeGenerator";
import CreditAnalyzer from "@/components/aiml/CreditAnalyzer";
import LoanStrategyCalculator from "@/components/aiml/LoanStrategyCalculator";
import AIChat from "@/components/aiml/AIChat";
import { TaskType } from "@/lib/model-router";

type ActiveTool = "dispute" | "analyzer" | "loan" | "chat";

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState<ActiveTool>("chat");

  const tools = [
    {
      id: "chat" as ActiveTool,
      name: "AI Chat Assistant",
      description: "General purpose AI assistant for credit repair questions",
      icon: "chat",
      model: "GPT-4o",
    },
    {
      id: "dispute" as ActiveTool,
      name: "Dispute Generator",
      description: "Generate professional credit dispute letters",
      icon: "document-text",
      model: "Claude 4.5 Sonnet",
    },
    {
      id: "analyzer" as ActiveTool,
      name: "Credit Analyzer",
      description: "Comprehensive credit report analysis",
      icon: "chart-bar",
      model: "DeepSeek R1",
    },
    {
      id: "loan" as ActiveTool,
      name: "Loan Strategy",
      description: "Calculate optimal student loan repayment strategy",
      icon: "banknotes",
      model: "DeepSeek V3.1",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">AI-Powered Tools</h1>
          <p className="text-xl opacity-90">
            Access 300+ AI models for credit repair and financial planning
          </p>
        </div>
      </div>

      {/* Tool Selector */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`p-6 rounded-lg text-left transition-all ${
                activeTool === tool.id
                  ? "bg-blue-600 text-white shadow-lg transform scale-105"
                  : "bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 hover:shadow-md hover:scale-102"
              }`}
            >
              <Icon name={tool.icon} className="w-10 h-10 mb-3 inline-block" />
              <h3 className="text-lg font-semibold mb-2">{tool.name}</h3>
              <p
                className={`text-sm mb-3 ${
                  activeTool === tool.id
                    ? "text-blue-100"
                    : "text-gray-600 dark:text-slate-300"
                }`}
              >
                {tool.description}
              </p>
              <div
                className={`text-xs ${
                  activeTool === tool.id
                    ? "text-blue-200"
                    : "text-gray-500 dark:text-slate-400"
                }`}
              >
                Model: {tool.model}
              </div>
            </button>
          ))}
        </div>

        {/* Active Tool */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
          {activeTool === "chat" && (
            <div className="h-[600px]">
              <AIChat taskType={TaskType.GENERAL_CHAT} />
            </div>
          )}
          {activeTool === "dispute" && <DisputeGenerator />}
          {activeTool === "analyzer" && <CreditAnalyzer />}
          {activeTool === "loan" && <LoanStrategyCalculator />}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">About Our AI Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">300+ AI Models</h4>
              <p className="text-sm text-gray-700 dark:text-slate-200">
                Access to the latest models from OpenAI, Anthropic, Google,
                DeepSeek, and more
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Task-Optimized</h4>
              <p className="text-sm text-gray-700 dark:text-slate-200">
                Each tool uses the best model for its specific task, ensuring
                optimal results
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Secure & Private</h4>
              <p className="text-sm text-gray-700 dark:text-slate-200">
                Your data is encrypted and never stored. All processing happens
                in real-time
              </p>
            </div>
          </div>
        </div>

        {/* Model Information */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">AI Models Used</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">Claude 4.5 Sonnet</h4>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                Best for legal writing and dispute letters
              </p>
              <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                <li>• 200K context window</li>
                <li>• Excellent legal compliance</li>
                <li>• Professional tone</li>
              </ul>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">DeepSeek R1</h4>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                Best for reasoning and analysis
              </p>
              <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                <li>• Advanced reasoning capabilities</li>
                <li>• Detailed credit analysis</li>
                <li>• Actionable recommendations</li>
              </ul>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">DeepSeek V3.1 Terminus</h4>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                Best for mathematical calculations
              </p>
              <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                <li>• Mathematical optimization</li>
                <li>• Loan strategy calculation</li>
                <li>• PSLF eligibility analysis</li>
              </ul>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold">GPT-4o</h4>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
                Best for general conversations
              </p>
              <ul className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                <li>• Fast and reliable</li>
                <li>• Natural conversations</li>
                <li>• Comprehensive knowledge</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
