"use client";

import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell";

const DEMO = { email: "demo@connected.app", password: "crownhacks" };

// Fictional demo personas (placeholder portraits) for the collage.
const FACES = ["u_maya", "u_alex", "u_priya", "u_jordan", "u_leila", "u_sam", "u_zoe", "u_kevin", "u_aisha", "u_ethan", "u_grace", "u_noah"];
const CHIPS = [
  { text: "Maya fills Design · 97%", x: "6%", y: "18%" },
  { text: "It's mutual ✦", x: "58%", y: "8%" },
  { text: "Team formed 🎉", x: "52%", y: "62%" },
  { text: "Alex is open to chat", x: "4%", y: "70%" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"login" | "demo" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => {
        if (s?.me) router.replace("/home");
      })
      .catch(() => {});
  }, [router]);

  async function login(creds: { email: string; password: string }, kind: "login" | "demo") {
    setBusy(kind);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Couldn't log in.");
      router.push("/home");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Left: living collage of people */}
      <aside className="relative hidden overflow-hidden bg-brand-700 lg:block">
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-brand-400/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="inline-flex">
            <span className="rounded-2xl bg-white/95 px-3 py-2">
              <Logo small />
            </span>
          </Link>
          <div className="relative mx-auto my-8 h-[420px] w-full max-w-[520px]">
            <div className="grid grid-cols-4 gap-3">
              {FACES.map((f, i) => (
                <motion.div
                  key={f}
                  initial={{ opacity: 0, scale: 0.85, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: [0, i % 2 ? -6 : 6, 0] }}
                  transition={{ opacity: { delay: i * 0.05 }, scale: { delay: i * 0.05 }, y: { duration: 4 + (i % 3), repeat: Infinity, ease: "easeInOut" } }}
                  className="aspect-square overflow-hidden rounded-3xl ring-2 ring-white/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/avatars/${f}.jpg`} alt="" className="size-full object-cover" />
                </motion.div>
              ))}
            </div>
            {CHIPS.map((c, i) => (
              <motion.div
                key={c.text}
                className="absolute rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-brand-800 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.45)]"
                style={{ left: c.x, top: c.y }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: [0, -5, 0] }}
                transition={{ opacity: { delay: 0.6 + i * 0.2 }, y: { duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" } }}
              >
                {c.text}
              </motion.div>
            ))}
          </div>
          <div>
            <p className="font-serif text-[46px] leading-[1.02] text-white">
              Your next cofounder
              <br />
              <span className="italic text-brand-200">is in this room.</span>
            </p>
            <p className="mt-3 text-[12px] text-white/55">Demo profiles are fictional · placeholder photos</p>
          </div>
        </div>
      </aside>

      {/* Right: form */}
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Logo small />
          </Link>
          <Link href="/onboarding" className="text-[13.5px] font-semibold text-brand-700 hover:underline">
            Create account
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {/* Mobile face strip */}
          <div className="mb-8 flex -space-x-3 lg:hidden">
            {FACES.slice(0, 6).map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f} src={`/avatars/${f}.jpg`} alt="" className="size-11 rounded-full object-cover ring-4 ring-white" />
            ))}
          </div>
          <h1 className="font-serif text-[44px] leading-none tracking-tight text-ink">Welcome back</h1>
          <p className="mt-2 text-[15px] text-muted">Log in to find your people.</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void login({ email, password }, "login");
            }}
          >
            <label className="block">
              <span className="text-[13px] font-medium text-ink-2">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-ink-2">Password</span>
              <span className="relative mt-1.5 block">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 pr-12 text-[15px] text-ink outline-none placeholder:text-faint focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
                />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-faint hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                </button>
              </span>
            </label>
            {err ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{err}</p> : null}
            <button
              disabled={busy !== null}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-[15px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {busy === "login" ? <Loader2 className="size-4 animate-spin" /> : null} Log in <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[12px] text-faint">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
              void login(DEMO, "demo");
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 text-[15px] font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
          >
            {busy === "demo" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Try the demo account
          </button>
          <p className="mt-2.5 text-center text-[12px] text-faint">demo@connected.app · crownhacks</p>
          <p className="mt-8 text-center text-[13.5px] text-muted">
            New here?{" "}
            <Link href="/onboarding" className="font-semibold text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
