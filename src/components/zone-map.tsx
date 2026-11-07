"use client";

import { AnimatePresence, motion } from "motion/react";
import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import type { EventZone } from "@/lib/types";
import { cx, faceUri } from "./ui";

export interface MapPerson {
  id: string;
  name: string;
  hue: number;
  score: number;
  zone: string | null;
  live: boolean;
  isMe?: boolean;
}

const KIND_STYLE: Record<EventZone["kind"], { fill: string; stroke: string; text: string }> = {
  hall: { fill: "rgba(99,96,240,0.22)", stroke: "#8b85ff", text: "#c7cbff" },
  lounge: { fill: "rgba(168,85,247,0.24)", stroke: "#c084fc", text: "#e9d5ff" },
  booth: { fill: "rgba(16,185,129,0.2)", stroke: "#34d399", text: "#a7f3d0" },
  table: { fill: "rgba(14,165,233,0.2)", stroke: "#38bdf8", text: "#bae6fd" },
  food: { fill: "rgba(245,158,11,0.18)", stroke: "#fbbf24", text: "#fde68a" },
  stage: { fill: "rgba(236,72,153,0.2)", stroke: "#f472b6", text: "#fbcfe8" },
};

function hash(s: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function initials(name: string) {
  return name
    .replace(/^Dr\.\s+/, "")
    .split(/\s+/)
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Venue zone map on a 100x60 grid. People are placed deterministically inside their chosen
 * zone (hashed jitter) — zones are approximate and user-chosen; there is no GPS anywhere.
 */
export function ZoneMap({
  zones,
  people,
  zoneCounts,
  selectedZone,
  onSelectZone,
  highlightedId,
  onSelectPerson,
}: {
  zones: EventZone[];
  people: MapPerson[];
  zoneCounts: Record<string, number>;
  selectedZone: string | null;
  onSelectZone: (id: string | null) => void;
  highlightedId: string | null;
  onSelectPerson: (id: string) => void;
}) {
  const [hover, setHover] = useState<MapPerson | null>(null);

  const placed = useMemo(() => {
    const byZone = new Map(zones.map((z) => [z.id, z]));
    return people
      .filter((p) => p.zone && byZone.has(p.zone))
      .map((p) => {
        const z = byZone.get(p.zone!)!;
        const padX = Math.min(3, z.w / 6);
        const top = Math.min(7.5, z.h * 0.42);
        const x = z.x + padX + hash(p.id, 1) * Math.max(1, z.w - padX * 2);
        const y = z.y + top + hash(p.id, 7) * Math.max(1, z.h - top - 2.6);
        return { ...p, x, y };
      });
  }, [zones, people]);

  return (
    <div className="relative">
      <svg viewBox="0 0 100 60" className="block h-auto w-full select-none" role="img" aria-label="Event zone map">
        <defs>
          <pattern id="zm-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="60" rx="2.5" fill="#0a0a1f" />
        <rect x="0" y="0" width="100" height="60" rx="2.5" fill="url(#zm-grid)" />
        {zones.map((z) => {
          const st = KIND_STYLE[z.kind];
          const active = selectedZone === z.id;
          const dim = selectedZone && !active;
          const count = zoneCounts[z.id] ?? 0;
          return (
            <g
              key={z.id}
              className="cursor-pointer"
              onClick={() => onSelectZone(active ? null : z.id)}
              style={{ opacity: dim ? 0.45 : 1, transition: "opacity 200ms" }}
            >
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                rx="1.6"
                fill={st.fill}
                stroke={active ? "#5145e0" : st.stroke}
                strokeWidth={active ? 0.55 : 0.3}
              />
              <text x={z.x + 1.6} y={z.y + 3.6} fontSize="2.1" fontWeight="600" fill={st.text} style={{ pointerEvents: "none" }}>
                {z.name.length > Math.floor(z.w / 1.15) ? `${z.name.slice(0, Math.floor(z.w / 1.15) - 1)}…` : z.name}
              </text>
              {z.meetingSpot ? (
                <g transform={`translate(${z.x + 1.6} ${z.y + 4.7})`} style={{ pointerEvents: "none" }} opacity="0.85">
                  <path d="M0.75 0 C1.2 0 1.5 0.33 1.5 0.75 C1.5 1.25 0.75 2 0.75 2 C0.75 2 0 1.25 0 0.75 C0 0.33 0.3 0 0.75 0 Z" fill={st.text} />
                  <circle cx="0.75" cy="0.75" r="0.28" fill="#ffffff" />
                  <text x="2" y="1.5" fontSize="1.55" fill={st.text}>
                    Meeting spot
                  </text>
                </g>
              ) : null}
              {count ? (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={z.x + z.w - 6.2} y={z.y + 1.2} width="5" height="3" rx="1.5" fill="#0b0b1e" stroke={st.stroke} strokeWidth="0.25" />
                  <text x={z.x + z.w - 3.7} y={z.y + 3.25} fontSize="1.9" fontWeight="700" textAnchor="middle" fill={st.text}>
                    {count}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
        {placed.map((p) => {
          const hl = highlightedId === p.id;
          const strong = p.score >= 75;
          const r = p.isMe ? 2 : 1.65;
          return (
            <g
              key={p.id}
              className="cursor-pointer"
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover((h) => (h?.id === p.id ? null : h))}
              onClick={(e) => {
                e.stopPropagation();
                if (!p.isMe) onSelectPerson(p.id);
              }}
            >
              {p.live ? (
                <circle cx={p.x} cy={p.y} r={r} fill="none" stroke="#10b981" strokeWidth="0.35">
                  <animate attributeName="r" from={r} to={r + 2.2} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.9" to="0" dur="2.2s" repeatCount="indefinite" />
                </circle>
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={r + (hl ? 0.6 : 0) + 0.35}
                fill={p.isMe ? "#22d3ee" : strong ? "#9b6bff" : "rgba(255,255,255,0.55)"}
                stroke={hl ? "#f59e0b" : "none"}
                strokeWidth={hl ? 0.55 : 0}
                style={strong ? { filter: "drop-shadow(0 0 0.8px #9b6bff)" } : undefined}
              />
              <clipPath id={`zf-${p.id}`}>
                <circle cx={p.x} cy={p.y} r={r + (hl ? 0.6 : 0)} />
              </clipPath>
              <image
                href={faceUri(p.isMe ? `${p.name}` : p.name, p.hue)}
                x={p.x - r - (hl ? 0.6 : 0)}
                y={p.y - r - (hl ? 0.6 : 0)}
                width={(r + (hl ? 0.6 : 0)) * 2}
                height={(r + (hl ? 0.6 : 0)) * 2}
                clipPath={`url(#zf-${p.id})`}
                style={{ pointerEvents: "none" }}
              />
              {p.isMe ? (
                <text x={p.x} y={p.y + r + 1.9} fontSize="1.3" fontWeight="700" fill="#22d3ee" textAnchor="middle" style={{ pointerEvents: "none" }}>
                  You
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <AnimatePresence>
        {hover ? (
          <motion.div
            key={hover.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-line bg-surface px-2.5 py-1.5 text-[12px] whitespace-nowrap shadow-[var(--shadow-lift)]"
            style={{
              left: `${(placed.find((p) => p.id === hover.id)?.x ?? 0)}%`,
              top: `${((placed.find((p) => p.id === hover.id)?.y ?? 0) / 60) * 100}%`,
            }}
          >
            <span className="font-semibold text-ink">{hover.isMe ? "You" : hover.name}</span>
            {!hover.isMe ? <span className="ml-1.5 text-muted">fit {hover.score}</span> : null}
            {hover.live ? <span className="ml-1.5 text-emerald-600">● live</span> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ZoneLegend({ className }: { className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-brand-600" /> Strong fit (75+)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border border-emerald-500" /> Live now
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-ink" /> You
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MapPin className="size-3" /> Approximate zones only — no GPS.
      </span>
    </div>
  );
}
