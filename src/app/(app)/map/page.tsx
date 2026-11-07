"use client";

import { AnimatePresence, motion } from "motion/react";
import { Box, CalendarDays, Check, ChevronDown, ChevronRight, ChevronUp, Ghost, Layers, LocateFixed, MapPinCheck, MessageCircle, Send, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LiveMap, type MapCrowd, type MapEvent, type MapPersonPin } from "@/components/live-map";
import { useDevicePosition } from "@/components/location";
import { ConnectDialog, type RequestState } from "@/components/people";
import { useSession } from "@/components/session";
import { Avatar, cx, DemoTag, ScoreRing } from "@/components/ui";
import { fmtDateTime, useApi } from "@/lib/client";
import { play } from "@/lib/sfx";
import type { PublicProfile } from "@/lib/types";

interface MapPerson {
  profile: PublicProfile;
  score: number;
  reasons: string[];
  lat: number;
  lng: number;
  zoneName?: string;
  live: boolean;
  liveLabel?: string;
  hereNow: boolean;
  requestState: RequestState;
}

interface MapData {
  center: { lat: number; lng: number };
  focus: { id: string; title: string; start: string; end: string; venue: string };
  events: MapEvent[];
  people: MapPerson[];
  crowds: MapCrowd[];
  me: { visible: boolean; reason: string };
  privacy: { jitterMeters: number; refreshMinutes: number; minCrowd: number };
}

const FILTERS = [
  { id: "all", label: "Everyone", min: 0 },
  { id: "good", label: "60%+", min: 60 },
  { id: "great", label: "80%+", min: 80 },
  { id: "open", label: "Open now", min: 0 },
] as const;

