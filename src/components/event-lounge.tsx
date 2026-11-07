"use client";

import { AnimatePresence, motion } from "motion/react";
import { Camera, Flag, Heart, ImagePlus, Loader2, MessageCircle, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, timeAgo, useApi } from "@/lib/client";
import { play } from "@/lib/sfx";
import type { PublicProfile } from "@/lib/types";
import { useToast } from "./toast";
import { Avatar, cx, DemoTag } from "./ui";

interface LoungeData {
  event: { id: string; title: string };
  messages: { id: string; userId: string; body: string; createdAt: string; mine: boolean; reportedByMe: boolean }[];
  photos: { id: string; userId: string; caption: string; url: string; likes: number; likedByMe: boolean; createdAt: string; mine: boolean }[];
  authors: Record<string, PublicProfile>;
  online: number;
}

export function EventLounge({ eventId, joined }: { eventId: string; joined: boolean }) {
  const [tab, setTab] = useState<"chat" | "photos">("chat");
  const { data, error, reload, setData } = useApi<LoungeData>(joined ? `/api/events/${eventId}/lounge` : null, { poll: 3000 });

  if (!joined) {
    return (
      <div className="card flex flex-col items-center p-8 text-center">
        <MessageCircle className="size-8 text-brand-500" />
        <p className="mt-3 text-[16px] font-semibold text-ink">Join the event to enter the lounge</p>
        <p className="mt-1 text-[13.5px] text-muted">Chat with everyone here and share photos.</p>
      </div>
    );
  }
  if (error) return <div className="card p-6 text-sm text-rose-700">{error}</div>;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <div className="flex rounded-xl bg-canvas p-1">
          {(
            [
              { id: "chat", label: "Chat", icon: MessageCircle },
              { id: "photos", label: `Photos${data?.photos.length ? ` · ${data.photos.length}` : ""}`, icon: Camera },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors", tab === t.id ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink")}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </div>
        {data ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-muted">
            <span className="size-2 rounded-full bg-emerald-500" /> {data.online} checked in
          </span>
        ) : null}
      </div>
      {tab === "chat" ? <Chat eventId={eventId} data={data} reload={reload} /> : <Photos eventId={eventId} data={data} reload={reload} setData={setData} />}
    </div>
  );
}

