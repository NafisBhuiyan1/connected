import { ArrowRight, EyeOff, Ghost, MapPinned, ShieldCheck, Shuffle, Timer, Users, Wand2 } from "lucide-react";
import Link from "next/link";
import { FaceStack, MatchMock, TeamMock } from "@/components/landing-visuals";
import { LandingConnectionTrail, LandingFeatureReveal, LandingHeroScene, LandingScrollCue } from "@/components/landing-experience";
import { Reveal } from "@/components/reveal";
import { Logo } from "@/components/shell";
import { InstallAppButton } from "@/components/install-app";
import { currentUserId } from "@/lib/server/session";
import styles from "@/components/landing-experience.module.css";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const signedIn = Boolean(await currentUserId());
  const primaryHref = signedIn ? "/home" : "/onboarding";

  return (
    <div className="min-h-dvh bg-white text-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Connected home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <InstallAppButton label="Download app" desktopOnly className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:border-brand-200 hover:bg-brand-50" />
            {signedIn ? null : (
              <Link href="/login" className="rounded-xl px-3.5 py-2 text-[14px] font-medium text-ink-2 hover:bg-canvas">
                Log in
              </Link>
            )}
            <Link href={primaryHref} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[14px] font-semibold text-white hover:bg-brand-700">
              {signedIn ? "Open app" : "Get started"} <ArrowRight className="size-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_80%_20%,#ede9fe_0%,transparent_60%),radial-gradient(50%_50%_at_10%_90%,#f5f3ff_0%,transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-12 pb-8 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-12">
          {/* Hero entrances are CSS-only (.cx-rise): visible on first paint even before JavaScript loads. */}
          <div>
            <div className="cx-rise">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[12.5px] font-semibold text-brand-700">
                <span className="size-1.5 rounded-full bg-emerald-500" /> CrownHacks 2026 · UNC Charlotte
              </p>
            </div>
            <div className="cx-rise" style={{ animationDelay: "0.05s" }}>
              <h1 className={`mt-5 ${styles.heroTitle}`}>
                Find your people.
                <br />
                <span className="text-brand-600">Build what&apos;s next.</span>
              </h1>
            </div>
            <div className="cx-rise" style={{ animationDelay: "0.1s" }}>
              <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-ink-2">Tell Connected your idea. It finds the people around you who can build it — and gets you talking.</p>
            </div>
            <div className="cx-rise" style={{ animationDelay: "0.15s" }}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryHref} className={`${styles.primaryAction} inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-7 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(124,58,237,0.7)] hover:bg-brand-700`}>
                  <Wand2 className="size-4" /> {signedIn ? "Open Connected" : "Build my team"}
                </Link>
                <InstallAppButton label="Download app" desktopOnly className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-6 text-[15px] font-semibold text-ink hover:border-brand-200 hover:bg-brand-50" />
                {signedIn ? null : (
                  <Link href="/login" className="inline-flex h-13 items-center justify-center rounded-2xl border border-line px-7 text-[15px] font-semibold text-ink hover:border-brand-200 hover:bg-brand-50 md:hidden">
                    Try the demo
                  </Link>
                )}
              </div>
            </div>
            <div className="cx-rise" style={{ animationDelay: "0.2s" }}>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="shrink-0"><FaceStack ids={["u_maya", "u_alex", "u_priya", "u_sam", "u_leila", "u_jordan"]} size={32} /></div>
                <p className="min-w-0 text-[13.5px] text-muted">
                  <b className="text-ink">Different skills. Shared ambition.</b><br />Explore fictional profiles in the demo.
                </p>
              </div>
              <LandingScrollCue />
            </div>
          </div>
          <LandingHeroScene />
        </div>
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <LandingConnectionTrail />
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-line bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <Reveal>
            <h2 className={`max-w-2xl ${styles.sectionTitle}`}>
              From <span className="text-brand-600">&ldquo;I have an idea&rdquo;</span> to &ldquo;we&apos;re a team&rdquo;.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Describe it", b: "Your idea becomes the roles it needs.", mock: <TeamMock /> },
              { n: "02", t: "See who fits", b: "Every match explained from real profiles.", mock: <MatchMock /> },
              {
                n: "03",
                t: "Meet nearby",
                b: "A live map of your event — faces, not GPS.",
                mock: (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-line bg-white p-5 shadow-[0_20px_40px_-24px_rgba(76,29,149,0.45)]">
                    <div className="grid grid-cols-3 gap-3">
                      {["u_zoe", "u_kevin", "u_aisha", "u_ethan", "u_grace", "u_noah"].map((id, i) => (
                        <div key={id} className={`relative rounded-full p-[3px] ${i % 2 ? "bg-brand-600" : "bg-brand-200"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/avatars/${id}.jpg`} alt="" className="size-14 rounded-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
            ].map((f, i) => (
              <LandingFeatureReveal key={f.n} index={i}>
                <div className="flex h-full flex-col">
                  <div className="h-56">{f.mock}</div>
                  <p className="mt-6 text-[12px] font-bold tracking-widest text-brand-500">{f.n}</p>
                  <p className="mt-1 text-[22px] font-semibold tracking-tight">{f.t}</p>
                  <p className="mt-1 text-[15px] text-muted">{f.b}</p>
                </div>
              </LandingFeatureReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Safety band */}
      <section className="bg-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <Reveal>
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <h2 className={`max-w-md ${styles.sectionTitle}`}>
                Nearby, <span className="text-brand-200">never tracked.</span>
              </h2>
              <p className="max-w-sm text-[15px] text-white/75">Built-in anti-stalking protection, enforced on our servers and tested.</p>
            </div>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: Shuffle, t: "±28 m", s: "Every pin offset, per viewer" },
              { icon: Timer, t: "15 min", s: "Positions reshuffle" },
              { icon: Users, t: "3+ people", s: "Or shown as a crowd" },
              { icon: Ghost, t: "1 tap", s: "Ghost mode" },
            ].map((x, i) => (
              <Reveal key={x.s} delay={i * 0.06}>
                <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
                  <x.icon className="size-5 text-brand-200" />
                  <p className="mt-3 text-[26px] font-semibold">{x.t}</p>
                  <p className="text-[13px] text-white/70">{x.s}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-[13px] text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <MapPinned className="size-4" /> No GPS ever shared
            </span>
            <span className="inline-flex items-center gap-1.5">
              <EyeOff className="size-4" /> Profile-view limits
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4" /> Block anyone instantly
            </span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
        <Reveal>
          <h2 className={styles.sectionTitle}>
            Your team is <span className="text-brand-600">already here.</span>
          </h2>
          <Link href={primaryHref} className="mt-8 inline-flex h-13 items-center gap-2 rounded-2xl bg-brand-600 px-8 text-[16px] font-semibold text-white hover:bg-brand-700">
            Get started <ArrowRight className="size-4" />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-[12.5px] text-muted sm:flex-row sm:px-8">
          <span>Connected · built at CrownHacks 2026</span>
          <span>Demo profiles are fictional · placeholder photos from randomuser.me</span>
        </div>
      </footer>
    </div>
  );
}