export default function NearbyPage() {
  const { actingAsDemo } = useSession();
  const [eventId, setEventId] = useState<string | null>(null);
  const { data } = useApi<MapData>(`/api/map${eventId ? `?event=${eventId}` : ""}`, { poll: 30_000 });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [fly, setFly] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null);
  const [threeD, setThreeD] = useState(true);
  const [connectTo, setConnectTo] = useState<MapPerson | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { state: geo, locate } = useDevicePosition();
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const rail = useRef<HTMLDivElement>(null);

  // Desktop has room for the people rail; phones start with the map clear.
  useEffect(() => {
    if (window.innerWidth >= 768) setSheetOpen(true);
  }, []);

  const people = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    return (data?.people ?? []).filter((p) => p.score >= f.min && (filter !== "open" || p.live));
  }, [data, filter]);

  const pins: MapPersonPin[] = useMemo(
    () => people.map((p) => ({ id: p.profile.id, name: p.profile.name, hue: p.profile.avatarHue, lat: p.lat, lng: p.lng, score: p.score, live: p.live, hereNow: p.hereNow })),
    [people],
  );

  const focusEvent = data?.events.find((e) => e.id === data.focus.id);
  const eventCard = data?.events.find((e) => e.id === selectedEvent) ?? null;

  useEffect(() => {
    if (!selected || !rail.current) return;
    const t = setTimeout(() => rail.current?.querySelector(`[data-id="${selected}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }), 120);
    return () => clearTimeout(t);
  }, [selected, sheetOpen]);

  function selectPerson(id: string) {
    const p = people.find((x) => x.profile.id === id);
    if (!p) return;
    play("pop");
    setSelectedEvent(null);
    setSelected(id);
    setSheetOpen(true);
    setFly({ lat: p.lat, lng: p.lng, zoom: 17.3, key: Date.now() });
  }

  function selectEvent(id: string) {
    const ev = data?.events.find((e) => e.id === id);
    if (!ev) return;
    play("tap");
    setSelected(null);
    setSelectedEvent(id);
    setFly({ lat: ev.lat, lng: ev.lng, zoom: ev.id === data?.focus.id ? 16.5 : 14.5, key: Date.now() });
  }

  async function locateMe() {
    const s = await locate();
    if (s.status === "ok") {
      setMyPos({ lat: s.lat, lng: s.lng });
      setFly({ lat: s.lat, lng: s.lng, zoom: 15, key: Date.now() });
    }
  }

  const switchable = (data?.events ?? []).filter((e) => e.live || e.joined).slice(0, 8);

  return (
    <div className={cx("fixed inset-x-0 bottom-0 z-10", actingAsDemo ? "top-[100px]" : "top-[60px]")}>
      {data ? (
        <LiveMap
          center={data.center}
          events={data.events}
          people={pins}
          crowds={data.crowds}
          focusEventId={data.focus.id}
          selectedId={selected}
          onSelectPerson={selectPerson}
          onSelectEvent={selectEvent}
          flyTo={fly}
          threeD={threeD}
          myPosition={myPos}
          bottomPadding={sheetOpen ? 270 : 90}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-brand-50">
          <div className="cx-radar" />
        </div>
      )}

      {/* Top controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="glass flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 py-2">
              <span className={cx("size-2 shrink-0 rounded-full", focusEvent?.live ? "bg-emerald-500 shadow-[0_0_8px_#34d399]" : "bg-faint")} />
              <select
                value={data?.focus.id ?? ""}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setSelected(null);
                  const ev = data?.events.find((x) => x.id === e.target.value);
                  if (ev) setFly({ lat: ev.lat, lng: ev.lng, zoom: 16.2, key: Date.now() });
                }}
                className="min-w-0 flex-1 cursor-pointer truncate bg-transparent text-[14px] font-semibold text-ink outline-none"
                aria-label="Event"
              >
                {switchable.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                    {e.live ? " · live" : ""}
                  </option>
                ))}
              </select>
              <span className="shrink-0 text-[12px] text-muted">{data ? `${people.length} here` : ""}</span>
            </div>
            <Link href={`/events/${data?.focus.id ?? ""}#lounge`} aria-label="Event chat" className="glass flex size-11 shrink-0 items-center justify-center rounded-2xl text-brand-700">
              <MessageCircle className="size-[18px]" />
            </Link>
            <Link href="/preferences" aria-label="Map preferences" className="glass flex size-11 shrink-0 items-center justify-center rounded-2xl text-ink-2">
              <SlidersHorizontal className="size-[18px]" />
            </Link>
          </div>
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  play("tap");
                  setFilter(f.id);
                }}
                className={cx(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                  filter === f.id ? "bg-brand-600 text-white shadow-sm" : "glass text-ink-2",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="absolute top-32 right-3 flex flex-col gap-2 sm:right-4">
        <button onClick={() => setThreeD((v) => !v)} className="glass flex size-11 items-center justify-center rounded-2xl text-ink-2" aria-label="Toggle 3D">
          {threeD ? <Layers className="size-[18px]" /> : <Box className="size-[18px]" />}
        </button>
        <button onClick={locateMe} className="glass flex size-11 items-center justify-center rounded-2xl text-ink-2" aria-label="Show my position (stays on this device)">
          <LocateFixed className={cx("size-[18px]", geo.status === "locating" && "animate-pulse text-brand-600")} />
        </button>
      </div>

      {/* Not visible states (not opted in / event not live) */}
      {data && !data.people.length && !data.crowds.length ? (
        <div className="absolute inset-x-0 top-36 flex justify-center px-4">
          <div className="glass max-w-sm rounded-2xl p-4 text-center">
            <p className="text-[14px] font-semibold text-ink">{data.me.reason}</p>
            <Link href={`/events/${data.focus.id}`} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3.5 py-2 text-[13px] font-semibold text-white">
              Open event <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* Bottom: event card, collapsible people rail, or a compact pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[96px] md:bottom-4">
        <AnimatePresence mode="wait">
          {eventCard ? (
            <motion.div key={eventCard.id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="pointer-events-auto mx-auto max-w-md px-3">
              <div className="relative overflow-hidden rounded-3xl border border-line bg-white p-4 shadow-[0_20px_50px_-20px_rgba(76,29,149,0.45)]">
                <button onClick={() => setSelectedEvent(null)} className="absolute top-3 right-3 rounded-full p-1 text-faint hover:bg-canvas hover:text-ink" aria-label="Close">
                  <X className="size-4" />
                </button>
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-brand-700 uppercase">
                  <CalendarDays className="size-3.5" /> {eventCard.kind.replace("-", " ")}
                  {eventCard.live ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 normal-case">Live</span> : null}
                  {eventCard.isSample ? <span className="text-faint normal-case">sample</span> : null}
                </div>
                <p className="mt-1.5 pr-6 text-[18px] leading-tight font-semibold text-ink">{eventCard.title}</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  {fmtDateTime(eventCard.start)} · {eventCard.venue.replace(" (sample)", "")}
                </p>
                <div className="mt-3 flex items-center gap-4 text-[12.5px] text-muted">
                  <span>
                    <b className="text-[16px] text-ink">{eventCard.attendees}</b> going
                  </span>
                  <span>
                    <b className="text-[16px] text-brand-700">{eventCard.strongMatches}</b> strong matches
                  </span>
                </div>
                <Link href={`/events/${eventCard.id}`} className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-[13.5px] font-semibold text-white hover:bg-brand-700">
                  {eventCard.joined ? "Open event" : "View & join"} <ChevronRight className="size-4" />
                </Link>
              </div>
            </motion.div>
          ) : people.length && sheetOpen ? (
            <motion.div key="rail" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
              <div className="pointer-events-auto mb-2 flex justify-center">
                <button
                  onClick={() => {
                    play("tap");
                    setSheetOpen(false);
                  }}
                  className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-2"
                >
                  <ChevronDown className="size-4" /> Hide people
                </button>
              </div>
              <div ref={rail} className="scrollbar-none pointer-events-auto flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 sm:px-4">
                {people.map((p) => (
                  <PersonCard
                    key={p.profile.id}
                    p={p}
                    active={p.profile.id === selected}
                    onFocus={() => selectPerson(p.profile.id)}
                    onConnect={() => {
                      play("tap");
                      setConnectTo(p);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          ) : people.length ? (
            <motion.div key="pill" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="pointer-events-auto flex justify-center">
              <button
                onClick={() => {
                  play("tap");
                  setSheetOpen(true);
                }}
                className="inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-[13.5px] font-semibold text-ink shadow-[0_12px_32px_-12px_rgba(76,29,149,0.5)] ring-1 ring-line"
              >
                <span className="flex -space-x-2">
                  {people.slice(0, 3).map((p) => (
                    <Avatar key={p.profile.id} name={p.profile.name} hue={p.profile.avatarHue} size={28} />
                  ))}
                </span>
                {people.length} people nearby <ChevronUp className="size-4 text-brand-600" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {data ? (
          <div className="pointer-events-auto mt-2 flex justify-center px-3">
            <Link href="/preferences" className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-muted">
              {data.me.visible ? <ShieldCheck className="size-3.5 text-emerald-600" /> : <Ghost className="size-3.5 text-brand-600" />}
              {data.me.visible ? `Approximate spots · reshuffle every ${data.privacy.refreshMinutes} min` : data.me.reason}
            </Link>
          </div>
        ) : null}
      </div>

      {connectTo ? (
        <ConnectDialog
          open
          onClose={() => setConnectTo(null)}
          person={connectTo.profile}
          eventId={data?.focus.id}
          reasons={connectTo.reasons}
          onSent={() => {
            play("send");
            setConnectTo(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PersonCard({ p, active, onFocus, onConnect }: { p: MapPerson; active: boolean; onFocus: () => void; onConnect: () => void }) {
  return (
    <div
      data-id={p.profile.id}
      onClick={onFocus}
      className={cx(
        "w-[290px] shrink-0 cursor-pointer snap-center rounded-3xl border bg-white p-3.5 shadow-[0_16px_40px_-20px_rgba(76,29,149,0.45)] transition-all sm:w-[320px]",
        active ? "border-brand-400 ring-2 ring-brand-200" : "border-line",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={p.profile.name} hue={p.profile.avatarHue} size={48} live={p.live} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold text-ink">{p.profile.name}</p>
            {p.profile.isDemo ? <DemoTag /> : null}
          </div>
          <p className="truncate text-[12px] text-muted">{p.profile.headline}</p>
        </div>
        <ScoreRing score={p.score} size={42} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
        {p.liveLabel ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{p.liveLabel}</span> : null}
        {p.hereNow ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
            <MapPinCheck className="size-3" /> Here now
          </span>
        ) : null}
        {p.zoneName ? <span className="rounded-full bg-canvas px-2 py-0.5 text-muted">near {p.zoneName}</span> : null}
      </div>
      {p.reasons[0] ? (
        <p className="mt-2 line-clamp-2 flex gap-1.5 text-[12.5px] text-ink-2">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-500" /> {p.reasons[0]}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Link href={`/people/${p.profile.id}`} onClick={(e) => e.stopPropagation()} className="flex h-9 flex-1 items-center justify-center rounded-xl bg-canvas text-[13px] font-medium text-ink-2 hover:bg-brand-50">
          Profile
        </Link>
        {p.requestState === "connected" ? (
          <span className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-50 text-[13px] font-medium text-emerald-700">
            <Check className="size-4" /> Connected
          </span>
        ) : p.requestState === "pending-out" ? (
          <span className="flex h-9 flex-1 items-center justify-center rounded-xl bg-canvas text-[13px] text-muted">Sent</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnect();
            }}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            <Send className="size-3.5" /> Connect
          </button>
        )}
      </div>
    </div>
  );
}
