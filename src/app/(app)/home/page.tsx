"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Flag,
  GraduationCap,
  Handshake,
  Landmark,
  MapPinned,
  MessageCircle,
  Mic,
  Radar,
  Radio,
  Sparkles,
  Users,
  Wand2,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Feed } from "@/components/feed";
import { EventCover } from "@/components/event-cover";
import { LoadingCards, MatchCard, type MatchWithState } from "@/components/people";
import { Reveal } from "@/components/reveal";
import { Avatar, ButtonLink, cx, ErrorBox, Progress } from "@/components/ui";
import { firstName, fmtDate, fmtTime, useApi } from "@/lib/client";
import type { EventRecommendation } from "@/lib/engine/events";
import type { ConnectedEvent, Mission, Profile, PublicProfile } from "@/lib/types";

interface RadarItem {
  id: string;
  kind: "open-role" | "live-match" | "event" | "mentor" | "mutual-path";
  title: string;
  body: string;
  href: string;
  score: number;
}

interface HomeData {
  me: Profile;
  activeMission: { mission: Mission; progress: number; steps: { id: string; label: string; value: number; target: number }[] } | null;
  matches: MatchWithState[];
  radar: RadarItem[];
  events: EventRecommendation[];
  eventPeople: Record<string, PublicProfile>;
  stats: { connections: number; pendingIn: number; teams: number; useful: number; teamInvites: number };
  liveEventId: string | null;
}

const RADAR_ICON = { "open-role": Briefcase, "live-match": Radio, event: CalendarDays, mentor: GraduationCap, "mutual-path": Handshake } as const;
const RADAR_TONE = {
  "open-role": "bg-brand-50 text-brand-600",
  "live-match": "bg-emerald-50 text-emerald-600",
  event: "bg-amber-50 text-amber-600",
  mentor: "bg-fuchsia-50 text-fuchsia-600",
  "mutual-path": "bg-sky-50 text-sky-600",
} as const;

