"use client";

import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Constellation, DarkLogo, FloatChip, HorizonGlow, Starfield } from "@/components/constellation";

const DEMO = { email: "demo@connected.app", password: "crownhacks" };

const field =
  "h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 text-[15px] text-bone placeholder:text-bone/35 outline-none transition focus:border-violet-300/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-violet-500/15";

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
      .then((s: { me?: unknown }) => {
        if (s?.me) router.replace("/home");
      })
      .catch(() => {});
  }, [router]);

  async function login(creds: { email: string; password: string }, kind: "login" | "demo") {
    setBusy(kind);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(res.status === 404 ? "Login isn't available yet — try again in a moment." : (data.error ?? "Wrong email or password."));
        setBusy(null);
        return;
      }
      router.push("/home");
    } catch {
      setErr("Can't reach the server. Check your connection.");
      setBusy(null);
    }
  }

  return (
    <div className="grid min-h-dvh bg-night font-sans text-bone lg:grid-cols-[1.15fr_1fr]">
      {/* Left: cinematic network */}
      <aside className="relative isolate hidden overflow-hidden border-r border-white/10 lg:block">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(110%_80%_at_30%_20%,#1a1536_0%,#0b0a16_50%,#06060b_80%)]" />
        <Starfield className="-z-10" />
        <Constellation className="-z-10" />
        <HorizonGlow className="-z-10" />
        <div className="flex h-full flex-col justify-between p-10">
          <Link href="/" aria-label="Connected home">
            <DarkLogo />
          </Link>
          <div className="pb-24">
            <p className="font-serif text-[clamp(44px,4.6vw,72px)] leading-[0.95]">
              Your next cofounder
              <br />
              <span className="italic text-bone/80">is in this room.</span>
            </p>
          </div>
        </div>
        <FloatChip className="top-[18%] left-[52%]" delay={0.4}>
          <span className="text-bone/50">Fills</span> Backend · <b className="font-semibold">97%</b>
        </FloatChip>
        <FloatChip className="top-[32%] left-[18%]" delay={0.9}>
          <Sparkles className="mr-1.5 inline size-3.5 text-violet-300" />
          It&apos;s mutual
        </FloatChip>
        <FloatChip className="top-[46%] left-[60%]" delay={1.4}>
          ✓ Team formed
        </FloatChip>
      </aside>

      {/* Right: form */}
      <main className="relative isolate flex min-h-dvh flex-col overflow-hidden px-5 py-6 sm:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_80%_0%,rgba(99,96,240,0.18),transparent_60%)]" />
        <div className="absolute inset-0 -z-10 lg:hidden">
          <Starfield />
          <HorizonGlow className="opacity-70" />
        </div>
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden" aria-label="Connected home">
            <DarkLogo />
          </Link>
          <Link href="/onboarding" className="text-[14px] text-bone/70 hover:text-bone">
            Create account
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
            className="w-full max-w-[400px]"
          >
            <h1 className="font-serif text-[48px] leading-none">Welcome back</h1>
            <p className="mt-3 text-[15px] text-bone/60">Log in to find your people.</p>

            <form
              className="mt-9 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim() || !password) {
                  setErr("Enter your email and password.");
                  return;
                }
                void login({ email: email.trim(), password }, "login");
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-bone/70">Email</span>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" className={field} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-bone/70">Password</span>
                <span className="relative block">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${field} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-bone/50 hover:text-bone focus-visible:outline-2 focus-visible:outline-bone/60"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>

              {err ? (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 py-2.5 text-[13.5px] text-rose-200">
                  {err}
                </motion.p>
              ) : null}

              <button
                type="submit"
                disabled={busy !== null}
                className="inline-flex h-12 w-full items-center justify-center gap-2 bg-bone text-[15px] font-medium text-night transition hover:bg-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
              >
                {busy === "login" ? <Loader2 className="size-4 animate-spin" /> : null}
                Log in {busy === "login" ? null : <ArrowRight className="size-4" />}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[12px] text-bone/35">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setEmail(DEMO.email);
                setPassword(DEMO.password);
                void login(DEMO, "demo");
              }}
              className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden border border-white/15 text-[15px] font-medium text-bone transition hover:border-violet-300/50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone"
            >
              <span className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-500/0 via-violet-500/20 to-brand-500/0 opacity-0 transition group-hover:opacity-100" />
              {busy === "demo" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-violet-300" />}
              Try the demo account
            </button>
            <p className="mt-2.5 text-center text-[12px] text-bone/40">demo@connected.app · crownhacks</p>

            <p className="mt-10 text-center text-[14px] text-bone/60">
              New here?{" "}
              <Link href="/onboarding" className="text-bone underline decoration-bone/30 underline-offset-4 hover:decoration-bone">
                Create an account
              </Link>
            </p>
          </motion.div>
        </div>
        <p className="text-center text-[11.5px] text-bone/30">Demo profiles are fictional.</p>
      </main>
    </div>
  );
}
