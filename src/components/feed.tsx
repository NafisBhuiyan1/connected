"use client";

import { AnimatePresence, motion } from "motion/react";
import { HandHeart, Heart, Loader2, MapPinCheck, Megaphone, PenLine, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api, timeAgo, useApi } from "@/lib/client";
import { interestLabel, SKILL_BY_ID, skillLabel } from "@/lib/ontology";
import { play } from "@/lib/sfx";
import type { Post, PostKind, Profile, PublicProfile } from "@/lib/types";
import { useToast } from "./toast";
import { Avatar, cx, DemoTag } from "./ui";

type FeedItem =
  | { type: "post"; id: string; at: string; post: Post; author: PublicProfile; likes: number; likedByMe: boolean; fit: number | null; isMine: boolean }
  | { type: "team"; id: string; at: string; teamId: string; title: string; status: "forming" | "formed"; members: PublicProfile[]; openRoles: { roleId: string; label: string; myFit: number }[]; ownerId: string }
  | { type: "checkins"; id: string; at: string; eventId: string; eventTitle: string; people: PublicProfile[]; count: number }
  | { type: "connected"; id: string; at: string; other: PublicProfile };

const KINDS: { id: PostKind; label: string; icon: typeof PenLine; tint: string }[] = [
  { id: "update", label: "Update", icon: PenLine, tint: "text-brand-700 bg-brand-50" },
  { id: "looking", label: "Looking for", icon: Search, tint: "text-amber-800 bg-amber-50" },
  { id: "offering", label: "Can help", icon: HandHeart, tint: "text-emerald-700 bg-emerald-50" },
];

export function Composer({ me, onPosted }: { me: Profile; onPosted: () => void }) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PostKind>("looking");
  const [busy, setBusy] = useState(false);
  async function post() {
    if (body.trim().length < 3) return;
    setBusy(true);
    try {
      await api("/api/feed", { body: { body, kind } });
      play("send");
      setBody("");
      onPosted();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't post", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <Avatar name={me.name} hue={me.avatarHue} size={42} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={kind === "looking" ? "Who are you looking for?" : kind === "offering" ? "What can you help with today?" : "Share what you're building…"}
          maxLength={600}
          rows={2}
          className="min-h-[52px] flex-1 resize-none rounded-2xl border border-line bg-canvas px-3.5 py-2.5 text-[14.5px] text-ink outline-none placeholder:text-faint focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 pl-[54px]">
        <div className="flex gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={cx(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                kind === k.id ? k.tint : "text-muted hover:bg-canvas",
              )}
            >
              <k.icon className="size-3.5" /> <span className="hidden sm:inline">{k.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={post}
          disabled={busy || body.trim().length < 3}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Post
        </button>
      </div>
    </div>
  );
}

export function Feed({ me }: { me: Profile }) {
  const { data, reload, setData } = useApi<{ items: FeedItem[] }>("/api/feed", { poll: 15_000 });
  return (
    <div className="space-y-3">
      <Composer me={me} onPosted={reload} />
      {!data
        ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-36" />)
        : data.items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.45, delay: Math.min(i, 4) * 0.04 }}
            >
              <FeedCard
                item={item}
                onLiked={(likes, likedByMe) =>
                  setData((d) => (d ? { items: d.items.map((x) => (x.id === item.id && x.type === "post" ? { ...x, likes, likedByMe } : x)) } : d))
                }
                onDeleted={() => setData((d) => (d ? { items: d.items.filter((x) => x.id !== item.id) } : d))}
              />
            </motion.div>
          ))}
    </div>
  );
}

const hashtag = (label: string) =>
  label
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");

function Who({ p, sub, at }: { p: PublicProfile; sub?: string; at: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link href={`/people/${p.id}`}>
        <Avatar name={p.name} hue={p.avatarHue} size={44} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={`/people/${p.id}`} className="truncate text-[14.5px] font-semibold text-ink hover:text-brand-700">
            {p.name}
          </Link>
          {p.isDemo ? <DemoTag /> : null}
        </div>
        <p className="truncate text-[12.5px] text-muted">
          {sub ?? p.headline} · {timeAgo(at)}
        </p>
      </div>
    </div>
  );
}

