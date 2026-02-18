"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import { Icon } from "@/components/ui/Icon";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);

    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => onClose(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  const getTypeStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          icon: "sparkles",
          iconColor: "text-emerald-500",
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "sparkles",
          iconColor: "text-red-500",
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "sparkles",
          iconColor: "text-yellow-500",
        };
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "ℹ️",
          iconColor: "text-blue-500",
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md transform transition-all duration-200 ${
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`text-xl ${styles.iconColor}`}>{styles.icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 dark:text-slate-300 transition"
          aria-label="Close"
        ></button>
      </div>
    </div>
  );
}

// Standalone toast function for use outside React components
let toastHandler: ((toast: Omit<Toast, "id">) => void) | null = null;

export function setToastHandler(handler: (toast: Omit<Toast, "id">) => void) {
  toastHandler = handler;
}

export function toast(options: Omit<Toast, "id">) {
  if (toastHandler) {
    toastHandler(options);
  } else {
    console.warn(
      "Toast handler not initialized. Wrap your app with ToastProvider.",
    );
  }
}

// Convenience methods
toast.success = (title: string, message?: string) =>
  toast({ type: "success", title, message });
toast.error = (title: string, message?: string) =>
  toast({ type: "error", title, message });
toast.warning = (title: string, message?: string) =>
  toast({ type: "warning", title, message });
toast.info = (title: string, message?: string) =>
  toast({ type: "info", title, message });
