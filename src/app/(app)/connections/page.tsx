"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Inbox,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  UserX,
  Users,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PeopleStack, PersonHeader } from "@/components/people";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, ButtonLink, Card, cx, Empty, ErrorBox, Input, PageHeader, Skeleton } from "@/components/ui";
import { api, firstName, timeAgo, useApi } from "@/lib/client";
import { roleLabel } from "@/lib/ontology";
import type { ConnectionRequest, Message, OutcomeRating, PublicProfile, Team, TeamMemberStatus } from "@/lib/types";

type Req = ConnectionRequest & { eventTitle?: string; myRating?: OutcomeRating };

interface RequestsResponse {
  incoming: Req[];
  outgoing: Req[];
  connections: Req[];
  declined: Req[];
  people: Record<string, PublicProfile>;
}

type TeamRow = Team & {
  memberNames: { id: string; name: string; status: TeamMemberStatus; hue: number }[];
  myStatus?: TeamMemberStatus;
};

type Tab = "requests" | "connections" | "teams";

export default function ConnectionsPage() {
  const { me } = useSession();
  const reqs = useApi<RequestsResponse>("/api/requests", { poll: 4000 });
  const teams = useApi<{ teams: TeamRow[] }>("/api/teams", { poll: 4000 });
  const [tab, setTab] = useState<Tab>("requests");

  const incoming = reqs.data?.incoming ?? [];
  const outgoing = reqs.data?.outgoing ?? [];
  const connections = reqs.data?.connections ?? [];
  const teamList = teams.data?.teams ?? [];
  const invites = teamList.filter((t) => t.myStatus === "invited").length;

  const tabs: { id: Tab; label: string; count: number; highlight?: number }[] = [
    { id: "requests", label: "Requests", count: incoming.length + outgoing.length, highlight: incoming.length },
    { id: "connections", label: "Connections", count: connections.length },
    { id: "teams", label: "Teams", count: teamList.length, highlight: invites },
  ];

  const reload = () => {
    void reqs.reload();
    void teams.reload();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Connections"
        title="Your real-world network"
        sub="Requests, the people you've met, and the teams you're on. What matters isn't how many people you add, it's whether the conversations were useful."
        action={
          <ButtonLink href="/discover" variant="secondary" icon={<Sparkles className="size-4" />}>
            Find people
          </ButtonLink>
        }
      />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1 scrollbar-none sm:inline-flex">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "focus-ring relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-medium whitespace-nowrap transition-colors sm:flex-none",
              tab === t.id ? "text-brand-700" : "text-muted hover:text-ink",
            )}
          >
            {tab === t.id ? <motion.span layoutId="conn-tab" className="absolute inset-0 rounded-xl bg-brand-50" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
            <span className="relative">{t.label}</span>
            <span className={cx("relative rounded-full px-1.5 text-[11px] font-semibold tabular-nums", t.highlight ? "bg-brand-600 text-white" : "bg-canvas text-muted")}>
              {t.highlight || t.count}
            </span>
          </button>
        ))}
      </div>

      {reqs.error && !reqs.data ? <ErrorBox message={reqs.error} onRetry={() => void reqs.reload()} /> : null}

      {tab === "requests" ? (
        reqs.loading && !reqs.data ? (
          <ListSkeleton />
        ) : (
          <div className="space-y-6">
            <section>
              <SubHead title="Waiting for you" count={incoming.length} />
              {incoming.length ? (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {incoming.map((r) => (
                      <IncomingCard key={r.id} r={r} person={reqs.data?.people[r.fromId]} onDone={reload} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <Empty
                  icon={<Inbox className="size-5" />}
                  title="No requests waiting"
                  body="When someone reaches out with a specific ask, it shows up here. You decide: accept, decline, or ignore."
                />
              )}
            </section>
            <section>
              <SubHead title="You sent" count={outgoing.length} />
              {outgoing.length ? (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {outgoing.map((r) => (
                      <OutgoingCard key={r.id} r={r} person={reqs.data?.people[r.toId]} onDone={reload} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <Empty
                  icon={<Send className="size-5" />}
                  title="No pending requests"
                  body="Find someone who fits what you're building and send a specific ask."
                  action={
                    <ButtonLink href="/discover" icon={<ArrowRight className="size-4" />}>
                      Discover people
                    </ButtonLink>
                  }
                />
              )}
            </section>
          </div>
        )
      ) : null}

      {tab === "connections" ? (
        reqs.loading && !reqs.data ? (
          <ListSkeleton />
        ) : connections.length ? (
          <div className="space-y-3">
            {connections.map((r) => {
              const otherId = r.fromId === me?.id ? r.toId : r.fromId;
              return <ConnectionCard key={r.id} r={r} person={reqs.data?.people[otherId]} meId={me?.id ?? ""} onDone={reload} />;
            })}
          </div>
        ) : (
          <Empty
            icon={<Users className="size-5" />}
            title="No connections yet"
            body="Connections happen when someone accepts your request, or when you both use Quiet interest. Start with your goal."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href="/build" icon={<Wand2 className="size-4" />}>
                  Build a team
                </ButtonLink>
                <ButtonLink href="/discover" variant="secondary">
                  Discover people
                </ButtonLink>
              </div>
            }
          />
        )
      ) : null}

      {tab === "teams" ? (
        teams.loading && !teams.data ? (
          <ListSkeleton />
        ) : teams.error && !teams.data ? (
          <ErrorBox message={teams.error} onRetry={() => void teams.reload()} />
        ) : teamList.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {teamList.map((t) => (
              <TeamCard key={t.id} t={t} onDone={reload} />
            ))}
          </div>
        ) : (
          <Empty
            icon={<Wand2 className="size-5" />}
            title="You're not on a team yet"
            body="Describe what you want to build. Connected works out the roles and assembles a complementary team from the people who opted in."
            action={
              <ButtonLink href="/build" icon={<Wand2 className="size-4" />}>
                Open Team Builder
              </ButtonLink>
            }
          />
        )
      ) : null}
    </div>
  );
}

function SubHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
      <span className="rounded-full bg-canvas px-1.5 text-[11px] font-semibold text-muted tabular-nums">{count}</span>
    </div>
  );
}

