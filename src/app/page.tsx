import {
  ArrowRight,
  BrainCircuit,
  ChartColumnBig,
  EyeOff,
  Layers,
  MapPinned,
  Radar,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { HeroVisual } from "@/components/hero-visual";
import { Logo } from "@/components/shell";
import { currentUserId } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Wand2, title: "AI Team Builder", body: "Describe your idea. Connected works out the roles it needs and optimizes a complementary team from people at your event, instead of handing you a list of strangers." },
  { icon: Layers, title: "Explainable matches", body: "Every score breaks down into skills, interests, goals and availability, and every reason is drawn from real profile data. No mystery percentages." },
  { icon: MapPinned, title: "Event zones, not GPS", body: "Opt in to an event's networking space and set a time-boxed status like 'open to a 15-min chat until 4 PM'. Others see your zone, never your location." },
  { icon: EyeOff, title: "Quiet interest", body: "A double opt-in for introverts: say you'd like to meet someone. They only find out if they want to meet you too." },
  { icon: Radar, title: "Opportunity Radar", body: "Open roles that fit your skills, high-fit people who are free right now, and warm intro paths through people who opted in to making intros." },
  { icon: ChartColumnBig, title: "Organizer insights", body: "Organizers see skill supply vs. demand, who's still unteamed, and how many conversations were actually useful. Aggregates only." },
];

export default async function Landing() {
  const signedIn = Boolean(await currentUserId());
  return (
    <div className="brand-gradient-soft min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="#how" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface sm:inline-flex">
            How it works
          </Link>
          <Link href={signedIn ? "/home" : "/onboarding"} className="brand-gradient inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white shadow-[0_6px_16px_-6px_rgba(81,69,224,0.55)]">
            {signedIn ? "Open app" : "Get started"} <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-surface/80 px-3 py-1 text-[12.5px] font-medium text-brand-700">
            <Sparkles className="size-3.5" /> Built at CrownHacks 2026 · UNC Charlotte
          </div>
          <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] text-ink sm:text-[56px]">
            Find your people.
            <br />
            <span className="text-gradient">Build what&apos;s next.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
            Tell Connected what you want to build. It figures out the roles you need, finds the complementary people at your event who opted in, and assembles a team, explaining every match. Then it gets you to a real conversation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={signedIn ? "/build" : "/onboarding"} className="brand-gradient inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-medium text-white shadow-[0_10px_24px_-8px_rgba(81,69,224,0.6)] hover:brightness-110">
              <Wand2 className="size-4" /> Build my team in 60 seconds
            </Link>
            <Link href="#how" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 text-[15px] font-medium text-ink hover:border-line-2">
              See how it works
            </Link>
          </div>
          <p className="mt-6 text-[13px] text-muted">
            About half of CrownHacks attendees are first-timers, and plenty walk in without a team.
          </p>
        </div>
        <HeroVisual />
      </section>

      <section className="border-y border-line bg-surface/70">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
          <p className="text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
            LinkedIn tells you who people are. <span className="text-gradient">Connected tells you who to build with.</span>
          </p>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">How it works</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">From “I have an idea” to “we&apos;re a team”</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { n: "1", t: "Say what you want to build", b: "“An AI healthcare scheduling app.” Claude turns it into the roles a real team needs: frontend, backend, AI, design and a healthcare domain expert, each with a reason." },
            { n: "2", t: "Get an optimized team", b: "The optimizer searches the people who opted in at your event and picks the combination that best covers every role. It's exact when the search space is small, and near-optimal when it isn't." },
            { n: "3", t: "Turn it into a real meeting", b: "Send invites with a specific ask. Each person decides for themselves. Accepted invites open a team room, a suggested meeting spot and first steps." },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <span className="brand-gradient inline-flex size-8 items-center justify-center rounded-lg text-sm font-semibold text-white">{s.n}</span>
              <h3 className="mt-4 text-[17px] font-semibold text-ink">{s.t}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="card grid gap-8 overflow-hidden p-8 md:grid-cols-2">
          <div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-soft text-violet-600">
              <BrainCircuit className="size-5" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Not an LLM wrapper</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Claude does what language models are good at: understanding a messy goal and drafting a warm intro from real facts. The matching and team optimization are deterministic, fast and tested, so they also work with no API key.
            </p>
          </div>
          <ul className="space-y-3 text-[14.5px] text-ink-2">
            {[
              "Reciprocal scoring: 80% how they fit you, 20% how you fit them",
              "Noisy-OR role coverage over a 54-skill ontology with related-skill credit",
              "Team optimizer: exact search up to 60k teams, then multi-start greedy plus local search",
              "Benchmarked against brute force: optimal in 95 of 96 scenarios, always within 0.5% of optimal",
              "Role-diverse ranking, so you see a designer and a developer, not eight developers",
            ].map((x) => (
              <li key={x} className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-ink p-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-1 size-6 shrink-0 text-brand-300" />
            <div>
              <p className="text-lg font-semibold">Private by default</p>
              <p className="mt-1 max-w-xl text-[14px] text-white/70">
                Discovery is opt-in for each event, with no GPS. Every request needs a specific ask, and helpers set their own limits. Nothing AI-drafted is sent without your approval, and you can block anyone instantly.
              </p>
            </div>
          </div>
          <Link href={signedIn ? "/home" : "/onboarding"} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-ink hover:bg-white/90">
            Try it now <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="mt-6 text-center text-[12px] text-faint">Seeded people are fictional demo profiles and are labeled “Demo” throughout the app.</p>
      </section>
    </div>
  );
}
