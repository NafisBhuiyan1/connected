import { eventSubjects } from "./event-subjects";
import type { ConnectedEvent } from "./types";

export type CoverEvent = Pick<ConnectedEvent, "title" | "description" | "tags" | "kind"> & { imageUrl?: string };
export interface EventCoverSource { src: string; kind: "published" | "artwork"; label: string }

/** Images load in the browser, never through a server-side URL-fetching proxy. */
export function publishedImageUrl(raw: string | undefined): string | undefined {
  if (!raw || raw.length > 2000) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return undefined;
    if (/^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(url.hostname) || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")) return undefined;
    // Localist's generic calendar placeholder is not an event photograph.
    if (/\/assets\/main\/thumbs\/event-/i.test(url.pathname)) return undefined;
    return url.toString();
  } catch { return undefined; }
}

export function eventArtwork(event: CoverEvent): EventCoverSource {
  const subjects = eventSubjects(event);
  let name = "community";
  if (subjects.some((subject) => ["health", "science"].includes(subject))) name = "research";
  else if (subjects.some((subject) => ["arts", "communications"].includes(subject))) name = "studio";
  else if (subjects.some((subject) => ["humanities", "education"].includes(subject))) name = "learning";
  else if (subjects.some((subject) => ["business", "law", "social-sciences"].includes(subject))) name = "forum";
  else if (subjects.some((subject) => ["computing", "engineering"].includes(subject)) || event.kind === "hackathon") name = "build";
  else if (event.kind === "career-fair" || event.kind === "conference" || event.kind === "pitch") name = "forum";
  else if (event.kind === "seminar") name = "learning";
  return { src: `/event-covers/${name}.svg`, kind: "artwork", label: "Topic artwork" };
}

export function eventCoverSource(event: CoverEvent): EventCoverSource {
  const published = publishedImageUrl(event.imageUrl);
  return published ? { src: published, kind: "published", label: "Calendar image" } : eventArtwork(event);
}
