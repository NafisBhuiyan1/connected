"use client";

import { AnimatePresence, motion } from "motion/react";
import { Archive, Check, CheckCircle2, Circle, Flag, Plus, Search, Sparkles, Target, Wand2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Badge, Button, ButtonLink, Card, cx, Empty, ErrorBox, Field, PageHeader, Progress, Select, Skeleton, Textarea } from "@/components/ui";
import { api, timeAgo, useApi } from "@/lib/client";
import { MISSION_TEMPLATES, roleLabel } from "@/lib/ontology";
import type { Mission, MissionKind } from "@/lib/types";

interface MissionStep {
  id: string;
  label: string;
  value: number;
  target: number;
}
interface MissionTargetProgress {
  roleId: string;
  label: string;
  count: number;
  found: number;
  connected: number;
}
interface MissionItem {
  mission: Mission;
  steps: MissionStep[];
  progress: number;
  targets: MissionTargetProgress[];
  done: boolean;
}
interface EventOption {
  event: { id: string; title: string };
  joined: boolean;
}

const KIND_LABEL: Record<MissionKind, string> = {
  cofounder: "Cofounder",
  "hackathon-team": "Hackathon team",
  mentor: "Mentor",
  internship: "Internship",
  "meet-professionals": "Professionals",
  collaborators: "Collaborators",
  custom: "Custom",
};

