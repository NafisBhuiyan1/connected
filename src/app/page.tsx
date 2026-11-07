import { ArrowDown, ArrowRight, EyeOff, MapPinned, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Constellation, DarkLogo, FloatChip, HorizonGlow, Reveal, Starfield } from "@/components/constellation";
import { HeroVisual } from "@/components/hero-visual";
import { currentUserId } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const boneBtn =
  "inline-flex h-12 items-center justify-center gap-2 bg-bone px-7 text-[15px] font-medium text-night transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone";
const ghostBtn =
  "inline-flex h-12 items-center justify-center gap-2 border border-bone/30 px-7 text-[15px] font-medium text-bone transition hover:border-bone/70 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone";

export default async function Landing() {
  const signedIn = Boolean(await currentUserId());
  const primaryHref = signedIn ? "/home" : "/onboarding";

  return (
    <div className="min-h-dvh bg-night font-sans text-bone selection:bg-violet-500/40">
      {/* ---------- Hero ---------- */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_10%,#191433_0%,#0b0a16_45%,#06060b_75%)]" />
        <Starfield className="-z-10" />
        <Constellation className="-z-10 opacity-90" />
        <HorizonGlow className="-z-10" />

        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 pt-6 sm:px-10">
          <Link href="/" aria-label="Connected home">
            <DarkLogo />
          </Link>
          <nav className="flex items-center gap-5">
            {signedIn ? (
              <Link href="/home" className="bg-bone px-4 py-2 text-[14px] font-medium text-night hover:bg-white">
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-[14px] text-bone/80 hover:text-bone">
                  Log in
                </Link>
                <Link href="/onboarding" className="bg-bone px-4 py-2 text-[14px] font-medium text-night hover:bg-white">
                  Join
                </Link>
              </>
            )}
          </nav>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-28 sm:px-10 sm:pb-32">
          <Reveal>
            <p className="mb-6 text-[12px] tracking-[0.22em] text-bone/60 uppercase">CrownHacks 2026 · UNC Charlotte</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="font-serif text-[clamp(56px,11.5vw,156px)] leading-[0.9] tracking-[-0.02em] text-bone">
              Find your people.
              <br />
              <span className="italic text-bone/90">Build what&apos;s next.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mt-7 max-w-md text-[17px] leading-relaxed text-bone/70 sm:text-[19px]">AI that builds your team from the people in the room.</p>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className={boneBtn}>
                {signedIn ? "Open Connected" : "Get started"} <ArrowRight className="size-4" />
              </Link>
              {!signedIn ? (
                <Link href="/login" className={ghostBtn}>
                  Log in
                </Link>
              ) : null}
            </div>
          </Reveal>
        </div>

        {/* floating glimpses of the product */}
        <FloatChip className="top-[22%] right-[6%] hidden lg:block" delay={0.6}>
          <span className="text-bone/50">Match</span> · Maya — Design · <b className="font-semibold text-bone">99%</b>
        </FloatChip>
        <FloatChip className="top-[38%] right-[18%] hidden lg:block" delay={1.1}>
          ✓ Team formed · 4 people
        </FloatChip>
        <FloatChip className="top-[54%] right-[4%] hidden xl:block" delay={1.6}>
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400 align-middle" />
          12 people open to chat
        </FloatChip>

        <a href="#how" aria-label="Scroll down" className="absolute bottom-7 left-1/2 -translate-x-1/2 text-bone/60 transition hover:text-bone">
          <ArrowDown className="size-6 animate-bounce [animation-duration:2.4s]" strokeWidth={1.25} />
        </a>
      </section>

      {/* ---------- 01 · Team Builder ---------- */}
      <section id="how" className="relative border-t border-white/10">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-10 lg:grid-cols-2 lg:py-32">
          <Reveal>
            <p className="text-[12px] tracking-[0.22em] text-bone/50 uppercase">01 — Team Builder</p>
            <h2 className="mt-5 font-serif text-[clamp(40px,6vw,76px)] leading-[0.95]">
              Describe an idea.
              <br />
              <span className="italic text-bone/80">Get a team.</span>
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-bone/65">Connected finds the roles you need and the people here who fill them.</p>
          </Reveal>
          <Reveal delay={0.15}>
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      {/* ---------- 02 · Explained ---------- */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[70vw] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-10 lg:py-32">
          <Reveal>
            <p className="text-[12px] tracking-[0.22em] text-bone/50 uppercase">02 — Explainable AI</p>
            <h2 className="mt-5 max-w-3xl font-serif text-[clamp(40px,6vw,76px)] leading-[0.95]">
              Every match, <span className="italic text-bone/80">explained.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-bone/65">No mystery scores — every pick comes with the reasons from real profiles.</p>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              { k: "4", v: "people per team, including you" },
              { k: "54", v: "skills in the ontology" },
              { k: "0", v: "GPS pins, ever" },
            ].map((s, i) => (
              <Reveal key={s.k} delay={0.1 * i} y={10}>
                <div className="h-full bg-night p-8">
                  <p className="font-serif text-[64px] leading-none text-bone">{s.k}</p>
                  <p className="mt-3 text-[14px] text-bone/55">{s.v}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 03 · Private ---------- */}
      <section className="relative border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:py-32">
          <Reveal>
            <p className="text-[12px] tracking-[0.22em] text-bone/50 uppercase">03 — Trust</p>
            <h2 className="mt-5 font-serif text-[clamp(40px,6vw,76px)] leading-[0.95]">
              Private <span className="italic text-bone/80">by design.</span>
            </h2>
          </Reveal>
          <ul className="space-y-0 self-end border-t border-white/10">
            {[
              { icon: ShieldCheck, t: "Opt in, per event" },
              { icon: MapPinned, t: "Zones, never GPS pins" },
              { icon: EyeOff, t: "You approve every message" },
            ].map((b, i) => (
              <Reveal key={b.t} delay={0.1 * i} y={10}>
                <li className="flex items-center gap-4 border-b border-white/10 py-6">
                  <b.icon className="size-5 shrink-0 text-violet-300" strokeWidth={1.5} />
                  <span className="text-[20px] text-bone/90">{b.t}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="relative isolate overflow-hidden border-t border-white/10">
        <Starfield className="-z-10 opacity-60" />
        <HorizonGlow className="-z-10 opacity-80" />
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-5 pt-28 pb-44 sm:px-10 lg:pt-36 lg:pb-56">
          <Reveal>
            <h2 className="font-serif text-[clamp(44px,8vw,112px)] leading-[0.92]">
              Your team is <span className="italic">already here.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <Link href={primaryHref} className={boneBtn}>
              {signedIn ? "Open Connected" : "Get started"} <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-[12px] text-bone/45 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>© 2026 Connected · Built at CrownHacks</span>
          <span>Demo profiles are fictional.</span>
        </div>
      </footer>
    </div>
  );
}