function Chat({ eventId, data, reload }: { eventId: string; data: LoungeData | null; reload: () => Promise<void> }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const count = data?.messages.length ?? 0;

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [count]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await api(`/api/events/${eventId}/lounge`, { body: { action: "post", body } });
      setText("");
      play("send");
      await reload();
    } catch (err) {
      toast({ tone: "error", title: "Not sent", body: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  async function report(id: string, mine: boolean) {
    await api(`/api/events/${eventId}/lounge`, { body: { action: "report", messageId: id } });
    toast({ tone: "info", title: mine ? "Message deleted" : "Reported", body: mine ? undefined : "Messages with 3 reports are hidden automatically." });
    await reload();
  }

  return (
    <div className="flex h-[520px] flex-col">
      <div ref={box} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!data ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-brand-500" />
          </div>
        ) : data.messages.length ? (
          data.messages.map((m) => {
            const a = data.authors[m.userId];
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cx("group flex items-end gap-2", m.mine && "flex-row-reverse")}>
                {a ? (
                  <Link href={`/people/${a.id}`} className="shrink-0">
                    <Avatar name={a.name} hue={a.avatarHue} size={32} />
                  </Link>
                ) : null}
                <div className={cx("max-w-[78%]", m.mine && "text-right")}>
                  {!m.mine && a ? (
                    <p className="mb-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-ink-2">
                      {a.name} {a.isDemo ? <DemoTag /> : null}
                    </p>
                  ) : null}
                  <div className={cx("inline-block rounded-2xl px-3.5 py-2 text-left text-[14px] leading-snug", m.mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-canvas text-ink")}>{m.body}</div>
                  <div className={cx("mt-0.5 flex items-center gap-2 text-[10.5px] text-faint", m.mine && "justify-end")}>
                    {timeAgo(m.createdAt)}
                    <button onClick={() => report(m.id, m.mine)} className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-600" aria-label={m.mine ? "Delete" : "Report"}>
                      {m.mine ? <Trash2 className="size-3" /> : <Flag className="size-3" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <p className="pt-16 text-center text-[13.5px] text-muted">Be the first to say hi 👋</p>
        )}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message everyone at the event…"
          maxLength={500}
          className="h-11 flex-1 rounded-xl border border-line bg-canvas px-4 text-[14px] text-ink outline-none placeholder:text-faint focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
        />
        <button disabled={!text.trim() || sending} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[14px] font-semibold text-white hover:bg-brand-700 disabled:opacity-40">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

function Photos({
  eventId,
  data,
  reload,
  setData,
}: {
  eventId: string;
  data: LoungeData | null;
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<LoungeData | null>>;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caption", caption);
      const res = await fetch(`/api/events/${eventId}/photos`, { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      setCaption("");
      play("success");
      toast({ tone: "success", title: "Photo shared with the event" });
      await reload();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't upload", body: (e as Error).message });
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function act(id: string, action: "like" | "report" | "delete") {
    const r = await api<{ likes?: number; likedByMe?: boolean; deleted?: boolean }>(`/api/photos/${id}`, { body: { action } });
    if (action === "like") {
      if (r.likedByMe) play("pop");
      setData((d) => (d ? { ...d, photos: d.photos.map((p) => (p.id === id ? { ...p, likes: r.likes ?? p.likes, likedByMe: Boolean(r.likedByMe) } : p)) } : d));
    } else {
      toast({ tone: "info", title: action === "delete" ? "Photo deleted" : "Reported — thanks" });
      setOpen(null);
      await reload();
    }
  }

  const current = data?.photos.find((p) => p.id === open);

  return (
    <div className="p-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 p-3 sm:flex-row sm:items-center">
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)" maxLength={200} className="h-10 flex-1 rounded-xl border border-line bg-white px-3 text-[13.5px] outline-none focus:border-brand-300" />
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button onClick={() => input.current?.click()} disabled={uploading} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[13.5px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Add photo
        </button>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">Only people at this event can see these. Ask before posting photos of others.</p>
      {data?.photos.length ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.photos.map((p, i) => {
            const a = data.authors[p.userId];
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
                onClick={() => setOpen(p.id)}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-canvas"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption || "Event photo"} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent p-2 text-left">
                  {a ? <Avatar name={a.name} hue={a.avatarHue} size={20} /> : null}
                  <span className="truncate text-[11.5px] font-medium text-white">{p.caption || a?.name}</span>
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-white/90">
                    <Heart className={cx("size-3", p.likedByMe && "fill-white")} /> {p.likes}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center py-10 text-center">
          <Camera className="size-8 text-brand-400" />
          <p className="mt-2 text-[14px] font-semibold text-ink">No photos yet</p>
          <p className="text-[13px] text-muted">Share the first moment from the event.</p>
        </div>
      )}

      <AnimatePresence>
        {current ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.url} alt={current.caption || "Event photo"} className="max-h-[70vh] w-full bg-black object-contain" />
              <div className="flex items-center gap-3 p-4">
                {data?.authors[current.userId] ? <Avatar name={data.authors[current.userId].name} hue={data.authors[current.userId].avatarHue} size={36} /> : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{data?.authors[current.userId]?.name}</p>
                  <p className="truncate text-[12.5px] text-muted">
                    {current.caption ? `${current.caption} · ` : ""}
                    {timeAgo(current.createdAt)}
                  </p>
                </div>
                <button onClick={() => act(current.id, "like")} className={cx("inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[13px] font-semibold", current.likedByMe ? "bg-brand-50 text-brand-700" : "bg-canvas text-ink-2")}>
                  <Heart className={cx("size-4", current.likedByMe && "fill-brand-600 text-brand-600")} /> {current.likes}
                </button>
                <button onClick={() => act(current.id, current.mine ? "delete" : "report")} className="inline-flex size-9 items-center justify-center rounded-xl bg-canvas text-muted hover:text-rose-600" aria-label={current.mine ? "Delete" : "Report"}>
                  {current.mine ? <Trash2 className="size-4" /> : <Flag className="size-4" />}
                </button>
              </div>
              <button onClick={() => setOpen(null)} className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white" aria-label="Close">
                <X className="size-4" />
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
