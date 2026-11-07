"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
}

const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((xs) => [...xs.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), t.tone === "error" ? 6000 : 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-pop)]"
            >
              {t.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : t.tone === "error" ? (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-rose-600" />
              ) : (
                <Info className="mt-0.5 size-5 shrink-0 text-brand-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.body ? <p className="mt-0.5 text-sm text-muted">{t.body}</p> : null}
              </div>
              <button aria-label="Dismiss" className="text-faint hover:text-ink" onClick={() => setToasts((xs) => xs.filter((x) => x.id !== t.id))}>
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
