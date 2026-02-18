"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { rbac, Permission } from "@/lib/auth/rbac";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface PremiumFeatureGuardProps {
  children: ReactNode;
  permission: Permission;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * PremiumFeatureGuard Component
 *
 * Wraps premium features and shows upgrade prompt for non-premium users
 *
 * Usage:
 * <PremiumFeatureGuard permission="financial:create_budgets">
 *   <BudgetManagement />
 * </PremiumFeatureGuard>
 */
export default function PremiumFeatureGuard({
  children,
  permission,
  fallback,
  showUpgradePrompt = true,
}: PremiumFeatureGuardProps) {
  const { user, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="text-yellow-600 text-5xl mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Authentication Required
        </h3>
        <p className="text-gray-600 dark:text-slate-300 mb-4">
          Please log in to access this feature.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Log In
        </Link>
      </div>
    );
  }

  // Check permission
  const hasPermission = rbac.hasPermission(user, permission);

  // User has permission - show feature
  if (hasPermission) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  if (showUpgradePrompt) {
    return <UpgradePrompt permission={permission} />;
  }

  // No access, no prompt
  return null;
}

/**
 * Upgrade Prompt Component
 *
 * Shows a beautiful upgrade prompt for premium features
 */
function UpgradePrompt({ permission }: { permission: Permission }) {
  const featureInfo = getFeatureInfo(permission);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-6">
        <Icon name={featureInfo.icon} className="text-4xl inline-block" />
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {featureInfo.title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-slate-300 mb-6 max-w-md mx-auto">
        {featureInfo.description}
      </p>

      {/* Features List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6 max-w-md mx-auto">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Premium features include:
        </h4>
        <ul className="space-y-3 text-left">
          {featureInfo.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="text-green-500 text-xl flex-shrink-0"></span>
              <span className="text-gray-700 dark:text-slate-200">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/pricing"
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
        >
          Upgrade to Premium
        </Link>
        <Link
          href="/pricing"
          className="px-8 py-3 bg-white text-gray-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors border-2 border-gray-300 dark:border-slate-600"
        >
          View Plans
        </Link>
      </div>

      {/* Pricing hint */}
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-6">
        Starting at{" "}
        <span className="font-semibold text-gray-700 dark:text-slate-200">
          $29/month
        </span>
      </p>
    </div>
  );
}

/**
 * Get feature information based on permission
 */
function getFeatureInfo(permission: Permission): {
  icon: string;
  title: string;
  description: string;
  features: string[];
} {
  const featureMap: Record<
    string,
    {
      icon: string;
      title: string;
      description: string;
      features: string[];
    }
  > = {
    "financial:create_budgets": {
      icon: "calculator",
      title: "Budget Management",
      description:
        "Create and track budgets to take control of your spending and reach your financial goals faster.",
      features: [
        "Unlimited budget categories",
        "Real-time spending tracking",
        "Budget alerts and notifications",
        "Monthly, weekly, and yearly budgets",
        "Spending insights and recommendations",
      ],
    },
    "financial:create_goals": {
      icon: "target",
      title: "Financial Goals",
      description:
        "Set and track financial goals with AI-powered recommendations to achieve your dreams.",
      features: [
        "Unlimited financial goals",
        "Progress tracking and milestones",
        "AI-powered goal recommendations",
        "Goal achievement predictions",
        "Automated savings suggestions",
      ],
    },
    "financial:generate_reports": {
      icon: "document",
      title: "Financial Reports",
      description:
        "Generate comprehensive financial reports to understand your complete financial picture.",
      features: [
        "Monthly, quarterly, and annual reports",
        "Export to PDF, CSV, and Excel",
        "Customizable report templates",
        "Transaction history analysis",
        "Net worth tracking over time",
      ],
    },
    "credit:alerts": {
      icon: "chart-bar",
      title: "Credit Alerts",
      description:
        "Get instant alerts about changes to your credit report and score.",
      features: [
        "Real-time credit score monitoring",
        "New account alerts",
        "Hard inquiry notifications",
        "Suspicious activity detection",
        "Monthly credit report updates",
      ],
    },
    "credit:view_history": {
      icon: "chart-bar",
      title: "Credit History",
      description:
        "View your complete credit history and track improvements over time.",
      features: [
        "Historical credit score tracking",
        "Credit report change history",
        "Score improvement insights",
        "Factor analysis over time",
        "Dispute outcome tracking",
      ],
    },
    "ai:consensus": {
      icon: "sparkles",
      title: "AI Consensus",
      description:
        "Get responses from multiple AI models for the most accurate and reliable answers.",
      features: [
        "Access to 300+ AI models",
        "Multi-model consensus for critical decisions",
        "Higher accuracy and reliability",
        "Advanced AI reasoning",
        "Priority AI processing",
      ],
    },
    "voice:synthesize": {
      icon: "sparkles",
      title: "Voice Synthesis",
      description:
        "Convert text to natural-sounding speech with advanced AI voice technology.",
      features: [
        "Natural-sounding AI voices",
        "Multiple voice options",
        "Text-to-speech for documents",
        "Audio export capabilities",
        "Unlimited voice synthesis",
      ],
    },
    "disputes:delete": {
      icon: "document-text",
      title: "Advanced Dispute Management",
      description:
        "Full control over your disputes with advanced management features.",
      features: [
        "Delete disputes",
        "Edit dispute letters",
        "Bulk dispute operations",
        "Advanced dispute tracking",
        "Priority dispute processing",
      ],
    },
    "documents:share": {
      icon: "chart-bar",
      title: "Document Sharing",
      description:
        "Securely share documents with credit bureaus, lenders, and advisors.",
      features: [
        "Secure document sharing",
        "Expiring share links",
        "Access control",
        "Share tracking",
        "Unlimited document storage",
      ],
    },
  };

  return (
    featureMap[permission] || {
      icon: "star",
      title: "Premium Feature",
      description:
        "This is a premium feature available to Premium, Admin, and Super Admin users.",
      features: [
        "Access to advanced features",
        "Priority support",
        "Enhanced capabilities",
        "Unlimited usage",
      ],
    }
  );
}
