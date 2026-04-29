"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 0;

// ─── Config ───────────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  ToastType,
  { Icon: React.ComponentType<{ className?: string }>; ring: string; icon: string; text: string }
> = {
  success: {
    Icon: CheckCircle2,
    ring: "bg-green-500/10 border-green-500/25",
    icon: "text-green-400",
    text: "text-green-300",
  },
  error: {
    Icon: XCircle,
    ring: "bg-red-500/10 border-red-500/25",
    icon: "text-red-400",
    text: "text-red-300",
  },
  info: {
    Icon: Info,
    ring: "bg-blue-500/10 border-blue-500/25",
    icon: "text-blue-400",
    text: "text-blue-300",
  },
};

// ─── Toast card ───────────────────────────────────────────────────────────────

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const cfg = TOAST_CONFIG[toast.type];
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border max-w-sm w-full",
        "shadow-xl backdrop-blur-sm pointer-events-auto",
        "transition-all duration-300 ease-out",
        cfg.ring,
        toast.exiting
          ? "opacity-0 translate-x-5 scale-95"
          : "opacity-100 translate-x-0 scale-100"
      )}
    >
      <cfg.Icon className={cn("w-4 h-4 shrink-0", cfg.icon)} />
      <p className={cn("flex-1 text-[13px] font-medium leading-snug", cfg.text)}>
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      300
    );
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++toastSeq;
      setToasts((prev) => [...prev, { id, type, message, exiting: false }]);
      setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
