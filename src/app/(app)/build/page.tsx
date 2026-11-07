"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  Cpu,
  Info,
  Lock,
  LockOpen,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  TriangleAlert,
  UserMinus,
  Wand2,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { roleShort } from "@/components/people";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, cx, DemoTag, Input, PageHeader, Select, Textarea, Toggle } from "@/components/ui";
import { api, firstName, useApi } from "@/lib/client";
import { ROLES, ROLE_BY_ID } from "@/lib/ontology";
import type { Intent, PublicProfile, TeamResult } from "@/lib/types";
import type { EventRecommendation } from "@/lib/engine/events";

interface PlanResponse {
  intent: Intent;
  source: "claude" | "rules";
  aiMs: number;
  result: TeamResult;
  people: Record<string, PublicProfile>;
}

const EXAMPLES = [
  "I want to build an AI startup but need a developer and a designer.",
  "An AI-powered healthcare scheduling platform for nurses.",
  "A fintech app that helps first-gen students build an emergency fund.",
  "A computer-vision robot that sorts campus recycling.",
  "A secure blockchain voting app for student government.",
];

const STAGES = [
  { icon: BrainCircuit, label: "Understanding your idea" },
  { icon: Sparkles, label: "Decomposing it into roles" },
  { icon: Cpu, label: "Searching opted-in people" },
  { icon: Wand2, label: "Optimizing the team" },
];

export default function BuildPage() {
  return (
    <Suspense fallback={null}>
      <Builder />
    </Suspense>
  );
}

