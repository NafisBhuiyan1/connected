"use client";

import { CalendarPlus, CheckCircle2, FileUp, Link2, MapPin } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Modal } from "@/components/ui";
import { api, fmtDateTime } from "@/lib/client";
import { SUGGESTED_FEEDS } from "@/lib/constants";
import { play } from "@/lib/sfx";

interface Summary {
  calendar: string;
  added: number;
  updated: number;
  skipped: { past: number; cancelled: number; far: number; overLimit: number; offTopic: number; duplicate: number };
  scanned: number;
  events: { id: string; title: string; kind: string; start: string; venue: string; onMap: boolean }[];
}

const WHERE = [
  { name: "Luma", how: "Calendar → ••• → Subscribe → copy iCal link" },
  { name: "Meetup", how: "Group → Events → “Add to calendar” / iCal" },
  { name: "Google Calendar", how: "Settings → calendar → Public address in iCal format" },
  { name: "Campus calendars", how: "Look for “Subscribe”, “Export” or “iCal”" },
];

export function ImportEventsButton({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" icon={<CalendarPlus className="size-4" />} onClick={() => setOpen(true)}>
        Import
      </Button>
      <ImportEventsDialog open={open} onClose={() => setOpen(false)} onImported={onImported} />
    </>
  );
}

export function ImportEventsDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported?: () => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Summary | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function run(body: { url: string } | { ics: string }) {
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const r = await api<Summary>("/api/events/import", { body });
      setRes(r);
      play("success");
      onImported?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 2_000_000) return setErr("That file is too big (2 MB max).");
    await run({ ics: await f.text() });
    if (file.current) file.current.value = "";
  }

  return (
    <Modal open={open} onClose={onClose} title="Import events">
      <p className="text-[13.5px] text-muted">Paste a public calendar link — Connected adds the upcoming events, sorts them by type and pins them on the map.</p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) void run({ url: url.trim() });
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Link2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… .ics or webcal://…"
            inputMode="url"
            className="h-11 w-full rounded-xl border border-line bg-canvas pr-3 pl-9 text-[14px] outline-none focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
          />
        </div>
        <Button type="submit" loading={busy} disabled={!url.trim()} className="h-11">
          Import
        </Button>
      </form>
      <div className="mt-2 flex items-center gap-2 text-[12.5px] text-muted">
        or
        <button type="button" onClick={() => file.current?.click()} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
          <FileUp className="size-3.5" /> upload an .ics file
        </button>
        <input ref={file} type="file" accept=".ics,text/calendar" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>

      <p className="mt-5 text-[11.5px] font-semibold tracking-wide text-faint uppercase">Near CrownHacks</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {SUGGESTED_FEEDS.map((f) => (
          <button
            key={f.url}
            type="button"
            disabled={busy}
            onClick={() => {
              setUrl(f.url);
              void run({ url: f.url });
            }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:opacity-60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
              <CalendarPlus className="size-4" />
            </span>
            <span className="min-w-0">
              <b className="block text-[13.5px] text-ink">{f.name}</b>
              <span className="block truncate text-[12px] text-muted">{f.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {err ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{err}</p> : null}
      {busy ? <p className="mt-3 text-[12.5px] text-muted">Reading the calendar and picking the networking events…</p> : null}

      {res ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-emerald-800">
            <CheckCircle2 className="size-4" /> {res.added} new{res.updated ? ` · ${res.updated} updated` : ""} from {res.calendar}
          </p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {res.events.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} onClick={onClose} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-white">
                  <span className="min-w-0">
                    <b className="block truncate text-ink">{e.title}</b>
                    <span className="text-[12px] text-muted">
                      {fmtDateTime(e.start)} · {e.venue}
                    </span>
                  </span>
                  {e.onMap ? <MapPin className="size-3.5 shrink-0 text-brand-600" /> : null}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-muted">
            Scanned {res.scanned} · kept the {res.events.length} best for meeting people
            {res.skipped.offTopic ? ` · ${res.skipped.offTopic} off-topic (games, study sessions…)` : ""}
            {res.skipped.duplicate ? ` · ${res.skipped.duplicate} already listed` : ""}
            {res.skipped.past ? ` · ${res.skipped.past} past` : ""}.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {WHERE.map((w) => (
            <div key={w.name} className="rounded-xl bg-canvas px-3 py-2">
              <p className="text-[12.5px] font-semibold text-ink">{w.name}</p>
              <p className="text-[11.5px] text-muted">{w.how}</p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
