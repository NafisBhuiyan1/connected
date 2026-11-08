"use client";

import { useState } from "react";
import { eventArtwork, eventCoverSource } from "@/lib/event-cover";
import type { ConnectedEvent } from "@/lib/types";

interface Props {
  event: Pick<ConnectedEvent, "title" | "description" | "tags" | "kind" | "start" | "imageUrl">;
  className?: string;
  variant?: "card" | "compact" | "hero";
  live?: boolean;
  attendees?: number;
  priority?: boolean;
}

/** Local editorial illustrations are labeled, rather than passed off as event photos. */
export function EventCover({ event, className = "", variant = "card", live = false, attendees, priority = false }: Props) {
  const source = eventCoverSource(event);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const cover = failedUrl === source.src ? eventArtwork(event) : source;
  const date = new Date(event.start);
  const validDate = Number.isFinite(date.getTime());
  const ratio = variant === "hero" ? "aspect-[2/1] sm:aspect-[3/1]" : variant === "compact" ? "aspect-[2/1]" : "aspect-[16/9]";
  return <div className={`relative isolate overflow-hidden bg-[#e5dfee] ${ratio} ${className}`}>
    {/* Direct browser loading avoids granting a remote calendar server-side fetch access. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      key={cover.src}
      src={cover.src}
      width={1000}
      height={600}
      alt={cover.kind === "published" ? `Cover published for ${event.title}` : ""}
      aria-hidden={cover.kind === "artwork" ? true : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className="absolute inset-0 size-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.025]"
      onError={(e) => {
        if (cover.kind === "published") setFailedUrl(cover.src);
        else e.currentTarget.style.visibility = "hidden";
      }}
    />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#33243f]/45 via-transparent to-black/5" />
    {validDate ? <div className="absolute top-3 left-3 flex min-w-11 flex-col items-center rounded-xl border border-white/80 bg-white/95 px-2.5 py-1.5 text-[#574261] shadow-sm backdrop-blur-sm sm:top-4 sm:left-4">
      <span className="text-[9px] font-semibold tracking-[.12em] uppercase">{date.toLocaleDateString("en-US", { month: "short" })}</span>
      <span className="text-[19px] leading-[1.1] font-semibold tabular-nums">{date.getDate()}</span>
    </div> : null}
    {live ? <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[#244f43]/90 px-2.5 py-1 text-[10px] font-semibold text-white sm:top-4 sm:right-4"><span className="size-1.5 rounded-full bg-[#b3e7c7]" />Live now</span> : null}
    <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between gap-3 text-white sm:right-4 sm:bottom-4 sm:left-4">
      <span className="text-[9px] font-medium tracking-wide text-white/90" title={cover.kind === "artwork" ? "Decorative illustration of the event topic; not an official event photo." : "Image supplied in the public calendar. See the event's source page for publisher details."}>{cover.label}</span>
      {attendees !== undefined ? <span className="text-[10px] font-medium tabular-nums">{attendees} going</span> : null}
    </div>
  </div>;
}