const KIND_ART: Record<ConnectedEvent["kind"], { bg: string; icon: typeof Zap }> = {
  hackathon: { bg: "linear-gradient(140deg,#7c3aed,#c026d3)", icon: Zap },
  "career-fair": { bg: "linear-gradient(140deg,#4f46e5,#0ea5e9)", icon: Briefcase },
  pitch: { bg: "linear-gradient(140deg,#9333ea,#f59e0b)", icon: Mic },
  meetup: { bg: "linear-gradient(140deg,#6d28d9,#8b5cf6)", icon: Users },
  workshop: { bg: "linear-gradient(140deg,#5b21b6,#10b981)", icon: Wrench },
  conference: { bg: "linear-gradient(140deg,#4c1d95,#6366f1)", icon: Landmark },
  seminar: { bg: "linear-gradient(140deg,#7e22ce,#ec4899)", icon: GraduationCap },
};

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still hacking" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<HomeData>("/api/home", { poll: 15000 });
  const [idea, setIdea] = useState("");

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const me = data?.me;
  const live = data?.events.find((e) => e.event.id === data.liveEventId);
  const floaters = (data?.matches ?? []).slice(0, 5);

  const submitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length > 6) router.push(`/build?pitch=${encodeURIComponent(idea)}${data?.liveEventId ? `&event=${data.liveEventId}` : ""}&auto=1`);
  };

  return (
    <div className="space-y-7">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[28px] bg-brand-700 px-5 pt-6 pb-5 text-white sm:px-8 sm:pt-8 sm:pb-7"
      >
        <div className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-brand-400/35 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/70">
              {greeting()}
              {me ? `, ${firstName(me.name)}` : ""} 👋
            </p>
            <h1 className="mt-1.5 text-[30px] leading-[1.08] font-semibold tracking-[-0.02em] sm:text-[40px]">
              Who will you build
              <br className="sm:hidden" /> with <span className="font-serif text-[1.12em] font-normal italic text-brand-100">today</span>?
            </h1>
            <form onSubmit={submitIdea} className="mt-5 flex w-full min-w-0 items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]">
              <Wand2 className="size-4 shrink-0 text-brand-500" />
              <input
                aria-label="Describe your project idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Your idea → your team"
                className="h-10 w-0 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
              />
              <button className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-700">
                Build <ArrowRight className="size-3.5" />
              </button>
            </form>
            {live ? (
              <Link href={`/map`} className="group mt-4 inline-flex items-center gap-3 rounded-2xl bg-white/10 py-2 pr-3 pl-3 ring-1 ring-white/15 transition-colors hover:bg-white/15">
                <span className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-emerald-300" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-300" />
                </span>
                <span className="text-[13px]">
                  <b className="font-semibold">{live.event.title}</b> <span className="text-white/70">· {live.optedInCount} people live</span>
                </span>
                <MapPinned className="size-4 text-white/80 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : null}
          </div>
          {/* Floating faces — your top matches, bobbing gently */}
          <div className="relative hidden h-56 lg:block">
            {floaters.map((m, i) => {
              const spots = [
                { left: "8%", top: "10%" },
                { left: "52%", top: "0%" },
                { left: "30%", top: "44%" },
                { left: "72%", top: "40%" },
                { left: "6%", top: "64%" },
              ][i];
              return (
                <motion.div
                  key={m.profile.id}
                  className="absolute"
                  style={spots}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
                  transition={{ opacity: { delay: 0.2 + i * 0.12 }, scale: { delay: 0.2 + i * 0.12, type: "spring" }, y: { duration: 3.4 + i * 0.5, repeat: Infinity, ease: "easeInOut" } }}
                >
                  <Link href={`/people/${m.profile.id}`} className="flex items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-ink shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)] transition-transform hover:scale-105">
                    <Avatar name={m.profile.name} hue={m.profile.avatarHue} size={34} />
                    <span className="text-[12.5px] font-semibold">{firstName(m.profile.name)}</span>
                    <span className="rounded-full bg-brand-50 px-1.5 text-[11px] font-bold text-brand-700">{m.score}%</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/build", icon: Wand2, title: "Build a team", sub: "Idea → team", tone: "bg-brand-600 text-white" },
          { href: "/map", icon: MapPinned, title: "Nearby", sub: "Who's around", tone: "bg-brand-50 text-brand-700" },
          { href: data?.liveEventId ? `/events/${data.liveEventId}#lounge` : "/events", icon: MessageCircle, title: "Event chat", sub: "Talk to the room", tone: "bg-fuchsia-50 text-fuchsia-700" },
          { href: "/coach", icon: Sparkles, title: "Ask your coach", sub: "Plan · pitch · people", tone: "bg-emerald-50 text-emerald-700" },
        ].map((a, i) => (
          <Reveal key={a.title} delay={i * 0.06}>
            <Link href={a.href} className="card card-hover group flex h-full items-center gap-3 p-3.5">
              <span className={cx("flex size-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105", a.tone)}>
                <a.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-ink">{a.title}</span>
                <span className="block text-[12px] text-muted">{a.sub}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </section>

      {/* Events strip */}
      <Reveal>
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">Happening near you</h2>
              <p className="text-[13px] text-muted">Ranked by who&apos;s going</p>
            </div>
            <Link href="/events" className="text-[13px] font-semibold text-brand-700 hover:underline">
              All events →
            </Link>
          </div>
          <div className="scrollbar-none -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0">
            {(data?.events ?? Array.from({ length: 4 }).map(() => null)).map((e, i) =>
              e ? (
                <EventTile key={e.event.id} rec={e} people={data!.eventPeople} index={i} />
              ) : (
                <div key={i} className="skeleton h-56 w-64 shrink-0" />
              ),
            )}
          </div>
        </section>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Left: profile card */}
        <aside className="hidden space-y-4 lg:block">
          {me ? (
            <Reveal>
              <div className="card overflow-hidden">
                <div className="h-16 bg-brand-600" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
                <div className="-mt-9 px-4 pb-4 text-center">
                  <Avatar name={me.name} hue={me.avatarHue} size={72} className="mx-auto ring-4 ring-white" />
                  <Link href="/profile" className="mt-2 block text-[16px] font-semibold text-ink hover:text-brand-700">
                    {me.name}
                  </Link>
                  <p className="text-[12.5px] text-muted">{me.headline}</p>
                </div>
                <div className="grid grid-cols-3 border-t border-line text-center">
                  {[
                    { k: "Network", v: data?.stats.connections ?? 0 },
                    { k: "Teams", v: data?.stats.teams ?? 0 },
                    { k: "Useful", v: data?.stats.useful ?? 0 },
                  ].map((s) => (
                    <Link key={s.k} href="/connections" className="py-3 hover:bg-canvas">
                      <p className="text-[16px] font-semibold text-ink tabular-nums">{s.v}</p>
                      <p className="text-[11.5px] text-muted">{s.k}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          ) : null}
          <Reveal delay={0.05}>
            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                <Flag className="size-4 text-brand-600" /> Mission
              </p>
              {data?.activeMission ? (
                <>
                  <p className="mt-2 text-[13.5px] font-medium text-ink-2">{data.activeMission.mission.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={data.activeMission.progress} className="h-2" />
                    <span className="text-[12px] font-semibold text-ink tabular-nums">{data.activeMission.progress}%</span>
                  </div>
                </>
              ) : (
                <ButtonLink href="/missions" size="sm" variant="soft" className="mt-3 w-full">
                  Start a mission
                </ButtonLink>
              )}
            </div>
          </Reveal>
        </aside>

        {/* Center: people + feed */}
        <div className="min-w-0 space-y-6">
          {data && data.stats.pendingIn + data.stats.teamInvites > 0 ? (
            <Link href="/connections" className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3.5 text-[13.5px] font-medium text-brand-800">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-[13px] font-bold text-white">{data.stats.pendingIn + data.stats.teamInvites}</span>
              waiting on you — requests & team invites <ArrowRight className="ml-auto size-4" />
            </Link>
          ) : null}
          <Reveal>
            <section>
              <div className="mb-3 flex items-end justify-between">
                <h2 className="text-[17px] font-semibold tracking-tight text-ink">People you should meet</h2>
                <Link href="/discover" className="text-[13px] font-semibold text-brand-700 hover:underline">
                  See all →
                </Link>
              </div>
              {loading && !data ? (
                <LoadingCards n={2} />
              ) : (
                <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0">
                  {data?.matches.map((m, i) => (
                    <div key={m.profile.id} className="w-[86%] shrink-0 snap-center sm:w-[340px]">
                      <MatchCard match={m} rank={i} eventId={data.liveEventId ?? undefined} onChanged={reload} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </Reveal>
          <section>
            <h2 className="mb-3 text-[17px] font-semibold tracking-tight text-ink">Feed</h2>
            {me ? <Feed me={me} /> : null}
          </section>
        </div>

        {/* Right: radar */}
        <aside className="space-y-4">
          <Reveal delay={0.08}>
            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                <Radar className="size-4 text-brand-600" /> Opportunity Radar
              </p>
              <ul className="mt-3 space-y-1">
                {!data
                  ? Array.from({ length: 3 }).map((_, i) => <li key={i} className="skeleton h-14" />)
                  : data.radar.length
                    ? data.radar.map((r) => {
                        const Icon = RADAR_ICON[r.kind];
                        return (
                          <li key={r.id}>
                            <Link href={r.href} className="flex gap-3 rounded-2xl p-2 transition-colors hover:bg-canvas">
                              <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl", RADAR_TONE[r.kind])}>
                                <Icon className="size-4" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[13px] font-medium text-ink">{r.title}</span>
                                <span className="line-clamp-2 block text-[12px] text-muted">{r.body}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })
                    : <li className="text-[13px] text-muted">Join an event to light this up.</li>}
              </ul>
            </div>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}

function EventTile({ rec, people, index }: { rec: EventRecommendation; people: Record<string, PublicProfile>; index: number }) {
  const faces = rec.topPeople.map((t) => people[t.userId]).filter((p): p is PublicProfile => Boolean(p));
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index, 6) * 0.05 }} className="w-64 shrink-0 snap-start">
      <Link href={`/events/${rec.event.id}`} className="card card-hover group block overflow-hidden">
        <EventCover event={rec.event} variant="compact" live={rec.live} />
        <div className="p-3.5">
          <p className="mb-1 text-[9px] font-semibold tracking-wide text-faint uppercase">{rec.event.isSample ? "Sample event" : rec.event.source?.kind === "ics" ? "From public calendar" : "Event"}</p>
          <p className="line-clamp-2 text-[14.5px] leading-snug font-semibold text-ink">{rec.event.title}</p>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">
            {fmtTime(rec.event.start)} · {rec.event.venue.replace(" (sample)", "")}
          </p>
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex -space-x-2">
              {faces.slice(0, 3).map((p) => (
                <Avatar key={p.id} name={p.name} hue={p.avatarHue} size={24} />
              ))}
            </div>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] font-semibold text-brand-700">{rec.score} fit</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