export default function MissionsPage() {
  const missions = useApi<{ missions: MissionItem[] }>("/api/missions");
  const [composing, setComposing] = useState(false);
  const list = missions.data?.missions ?? [];
  const active = list.filter((m) => m.mission.status === "active");
  const completed = list.filter((m) => m.mission.status === "completed");

  return (
    <div>
      <PageHeader
        eyebrow="Missions"
        title="Networking with a purpose"
        sub="Set a goal and Connected measures real progress — people discovered, asks sent, conversations that helped, teams formed. Not connection counts."
        action={
          <Button onClick={() => setComposing((c) => !c)} icon={<Plus className="size-4" />}>
            New mission
          </Button>
        }
      />

      <AnimatePresence initial={false}>
        {composing || (!missions.loading && list.length === 0) ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Composer
              onCreated={() => {
                setComposing(false);
                void missions.reload();
              }}
              onCancel={list.length ? () => setComposing(false) : undefined}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {missions.error ? <ErrorBox message={missions.error} onRetry={missions.reload} /> : null}

      {missions.loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="space-y-4 p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
      ) : null}

      {!missions.loading && list.length === 0 && !missions.error ? (
        <div className="mt-6">
          <Empty
            icon={<Flag className="size-5" />}
            title="No missions yet"
            body="Pick a template above or describe your own goal — e.g. “Find a designer and a backend engineer for my fintech idea.”"
          />
        </div>
      ) : null}

      {active.length ? (
        <section className="mt-2">
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((m, i) => (
              <MissionCard key={m.mission.id} item={m} index={i} onChanged={missions.reload} />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length ? (
        <section className="mt-10">
          <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-ink">Completed</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {completed.map((m, i) => (
              <MissionCard key={m.mission.id} item={m} index={i} onChanged={missions.reload} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Composer({ onCreated, onCancel }: { onCreated: () => void; onCancel?: () => void }) {
  const toast = useToast();
  const events = useApi<{ events: EventOption[] }>("/api/events");
  const [kind, setKind] = useState<MissionKind | undefined>();
  const [title, setTitle] = useState<string | undefined>();
  const [goal, setGoal] = useState("");
  const [eventId, setEventId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pick(t: (typeof MISSION_TEMPLATES)[number]) {
    if (kind === t.kind) {
      setKind(undefined);
      setTitle(undefined);
      return;
    }
    setKind(t.kind);
    setTitle(t.title);
    setGoal(t.goal);
  }

  async function create() {
    setSaving(true);
    setErr(null);
    try {
      const r = await api<{ mission: Mission; source: "claude" | "rules" }>("/api/missions", {
        body: { goal, kind, title: title || undefined, eventId: eventId || undefined },
      });
      toast({
        tone: "success",
        title: `Mission started: ${r.mission.title}`,
        body: r.source === "claude" ? "Claude turned your goal into target roles." : "Interpreted with the rules engine (no AI key set).",
      });
      setGoal("");
      setKind(undefined);
      setTitle(undefined);
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="brand-gradient-soft mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Target className="size-4" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">Start a mission</p>
          <p className="text-[13px] text-muted">Start from a template or write your own goal. Connected works out which roles count as progress.</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {MISSION_TEMPLATES.map((t) => {
          const on = kind === t.kind;
          return (
            <button
              key={t.kind}
              type="button"
              onClick={() => pick(t)}
              aria-pressed={on}
              className={cx(
                "focus-ring cursor-pointer rounded-2xl border p-3 text-left transition-all",
                on ? "border-brand-300 bg-brand-50 shadow-[var(--shadow-lift)]" : "border-line bg-surface hover:border-line-2",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={cx("text-[13.5px] font-semibold", on ? "text-brand-700" : "text-ink")}>{t.title}</p>
                {on ? <Check className="size-4 shrink-0 text-brand-600" /> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-[12px] text-muted">{t.goal}</p>
              <p className="mt-2 text-[11px] text-faint">{t.targets.map((x) => roleLabel(x.roleId)).join(" · ")}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label="Your goal" hint="Be concrete. Claude (or the rules engine) turns this into target roles.">
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Find a designer and a backend engineer for my AI budgeting app at CrownHacks"
            className="min-h-20"
            maxLength={400}
          />
        </Field>
        <Field label="Scope to an event (optional)" hint="Progress only counts people opted in there.">
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Anywhere</option>
            {(events.data?.events ?? []).map((e) => (
              <option key={e.event.id} value={e.event.id}>
                {e.event.title}
                {e.joined ? " (joined)" : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {err ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{err}</p> : null}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button onClick={create} loading={saving} disabled={goal.trim().length < 6} icon={<Sparkles className="size-4" />}>
          Start mission
        </Button>
      </div>
    </Card>
  );
}

function ProgressRing({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="mission-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5145e0" />
            <stop offset="1" stopColor="#9b6bff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eceef5" strokeWidth={6} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={value >= 100 ? "#10b981" : "url(#mission-ring)"}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }}
          transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      <span className="absolute text-[15px] font-semibold text-ink tabular-nums">{value}%</span>
    </div>
  );
}

function MissionCard({ item, index, onChanged }: { item: MissionItem; index: number; onChanged: () => void }) {
  const toast = useToast();
  const { mission: m, steps, progress, targets } = item;
  const [busy, setBusy] = useState<"completed" | "archived" | "active" | null>(null);
  const isDone = m.status === "completed";

  async function setStatus(status: "completed" | "archived" | "active") {
    setBusy(status);
    try {
      await api(`/api/missions/${m.id}`, { body: { status } });
      toast({
        tone: "success",
        title: status === "completed" ? "Mission complete 🎉" : status === "archived" ? "Mission archived" : "Mission reopened",
      });
      onChanged();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't update mission", body: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const q = encodeURIComponent(m.goal);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(0.3, index * 0.06) }}>
      <Card className={cx("flex h-full flex-col p-5", isDone && "opacity-90")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={isDone ? "green" : "brand"}>{KIND_LABEL[m.kind]}</Badge>
              {item.done && !isDone ? <Badge tone="green">All steps done</Badge> : null}
              <span className="text-[11.5px] text-faint">Started {timeAgo(m.createdAt)}</span>
            </div>
            <h3 className="text-[17px] font-semibold tracking-tight text-ink">{m.title}</h3>
            <p className="mt-1 line-clamp-2 text-[13.5px] text-muted">{m.goal}</p>
          </div>
          <ProgressRing value={progress} />
        </div>

        <Progress value={progress} className="mt-4" tone={progress >= 100 ? "green" : "brand"} />

        <ol className="mt-5 space-y-0">
          {steps.map((s, i) => {
            const complete = s.value >= s.target;
            const partial = !complete && s.value > 0;
            return (
              <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < steps.length - 1 ? (
                  <span className={cx("absolute top-6 left-[11px] h-[calc(100%-20px)] w-px", complete ? "bg-brand-300" : "bg-line")} />
                ) : null}
                <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface">
                  {complete ? (
                    <CheckCircle2 className="size-6 text-brand-600" />
                  ) : partial ? (
                    <span className="flex size-6 items-center justify-center rounded-full border-2 border-brand-300 text-[10px] font-bold text-brand-700">{s.value}</span>
                  ) : (
                    <Circle className="size-6 text-line-2" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cx("text-[13.5px] font-medium", complete ? "text-ink" : "text-ink-2")}>{s.label}</p>
                    <span className="shrink-0 text-[12px] font-medium text-muted tabular-nums">
                      {s.value} / {s.target}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-canvas">
                    <motion.div
                      className={cx("h-full rounded-full", complete ? "bg-brand-500" : "bg-brand-300")}
                      initial={{ width: 0 }}
                      animate={{ width: `${(Math.min(s.value, s.target) / s.target) * 100}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {targets.length ? (
          <div className="mt-5 rounded-2xl bg-canvas p-3">
            <p className="mb-2 text-[12px] font-semibold text-ink-2">Target roles</p>
            <div className="flex flex-wrap gap-2">
              {targets.map((t) => (
                <div key={t.roleId} className="rounded-xl border border-line bg-surface px-2.5 py-1.5">
                  <p className="text-[12.5px] font-medium text-ink">{t.label}</p>
                  <p className="text-[11px] text-muted">
                    {t.found} found · <span className={t.connected > 0 ? "font-semibold text-emerald-700" : ""}>{t.connected} connected</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-auto pt-5" />
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <ButtonLink href={`/discover?q=${q}`} variant="secondary" size="sm" icon={<Search className="size-3.5" />}>
            Find people
          </ButtonLink>
          <ButtonLink href={`/build?pitch=${q}`} variant="soft" size="sm" icon={<Wand2 className="size-3.5" />}>
            Build team
          </ButtonLink>
          <div className="ml-auto flex gap-1.5">
            {isDone ? (
              <Button size="sm" variant="ghost" loading={busy === "active"} onClick={() => setStatus("active")}>
                Reopen
              </Button>
            ) : (
              <Button size="sm" variant="ghost" loading={busy === "completed"} onClick={() => setStatus("completed")} icon={<Check className="size-3.5" />}>
                Mark complete
              </Button>
            )}
            <Button size="sm" variant="ghost" loading={busy === "archived"} onClick={() => setStatus("archived")} icon={<Archive className="size-3.5" />} aria-label="Archive mission">
              <span className="hidden sm:inline">Archive</span>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