function Unknown() {
  return (
    <div className="flex items-center gap-3">
      <Avatar name="?" hue={220} size={44} />
      <p className="text-[14px] text-muted">Someone who's no longer visible</p>
    </div>
  );
}

function AskQuote({ r }: { r: Req }) {
  return (
    <div className="mt-3 rounded-xl bg-canvas px-3.5 py-2.5">
      <p className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">{r.kind === "mutual" ? "How you matched" : "The ask"}</p>
      <p className="mt-0.5 text-[14px] leading-relaxed text-ink-2">{r.ask}</p>
      {r.message && r.message !== r.ask && r.kind !== "mutual" ? <p className="mt-2 border-t border-line pt-2 text-[13px] leading-relaxed whitespace-pre-line text-muted">{r.message}</p> : null}
    </div>
  );
}

function Meta({ r }: { r: Req }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
      <span>{timeAgo(r.createdAt)}</span>
      {r.eventTitle ? <span>· {r.eventTitle}</span> : null}
      {typeof r.score === "number" ? <span>· {r.score}% fit</span> : null}
    </div>
  );
}

const cardMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -16, transition: { duration: 0.18 } },
};

function IncomingCard({ r, person, onDone }: { r: Req; person?: PublicProfile; onDone: () => void }) {
  const toast = useToast();
  const [spot, setSpot] = useState("");
  const [showSpot, setShowSpot] = useState(false);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const name = person ? firstName(person.name) : "them";

  async function act(action: "accept" | "decline") {
    setBusy(action);
    try {
      const res = await api<{ request: Req }>(`/api/requests/${r.id}`, { body: action === "accept" ? { action, meetingSpot: spot.trim() || undefined } : { action } });
      if (action === "accept") {
        toast({ tone: "success", title: `You're connected with ${name}`, body: res.request.meetingSpot ? `Meeting spot: ${res.request.meetingSpot}` : "Say hi in the thread." });
      } else {
        toast({ tone: "info", title: "Declined", body: `${name} won't be told explicitly.` });
      }
      onDone();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't update request", body: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.div layout {...cardMotion} className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {person ? <PersonHeader p={person} /> : <Unknown />}
        <Meta r={r} />
      </div>
      <AskQuote r={r} />
      {r.reasons?.length ? (
        <p className="mt-2 text-[12.5px] text-muted">
          <span className="font-medium text-ink-2">Why you fit:</span> {r.reasons.slice(0, 2).join(" · ")}
        </p>
      ) : null}
      <AnimatePresence initial={false}>
        {showSpot ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3">
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-2" htmlFor={`spot-${r.id}`}>
                Meeting spot (optional — leave blank and Connected suggests a public spot at the event)
              </label>
              <Input id={`spot-${r.id}`} value={spot} onChange={(e) => setSpot(e.target.value)} placeholder="e.g. Food & coffee, 3:30 PM" maxLength={120} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <button onClick={() => setShowSpot((s) => !s)} className="focus-ring inline-flex items-center gap-1 rounded-lg text-[12.5px] font-medium text-muted hover:text-ink">
          <MapPin className="size-3.5" /> {showSpot ? "Hide meeting spot" : "Suggest a meeting spot"}
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => act("decline")} loading={busy === "decline"} disabled={busy !== null} icon={<X className="size-3.5" />}>
            Decline
          </Button>
          <Button size="sm" onClick={() => act("accept")} loading={busy === "accept"} disabled={busy !== null} icon={<Check className="size-3.5" />}>
            Accept
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function OutgoingCard({ r, person, onDone }: { r: Req; person?: PublicProfile; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function withdraw() {
    setBusy(true);
    try {
      await api(`/api/requests/${r.id}`, { body: { action: "withdraw" } });
      toast({ tone: "info", title: "Request withdrawn" });
      onDone();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't withdraw", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <motion.div layout {...cardMotion} className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {person ? <PersonHeader p={person} /> : <Unknown />}
        <div className="flex items-center gap-2">
          <Badge tone="amber">Waiting for reply</Badge>
        </div>
      </div>
      <AskQuote r={r} />
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        <Meta r={r} />
        <Button variant="ghost" size="sm" onClick={withdraw} loading={busy} icon={<Undo2 className="size-3.5" />}>
          Withdraw
        </Button>
      </div>
    </motion.div>
  );
}

const RATINGS: { id: OutcomeRating; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { id: "useful", label: "Useful", icon: ThumbsUp, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { id: "okay", label: "Okay", icon: Check, tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { id: "not-useful", label: "Not useful", icon: ThumbsDown, tone: "border-rose-200 bg-rose-50 text-rose-700" },
  { id: "didnt-meet", label: "Didn't meet", icon: UserX, tone: "border-line-2 bg-canvas text-ink-2" },
];

function ConnectionCard({ r, person, meId, onDone }: { r: Req; person?: PublicProfile; meId: string; onDone: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState<OutcomeRating | undefined>(r.myRating);
  const [saving, setSaving] = useState<OutcomeRating | null>(null);
  const [open, setOpen] = useState(false);
  const name = person ? firstName(person.name) : "them";
  const iSent = r.fromId === meId;

  async function rate(v: OutcomeRating) {
    setSaving(v);
    try {
      await api(`/api/requests/${r.id}`, { body: { action: "rate", rating: v } });
      setRating(v);
      toast({ tone: "success", title: "Thanks — noted", body: "Outcomes (not connection counts) are how Connected measures success." });
      onDone();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't save rating", body: (e as Error).message });
    } finally {
      setSaving(null);
    }
  }

  const rated = RATINGS.find((x) => x.id === (rating ?? r.myRating));

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {person ? <PersonHeader p={person} /> : <Unknown />}
        <div className="flex flex-wrap items-center gap-2">
          {r.kind === "mutual" ? (
            <Badge tone="violet" icon={<Sparkles className="size-3" />}>
              Mutual interest
            </Badge>
          ) : (
            <Badge tone="green" icon={<Check className="size-3" />}>
              Connected
            </Badge>
          )}
          <span className="text-[12px] text-muted">{timeAgo(r.respondedAt ?? r.createdAt)}</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-canvas px-3.5 py-2.5">
          <p className="text-[11.5px] font-semibold tracking-wide text-muted uppercase">{r.kind === "mutual" ? "How you matched" : iSent ? "Your ask" : `${name}'s ask`}</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{r.ask}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-3.5 py-2.5">
          <p className="text-[11.5px] font-semibold tracking-wide text-brand-700 uppercase">Meeting spot</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-[13.5px] text-ink-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
            {r.meetingSpot ?? "Agree on a public spot in the thread"}
          </p>
          {r.eventTitle ? <p className="mt-1 text-[12px] text-muted">{r.eventTitle}</p> : null}
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] font-medium text-ink-2">How did it go?</p>
          {rated ? (
            <div className="flex items-center gap-2">
              <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium", rated.tone)}>
                <rated.icon className="size-3.5" /> {rated.label}
              </span>
              <button onClick={() => setRating(undefined)} className="text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline">
                change
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {RATINGS.map((x) => (
                <button
                  key={x.id}
                  disabled={saving !== null}
                  onClick={() => rate(x.id)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
                >
                  <x.icon className="size-3.5" />
                  {x.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <button onClick={() => setOpen((o) => !o)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-brand-700 hover:text-brand-800">
          <MessageSquare className="size-4" />
          {open ? "Hide messages" : "Messages"}
          <ChevronDown className={cx("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Thread requestId={r.id} meId={meId} person={person} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </Card>
  );
}

function Thread({ requestId, meId, person }: { requestId: string; meId: string; person?: PublicProfile }) {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<{ messages: Message[] }>(`/api/requests/${requestId}`, { poll: 4000 });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await api<{ message: Message }>(`/api/requests/${requestId}`, { body: { action: "message", body } });
      setData((d) => ({ messages: [...(d?.messages ?? []), res.message] }));
      setText("");
    } catch (e) {
      toast({ tone: "error", title: "Couldn't send", body: (e as Error).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-line bg-canvas/60 p-3">
      {loading && !data ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="ml-auto h-8 w-1/2" />
        </div>
      ) : error && !data ? (
        <ErrorBox message={error} onRetry={() => void reload()} />
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {data?.messages.length ? (
            data.messages.map((m) =>
              m.fromId === "system" ? (
                <p key={m.id} className="text-center text-[11.5px] text-muted">
                  {m.body}
                </p>
              ) : (
                <div key={m.id} className={cx("flex", m.fromId === meId ? "justify-end" : "justify-start")}>
                  <div className={cx("max-w-[85%] rounded-2xl px-3 py-2 text-[13.5px] leading-relaxed", m.fromId === meId ? "brand-gradient text-white" : "border border-line bg-surface text-ink-2")}>
                    {m.fromId !== meId && person ? <p className="mb-0.5 text-[11px] font-semibold text-muted">{firstName(person.name)}</p> : null}
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className={cx("mt-0.5 text-[10.5px]", m.fromId === meId ? "text-white/70" : "text-faint")}>{timeAgo(m.createdAt)}</p>
                  </div>
                </div>
              ),
            )
          ) : (
            <p className="py-3 text-center text-[12.5px] text-muted">No messages yet — confirm the time and spot.</p>
          )}
        </div>
      )}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" maxLength={2000} aria-label="Message" />
        <Button type="submit" size="md" loading={sending} disabled={!text.trim()} icon={<Send className="size-4" />} aria-label="Send message">
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
}

function TeamCard({ t, onDone }: { t: TeamRow; onDone: () => void }) {
  const toast = useToast();
  const { me: session } = useSession();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const myRole = t.members.find((m) => m.userId === session?.id)?.roleId;
  const accepted = t.memberNames.filter((m) => m.status === "owner" || m.status === "accepted");
  const pending = t.memberNames.filter((m) => m.status === "invited").length;

  async function act(action: "accept" | "decline") {
    setBusy(action);
    try {
      await api(`/api/teams/${t.id}`, { body: { action } });
      toast({ tone: action === "accept" ? "success" : "info", title: action === "accept" ? `You joined ${t.title}` : "Invite declined", body: action === "accept" ? "Say hi in the team room." : "The role opens up again for the team." });
      onDone();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't update", body: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="card-hover flex flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/teams/${t.id}`} className="line-clamp-2 text-[15px] font-semibold text-ink hover:text-brand-700">
            {t.title}
          </Link>
          {t.pitch ? <p className="mt-1 line-clamp-2 text-[13px] text-muted">{t.pitch}</p> : null}
        </div>
        {t.status === "formed" ? <Badge tone="green">Formed</Badge> : <Badge tone="amber">Forming</Badge>}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PeopleStack people={t.memberNames.filter((m) => m.status !== "declined").map((m) => ({ name: m.name, hue: m.hue }))} />
          <span className="text-[12px] text-muted">
            {accepted.length} in{pending ? ` · ${pending} invited` : ""}
          </span>
        </div>
        <span className="text-[12px] text-muted tabular-nums">{Math.round(t.coverage * 100)}% coverage</span>
      </div>
      <div className="mt-4 flex flex-1 items-end justify-between gap-2 border-t border-line pt-3">
        <span className="text-[12.5px] text-ink-2">
          {t.myStatus === "owner" ? "You own this team" : t.myStatus === "invited" ? `Invited as ${myRole ? roleLabel(myRole) : "a teammate"}` : myRole ? `You're the ${roleLabel(myRole)}` : "Member"}
        </span>
        {t.myStatus === "invited" ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => act("decline")} loading={busy === "decline"} disabled={busy !== null}>
              Pass
            </Button>
            <Button size="sm" onClick={() => act("accept")} loading={busy === "accept"} disabled={busy !== null} icon={<Check className="size-3.5" />}>
              Join
            </Button>
          </div>
        ) : (
          <ButtonLink href={`/teams/${t.id}`} variant="soft" size="sm" icon={<ArrowRight className="size-3.5" />}>
            Team room
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card space-y-3 p-5">
          <div className="flex items-center gap-3">
            <div className="skeleton size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-14 w-full" />
        </div>
      ))}
    </div>
  );
}
