"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, LocateFixed, MapPinCheck, MapPinOff, Navigation, ShieldCheck } from "lucide-react";
import { useCallback, useState } from "react";
import { api, fmtTime } from "@/lib/client";
import type { ConnectedEvent } from "@/lib/types";
import { Badge, Button, cx } from "./ui";

// Location, the privacy-preserving way:
// the browser reads GPS, *this device* computes the distance to the venue, and the server only
// ever receives a yes/no "checked in". No coordinates are sent, stored or shown to anyone.

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtDistance(m: number): string {
  const miles = m / 1609.34;
  if (miles < 0.1) return `${Math.round(m * 3.281)} ft`;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; lat: number; lng: number; accuracy: number }
  | { status: "denied" | "unsupported" | "error"; message: string };

/** One-shot position read. Kept in memory only — never persisted or sent. */
export function useDevicePosition() {
  const [state, setState] = useState<GeoState>({ status: "idle" });
  const locate = useCallback(
    () =>
      new Promise<GeoState>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          const s: GeoState = { status: "unsupported", message: "This browser can't share location." };
          setState(s);
          return resolve(s);
        }
        if (!window.isSecureContext) {
          const s: GeoState = { status: "unsupported", message: "Location needs a secure (https) connection." };
          setState(s);
          return resolve(s);
        }
        setState({ status: "locating" });
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const s: GeoState = { status: "ok", lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
            setState(s);
            resolve(s);
          },
          (err) => {
            const s: GeoState =
              err.code === err.PERMISSION_DENIED
                ? { status: "denied", message: "Location permission was denied. You can still pick your zone manually." }
                : { status: "error", message: "Couldn't get a location fix. Try again near a window, or pick your zone manually." };
            setState(s);
            resolve(s);
          },
          { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
        );
      }),
    [],
  );
  return { state, locate };
}

export function LocationCheckIn({
  event,
  checkedInAt,
  onCheckIn,
  onUndo,
  onCodeCheckIn,
  compact,
}: {
  event: Pick<ConnectedEvent, "id" | "geo">;
  checkedInAt?: string;
  onCheckIn: () => Promise<void>;
  onUndo?: () => Promise<void>;
  onCodeCheckIn?: () => void;
  compact?: boolean;
}) {
  const { state, locate } = useDevicePosition();
  const [result, setResult] = useState<{ inside: boolean; distance: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!event.geo) return null;
  const geo = event.geo;
  const gpsFailed = state.status === "denied" || state.status === "error" || state.status === "unsupported";

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    setCodeMsg(null);
    try {
      await api(`/api/events/${event.id}`, { body: { optIn: true, checkInCode: code.trim() } });
      setCodeMsg({ ok: true, text: "Checked in with the venue code." });
      onCodeCheckIn?.();
    } catch (err) {
      setCodeMsg({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function check() {
    setResult(null);
    const s = await locate();
    if (s.status !== "ok") return;
    const d = haversineM({ lat: s.lat, lng: s.lng }, geo);
    // Allow for GPS accuracy indoors: inside if the uncertainty circle reaches the venue.
    const inside = d <= geo.radiusM + Math.min(s.accuracy, 250);
    setResult({ inside, distance: d });
    if (inside) {
      setSaving(true);
      try {
        await onCheckIn();
      } finally {
        setSaving(false);
      }
    }
  }

  if (checkedInAt) {
    return (
      <div className={cx("flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5", compact && "p-3")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <MapPinCheck className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-emerald-900">Checked in at the venue · {fmtTime(checkedInAt)}</p>
          <p className="mt-0.5 text-[12px] text-emerald-800/80">Others see a “Here now” badge. Your coordinates never left your phone.</p>
        </div>
        {onUndo ? (
          <button onClick={() => void onUndo()} className="shrink-0 text-[12px] font-medium text-emerald-800 hover:underline">
            Undo
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-violet-soft/60 p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
          <LocateFixed className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">Check in with your location</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">
            Your phone checks you&apos;re within {fmtDistance(geo.radiusM)} of {geo.label}. Only “yes, I&apos;m here” is shared — never your coordinates.
          </p>
        </div>
      </div>
      <Button
        className="mt-3 w-full"
        onClick={check}
        loading={state.status === "locating" || saving}
        icon={<Navigation className="size-4" />}
      >
        {state.status === "locating" ? "Finding you…" : "Check in"}
      </Button>
      <AnimatePresence>
        {result && !result.inside ? (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 flex items-start gap-1.5 text-[12.5px] text-amber-800">
            <MapPinOff className="mt-0.5 size-3.5 shrink-0" /> You&apos;re about {fmtDistance(result.distance)} from the venue. Check in when you arrive.
          </motion.p>
        ) : null}
        {result?.inside ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-emerald-700">
            <Check className="size-3.5" /> You&apos;re at the venue — checking you in.
          </motion.p>
        ) : null}
        {gpsFailed ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2.5 text-[12.5px] text-muted">
            {state.status === "denied" ? "Location is blocked in this browser." : state.message} Use the venue code instead.
          </motion.p>
        ) : null}
      </AnimatePresence>
      {showCode || gpsFailed ? (
        <form onSubmit={submitCode} className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Venue code"
            maxLength={20}
            autoCapitalize="characters"
            className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[13px] font-semibold tracking-[0.2em] uppercase outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
          <Button size="sm" type="submit" variant="secondary" loading={saving} className="h-9">
            Check in
          </Button>
        </form>
      ) : (
        <button type="button" onClick={() => setShowCode(true)} className="mt-2.5 text-[12px] font-medium text-brand-700 hover:underline">
          No GPS? Use the venue code
        </button>
      )}
      {codeMsg ? <p className={cx("mt-2 text-[12.5px]", codeMsg.ok ? "text-emerald-700" : "text-rose-700")}>{codeMsg.text}</p> : null}
      <p className="mt-2.5 flex items-center gap-1 text-[11px] text-faint">
        <ShieldCheck className="size-3" /> Distance is computed on this device.
      </p>
    </div>
  );
}

export function HereNowBadge() {
  return (
    <Badge tone="green" icon={<MapPinCheck className="size-3" />}>
      Here now
    </Badge>
  );
}

export function NearMeButton({ onPosition, active }: { onPosition: (p: { lat: number; lng: number } | null) => void; active: boolean }) {
  const { state, locate } = useDevicePosition();
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={active ? "soft" : "secondary"}
        loading={state.status === "locating"}
        icon={state.status === "locating" ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
        onClick={async () => {
          if (active) return onPosition(null);
          const s = await locate();
          if (s.status === "ok") onPosition({ lat: s.lat, lng: s.lng });
        }}
      >
        {active ? "Sorted by distance" : "Near me"}
      </Button>
      {state.status === "denied" || state.status === "error" || state.status === "unsupported" ? <span className="text-[11.5px] text-muted">{state.message}</span> : null}
    </div>
  );
}
