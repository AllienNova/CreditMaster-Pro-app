"use client";

/**
 * Goal Progress Bar Component
 *
 * Animated progress indicator with milestones and color-coded status.
 */

interface GoalProgressBarProps {
  progress: number;
  showAnimation?: boolean;
}

export default function GoalProgressBar({
  progress,
  showAnimation = true,
}: GoalProgressBarProps) {
  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return "from-green-500 to-emerald-600";
    if (progress >= 75) return "from-blue-500 to-blue-600";
    if (progress >= 50) return "from-yellow-500 to-orange-500";
    if (progress >= 25) return "from-orange-500 to-red-500";
    return "from-red-600 to-red-700";
  };

  const getGlowColor = (progress: number): string => {
    if (progress >= 100) return "shadow-green-500/50";
    if (progress >= 75) return "shadow-blue-500/50";
    if (progress >= 50) return "shadow-yellow-500/50";
    return "shadow-orange-500/50";
  };

  return (
    <div className="relative w-full">
      {/* Background Track */}
      <div className="w-full h-4 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        {/* Progress Fill */}
        <div
          className={`h-full bg-gradient-to-r ${getProgressColor(progress)} ${
            showAnimation ? "transition-all duration-1000 ease-out" : ""
          } ${progress >= 75 ? `shadow-lg ${getGlowColor(progress)}` : ""}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        >
          {/* Shimmer Effect */}
          {showAnimation && progress < 100 && (
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          )}
        </div>
      </div>

      {/* Milestone Markers */}
      {[25, 50, 75].map((milestone) => (
        <div
          key={milestone}
          className="absolute top-0 h-4 w-0.5 bg-white dark:bg-slate-800/50"
          style={{ left: `${milestone}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs text-gray-400 dark:text-slate-500">
            {milestone === 25 && progress < 25 && "¼"}
            {milestone === 50 && progress < 50 && "½"}
            {milestone === 75 && progress < 75 && "¾"}
          </div>
        </div>
      ))}

      {/* Completion Celebration */}
      {progress >= 100 && showAnimation && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl animate-bounce"></span>
        </div>
      )}
    </div>
  );
}
