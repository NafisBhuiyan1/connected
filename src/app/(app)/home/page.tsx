"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Flag,
  GraduationCap,
  Handshake,
  Radar,
  Radio,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingCards, MatchCard, PeopleStack, type MatchWithState } from "@/components/people";
import { Badge, ButtonLink, Card, cx, ErrorBox, Progress, SectionTitle } from "@/components/ui";
import { firstName, fmtDateTime, useApi } from "@/lib/client";
import type { EventRecommendation } from "@/lib/engine/events";
import type { Mission, Profile, PublicProfile } from "@/lib/types";

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
  mentor: "bg-violet-soft text-violet-600",
  "mutual-path": "bg-sky-50 text-sky-600",
} as const;

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still hacking" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<HomeData>("/api/home", { poll: 8000 });
  const [idea, setIdea] = useState("");

  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const me = data?.me;
  const live = data?.events.find((e) => e.event.id === data.liveEventId);

  const submitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length > 6) router.push(`/build?pitch=${encodeURIComponent(idea)}${data?.liveEventId ? `&event=${data.liveEventId}` : ""}&auto=1`);
  };
  const livePeople = live ? live.topPeople.map((t) => data?.eventPeople[t.userId]).filter((p): p is PublicProfile => Boolean(p)) : [];

  return (
    <div className="space-y-7">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[28px] bg-ink px-5 pt-6 pb-5 text-white sm:px-8 sm:pt-8 sm:pb-7"
      >
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-10 size-72 rounded-full bg-violet-500/30 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div className="relative">
          <p className="text-[13px] font-medium text-white/60">
            {greeting()}
            {me ? `, ${firstName(me.name)}` : ""} 👋
          </p>
          <h1 className="mt-1.5 text-[30px] leading-[1.08] font-semibold tracking-[-0.02em] sm:text-[38px]">
            Who will you build
            <br className="sm:hidden" /> with{" "}
            <span className="bg-gradient-to-r from-brand-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">today</span>?
          </h1>
          <form
            onSubmit={submitIdea}
            className="mt-5 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 pl-4 backdrop-blur focus-within:border-white/30 focus-within:bg-white/15"
          >
            <Wand2 className="size-4 shrink-0 text-brand-200" />
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Your idea → your team"
              className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/45"
            />
            <button className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 text-[13.5px] font-semibold text-ink transition-transform active:scale-95">
              Build <ArrowRight className="size-3.5" />
            </button>
          </form>
          {live ? (
            <Link href={`/events/${live.event.id}`} className="group mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10 transition-colors hover:bg-white/[0.11]">
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-emerald-400" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold">{live.event.title}</p>
                <p className="truncate text-[12px] text-white/60">Live · {live.optedInCount} in the space</p>
              </div>
              <div className="flex -space-x-2">
                {livePeople.slice(0, 3).map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex size-7 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-ink"
                    style={{ background: `linear-gradient(135deg, hsl(${p.avatarHue} 70% 58%), hsl(${(p.avatarHue + 40) % 360} 72% 48%))` }}
                  >
                    {p.name.replace(/^Dr\.\s+/, "").split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </span>
                ))}
              </div>
              <ArrowRight className="size-4 shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
      </motion.section>

      {data ? (
        <section className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:px-0">
          {[
            { k: "Waiting on you", v: data.stats.pendingIn + data.stats.teamInvites, href: "/connections", icon: Sparkles, hot: data.stats.pendingIn + data.stats.teamInvites > 0 },
            { k: "Connections", v: data.stats.connections, href: "/connections", icon: Users },
            { k: "Teams", v: data.stats.teams, href: "/connections", icon: Wand2 },
            { k: "Useful chats", v: data.stats.useful, href: "/connections", icon: Handshake },
          ].map((s) => (
            <Link
              key={s.k}
              href={s.href}
              className={cx("card card-hover flex min-w-[132px] shrink-0 items-center gap-3 p-3 sm:min-w-0 sm:p-4", s.hot && "border-brand-200 bg-brand-50/60")}
            >
              <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl", s.hot ? "brand-gradient text-white" : "bg-canvas text-ink-2")}>
                <s.icon className="size-4" />
              </span>
              <span>
                <span className="block text-xl leading-none font-semibold text-ink tabular-nums">{s.v}</span>
                <span className="mt-1 block text-[11.5px] whitespace-nowrap text-muted">{s.k}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <section>
            <SectionTitle
              title="People you should meet"
              sub={data?.activeMission ? `For your mission: ${data.activeMission.mission.title}` : "Ranked for your goal and the events you've joined"}
              action={
                <Link href="/discover" className="text-[13px] font-medium text-brand-700 hover:underline">
                  See all →
                </Link>
              }
            />
            {loading && !data ? (
              <LoadingCards n={4} />
            ) : (
              <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0">
                {data?.matches.map((m, i) => (
                  <div key={m.profile.id} className="w-[86%] shrink-0 snap-center sm:w-auto">
                    <MatchCard match={m} rank={i} eventId={data.liveEventId ?? undefined} onChanged={reload} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                <Flag className="size-4 text-brand-600" /> Current mission
              </p>
              <Link href="/missions" className="text-[12.5px] font-medium text-brand-700">
                All
              </Link>
            </div>
            {data?.activeMission ? (
              <div className="mt-3">
                <p className="text-[14.5px] font-semibold text-ink">{data.activeMission.mission.title}</p>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={data.activeMission.progress} className="h-2" />
                  <span className="text-[13px] font-semibold text-ink tabular-nums">{data.activeMission.progress}%</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {data.activeMission.steps.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-[12.5px]">
                      <span className={s.value >= s.target ? "text-ink-2 line-through decoration-emerald-400" : "text-ink-2"}>{s.label}</span>
                      <span className="text-muted tabular-nums">
                        {s.value}/{s.target}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-[13.5px] text-muted">Set a goal like “Build a hackathon team” and track real outcomes, not connection counts.</p>
                <ButtonLink href="/missions" size="sm" variant="soft" className="mt-3">
                  Start a mission
                </ButtonLink>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
              <Radar className="size-4 text-brand-600" /> Opportunity Radar
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted">Opportunities that fit your skills and goals.</p>
            <ul className="mt-4 space-y-2">
              {!data
                ? Array.from({ length: 3 }).map((_, i) => <li key={i} className="skeleton h-16" />)
                : data.radar.length
                  ? data.radar.map((r, i) => {
                      const Icon = RADAR_ICON[r.kind];
                      return (
                        <motion.li key={r.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                          <Link href={r.href} className="flex gap-3 rounded-2xl p-2.5 hover:bg-canvas">
                            <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl", RADAR_TONE[r.kind])}>
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13.5px] font-medium text-ink">{r.title}</span>
                              <span className="line-clamp-2 block text-[12.5px] text-muted">{r.body}</span>
                            </span>
                          </Link>
                        </motion.li>
                      );
                    })
                  : <li className="text-[13px] text-muted">Join an event's networking space to light up your radar.</li>}
            </ul>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                <CalendarDays className="size-4 text-brand-600" /> Events for your goal
              </p>
              <Link href="/events" className="text-[12.5px] font-medium text-brand-700">
                All
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {data?.events.map((e) => (
                <li key={e.event.id}>
                  <Link href={`/events/${e.event.id}`} className="block rounded-2xl border border-line p-3 hover:border-line-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13.5px] font-semibold text-ink">{e.event.title}</p>
                      {e.live ? <Badge tone="green">Live</Badge> : e.event.isSample ? <Badge>Sample</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted">{fmtDateTime(e.event.start)}</p>
                    {e.reasons[0] ? <p className="mt-1.5 text-[12.5px] text-ink-2">{e.reasons[0]}</p> : null}
                    <div className="mt-2 flex items-center justify-between">
                      <PeopleStack
                        people={e.topPeople.map((t) => data.eventPeople[t.userId]).filter((p): p is PublicProfile => Boolean(p)).map((p) => ({ name: p.name, hue: p.avatarHue }))}
                        size={22}
                      />
                      <span className="text-[11.5px] text-muted">{e.optedInCount} opted in</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
