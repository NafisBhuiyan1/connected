"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { faceUri } from "./ui";

export interface MapEvent {
  id: string;
  title: string;
  kind: string;
  lat: number;
  lng: number;
  venue: string;
  start: string;
  end: string;
  live: boolean;
  attendees: number;
  strongMatches: number;
  joined: boolean;
  isSample: boolean;
}

export interface MapPersonPin {
  id: string;
  name: string;
  hue: number;
  lat: number;
  lng: number;
  score: number;
  live: boolean;
  hereNow: boolean;
}

export interface MapCrowd {
  lat: number;
  lng: number;
  count: number;
  zoneName?: string;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Recolor a light vector style into a vibrant neon night palette and add 3D buildings. */
function neonify(map: MLMap) {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    const id = layer.id;
    try {
      if (layer.type === "background") map.setPaintProperty(id, "background-color", "#070717");
      else if (layer.type === "fill") {
        if (/water|ocean|lake|river/.test(id)) map.setPaintProperty(id, "fill-color", "#0b2547");
        else if (/park|green|grass|wood|forest|landcover|golf|pitch|cemetery|garden/.test(id)) map.setPaintProperty(id, "fill-color", "#0a2a24");
        else if (/building/.test(id)) map.setLayoutProperty(id, "visibility", "none");
        else map.setPaintProperty(id, "fill-color", "#0c0c24");
      } else if (layer.type === "line") {
        if (/water|river|stream|canal/.test(id)) map.setPaintProperty(id, "line-color", "#13407a");
        else if (/motorway|trunk|primary/.test(id)) {
          map.setPaintProperty(id, "line-color", "#8b6cff");
          map.setPaintProperty(id, "line-opacity", 0.75);
        } else if (/secondary|tertiary/.test(id)) {
          map.setPaintProperty(id, "line-color", "#5b4bd6");
          map.setPaintProperty(id, "line-opacity", 0.6);
        } else if (/road|street|minor|service|path|track|bridge|tunnel|link/.test(id)) {
          map.setPaintProperty(id, "line-color", "#2a2766");
        } else if (/rail/.test(id)) map.setPaintProperty(id, "line-color", "#2b2a55");
        else if (/boundary|admin/.test(id)) map.setPaintProperty(id, "line-color", "#3a2d6e");
      } else if (layer.type === "symbol") {
        map.setPaintProperty(id, "text-color", "#c3bff5");
        map.setPaintProperty(id, "text-halo-color", "#070717");
        map.setPaintProperty(id, "text-halo-width", 1.3);
        if (/poi/.test(id)) map.setPaintProperty(id, "icon-opacity", 0.45);
      } else if (layer.type === "fill-extrusion") {
        map.setLayoutProperty(id, "visibility", "none");
      }
    } catch {
      /* some layers don't support a property — skip */
    }
  }
  const sourceId = Object.keys(style.sources ?? {}).find((k) => k === "openmaptiles") ?? Object.keys(style.sources ?? {})[0];
  if (sourceId && !map.getLayer("cx-3d")) {
    map.addLayer({
      id: "cx-3d",
      type: "fill-extrusion",
      source: sourceId,
      "source-layer": "building",
      minzoom: 13.5,
      paint: {
        "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 8], 0, "#17153d", 25, "#2b2580", 80, "#5a46d8"],
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.82,
      },
    });
  }
}

const KIND_ICON: Record<string, string> = {
  hackathon: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  "career-fair": "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
  pitch: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
  meetup: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  workshop: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  conference: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",
  seminar: "M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5",
};

function towerEl(ev: MapEvent, focused: boolean): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `cx-tower${ev.live ? " is-live" : ""}${focused ? " is-focus" : ""}${ev.joined ? " is-joined" : ""}`;
  const size = Math.round(34 + Math.min(26, ev.attendees * 0.7));
  el.style.setProperty("--s", `${size}px`);
  el.setAttribute("aria-label", `${ev.title}, ${ev.attendees} attending`);
  el.innerHTML = `
    <span class="cx-tower-beam"></span>
    <span class="cx-tower-ring"></span>
    <span class="cx-tower-core"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${KIND_ICON[ev.kind] ?? KIND_ICON.meetup}"/></svg></span>
    <span class="cx-tower-count">${ev.attendees}</span>`;
  return el;
}

function personEl(p: MapPersonPin, index: number, selected: boolean): HTMLElement {
  // MapLibre positions the outer element with an inline transform; animate only the inner bubble.
  const wrap = document.createElement("div");
  wrap.className = "cx-pin-wrap";
  if (selected) wrap.style.zIndex = "5";
  const el = document.createElement("button");
  el.type = "button";
  const tier = p.score >= 80 ? "t1" : p.score >= 60 ? "t2" : "t3";
  el.className = `cx-pin ${tier}${p.live ? " is-live" : ""}${selected ? " is-selected" : ""}`;
  el.style.animationDelay = `${Math.min(index, 20) * 45}ms`;
  el.setAttribute("aria-label", `${p.name}, ${p.score}% match`);
  el.innerHTML = `
    <span class="cx-pin-pulse"></span>
    <img src="${faceUri(p.name, p.hue)}" alt="" draggable="false" />
    <span class="cx-pin-score">${p.score}</span>
    ${p.hereNow ? '<span class="cx-pin-here" title="Checked in"></span>' : ""}`;
  wrap.appendChild(el);
  return wrap;
}

