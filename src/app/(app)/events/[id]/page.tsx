"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  CalendarDays,
  Coffee,
  GraduationCap,
  Headphones,
  Lightbulb,
  Lock,
  LogOut,
  MapPin,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConnectDialog, LoadingCards, MatchCard, PersonHeader, type RequestState } from "@/components/people";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Chip, cx, Empty, ErrorBox, Field, Input, Select, Skeleton, Toggle } from "@/components/ui";
import { ZoneLegend, ZoneMap, type MapPerson } from "@/components/zone-map";
import { LocationCheckIn } from "@/components/location";
import { EventLounge } from "@/components/event-lounge";
import { EventCover } from "@/components/event-cover";
import { ExternalLink, MapPinCheck, MessageCircle } from "lucide-react";
import { api, fmtDateTime, fmtTime, useApi } from "@/lib/client";
import type { EventInsights } from "@/lib/engine/events";
import { interestLabel } from "@/lib/ontology";
import type { ConnectedEvent, LiveMode, MatchResult, Membership, PublicProfile } from "@/lib/types";

type Participant = MatchResult & { zone: string | null; requestState: RequestState };

interface OpenRole {
  teamId: string;
  title: string;
  pitch: string;
  owner: PublicProfile | null;
  roles: { roleId: string; label: string; myFit: number }[];
}

interface EventDetail {
  event: ConnectedEvent;
  membership: Membership | null;
  canBrowse: boolean;
  participants: Participant[];
  zoneCounts: Record<string, number>;
  insights: EventInsights;
  openRoles: OpenRole[];
  attendeeCount: number;
}

type JoinBody = {
  optIn: boolean;
  zone?: string | null;
  leave?: boolean;
  checkIn?: boolean;
  status?: { mode: LiveMode; topics: string[]; maxRequests: number; minutes: number } | null;
};

const MODES: { id: LiveMode; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "quick-chat", label: "Quick chat", sub: "Open to 10-min chats", icon: Coffee },
  { id: "team-up", label: "Team up", sub: "Looking to join or form a team", icon: Users },
  { id: "mentoring", label: "Mentoring", sub: "Happy to help others", icon: GraduationCap },
  { id: "heads-down", label: "Heads-down", sub: "Building — requests paused", icon: Headphones },
];

const KIND_LABEL: Record<ConnectedEvent["kind"], string> = {
  hackathon: "Hackathon",
  "career-fair": "Career fair",
  pitch: "Pitch night",
  meetup: "Meetup",
  workshop: "Workshop",
  conference: "Conference",
  seminar: "Seminar",
};

