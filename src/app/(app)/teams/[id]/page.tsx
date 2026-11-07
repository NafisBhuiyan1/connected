"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Clock, MapPin, Megaphone, PartyPopper, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, cx, DemoTag, Empty, ErrorBox, Skeleton } from "@/components/ui";
import { api, firstName, timeAgo, useApi } from "@/lib/client";
import { play } from "@/lib/sfx";
import { ROLE_BY_ID } from "@/lib/ontology";
import type { Message, PublicProfile, Team } from "@/lib/types";

interface TeamData {
  team: Team;
  people: Record<string, PublicProfile>;
  event: { id: string; title: string; meetingSpots: string[] } | null;
  messages: Message[];
  myStatus: Team["members"][number]["status"] | null;
}

const STATUS_BADGE = {
  owner: { tone: "brand" as const, label: "Owner" },
  invited: { tone: "amber" as const, label: "Invited" },
  accepted: { tone: "green" as const, label: "Joined" },
  declined: { tone: "neutral" as const, label: "Passed" },
};

export default function TeamRoom() {
  const { id } = useParams<{ id: string }>();
  const { me } = useSession();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<TeamData>(`/api/teams/${id}`, { poll: 3000 });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const prevStatus = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data) return;
    if (prevStatus.current === "forming" && data.team.status === "formed") {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 4200);
    }
    prevStatus.current = data.team.status;
  }, [data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [data?.messages.length]);

  async function act(action: "accept" | "decline") {
    setBusy(action);
    try {
      await api(`/api/teams/${id}`, { body: { action } });
      if (action === "accept") play("success");
      toast({ tone: action === "accept" ? "success" : "info", title: action === "accept" ? "You joined the team" : "You passed on this team" });
      await reload();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't update", body: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = msg.trim();
    if (!body) return;
    setMsg("");
    try {
      await api(`/api/teams/${id}`, { body: { action: "message", body } });
      await reload();
    } catch (err) {
      toast({ tone: "error", title: "Message not sent", body: (err as Error).message });
      setMsg(body);
    }
  }

  async function toggleStep(stepId: string) {
    try {
      await api(`/api/teams/${id}`, { body: { action: "step", stepId } });
      await reload();
    } catch (err) {
      toast({ tone: "error", title: "Couldn't update", body: (err as Error).message });
    }
  }

  async function removeOpenRole(roleId: string) {
    if (!data) return;
    await api(`/api/teams/${id}`, { body: { action: "open-roles", roles: data.team.openRoles.filter((r) => r !== roleId) } });
    await reload();
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data || !me)
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );

  const { team, people, event } = data;
  const joined = team.members.filter((m) => m.status === "owner" || m.status === "accepted");
  const canChat = data.myStatus === "owner" || data.myStatus === "accepted";
  const owner = people[team.ownerId];

  return (
    <div className="space-y-5">
      <Link href="/connections" className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Connections
      </Link>

      <AnimatePresence>{celebrate ? <Celebration /> : null}</AnimatePresence>

      <Card className="overflow-hidden">
        <div className="brand-gradient px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx("rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", team.status === "formed" ? "bg-emerald-400/25 text-emerald-50" : "bg-white/15 text-white")}>
                  {team.status === "formed" ? "Team formed" : "Forming"}
                </span>
                {event ? <span className="text-[12.5px] text-white/75">{event.title}</span> : null}
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{team.title}</h1>
              {team.pitch ? <p className="mt-1.5 max-w-2xl text-[14px] text-white/80">{team.pitch}</p> : null}
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-[28px] leading-none font-semibold tabular-nums">
                {joined.length}/{team.members.filter((m) => m.status !== "declined").length}
              </p>
              <p className="text-[11.5px] text-white/75">members joined</p>
            </div>
          </div>
        </div>
        {data.myStatus === "invited" ? (
          <div className="flex flex-col gap-3 border-b border-line bg-brand-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-[14px] text-ink-2">
              <b>{owner ? firstName(owner.name) : "Someone"}</b> invited you as{" "}
              <b>{ROLE_BY_ID[team.members.find((m) => m.userId === me.id)?.roleId ?? ""]?.label ?? "a teammate"}</b>. Joining shares your profile with this team.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => act("decline")} loading={busy === "decline"} icon={<X className="size-4" />}>
                Pass
              </Button>
              <Button onClick={() => act("accept")} loading={busy === "accept"} icon={<Check className="size-4" />}>
                Join team
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[15px] font-semibold text-ink">Members</p>
            <ul className="mt-3 divide-y divide-line">
              {team.members.map((m) => {
                const p = people[m.userId];
                if (!p) return null;
                const s = STATUS_BADGE[m.status];
                return (
                  <motion.li key={m.userId} layout className={cx("flex items-center gap-3 py-3", m.status === "declined" && "opacity-50")}>
                    <Avatar name={p.name} hue={p.avatarHue} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/people/${p.id}`} className="truncate text-[14px] font-semibold text-ink hover:text-brand-700">
                          {m.userId === me.id ? "You" : p.name}
                        </Link>
                        {p.isDemo && m.userId !== me.id ? <DemoTag /> : null}
                      </div>
                      <p className="truncate text-[12.5px] text-muted">{ROLE_BY_ID[m.roleId]?.label ?? m.roleId} · {p.headline}</p>
                    </div>
                    <Badge tone={s.tone} icon={m.status === "invited" ? <Clock className="size-3" /> : m.status === "accepted" ? <Check className="size-3" /> : undefined}>
                      {s.label}
                    </Badge>
                  </motion.li>
                );
              })}
            </ul>
          </Card>

          <Card className="flex h-[460px] flex-col">
            <div className="border-b border-line px-5 py-3.5">
              <p className="text-[15px] font-semibold text-ink">Team room</p>
              <p className="text-[12px] text-muted">{canChat ? "Only members who joined can see this." : "Join the team to chat."}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {data.messages.length ? (
                data.messages.map((m) => {
                  if (m.fromId === "system")
                    return (
                      <div key={m.id} className="flex justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-[12px] text-muted">
                          <Sparkles className="size-3 text-brand-500" /> {m.body}
                        </span>
                      </div>
                    );
                  const mine = m.fromId === me.id;
                  const p = people[m.fromId];
                  return (
                    <div key={m.id} className={cx("flex items-end gap-2", mine && "flex-row-reverse")}>
                      {p ? <Avatar name={p.name} hue={p.avatarHue} size={26} /> : null}
                      <div className={cx("max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px]", mine ? "brand-gradient text-white" : "bg-canvas text-ink")}>
                        {!mine && p ? <p className="mb-0.5 text-[11px] font-semibold text-muted">{firstName(p.name)}</p> : null}
                        {m.body}
                        <p className={cx("mt-0.5 text-[10.5px]", mine ? "text-white/70" : "text-faint")}>{timeAgo(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Empty title="No messages yet" body="Say hi and suggest where to meet." />
              )}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                disabled={!canChat}
                placeholder={canChat ? "Message the team…" : "Join to chat"}
                maxLength={2000}
                className="h-10 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100 disabled:bg-canvas"
              />
              <Button type="submit" disabled={!canChat || !msg.trim()} icon={<Send className="size-4" />}>
                Send
              </Button>
            </form>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <p className="text-[15px] font-semibold text-ink">Next steps</p>
            <ul className="mt-3 space-y-1">
              {team.nextSteps.map((s) => (
                <li key={s.id}>
                  <button disabled={!canChat} onClick={() => toggleStep(s.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-canvas disabled:cursor-default disabled:hover:bg-transparent">
                    <span className={cx("flex size-5 shrink-0 items-center justify-center rounded-md border", s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line-2 bg-surface")}>
                      {s.done ? <Check className="size-3.5" /> : null}
                    </span>
                    <span className={cx("text-[13.5px]", s.done ? "text-muted line-through" : "text-ink-2")}>{s.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {event?.meetingSpots.length ? (
            <Card className="p-5">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                <MapPin className="size-4 text-brand-600" /> Where to meet
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">Public spots at {event.title}.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {event.meetingSpots.map((z) => (
                  <button
                    key={z}
                    disabled={!canChat}
                    onClick={async () => {
                      await api(`/api/teams/${id}`, { body: { action: "message", body: `📍 Let's meet at ${z}.` } });
                      await reload();
                    }}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink-2 hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
                  >
                    {z}
                  </button>
                ))}
              </div>
              <Link href={`/events/${event.id}`} className="mt-3 inline-block text-[12.5px] font-medium text-brand-700 hover:underline">
                Open zone map →
              </Link>
            </Card>
          ) : null}

          <Card className="p-5">
            <p className="text-[15px] font-semibold text-ink">Role coverage</p>
            <ul className="mt-3 space-y-2">
              {team.roles.map((r) => {
                const m =
                  team.members.find((x) => x.userId === r.assignedUserId && x.status !== "declined") ??
                  team.members.find((x) => x.roleId === r.roleId && x.status !== "declined");
                const p = m ? people[m.userId] : undefined;
                const open = team.openRoles.includes(r.roleId) || !m;
                return (
                  <li key={r.roleId} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="text-ink-2">{r.label}</span>
                    {p && !open ? (
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        <Avatar name={p.name} hue={p.avatarHue} size={20} /> {m!.userId === me.id ? "You" : firstName(p.name)}
                        {m!.status === "invited" ? <Clock className="size-3 text-amber-500" /> : <Check className="size-3 text-emerald-500" />}
                      </span>
                    ) : (
                      <Badge tone="amber">Open</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
            {team.openRoles.length ? (
              <div className="mt-4 rounded-2xl bg-amber-50/70 p-3 text-[12.5px] text-amber-900">
                <p className="flex items-center gap-1.5 font-semibold">
                  <Megaphone className="size-3.5" /> Posted as open roles
                </p>
                <p className="mt-0.5">Participants whose skills fit see these on their Opportunity Radar.</p>
                {data.myStatus === "owner" ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {team.openRoles.map((r) => (
                      <button key={r} onClick={() => removeOpenRole(r)} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11.5px] font-medium text-amber-900">
                        {ROLE_BY_ID[r]?.short ?? r} <X className="size-3" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Celebration() {
  const bits = Array.from({ length: 28 });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-[80] flex items-start justify-center pt-28">
      <motion.div initial={{ scale: 0.8, y: 10 }} animate={{ scale: 1, y: 0 }} className="flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-white shadow-[var(--shadow-pop)]">
        <PartyPopper className="size-5 text-amber-300" /> <span className="font-semibold">Team formed! Time to build.</span>
      </motion.div>
      {bits.map((_, i) => (
        <motion.span
          key={i}
          className="absolute top-32 size-2 rounded-sm"
          style={{ background: ["#5145e0", "#7a5af8", "#10b981", "#f59e0b", "#0ea5e9"][i % 5], left: "50%" }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: (Math.random() - 0.5) * 700, y: 200 + Math.random() * 400, opacity: 0, rotate: Math.random() * 540 }}
          transition={{ duration: 1.8 + Math.random(), ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}