function crowdEl(c: MapCrowd): HTMLElement {
  const el = document.createElement("div");
  el.className = "cx-crowd";
  el.title = `${c.count} ${c.count === 1 ? "person" : "people"}${c.zoneName ? ` near ${c.zoneName}` : ""} — small groups stay anonymous`;
  el.innerHTML = `<span>${c.count}</span>`;
  return el;
}

export function LiveMap({
  center,
  events,
  people,
  crowds,
  focusEventId,
  selectedId,
  onSelectPerson,
  onSelectEvent,
  flyTo,
  threeD,
  myPosition,
}: {
  center: { lat: number; lng: number };
  events: MapEvent[];
  people: MapPersonPin[];
  crowds: MapCrowd[];
  focusEventId?: string;
  selectedId?: string | null;
  onSelectPerson: (id: string) => void;
  onSelectEvent: (id: string) => void;
  flyTo?: { lat: number; lng: number; zoom?: number; key: number } | null;
  threeD: boolean;
  myPosition?: { lat: number; lng: number } | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const meMarker = useRef<Marker | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const handlers = useRef({ onSelectPerson, onSelectEvent });
  handlers.current = { onSelectPerson, onSelectEvent };

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled || !box.current) return;
        // The bundler can't resolve MapLibre's worker; serve it ourselves (copied to /public).
        try {
          ml.setWorkerUrl("/maplibre-gl-worker.mjs");
        } catch {
          /* older API */
        }
        mlRef.current = ml;
        const m = new ml.Map({
          container: box.current,
          style: STYLE_URL,
          center: [center.lng, center.lat],
          zoom: 16.2,
          pitch: 55,
          bearing: -20,
          attributionControl: { compact: true },
          maxPitch: 70,
        });
        map.current = m;
        m.on("load", () => {
          neonify(m);
          // Keep the action area above the bottom sheet of people cards.
          m.setPadding({ top: 110, bottom: window.innerWidth < 768 ? 330 : 270, left: 0, right: 0 });
          setReady(true);
        });
        m.on("error", (e) => {
          if (!m.loaded() && String((e as unknown as { error?: { message?: string } }).error?.message ?? "").includes("Failed to fetch")) setFailed(true);
        });
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      markers.current.forEach((mk) => mk.remove());
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)draw markers whenever data changes.
  useEffect(() => {
    const m = map.current;
    const ml = mlRef.current;
    if (!m || !ml || !ready) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    for (const ev of events) {
      const el = towerEl(ev, ev.id === focusEventId);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.current.onSelectEvent(ev.id);
      });
      markers.current.push(new ml.Marker({ element: el, anchor: "bottom" }).setLngLat([ev.lng, ev.lat]).addTo(m));
    }
    for (const c of crowds) markers.current.push(new ml.Marker({ element: crowdEl(c) }).setLngLat([c.lng, c.lat]).addTo(m));
    people.forEach((p, i) => {
      const el = personEl(p, i, p.id === selectedId);
      el.firstElementChild!.addEventListener("click", (e) => {
        e.stopPropagation();
        handlers.current.onSelectPerson(p.id);
      });
      markers.current.push(new ml.Marker({ element: el, anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(m));
    });
  }, [events, people, crowds, focusEventId, selectedId, ready]);

  useEffect(() => {
    if (!flyTo || !map.current) return;
    map.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: flyTo.zoom ?? map.current.getZoom(), speed: 1.2, curve: 1.4, essential: true });
  }, [flyTo]);

  useEffect(() => {
    map.current?.easeTo({ pitch: threeD ? 55 : 0, bearing: threeD ? -20 : 0, duration: 700 });
  }, [threeD]);

  // "You" dot: only from this device's own position, never sent anywhere.
  useEffect(() => {
    const m = map.current;
    const ml = mlRef.current;
    if (!m || !ml || !ready) return;
    meMarker.current?.remove();
    if (!myPosition) return;
    const el = document.createElement("div");
    el.className = "cx-me";
    meMarker.current = new ml.Marker({ element: el }).setLngLat([myPosition.lng, myPosition.lat]).addTo(m);
  }, [myPosition, ready]);

  return (
    <div className="relative size-full overflow-hidden bg-[#070717]">
      <div ref={box} className="size-full" />
      {!ready && !failed ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="cx-radar" />
        </div>
      ) : null}
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/70">
          Map tiles couldn&apos;t load (offline?). The people list below still works.
        </div>
      ) : null}
      <div className="cx-vignette pointer-events-none absolute inset-0" />
    </div>
  );
}
