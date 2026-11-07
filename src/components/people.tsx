"use client";

import { motion } from "motion/react";
import {
  ArrowUpRight,
  CalendarCheck2,
  Check,
  Clock,
  EyeOff,
  HandHeart,
  Handshake,
  MapPin,
  MapPinCheck,
  Repeat2,
  Send,
  Sparkles,
  Target,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api, firstName, fmtTime } from "@/lib/client";
import { play } from "@/lib/sfx";
import type { MatchResult, PublicProfile, ReasonKind, ScoreBreakdown } from "@/lib/types";
import { useToast } from "./toast";
import { Avatar, Badge, Button, cx, DemoTag, Field, Modal, ScoreRing, Spinner, Textarea } from "./ui";

export type RequestState = "none" | "pending-out" | "pending-in" | "connected" | "declined";
export type MatchWithState = MatchResult & { requestState?: RequestState; zone?: string | null };

export const REASON_ICON: Record<ReasonKind, React.ComponentType<{ className?: string }>> = {
  skills: Zap,
  interests: Sparkles,
  goals: Target,
  willing: HandHeart,
  event: CalendarCheck2,
  availability: Clock,
  mutual: Repeat2,
  intro: Handshake,
};

export const FACTOR_LABEL: { key: keyof ScoreBreakdown; label: string; max: number }[] = [
  { key: "skills", label: "Complementary skills", max: 24 },
  { key: "interests", label: "Shared interests", max: 16 },
  { key: "goals", label: "Compatible goals", max: 16 },
  { key: "willing", label: "Offered to help", max: 8 },
  { key: "event", label: "Same event", max: 12 },
  { key: "availability", label: "Available now", max: 4 },
  { key: "mutual", label: "Mutual fit (you fit them)", max: 20 },
];

