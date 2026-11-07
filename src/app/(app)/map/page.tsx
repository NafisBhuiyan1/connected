"use client";

import { AnimatePresence, motion } from "motion/react";
import { Box, CalendarDays, Check, ChevronRight, Ghost, Layers, LocateFixed, MapPinCheck, Send, ShieldCheck, SlidersHorizontal, Sparkles, X } from "lucide-react";
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
  const { state: geo, locate } = useDevicePosition();
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const rail = useRef<HTMLDivElement>(null);

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
    rail.current.querySelector(`[data-id="${selected}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  function selectPerson(id: string) {
    const p = people.find((x) => x.profile.id === id);
    if (!p) return;
    play("pop");
    setSelectedEvent(null);
    setSelected(id);
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
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-[#070717]">
          <div className="cx-radar" />
        </div>
      )}

      {/* Top controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="glass flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 py-2">
              <span className={cx("size-2 shrink-0 rounded-full", focusEvent?.live ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-white/40")} />
              <select
                value={data?.focus.id ?? ""}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setSelected(null);
                  const ev = data?.events.find((x) => x.id === e.target.value);
                  if (ev) setFly({ lat: ev.lat, lng: ev.lng, zoom: 16.2, key: Date.now() });
                }}
                className="min-w-0 flex-1 cursor-pointer truncate bg-transparent text-[14px] font-semibold text-white outline-none"
                aria-label="Event"
              >
                {switchable.map((e) => (
                  <option key={e.id} value={e.id} className="bg-[#0d0d16]">
                    {e.title}
                    {e.live ? " · live" : ""}
                  </option>
                ))}
              </select>
              <span className="shrink-0 text-[12px] text-white/60">{data ? `${people.length} here` : ""}</span>
            </div>
            <Link href="/preferences" aria-label="Map preferences" className="glass flex size-11 shrink-0 items-center justify-center rounded-2xl text-white">
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
                  "glass shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                  filter === f.id ? "!bg-white text-[#0b0b1e]" : "text-white/85",
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
        <button onClick={() => setThreeD((v) => !v)} className="glass flex size-11 items-center justify-center rounded-2xl text-white" aria-label="Toggle 3D">
          {threeD ? <Layers className="size-[18px]" /> : <Box className="size-[18px]" />}
        </button>
        <button onClick={locateMe} className="glass flex size-11 items-center justify-center rounded-2xl text-white" aria-label="Show my position (stays on this device)">
          <LocateFixed className={cx("size-[18px]", geo.status === "locating" && "animate-pulse")} />
        </button>
      </div>

      {/* Not visible states (not opted in / event not live) */}
      {data && !data.people.length && !data.crowds.length ? (
        <div className="absolute inset-x-0 top-36 flex justify-center px-4">
          <div className="glass max-w-sm rounded-2xl p-4 text-center text-white">
            <p className="text-[14px] font-semibold">{data.me.reason}</p>
            <Link href={`/events/${data.focus.id}`} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0b0b1e]">
              Open event <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* Bottom sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[96px] md:bottom-4">
        <AnimatePresence mode="wait">
          {eventCard ? (
            <motion.div key={eventCard.id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="pointer-events-auto mx-auto max-w-md px-3">
              <div className="glass-strong relative overflow-hidden rounded-3xl p-4 text-white">
                <button onClick={() => setSelectedEvent(null)} className="absolute top-3 right-3 rounded-full p-1 text-white/60 hover:text-white" aria-label="Close">
                  <X className="size-4" />
                </button>
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-violet-200 uppercase">
                  <CalendarDays className="size-3.5" /> {eventCard.kind.replace("-", " ")}
                  {eventCard.live ? <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-emerald-300 normal-case">Live</span> : null}
                  {eventCard.isSample ? <span className="text-white/40 normal-case">sample</span> : null}
                </div>
                <p className="mt-1.5 pr-6 text-[18px] leading-tight font-semibold">{eventCard.title}</p>
                <p className="mt-1 text-[12.5px] text-white/65">
                  {fmtDateTime(eventCard.start)} · {eventCard.venue.replace(" (sample)", "")}
                </p>
                <div className="mt-3 flex items-center gap-4 text-[12.5px]">
                  <span>
                    <b className="text-[16px]">{eventCard.attendees}</b> <span className="text-white/60">going</span>
                  </span>
                  <span>
                    <b className="text-[16px] text-violet-300">{eventCard.strongMatches}</b> <span className="text-white/60">strong matches</span>
                  </span>
                </div>
                <Link href={`/events/${eventCard.id}`} className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white text-[13.5px] font-semibold text-[#0b0b1e]">
                  {eventCard.joined ? "Open event" : "View & join"} <ChevronRight className="size-4" />
                </Link>
              </div>
            </motion.div>
          ) : people.length ? (
            <motion.div key="rail" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
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
          ) : null}
        </AnimatePresence>
        {data ? (
          <div className="pointer-events-auto mt-2 flex justify-center px-3">
            <Link href="/preferences" className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-white/75">
              {data.me.visible ? <ShieldCheck className="size-3.5 text-emerald-300" /> : <Ghost className="size-3.5 text-violet-300" />}
              {data.me.visible ? `Approximate spots · shift every ${data.privacy.refreshMinutes} min · small groups anonymous` : data.me.reason}
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
        "glass-strong w-[290px] shrink-0 cursor-pointer snap-center rounded-3xl p-3.5 text-white transition-all sm:w-[320px]",
        active && "ring-2 ring-violet-300/80",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={p.profile.name} hue={p.profile.avatarHue} size={48} live={p.live} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold">{p.profile.name}</p>
            {p.profile.isDemo ? <DemoTag className="border-white/25 text-white/50" /> : null}
          </div>
          <p className="truncate text-[12px] text-white/60">{p.profile.headline}</p>
        </div>
        <div className="rounded-full bg-white p-0.5">
          <ScoreRing score={p.score} size={42} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
        {p.liveLabel ? <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 font-medium text-emerald-300">{p.liveLabel}</span> : null}
        {p.hereNow ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 font-medium text-sky-300">
            <MapPinCheck className="size-3" /> Here now
          </span>
        ) : null}
        {p.zoneName ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">near {p.zoneName}</span> : null}
      </div>
      {p.reasons[0] ? (
        <p className="mt-2 line-clamp-2 flex gap-1.5 text-[12.5px] text-white/80">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet-300" /> {p.reasons[0]}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Link href={`/people/${p.profile.id}`} onClick={(e) => e.stopPropagation()} className="flex h-9 flex-1 items-center justify-center rounded-xl bg-white/10 text-[13px] font-medium hover:bg-white/15">
          Profile
        </Link>
        {p.requestState === "connected" ? (
          <span className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-400/15 text-[13px] font-medium text-emerald-300">
            <Check className="size-4" /> Connected
          </span>
        ) : p.requestState === "pending-out" ? (
          <span className="flex h-9 flex-1 items-center justify-center rounded-xl bg-white/10 text-[13px] text-white/70">Sent</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConnect();
            }}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-[13px] font-semibold text-[#0b0b1e]"
          >
            <Send className="size-3.5" /> Connect
          </button>
        )}
      </div>
    </div>
  );
}
