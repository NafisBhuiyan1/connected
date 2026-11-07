"use client";

import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import Link from "next/link";
import { forwardRef, useEffect } from "react";

export const cx = clsx;

// ---------- Generated faces (DiceBear "notionists", rendered locally — no network, no real photos) ----------

const faceCache = new Map<string, string>();

function hueToHex(h: number, s = 0.75, l = 0.86): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `${f(0)}${f(8)}${f(4)}`;
}

export function faceUri(seed: string, hue = 240): string {
  const key = `${seed}|${hue}`;
  let uri = faceCache.get(key);
  if (!uri) {
    uri = createAvatar(notionists, { seed, backgroundColor: [hueToHex(hue)], radius: 50 }).toDataUri();
    faceCache.set(key, uri);
  }
  return uri;
}

// ---------- Button ----------

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const variantCls: Record<Variant, string> = {
  primary:
    "brand-gradient text-white shadow-[0_6px_16px_-6px_rgba(81,69,224,0.55)] hover:brightness-110 active:brightness-95 disabled:opacity-60",
  secondary: "bg-surface text-ink border border-line hover:border-line-2 hover:bg-canvas disabled:opacity-60",
  ghost: "text-ink-2 hover:bg-canvas hover:text-ink disabled:opacity-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-60",
};
const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap transition-all select-none disabled:cursor-not-allowed",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx("focus-ring inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all", variantCls[variant], sizeCls[size], className)}
    >
      {icon}
      {children}
    </Link>
  );
}

// ---------- Card / Section ----------

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, sub, action, className }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {sub ? <p className="mt-0.5 text-[13px] text-muted">{sub}</p> : null}
      </div>
      {action ? <div className="shrink-0 whitespace-nowrap">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, sub, action, eyebrow }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1.5 text-xs font-semibold tracking-wide text-brand-600 uppercase">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {sub ? <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{sub}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  );
}

// ---------- Badge / Chip ----------

type Tone = "neutral" | "brand" | "green" | "amber" | "rose" | "violet" | "sky";
const toneCls: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-2 border-line",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-800 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  violet: "bg-violet-soft text-violet-700 border-violet-100",
  sky: "bg-sky-50 text-sky-700 border-sky-100",
};

export function Badge({ tone = "neutral", className, children, icon }: { tone?: Tone; className?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap", toneCls[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function Chip({
  selected,
  onClick,
  children,
  className,
  icon,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
        selected ? "border-brand-300 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** Marks fictional seeded data, everywhere it appears. */
export function DemoTag({ className }: { className?: string }) {
  return (
    <span title="Fictional demo profile for the hackathon demo" className={cx("rounded border border-dashed border-line-2 px-1 text-[10px] font-semibold tracking-wide text-faint uppercase", className)}>
      Demo
    </span>
  );
}

// ---------- Avatar ----------

export function Avatar({
  name,
  hue = 240,
  size = 40,
  live,
  className,
  initialsOnly,
}: {
  name: string;
  hue?: number;
  size?: number;
  live?: boolean;
  className?: string;
  initialsOnly?: boolean;
}) {
  const initials = name
    .replace(/^Dr\.\s+/, "")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={cx("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {initialsOnly ? (
        <span
          className="inline-flex size-full items-center justify-center rounded-full font-semibold text-white ring-2 ring-white"
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 40) % 360} 72% 48%))`,
            fontSize: Math.max(10, size * 0.36),
          }}
        >
          {initials || "?"}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={faceUri(name, hue)} alt="" width={size} height={size} className="size-full rounded-full ring-2 ring-white" draggable={false} />
      )}
      {live ? (
        <span className="absolute right-0 bottom-0 flex size-3">
          <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-emerald-400" />
          <span className="relative inline-flex size-3 rounded-full border-2 border-white bg-emerald-500" />
        </span>
      ) : null}
    </span>
  );
}

// ---------- Inputs ----------

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-[14px] text-ink placeholder:text-faint transition-colors outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputBase, "h-10", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputBase, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...rest} />;
});

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputBase, "h-10 cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236a6f86' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {sub ? <span className="mt-0.5 block text-[13px] text-muted">{sub}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx("focus-ring relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors", checked ? "bg-brand-600" : "bg-line-2")}
      >
        <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}

// ---------- Feedback ----------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function Empty({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 bg-surface/60 px-6 py-12 text-center">
      {icon ? <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div> : null}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <span>{message}</span>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Progress({ value, className, tone = "brand" }: { value: number; className?: string; tone?: "brand" | "green" }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-canvas", className)}>
      <motion.div
        className={cx("h-full rounded-full", tone === "brand" ? "brand-gradient" : "bg-emerald-500")}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
      />
    </div>
  );
}

// ---------- Modal ----------

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cx(
              "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-[var(--shadow-pop)] sm:rounded-3xl sm:p-6",
              wide ? "sm:max-w-2xl" : "sm:max-w-lg",
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="text-lg font-semibold tracking-tight text-ink">{title}</div>
              <button aria-label="Close" onClick={onClose} className="focus-ring -m-1 rounded-lg p-1 text-faint hover:bg-canvas hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ---------- Score ring ----------

export function ScoreRing({ score, size = 52, label = true }: { score: number; size?: number; label?: boolean }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 80 ? "#5145e0" : score >= 60 ? "#7a5af8" : "#a3a8c4";
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} title="Algorithmic compatibility estimate — not a prediction of success">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef5" strokeWidth={5} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      {label ? (
        <span className="absolute text-[13px] font-semibold tabular-nums text-ink" style={{ fontSize: size * 0.27 }}>
          {score}
        </span>
      ) : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("size-4 animate-spin text-brand-600", className)} />;
}