function Builder() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { me, ai } = useSession();
  const events = useApi<{ events: EventRecommendation[] }>("/api/events");

  const [pitch, setPitch] = useState(params.get("pitch") ?? "");
  const [eventId, setEventId] = useState<string>(params.get("event") ?? "");
  const [total, setTotal] = useState(4);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [phase, setPhase] = useState<"idle" | "thinking" | "done">("idle");
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [locked, setLocked] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [postGaps, setPostGaps] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [sending, setSending] = useState(false);
  const autoRan = useRef(false);

  // Default the event scope to an event I've opted into that is live/upcoming.
  useEffect(() => {
    if (eventId || !events.data) return;
    const mine = events.data.events.find((e) => e.optedIn) ?? events.data.events.find((e) => e.live);
    if (mine) setEventId(mine.event.id);
  }, [events.data, eventId]);

  const run = useCallback(
    async (opts: { intent?: Intent; locked?: string[]; excluded?: string[]; quiet?: boolean } = {}) => {
      if (pitch.trim().length < 8) {
        setErr("Describe your idea in a sentence.");
        return;
      }
      setErr(null);
      if (!opts.quiet) {
        setPhase("thinking");
        setStage(0);
      }
      const started = Date.now();
      const timer = opts.quiet ? null : setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 520);
      try {
        const res = await api<PlanResponse>("/api/teams/plan", {
          body: {
            pitch,
            eventId: eventId || undefined,
            size: total - 1,
            locked: opts.locked ?? locked,
            excluded: opts.excluded ?? excluded,
            intent: opts.intent,
          },
        });
        if (!opts.quiet) {
          const wait = Math.max(0, 2100 - (Date.now() - started)); // let the stages read
          await new Promise((r) => setTimeout(r, wait));
        }
        setPlan(res);
        setTitle((t) => t || res.intent.projectTitle || "");
        setPostGaps(res.result.missing.map((m) => m.roleId));
        setPhase("done");
      } catch (e) {
        setErr((e as Error).message);
        setPhase(plan ? "done" : "idle");
      } finally {
        if (timer) clearInterval(timer);
      }
    },
    [pitch, eventId, total, locked, excluded, plan],
  );

  useEffect(() => {
    if (autoRan.current || params.get("auto") !== "1" || !pitch || !me) return;
    autoRan.current = true;
    void run();
  }, [params, pitch, me, run]);

  const start = () => {
    setLocked([]);
    setExcluded([]);
    setTitle("");
    void run({ locked: [], excluded: [] });
  };

  const replan = (patch: { intent?: Intent; locked?: string[]; excluded?: string[] }) => {
    if (patch.locked) setLocked(patch.locked);
    if (patch.excluded) setExcluded(patch.excluded);
    void run({ intent: patch.intent ?? plan?.intent, locked: patch.locked, excluded: patch.excluded, quiet: true });
  };

  async function sendInvites() {
    if (!plan) return;
    setSending(true);
    try {
      const r = await api<{ team: { id: string } }>("/api/teams", {
        body: {
          title: title || plan.intent.projectTitle || "New project",
          pitch,
          eventId: eventId || undefined,
          roles: plan.intent.roles,
          members: plan.result.members.map((m) => ({ userId: m.userId, roleId: m.roleId })),
          coverage: plan.result.coverage,
          openRoles: postGaps,
        },
      });
      toast({ tone: "success", title: "Invites sent", body: "Each person decides for themselves. You'll see replies in the team room." });
      router.push(`/teams/${r.team.id}`);
    } catch (e) {
      toast({ tone: "error", title: "Couldn't create the team", body: (e as Error).message });
      setSending(false);
    }
  }

  const eventOptions = events.data?.events ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="AI Team Builder"
        title={
          <>
            What do you want to <span className="text-gradient">build</span>?
          </>
        }
        sub="Describe the idea. Connected works out the roles it needs, then finds the best complementary team among people who opted in, and shows you exactly why."
      />

      <Card className="p-4 sm:p-5">
        <Textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start();
          }}
          placeholder="e.g. An AI-powered healthcare scheduling platform — I'm a nursing student and need people who can build it."
          className="min-h-20 border-0 px-1 text-[16px] focus:ring-0 sm:min-h-24"
          maxLength={1200}
        />
        <div className="scrollbar-none -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {EXAMPLES.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setPitch(x)}
              className="shrink-0 rounded-full border border-dashed border-line-2 px-2.5 py-1 text-[12px] whitespace-nowrap text-muted hover:border-brand-200 hover:text-brand-700"
            >
              {x.length > 42 ? `${x.slice(0, 40)}…` : x}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-9 text-[13px] sm:w-auto sm:min-w-48" aria-label="Search people at">
              <option value="">Everyone on Connected</option>
              {eventOptions.map((e) => (
                <option key={e.event.id} value={e.event.id}>
                  {e.optedIn ? "● " : ""}
                  {e.event.title}
                </option>
              ))}
            </Select>
            <Select value={total} onChange={(e) => setTotal(Number(e.target.value))} className="h-9 text-[13px] sm:w-auto" aria-label="Team size">
              <option value={2}>Team of 2</option>
              <option value={3}>Team of 3</option>
              <option value={4}>Team of 4</option>
              <option value={5}>Team of 5</option>
            </Select>
            <span className="hidden text-[12px] text-muted lg:inline">{ai ? "Claude + optimizer" : "Rules engine + optimizer"}</span>
          </div>
          <Button size="lg" onClick={start} loading={phase === "thinking"} icon={<Wand2 className="size-4" />} className="w-full sm:w-auto">
            Assemble my team
          </Button>
        </div>
        {err ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p> : null}
      </Card>

      <AnimatePresence mode="wait">
        {phase === "thinking" ? <Thinking key="thinking" stage={stage} /> : null}
        {phase === "done" && plan && me ? (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-5">
            <Interpretation plan={plan} onChangeRoles={(roles) => replan({ intent: { ...plan.intent, roles } })} />
            <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
              <div className="space-y-5">
                <TeamCard
                  plan={plan}
                  meId={me.id}
                  meName={me.name}
                  meHue={me.avatarHue}
                  locked={locked}
                  onLock={(id) => replan({ locked: locked.includes(id) ? locked.filter((x) => x !== id) : [...locked, id] })}
                  onRemove={(id) => replan({ excluded: [...excluded, id], locked: locked.filter((x) => x !== id) })}
                  onSwap={(fromId, toId) => {
                    const keep = plan.result.members.map((m) => m.userId).filter((u) => u !== fromId);
                    replan({ locked: [...keep, toId], excluded: [...excluded, fromId] });
                  }}
                />
                <Card className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-ink-2">Project name</label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your project" maxLength={90} />
                    </div>
                    <Button size="lg" onClick={sendInvites} loading={sending} disabled={!plan.result.members.length} icon={<Send className="size-4" />}>
                      Invite {plan.result.members.length} {plan.result.members.length === 1 ? "person" : "people"}
                    </Button>
                  </div>
                  <p className="mt-3 text-[12px] text-muted">
                    Each person gets an invite with your pitch and their suggested role. They decide for themselves, and nothing else about you is shared.
                    {excluded.length ? (
                      <button className="ml-1 font-medium text-brand-700 hover:underline" onClick={() => replan({ excluded: [] })}>
                        Reset {excluded.length} removed
                      </button>
                    ) : null}
                  </p>
                </Card>
              </div>
              <div className="space-y-5">
                <CoveragePanel plan={plan} meId={me.id} postGaps={postGaps} setPostGaps={setPostGaps} />
                <OptimizerStats plan={plan} />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Thinking({ stage }: { stage: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
      <Card className="overflow-hidden p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {STAGES.map((s, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <div key={s.label} className={cx("flex items-center gap-3 rounded-2xl border p-3 transition-colors", active ? "border-brand-200 bg-brand-50/60" : done ? "border-line bg-surface" : "border-line/60 bg-canvas/40")}>
                <span className={cx("flex size-9 items-center justify-center rounded-xl", done ? "bg-emerald-50 text-emerald-600" : active ? "brand-gradient text-white" : "bg-canvas text-faint")}>
                  {done ? <Check className="size-4" /> : <s.icon className={cx("size-4", active && "animate-pulse")} />}
                </span>
                <span className={cx("text-[13px] font-medium", active ? "text-brand-700" : done ? "text-ink" : "text-faint")}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-canvas">
          <motion.div className="brand-gradient h-full" initial={{ width: "4%" }} animate={{ width: `${((stage + 1) / STAGES.length) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
      </Card>
    </motion.div>
  );
}

function Interpretation({ plan, onChangeRoles }: { plan: PlanResponse; onChangeRoles: (roles: Intent["roles"]) => void }) {
  const [adding, setAdding] = useState(false);
  const roles = plan.intent.roles;
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={plan.source === "claude" ? "violet" : "neutral"} icon={plan.source === "claude" ? <Sparkles className="size-3" /> : <Cpu className="size-3" />}>
              {plan.source === "claude" ? `Understood by Claude · ${(plan.aiMs / 1000).toFixed(1)}s` : "Understood by the rules engine"}
            </Badge>
            {plan.intent.projectTitle ? <span className="text-[13px] text-muted">Project:</span> : null}
            {plan.intent.projectTitle ? <span className="text-[14px] font-semibold text-ink">{plan.intent.projectTitle}</span> : null}
          </div>
          <p className="mt-2 text-[14px] text-ink-2">{plan.intent.summary}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-[12px] font-semibold tracking-wide text-faint uppercase">Roles this project needs</p>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <span key={r.roleId} title={r.why} className={cx("group inline-flex items-center gap-1.5 rounded-full border py-1 pr-1.5 pl-3 text-[13px] font-medium", r.weight >= 1.1 ? "border-brand-200 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-2")}>
              {ROLE_BY_ID[r.roleId]?.label ?? r.roleId}
              {r.weight >= 1.1 ? <span className="text-[10.5px] font-semibold text-brand-500">asked</span> : r.weight < 0.7 ? <span className="text-[10.5px] text-faint">nice-to-have</span> : null}
              <button aria-label={`Remove ${r.roleId}`} onClick={() => onChangeRoles(roles.filter((x) => x.roleId !== r.roleId))} className="rounded-full p-0.5 text-faint hover:bg-white hover:text-ink">
                <X className="size-3" />
              </button>
            </span>
          ))}
          {adding ? (
            <Select
              autoFocus
              className="h-8 w-auto text-[13px]"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) onChangeRoles([...roles, { roleId: id, weight: 1, why: "You added this role." }]);
                setAdding(false);
              }}
              onBlur={() => setAdding(false)}
            >
              <option value="" disabled>
                Add a role…
              </option>
              {ROLES.filter((r) => !roles.some((x) => x.roleId === r.id)).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          ) : (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-2 px-3 py-1 text-[13px] text-muted hover:border-brand-200 hover:text-brand-700">
              <Plus className="size-3.5" /> Add role
            </button>
          )}
        </div>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {roles.slice(0, 6).map((r) => (
            <li key={r.roleId} className="text-[12.5px] text-muted">
              <span className="font-medium text-ink-2">{roleShort(r.roleId)}:</span> {r.why}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function TeamCard({
  plan,
  meId,
  meName,
  meHue,
  locked,
  onLock,
  onRemove,
  onSwap,
}: {
  plan: PlanResponse;
  meId: string;
  meName: string;
  meHue: number;
  locked: string[];
  onLock: (id: string) => void;
  onRemove: (id: string) => void;
  onSwap: (fromId: string, toId: string) => void;
}) {
  const ownerRoles = plan.result.slots.filter((s) => s.coveredBy === meId && !s.gap);
  return (
    <Card className="overflow-hidden">
      <div className="brand-gradient relative overflow-hidden px-5 py-4 text-white">
        <div className="pointer-events-none absolute -top-10 -right-6 size-32 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-white/75">Recommended team</p>
            <p className="text-[18px] font-semibold">
              {plan.result.members.length + 1} people · {plan.result.slots.filter((s) => !s.gap).length}/{plan.result.slots.length} roles covered
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[30px] leading-none font-semibold tabular-nums">{Math.round(plan.result.coverage * 100)}%</p>
            <p className="text-[11px] text-white/75">role coverage</p>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {plan.result.slots.map((s) => (
            <span key={s.roleId} className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", s.gap ? "bg-amber-300/25 text-amber-50" : "bg-white/15 text-white")}>
              {s.gap ? "⚠ " : "✓ "}
              {roleShort(s.roleId)}
            </span>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line">
        <li className="flex items-center gap-3 px-5 py-3.5">
          <Avatar name={meName} hue={meHue} size={42} />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-ink">You</p>
            <p className="text-[12.5px] text-muted">{ownerRoles.length ? `Covering ${ownerRoles.map((s) => roleShort(s.roleId)).join(" & ")}` : "Project owner"}</p>
          </div>
          <Badge tone="neutral">Owner</Badge>
        </li>
        <AnimatePresence initial={false}>
          {plan.result.members.map((m, i) => {
            const p = plan.people[m.userId];
            if (!p) return null;
            const slot = plan.result.slots.find((s) => s.roleId === m.roleId);
            const isLocked = locked.includes(m.userId);
            return (
              <motion.li key={m.userId} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ delay: i * 0.08 }} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <Avatar name={p.name} hue={p.avatarHue} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a href={`/people/${p.id}`} className="text-[14.5px] font-semibold text-ink hover:text-brand-700">
                        {p.name}
                      </a>
                      {p.isDemo ? <DemoTag /> : null}
                      <Badge tone="brand">{ROLE_BY_ID[m.roleId]?.label ?? m.roleId}</Badge>
                    </div>
                    <p className="truncate text-[12.5px] text-muted">{p.headline}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
                        <motion.div className="brand-gradient h-full" initial={{ width: 0 }} animate={{ width: `${m.coverage * 100}%` }} transition={{ duration: 0.6, delay: 0.1 + i * 0.08 }} />
                      </div>
                      <span className="w-16 text-right text-[11.5px] text-muted tabular-nums">{Math.round(m.coverage * 100)}% fit</span>
                    </div>
                    {m.reasons.length ? (
                      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {m.reasons.map((r) => (
                          <li key={r} className="flex items-center gap-1 text-[12px] text-ink-2">
                            <Check className="size-3 text-emerald-500" /> {r}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-[54px]">
                  <SwapMenu alternatives={slot?.alternatives ?? []} people={plan.people} onPick={(toId) => onSwap(m.userId, toId)} />
                  <Button size="sm" variant="ghost" onClick={() => onLock(m.userId)} icon={isLocked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />} title="Keep this person while re-optimizing the rest">
                    {isLocked ? "Locked" : "Lock"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onRemove(m.userId)} icon={<UserMinus className="size-3.5" />}>
                    Remove
                  </Button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {plan.result.members.length === 0 ? <li className="px-5 py-6 text-center text-sm text-muted">Nobody in this pool adds coverage. Try a wider event scope or different roles.</li> : null}
      </ul>
    </Card>
  );
}

function SwapMenu({ alternatives, people, onPick }: { alternatives: { userId: string; coverage: number }[]; people: Record<string, PublicProfile>; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  if (!alternatives.length) return null;
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)} icon={<RefreshCw className="size-3.5" />}>
        Swap <ChevronDown className="size-3" />
      </Button>
      <AnimatePresence>
        {open ? (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute left-0 z-20 mt-1.5 w-72 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]">
            <p className="px-2.5 py-1.5 text-[11.5px] font-semibold text-faint uppercase">Alternatives for this role</p>
            {alternatives.map((a) => {
              const p = people[a.userId];
              if (!p) return null;
              return (
                <button
                  key={a.userId}
                  onClick={() => {
                    setOpen(false);
                    onPick(a.userId);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-canvas"
                >
                  <Avatar name={p.name} hue={p.avatarHue} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{p.name}</span>
                    <span className="block truncate text-[11.5px] text-muted">{p.headline}</span>
                  </span>
                  <span className="text-[11.5px] text-muted tabular-nums">{Math.round(a.coverage * 100)}%</span>
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CoveragePanel({ plan, meId, postGaps, setPostGaps }: { plan: PlanResponse; meId: string; postGaps: string[]; setPostGaps: (v: string[]) => void }) {
  return (
    <Card className="p-5">
      <p className="text-[15px] font-semibold text-ink">Role coverage</p>
      <p className="mt-0.5 text-[12.5px] text-muted">How well the team covers each role, as the best single person's fit.</p>
      <ul className="mt-4 space-y-3">
        {plan.result.slots.map((s) => {
          const who = s.coveredBy === meId ? "You" : s.coveredBy ? firstName(plan.people[s.coveredBy]?.name ?? "") : "—";
          return (
            <li key={s.roleId}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 font-medium text-ink-2">
                  {s.gap ? <TriangleAlert className="size-3.5 text-amber-500" /> : <Check className="size-3.5 text-emerald-500" />}
                  {s.label}
                </span>
                <span className="text-[12px] text-muted">
                  {s.gap ? "gap" : who} · <span className="tabular-nums">{Math.round(s.coverage * 100)}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                <motion.div className={cx("h-full rounded-full", s.gap ? "bg-amber-400" : "brand-gradient")} initial={{ width: 0 }} animate={{ width: `${s.coverage * 100}%` }} transition={{ duration: 0.6 }} />
              </div>
            </li>
          );
        })}
      </ul>
      {plan.result.missing.length ? (
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-900">
            <Megaphone className="size-4" /> Missing pieces
          </p>
          <ul className="mt-2 space-y-2.5">
            {plan.result.missing.map((m) => (
              <li key={m.roleId}>
                <Toggle
                  checked={postGaps.includes(m.roleId)}
                  onChange={(v) => setPostGaps(v ? [...postGaps, m.roleId] : postGaps.filter((x) => x !== m.roleId))}
                  label={`Post “${m.label}” as an open role`}
                  sub={m.suggestion}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-800">
          <Check className="size-4" /> Every role is covered.
        </p>
      )}
    </Card>
  );
}

function OptimizerStats({ plan }: { plan: PlanResponse }) {
  const [open, setOpen] = useState(false);
  const r = plan.result;
  const stats = useMemo(
    () => [
      { k: "Method", v: r.method === "exact" ? "Exact search" : "Greedy + local search" },
      { k: "Teams evaluated", v: r.combinationsEvaluated.toLocaleString() },
      { k: "People considered", v: String(r.poolSize) },
      { k: "Solve time", v: `${r.ms} ms` },
      { k: "Role coverage", v: `${Math.round(r.coverage * 100)}%` },
      { k: "Team cohesion", v: `${Math.round(r.cohesion * 100)}%` },
    ],
    [r],
  );
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
          <Cpu className="size-4 text-brand-600" /> Under the hood
        </p>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-700">
          <Info className="size-3.5" /> {open ? "Hide" : "How it works"}
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.k} className="rounded-xl bg-canvas px-3 py-2">
            <dt className="text-[11px] text-muted">{s.k}</dt>
            <dd className="text-[14px] font-semibold text-ink tabular-nums">{s.v}</dd>
          </div>
        ))}
      </dl>
      <AnimatePresence>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 space-y-2 text-[12.5px] leading-relaxed text-ink-2">
              <p>
                <b>Objective.</b> Maximize weighted role coverage (each role is scored by the best teammate's noisy-OR fit over its skills), plus team cohesion (shared interests, compatible goals, same event), plus each person&apos;s reciprocity, minus a small cost per extra person so the team isn&apos;t padded.
              </p>
              <p>
                <b>Search.</b> If there are at most 60k possible teams, Connected checks every one and returns the exact best. Above that it uses multi-start greedy plus swap/add/drop local search. In our benchmark of 96 scenarios, that found the exact optimum in 95 of them and was always within 0.5% of it.
              </p>
              <p className="text-muted">
                Coverage alone is submodular, so greedy has a (1−1/e) guarantee (Nemhauser et al., 1978). Team formation with team-fit costs is NP-hard (Lappas et al., KDD 2009), which is why we verify against brute force.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <a href="/discover" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-700 hover:underline">
        Prefer to browse individuals? Discover <ArrowRight className="size-3.5" />
      </a>
    </Card>
  );
}