function useEventSave(id: string, reload: () => Promise<void>) {
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  async function save(body: JoinBody, key: string, success?: { title: string; body?: string }) {
    setSaving(key);
    try {
      await api(`/api/events/${id}`, { body });
      await reload();
      if (success) toast({ tone: "success", ...success });
    } catch (e) {
      toast({ tone: "error", title: "Couldn't update", body: (e as Error).message });
    } finally {
      setSaving(null);
    }
  }
  return { save, saving };
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<EventDetail>(`/api/events/${id}`, { poll: 5000 });
  const [tab, setTab] = useState<"space" | "lounge" | "insights">("space");
  const { save, saving } = useEventSave(id, reload);
  useEffect(() => {
    if (window.location.hash === "#lounge") setTab("lounge");
  }, []);

  if (error && !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBox message={error} onRetry={reload} />
      </div>
    );
  }
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }
  if (!data) return null;

  const { event } = data;
  const live = new Date(event.start) <= new Date() && new Date(event.end) >= new Date();

  return (
    <div>
      <BackLink />
      <EventHeader event={event} live={live} attendeeCount={data.attendeeCount} optedIn={data.insights.optedIn} />

      <div className="mt-6 flex gap-1 rounded-2xl border border-line bg-surface p-1 sm:inline-flex">
        {(
          [
            { id: "space", label: "People", icon: Radio },
            { id: "lounge", label: "Lounge", icon: MessageCircle },
            { id: "insights", label: "Insights", icon: BarChart3 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "focus-ring relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-medium transition-colors sm:flex-none",
              tab === t.id ? "text-brand-700" : "text-muted hover:text-ink",
            )}
          >
            {tab === t.id ? <motion.span layoutId="event-tab" className="absolute inset-0 rounded-xl bg-brand-50" transition={{ type: "spring", stiffness: 400, damping: 34 }} /> : null}
            <t.icon className="relative size-4" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "space" ? (
          <SpaceTab data={data} reload={reload} save={save} saving={saving} />
        ) : tab === "lounge" ? (
          <div id="lounge">
            <EventLounge eventId={event.id} joined={Boolean(data.membership)} />
          </div>
        ) : (
          <InsightsTab insights={data.insights} />
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/events" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" /> All events
    </Link>
  );
}

function EventHeader({ event, live, attendeeCount, optedIn }: { event: ConnectedEvent; live: boolean; attendeeCount: number; optedIn: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7">
      <EventCover event={event} variant="hero" priority live={live} attendees={attendeeCount} className="-mx-5 -mt-5 mb-5 sm:-mx-7 sm:-mt-7 sm:mb-6" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <Badge tone="green" icon={<Radio className="size-3" />}>
              Live now
            </Badge>
          ) : null}
          <Badge tone="brand">{KIND_LABEL[event.kind]}</Badge>
          {event.isSample ? <Badge>Sample event</Badge> : null}
          {event.source?.kind === "ics" ? <Badge tone="green">Imported from calendar</Badge> : null}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-[30px]">{event.title}</h1>
        <p className="mt-1 text-[14px] font-medium text-ink-2">{event.host}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> {fmtDateTime(event.start)} – {fmtDateTime(event.end)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {event.venue}
            {event.source?.approximate ? <span className="text-faint">(approx. pin)</span> : null}
          </span>
          {event.link ? (
            <a href={event.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
              <ExternalLink className="size-3.5" /> Event page
            </a>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" /> {attendeeCount} attending · {optedIn} opted in to networking
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-ink-2">{event.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {event.tags.map((t) => (
            <Badge key={t}>{interestLabel(t)}</Badge>
          ))}
        </div>
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-brand-100 bg-brand-50/60 px-3.5 py-3 text-[13px] text-ink-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <span>
            You only see the networking space after you opt in yourself. Others see your general zone, never your location. Opt out any time — you&apos;ll disappear from discovery instantly.
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------- Networking space ----------------

function SpaceTab({
  data,
  reload,
  save,
  saving,
}: {
  data: EventDetail;
  reload: () => Promise<void>;
  save: (body: JoinBody, key: string, success?: { title: string; body?: string }) => Promise<void>;
  saving: string | null;
}) {
  const { me } = useSession();
  const { event, membership, canBrowse, participants, zoneCounts } = data;
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [liveOnly, setLiveOnly] = useState(false);
  const [hereOnly, setHereOnly] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const statusActive = Boolean(membership?.status && new Date(membership.status.until) > new Date());

  const mapPeople: MapPerson[] = useMemo(() => {
    const list: MapPerson[] = participants.map((p) => ({
      id: p.profile.id,
      name: p.profile.name,
      hue: p.profile.avatarHue,
      score: p.score,
      zone: p.zone,
      live: Boolean(p.liveNow && p.liveNow.mode !== "heads-down"),
    }));
    if (me && membership?.optIn && membership.zone) {
      list.push({
        id: me.id,
        name: me.name,
        hue: me.avatarHue,
        score: 0,
        zone: membership.zone,
        live: statusActive && membership.status?.mode !== "heads-down",
        isMe: true,
      });
    }
    return list;
  }, [participants, me, membership, statusActive]);

  const filtered = useMemo(
    () =>
      participants
        .filter(
          (p) =>
            (!selectedZone || p.zone === selectedZone) &&
            (!liveOnly || (p.liveNow && p.liveNow.mode !== "heads-down")) &&
            (!hereOnly || p.hereNow),
        )
        .sort((a, b) => b.score - a.score),
    [participants, selectedZone, liveOnly, hereOnly],
  );
  const visible = showAll ? filtered : filtered.slice(0, 12);
  const liveCount = participants.filter((p) => p.liveNow && p.liveNow.mode !== "heads-down").length;
  const hereCount = participants.filter((p) => p.hereNow).length;
  const zoneName = (zid: string | null) => event.zones.find((z) => z.id === zid)?.name;

  function selectPerson(pid: string) {
    const person = participants.find((p) => p.profile.id === pid);
    if (!person) return;
    if (selectedZone && person.zone !== selectedZone) setSelectedZone(null);
    if (liveOnly && !(person.liveNow && person.liveNow.mode !== "heads-down")) setLiveOnly(false);
    const idx = [...participants].sort((a, b) => b.score - a.score).findIndex((p) => p.profile.id === pid);
    if (idx >= 12) setShowAll(true);
    setHighlighted(pid);
    setTimeout(() => document.getElementById(`p-${pid}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Zone map */}
        <Card className="overflow-hidden p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-ink">Zone map</h2>
              <p className="text-[12.5px] text-muted">
                {canBrowse ? "Tap a zone to filter people · tap a dot to find them in the list" : "Opt in to see who's in each zone"}
              </p>
            </div>
            {selectedZone ? (
              <Button size="sm" variant="ghost" onClick={() => setSelectedZone(null)}>
                Clear zone filter
              </Button>
            ) : null}
          </div>
          <div className="relative">
            <ZoneMap
              zones={event.zones}
              people={canBrowse ? mapPeople : []}
              zoneCounts={zoneCounts}
              selectedZone={selectedZone}
              onSelectZone={(z) => {
                setSelectedZone(z);
                setHighlighted(null);
              }}
              highlightedId={highlighted}
              onSelectPerson={selectPerson}
            />
            {!canBrowse ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-surface/40 backdrop-blur-[1.5px]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-2 shadow-[var(--shadow-card)]">
                  <Lock className="size-3.5" /> Counts only until you opt in
                </span>
              </div>
            ) : null}
          </div>
          <ZoneLegend className="mt-3" />
        </Card>

        {/* Join / status panel */}
        <JoinPanel
          key={membership ? `${membership.joinedAt}-${membership.optIn}-${membership.zone ?? ""}` : "none"}
          event={event}
          membership={membership}
          statusActive={statusActive}
          save={save}
          saving={saving}
        />
      </div>

      {/* Open roles */}
      {data.openRoles.length ? <OpenRoles roles={data.openRoles} eventId={event.id} /> : null}

      {/* Participants */}
      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              People in the networking space{canBrowse ? ` · ${filtered.length}` : ""}
            </h2>
            <p className="text-[13px] text-muted">
              {selectedZone ? `Showing ${zoneName(selectedZone)}` : "Ranked by fit with your profile and goals"}
              {canBrowse ? " · only people who opted in" : ""}
            </p>
          </div>
          {canBrowse ? (
            <div className="flex gap-1.5">
              <Chip selected={hereOnly} onClick={() => setHereOnly((v) => !v)} icon={<MapPinCheck className="size-3.5 text-emerald-600" />}>
                Here now · {hereCount}
              </Chip>
              <Chip selected={liveOnly} onClick={() => setLiveOnly((v) => !v)} icon={<span className="size-1.5 rounded-full bg-emerald-500" />}>
                Open now · {liveCount}
              </Chip>
            </div>
          ) : null}
        </div>

        {canBrowse ? (
          <>
            <div className="scrollbar-none -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              <Chip selected={!selectedZone} onClick={() => setSelectedZone(null)}>
                All zones
              </Chip>
              {event.zones.map((z) => {
                const n = participants.filter((p) => p.zone === z.id).length;
                return (
                  <Chip key={z.id} selected={selectedZone === z.id} onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)} className="shrink-0">
                    {z.name}
                    <span className="text-faint">{n}</span>
                  </Chip>
                );
              })}
            </div>
            {filtered.length ? (
              <>
                <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {visible.map((m, i) => (
                      <motion.div
                        key={m.profile.id}
                        id={`p-${m.profile.id}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cx("min-w-0 rounded-2xl transition-shadow", highlighted === m.profile.id && "ring-2 ring-amber-400 ring-offset-2 ring-offset-canvas")}
                      >
                        <MatchCard match={m} eventId={event.id} rank={i} onChanged={reload} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
                {filtered.length > 12 ? (
                  <div className="mt-4 flex justify-center">
                    <Button variant="secondary" onClick={() => setShowAll((v) => !v)}>
                      {showAll ? "Show fewer" : `Show all ${filtered.length}`}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <Empty
                icon={<Users className="size-5" />}
                title={liveOnly ? "Nobody here is live right now" : "No one in this zone yet"}
                body="Try another zone, or set your own live status so others can find you."
              />
            )}
          </>
        ) : (
          <LockedSpace membership={membership} event={event} save={save} saving={saving} />
        )}
      </section>
    </div>
  );
}

function LockedSpace({
  membership,
  event,
  save,
  saving,
}: {
  membership: Membership | null;
  event: ConnectedEvent;
  save: (body: JoinBody, key: string, success?: { title: string; body?: string }) => Promise<void>;
  saving: string | null;
}) {
  const defaultZone = membership?.zone ?? event.zones.find((z) => z.meetingSpot)?.id ?? event.zones[0]?.id;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-line-2 bg-surface/70 p-6 text-center sm:p-10">
      <div className="pointer-events-none absolute inset-0 opacity-50 blur-[3px]">
        <LoadingCards n={3} />
      </div>
      <div className="relative mx-auto max-w-md">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Lock className="size-5" />
        </div>
        <p className="text-[16px] font-semibold text-ink">Opt in to see who&apos;s here</p>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Discovery is reciprocal: you can browse the networking space once you&apos;re discoverable too. You choose your zone and can opt out any time.
        </p>
        <Button
          className="mt-4"
          loading={saving === "locked"}
          icon={<Sparkles className="size-4" />}
          onClick={() =>
            save({ optIn: true, zone: defaultZone }, "locked", {
              title: membership ? "You're discoverable" : `Joined ${event.title}`,
              body: "You're in the networking space now.",
            })
          }
        >
          {membership ? "Opt in to discovery" : "Join & opt in"}
        </Button>
      </div>
    </div>
  );
}

function JoinPanel({
  event,
  membership,
  statusActive,
  save,
  saving,
}: {
  event: ConnectedEvent;
  membership: Membership | null;
  statusActive: boolean;
  save: (body: JoinBody, key: string, success?: { title: string; body?: string }) => Promise<void>;
  saving: string | null;
}) {
  const defaultZone = membership?.zone ?? event.zones.find((z) => z.meetingSpot)?.id ?? event.zones[0]?.id ?? "";
  const [zone, setZone] = useState<string>(defaultZone);
  const [mode, setMode] = useState<LiveMode>(membership?.status?.mode ?? "team-up");
  const [topics, setTopics] = useState<string>(membership?.status?.topics.join(", ") ?? "");
  const [minutes, setMinutes] = useState<number>(120);
  const [maxRequests, setMaxRequests] = useState<number>(membership?.status?.maxRequests || 5);

  if (!membership) {
    return (
      <Card className="flex flex-col p-5">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Join this event</h2>
        <p className="mt-1 text-[13px] text-muted">Pick the zone you&apos;re in — it&apos;s approximate and you can change it any time.</p>
        <div className="mt-4 space-y-4">
          <LocationCheckIn
            event={event}
            onCheckIn={() => save({ optIn: true, zone, checkIn: true }, "checkin", { title: "Checked in 📍", body: "You're at the venue — your coordinates never left your phone." })}
          />
          <Field label="Your zone" htmlFor="join-zone">
            <Select id="join-zone" value={zone} onChange={(e) => setZone(e.target.value)}>
              {event.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                  {z.meetingSpot ? " · meeting spot" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            className="w-full"
            loading={saving === "join"}
            icon={<Sparkles className="size-4" />}
            onClick={() => save({ optIn: true, zone }, "join", { title: `Joined ${event.title}`, body: "You're discoverable in the networking space." })}
          >
            Join &amp; opt in
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            loading={saving === "join-hidden"}
            onClick={() => save({ optIn: false, zone }, "join-hidden", { title: "Joined without discovery", body: "Nobody can find you here until you opt in." })}
          >
            Just attend (stay hidden)
          </Button>
        </div>
      </Card>
    );
  }

  const status = membership.status;
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">You at this event</h2>
        {membership.optIn ? <Badge tone="violet">Discoverable</Badge> : <Badge>Hidden</Badge>}
      </div>
      <LocationCheckIn
        event={event}
        checkedInAt={membership.checkedInAt}
        onCheckIn={() => save({ optIn: membership.optIn, zone: membership.zone ?? zone, checkIn: true }, "checkin", { title: "Checked in 📍", body: "Others now see “Here now” on your card. Your coordinates never left your phone." })}
        onUndo={() => save({ optIn: membership.optIn, zone: membership.zone ?? zone, checkIn: false }, "checkin")}
      />
      <Toggle
        checked={membership.optIn}
        onChange={(v) =>
          save({ optIn: v, zone: membership.zone ?? zone }, "optin", {
            title: v ? "You're discoverable" : "You're hidden",
            body: v ? "People at this event can find you now." : "You've left discovery for this event.",
          })
        }
        label="Networking discovery"
        sub="Let opted-in attendees find you"
      />
      <Field label="Your zone" htmlFor="my-zone" hint="Approximate — others never see an exact location.">
        <Select
          id="my-zone"
          value={membership.zone ?? zone}
          onChange={(e) => {
            setZone(e.target.value);
            void save({ optIn: membership.optIn, zone: e.target.value }, "zone", { title: "Zone updated" });
          }}
        >
          {event.zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
              {z.meetingSpot ? " · meeting spot" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <div className="border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-ink">Live status</p>
          {statusActive && status ? (
            <Badge tone={status.mode === "heads-down" ? "neutral" : "green"} icon={<span className={cx("size-1.5 rounded-full", status.mode === "heads-down" ? "bg-faint" : "bg-emerald-500")} />}>
              until {fmtTime(status.until)}
            </Badge>
          ) : (
            <span className="text-[12px] text-muted">Not set</span>
          )}
        </div>
        {statusActive && status ? (
          <div className="mb-3 rounded-xl bg-canvas px-3 py-2.5 text-[12.5px] text-ink-2">
            <span className="font-medium">{MODES.find((m) => m.id === status.mode)?.label}</span>
            {status.topics.length ? ` · ${status.topics.join(", ")}` : ""}
            {status.mode !== "heads-down" ? ` · max ${status.maxRequests} request${status.maxRequests === 1 ? "" : "s"}` : " · requests paused"}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cx(
                "focus-ring flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-left transition-colors",
                mode === m.id ? "border-brand-300 bg-brand-50" : "border-line hover:border-line-2",
              )}
            >
              <m.icon className={cx("mt-0.5 size-4 shrink-0", mode === m.id ? "text-brand-600" : "text-faint")} />
              <span className="min-w-0">
                <span className={cx("block text-[12.5px] font-semibold", mode === m.id ? "text-brand-700" : "text-ink")}>{m.label}</span>
                <span className="block text-[11px] leading-snug text-muted">{m.sub}</span>
              </span>
            </button>
          ))}
        </div>
        {mode !== "heads-down" ? (
          <div className="mt-3 space-y-3">
            <Field label="Topics (comma-separated, up to 4)" htmlFor="live-topics">
              <Input id="live-topics" value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="e.g. React, pitch feedback" maxLength={200} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="For" htmlFor="live-minutes">
                <Select id="live-minutes" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours</option>
                </Select>
              </Field>
              <Field label="Max requests" htmlFor="live-max">
                <Select id="live-max" value={maxRequests} onChange={(e) => setMaxRequests(Number(e.target.value))}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <Field label="For" htmlFor="live-minutes-hd">
              <Select id="live-minutes-hd" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
              </Select>
            </Field>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            className="flex-1"
            size="sm"
            loading={saving === "status"}
            disabled={!membership.optIn}
            title={membership.optIn ? undefined : "Opt in to discovery to set a live status"}
            onClick={() =>
              save(
                {
                  optIn: membership.optIn,
                  zone: membership.zone ?? zone,
                  status: {
                    mode,
                    topics: topics
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .slice(0, 4),
                    maxRequests: mode === "heads-down" ? 0 : maxRequests,
                    minutes,
                  },
                },
                "status",
                { title: "Live status set", body: "It expires automatically — no lingering green dot." },
              )
            }
          >
            {statusActive ? "Update status" : "Go live"}
          </Button>
          {statusActive ? (
            <Button
              size="sm"
              variant="secondary"
              loading={saving === "clear"}
              onClick={() => save({ optIn: membership.optIn, zone: membership.zone ?? zone, status: null }, "clear", { title: "Live status cleared" })}
            >
              Clear
            </Button>
          ) : null}
        </div>
        {!membership.optIn ? <p className="mt-2 text-[11.5px] text-muted">Turn on discovery to go live.</p> : null}
      </div>

      <div className="border-t border-line pt-3">
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          loading={saving === "leave"}
          icon={<LogOut className="size-3.5" />}
          onClick={() => save({ optIn: false, leave: true }, "leave", { title: `Left ${event.title}` })}
        >
          Leave event
        </Button>
      </div>
    </Card>
  );
}

function OpenRoles({ roles, eventId }: { roles: OpenRole[]; eventId: string }) {
  const [openFor, setOpenFor] = useState<OpenRole | null>(null);
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">Open roles on forming teams</h2>
        <p className="text-[13px] text-muted">Teams at this event that posted roles they still need. Your fit is computed from your skills.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {roles.map((r) => {
          const best = Math.max(0, ...r.roles.map((x) => x.myFit));
          return (
            <Card key={r.teamId} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-semibold tracking-wide text-faint uppercase">
                    <Briefcase className="size-3.5" /> Team forming
                  </p>
                  <h3 className="mt-1 text-[15px] font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1 text-[13px] leading-snug text-muted">{r.pitch}</p>
                </div>
                {best >= 60 ? <Badge tone="brand">Strong fit</Badge> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.roles.map((x) => (
                  <Badge key={x.roleId} tone={x.myFit >= 60 ? "brand" : "neutral"}>
                    {x.label} · you fit {x.myFit}%
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                {r.owner ? <PersonHeader p={r.owner} size={32} /> : <span />}
                {r.owner ? (
                  <Button size="sm" variant={best >= 60 ? "primary" : "secondary"} onClick={() => setOpenFor(r)} disabled={!r.owner.canRequest}>
                    Ask to join
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      {openFor?.owner ? (
        <ConnectDialog
          open
          onClose={() => setOpenFor(null)}
          person={openFor.owner}
          eventId={eventId}
          reasons={[
            `“${openFor.title}” has open roles: ${openFor.roles.map((x) => x.label).join(", ")}.`,
            ...openFor.roles.filter((x) => x.myFit >= 40).map((x) => `Your skills fit the ${x.label} role (${x.myFit}%).`),
          ]}
          onSent={() => setOpenFor(null)}
        />
      ) : null}
    </section>
  );
}

// ---------------- Organizer insights ----------------

function InsightsTab({ insights }: { insights: EventInsights }) {
  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: "Opted in", value: `${insights.optedIn}`, sub: `of ${insights.attendees} attendees` },
    { label: "Teams forming", value: `${insights.teamsForming}` },
    { label: "Teams formed", value: `${insights.teamsFormed}` },
    { label: "People on teams", value: `${insights.peopleOnTeams}` },
    { label: "Still want a team", value: `${insights.unteamed}`, sub: "opted in, no team yet" },
    { label: "Accepted intros", value: `${insights.acceptedIntros}` },
    { label: "Useful conversations", value: insights.usefulRate === null ? "—" : `${Math.round(insights.usefulRate * 100)}%`, sub: "of rated meetings" },
  ];
  const roles = insights.roles.slice(0, 10);
  const maxRole = Math.max(1, ...roles.map((r) => Math.max(r.supply, r.demand)));
  const maxInterest = Math.max(1, ...insights.topInterests.map((i) => i.count));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-2">
        <ShieldCheck className="size-4 shrink-0 text-brand-600" />
        Organizer view — aggregate counts only, no individual data.
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="h-full p-4">
              <p className="text-[11.5px] font-medium text-muted">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums">{t.value}</p>
              {t.sub ? <p className="mt-0.5 text-[11px] text-faint">{t.sub}</p> : null}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-ink">Skills supply vs. demand</h3>
              <p className="text-[12.5px] text-muted">Supply = opted-in people who cover the role. Demand = open team roles + people looking for it.</p>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="brand-gradient size-2.5 rounded-sm" /> Supply
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-amber-400" /> Demand
              </span>
            </div>
          </div>
          {roles.length ? (
            <div className="space-y-3.5">
              {roles.map((r, i) => (
                <div key={r.roleId} className={cx("grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-1.5 py-1", r.gap > 0 && "bg-rose-50/60")}>
                  <span className="truncate text-[12.5px] font-medium text-ink-2">{r.label}</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                        <motion.div className="brand-gradient h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(r.supply / maxRole) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.03 }} />
                      </div>
                      <span className="w-5 text-right text-[11.5px] text-muted tabular-nums">{r.supply}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                        <motion.div className="h-full rounded-full bg-amber-400" initial={{ width: 0 }} animate={{ width: `${(r.demand / maxRole) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.03 + 0.05 }} />
                      </div>
                      <span className="w-5 text-right text-[11.5px] text-muted tabular-nums">{r.demand}</span>
                    </div>
                  </div>
                  {r.gap > 0 ? (
                    <Badge tone="rose">{r.gap} short</Badge>
                  ) : (
                    <span className="w-14 text-right text-[11px] text-faint">{r.gap < 0 ? `+${-r.gap} spare` : "balanced"}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted">No skills data yet — it appears as people opt in.</p>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">What attendees care about</h3>
            <p className="mb-4 text-[12.5px] text-muted">Top interests among opted-in attendees.</p>
            {insights.topInterests.length ? (
              <div className="space-y-2.5">
                {insights.topInterests.map((t, i) => (
                  <div key={t.id} className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)_auto] items-center gap-3">
                    <span className="truncate text-[12.5px] text-ink-2">{t.label}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-canvas">
                      <motion.div className="h-full rounded-full bg-violet-400" initial={{ width: 0 }} animate={{ width: `${(t.count / maxInterest) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.04 }} />
                    </div>
                    <span className="text-[11.5px] text-muted tabular-nums">{t.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">No data yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">Suggested actions</h3>
            <p className="mb-3 text-[12.5px] text-muted">Generated from the gaps above.</p>
            {insights.suggestions.length ? (
              <ul className="space-y-2">
                {insights.suggestions.map((s) => (
                  <li key={s} className="flex gap-2.5 rounded-xl bg-canvas px-3 py-2.5 text-[13px] leading-snug text-ink-2">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted">Everything looks balanced right now.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
