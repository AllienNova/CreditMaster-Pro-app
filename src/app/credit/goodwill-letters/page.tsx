"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Send,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Edit3,
  Copy,
  Trash2,
  HelpCircle,
  Star,
  Filter,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import {
  mapGoodwillLetter,
  computeStats,
  formatDate,
  type WebGoodwillLetter,
  type GoodwillLetterView,
  type LetterDisplayStatus,
} from "./goodwill-data";

type LetterType =
  | "late_payment"
  | "hardship"
  | "long_term_customer"
  | "paid_in_full"
  | "medical_debt";

interface LetterTemplate {
  id: string;
  type: LetterType;
  name: string;
  description: string;
  successRate: number;
}

const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: "tpl-1",
    type: "late_payment",
    name: "Late Payment - First Time",
    description: "For a single late payment on an otherwise clean history",
    successRate: 45,
  },
  {
    id: "tpl-2",
    type: "long_term_customer",
    name: "Long-Term Customer Appeal",
    description: "Emphasizes loyalty and long customer relationship",
    successRate: 52,
  },
  {
    id: "tpl-3",
    type: "hardship",
    name: "Financial Hardship",
    description: "For documented financial hardship situations",
    successRate: 38,
  },
  {
    id: "tpl-4",
    type: "paid_in_full",
    name: "Paid in Full Request",
    description: "For accounts that have been fully paid off",
    successRate: 35,
  },
  {
    id: "tpl-5",
    type: "medical_debt",
    name: "Medical Debt Goodwill",
    description: "For medical debt situations",
    successRate: 42,
  },
];

const getStatusColor = (status: LetterDisplayStatus) => {
  switch (status) {
    case "successful":
      return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
    case "unsuccessful":
      return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
    case "sent":
    case "response_received":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    default:
      return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 dark:bg-slate-700 dark:text-slate-300";
  }
};

const getStatusIcon = (status: LetterDisplayStatus) => {
  switch (status) {
    case "successful":
      return <CheckCircle className="w-4 h-4" />;
    case "unsuccessful":
      return <XCircle className="w-4 h-4" />;
    case "sent":
    case "response_received":
      return <Send className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

export default function GoodwillLettersPage() {
  const [letters, setLetters] = useState<GoodwillLetterView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewLetterModal, setShowNewLetterModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<LetterTemplate | null>(null);
  const [filter, setFilter] = useState<"all" | LetterDisplayStatus>("all");

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/credit-repair/goodwill");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load goodwill letters");
      }

      const raw: WebGoodwillLetter[] = Array.isArray(data.data?.letters)
        ? data.data.letters
        : [];
      setLetters(raw.map(mapGoodwillLetter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredLetters = letters.filter(
    (l) => filter === "all" || l.status === filter,
  );

  const stats = computeStats(letters);
  const successRate = stats.successRate;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center" data-testid="goodwill-loading">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-slate-400">
            Loading goodwill letters...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md" data-testid="goodwill-error">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Couldn't load your letters
          </h2>
          <p className="mt-2 text-gray-600 dark:text-slate-400">{error}</p>
          <button
            onClick={fetchLetters}
            className="mt-6 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Goodwill Letters
              </h1>
            </div>
            <p className="text-gray-600 dark:text-slate-400">
              Generate personalized letters to request removal of negative items
            </p>
          </div>

          <button
            onClick={() => setShowNewLetterModal(true)}
            className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Letter
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Total Letters
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">Sent</p>
            <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Successful
            </p>
            <p className="text-2xl font-bold text-green-600">
              {stats.successful}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Success Rate
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {successRate}%
            </p>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white dark:bg-slate-800/20 rounded-lg">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Tips for Success</h3>
              <ul className="text-sm text-emerald-100 space-y-1">
                <li>
                  • Be polite and professional - you're asking for a favor
                </li>
                <li>• Mention your positive history with the creditor</li>
                <li>• Explain the circumstances without making excuses</li>
                <li>• Follow up if you don't hear back within 30 days</li>
                <li>
                  • Try different approaches if the first letter doesn't work
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Filter:
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              ["all", "draft", "sent", "successful", "unsuccessful"] as const
            ).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600"}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Letters List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          {filteredLetters.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Letters Found
              </h3>
              <p className="text-gray-500 dark:text-slate-400 mb-4">
                Create your first goodwill letter to get started
              </p>
              <button
                onClick={() => setShowNewLetterModal(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Create Letter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLetters.map((letter) => (
                <div
                  key={letter.id}
                  className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {letter.creditorName}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(letter.status)}`}
                        >
                          {getStatusIcon(letter.status)}
                          {letter.status.replace("_", " ")}
                        </span>
                      </div>
                      {letter.reason && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                          {letter.reason}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                        {letter.accountNumber && (
                          <span>Account: {letter.accountNumber}</span>
                        )}
                        {letter.createdAt && (
                          <span>Created: {formatDate(letter.createdAt)}</span>
                        )}
                        {letter.sentDate && (
                          <span>Sent: {formatDate(letter.sentDate)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        aria-label="Edit letter"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        aria-label="Copy letter"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        aria-label="Download letter"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {letter.status === "draft" && (
                        <button
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          aria-label="Delete letter"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Letter Modal */}
      <AnimatePresence>
        {showNewLetterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowNewLetterModal(false);
              setSelectedTemplate(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Choose a Letter Template
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Select the template that best matches your situation
                </p>
              </div>

              <div className="p-6 space-y-4">
                {LETTER_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedTemplate?.id === template.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                          {template.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">
                          {template.successRate}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNewLetterModal(false);
                    setSelectedTemplate(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <Link
                  href={
                    selectedTemplate
                      ? `/credit/goodwill-letters/new?template=${selectedTemplate.type}`
                      : "#"
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedTemplate
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                  }`}
                  onClick={(e) => !selectedTemplate && e.preventDefault()}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
