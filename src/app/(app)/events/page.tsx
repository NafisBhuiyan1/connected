"use client";

import { motion } from "motion/react";
import { ArrowRight, Briefcase, CalendarDays, CheckCircle2, GraduationCap, Landmark, MapPin, Mic, Radio, Users, Wrench, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ImportEventsButton } from "@/components/import-events";
import { fmtDistance, haversineM, NearMeButton } from "@/components/location";
import { PeopleStack } from "@/components/people";
import { Badge, Card, cx, Empty, ErrorBox, PageHeader, Progress, Skeleton } from "@/components/ui";
import { fmtDateTime, useApi } from "@/lib/client";
import type { EventRecommendation } from "@/lib/engine/events";
import type { ConnectedEvent, PublicProfile } from "@/lib/types";
import { EVENT_SUBJECTS, eventSubjects } from "@/lib/event-subjects";

interface EventsResponse {
  events: EventRecommendation[];
  people: Record<string, PublicProfile>;
  feeds?: { name: string; ok: boolean; syncedAt?: string; count?: number }[];
}

function ago(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

const KIND_LABEL: Record<ConnectedEvent["kind"], string> = {
  hackathon: "Hackathon",
  "career-fair": "Career fair",
  pitch: "Pitch night",
  meetup: "Meetup",
  workshop: "Workshop",
  conference: "Conference",
  seminar: "Seminar",
};

const KIND_PLURAL: Record<ConnectedEvent["kind"], string> = {
  hackathon: "Hackathons",
  "career-fair": "Career fairs",
  pitch: "Pitch nights",
  meetup: "Meetups",
  workshop: "Workshops",
  conference: "Conferences",
  seminar: "Seminars",
};

export default function EventsPage() {
  const { data, error, loading, reload } = useApi<EventsResponse>("/api/events");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [kind, setKind] = useState<ConnectedEvent["kind"] | "all">("all");
  const [realOnly, setRealOnly] = useState(false);
  const [subject, setSubject] = useState("all");
  const all = (data?.events ?? []).filter((e) => (!realOnly || !e.event.isSample) && (subject === "all" || eventSubjects(e.event).includes(subject)));
  const synced = (data?.feeds ?? []).filter((f) => f.syncedAt);
  const realCount = (data?.events ?? []).filter((e) => !e.event.isSample && (subject === "all" || eventSubjects(e.event).includes(subject))).length;
  const counts = all.reduce<Partial<Record<ConnectedEvent["kind"], number>>>((acc, e) => ({ ...acc, [e.event.kind]: (acc[e.event.kind] ?? 0) + 1 }), {});
  const events = kind === "all" ? all : all.filter((e) => e.event.kind === kind);
  const dist = (e: EventRecommendation) => (pos && e.event.geo ? haversineM(pos, e.event.geo) : undefined);
  const featured = events.find((e) => e.live) ?? null;
  const rest = events
    .filter((e) => e !== featured)
    .sort((a, b) => (pos ? (dist(a) ?? Infinity) - (dist(b) ?? Infinity) : 0));

  return (
    <div>
      <PageHeader
        title="Events"
        sub="Ranked by who's going — not just the topic."
        action={
          <div className="flex items-center gap-2">
            <ImportEventsButton onImported={reload} />
            <NearMeButton active={Boolean(pos)} onPosition={setPos} />
          </div>
        }
      />
      {pos ? <p className="-mt-3 mb-4 text-[12px] text-muted">Distances are computed on this device — your location isn&apos;t sent anywhere.</p> : null}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-medium text-ink-2">
          <GraduationCap className="size-4 shrink-0 text-brand-600" />
          <select aria-label="Explore events by major or interest" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-ink sm:max-w-xs">
            <option value="all">All majors & interests</option>
            {EVENT_SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        {subject !== "all" ? <button className="text-[13px] font-medium text-brand-700" onClick={() => { setSubject("all"); setKind("all"); }}>Clear subject</button> : null}
      </div>

      {synced.length ? (
        <div className="-mt-2 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live from {synced.map((f) => f.name).join(" + ")}
          </span>
          <span>synced {ago(synced.map((f) => f.syncedAt!).sort().at(-1)!)}</span>
        </div>
      ) : null}

      {data?.events.length ? (
        <div className="[scrollbar-width:none] -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            onClick={() => setRealOnly((v) => !v)}
            className={cx(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              realOnly ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
            )}
          >
            <CheckCircle2 className="size-3.5" /> Real only
            <span className={cx("text-[11.5px] tabular-nums", realOnly ? "text-white/80" : "text-emerald-700/70")}>{realCount}</span>
          </button>
          {(["all", ...(Object.keys(KIND_LABEL) as ConnectedEvent["kind"][]).filter((k) => counts[k])] as const).map((k) => {
            const on = kind === k;
            const Icon = k === "all" ? CalendarDays : COVER[k].icon;
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cx(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                  on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-2 hover:border-brand-200 hover:bg-brand-50",
                )}
              >
                <Icon className="size-3.5" />
                {k === "all" ? "All" : KIND_PLURAL[k]}
                <span className={cx("text-[11.5px] tabular-nums", on ? "text-white/80" : "text-faint")}>{k === "all" ? all.length : counts[k]}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-52 w-full rounded-2xl" />
          </div>
        </div>
      ) : null}

      {data && !events.length ? (
        <Empty icon={<CalendarDays className="size-5" />} title="No events in this view" body="Try another subject or event type, or turn off Real only. Calendar sources may not list every major yet." />
      ) : null}

      {featured ? <FeaturedEvent rec={featured} people={data!.people} distance={dist(featured)} /> : null}

      {rest.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rest.map((rec, i) => (
            <EventCard key={rec.event.id} rec={rec} people={data!.people} index={i} distance={dist(rec)} />
          ))}
        </div>
      ) : null}

      {data ? <p className="mt-6 text-[12px] text-muted">Fit = topic overlap + who&apos;s opted in + timing. “Sample” events are illustrative; “Imported” ones come from real calendars.</p> : null}
    </div>
  );
}

function FeaturedEvent({ rec, people, distance }: { rec: EventRecommendation; people: Record<string, PublicProfile>; distance?: number }) {
  const ev = rec.event;
  const top = rec.topPeople.map((t) => people[t.userId]).filter(Boolean);
  const strong = rec.topPeople.filter((t) => t.score >= 60).length;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link href={`/events/${ev.id}`} className="group block">
        <div className="brand-gradient relative overflow-hidden rounded-3xl p-[1.5px] shadow-[var(--shadow-lift)]">
          <div className="relative overflow-hidden rounded-[22px] bg-surface p-5 sm:p-7">
            <div className="brand-gradient-soft pointer-events-none absolute inset-0" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="green" icon={<Radio className="size-3" />}>
                    Live now
                  </Badge>
                  <Badge tone="brand">{KIND_LABEL[ev.kind]}</Badge>
                  {ev.isSample ? <Badge>Sample event</Badge> : null}
                  {rec.optedIn ? (
                    <Badge tone="violet" icon={<CheckCircle2 className="size-3" />}>
                      You&apos;re opted in
                    </Badge>
                  ) : rec.joined ? (
                    <Badge>Joined · hidden</Badge>
                  ) : null}
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{ev.title}</h2>
                <p className="mt-1 text-[14px] font-medium text-ink-2">{ev.host}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" /> {fmtDateTime(ev.start)} – {fmtDateTime(ev.end)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {ev.venue}
                    {distance !== undefined ? <b className="font-semibold text-brand-700">· {fmtDistance(distance)}</b> : null}
                  </span>
                </div>
                <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-2">{ev.description}</p>
                {rec.reasons.length ? (
                  <ul className="mt-4 space-y-1.5">
                    {rec.reasons.map((r) => (
                      <li key={r} className="flex gap-2 text-[13.5px] text-ink-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="w-full shrink-0 rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur lg:w-72">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] font-medium text-muted">Your fit</span>
                  <span className="text-2xl font-semibold tabular-nums text-ink">{rec.score}</span>
                </div>
                <Progress value={rec.score} className="mt-2" />
                <div className="mt-4 flex items-center justify-between gap-3">
                  {top.length ? <PeopleStack people={top.map((p) => ({ name: p.name, hue: p.avatarHue }))} size={30} /> : <span />}
                  <span className="text-right text-[12px] text-muted">
                    {strong ? `${strong} strong ${strong === 1 ? "match" : "matches"}` : "Top matches"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12.5px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" /> {rec.attendeeCount} attending · {rec.optedInCount} opted in
                  </span>
                </div>
                <div className="brand-gradient mt-4 flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white transition group-hover:brightness-110">
                  Open networking space <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const COVER: Record<ConnectedEvent["kind"], { from: string; to: string; icon: React.ComponentType<{ className?: string }> }> = {
  hackathon: { from: "#4c1d95", to: "#db2777", icon: Zap },
  "career-fair": { from: "#0c4a6e", to: "#0891b2", icon: Briefcase },
  pitch: { from: "#7c2d12", to: "#f59e0b", icon: Mic },
  meetup: { from: "#312e81", to: "#7c3aed", icon: Users },
  workshop: { from: "#064e3b", to: "#10b981", icon: Wrench },
  conference: { from: "#1e1b4b", to: "#6366f1", icon: Landmark },
  seminar: { from: "#3b0764", to: "#a855f7", icon: GraduationCap },
};

function EventCover({ kind, start, live, attendees }: { kind: ConnectedEvent["kind"]; start: string; live: boolean; attendees: number }) {
  const c = COVER[kind];
  const d = new Date(start);
  return (
    <div className="relative -mx-5 -mt-5 mb-4 h-32 overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
      <div className="absolute -right-6 -bottom-8 size-36 rounded-full bg-white/15 blur-2xl" />
      <c.icon className="absolute right-5 bottom-4 size-14 text-white/85 drop-shadow-[0_0_18px_rgba(255,255,255,0.6)]" />
      <div className="absolute top-3 left-4 flex flex-col items-center rounded-xl bg-black/30 px-2.5 py-1 text-white backdrop-blur">
        <span className="text-[10px] font-semibold tracking-wide uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
        <span className="text-[20px] leading-none font-bold">{d.getDate()}</span>
      </div>
      <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[12px] font-medium text-white/90">
        {live ? <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" /> : null}
        {attendees} going
      </div>
    </div>
  );
}

function EventCard({ rec, people, index, distance }: { rec: EventRecommendation; people: Record<string, PublicProfile>; index: number; distance?: number }) {
  const ev = rec.event;
  const top = rec.topPeople.map((t) => people[t.userId]).filter(Boolean);
  const strong = rec.topPeople.filter((t) => t.score >= 60).length;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(0.4, index * 0.05) }}>
      <Link href={`/events/${ev.id}`} className="block h-full">
        <Card className="card-hover flex h-full flex-col overflow-hidden p-5">
          <EventCover kind={ev.kind} start={ev.start} live={rec.live} attendees={rec.attendeeCount} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">{KIND_LABEL[ev.kind]}</Badge>
              {rec.live ? (
                <Badge tone="green" icon={<Radio className="size-3" />}>
                  Live now
                </Badge>
              ) : null}
              {ev.isSample ? <Badge>Sample event</Badge> : null}
              {ev.source?.kind === "ics" ? <Badge tone="green">Imported</Badge> : null}
            </div>
            {rec.optedIn ? (
              <Badge tone="violet" icon={<CheckCircle2 className="size-3" />}>
                Opted in
              </Badge>
            ) : rec.joined ? (
              <Badge>Joined</Badge>
            ) : null}
          </div>
          <h3 className="mt-3 text-[17px] font-semibold tracking-tight text-ink">{ev.title}</h3>
          <p className="text-[13px] text-muted">{ev.host}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" /> {fmtDateTime(ev.start)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" /> {ev.venue}
              {distance !== undefined ? <b className="font-semibold text-brand-700">· {fmtDistance(distance)}</b> : null}
            </span>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex items-baseline justify-between text-[12px]">
              <span className="font-medium text-muted">Fit for your goals</span>
              <span className={cx("font-semibold tabular-nums", rec.score >= 60 ? "text-brand-700" : "text-ink-2")}>{rec.score}</span>
            </div>
            <Progress value={rec.score} />
          </div>
          {rec.reasons.length ? (
            <div className="mt-4 flex-1">
              <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-faint uppercase">Why this event</p>
              <ul className="space-y-1.5">
                {rec.reasons.slice(0, 3).map((r) => (
                  <li key={r} className="flex gap-2 text-[13px] leading-snug text-ink-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 flex-1 text-[13px] text-muted">{ev.description}</p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
            <div className="flex items-center gap-2">
              {top.length ? <PeopleStack people={top.map((p) => ({ name: p.name, hue: p.avatarHue }))} size={24} /> : null}
              <span className="text-[12px] text-muted">{strong ? `${strong} strong ${strong === 1 ? "match" : "matches"}` : `${rec.optedInCount} opted in`}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] text-muted">
              <Users className="size-3.5" /> {rec.attendeeCount}
            </span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