export function Breakdown({ breakdown, score }: { breakdown: ScoreBreakdown; score: number }) {
  return (
    <div className="space-y-2.5">
      {FACTOR_LABEL.map((f) => {
        const v = breakdown[f.key];
        return (
          <div key={f.key}>
            <div className="mb-1 flex justify-between text-[12.5px]">
              <span className="text-ink-2">{f.label}</span>
              <span className="font-medium text-ink tabular-nums">
                {v.toFixed(0)}
                <span className="text-faint"> / {f.max}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
              <motion.div
                className="brand-gradient h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(v / f.max) * 100}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-[11.5px] leading-relaxed text-muted">
        Total {score}/100 — an algorithmic compatibility estimate from profile data, not a prediction of success. 80% is how they fit you, 20% is how you fit them.
      </p>
    </div>
  );
}

export function ReasonList({ reasons, max = 3, className }: { reasons: MatchResult["reasons"]; max?: number; className?: string }) {
  return (
    <ul className={cx("space-y-1.5", className)}>
      {reasons.slice(0, max).map((r, i) => {
        const Icon = REASON_ICON[r.kind];
        return (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-2">
            <Icon className="mt-0.5 size-3.5 shrink-0 text-brand-500" />
            <span>{r.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function LiveBadge({ live }: { live: NonNullable<MatchResult["liveNow"]> }) {
  if (live.mode === "heads-down") return <Badge tone="neutral">Heads-down</Badge>;
  const label = live.mode === "quick-chat" ? "Open to chat" : live.mode === "mentoring" ? "Mentoring" : "Teaming up";
  return (
    <Badge tone="green" icon={<span className="size-1.5 rounded-full bg-emerald-500" />}>
      {label} · until {fmtTime(live.until)}
    </Badge>
  );
}

export function PersonHeader({ p, size = 44, live, sub }: { p: PublicProfile; size?: number; live?: boolean; sub?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={p.name} hue={p.avatarHue} size={size} live={live} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Link href={`/people/${p.id}`} className="truncate text-[15px] font-semibold text-ink hover:text-brand-700">
            {p.name}
          </Link>
          {p.isDemo ? <DemoTag /> : null}
        </div>
        <p className="truncate text-[13px] text-muted">{sub ?? p.headline}</p>
      </div>
    </div>
  );
}

export function MatchCard({
  match,
  eventId,
  missionId,
  onChanged,
  rank,
}: {
  match: MatchWithState;
  eventId?: string;
  missionId?: string;
  onChanged?: () => void;
  rank?: number;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const p = match.profile;
  const live = match.liveNow && match.liveNow.mode !== "heads-down" ? match.liveNow : undefined;
  const extra = Math.max(0, match.reasons.length - 2);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(0.4, (rank ?? 0) * 0.05) }}
      className="card card-hover group relative flex flex-col overflow-hidden p-4"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, hsl(${p.avatarHue} 70% 60%), #7a5af8)` }}
      />
      <div className="flex items-start justify-between gap-3">
        <PersonHeader p={p} live={Boolean(live)} />
        <ScoreRing score={match.score} size={46} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {match.bestRole && match.bestRole.coverage >= 0.5 ? <Badge tone="brand">Fills: {roleShort(match.bestRole.roleId)}</Badge> : null}
        {match.hereNow ? (
          <Badge tone="green" icon={<MapPinCheck className="size-3" />}>
            Here now
          </Badge>
        ) : null}
        {match.liveNow ? <LiveBadge live={match.liveNow} /> : null}
        {match.backward >= 0.6 ? (
          <Badge tone="violet" icon={<Repeat2 className="size-3" />}>
            Mutual fit
          </Badge>
        ) : null}
      </div>
      <div className="mt-3 flex-1">
        <ReasonList reasons={match.reasons} max={expanded ? 10 : 2} />
        {extra ? (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1.5 text-[12px] font-medium text-brand-600 hover:text-brand-700">
            {expanded ? "Show less" : `+${extra} more`}
          </button>
        ) : null}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="truncate text-[12px] text-muted">{match.nextStep}</span>
        <div className="flex shrink-0 gap-1.5">
          <Link href={`/people/${p.id}`} className="focus-ring inline-flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium text-ink-2 hover:bg-canvas">
            Profile
          </Link>
          <ConnectButton person={p} state={match.requestState} onOpen={() => setOpen(true)} />
        </div>
      </div>
      <ConnectDialog
        open={open}
        onClose={() => setOpen(false)}
        person={p}
        eventId={eventId}
        missionId={missionId}
        reasons={match.reasons.map((r) => r.text)}
        onSent={() => {
          setOpen(false);
          onChanged?.();
        }}
      />
    </motion.div>
  );
}

export function ConnectButton({ person, state, onOpen, size = "sm" }: { person: PublicProfile; state?: RequestState; onOpen: () => void; size?: "sm" | "md" }) {
  if (state === "connected")
    return (
      <Badge tone="green" icon={<Check className="size-3" />} className="h-8 px-2.5">
        Connected
      </Badge>
    );
  if (state === "pending-out") return <Badge className="h-8 px-2.5">Request sent</Badge>;
  if (state === "pending-in")
    return (
      <Link href="/connections" className="focus-ring inline-flex h-8 items-center rounded-lg bg-brand-50 px-3 text-[13px] font-medium text-brand-700">
        Respond
      </Link>
    );
  if (!person.canRequest) return <Badge>Not taking requests</Badge>;
  return (
    <Button size={size} onClick={onOpen} icon={<Send className="size-3.5" />}>
      Connect
    </Button>
  );
}

const ROLE_SHORT: Record<string, string> = {
  "frontend-engineer": "Frontend",
  "backend-engineer": "Backend",
  "mobile-engineer": "Mobile",
  "ml-engineer": "AI/ML",
  "data-scientist": "Data",
  designer: "Design",
  "product-lead": "Product",
  "business-lead": "Business",
  "growth-lead": "Growth",
  "hardware-engineer": "Hardware",
  "security-engineer": "Security",
  "health-expert": "Health",
  "finance-expert": "Finance",
  "education-expert": "Education",
  "climate-expert": "Climate",
  researcher: "Research",
};
export const roleShort = (id: string) => ROLE_SHORT[id] ?? id;

interface IntroResponse {
  intro: string;
  icebreakers: string[];
  source: "claude" | "rules";
}

/**
 * Compose a request: a required specific ask, an optional AI-drafted message the user edits,
 * and icebreakers. Nothing is sent without the user pressing Send.
 */
export function ConnectDialog({
  open,
  onClose,
  person,
  eventId,
  missionId,
  reasons,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  person: PublicProfile;
  eventId?: string;
  missionId?: string;
  reasons?: string[];
  onSent?: () => void;
}) {
  const toast = useToast();
  const [ask, setAsk] = useState("");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<IntroResponse | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const name = firstName(person.name);

  async function makeDraft() {
    setDrafting(true);
    setErr(null);
    try {
      const d = await api<IntroResponse>("/api/intro", { body: { toId: person.id, ask, eventId } });
      setDraft(d);
      setMessage(d.intro);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  async function send() {
    setSending(true);
    setErr(null);
    try {
      await api("/api/requests", { body: { toId: person.id, ask, message: message || ask, eventId, missionId } });
      play("send");
      toast({ tone: "success", title: `Request sent to ${name}`, body: "You'll get a notification when they reply." });
      setAsk("");
      setMessage("");
      setDraft(null);
      onSent?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const askOk = ask.trim().length >= 12;

  return (
    <Modal open={open} onClose={onClose} title={`Connect with ${name}`} wide>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-canvas p-3">
          <PersonHeader p={person} size={38} />
          {person.isDemo ? <span className="text-[11.5px] text-muted">Demo profile</span> : null}
        </div>
        {reasons?.length ? (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
            <p className="mb-1.5 text-[12px] font-semibold text-brand-700">Why {name}</p>
            <ul className="space-y-1 text-[13px] text-ink-2">
              {reasons.slice(0, 2).map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {person.gives.length ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
            <HandHeart className="size-3.5 text-brand-500" /> Ask about:
            {person.gives.map((g) => (
              <button key={g} type="button" onClick={() => setAsk((a) => a || `Could you help me with ${g.charAt(0).toLowerCase()}${g.slice(1)}?`)} className="rounded-full border border-line bg-surface px-2 py-0.5 text-ink-2 hover:border-brand-200 hover:text-brand-700">
                {g}
              </button>
            ))}
          </div>
        ) : null}
        <Field label="Your ask" hint="Be specific — one sentence." error={ask && !askOk ? "A little more detail, please." : null}>
          <Textarea value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Want to design our AI fintech app this weekend?" className="min-h-20" maxLength={400} />
        </Field>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted">Optional AI draft</span>
          <Button variant="soft" size="sm" onClick={makeDraft} loading={drafting} icon={<Wand2 className="size-3.5" />}>
            {draft ? "Redraft" : "Draft intro"}
          </Button>
        </div>
        {draft ? (
          <div className="space-y-3">
            <Field label="Message" hint={draft.source === "claude" ? "Drafted by Claude · edit freely" : "Template draft · edit freely"}>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-28" maxLength={1200} />
            </Field>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-ink-2">Icebreakers</p>
              <ul className="space-y-1">
                {draft.icebreakers.map((q) => (
                  <li key={q} className="rounded-xl bg-canvas px-3 py-2 text-[13px] text-ink-2">
                    “{q}”
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {err ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{err}</p> : null}
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-muted">Nothing sends until you press Send.</p>
          <Button onClick={send} loading={sending} disabled={!askOk} icon={<Send className="size-4" />}>
            Send request
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Double opt-in: the other person only finds out if they also want to meet you. */
export function QuietInterestButton({ personId, name, sent: initial, onMutual }: { personId: string; name: string; sent?: boolean; onMutual?: () => void }) {
  const toast = useToast();
  const [sent, setSent] = useState(Boolean(initial));
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    try {
      const r = await api<{ mutual: boolean }>("/api/interest", { body: { toId: personId } });
      setSent(true);
      if (r.mutual) {
        play("match");
        toast({ tone: "success", title: `It's mutual with ${firstName(name)}! 🎉`, body: "You both wanted to meet — you're now connected." });
        onMutual?.();
      } else toast({ tone: "info", title: "Quiet interest saved", body: `${firstName(name)} won't be told unless they also want to meet you.` });
    } catch (e) {
      toast({ tone: "error", title: "Couldn't save", body: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button variant="secondary" size="sm" onClick={go} loading={loading} disabled={sent} icon={sent ? <Check className="size-3.5" /> : <EyeOff className="size-3.5" />} title="Double opt-in: they're only told if they also want to meet you">
      {sent ? "Interest saved" : "Quiet interest"}
    </Button>
  );
}

/** Cover banner in Connected purple with soft "map contour" rings — each person's hue tints the glow. */
export function ProfileCover({ hue = 250, className }: { hue?: number; className?: string }) {
  const cx0 = 70 + (hue % 25);
  return (
    <div
      className={cx("relative h-28 overflow-hidden sm:h-36", className)}
      style={{
        background: `radial-gradient(90% 120% at ${cx0}% 10%, hsl(${hue} 85% 72% / 0.55), transparent 60%), linear-gradient(135deg, #6d28d9 0%, #7c3aed 40%, #a78bfa 100%)`,
      }}
    >
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[30, 60, 90, 120, 150, 180, 210].map((r, i) => (
          <circle key={r} cx={cx0 * 4} cy={30} r={r} fill="none" stroke="white" strokeOpacity={0.22 - i * 0.025} strokeWidth="1" />
        ))}
        <circle cx={cx0 * 4} cy={30} r="5" fill="white" fillOpacity="0.9" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent" />
    </div>
  );
}

export function ZonePill({ zone }: { zone?: string | null }) {
  if (!zone) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <MapPin className="size-3" /> {zone}
    </span>
  );
}

export function PeopleStack({ people, max = 4, size = 26 }: { people: { name: string; hue: number }[]; max?: number; size?: number }) {
  return (
    <div className="flex -space-x-2">
      {people.slice(0, max).map((p, i) => (
        <Avatar key={i} name={p.name} hue={p.hue} size={size} />
      ))}
      {people.length > max ? (
        <span className="inline-flex items-center justify-center rounded-full bg-canvas text-[11px] font-medium text-muted ring-2 ring-white" style={{ width: size, height: size }}>
          +{people.length - max}
        </span>
      ) : null}
    </div>
  );
}

export function LoadingCards({ n = 3 }: { n?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="skeleton size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-1/2" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          </div>
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export { ArrowUpRight, Spinner, Users };