function FeedCard({ item, onLiked, onDeleted }: { item: FeedItem; onLiked: (likes: number, likedByMe: boolean) => void; onDeleted: () => void }) {
  if (item.type === "post") {
    const k = KINDS.find((x) => x.id === item.post.kind)!;
    return (
      <article className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <Who p={item.author} at={item.at} />
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-1.5">
            <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap", k.tint)}>
              <k.icon className="size-3" /> {k.label}
            </span>
            {item.fit !== null && item.fit >= 50 ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-brand-700">{item.fit}% fit</span> : null}
          </div>
        </div>
        <p className="mt-3 text-[14.5px] leading-relaxed whitespace-pre-line text-ink">{item.post.body}</p>
        {item.post.tags.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {item.post.tags.map((t) => (
              <span key={t} className="rounded-full bg-canvas px-2 py-0.5 text-[11.5px] text-ink-2">
                #{hashtag(SKILL_BY_ID[t] ? skillLabel(t) : interestLabel(t))}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-1 border-t border-line pt-2.5">
          <LikeButton id={item.post.id} likes={item.likes} liked={item.likedByMe} onChange={onLiked} />
          {!item.isMine ? (
            <Link href={`/people/${item.author.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-canvas">
              <Megaphone className="size-4" /> Reach out
            </Link>
          ) : (
            <button
              onClick={async () => {
                await api(`/api/feed/${item.post.id}`, { body: { action: "delete" } });
                onDeleted();
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted hover:bg-canvas hover:text-rose-600"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          )}
        </div>
      </article>
    );
  }
  if (item.type === "team") {
    return (
      <article className="card overflow-hidden">
        <div className="flex items-center gap-3 bg-brand-50 px-4 py-3">
          <Users className="size-4 text-brand-600" />
          <p className="text-[13px] font-semibold text-brand-800">{item.status === "formed" ? "A team just formed" : "A team is forming"}</p>
          <span className="ml-auto text-[12px] text-brand-700/70">{timeAgo(item.at)}</span>
        </div>
        <div className="p-4">
          <p className="text-[15.5px] font-semibold text-ink">{item.title}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {item.members.slice(0, 5).map((m) => (
                <Avatar key={m.id} name={m.name} hue={m.avatarHue} size={34} />
              ))}
            </div>
            <span className="text-[13px] text-muted">{item.members.map((m) => m.name.split(" ")[0]).join(", ")}</span>
          </div>
          {item.openRoles.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[12.5px] text-muted">Still needs:</span>
              {item.openRoles.map((r) => (
                <span key={r.roleId} className={cx("rounded-full px-2 py-0.5 text-[12px] font-medium", r.myFit >= 60 ? "bg-brand-600 text-white" : "bg-canvas text-ink-2")}>
                  {r.label}
                  {r.myFit >= 60 ? ` · you fit ${r.myFit}%` : ""}
                </span>
              ))}
              <Link href={`/people/${item.ownerId}`} className="ml-auto text-[13px] font-semibold text-brand-700 hover:underline">
                Ask to join →
              </Link>
            </div>
          ) : null}
        </div>
      </article>
    );
  }
  if (item.type === "checkins") {
    return (
      <Link href={`/events/${item.eventId}`} className="card card-hover flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MapPinCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">
            {item.count} {item.count === 1 ? "person" : "people"} checked in at {item.eventTitle}
          </p>
          <p className="text-[12.5px] text-muted">Verified on their phones · {timeAgo(item.at)}</p>
        </div>
        <div className="flex -space-x-2">
          {item.people.slice(0, 4).map((p) => (
            <Avatar key={p.id} name={p.name} hue={p.avatarHue} size={30} />
          ))}
        </div>
      </Link>
    );
  }
  return (
    <div className="card flex items-center gap-3 p-4">
      <Avatar name={item.other.name} hue={item.other.avatarHue} size={36} />
      <p className="flex-1 text-[13.5px] text-ink-2">
        You and <b className="text-ink">{item.other.name}</b> connected · {timeAgo(item.at)}
      </p>
    </div>
  );
}

function LikeButton({ id, likes, liked, onChange }: { id: string; likes: number; liked: boolean; onChange: (likes: number, liked: boolean) => void }) {
  const [burst, setBurst] = useState(0);
  return (
    <button
      onClick={async () => {
        onChange(liked ? likes - 1 : likes + 1, !liked);
        if (!liked) {
          setBurst((b) => b + 1);
          play("pop");
        }
        try {
          const r = await api<{ likes: number; likedByMe: boolean }>(`/api/feed/${id}`, { body: { action: "like" } });
          onChange(r.likes, r.likedByMe);
        } catch {
          onChange(likes, liked);
        }
      }}
      className={cx("relative inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors", liked ? "text-brand-700" : "text-ink-2 hover:bg-canvas")}
    >
      <span className="relative">
        <Heart className={cx("size-4 transition-transform", liked && "scale-110 fill-brand-600 text-brand-600")} />
        <AnimatePresence>
          {burst ? (
            <motion.span
              key={burst}
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 rounded-full border-2 border-brand-400"
            />
          ) : null}
        </AnimatePresence>
      </span>
      Interested{likes ? ` · ${likes}` : ""}
    </button>
  );
}
